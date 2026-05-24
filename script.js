const calendarUrl = new URL("calendar.ics", window.location.href);
const scheduleEl = document.getElementById("schedule");
const searchEl = document.getElementById("search");
const stageEl = document.getElementById("stage");
const weatherCache = new Map();

document.getElementById("calendar-url").textContent = calendarUrl.href;
document.getElementById("webcal-link").href = calendarUrl.href.replace(/^https?:/, "webcal:");

let matches = [];

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseValue(block, name) {
  const line = block.split(/\r?\n/).find((entry) => entry.startsWith(name + ":") || entry.startsWith(name + ";"));
  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
}

function cleanText(value) {
  return value
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/[ \t]+\\/g, "")
    .replace(/\\[ \t]*$/gm, "")
    .trim();
}

function parseDate(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function extractStage(summary, description) {
  const summaryMatch = summary.match(/\(([^)]+)\)$/);
  if (summaryMatch) return summaryMatch[1].trim();
  const firstLine = description.split("\n")[0] || "";
  const parts = firstLine.split("|").map((part) => part.trim()).filter(Boolean);
  return parts[1] || "其他";
}

function extractWeather(description) {
  const match = description.match(/动态天气:\s*(https?:\/\/\S+)/);
  return match ? match[1] : "";
}

function parseGeo(value) {
  const parts = value.split(";").map(Number);
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  return { lat: parts[0], lon: parts[1] };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function dayStatus(dayMatches) {
  const now = new Date();
  const firstStart = dayMatches[0].start;
  const lastEnd = dayMatches.reduce((latest, match) => {
    const end = match.end || match.start;
    return end > latest ? end : latest;
  }, dayMatches[0].end || dayMatches[0].start);

  if (now > lastEnd) return "已完赛";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDay = new Date(firstStart.getFullYear(), firstStart.getMonth(), firstStart.getDate());
  const days = Math.ceil((startDay - today) / 86400000);
  if (days <= 0) return "今日开赛";
  return `${days}天后开赛`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

const teamFlagCodes = new Map([
  ["墨西哥", "mx"],
  ["南非", "za"],
  ["韩国", "kr"],
  ["捷克", "cz"],
  ["加拿大", "ca"],
  ["波黑", "ba"],
  ["美国", "us"],
  ["巴拉圭", "py"],
  ["卡塔尔", "qa"],
  ["瑞士", "ch"],
  ["巴西", "br"],
  ["摩洛哥", "ma"],
  ["海地", "ht"],
  ["苏格兰", "gb-sct"],
  ["土耳其", "tr"],
  ["日本", "jp"],
  ["德国", "de"],
  ["库拉索", "cw"],
  ["澳大利亚", "au"],
  ["埃及", "eg"],
  ["法国", "fr"],
  ["哥伦比亚", "co"],
  ["意大利", "it"],
  ["突尼斯", "tn"],
  ["阿尔及利亚", "dz"],
  ["秘鲁", "pe"],
  ["阿根廷", "ar"],
  ["奥地利", "at"],
  ["丹麦", "dk"],
  ["乌拉圭", "uy"],
  ["葡萄牙", "pt"],
  ["挪威", "no"],
  ["英格兰", "gb-eng"],
  ["克罗地亚", "hr"],
  ["厄瓜多尔", "ec"],
  ["荷兰", "nl"],
  ["塞内加尔", "sn"],
  ["阿联酋", "ae"],
  ["伊朗", "ir"],
  ["新西兰", "nz"],
  ["科特迪瓦", "ci"],
  ["加纳", "gh"],
  ["巴拿马", "pa"],
  ["佛得角", "cv"],
]);

function parseTeams(summary) {
  const clean = summary.replace(/^⚽\s*/, "").replace(/\s*\([^)]+\)\s*$/, "");
  const parts = clean.split(/\s+vs\s+/i);
  return {
    home: parseTeam(parts[0] || clean),
    away: parseTeam(parts[1] || "待定"),
  };
}

function parseTeam(value) {
  const team = value.trim();
  const flagMatch = team.match(/(?:[\u{1F1E6}-\u{1F1FF}]\s*){2}/u);
  const flag = flagMatch ? flagMatch[0].replace(/\s+/g, "") : "";
  const name = team
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .trim();
  const placeholder = parsePlaceholderTeam(name);
  if (placeholder) return placeholder;
  const code = name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "T";
  const imageCode = teamFlagCodes.get(name) || flagToCountryCode(flag);
  return {
    badge: code,
    badgeType: imageCode ? "image" : "code",
    image: imageCode ? `https://flagcdn.com/${imageCode}.svg` : "",
    name: name || team || "待定",
  };
}

function parsePlaceholderTeam(name) {
  const matchWinner = name.match(/^M(\d+)\s*胜者$/i);
  if (matchWinner) {
    return {
      badge: "待定",
      badgeType: "code",
      image: "",
      name: "晋级球队待定",
    };
  }

  const matchLoser = name.match(/^M(\d+)\s*败者$/i);
  if (matchLoser) {
    return {
      badge: "待定",
      badgeType: "code",
      image: "",
      name: "球队待定",
    };
  }

  const groupSlot = name.match(/^([A-L])组(第[一二三四]|第一|第二|第三|第四)$/i);
  if (groupSlot) {
    return {
      badge: "待定",
      badgeType: "code",
      image: "",
      name: `${groupSlot[1].toUpperCase()}组${groupSlot[2]}`,
    };
  }

  return null;
}

function flagToCountryCode(flag) {
  if (!flag) return "";
  const points = [...flag].map((char) => char.codePointAt(0) - 0x1F1E6 + 97);
  if (points.length !== 2 || points.some((point) => point < 97 || point > 122)) return "";
  return String.fromCodePoint(...points);
}

function badgeHtml(team) {
  const cls = team.badgeType === "code" ? "badge code" : "badge";
  if (team.image) {
    return `<span class="${cls}"><img src="${escapeHtml(team.image)}" alt="${escapeHtml(team.name)} flag" loading="lazy"></span>`;
  }
  return `<span class="${cls}">${escapeHtml(team.badge)}</span>`;
}

function detailRows(match) {
  return match.description
    .split("\n")
    .map((line) => line.replace(/[ \t]+\\/g, "").replace(/^\\+|\\+$/g, "").trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("2026世界杯"))
    .filter((line) => !/\s+vs\s+/i.test(line))
    .filter((line) => !line.startsWith("动态天气:") && !line.startsWith("系统地图:") && !line.startsWith("通用地图:"))
    .map((line) => {
      if (line.startsWith("📍")) return { icon: "📍", text: line.slice(2).trim() };
      if (line.startsWith("🕐")) return { icon: "🕐", text: line.slice(2).trim() };
      if (line.startsWith("坐标:")) return { icon: "⌖", text: line };
      return { icon: "⚽", text: line };
    });
}

function weatherIcon(code) {
  if ([0, 1].includes(code)) return "☀";
  if ([2].includes(code)) return "⛅";
  if ([3, 45, 48].includes(code)) return "☁";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "☔";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if ([95, 96, 99].includes(code)) return "⚡";
  return "○";
}

function weatherText(match) {
  const data = weatherCache.get(weatherKey(match));
  if (!data) return "○ --°C";
  if (data.error) return "天气暂缺";
  return `${weatherIcon(data.code)} ${Math.round(data.temp)}°C`;
}

function weatherKey(match) {
  return match.geo ? `${match.geo.lat},${match.geo.lon}` : match.uid;
}

function navIconSvg() {
  return `
    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `;
}

async function loadWeatherForVisible(matchesToLoad) {
  const targets = [...new Map(
    matchesToLoad
      .filter((match) => match.geo && !weatherCache.has(weatherKey(match)))
      .map((match) => [weatherKey(match), match])
  ).values()];
  await Promise.allSettled(targets.map(async (match) => {
    const params = new URLSearchParams({
      latitude: match.geo.lat,
      longitude: match.geo.lon,
      current: "temperature_2m,weather_code",
      timezone: "auto",
    });
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error("weather fetch failed");
      const data = await response.json();
      weatherCache.set(weatherKey(match), {
        temp: data.current.temperature_2m,
        code: data.current.weather_code,
      });
    } catch (error) {
      weatherCache.set(weatherKey(match), { error: true });
    }
  }));
  render(false);
}

function render(fetchWeather = true) {
  const query = searchEl.value.trim().toLowerCase();
  const stage = stageEl.value;
  const filtered = matches.filter((match) => {
    const haystack = [match.summary, match.location, match.description, match.stage].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!stage || match.stage === stage);
  });

  document.getElementById("shown-count").textContent = filtered.length;

  if (!filtered.length) {
    scheduleEl.innerHTML = '<div class="empty">没有找到匹配的比赛。</div>';
    return;
  }

  const groups = filtered.reduce((acc, match) => {
    const key = match.start.toDateString();
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(match);
    return acc;
  }, new Map());

  scheduleEl.innerHTML = [...groups.values()].map((dayMatches) => {
    const dateLabel = formatDate(dayMatches[0].start);
    const rows = dayMatches.map((match) => {
      const teams = parseTeams(match.summary);
      const details = detailRows(match)
        .filter((row) => row.icon !== "🕐" && row.icon !== "⌖")
        .map((row) => {
          if (row.icon === "📍") {
            return `<a class="venue-link" href="${escapeHtml(match.url)}" target="_blank" rel="noopener">${navIconSvg()}<span>${escapeHtml(row.text)}</span></a>`;
          }
          return `<span class="detail-row"><span>${escapeHtml(row.icon)}</span><span>${escapeHtml(row.text)}</span></span>`;
        })
        .join("");
      return `
        <article class="match">
          <div class="flag-panel">
            ${badgeHtml(teams.home)}
          </div>
          <div class="match-center">
            <div class="match-main">
              <div class="team"><span class="team-name">${escapeHtml(teams.home.name)}</span></div>
              <div class="time">${escapeHtml(formatTime(match.start))}<span>北京时间</span></div>
              <div class="team"><span class="team-name">${escapeHtml(teams.away.name)}</span></div>
            </div>
            <div class="match-info">
              <span class="stage-chip">${escapeHtml(match.stage)}</span>
              <div class="details">${details}</div>
              <span class="weather-chip" data-weather="${escapeHtml(match.uid)}"><span class="weather-icon">${escapeHtml(weatherText(match).split(" ")[0])}</span><span>${escapeHtml(weatherText(match).split(" ").slice(1).join(" "))}</span></span>
            </div>
          </div>
          <div class="flag-panel">
            ${badgeHtml(teams.away)}
          </div>
        </article>
      `;
    }).join("");

    return `
      <section class="day-board">
        <div class="day-head">
          <h2 class="day-title">${escapeHtml(dateLabel)} <small>${dayMatches.length} 场比赛</small></h2>
          <div class="day-status">${escapeHtml(dayStatus(dayMatches))}</div>
        </div>
        ${rows}
      </section>
    `;
  }).join("");

  if (fetchWeather) {
    loadWeatherForVisible(filtered);
  }
}

async function loadCalendar() {
  try {
    const response = await fetch(calendarUrl);
    if (!response.ok) throw new Error("calendar fetch failed");
    const text = unfoldIcs(await response.text());
    matches = text.split("BEGIN:VEVENT").slice(1).map((raw) => {
      const block = raw.split("END:VEVENT")[0];
      const summary = cleanText(parseValue(block, "SUMMARY"));
      const description = cleanText(parseValue(block, "DESCRIPTION"));
      const location = cleanText(parseValue(block, "LOCATION"));
      const url = cleanText(parseValue(block, "URL"));
      const start = parseDate(parseValue(block, "DTSTART"));
      const end = parseDate(parseValue(block, "DTEND"));
      const uid = cleanText(parseValue(block, "UID"));
      const geo = parseGeo(parseValue(block, "GEO"));
      return {
        uid,
        summary,
        description,
        location,
        url,
        start,
        end,
        geo,
        stage: extractStage(summary, description),
        weather: extractWeather(description),
      };
    }).filter((match) => match.start).sort((a, b) => a.start - b.start);

    const stages = [...new Set(matches.map((match) => match.stage))];
    stageEl.innerHTML += stages.map((stage) => `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`).join("");
    document.getElementById("match-count").textContent = matches.length;
    document.getElementById("date-count").textContent = new Set(matches.map((match) => match.start.toDateString())).size;
    render();
  } catch (error) {
    scheduleEl.innerHTML = '<div class="empty">赛程读取失败，请直接下载 calendar.ics。</div>';
  }
}

searchEl.addEventListener("input", render);
stageEl.addEventListener("change", render);
loadCalendar();
