import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import type { ApiFootballService } from "./apiFootball";
import type { CountryData } from "./types";
import {
  getWorldCupFixtures,
  getWorldCupLiveFixtures,
  getWorldCupSquads,
  getWorldCupStandings,
} from "./worldCupData";
import { getWorldCupPlayerProfile, getWorldCupTopScorers } from "./playerProfileData";

export type WorldCupCacheKey =
  | "fixtures"
  | "live"
  | "today"
  | "upcoming"
  | "standings"
  | "top-scorers"
  | "squads"
  | "player-profile"
  | "markets"
  | "news"
  | "meta";

export type WorldCupCacheEnvelope<T = unknown> = {
  ok: boolean;
  key: WorldCupCacheKey;
  updatedAt: string;
  source: string;
  ttlSeconds: number;
  data: T;
  error?: string;
};

type StoredCache = Partial<Record<WorldCupCacheKey, WorldCupCacheEnvelope>>;

type PlayerProfileCacheData = {
  profiles: Record<string, {
    updatedAt: string;
    data: unknown;
    error?: string;
  }>;
};

type WorldCupCacheOptions = {
  apiFootball: ApiFootballService;
  getMarkets: () => CountryData[];
};

type SyncTarget = {
  key: Exclude<WorldCupCacheKey, "meta">;
  ttlSeconds: number;
  intervalMs: number;
  load: () => Promise<unknown>;
  source: string;
};

const DEFAULT_CACHE_FILE = resolve(process.cwd(), "data", "worldcup-cache.json");
const LIVE_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_LIVE_INTERVAL_MS", 60_000);
const FOOTBALL_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_FOOTBALL_INTERVAL_MS", 5 * 60_000);
const NEWS_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_NEWS_INTERVAL_MS", 10 * 60_000);
const RSS_FEEDS = (process.env.WORLDCUP_RSS_FEEDS || "")
  .split(",")
  .map((feed) => feed.trim())
  .filter(Boolean);

export function createWorldCupCache(options: WorldCupCacheOptions) {
  const cacheFile = resolve(process.env.WORLDCUP_CACHE_FILE || DEFAULT_CACHE_FILE);
  const cache = loadCache(cacheFile);
  const timers: ReturnType<typeof setInterval>[] = [];
  let started = false;

  const targets: SyncTarget[] = [
    {
      key: "fixtures",
      ttlSeconds: 300,
      intervalMs: FOOTBALL_INTERVAL_MS,
      source: "api-football",
      load: () => buildFixturesCache(options.apiFootball),
    },
    {
      key: "live",
      ttlSeconds: 90,
      intervalMs: LIVE_INTERVAL_MS,
      source: "vps-worldcup-live",
      load: () => buildLiveSummary(options.apiFootball, options.getMarkets),
    },
    {
      key: "today",
      ttlSeconds: 180,
      intervalMs: FOOTBALL_INTERVAL_MS,
      source: "api-football",
      load: () => getWorldCupFixtures(options.apiFootball, todayUrl()),
    },
    {
      key: "upcoming",
      ttlSeconds: 300,
      intervalMs: FOOTBALL_INTERVAL_MS,
      source: "api-football",
      load: () => getWorldCupFixtures(options.apiFootball, upcomingUrl()),
    },
    {
      key: "standings",
      ttlSeconds: 300,
      intervalMs: FOOTBALL_INTERVAL_MS,
      source: "api-football",
      load: () => getWorldCupStandings(options.apiFootball, tournamentUrl("/api/worldcup/standings")),
    },
    {
      key: "top-scorers",
      ttlSeconds: 300,
      intervalMs: FOOTBALL_INTERVAL_MS,
      source: "api-football",
      load: () => getWorldCupTopScorers(options.apiFootball, tournamentUrl("/api/worldcup/top-scorers")),
    },
    {
      key: "squads",
      ttlSeconds: 3600,
      intervalMs: numberFromEnv("WORLDCUP_CACHE_SQUADS_INTERVAL_MS", 6 * 60 * 60_000),
      source: "api-football",
      load: () => buildSquadsCache(options.apiFootball),
    },
    {
      key: "markets",
      ttlSeconds: 30,
      intervalMs: 15_000,
      source: "polymarket",
      load: async () => ({
        timestamp: Date.now(),
        count: options.getMarkets().length,
        markets: options.getMarkets(),
      }),
    },
    {
      key: "news",
      ttlSeconds: 600,
      intervalMs: NEWS_INTERVAL_MS,
      source: "rss",
      load: fetchRssNews,
    },
  ];

  async function syncTarget(target: SyncTarget) {
    try {
      const data = await target.load();
      cache[target.key] = {
        ok: true,
        key: target.key,
        updatedAt: new Date().toISOString(),
        source: target.source,
        ttlSeconds: target.ttlSeconds,
        data,
      };
      updateMeta(cache, cacheFile);
      saveCache(cacheFile, cache);
      return { key: target.key, ok: true };
    } catch (error) {
      const message = getErrorMessage(error);
      const previous = cache[target.key];
      cache[target.key] = previous
        ? { ...previous, ok: true, error: `serving stale: ${message}` }
        : {
            ok: false,
            key: target.key,
            updatedAt: new Date().toISOString(),
            source: target.source,
            ttlSeconds: target.ttlSeconds,
            data: null,
            error: message,
          };
      updateMeta(cache, cacheFile);
      saveCache(cacheFile, cache);
      return { key: target.key, ok: false, error: message };
    }
  }

  async function syncAll() {
    const results = await Promise.allSettled(targets.map(syncTarget));
    return results.map((result) =>
      result.status === "fulfilled" ? result.value : { key: "meta", ok: false, error: getErrorMessage(result.reason) }
    );
  }

  return {
    start() {
      if (started) return;
      started = true;
      void syncAll();
      for (const target of targets) {
        timers.push(setInterval(() => void syncTarget(target), target.intervalMs));
      }
    },

    stop() {
      for (const timer of timers.splice(0)) clearInterval(timer);
      started = false;
    },

    get(key: WorldCupCacheKey) {
      return cache[key] ?? null;
    },

    async getPlayerProfile(playerId: number, season = "2025") {
      const cacheKey = `${playerId}:${season}`;
      const bucket = ensurePlayerProfileBucket(cache);
      const cached = bucket.data.profiles[cacheKey];
      const maxAgeMs = numberFromEnv("WORLDCUP_CACHE_PLAYER_PROFILE_MAX_AGE_MS", 24 * 60 * 60_000);

      if (cached && Date.now() - Date.parse(cached.updatedAt) <= maxAgeMs && !cached.error) {
        return toPlayerProfileEnvelope(cacheKey, cached.data, cached.updatedAt);
      }

      try {
        const data = await getWorldCupPlayerProfile(options.apiFootball, playerProfileUrl(playerId, season));
        bucket.data.profiles[cacheKey] = {
          updatedAt: new Date().toISOString(),
          data,
        };
        bucket.updatedAt = new Date().toISOString();
        updateMeta(cache, cacheFile);
        saveCache(cacheFile, cache);
        return toPlayerProfileEnvelope(cacheKey, data, bucket.data.profiles[cacheKey].updatedAt);
      } catch (error) {
        if (cached) {
          cached.error = `serving stale: ${getErrorMessage(error)}`;
          bucket.updatedAt = new Date().toISOString();
          updateMeta(cache, cacheFile);
          saveCache(cacheFile, cache);
          return toPlayerProfileEnvelope(cacheKey, cached.data, cached.updatedAt, cached.error);
        }
        throw error;
      }
    },

    syncAll,
  };
}

async function buildSquadsCache(apiFootball: ApiFootballService) {
  const standings = await getWorldCupStandings(apiFootball, tournamentUrl("/api/worldcup/standings"));
  const teamIds = extractTeamIdsFromStandings(standings);

  if (!teamIds.length) {
    throw new Error("worldcup_squads_missing_team_ids");
  }

  return getWorldCupSquads(apiFootball, squadsUrl(teamIds));
}

export type WorldCupCacheService = ReturnType<typeof createWorldCupCache>;

async function buildFixturesCache(apiFootball: ApiFootballService) {
  const [fixtures, live] = await Promise.all([
    getWorldCupFixtures(apiFootball, tournamentUrl("/api/worldcup/fixtures")),
    getWorldCupLiveFixtures(apiFootball, tournamentUrl("/api/worldcup/live")),
  ]);

  return mergeFixturePayload(fixtures, live);
}

async function buildLiveSummary(apiFootball: ApiFootballService, getMarkets: () => CountryData[]) {
  const [live, today, standings, news] = await Promise.allSettled([
    getWorldCupLiveFixtures(apiFootball, tournamentUrl("/api/worldcup/live")),
    getWorldCupFixtures(apiFootball, todayUrl()),
    getWorldCupStandings(apiFootball, tournamentUrl("/api/worldcup/standings")),
    fetchRssNews(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    live: valueOrNull(live),
    today: valueOrNull(today),
    standings: valueOrNull(standings),
    markets: {
      timestamp: Date.now(),
      count: getMarkets().length,
      markets: getMarkets(),
    },
    news: valueOrNull(news),
  };
}

function mergeFixturePayload(basePayload: unknown, livePayload: unknown) {
  const base = basePayload as { fixtures?: Array<Record<string, unknown>> };
  const live = livePayload as { fixtures?: Array<Record<string, unknown>> };
  const fixtures = base.fixtures ?? [];
  const overlays = live.fixtures ?? [];

  if (!fixtures.length || !overlays.length) return basePayload;

  const overlaysById = new Map(
    overlays
      .map((fixture) => [Number(fixture.apiFixtureId), fixture] as const)
      .filter(([id]) => Number.isFinite(id) && id > 0)
  );

  return {
    ...(basePayload as object),
    fixtures: fixtures.map((fixture) => {
      const overlay = overlaysById.get(Number(fixture.apiFixtureId));
      return overlay ? mergeFixture(fixture, overlay) : fixture;
    }),
  };
}

function mergeFixture(base: Record<string, unknown>, overlay: Record<string, unknown>) {
  return {
    ...base,
    status: overlay.status ?? base.status,
    statusLabel: overlay.statusLabel ?? base.statusLabel,
    elapsed: overlay.elapsed ?? base.elapsed,
    score: overlay.score ?? base.score,
    homeTeam: overlay.homeTeam ?? base.homeTeam,
    awayTeam: overlay.awayTeam ?? base.awayTeam,
    weather: overlay.weather || base.weather,
  };
}

function tournamentUrl(pathname: string) {
  return new URL(`${pathname}?league=${process.env.WORLDCUP_LEAGUE_ID || "1"}&season=${process.env.WORLDCUP_SEASON || "2026"}`, "http://localhost");
}

function todayUrl() {
  const url = tournamentUrl("/api/worldcup/fixtures");
  url.searchParams.set("date", new Date().toISOString().slice(0, 10));
  return url;
}

function upcomingUrl() {
  const url = tournamentUrl("/api/worldcup/fixtures");
  url.searchParams.set("next", process.env.WORLDCUP_CACHE_UPCOMING_LIMIT || "20");
  return url;
}

function squadsUrl(teamIds: number[]) {
  const url = new URL("/api/worldcup/squads", "http://localhost");
  teamIds.forEach((teamId) => url.searchParams.append("team", String(teamId)));
  return url;
}

function extractTeamIdsFromStandings(payload: unknown) {
  const ids = new Set<number>();
  const rows = (payload as { standings?: Array<{ team?: { id?: number | null } }> })?.standings ?? [];

  for (const row of rows) {
    const teamId = Number(row.team?.id);
    if (Number.isFinite(teamId) && teamId > 0) ids.add(teamId);
  }

  return [...ids];
}

function ensurePlayerProfileBucket(cache: StoredCache) {
  const current = cache["player-profile"];
  if (current && isPlayerProfileCacheData(current.data)) return current as WorldCupCacheEnvelope<PlayerProfileCacheData>;

  const bucket: WorldCupCacheEnvelope<PlayerProfileCacheData> = {
    ok: true,
    key: "player-profile",
    updatedAt: new Date().toISOString(),
    source: "api-football",
    ttlSeconds: 24 * 60 * 60,
    data: { profiles: {} },
  };
  cache["player-profile"] = bucket;
  return bucket;
}

function isPlayerProfileCacheData(value: unknown): value is PlayerProfileCacheData {
  return Boolean(value && typeof value === "object" && "profiles" in value && typeof (value as PlayerProfileCacheData).profiles === "object");
}

function toPlayerProfileEnvelope(cacheKey: string, data: unknown, updatedAt: string, error?: string): WorldCupCacheEnvelope {
  return {
    ok: true,
    key: "player-profile",
    updatedAt,
    source: "api-football",
    ttlSeconds: 24 * 60 * 60,
    data: {
      cacheKey,
      ...asObject(data),
    },
    error,
  };
}

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : { value };
}

function playerProfileUrl(playerId: number, season: string) {
  return new URL(`/api/worldcup/player-profile?player=${playerId}&season=${encodeURIComponent(season)}`, "http://localhost");
}

async function fetchRssNews() {
  if (!RSS_FEEDS.length) {
    return { configured: false, items: [] };
  }

  const items = (
    await Promise.all(
      RSS_FEEDS.map(async (feed) => {
        const response = await fetchWithTimeout(feed, 8000);
        if (!response.ok) throw new Error(`RSS feed failed with ${response.status}: ${feed}`);
        return parseRssItems(await response.text(), feed);
      })
    )
  )
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
    .slice(0, 30);

  return { configured: true, items };
}

function parseRssItems(xml: string, feed: string) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => {
    const item = match[0];
    return {
      title: decodeXml(readTag(item, "title")),
      link: decodeXml(readTag(item, "link")),
      summary: decodeXml(readTag(item, "description")).replace(/<[^>]*>/g, "").slice(0, 280),
      publishedAt: decodeXml(readTag(item, "pubDate")),
      feed,
    };
  });
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return (match?.[1] || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchWithTimeout(input: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function loadCache(cacheFile: string): StoredCache {
  if (!existsSync(cacheFile)) return {};
  try {
    return JSON.parse(readFileSync(cacheFile, "utf8")) as StoredCache;
  } catch {
    return {};
  }
}

function saveCache(cacheFile: string, cache: StoredCache) {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
}

function updateMeta(cache: StoredCache, cacheFile: string) {
  cache.meta = {
    ok: true,
    key: "meta",
    updatedAt: new Date().toISOString(),
    source: "vps-cache",
    ttlSeconds: 60,
    data: {
      cacheFile,
      keys: Object.keys(cache).filter((key) => key !== "meta"),
      entries: Object.fromEntries(
        Object.entries(cache)
          .filter(([key]) => key !== "meta")
          .map(([key, value]) => [
            key,
            {
              ok: value?.ok ?? false,
              updatedAt: value?.updatedAt ?? null,
              error: value?.error ?? null,
            },
          ])
      ),
    },
  };
}

function numberFromEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function valueOrNull<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
