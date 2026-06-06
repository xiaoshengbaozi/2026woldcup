import type { Match } from "@/types/match";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api-2026.20250114.xyz";

export type NormalizedWorldCupFixture = {
  uid: string;
  apiFixtureId: number;
  summary: string;
  description: string;
  location: string;
  url: string;
  startIso: string;
  endIso: string | null;
  geo: null;
  stage: string;
  weather: string;
  homeTeam?: Match["homeTeam"];
  awayTeam?: Match["awayTeam"];
};

type FixturesResponse = {
  fixtures?: NormalizedWorldCupFixture[];
};

export type NormalizedWorldCupStandingRow = {
  group: string;
  rank: number;
  team: {
    id: number | null;
    name: string;
    englishName: string;
    code: string;
    logo: string;
  };
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form: string;
  description: string;
  updatedAt: string | null;
};

type StandingsResponse = {
  standings?: NormalizedWorldCupStandingRow[];
};

export function getBackendApiUrl() {
  const fallbackUrl =
    typeof window !== "undefined" && isLocalDevHost(window.location.hostname)
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : PRODUCTION_API_URL;

  return (process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
}

function isLocalDevHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export async function fetchWorldCupFixtures(options: { season?: number; league?: number } = {}) {
  const apiUrl = getBackendApiUrl();
  const params = new URLSearchParams({
    league: String(options.league ?? 1),
    season: String(options.season ?? 2026),
  });

  const response = await fetch(`${apiUrl}/api/worldcup/fixtures?${params}`, { cache: "no-store" });
  const payload = (await response.json()) as FixturesResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `World Cup fixtures returned ${response.status}`);
  }

  return (payload.fixtures ?? []).map(toMatch);
}

export async function fetchWorldCupWarmupFixtures(options: { season?: number; league?: number; from?: string; to?: string } = {}) {
  const apiUrl = getBackendApiUrl();
  const params = new URLSearchParams({
    season: String(options.season ?? 2026),
  });

  if (options.league) params.set("league", String(options.league));
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);

  const response = await fetch(`${apiUrl}/api/worldcup/warmups?${params}`, { cache: "no-store" });
  const payload = (await response.json()) as FixturesResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `World Cup warmup fixtures returned ${response.status}`);
  }

  return (payload.fixtures ?? []).map(toMatch);
}

export async function fetchWorldCupStandings(options: { season?: number; league?: number } = {}) {
  const apiUrl = getBackendApiUrl();
  const params = new URLSearchParams({
    league: String(options.league ?? 1),
    season: String(options.season ?? 2026),
  });

  const response = await fetch(`${apiUrl}/api/worldcup/standings?${params}`, { cache: "no-store" });
  const payload = (await response.json()) as StandingsResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `World Cup standings returned ${response.status}`);
  }

  return payload.standings ?? [];
}

function toMatch(fixture: NormalizedWorldCupFixture): Match {
  return {
    uid: fixture.uid,
    apiFixtureId: fixture.apiFixtureId,
    summary: fixture.summary,
    description: fixture.description,
    location: fixture.location,
    url: fixture.url,
    start: new Date(fixture.startIso),
    end: fixture.endIso ? new Date(fixture.endIso) : null,
    geo: fixture.geo,
    stage: fixture.stage,
    weather: fixture.weather,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  };
}
