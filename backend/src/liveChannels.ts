import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import type { Pool } from "pg";

export type LiveChannel = {
  id: string;
  matchId: string;
  matchIds?: string[];
  matchType?: "official" | "warmup";
  name: string;
  platform: string;
  streamUrl: string;
  isActive: boolean;
  sortOrder: number;
  note?: string;
  updatedAt: string;
};

const STORE_PATH = resolve(process.cwd(), "data", "live-channels.json");

const DEFAULT_CHANNELS: LiveChannel[] = [];

let pool: Pool | null = null;
let dbReady: Promise<Pool | null> | null = null;

export async function readLiveChannels() {
  const db = await getPool();
  if (db) {
    const result = await db.query<{ data: LiveChannel }>("select data from live_channels order by updated_at desc");
    if (result.rowCount) return normalizeChannels(result.rows.map((row) => row.data));

    const fileChannels = await readLiveChannelsFile();
    if (fileChannels.length) await saveLiveChannelsToDb(db, fileChannels);
    return fileChannels;
  }

  return readLiveChannelsFile();
}

export async function saveLiveChannels(channels: LiveChannel[]) {
  const normalized = normalizeChannels(channels);
  const db = await getPool();
  if (db) {
    await saveLiveChannelsToDb(db, normalized);
    return;
  }

  await saveLiveChannelsFile(normalized);
}

export async function getPublicLiveChannels(matchId: string) {
  const channels = await readLiveChannels();
  return channels
    .filter((channel) => isChannelLinkedToMatch(channel, matchId) && channel.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertLiveChannel(input: Partial<LiveChannel>) {
  const matchIds = normalizeMatchIds(input.matchIds, input.matchId);
  const matchId = matchIds[0] ?? "";
  const name = String(input.name || "").trim();
  if (!matchId) throw Object.assign(new Error("missing_match_id"), { statusCode: 400 });
  if (!name) throw Object.assign(new Error("missing_channel_name"), { statusCode: 400 });

  const channels = await readLiveChannels();
  const now = new Date().toISOString();
  const id = String(input.id || "").trim() || `channel-${Date.now()}`;
  const current = channels.find((channel) => channel.id === id);
  const streamUrl = normalizeStreamUrl(input.streamUrl);
  const next: LiveChannel = {
    id,
    matchId,
    matchIds,
    matchType: input.matchType === "warmup" ? "warmup" : "official",
    name,
    platform: String(input.platform || "HLS").trim() || "HLS",
    streamUrl,
    isActive: typeof input.isActive === "boolean" ? input.isActive : current?.isActive ?? true,
    sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : current?.sortOrder ?? channels.length + 1,
    note: String(input.note || "").trim(),
    updatedAt: now,
  };

  const index = channels.findIndex((channel) => channel.id === id);
  if (index >= 0) channels[index] = next;
  else channels.push(next);

  await saveLiveChannels(channels);
  return next;
}

export async function deleteLiveChannel(id: string) {
  const channels = await readLiveChannels();
  const next = channels.filter((channel) => channel.id !== id);
  await saveLiveChannels(next);
  return { deleted: next.length !== channels.length };
}

function normalizeStreamUrl(value: unknown) {
  const streamUrl = String(value || "").trim();
  if (!streamUrl) return "";

  let parsed: URL;
  try {
    parsed = new URL(streamUrl);
  } catch {
    throw Object.assign(new Error("invalid_stream_url"), { statusCode: 400 });
  }

  if (parsed.protocol !== "https:") {
    throw Object.assign(new Error("stream_url_must_be_https"), { statusCode: 400 });
  }

  if (!parsed.pathname.toLowerCase().endsWith(".m3u8")) {
    throw Object.assign(new Error("stream_url_must_be_hls"), { statusCode: 400 });
  }

  if (isPrivateHost(parsed.hostname)) {
    throw Object.assign(new Error("stream_url_host_not_allowed"), { statusCode: 400 });
  }

  const allowedHosts = getAllowedStreamHosts();
  if (allowedHosts.size && !allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw Object.assign(new Error("stream_url_host_not_allowed"), { statusCode: 400 });
  }

  return parsed.toString();
}

function getAllowedStreamHosts() {
  return new Set(
    (process.env.ALLOWED_STREAM_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!dbReady) {
    dbReady = import("pg")
      .then(async ({ Pool }) => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        if (!isDatabaseSchemaInitDisabled()) {
          await pool.query(`
            create table if not exists live_channels (
              id text primary key,
              data jsonb not null,
              updated_at timestamptz not null default now()
            )
          `);
        }
        return pool;
      })
      .catch((error) => {
        console.warn("[LiveChannels] Postgres unavailable, falling back to file store:", error);
        return null;
      });
  }

  return dbReady;
}

async function readLiveChannelsFile() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeChannels(Array.isArray(parsed) ? parsed : parsed.channels);
  } catch {
    await saveLiveChannelsFile(DEFAULT_CHANNELS);
    return DEFAULT_CHANNELS;
  }
}

function isDatabaseSchemaInitDisabled() {
  return process.env.DB_SCHEMA_INIT_DISABLED === "true" || process.env.DATABASE_SCHEMA_INIT_DISABLED === "true";
}

async function saveLiveChannelsFile(channels: LiveChannel[]) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(channels, null, 2), "utf8");
}

async function saveLiveChannelsToDb(db: Pool, channels: LiveChannel[]) {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("delete from live_channels");
    for (const channel of channels) {
      await client.query(
        `
        insert into live_channels (id, data, updated_at)
        values ($1, $2, now())
        on conflict (id)
        do update set data = excluded.data, updated_at = now()
        `,
        [channel.id, channel]
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function normalizeChannels(value: unknown): LiveChannel[] {
  if (!Array.isArray(value)) return DEFAULT_CHANNELS;
  return value.map((item) => {
    const channel = item as Partial<LiveChannel>;
    return {
      id: String(channel.id || `channel-${Math.random().toString(36).slice(2)}`),
      matchId: String(channel.matchId || ""),
      matchIds: normalizeMatchIds(channel.matchIds, channel.matchId),
      matchType: channel.matchType === "warmup" ? "warmup" : "official",
      name: String(channel.name || "未命名通道"),
      platform: String(channel.platform || "HLS"),
      streamUrl: String(channel.streamUrl || ""),
      isActive: channel.isActive !== false,
      sortOrder: Number(channel.sortOrder || 1),
      note: String(channel.note || ""),
      updatedAt: String(channel.updatedAt || new Date().toISOString()),
    };
  });
}

function normalizeMatchIds(value: unknown, fallback?: unknown) {
  const ids = new Set<string>();

  const add = (item: unknown) => {
    const text = normalizeMatchId(String(item || "").trim());
    if (text) ids.add(text);
  };

  if (Array.isArray(value)) {
    value.forEach(add);
  } else if (typeof value === "string") {
    value.split(/[\n,，\s]+/).forEach(add);
  }

  add(fallback);
  return [...ids];
}

function isChannelLinkedToMatch(channel: LiveChannel, matchId: string) {
  const ids = normalizeMatchIds(channel.matchIds, channel.matchId);
  const normalizedMatchId = normalizeMatchId(matchId);
  return ids.includes(normalizedMatchId);
}

function normalizeMatchId(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^[a-z0-9-]+$/i.test(text)) return slugifyMatchId(text);
  const isWarmup = text.toLowerCase().startsWith("warmup-");

  const clean = (isWarmup ? text.slice("warmup-".length) : text)
    .replace(/^⚽\s*/, "")
    .replace(/\s*(?:\([^)]+\)|（[^）]+）)\s*$/, "")
    .trim();
  const parts = clean.split(/\s*[-\s]+vs[-\s]+\s*/i);
  if (parts.length >= 2) {
    const home = slugifyTeamName(parts[0]);
    const away = slugifyTeamName(parts[1]);
    if (home && away) return `${isWarmup ? "warmup-" : ""}${home}-vs-${away}`;
  }

  return `${isWarmup ? "warmup-" : ""}${slugifyMatchId(clean)}`;
}

function slugifyTeamName(value: string) {
  const key = stripFlag(value).trim();
  return slugifyMatchId(TEAM_NAME_TO_SLUG[key] || key);
}

function stripFlag(value: string) {
  return value
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .trim();
}

function slugifyMatchId(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const TEAM_NAME_TO_SLUG: Record<string, string> = {
  "阿根廷": "argentina",
  "阿尔及利亚": "algeria",
  "澳大利亚": "australia",
  "奥地利": "austria",
  "巴拉圭": "paraguay",
  "巴拿马": "panama",
  "巴西": "brazil",
  "比利时": "belgium",
  "波黑": "bosnia-and-herzegovina",
  "波斯尼亚和黑塞哥维那": "bosnia-and-herzegovina",
  "德国": "germany",
  "厄瓜多尔": "ecuador",
  "法国": "france",
  "佛得角": "cape-verde",
  "哥伦比亚": "colombia",
  "韩国": "south-korea",
  "荷兰": "netherlands",
  "加拿大": "canada",
  "加纳": "ghana",
  "捷克": "czech-republic",
  "卡塔尔": "qatar",
  "科特迪瓦": "ivory-coast",
  "克罗地亚": "croatia",
  "库拉索": "curacao",
  "美国": "united-states",
  "墨西哥": "mexico",
  "摩洛哥": "morocco",
  "南非": "south-africa",
  "挪威": "norway",
  "葡萄牙": "portugal",
  "日本": "japan",
  "瑞典": "sweden",
  "瑞士": "switzerland",
  "沙特阿拉伯": "saudi-arabia",
  "塞内加尔": "senegal",
  "苏格兰": "scotland",
  "突尼斯": "tunisia",
  "土耳其": "turkiye",
  "乌拉圭": "uruguay",
  "乌兹别克斯坦": "uzbekistan",
  "西班牙": "spain",
  "新西兰": "new-zealand",
  "伊拉克": "iraq",
  "伊朗": "iran",
  "英格兰": "england",
  "约旦": "jordan",
  "刚果民主共和国": "dr-congo",
  "海地": "haiti",
  "埃及": "egypt",
  "Bosnia & Herzegovina": "bosnia-and-herzegovina",
  "Cape Verde Islands": "cape-verde",
  "Congo DR": "dr-congo",
  "Curaçao": "curacao",
  "Czech Republic": "czech-republic",
  "Ivory Coast": "ivory-coast",
  "New Zealand": "new-zealand",
  "Saudi Arabia": "saudi-arabia",
  "South Africa": "south-africa",
  "South Korea": "south-korea",
  "Türkiye": "turkiye",
  "USA": "united-states",
  "United States": "united-states"
};
