export type ApiFootballEndpoint =
  | "fixtures"
  | "fixtures/rounds"
  | "fixtures/statistics"
  | "fixtures/lineups"
  | "fixtures/events"
  | "fixtures/players"
  | "fixtures/headtohead"
  | "players"
  | "players/profiles"
  | "players/squads"
  | "players/topscorers"
  | "players/topassists"
  | "players/topyellowcards"
  | "players/topredcards"
  | "standings"
  | "injuries"
  | "teams"
  | "transfers"
  | "trophies"
  | "sidelined"
  | "leagues"
  | "coachs"
  | "predictions"
  | "odds"
  | "odds/live";

export interface ApiFootballService {
  isConfigured: () => boolean;
  request: (
    endpoint: ApiFootballEndpoint,
    params: URLSearchParams
  ) => Promise<ApiFootballGatewayResponse>;
}

export interface ApiFootballGatewayResponse {
  source: "api-football";
  endpoint: ApiFootballEndpoint;
  cached: boolean;
  timestamp: number;
  upstream: unknown;
}

const DEFAULT_HOST = "https://v3.football.api-sports.io";
const DEFAULT_CACHE_TTL_MS = 30_000;

const CACHE_TTL_BY_ENDPOINT: Partial<Record<ApiFootballEndpoint, number>> = {
  fixtures: 15_000,
  "fixtures/rounds": 5 * 60_000,
  "fixtures/events": 10_000,
  "fixtures/statistics": 30_000,
  "fixtures/lineups": 60_000,
  "fixtures/players": 60_000,
  "players/squads": 24 * 60 * 60_000,
  "players/profiles": 24 * 60 * 60_000,
  "players/topscorers": 5 * 60_000,
  "players/topassists": 5 * 60_000,
  "players/topyellowcards": 5 * 60_000,
  "players/topredcards": 5 * 60_000,
  standings: 5 * 60_000,
  injuries: 5 * 60_000,
  predictions: 60_000,
  odds: 5 * 60_000,
  "odds/live": 15_000,
  teams: 24 * 60 * 60_000,
  transfers: 24 * 60 * 60_000,
  trophies: 24 * 60 * 60_000,
  sidelined: 24 * 60 * 60_000,
  leagues: 24 * 60 * 60_000,
  coachs: 24 * 60 * 60_000,
};

export function createApiFootballService(
  apiKey = process.env.API_FOOTBALL_KEY || "",
  options: { host?: string; cacheTtlMs?: number } = {}
): ApiFootballService {
  const host = (options.host || process.env.API_FOOTBALL_HOST || DEFAULT_HOST).replace(/\/+$/, "");
  const fallbackTtl = Number(process.env.API_FOOTBALL_CACHE_TTL_MS || options.cacheTtlMs || DEFAULT_CACHE_TTL_MS);
  const cache = new Map<string, { expiresAt: number; payload: ApiFootballGatewayResponse }>();

  return {
    isConfigured: () => Boolean(apiKey),

    async request(endpoint, params) {
      if (!apiKey) {
        throw createHttpError(503, "api_football_not_configured");
      }

      const normalizedParams = normalizeParams(params);
      const cacheKey = `${endpoint}?${normalizedParams.toString()}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.payload, cached: true };
      }

      const url = `${host}/${endpoint}${normalizedParams.size ? `?${normalizedParams}` : ""}`;
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      const upstream = await response.json().catch(() => null);

      if (!response.ok) {
        throw createHttpError(response.status, "api_football_upstream_error", upstream);
      }

      const payload: ApiFootballGatewayResponse = {
        source: "api-football",
        endpoint,
        cached: false,
        timestamp: Date.now(),
        upstream,
      };

      const ttl = CACHE_TTL_BY_ENDPOINT[endpoint] ?? fallbackTtl;
      cache.set(cacheKey, {
        expiresAt: Date.now() + ttl,
        payload,
      });

      return payload;
    },
  };
}

function normalizeParams(params: URLSearchParams) {
  const normalized = new URLSearchParams();
  [...params.entries()]
    .filter(([key, value]) => key.trim() && value.trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => normalized.append(key, value));

  return normalized;
}

function createHttpError(statusCode: number, code: string, details?: unknown) {
  const error = new Error(code) as Error & { statusCode?: number; details?: unknown };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}
