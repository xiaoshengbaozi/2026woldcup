import fs from "node:fs";
import path from "node:path";
import type { NormalizedWorldCupFixture, NormalizedTeam, WorldCupStageKind } from "./worldCupData";

type CalendarMatch = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  startIso: string;
  endIso: string | null;
  stage: string;
  weather: string;
};

let cachedCalendarFixtures: NormalizedWorldCupFixture[] | null = null;

export function mergeCalendarFallbackFixtures(apiFixtures: NormalizedWorldCupFixture[]) {
  const calendarFixtures = loadCalendarFallbackFixtures();
  if (!calendarFixtures.length) return apiFixtures;

  const apiByIdentity = new Map(apiFixtures.map((fixture) => [getFixtureIdentity(fixture), fixture]));
  const apiByStartStage = new Map(apiFixtures.map((fixture) => [getFixtureStartStageIdentity(fixture), fixture]));
  const usedApiIds = new Set<string>();

  const merged = calendarFixtures.map((calendarFixture) => {
    const apiFixture =
      apiByIdentity.get(getFixtureIdentity(calendarFixture)) ??
      (hasPlaceholderTeam(calendarFixture) ? apiByStartStage.get(getFixtureStartStageIdentity(calendarFixture)) : undefined);
    if (!apiFixture) return calendarFixture;
    usedApiIds.add(apiFixture.uid);
    return {
      ...calendarFixture,
      ...apiFixture,
      location: apiFixture.location || calendarFixture.location,
      stage: apiFixture.stage || calendarFixture.stage,
      stageKind: apiFixture.stageKind || calendarFixture.stageKind,
      stageOrder: apiFixture.stageOrder || calendarFixture.stageOrder,
      weather: apiFixture.weather || calendarFixture.weather,
    };
  });

  const additionalApiFixtures = apiFixtures.filter((fixture) => !usedApiIds.has(fixture.uid));
  return [...merged, ...additionalApiFixtures].sort((left, right) => left.startIso.localeCompare(right.startIso));
}

function loadCalendarFallbackFixtures() {
  if (cachedCalendarFixtures) return cachedCalendarFixtures;

  const filePath = findCalendarFile();
  if (!filePath) {
    cachedCalendarFixtures = [];
    return cachedCalendarFixtures;
  }

  try {
    cachedCalendarFixtures = parseCalendar(fs.readFileSync(filePath, "utf8")).map(toNormalizedFixture);
  } catch {
    cachedCalendarFixtures = [];
  }

  return cachedCalendarFixtures;
}

function findCalendarFile() {
  const candidates = [
    process.env.WORLDCUP_CALENDAR_FILE || "",
    path.resolve(process.cwd(), "public", "calendar.ics"),
    path.resolve(process.cwd(), "calendar.ics"),
    path.resolve(process.cwd(), "..", "public", "calendar.ics"),
    path.resolve(process.cwd(), "..", "calendar.ics"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function parseCalendar(text: string): CalendarMatch[] {
  return unfoldIcs(text)
    .split("BEGIN:VEVENT")
    .slice(1)
    .flatMap((raw) => {
      const block = raw.split("END:VEVENT")[0];
      const summary = cleanText(parseValue(block, "SUMMARY"));
      const description = cleanText(parseValue(block, "DESCRIPTION"));
      const location = cleanText(parseValue(block, "LOCATION"));
      const url = cleanText(parseValue(block, "URL"));
      const startIso = parseDate(parseValue(block, "DTSTART"));
      const endIso = parseDate(parseValue(block, "DTEND"));
      const uid = cleanText(parseValue(block, "UID"));

      if (!startIso) return [];
      return [{
        uid,
        summary,
        description,
        location,
        url,
        startIso,
        endIso,
        stage: extractStage(summary, description),
        weather: extractWeather(description),
      }];
    });
}

function toNormalizedFixture(match: CalendarMatch): NormalizedWorldCupFixture {
  const [homeTeam, awayTeam] = parseCalendarTeams(match.summary);
  const stageMeta = normalizeCalendarStage(match.stage);

  return {
    uid: `calendar-${match.uid}`,
    apiFixtureId: 0,
    summary: match.summary,
    description: match.description,
    location: match.location,
    url: match.url,
    startIso: match.startIso,
    endIso: match.endIso,
    geo: null,
    stage: match.stage,
    stageKind: stageMeta.kind,
    stageOrder: stageMeta.order,
    weather: match.weather,
    status: "not_started",
    statusShort: "NS",
    statusLabel: "未开始",
    elapsed: null,
    score: {
      home: null,
      away: null,
      halftimeHome: null,
      halftimeAway: null,
    },
    homeTeam,
    awayTeam,
  };
}

function unfoldIcs(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseValue(block: string, name: string) {
  const line = block
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}:`) || entry.startsWith(`${name};`));

  if (!line) return "";
  return line.slice(line.indexOf(":") + 1).trim();
}

function cleanText(value: string) {
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

function parseDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return "";

  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 8, Number(minute))).toISOString();
}

function extractStage(summary: string, description: string) {
  const summaryMatch = summary.match(/\(([^)]+)\)$/);
  if (summaryMatch) return summaryMatch[1].trim();

  const firstLine = description.split("\n")[0] || "";
  const parts = firstLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[1] || "其他";
}

function extractWeather(description: string) {
  const match = description.match(/动态天气\s*(https?:\/\/\S+)/);
  return match ? match[1] : "";
}

function parseCalendarTeams(summary: string): [NormalizedTeam, NormalizedTeam] {
  const title = summary.replace(/^\S+\s*/, "").replace(/\s*\([^)]*\)\s*$/, "");
  const [home = "待定", away = "待定"] = title.split(/\s+vs\s+/i).map((item) => item.trim());
  return [toCalendarTeam(home), toCalendarTeam(away)];
}

function toCalendarTeam(name: string): NormalizedTeam {
  const slotMatch = name.match(/^([A-L])组第([123])$/i);
  const code = slotMatch ? `${slotMatch[1].toUpperCase()}${slotMatch[2]}` : "";
  return {
    id: null,
    name,
    englishName: name,
    code,
    logo: "",
  };
}

function normalizeCalendarStage(stage: string): { kind: WorldCupStageKind; order: number } {
  if (/[A-L]\s*组|Group\s+[A-L]/i.test(stage)) return { kind: "group", order: 10 };
  if (/1\/16|Round of 32|32强/i.test(stage)) return { kind: "r32", order: 20 };
  if (/1\/8|Round of 16|16强/i.test(stage)) return { kind: "r16", order: 30 };
  if (/1\/4|Quarter/i.test(stage)) return { kind: "qf", order: 40 };
  if (/半决赛|Semi/i.test(stage)) return { kind: "sf", order: 50 };
  if (/三四名|季军|Third|3rd/i.test(stage)) return { kind: "third", order: 60 };
  if (/决赛|Final/i.test(stage)) return { kind: "final", order: 70 };
  return { kind: "other", order: 99 };
}

function getFixtureIdentity(fixture: NormalizedWorldCupFixture) {
  return [
    Date.parse(fixture.startIso) || 0,
    normalizeFixtureTeamName(fixture.homeTeam.name),
    normalizeFixtureTeamName(fixture.awayTeam.name),
  ].join("|");
}

function getFixtureStartStageIdentity(fixture: NormalizedWorldCupFixture) {
  return [
    Date.parse(fixture.startIso) || 0,
    fixture.stageKind,
  ].join("|");
}

function hasPlaceholderTeam(fixture: NormalizedWorldCupFixture) {
  return isPlaceholderTeam(fixture.homeTeam.name) || isPlaceholderTeam(fixture.awayTeam.name);
}

function isPlaceholderTeam(value: string) {
  return /([A-L]\s*组第[123])|待定|winner|runner-up|third/i.test(value);
}

function normalizeFixtureTeamName(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
}
