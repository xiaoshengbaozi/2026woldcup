import rawH2hData from "@/data/h2h/michill-worldcup-2026-h2h.json";
import { getBackendApiUrl } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import type { HeadToHeadMatch, HeadToHeadStatus, MatchTeamMeta } from "@/types/match";

type HeadToHeadFixture = {
  fixture?: {
    date?: string;
    status?: {
      short?: string;
    };
  };
  league?: {
    name?: string;
  };
  teams?: {
    home?: { id?: number; name?: string };
    away?: { id?: number; name?: string };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

type HeadToHeadPayload = {
  upstream?: {
    response?: HeadToHeadFixture[];
  };
};

type MichillPair = {
  s: "direct_history" | "confirmed_no_meeting" | string;
  d: number;
  c: number;
  f: number;
  n: number;
  l: string;
  r: string;
};

type MichillMatchRow = [
  date: string,
  competition: string,
  homeCode: string,
  homeNameCn: string,
  homeNameEn: string,
  awayCode: string,
  awayNameCn: string,
  awayNameEn: string,
  homeScore: number,
  awayScore: number,
  venue: string,
  neutral: 0 | 1,
];

type MichillH2HData = {
  pairs: Record<string, MichillPair>;
  matches: Record<string, MichillMatchRow[]>;
};

type HeadToHeadResult = {
  matches: HeadToHeadMatch[];
  status: HeadToHeadStatus;
};

const h2hData = rawH2hData as unknown as MichillH2HData;
const LOCAL_MATCH_LIMIT = 10;

const codeAliases: Record<string, string> = {
  DZA: "ALG",
  SAU: "KSA",
};

export async function fetchWorldCupHeadToHead(homeTeam: MatchTeamMeta, awayTeam: MatchTeamMeta): Promise<HeadToHeadResult> {
  const local = findLocalHeadToHead(homeTeam, awayTeam);
  if (local) return local;

  if (!homeTeam.id || !awayTeam.id) return { matches: [], status: "unknown" };

  const params = new URLSearchParams({ h2h: `${homeTeam.id}-${awayTeam.id}` });
  const url = `${getBackendApiUrl()}/api/football/fixtures/headtohead?${params}`;
  const payload = await cachedJson<HeadToHeadPayload & { error?: string }>(url, 24 * 60 * 60 * 1000, async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 5_000);
    const payload = (await response.json()) as HeadToHeadPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `Head-to-head returned ${response.status}`);
    }

    return payload;
  }, { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 });

  const matches = (payload.upstream?.response ?? [])
    .filter((fixture) => typeof fixture.goals?.home === "number" && typeof fixture.goals?.away === "number")
    .map((fixture) => toRemoteHeadToHeadMatch(fixture, homeTeam, awayTeam))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    matches,
    status: matches.length ? "direct_history" : "unknown",
  };
}

function findLocalHeadToHead(homeTeam: MatchTeamMeta, awayTeam: MatchTeamMeta): HeadToHeadResult | null {
  const homeCode = normalizeTeamCode(homeTeam.code);
  const awayCode = normalizeTeamCode(awayTeam.code);
  if (!homeCode || !awayCode) return null;

  const pairKey = toPairKey(homeCode, awayCode);
  const pair = h2hData.pairs[pairKey];
  if (!pair) return null;

  const matches = h2hData.matches[pairKey] ?? [];
  return {
    matches: matches.slice(0, LOCAL_MATCH_LIMIT).map((row) => toLocalHeadToHeadMatch(row, homeCode, awayCode)),
    status: pair.s === "confirmed_no_meeting" ? "confirmed_no_meeting" : "direct_history",
  };
}

function normalizeTeamCode(code = "") {
  const normalized = code.trim().toUpperCase();
  return codeAliases[normalized] ?? normalized;
}

function toPairKey(left: string, right: string) {
  return [left, right].sort().join("-");
}

function toLocalHeadToHeadMatch(row: MichillMatchRow, homeCode: string, awayCode: string): HeadToHeadMatch {
  const [
    date,
    competition,
    rowHomeCode,
    rowHomeNameCn,
    rowHomeNameEn,
    rowAwayCode,
    rowAwayNameCn,
    rowAwayNameEn,
    rowHomeScore,
    rowAwayScore,
    venue,
    neutral,
  ] = row;
  const requestedHomeWasHistoricalHome = rowHomeCode === homeCode;
  const requestedAwayWasHistoricalHome = rowHomeCode === awayCode;
  const homeGoals = requestedHomeWasHistoricalHome ? rowHomeScore : rowAwayScore;
  const awayGoals = requestedAwayWasHistoricalHome ? rowHomeScore : rowAwayScore;
  const requestedHomeName = requestedHomeWasHistoricalHome ? rowHomeNameCn || rowHomeNameEn : rowAwayNameCn || rowAwayNameEn;
  const requestedAwayName = requestedAwayWasHistoricalHome ? rowHomeNameCn || rowHomeNameEn : rowAwayNameCn || rowAwayNameEn;

  return {
    date: date || "日期待定",
    competition: localizeCompetition(competition),
    homeTeam: requestedHomeName,
    awayTeam: requestedAwayName,
    score: `${homeGoals} - ${awayGoals}`,
    venue,
    neutral: Boolean(neutral),
    source: "Michill H2H Open Data",
  };
}

function toRemoteHeadToHeadMatch(
  fixture: HeadToHeadFixture,
  homeTeam: MatchTeamMeta,
  awayTeam: MatchTeamMeta
): HeadToHeadMatch {
  const homeId = fixture.teams?.home?.id ?? null;
  const awayId = fixture.teams?.away?.id ?? null;

  return {
    date: fixture.fixture?.date ? fixture.fixture.date.slice(0, 10) : "日期待定",
    competition: localizeCompetition(fixture.league?.name),
    homeTeam: homeId === homeTeam.id ? homeTeam.name : awayId === homeTeam.id ? awayTeam.name : fixture.teams?.home?.name ?? "",
    awayTeam: awayId === awayTeam.id ? awayTeam.name : homeId === awayTeam.id ? homeTeam.name : fixture.teams?.away?.name ?? "",
    score: `${fixture.goals?.home ?? "-"} - ${fixture.goals?.away ?? "-"}`,
  };
}

function localizeCompetition(name = "") {
  if (/world cup/i.test(name)) return "世界杯";
  if (/friend/i.test(name)) return "国际友谊赛";
  if (/qual/i.test(name)) return "世预赛";
  return name || "比赛";
}
