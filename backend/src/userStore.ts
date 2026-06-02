import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Pool } from "pg";

export interface UserProfile {
  displayName: string;
  homeTeamId: string | null;
  avatarPlayerId?: string | null;
  timezone: string;
  language: "zh-CN" | "en-US";
}

export interface FollowedTeam {
  id: string;
  name: string;
  region?: string;
  logo?: string;
  followedAt: number;
}

export interface FollowedPlayer {
  id: string;
  name: string;
  team?: string;
  position?: string;
  photo?: string;
  followedAt: number;
}

export interface FavoriteMatch {
  id: string;
  title: string;
  stage?: string;
  startsAt?: string;
  addedAt: number;
}

export interface MatchReminder {
  id: string;
  matchId: string;
  title: string;
  startsAt?: string;
  remindBeforeMinutes: number;
  channel: "site" | "email" | "push";
  enabled: boolean;
  lastQueuedAt?: number;
  createdAt: number;
}

export interface MatchPrediction {
  id: string;
  matchId: string;
  title: string;
  homeScore: number;
  awayScore: number;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface WatchRecord {
  id: string;
  matchId: string;
  title: string;
  status: "planned" | "watched" | "missed";
  watchedAt: number;
}

export interface NewsSubscription {
  id: string;
  topic: string;
  enabled: boolean;
  updatedAt: number;
}

export interface UserNotification {
  id: string;
  type: "match_reminder" | "system";
  title: string;
  body: string;
  channel: "site" | "email" | "push";
  read: boolean;
  createdAt: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface WorldCupUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  disabledAt?: number | null;
  createdAt: number;
  updatedAt: number;
  profile: UserProfile;
  followedTeams: FollowedTeam[];
  followedPlayers: FollowedPlayer[];
  favoriteMatches: FavoriteMatch[];
  reminders: MatchReminder[];
  predictions: MatchPrediction[];
  watchHistory: WatchRecord[];
  newsSubscriptions: NewsSubscription[];
  notifications: UserNotification[];
}

interface UserDatabase {
  users: WorldCupUser[];
}

const DEFAULT_TOPICS = ["球队动态", "伤停情报", "赔率波动", "赛前发布会"];

export class UserStore {
  private data: UserDatabase = { users: [] };
  private pool: Pool | null = null;
  private readonly readyPromise: Promise<void>;

  constructor(private readonly filePath = resolve(process.cwd(), "data", "user-system.json")) {
    this.readyPromise = process.env.DATABASE_URL
      ? this.loadFromPostgres(process.env.DATABASE_URL)
      : Promise.resolve(this.loadFromFile());
  }

  ready() {
    return this.readyPromise;
  }

  getUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return this.data.users.find((user) => user.email === normalized) ?? null;
  }

  getUserById(id: string) {
    return this.data.users.find((user) => user.id === id) ?? null;
  }

  listUsers() {
    return [...this.data.users];
  }

  createUser(input: { email: string; password: string; displayName?: string; avatarPlayerId?: string }) {
    const email = normalizeEmail(input.email);
    if (!email || !input.password || input.password.length < 8) {
      throw createUserStoreError("invalid_credentials", 400);
    }

    if (this.getUserByEmail(email)) {
      throw createUserStoreError("email_already_registered", 409);
    }

    const now = Date.now();
    const salt = randomBytes(16).toString("hex");
    const user: WorldCupUser = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(input.password, salt),
      passwordSalt: salt,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
      profile: {
        displayName: input.displayName?.trim() || email.split("@")[0],
        homeTeamId: null,
        avatarPlayerId: input.avatarPlayerId || "lionel-messi",
        timezone: "Asia/Shanghai",
        language: "zh-CN",
      },
      followedTeams: [],
      followedPlayers: [],
      favoriteMatches: [],
      reminders: [],
      predictions: [],
      watchHistory: [],
      newsSubscriptions: DEFAULT_TOPICS.map((topic) => ({
        id: slugify(topic),
        topic,
        enabled: topic !== "赛前发布会",
        updatedAt: now,
      })),
      notifications: [],
    };

    this.data.users.push(user);
    void this.save();
    return user;
  }

  verifyPassword(user: WorldCupUser, password: string) {
    const hash = hashPassword(password, user.passwordSalt);
    const stored = Buffer.from(user.passwordHash, "hex");
    const supplied = Buffer.from(hash, "hex");
    return stored.length === supplied.length && timingSafeEqual(stored, supplied);
  }

  updateProfile(userId: string, profile: Partial<UserProfile>) {
    const user = this.requireUser(userId);
    user.profile = {
      ...user.profile,
      ...profile,
      displayName: profile.displayName?.trim() || user.profile.displayName,
      avatarPlayerId: profile.avatarPlayerId ?? user.profile.avatarPlayerId ?? "lionel-messi",
      language: profile.language === "en-US" ? "en-US" : "zh-CN",
    };
    this.touch(user);
    return user;
  }

  upsertTeam(userId: string, input: Omit<FollowedTeam, "followedAt">) {
    const user = this.requireUser(userId);
    user.followedTeams = upsertById(user.followedTeams, { ...input, followedAt: Date.now() });
    this.touch(user);
    return user;
  }

  removeTeam(userId: string, id: string) {
    const user = this.requireUser(userId);
    user.followedTeams = user.followedTeams.filter((item) => item.id !== id);
    this.touch(user);
    return user;
  }

  upsertPlayer(userId: string, input: Omit<FollowedPlayer, "followedAt">) {
    const user = this.requireUser(userId);
    user.followedPlayers = upsertById(user.followedPlayers, { ...input, followedAt: Date.now() });
    this.touch(user);
    return user;
  }

  removePlayer(userId: string, id: string) {
    const user = this.requireUser(userId);
    user.followedPlayers = user.followedPlayers.filter((item) => item.id !== id);
    this.touch(user);
    return user;
  }

  upsertFavoriteMatch(userId: string, input: Omit<FavoriteMatch, "addedAt">) {
    const user = this.requireUser(userId);
    user.favoriteMatches = upsertById(user.favoriteMatches, { ...input, addedAt: Date.now() });
    this.touch(user);
    return user;
  }

  removeFavoriteMatch(userId: string, id: string) {
    const user = this.requireUser(userId);
    user.favoriteMatches = user.favoriteMatches.filter((item) => item.id !== id);
    this.touch(user);
    return user;
  }

  upsertReminder(userId: string, input: Omit<MatchReminder, "id" | "createdAt"> & { id?: string }) {
    const user = this.requireUser(userId);
    const id = input.id || randomUUID();
    user.reminders = upsertById(user.reminders, {
      id,
      matchId: input.matchId,
      title: input.title,
      startsAt: input.startsAt,
      remindBeforeMinutes: input.remindBeforeMinutes,
      channel: input.channel,
      enabled: input.enabled,
      lastQueuedAt: input.lastQueuedAt,
      createdAt: Date.now(),
    });
    this.touch(user);
    return user;
  }

  upsertPrediction(userId: string, input: Omit<MatchPrediction, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const user = this.requireUser(userId);
    const now = Date.now();
    const existing = input.id ? user.predictions.find((item) => item.id === input.id) : null;
    user.predictions = upsertById(user.predictions, {
      id: input.id || randomUUID(),
      matchId: input.matchId,
      title: input.title,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      confidence: input.confidence,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    this.touch(user);
    return user;
  }

  upsertWatchRecord(userId: string, input: Omit<WatchRecord, "id" | "watchedAt"> & { id?: string }) {
    const user = this.requireUser(userId);
    user.watchHistory = upsertById(user.watchHistory, {
      id: input.id || randomUUID(),
      matchId: input.matchId,
      title: input.title,
      status: input.status,
      watchedAt: Date.now(),
    });
    this.touch(user);
    return user;
  }

  upsertNewsSubscription(userId: string, input: NewsSubscription) {
    const user = this.requireUser(userId);
    user.newsSubscriptions = upsertById(user.newsSubscriptions, { ...input, updatedAt: Date.now() });
    this.touch(user);
    return user;
  }

  queueNotification(userId: string, input: Omit<UserNotification, "id" | "createdAt" | "read">) {
    const user = this.requireUser(userId);
    const duplicate = user.notifications.some((item) => (
      item.type === input.type &&
      item.metadata?.reminderId !== undefined &&
      item.metadata.reminderId === input.metadata?.reminderId
    ));

    if (!duplicate) {
      user.notifications = [
        {
          id: randomUUID(),
          ...input,
          read: false,
          createdAt: Date.now(),
        },
        ...user.notifications,
      ].slice(0, 200);
    }

    this.touch(user);
    return user;
  }

  markReminderQueued(userId: string, reminderId: string, queuedAt = Date.now()) {
    const user = this.requireUser(userId);
    user.reminders = user.reminders.map((reminder) => (
      reminder.id === reminderId ? { ...reminder, lastQueuedAt: queuedAt } : reminder
    ));
    this.touch(user);
    return user;
  }

  setUserDisabled(userId: string, disabled: boolean) {
    const user = this.requireUser(userId);
    user.disabledAt = disabled ? Date.now() : null;
    this.touch(user);
    return user;
  }

  resetReminderQueue(userId: string) {
    const user = this.requireUser(userId);
    user.reminders = user.reminders.map((reminder) => ({ ...reminder, lastQueuedAt: undefined }));
    user.notifications = user.notifications.filter((notification) => notification.type !== "match_reminder");
    this.touch(user);
    return user;
  }

  cleanUserAnomalies(userId: string) {
    const user = this.requireUser(userId);
    const before = getUserRecordCounts(user);
    user.followedTeams = uniqueValidById(user.followedTeams);
    user.followedPlayers = uniqueValidById(user.followedPlayers);
    user.favoriteMatches = uniqueValidById(user.favoriteMatches);
    user.reminders = uniqueValidById(user.reminders).filter((item) => Boolean(item.matchId && item.title));
    user.predictions = uniqueValidById(user.predictions).filter((item) => Boolean(item.matchId && item.title));
    user.watchHistory = uniqueValidById(user.watchHistory).filter((item) => Boolean(item.matchId && item.title));
    user.newsSubscriptions = uniqueValidById(user.newsSubscriptions);
    user.notifications = uniqueValidById(user.notifications).filter((item) => Boolean(item.title && item.body));
    const after = getUserRecordCounts(user);
    this.touch(user);
    return {
      user,
      removed: Object.fromEntries(
        Object.entries(before).map(([key, value]) => [key, value - after[key as keyof typeof after]])
      ),
    };
  }

  private requireUser(userId: string) {
    const user = this.getUserById(userId);
    if (!user) throw createUserStoreError("user_not_found", 404);
    return user;
  }

  private touch(user: WorldCupUser) {
    user.updatedAt = Date.now();
    void this.save();
  }

  private loadFromFile() {
    if (!existsSync(this.filePath)) return;
    try {
      this.data = JSON.parse(readFileSync(this.filePath, "utf8")) as UserDatabase;
      this.data.users = this.data.users.map(normalizeStoredUser);
    } catch {
      this.data = { users: [] };
    }
  }

  private async loadFromPostgres(databaseUrl: string) {
    const { Pool } = await import("pg");
    this.pool = new Pool({ connectionString: databaseUrl });
    await this.pool.query(`
      create table if not exists user_store_documents (
        id text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);

    const result = await this.pool.query<{ data: UserDatabase }>(
      "select data from user_store_documents where id = $1",
      ["default"]
    );

    if (result.rows[0]?.data) {
      this.data = result.rows[0].data;
      this.data.users = this.data.users.map(normalizeStoredUser);
      return;
    }

    this.loadFromFile();
    await this.save();
  }

  private async save() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    if (!this.pool) return;

    await this.pool.query(
      `
      insert into user_store_documents (id, data, updated_at)
      values ($1, $2, now())
      on conflict (id)
      do update set data = excluded.data, updated_at = now()
      `,
      ["default", this.data]
    );
  }
}

export function toPublicUser(user: WorldCupUser) {
  const { passwordHash, passwordSalt, ...publicUser } = user;
  return publicUser;
}

export function createUserStoreError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt: string) {
  return pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) return [item, ...items];
  return items.map((current) => (current.id === item.id ? item : current));
}

function normalizeStoredUser(user: WorldCupUser) {
  return {
    ...user,
    disabledAt: user.disabledAt ?? null,
    profile: {
      ...user.profile,
      avatarPlayerId: user.profile?.avatarPlayerId ?? "lionel-messi",
    },
    followedTeams: user.followedTeams ?? [],
    followedPlayers: user.followedPlayers ?? [],
    favoriteMatches: user.favoriteMatches ?? [],
    reminders: user.reminders ?? [],
    predictions: user.predictions ?? [],
    watchHistory: user.watchHistory ?? [],
    newsSubscriptions: user.newsSubscriptions ?? [],
    notifications: user.notifications ?? [],
  };
}

function getUserRecordCounts(user: WorldCupUser) {
  return {
    followedTeams: user.followedTeams?.length ?? 0,
    followedPlayers: user.followedPlayers?.length ?? 0,
    favoriteMatches: user.favoriteMatches?.length ?? 0,
    reminders: user.reminders?.length ?? 0,
    predictions: user.predictions?.length ?? 0,
    watchHistory: user.watchHistory?.length ?? 0,
    newsSubscriptions: user.newsSubscriptions?.length ?? 0,
    notifications: user.notifications?.length ?? 0,
  };
}

function uniqueValidById<T extends { id: string }>(items: T[] = []) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "");
}
