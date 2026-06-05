import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";

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

export async function readLiveChannels() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeChannels(Array.isArray(parsed) ? parsed : parsed.channels);
  } catch {
    await saveLiveChannels(DEFAULT_CHANNELS);
    return DEFAULT_CHANNELS;
  }
}

export async function saveLiveChannels(channels: LiveChannel[]) {
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(channels, null, 2), "utf8");
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
