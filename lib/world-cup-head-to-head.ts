import { getBackendApiUrl } from "@/lib/world-cup-api";
import type { HeadToHeadMatch, MatchTeamMeta } from "@/types/match";

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

export async function fetchWorldCupHeadToHead(homeTeam: MatchTeamMeta, awayTeam: MatchTeamMeta) {
  if (!homeTeam.id || !awayTeam.id) return [];

  const params = new URLSearchParams({ h2h: `${homeTeam.id}-${awayTeam.id}` });
  const response = await fetch(`${getBackendApiUrl()}/api/football/fixtures/headtohead?${params}`, {
    cache: "no-store",
  });
  const payload = (await response.json()) as HeadToHeadPayload & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `Head-to-head returned ${response.status}`);
  }

  return (payload.upstream?.response ?? [])
    .filter((fixture) => typeof fixture.goals?.home === "number" && typeof fixture.goals?.away === "number")
    .map((fixture) => toHeadToHeadMatch(fixture, homeTeam, awayTeam))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function toHeadToHeadMatch(
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
