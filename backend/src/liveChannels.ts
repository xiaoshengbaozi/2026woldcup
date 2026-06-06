import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import type { Pool } from "pg";

export type LiveChannel = {
  id: string;
  matchId: string;
  matchIds?: string[];
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
  const next: LiveChannel = {
    id,
    matchId,
    matchIds,
    name,
    platform: String(input.platform || "HLS").trim() || "HLS",
    streamUrl: String(input.streamUrl || "").trim(),
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

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!dbReady) {
    dbReady = import("pg")
      .then(async ({ Pool }) => {
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(`
          create table if not exists live_channels (
            id text primary key,
            data jsonb not null,
            updated_at timestamptz not null default now()
          )
        `);
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
    const text = String(item || "").trim();
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
  return ids.includes(matchId);
}
