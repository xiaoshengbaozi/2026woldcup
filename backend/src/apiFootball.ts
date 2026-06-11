import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

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
const DEFAULT_STALE_TTL_MS = 24 * 60 * 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 6_000;

const CACHE_TTL_BY_ENDPOINT: Partial<Record<ApiFootballEndpoint, number>> = {
  fixtures: 6 * 60 * 60_000,
  "fixtures/rounds": 5 * 60_000,
  "fixtures/events": 10_000,
  "fixtures/statistics": 30_000,
  "fixtures/lineups": 60_000,
  "fixtures/players": 60_000,
  "players/squads": 7 * 24 * 60 * 60_000,
  "players/profiles": 7 * 24 * 60 * 60_000,
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

type CacheRecord = {
  expiresAt: number;
  staleUntil: number;
  payload: ApiFootballGatewayResponse;
};

type PersistedCache = Record<string, CacheRecord>;

export function createApiFootballService(
  apiKey = process.env.API_FOOTBALL_KEY || "",
  options: { host?: string; cacheTtlMs?: number } = {}
): ApiFootballService {
  const host = (options.host || process.env.API_FOOTBALL_HOST || DEFAULT_HOST).replace(/\/+$/, "");
  const fallbackTtl = Number(process.env.API_FOOTBALL_CACHE_TTL_MS || options.cacheTtlMs || DEFAULT_CACHE_TTL_MS);
  const staleTtl = Number(process.env.API_FOOTBALL_STALE_CACHE_TTL_MS || DEFAULT_STALE_TTL_MS);
  const requestTimeoutMs = Number(process.env.API_FOOTBALL_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  const cacheFile = resolve(process.env.API_FOOTBALL_CACHE_FILE || resolve(process.cwd(), "data", "api-football-cache.json"));
  const cache = loadCache(cacheFile);

  return {
    isConfigured: () => Boolean(apiKey),

    async request(endpoint, params) {
      if (!apiKey) {
        throw createHttpError(503, "api_football_not_configured");
      }

      const normalizedParams = normalizeParams(params);
      const cacheKey = `${endpoint}?${normalizedParams.toString()}`;
      const cached = cache.get(cacheKey);

      if (
        cached &&
        cached.expiresAt > Date.now() &&
        isCacheFreshForCurrentTtl(cached, endpoint, normalizedParams, fallbackTtl) &&
        !hasApiFootballErrors(cached.payload.upstream)
      ) {
        return { ...cached.payload, cached: true };
      }

      const url = `${host}/${endpoint}${normalizedParams.size ? `?${normalizedParams}` : ""}`;
      let response: Response;
      try {
        response = await fetchWithTimeout(url, {
          headers: {
            "x-apisports-key": apiKey,
          },
        }, requestTimeoutMs);
      } catch (error) {
        if (cached && cached.staleUntil > Date.now()) {
          return { ...cached.payload, cached: true };
        }
        throw error;
      }

      const upstream = await response.json().catch(() => null);

      if (!response.ok) {
        if (cached && cached.staleUntil > Date.now()) {
          return { ...cached.payload, cached: true };
        }
        throw createHttpError(response.status, "api_football_upstream_error", upstream);
      }

      if (hasApiFootballErrors(upstream)) {
        if (cached && cached.staleUntil > Date.now() && !hasApiFootballErrors(cached.payload.upstream)) {
          return { ...cached.payload, cached: true };
        }
        throw createHttpError(502, "api_football_data_unavailable", upstream);
      }

      const payload: ApiFootballGatewayResponse = {
        source: "api-football",
        endpoint,
        cached: false,
        timestamp: Date.now(),
        upstream,
      };

      const ttl = getCacheTtl(endpoint, normalizedParams, fallbackTtl);
      cache.set(cacheKey, {
        expiresAt: Date.now() + ttl,
        staleUntil: Date.now() + ttl + staleTtl,
        payload,
      });
      saveCache(cacheFile, cache);

      return payload;
    },
  };
}

function getCacheTtl(endpoint: ApiFootballEndpoint, params: URLSearchParams, fallbackTtl: number) {
  if (endpoint === "fixtures" && params.has("live")) return 15_000;
  if (endpoint === "fixtures" && params.has("id")) return 15_000;
  if (endpoint === "fixtures" && isNearFixtureWindow(params)) return 60_000;
  return CACHE_TTL_BY_ENDPOINT[endpoint] ?? fallbackTtl;
}

function isCacheFreshForCurrentTtl(
  cached: CacheRecord,
  endpoint: ApiFootballEndpoint,
  params: URLSearchParams,
  fallbackTtl: number
) {
  return cached.payload.timestamp + getCacheTtl(endpoint, params, fallbackTtl) > Date.now();
}

function isNearFixtureWindow(params: URLSearchParams) {
  const from = parseApiDate(params.get("from"));
  const to = parseApiDate(params.get("to"));
  if (!from && !to) return false;

  const now = new Date();
  const yesterday = startOfUtcDay(new Date(now.getTime() - 24 * 60 * 60_000));
  const tomorrow = endOfUtcDay(new Date(now.getTime() + 24 * 60 * 60_000));

  return (!to || to >= yesterday) && (!from || from <= tomorrow);
}

function parseApiDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function hasApiFootballErrors(upstream: unknown) {
  if (!upstream || typeof upstream !== "object") return false;
  const errors = (upstream as { errors?: unknown }).errors;
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === "object") return Object.keys(errors).length > 0;
  return Boolean(errors);
}

function loadCache(cacheFile: string) {
  const cache = new Map<string, CacheRecord>();
  if (!existsSync(cacheFile)) return cache;

  try {
    const persisted = JSON.parse(readFileSync(cacheFile, "utf8")) as PersistedCache;
    for (const [key, record] of Object.entries(persisted)) {
      if (!record?.payload || !record.staleUntil || record.staleUntil < Date.now()) continue;
      if (hasApiFootballErrors(record.payload.upstream)) continue;
      cache.set(key, record);
    }
  } catch {
    return cache;
  }

  return cache;
}

function saveCache(cacheFile: string, cache: Map<string, CacheRecord>) {
  mkdirSync(dirname(cacheFile), { recursive: true });
  const persisted = Object.fromEntries(
    [...cache.entries()].filter(([, record]) => record.staleUntil > Date.now())
  );
  writeFileSync(cacheFile, JSON.stringify(persisted, null, 2));
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

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
