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
import { getWorldCupTopScorers } from "./playerProfileData";

export type WorldCupCacheKey =
  | "fixtures"
  | "live"
  | "today"
  | "upcoming"
  | "standings"
  | "top-scorers"
  | "squads"
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
      load: () => getWorldCupFixtures(options.apiFootball, tournamentUrl("/api/worldcup/fixtures")),
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
