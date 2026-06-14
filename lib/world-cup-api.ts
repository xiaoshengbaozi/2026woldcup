import type { Match } from "@/types/match";
import { getEffectiveMatchStatus } from "@/lib/match-status";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api.boyzi.fun";
const WARMUP_API_URL = "https://api.boyzi.fun";
const API_URL_BY_APP_HOST: Record<string, string> = {
  "ball.boyzi.fun": "https://api.boyzi.fun",
  "ball.boyzi.top": "https://api.boyzi.top",
};
const FIXTURE_CACHE_TTL_MS = 5 * 60 * 1000;
const STANDINGS_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_STALE_TTL_MS = 24 * 60 * 60 * 1000;
const PUBLIC_REQUEST_TIMEOUT_MS = 6_000;

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
  status?: Match["status"];
  statusLabel?: string;
  elapsed?: number | null;
  score?: Match["score"];
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

type WorldCupCacheEnvelope<T> = {
  ok: boolean;
  data?: T | null;
  error?: string;
};

export function getBackendApiUrl() {
  const runtimeApiUrl = getRuntimeApiUrl();
  const fallbackUrl =
    typeof window !== "undefined" && isLocalDevHost(window.location)
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : PRODUCTION_API_URL;

  return (runtimeApiUrl || process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
}

export function getWarmupBackendApiUrl() {
  return (getRuntimeApiUrl() || process.env.NEXT_PUBLIC_WARMUP_API_URL || WARMUP_API_URL).replace(/\/$/, "");
}

function getRuntimeApiUrl() {
  if (typeof window === "undefined") return "";
  return API_URL_BY_APP_HOST[window.location.hostname.toLowerCase()] ?? "";
}

function isLocalDevHost(location: Location) {
  const { hostname, port, protocol } = location;
  if (hostname === "localhost" && protocol === "https:" && !port) return false;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

export async function fetchWorldCupFixtures(options: { season?: number; league?: number; forceRefresh?: boolean } = {}) {
  const apiUrl = getBackendApiUrl();
  const cacheUrl = `${apiUrl}/api/worldcup-cache/fixtures${options.forceRefresh ? "?refresh=1" : ""}`;
  const params = new URLSearchParams({
    league: String(options.league ?? 1),
    season: String(options.season ?? 2026),
  });
  if (options.forceRefresh) params.set("forceRefresh", String(Date.now()));

  const url = `${apiUrl}/api/worldcup/fixtures?${params}`;
  const fetchCachedFixtures = () => fetchWorldCupCacheData<FixturesResponse>(cacheUrl, "World Cup cached fixtures");
  const fetchFixtures = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, PUBLIC_REQUEST_TIMEOUT_MS);
    const payload = (await response.json()) as FixturesResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup fixtures returned ${response.status}`);
    }

    return payload;
  };

  let payload: FixturesResponse & { error?: string };

  try {
    payload = options.forceRefresh
      ? await fetchCachedFixtures()
      : await cachedJson<FixturesResponse & { error?: string }>(cacheUrl, FIXTURE_CACHE_TTL_MS, fetchCachedFixtures, { persist: true, staleTtlMs: PUBLIC_STALE_TTL_MS });
  } catch {
    payload = options.forceRefresh
      ? await fetchFixtures()
      : await cachedJson<FixturesResponse & { error?: string }>(url, FIXTURE_CACHE_TTL_MS, fetchFixtures, { persist: true, staleTtlMs: PUBLIC_STALE_TTL_MS });
  }

  if (!options.forceRefresh && !(payload.fixtures ?? []).length) {
    payload = await fetchFixtures();
  }

  return (payload.fixtures ?? []).map(toMatch);
}

export async function fetchWorldCupWarmupFixtures(options: { season?: number; league?: number; from?: string; to?: string; forceRefresh?: boolean } = {}) {
  const apiUrl = getWarmupBackendApiUrl();
  const params = new URLSearchParams({
    season: String(options.season ?? 2026),
  });

  if (options.league) params.set("league", String(options.league));
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  if (options.forceRefresh) params.set("forceRefresh", String(Date.now()));

  const url = `${apiUrl}/api/worldcup/warmups?${params}`;
  const fetchFixtures = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, PUBLIC_REQUEST_TIMEOUT_MS);
    const payload = (await response.json()) as FixturesResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup warmup fixtures returned ${response.status}`);
    }

    return payload;
  };

  const payload = options.forceRefresh
    ? await fetchFixtures()
    : await cachedJson<FixturesResponse & { error?: string }>(url, FIXTURE_CACHE_TTL_MS, fetchFixtures, { persist: true, staleTtlMs: PUBLIC_STALE_TTL_MS });

  return (payload.fixtures ?? []).map(toMatch);
}

export async function fetchWorldCupStandings(options: { season?: number; league?: number } = {}) {
  const apiUrl = getBackendApiUrl();
  const cacheUrl = `${apiUrl}/api/worldcup-cache/standings`;
  const params = new URLSearchParams({
    league: String(options.league ?? 1),
    season: String(options.season ?? 2026),
  });

  const url = `${apiUrl}/api/worldcup/standings?${params}`;
  const fetchStandings = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, PUBLIC_REQUEST_TIMEOUT_MS);
    const payload = (await response.json()) as StandingsResponse & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup standings returned ${response.status}`);
    }

    return payload;
  };

  let payload: StandingsResponse & { error?: string };

  try {
    payload = await cachedJson<StandingsResponse & { error?: string }>(
      cacheUrl,
      STANDINGS_CACHE_TTL_MS,
      () => fetchWorldCupCacheData<StandingsResponse>(cacheUrl, "World Cup cached standings"),
      { persist: true, staleTtlMs: PUBLIC_STALE_TTL_MS }
    );
  } catch {
    payload = await cachedJson<StandingsResponse & { error?: string }>(url, STANDINGS_CACHE_TTL_MS, fetchStandings, { persist: true, staleTtlMs: PUBLIC_STALE_TTL_MS });
  }

  return payload.standings ?? [];
}

async function fetchWorldCupCacheData<T>(url: string, label: string) {
  const response = await fetchWithTimeout(url, { cache: "no-store" }, PUBLIC_REQUEST_TIMEOUT_MS);
  const envelope = (await response.json()) as WorldCupCacheEnvelope<T>;

  if (!response.ok || !envelope.ok || !envelope.data) {
    throw new Error(envelope.error || `${label} returned ${response.status}`);
  }

  return envelope.data;
}

function toMatch(fixture: NormalizedWorldCupFixture): Match {
  const match: Match = {
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
    status: fixture.status,
    statusLabel: fixture.statusLabel,
    elapsed: fixture.elapsed,
    score: fixture.score,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  };

  const effectiveStatus = getEffectiveMatchStatus(match);

  return {
    ...match,
    status: effectiveStatus,
    statusLabel: getEffectiveStatusLabel(match, effectiveStatus),
  };
}

function getEffectiveStatusLabel(match: Match, status: Match["status"]) {
  if (status === "finished") return "已结束";
  return match.statusLabel;
}
