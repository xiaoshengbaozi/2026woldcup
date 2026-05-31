import type { Match } from "@/types/match";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api-2026.20250114.xyz";

export type NormalizedWorldCupFixture = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  startIso: string;
  endIso: string | null;
  geo: null;
  stage: string;
  weather: string;
};

type FixturesResponse = {
  fixtures?: NormalizedWorldCupFixture[];
};

export function getBackendApiUrl() {
  const fallbackUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? LOCAL_API_URL
      : PRODUCTION_API_URL;

  return (process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
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

function toMatch(fixture: NormalizedWorldCupFixture): Match {
  return {
    uid: fixture.uid,
    summary: fixture.summary,
    description: fixture.description,
    location: fixture.location,
    url: fixture.url,
    start: new Date(fixture.startIso),
    end: fixture.endIso ? new Date(fixture.endIso) : null,
    geo: fixture.geo,
    stage: fixture.stage,
    weather: fixture.weather,
  };
}
