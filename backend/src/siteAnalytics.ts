import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import type { Pool } from "pg";

type SiteAnalyticsData = {
  days: Record<string, { views: number }>;
};

type SiteAnalyticsStats = {
  todayViews: number;
  onlineUsers: number;
};

const ANALYTICS_FILE = resolve(process.env.SITE_ANALYTICS_FILE || "data/site-analytics.json");
const ONLINE_WINDOW_MS = 60_000;
const TIME_ZONE = process.env.SITE_ANALYTICS_TIME_ZONE || "Asia/Shanghai";
const DB_CLEANUP_INTERVAL_MS = 60_000;

let data: SiteAnalyticsData = { days: {} };
let loaded = false;
let writeChain = Promise.resolve();
let pool: Pool | null = null;
let dbReady: Promise<Pool | null> | null = null;
let lastDbCleanupAt = 0;
const onlineSessions = new Map<string, number>();

export async function recordSiteVisit(sessionId: string) {
  const db = await getPool();
  const today = getTodayKey();
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (db) {
    await db.query(
      `
      insert into site_analytics_daily (day, views, updated_at)
      values ($1::date, 1, now())
      on conflict (day)
      do update set views = site_analytics_daily.views + 1, updated_at = now()
      `,
      [today]
    );
    await touchOnlineSessionInDb(db, normalizedSessionId);
    return getSiteAnalyticsStats();
  }

  await ensureLoaded();
  data.days[today] = data.days[today] ?? { views: 0 };
  data.days[today].views += 1;
  touchOnlineSession(normalizedSessionId);
  queueSave();
  return getSiteAnalyticsStats();
}

export async function recordSiteHeartbeat(sessionId: string) {
  const db = await getPool();
  const normalizedSessionId = normalizeSessionId(sessionId);
  if (db) {
    await touchOnlineSessionInDb(db, normalizedSessionId);
    return null;
  }

  await ensureLoaded();
  touchOnlineSession(normalizedSessionId);
  return null;
}

export async function getSiteAnalyticsStats(): Promise<SiteAnalyticsStats> {
  const db = await getPool();
  const today = getTodayKey();
  if (db) {
    const staleBefore = new Date(Date.now() - ONLINE_WINDOW_MS);
    await cleanupStaleOnlineSessionsInDb(db, staleBefore);
    const result = await db.query<{ today_views: number; online_users: number }>(
      `
      select
        coalesce((select views from site_analytics_daily where day = $1::date), 0)::int as today_views,
        (select count(*) from site_analytics_sessions where last_seen_at >= $2)::int as online_users
      `,
      [today, staleBefore]
    );
    return {
      todayViews: result.rows[0]?.today_views ?? 0,
      onlineUsers: result.rows[0]?.online_users ?? 0,
    };
  }

  await ensureLoaded();
  pruneOnlineSessions();
  return {
    todayViews: data.days[today]?.views ?? 0,
    onlineUsers: onlineSessions.size,
  };
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!dbReady) {
    dbReady = import("pg")
      .then(async ({ Pool }) => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        if (!isDatabaseSchemaInitDisabled()) {
          await pool.query(`
            create table if not exists site_analytics_daily (
              day date primary key,
              views integer not null default 0,
              updated_at timestamptz not null default now()
            )
          `);
          await pool.query(`
            create table if not exists site_analytics_sessions (
              session_id text primary key,
              last_seen_at timestamptz not null default now()
            )
          `);
          await importAnalyticsFile(pool);
        }
        return pool;
      })
      .catch((error) => {
        console.warn("[SiteAnalytics] Postgres unavailable, falling back to file store:", error);
        return null;
      });
  }

  return dbReady;
}

async function importAnalyticsFile(db: Pool) {
  try {
    const existing = await db.query<{ count: string }>("select count(*) from site_analytics_daily");
    if (Number(existing.rows[0]?.count ?? 0) > 0) return;

    const raw = await readFile(ANALYTICS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteAnalyticsData>;
    const days = parsed.days && typeof parsed.days === "object" ? normalizeDays(parsed.days) : {};
    for (const [day, value] of Object.entries(days)) {
      await db.query(
        `
        insert into site_analytics_daily (day, views, updated_at)
        values ($1::date, $2, now())
        on conflict (day)
        do update set views = excluded.views, updated_at = now()
        `,
        [day, value.views]
      );
    }
  } catch {
    // No local analytics file yet; start with empty Postgres stats.
  }
}

function isDatabaseSchemaInitDisabled() {
  return process.env.DB_SCHEMA_INIT_DISABLED === "true" || process.env.DATABASE_SCHEMA_INIT_DISABLED === "true";
}

async function touchOnlineSessionInDb(db: Pool, sessionId: string) {
  await db.query(
    `
    insert into site_analytics_sessions (session_id, last_seen_at)
    values ($1, now())
    on conflict (session_id)
    do update set last_seen_at = now()
    `,
    [sessionId]
  );
}

async function cleanupStaleOnlineSessionsInDb(db: Pool, staleBefore = new Date(Date.now() - ONLINE_WINDOW_MS)) {
  const now = Date.now();
  if (now - lastDbCleanupAt < DB_CLEANUP_INTERVAL_MS) return;
  lastDbCleanupAt = now;
  await db.query("delete from site_analytics_sessions where last_seen_at < $1", [staleBefore]);
}

async function ensureLoaded() {
  if (loaded) return;

  try {
    const raw = await readFile(ANALYTICS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteAnalyticsData>;
    data = {
      days: parsed.days && typeof parsed.days === "object" ? normalizeDays(parsed.days) : {},
    };
  } catch {
    data = { days: {} };
  }

  loaded = true;
}

function normalizeDays(days: SiteAnalyticsData["days"]) {
  return Object.fromEntries(
    Object.entries(days)
      .filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Number.isFinite(value?.views))
      .map(([key, value]) => [key, { views: Math.max(0, Math.floor(value.views)) }])
  );
}

function touchOnlineSession(sessionId: string) {
  onlineSessions.set(sessionId, Date.now());
  pruneOnlineSessions();
}

function normalizeSessionId(sessionId: string) {
  const trimmed = sessionId.trim().slice(0, 120);
  return trimmed || `anonymous-${Date.now()}`;
}

function pruneOnlineSessions() {
  const staleBefore = Date.now() - ONLINE_WINDOW_MS;
  for (const [sessionId, lastSeen] of onlineSessions) {
    if (lastSeen < staleBefore) onlineSessions.delete(sessionId);
  }
}

function queueSave() {
  writeChain = writeChain
    .then(async () => {
      await mkdir(dirname(ANALYTICS_FILE), { recursive: true });
      await writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf8");
    })
    .catch((error) => {
      console.warn("[SiteAnalytics] save failed:", error);
    });
}

function getTodayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
