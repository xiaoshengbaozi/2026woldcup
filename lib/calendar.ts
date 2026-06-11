import type { DetailRow, Match } from "@/types/match";

const CITY_NAME_ZH: Record<string, string> = {
  Atlanta: "亚特兰大",
  Boston: "波士顿",
  Dallas: "达拉斯",
  Houston: "休斯敦",
  "Kansas City": "堪萨斯城",
  "Los Angeles": "洛杉矶",
  Miami: "迈阿密",
  "Miami Gardens": "迈阿密",
  "New York": "纽约/新泽西",
  NewYork: "纽约/新泽西",
  newyork: "纽约/新泽西",
  "New York City": "纽约/新泽西",
  "New York New Jersey": "纽约/新泽西",
  "NewYork NewJersey": "纽约/新泽西",
  "newyork newjersey": "纽约/新泽西",
  "New York/New Jersey": "纽约/新泽西",
  "NewYork/NewJersey": "纽约/新泽西",
  "newyork/newjersey": "纽约/新泽西",
  "New York / New Jersey": "纽约/新泽西",
  Philadelphia: "费城",
  "San Francisco": "旧金山湾区",
  "San Francisco Bay Area": "旧金山湾区",
  Seattle: "西雅图",
  Arlington: "达拉斯",
  "East Rutherford": "纽约/新泽西",
  Foxborough: "波士顿",
  Inglewood: "洛杉矶",
  "Santa Clara": "旧金山湾区",
  Toronto: "多伦多",
  Vancouver: "温哥华",
  "Mexico City": "墨西哥城",
  Guadalajara: "瓜达拉哈拉",
  Zapopan: "瓜达拉哈拉",
  Monterrey: "蒙特雷",
};

export function localizeCityName(city: string) {
  const normalized = city.trim();
  const compactKey = normalized.replace(/\s+/g, "").toLowerCase();
  return (
    CITY_NAME_ZH[normalized] ??
    CITY_NAME_ZH[compactKey] ??
    (compactKey === "newyork" || compactKey === "newyorknewjersey" ? "纽约/新泽西" : normalized)
  );
}

export function localizeLocationText(location: string) {
  return location
    .trim()
    .replace(/\bNew\s*York\s+New\s*Jersey\b/gi, "纽约/新泽西")
    .replace(/（([^）]+)）/g, (_, city: string) => `（${localizeCityName(city)}）`)
    .replace(/\s·\s([^·,，（）]+)$/g, (_, city: string) => ` · ${localizeCityName(city)}`)
    .replace(/,\s*([^,，（）]+)$/g, (_, city: string) => `, ${localizeCityName(city)}`);
}

export function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

export function parseValue(block: string, name: string) {
  const line = block
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}:`) || entry.startsWith(`${name};`));

  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
}

export function cleanText(value: string) {
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

export function parseDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
}

export function parseGeo(value: string) {
  const parts = value.split(";").map(Number);
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  return { lat: parts[0], lon: parts[1] };
}

export function extractStage(summary: string, description: string) {
  const summaryMatch = summary.match(/\(([^)]+)\)$/);
  if (summaryMatch) return summaryMatch[1].trim();

  const firstLine = description.split("\n")[0] || "";
  const parts = firstLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[1] || "其他";
}

export function extractWeather(description: string) {
  const match = description.match(/动态天气\s*(https?:\/\/\S+)/);
  return match ? match[1] : "";
}

export function extractCity(location: string) {
  const openIndex = location.lastIndexOf("\uFF08");
  const closeIndex = location.lastIndexOf("\uFF09");
  if (openIndex >= 0 && closeIndex > openIndex) {
    return localizeCityName(location.slice(openIndex + 1, closeIndex));
  }

  if (location.includes("·")) {
    return localizeCityName(location.split("·").pop()?.trim() || location.trim());
  }

  return localizeCityName(location.split(",").slice(-1)[0]?.trim() || location.trim());
}

export function parseCalendar(text: string): Match[] {
  return unfoldIcs(text)
    .split("BEGIN:VEVENT")
    .slice(1)
    .map((raw) => {
      const block = raw.split("END:VEVENT")[0];
      const summary = cleanText(parseValue(block, "SUMMARY"));
      const description = cleanText(parseValue(block, "DESCRIPTION"));
      const location = cleanText(parseValue(block, "LOCATION"));
      const url = cleanText(parseValue(block, "URL"));
      const start = parseDate(parseValue(block, "DTSTART"));
      const end = parseDate(parseValue(block, "DTEND"));
      const uid = cleanText(parseValue(block, "UID"));
      const geo = parseGeo(parseValue(block, "GEO"));

      if (!start) return null;

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
        weather: extractWeather(description)
      };
    })
    .filter((match): match is Match => Boolean(match))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function detailRows(match: Match): DetailRow[] {
  return match.description
    .split("\n")
    .map((line) => line.replace(/[ \t]+\\/g, "").replace(/^\\+|\\+$/g, "").trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("2026世界杯"))
    .filter((line) => !/\s+vs\s+/i.test(line))
    .filter(
      (line) =>
        !line.startsWith("动态天气") &&
        !line.startsWith("系统地图:") &&
        !line.startsWith("通用地图:")
    )
    .map((line) => {
      if (line.startsWith("📍")) {
        return { icon: "LOC", text: localizeLocationText(line.slice(2)), type: "venue" };
      }

      if (line.startsWith("🏟")) {
        return { icon: "STAD", text: line.slice(2).trim(), type: "meta" };
      }

      if (line.startsWith("坐标:")) {
        return { icon: "GPS", text: line, type: "meta" };
      }

      return { icon: "META", text: line, type: "meta" };
    });
}

export function groupMatchesByDay(matches: Match[]) {
  return matches.reduce<Map<string, Match[]>>((acc, match) => {
    const key = match.start.toDateString();
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key)?.push(match);
    return acc;
  }, new Map());
}

export function getDayStatus(dayMatches: Match[]) {
  if (!dayMatches.length) return "暂无比赛";

  const now = Date.now();
  const orderedMatches = [...dayMatches].sort((a, b) => a.start.getTime() - b.start.getTime());
  const nextMatch = orderedMatches.find((match) => match.start.getTime() > now);
  const hasLiveMatch = orderedMatches.some((match) => isMatchLive(match, now));
  const hasStartedMatch = orderedMatches.some((match) => hasMatchStarted(match, now));
  const allFinished = orderedMatches.every((match) => isMatchFinished(match, now));

  if (allFinished) return "已完赛";
  if (hasLiveMatch) return "比赛中";
  if (hasStartedMatch && nextMatch) return "比赛日进行中";
  if (hasStartedMatch) return "比赛中";

  const firstStart = nextMatch?.start.getTime() ?? orderedMatches[0].start.getTime();
  const diff = Math.max(0, firstStart - now);

  const hoursTotal = diff / 3600000;

  if (hoursTotal < 24) {
    const h = Math.floor(hoursTotal);
    const m = Math.floor((hoursTotal - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} 后开赛`;
  }

  const days = Math.ceil(hoursTotal / 24);
  return `${days} 天后开赛`;
}

function hasMatchStarted(match: Match, now: number) {
  return (
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "finished" ||
    hasMatchScore(match) ||
    match.start.getTime() <= now
  );
}

function isMatchLive(match: Match, now: number) {
  if (match.status === "live" || match.status === "halftime") return true;
  if (match.status === "finished") return false;

  const start = match.start.getTime();
  const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
  return now >= start && now <= end;
}

function isMatchFinished(match: Match, now: number) {
  if (match.status === "finished") return true;
  if (match.status === "live" || match.status === "halftime") return false;

  const end = match.end?.getTime() ?? match.start.getTime() + 2 * 60 * 60 * 1000;
  return end < now;
}

function hasMatchScore(match: Match) {
  return typeof match.score?.home === "number" || typeof match.score?.away === "number";
}

export function getTournamentProgress(matches: Match[], now = Date.now()) {
  if (!matches.length) return 0;

  const completed = matches.filter((match) => {
    const end = match.end || match.start;
    return end.getTime() < now;
  }).length;

  return Math.round((completed / matches.length) * 100);
}

