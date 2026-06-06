import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

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

let data: SiteAnalyticsData = { days: {} };
let loaded = false;
let writeChain = Promise.resolve();
const onlineSessions = new Map<string, number>();

export async function recordSiteVisit(sessionId: string) {
  await ensureLoaded();
  const today = getTodayKey();
  data.days[today] = data.days[today] ?? { views: 0 };
  data.days[today].views += 1;
  touchOnlineSession(sessionId);
  queueSave();
  return getSiteAnalyticsStats();
}

export async function recordSiteHeartbeat(sessionId: string) {
  await ensureLoaded();
  touchOnlineSession(sessionId);
  return getSiteAnalyticsStats();
}

export async function getSiteAnalyticsStats(): Promise<SiteAnalyticsStats> {
  await ensureLoaded();
  pruneOnlineSessions();
  return {
    todayViews: data.days[getTodayKey()]?.views ?? 0,
    onlineUsers: onlineSessions.size,
  };
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
  const normalized = normalizeSessionId(sessionId);
  onlineSessions.set(normalized, Date.now());
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
