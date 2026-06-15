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
  schedule: SyncSchedule;
  intervalMs?: number;
  load: () => Promise<unknown>;
  source: string;
};

type SyncSchedule = "always" | "daily" | "daily-window" | "window" | "interval";

const DEFAULT_CACHE_FILE = resolve(process.cwd(), "data", "worldcup-cache.json");
const LIVE_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_LIVE_INTERVAL_MS", 60_000);
const MATCH_WINDOW_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_MATCH_WINDOW_INTERVAL_MS", 10 * 60_000);
const TOP_SCORERS_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_TOP_SCORERS_INTERVAL_MS", 30 * 60_000);
const SQUADS_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_SQUADS_INTERVAL_MS", 24 * 60 * 60_000);
const NEWS_INTERVAL_MS = numberFromEnv("WORLDCUP_CACHE_NEWS_INTERVAL_MS", 10 * 60_000);
const SCHEDULER_TICK_MS = numberFromEnv("WORLDCUP_CACHE_SCHEDULER_TICK_MS", 60_000);
const DAILY_REFRESH_HOUR = numberFromEnv("WORLDCUP_CACHE_DAILY_REFRESH_HOUR", 12);
const MATCH_WINDOW_BEFORE_MS = numberFromEnv("WORLDCUP_CACHE_MATCH_WINDOW_BEFORE_MS", 30 * 60_000);
const MATCH_WINDOW_AFTER_MS = numberFromEnv("WORLDCUP_CACHE_MATCH_WINDOW_AFTER_MS", 30 * 60_000);
const MATCH_WINDOW_ASSUMED_MATCH_MS = numberFromEnv("WORLDCUP_CACHE_MATCH_WINDOW_ASSUMED_MATCH_MS", 3 * 60 * 60_000);
const LIVE_GRACE_MS = numberFromEnv("WORLDCUP_CACHE_LIVE_GRACE_MS", 15 * 60_000);
const RSS_FEEDS = (process.env.WORLDCUP_RSS_FEEDS || "")
  .split(",")
  .map((feed) => feed.trim())
  .filter(Boolean);

export function createWorldCupCache(options: WorldCupCacheOptions) {
  const cacheFile = resolve(process.env.WORLDCUP_CACHE_FILE || DEFAULT_CACHE_FILE);
  const cache = loadCache(cacheFile);
  const timers: ReturnType<typeof setInterval>[] = [];
  const runningTargets = new Set<WorldCupCacheKey>();
  let started = false;

  const targets: SyncTarget[] = [
    {
      key: "fixtures",
      ttlSeconds: 300,
      schedule: "daily",
      source: "api-football",
      load: () => buildFixturesCache(options.apiFootball),
    },
    {
      key: "live",
      ttlSeconds: 90,
      schedule: "window",
      intervalMs: LIVE_INTERVAL_MS,
      source: "vps-worldcup-live",
      load: () => buildLiveSummary(options.apiFootball, options.getMarkets, cache),
    },
    {
      key: "today",
      ttlSeconds: 180,
      schedule: "daily-window",
      source: "api-football",
      load: () => getWorldCupFixtures(options.apiFootball, todayUrl()),
    },
    {
      key: "upcoming",
      ttlSeconds: 300,
      schedule: "daily-window",
      source: "api-football",
      load: () => getWorldCupFixtures(options.apiFootball, upcomingUrl()),
    },
    {
      key: "standings",
      ttlSeconds: 300,
      schedule: "daily-window",
      source: "api-football",
      load: () => getWorldCupStandings(options.apiFootball, tournamentUrl("/api/worldcup/standings")),
    },
    {
      key: "top-scorers",
      ttlSeconds: 300,
      schedule: "window",
      intervalMs: TOP_SCORERS_INTERVAL_MS,
      source: "api-football",
      load: () => getWorldCupTopScorers(options.apiFootball, tournamentUrl("/api/worldcup/top-scorers")),
    },
    {
      key: "squads",
      ttlSeconds: 3600,
      schedule: "interval",
      intervalMs: SQUADS_INTERVAL_MS,
      source: "api-football",
      load: () => buildSquadsCache(options.apiFootball),
    },
    {
      key: "markets",
      ttlSeconds: 30,
      schedule: "always",
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
      schedule: "interval",
      intervalMs: NEWS_INTERVAL_MS,
      source: "rss",
      load: fetchRssNews,
    },
  ];

  async function syncTarget(target: SyncTarget) {
    if (runningTargets.has(target.key)) {
      return { key: target.key, ok: true, skipped: "already_running" };
    }
    runningTargets.add(target.key);
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
      const diskPrevious = loadCache(cacheFile)[target.key];
      const stale = previous?.data ? previous : diskPrevious?.data ? diskPrevious : previous;
      cache[target.key] = stale
        ? { ...stale, ok: true, error: `serving stale: ${message}` } as WorldCupCacheEnvelope
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
    } finally {
      runningTargets.delete(target.key);
    }
  }

  async function syncAll() {
    const results = await Promise.allSettled(targets.map(syncTarget));
    return results.map((result) =>
      result.status === "fulfilled" ? result.value : { key: "meta", ok: false, error: getErrorMessage(result.reason) }
    );
  }

  async function syncKey(key: WorldCupCacheKey) {
    if (key === "meta") return syncAll();
    if (key === "player-profile") return { key, ok: true, skipped: "manual_refresh_unsupported" };

    const target = targets.find((item) => item.key === key);
    if (!target) return { key, ok: true, skipped: "target_not_found" };

    return syncTarget(target);
  }

  function syncDueTargets() {
    const now = Date.now();
    const windowState = getMatchWindowState(cache, now);
    for (const target of targets) {
      if (shouldSyncTarget(target, cache[target.key], now, windowState)) {
        void syncTarget(target);
      }
    }
  }

  return {
    start() {
      if (started) return;
      started = true;
      syncDueTargets();
      timers.push(setInterval(syncDueTargets, SCHEDULER_TICK_MS));
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
        const data = enrichPlayerProfileFromSquads(
          await getWorldCupPlayerProfile(options.apiFootball, playerProfileUrl(playerId, season)),
          cache["squads"]?.data,
          playerId,
          season
        );
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
    syncKey,
  };
}

type MatchWindowState = {
  active: boolean;
  inScheduledWindow: boolean;
  hasRecentLive: boolean;
};

function shouldSyncTarget(
  target: SyncTarget,
  current: WorldCupCacheEnvelope | null | undefined,
  now: number,
  windowState: MatchWindowState
) {
  const intervalMs = target.intervalMs ?? MATCH_WINDOW_INTERVAL_MS;

  if (!current?.data) {
    return target.schedule !== "window" || windowState.active;
  }

  if (target.schedule === "always") {
    return isCacheOlderThan(current, now, intervalMs);
  }

  if (target.schedule === "interval") {
    return isCacheOlderThan(current, now, intervalMs);
  }

  if (target.schedule === "daily") {
    return isDailyRefreshDue(current, now);
  }

  if (target.schedule === "daily-window") {
    return isDailyRefreshDue(current, now) || (windowState.active && isCacheOlderThan(current, now, MATCH_WINDOW_INTERVAL_MS));
  }

  if (target.schedule === "window") {
    return windowState.active && isCacheOlderThan(current, now, intervalMs);
  }

  return false;
}

function getMatchWindowState(cache: StoredCache, now: number): MatchWindowState {
  const starts = getTodayFixtureStartTimes(cache, now);
  const start = starts.length ? Math.min(...starts) - MATCH_WINDOW_BEFORE_MS : 0;
  const end = starts.length ? Math.max(...starts) + MATCH_WINDOW_ASSUMED_MATCH_MS + MATCH_WINDOW_AFTER_MS : 0;
  const inScheduledWindow = Boolean(starts.length && now >= start && now <= end);
  const hasRecentLive = hasRecentLiveFixtures(cache, now);

  return {
    active: inScheduledWindow || hasRecentLive,
    inScheduledWindow,
    hasRecentLive,
  };
}

function getTodayFixtureStartTimes(cache: StoredCache, now: number) {
  const todayInShanghai = formatDateInOffset(now, 8);
  const fixtures = [
    ...getPayloadFixtures(cache.today?.data),
    ...getPayloadFixtures(cache.fixtures?.data),
  ];
  const seen = new Set<number>();

  return fixtures
    .map((fixture) => Date.parse(String(fixture.startIso ?? fixture.date ?? "")))
    .filter((time) => Number.isFinite(time) && formatDateInOffset(time, 8) === todayInShanghai)
    .filter((time) => {
      if (seen.has(time)) return false;
      seen.add(time);
      return true;
    });
}

function hasRecentLiveFixtures(cache: StoredCache, now: number) {
  const liveUpdatedAt = Date.parse(cache.live?.updatedAt ?? "");
  if (!Number.isFinite(liveUpdatedAt) || now - liveUpdatedAt > LIVE_GRACE_MS) return false;
  return getLiveFixtures(cache.live?.data).some(isLiveFixture);
}

function getLiveFixtures(data: unknown) {
  const summary = asObject(data);
  const live = asObject(summary.live ?? data);
  return getPayloadFixtures(live);
}

function getPayloadFixtures(data: unknown) {
  const payload = asObject(data);
  return Array.isArray(payload.fixtures) ? (payload.fixtures as Array<Record<string, unknown>>) : [];
}

function isLiveFixture(fixture: Record<string, unknown>) {
  const status = String(fixture.status ?? fixture.statusLabel ?? "").toLowerCase();
  return ["live", "1h", "2h", "ht", "et", "bt", "p", "in_play"].some((token) => status.includes(token));
}

function isCacheOlderThan(current: WorldCupCacheEnvelope, now: number, intervalMs: number) {
  const updatedAt = Date.parse(current.updatedAt);
  return !Number.isFinite(updatedAt) || now - updatedAt >= intervalMs;
}

function isDailyRefreshDue(current: WorldCupCacheEnvelope, now: number) {
  const updatedAt = Date.parse(current.updatedAt);
  if (!Number.isFinite(updatedAt)) return true;
  const boundary = getDailyRefreshBoundary(now);
  return now >= boundary && updatedAt < boundary;
}

function getDailyRefreshBoundary(now: number) {
  const date = new Date(now);
  const hour = Math.max(0, Math.min(23, Math.floor(DAILY_REFRESH_HOUR)));
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

function startOfUtcDayMs(now: number) {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatDateInOffset(value: number, offsetHours: number) {
  return new Date(value + offsetHours * 60 * 60_000).toISOString().slice(0, 10);
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
  return getWorldCupFixtures(apiFootball, tournamentUrl("/api/worldcup/fixtures"));
}

async function buildLiveSummary(apiFootball: ApiFootballService, getMarkets: () => CountryData[], cache: StoredCache) {
  const live = await getWorldCupLiveFixtures(apiFootball, tournamentUrl("/api/worldcup/live"));

  return {
    generatedAt: new Date().toISOString(),
    live,
    today: cache.today?.data ?? null,
    standings: cache.standings?.data ?? null,
    markets: {
      timestamp: Date.now(),
      count: getMarkets().length,
      markets: getMarkets(),
    },
    news: cache.news?.data ?? null,
  };
}

function tournamentUrl(pathname: string) {
  return new URL(`${pathname}?league=${process.env.WORLDCUP_LEAGUE_ID || "1"}&season=${process.env.WORLDCUP_SEASON || "2026"}`, "http://localhost");
}

function todayUrl() {
  const url = tournamentUrl("/api/worldcup/fixtures");
  const now = Date.now();
  const shanghaiDayStartUtc = startOfOffsetDayUtcMs(now, 8);
  const shanghaiDayEndUtc = shanghaiDayStartUtc + 24 * 60 * 60_000 - 1;
  url.searchParams.set("from", new Date(shanghaiDayStartUtc).toISOString().slice(0, 10));
  url.searchParams.set("to", new Date(shanghaiDayEndUtc).toISOString().slice(0, 10));
  return url;
}

function startOfOffsetDayUtcMs(now: number, offsetHours: number) {
  const offsetMs = offsetHours * 60 * 60_000;
  const shifted = new Date(now + offsetMs);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - offsetMs;
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

function enrichPlayerProfileFromSquads(profileData: unknown, squadsData: unknown, playerId: number, season: string) {
  const data = asObject(profileData);
  const squadHit = findSquadPlayer(squadsData, playerId);
  if (!squadHit) return profileData;

  const player = asObject(data.player);
  const squadPlayer = asObject(squadHit.player);
  const seasonStats = Array.isArray(data.seasonStats) ? data.seasonStats : [];

  return {
    ...data,
    player: {
      id: player.id ?? squadPlayer.id ?? playerId,
      name: player.name ?? squadPlayer.nameCn ?? squadPlayer.nameEn ?? "",
      nameCn: player.nameCn ?? squadPlayer.nameCn ?? squadPlayer.nameEn ?? "",
      nameEn: player.nameEn ?? squadPlayer.nameEn ?? squadPlayer.nameCn ?? "",
      age: player.age ?? squadPlayer.age ?? null,
      number: player.number ?? squadPlayer.number ?? null,
      position: player.position ?? squadPlayer.position ?? "",
      photo: player.photo ?? squadPlayer.photo ?? "",
      ...player,
    },
    currentTeam: data.currentTeam ?? null,
    currentSeason: data.currentSeason ?? Number(season),
    seasonStats: seasonStats.length ? seasonStats : [buildSquadFallbackStatistic(squadHit, season)],
  };
}

function findSquadPlayer(squadsData: unknown, playerId: number) {
  const squads = (asObject(squadsData).squads ?? []) as Array<Record<string, unknown>>;
  for (const squad of squads) {
    const players = (asObject(squad).players ?? []) as Array<Record<string, unknown>>;
    const player = players.find((item) => Number(item.id) === playerId);
    if (player) return { squad, player };
  }
  return null;
}

function buildSquadFallbackStatistic(
  hit: { squad: Record<string, unknown>; player: Record<string, unknown> },
  season: string
) {
  const player = asObject(hit.player);
  return {
    team: null,
    league: {
      id: Number(process.env.WORLDCUP_LEAGUE_ID || "1"),
      name: "FIFA World Cup",
      country: "World",
      season: Number(season),
      logo: "",
    },
    games: {
      appearences: 0,
      lineups: 0,
      minutes: 0,
      position: player.positionCn ?? player.position ?? null,
      rating: player.rating ?? null,
    },
    goals: { total: 0, assists: 0 },
    shots: { total: 0, on: 0 },
    passes: { total: 0, key: 0, accuracy: 0 },
    tackles: { total: 0, interceptions: 0 },
    cards: { yellow: 0, red: 0 },
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
