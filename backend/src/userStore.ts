import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";

export interface UserProfile {
  displayName: string;
  homeTeamId: string | null;
  timezone: string;
  language: "zh-CN" | "en-US";
}

export interface FollowedTeam {
  id: string;
  name: string;
  region?: string;
  followedAt: number;
}

export interface FollowedPlayer {
  id: string;
  name: string;
  team?: string;
  position?: string;
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
  remindBeforeMinutes: number;
  channel: "site" | "email" | "push";
  enabled: boolean;
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

export interface WorldCupUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
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
}

interface UserDatabase {
  users: WorldCupUser[];
}

const DEFAULT_TOPICS = ["球队动态", "伤停情报", "赔率波动", "赛前发布会"];

export class UserStore {
  private data: UserDatabase = { users: [] };

  constructor(private readonly filePath = resolve(process.cwd(), "data", "user-system.json")) {
    this.load();
  }

  getUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return this.data.users.find((user) => user.email === normalized) ?? null;
  }

  getUserById(id: string) {
    return this.data.users.find((user) => user.id === id) ?? null;
  }

  createUser(input: { email: string; password: string; displayName?: string }) {
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
      createdAt: now,
      updatedAt: now,
      profile: {
        displayName: input.displayName?.trim() || email.split("@")[0],
        homeTeamId: null,
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
    };

    this.data.users.push(user);
    this.save();
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
      remindBeforeMinutes: input.remindBeforeMinutes,
      channel: input.channel,
      enabled: input.enabled,
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

  private requireUser(userId: string) {
    const user = this.getUserById(userId);
    if (!user) throw createUserStoreError("user_not_found", 404);
    return user;
  }

  private touch(user: WorldCupUser) {
    user.updatedAt = Date.now();
    this.save();
  }

  private load() {
    if (!existsSync(this.filePath)) return;
    try {
      this.data = JSON.parse(readFileSync(this.filePath, "utf8")) as UserDatabase;
    } catch {
      this.data = { users: [] };
    }
  }

  private save() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "");
}
