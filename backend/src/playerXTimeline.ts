export interface XTimelinePlayerInput {
  id: string;
  name?: string;
  team?: string;
  photo?: string;
}

export interface PlayerXTimelineItem {
  id: string;
  playerId: string;
  playerName: string;
  playerPhoto?: string;
  username: string;
  text: string;
  createdAt: string;
  url: string;
  media?: PlayerXTimelineMedia[];
  metrics?: {
    likes?: number;
    reposts?: number;
    replies?: number;
    quotes?: number;
  };
}

export interface PlayerXTimelineMedia {
  type: "photo" | "video" | "animated_gif";
  url?: string;
  videoUrl?: string;
  previewImageUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

interface TimelineCacheEntry {
  expiresAt: number;
  items: PlayerXTimelineItem[];
}

export interface PlayerXTimelineRuntimeStats {
  configured: boolean;
  status: "not_configured" | "idle" | "ok" | "degraded";
  knownHandleCount: number;
  cacheEntries: number;
  cacheTtlSeconds: number;
  apiTimeoutMs: number;
  maxPlayers: number;
  maxResultsPerPlayer: number;
  requestsTotal: number;
  cacheHits: number;
  cacheMisses: number;
  xUserRequests: number;
  xTweetRequests: number;
  apiErrors: number;
  lastRequestAt: number | null;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  lastWarning: string | null;
  lastMappedPlayers: number;
  lastReturnedItems: number;
}

const DEFAULT_PLAYER_HANDLES: Record<string, string> = {
  "278": "KMbappe",
  "762": "vinijr",
  "1100": "ErlingHaaland",
  "386828": "LamineeYamal",
  "874": "BellinghamJude",
  "184": "Cristiano",
  "276": "neymarjr",
  "909": "HKane",
  "306": "MoSalah",
  "629": "KevinDeBruyne",
  "1485": "Sonny7",
  "307": "lukamodric10",
  "627": "lewy_official",
  "1496": "pulisic",
};

const DEFAULT_CACHE_MS = 2 * 60 * 1000;
const DEFAULT_MAX_PLAYERS = 12;
const DEFAULT_MAX_RESULTS_PER_PLAYER = 5;
const DEFAULT_X_API_TIMEOUT_MS = 10_000;

export class PlayerXTimelineService {
  private readonly cache = new Map<string, TimelineCacheEntry>();
  private readonly handles: Record<string, string>;
  private readonly cacheMs: number;
  private readonly apiTimeoutMs: number;
  private readonly maxPlayers: number;
  private readonly maxResultsPerPlayer: number;
  private readonly runtime = {
    requestsTotal: 0,
    cacheHits: 0,
    cacheMisses: 0,
    xUserRequests: 0,
    xTweetRequests: 0,
    apiErrors: 0,
    lastRequestAt: null as number | null,
    lastSuccessAt: null as number | null,
    lastErrorAt: null as number | null,
    lastError: null as string | null,
    lastWarning: null as string | null,
    lastMappedPlayers: 0,
    lastReturnedItems: 0,
  };

  constructor() {
    this.handles = { ...DEFAULT_PLAYER_HANDLES, ...parseHandleMap(process.env.X_PLAYER_HANDLES_JSON) };
    this.cacheMs = parsePositiveInt(process.env.X_TIMELINE_CACHE_SECONDS, DEFAULT_CACHE_MS / 1000) * 1000;
    this.apiTimeoutMs = parsePositiveInt(process.env.X_API_TIMEOUT_MS, DEFAULT_X_API_TIMEOUT_MS);
    this.maxPlayers = parsePositiveInt(process.env.X_TIMELINE_MAX_PLAYERS, DEFAULT_MAX_PLAYERS);
    this.maxResultsPerPlayer = parsePositiveInt(process.env.X_TIMELINE_MAX_RESULTS, DEFAULT_MAX_RESULTS_PER_PLAYER);
  }

  isConfigured() {
    return Boolean(getBearerToken());
  }

  getKnownHandles() {
    return { ...this.handles };
  }

  getRuntimeStats(): PlayerXTimelineRuntimeStats {
    const configured = this.isConfigured();
    const status = !configured
      ? "not_configured"
      : this.runtime.lastErrorAt && (!this.runtime.lastSuccessAt || this.runtime.lastErrorAt > this.runtime.lastSuccessAt)
        ? "degraded"
        : this.runtime.lastSuccessAt
          ? "ok"
          : "idle";

    return {
      configured,
      status,
      knownHandleCount: Object.keys(this.handles).length,
      cacheEntries: this.cache.size,
      cacheTtlSeconds: Math.round(this.cacheMs / 1000),
      apiTimeoutMs: this.apiTimeoutMs,
      maxPlayers: this.maxPlayers,
      maxResultsPerPlayer: this.maxResultsPerPlayer,
      ...this.runtime,
    };
  }

  async getTimeline(players: XTimelinePlayerInput[]) {
    this.runtime.requestsTotal += 1;
    this.runtime.lastRequestAt = Date.now();
    const limitedPlayers = dedupePlayers(players)
      .map((player) => ({ ...player, username: this.getHandleForPlayer(player) }))
      .filter((player): player is XTimelinePlayerInput & { username: string } => Boolean(player.username))
      .slice(0, this.maxPlayers);
    this.runtime.lastMappedPlayers = limitedPlayers.length;

    if (!limitedPlayers.length) {
      this.runtime.lastWarning = "no_mapped_players";
      this.runtime.lastReturnedItems = 0;
      return this.buildResponse([], [], "no_mapped_players");
    }

    if (!this.isConfigured()) {
      this.runtime.lastWarning = "x_api_not_configured";
      this.runtime.lastReturnedItems = 0;
      return this.buildResponse([], limitedPlayers.map(toMappedPlayer), "x_api_not_configured");
    }

    const settled = await Promise.allSettled(limitedPlayers.map((player) => this.fetchPlayerTimeline(player)));
    const items = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const errored = settled.some((result) => result.status === "rejected");
    for (const result of settled) {
      if (result.status === "rejected") this.recordError(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
    const warning = errored ? "partial_x_api_error" : undefined;
    this.runtime.lastWarning = warning ?? null;
    this.runtime.lastReturnedItems = items.length;
    if (!errored) this.runtime.lastSuccessAt = Date.now();

    return this.buildResponse(
      items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      limitedPlayers.map(toMappedPlayer),
      warning,
    );
  }

  private getHandleForPlayer(player: XTimelinePlayerInput) {
    return this.handles[player.id] || this.handles[slugify(player.name || "")] || "";
  }

  private async fetchPlayerTimeline(player: XTimelinePlayerInput & { username: string }) {
    const cacheKey = player.username.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.runtime.cacheHits += 1;
      return cached.items;
    }
    this.runtime.cacheMisses += 1;

    const user = await this.fetchXUser(player.username);
    const timeline = await this.fetchXUserTweets(user.id);
    const mediaByKey = new Map((timeline.includes?.media ?? []).map((media) => [media.media_key, media]));
    const items = timeline.data.map((tweet) => ({
      id: tweet.id,
      playerId: player.id,
      playerName: player.name || user.name || `@${player.username}`,
      playerPhoto: player.photo,
      username: user.username,
      text: tweet.text,
      createdAt: tweet.created_at,
      url: `https://x.com/${user.username}/status/${tweet.id}`,
      media: (tweet.attachments?.media_keys ?? [])
        .map((key) => mediaByKey.get(key))
        .filter((media): media is XMedia => Boolean(media))
        .map(toTimelineMedia),
      metrics: {
        likes: tweet.public_metrics?.like_count,
        reposts: tweet.public_metrics?.retweet_count,
        replies: tweet.public_metrics?.reply_count,
        quotes: tweet.public_metrics?.quote_count,
      },
    }));

    this.cache.set(cacheKey, { expiresAt: Date.now() + this.cacheMs, items });
    return items;
  }

  private async fetchXUser(username: string) {
    const url = new URL(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`);
    url.searchParams.set("user.fields", "name,username,profile_image_url");
    this.runtime.xUserRequests += 1;
    const payload = await this.fetchJson<XUserResponse>(url);
    if (!payload.data?.id) throw new Error("x_user_not_found");
    return payload.data;
  }

  private async fetchXUserTweets(userId: string) {
    const url = new URL(`https://api.twitter.com/2/users/${encodeURIComponent(userId)}/tweets`);
    url.searchParams.set("max_results", String(Math.max(5, Math.min(100, this.maxResultsPerPlayer))));
    url.searchParams.set("exclude", "retweets,replies");
    url.searchParams.set("tweet.fields", "attachments,created_at,public_metrics");
    url.searchParams.set("expansions", "attachments.media_keys");
    url.searchParams.set("media.fields", "type,url,preview_image_url,duration_ms,width,height");
    this.runtime.xTweetRequests += 1;
    const payload = await this.fetchJson<XTweetsResponse>(url);
    return { data: payload.data ?? [], includes: payload.includes };
  }

  private async fetchJson<T>(url: URL) {
    const token = getBearerToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.apiTimeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "worldcup-player-x-timeline/1.0",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("x_api_timeout");
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`x_api_${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  private recordError(message: string) {
    this.runtime.apiErrors += 1;
    this.runtime.lastErrorAt = Date.now();
    this.runtime.lastError = message;
  }

  private buildResponse(items: PlayerXTimelineItem[], players: Array<{ id: string; name?: string; username: string }>, warning?: string) {
    return {
      timestamp: Date.now(),
      configured: this.isConfigured(),
      warning,
      players,
      items,
    };
  }
}

export function createPlayerXTimelineService() {
  return new PlayerXTimelineService();
}

function getBearerToken() {
  return process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || "";
}

function parseHandleMap(value?: string) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const handles: Record<string, string> = {};
    for (const [key, rawHandle] of Object.entries(parsed)) {
      const handle = String(rawHandle || "").replace(/^@/, "").trim();
      if (key && handle) handles[key] = handle;
    }
    return handles;
  } catch {
    return {};
  }
}

function dedupePlayers(players: XTimelinePlayerInput[]) {
  const seen = new Set<string>();
  const result: XTimelinePlayerInput[] = [];
  for (const player of players) {
    const id = String(player.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ ...player, id });
  }
  return result;
}

function toMappedPlayer(player: XTimelinePlayerInput & { username: string }) {
  return { id: player.id, name: player.name, username: player.username };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

interface XUserResponse {
  data?: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
}

interface XTweetsResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at: string;
    attachments?: {
      media_keys?: string[];
    };
    public_metrics?: {
      retweet_count?: number;
      reply_count?: number;
      like_count?: number;
      quote_count?: number;
    };
  }>;
  includes?: {
    media?: XMedia[];
  };
}

interface XMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  video_url?: string;
  preview_image_url?: string;
  duration_ms?: number;
  width?: number;
  height?: number;
}

function toTimelineMedia(media: XMedia): PlayerXTimelineMedia {
  return {
    type: media.type,
    url: media.url,
    videoUrl: media.video_url,
    previewImageUrl: media.preview_image_url,
    durationMs: media.duration_ms,
    width: media.width,
    height: media.height,
  };
}
