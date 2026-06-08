import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Pool } from "pg";

export interface UserProfile {
  displayName: string;
  signature?: string | null;
  homeTeamId: string | null;
  avatarPlayerId?: string | null;
  avatarUrl?: string | null;
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

export interface PredictionArchive {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  groupScores: Record<string, { home: number; away: number } | null>;
  knockoutPicks: Record<string, { winnerCode: string; homeScore: number; awayScore: number }>;
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

export interface InvitationCode {
  id: string;
  code: string;
  note?: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number | null;
  disabledAt?: number | null;
  createdAt: number;
  updatedAt: number;
  usedBy: Array<{
    userId: string;
    email: string;
    usedAt: number;
  }>;
}

export interface WorldCupUser {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  emailVerifiedAt?: number | null;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpiresAt?: number | null;
  emailVerificationSentAt?: number | null;
  disabledAt?: number | null;
  createdAt: number;
  updatedAt: number;
  profile: UserProfile;
  followedTeams: FollowedTeam[];
  followedPlayers: FollowedPlayer[];
  favoriteMatches: FavoriteMatch[];
  reminders: MatchReminder[];
  predictions: MatchPrediction[];
  predictionArchives: PredictionArchive[];
  watchHistory: WatchRecord[];
  newsSubscriptions: NewsSubscription[];
  notifications: UserNotification[];
}

interface UserDatabase {
  users: WorldCupUser[];
  invitationCodes: InvitationCode[];
}

const FALLBACK_SIGNATURES = ["一脚世界波", "倒挂金钩", "Tiki-Taka", "长驱直入", "追风逐电"];
const DEFAULT_TOPICS = ["球队动态", "伤停情报", "赔率波动", "赛前发布会"];

export class UserStore {
  private data: UserDatabase = { users: [], invitationCodes: [] };
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

  listInvitationCodes() {
    return [...this.data.invitationCodes];
  }

  createInvitationCode(input: { code?: string; note?: string; maxUses?: number; expiresAt?: number | string | null }) {
    const code = normalizeInvitationCode(input.code || generateInvitationCode());
    if (!code || code.length < 4) {
      throw createUserStoreError("invalid_invitation_code", 400);
    }

    if (this.data.invitationCodes.some((item) => item.code === code)) {
      throw createUserStoreError("invitation_code_exists", 409);
    }

    const now = Date.now();
    const invitation: InvitationCode = {
      id: randomUUID(),
      code,
      note: input.note?.trim() || undefined,
      maxUses: clampInteger(input.maxUses, 1, 100000, 1),
      usedCount: 0,
      expiresAt: normalizeTimestamp(input.expiresAt),
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
      usedBy: [],
    };

    this.data.invitationCodes.push(invitation);
    void this.save();
    return invitation;
  }

  validateInvitationCode(code: string) {
    return this.requireUsableInvitationCode(code);
  }

  consumeInvitationCode(code: string, user: Pick<WorldCupUser, "id" | "email">) {
    const invitation = this.requireUsableInvitationCode(code);
    invitation.usedCount += 1;
    invitation.usedBy = [
      { userId: user.id, email: user.email, usedAt: Date.now() },
      ...(invitation.usedBy ?? []),
    ];
    invitation.updatedAt = Date.now();
    void this.save();
    return invitation;
  }

  setInvitationDisabled(id: string, disabled: boolean) {
    const invitation = this.data.invitationCodes.find((item) => item.id === id);
    if (!invitation) throw createUserStoreError("invitation_code_not_found", 404);
    invitation.disabledAt = disabled ? Date.now() : null;
    invitation.updatedAt = Date.now();
    void this.save();
    return invitation;
  }

  deleteInvitationCode(id: string) {
    const invitation = this.data.invitationCodes.find((item) => item.id === id);
    if (!invitation) throw createUserStoreError("invitation_code_not_found", 404);
    this.data.invitationCodes = this.data.invitationCodes.filter((item) => item.id !== id);
    void this.save();
    return invitation;
  }

  createUser(input: { email: string; password: string; displayName?: string; avatarPlayerId?: string; avatarUrl?: string }) {
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
      emailVerifiedAt: null,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
      profile: {
        displayName: input.displayName?.trim() || email.split("@")[0],
        signature: pickRandomSignature(),
        homeTeamId: null,
        avatarPlayerId: input.avatarPlayerId || "lionel-messi",
        avatarUrl: input.avatarUrl || null,
        timezone: "Asia/Shanghai",
        language: "zh-CN",
      },
      followedTeams: [],
      followedPlayers: [],
      favoriteMatches: [],
      reminders: [],
      predictions: [],
      predictionArchives: [],
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

  setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: number) {
    const user = this.requireUser(userId);
    user.emailVerificationTokenHash = tokenHash;
    user.emailVerificationExpiresAt = expiresAt;
    user.emailVerificationSentAt = Date.now();
    this.touch(user);
    return user;
  }

  verifyEmailToken(tokenHash: string) {
    const user = this.data.users.find((item) => item.emailVerificationTokenHash === tokenHash) ?? null;
    if (!user) throw createUserStoreError("invalid_email_verification_token", 403);
    if (user.emailVerificationExpiresAt && user.emailVerificationExpiresAt <= Date.now()) {
      throw createUserStoreError("email_verification_token_expired", 403);
    }
    user.emailVerifiedAt = Date.now();
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    user.emailVerificationSentAt = null;
    this.touch(user);
    return user;
  }

  updateProfile(userId: string, profile: Partial<UserProfile>) {
    const user = this.requireUser(userId);
    const nextAvatarUrl = Object.prototype.hasOwnProperty.call(profile, "avatarUrl")
      ? profile.avatarUrl || null
      : user.profile.avatarUrl ?? null;
    user.profile = {
      ...user.profile,
      ...profile,
      displayName: profile.displayName?.trim() || user.profile.displayName,
      signature: normalizeSignature(profile.signature, user.profile.signature),
      avatarPlayerId: profile.avatarPlayerId ?? user.profile.avatarPlayerId ?? "lionel-messi",
      avatarUrl: nextAvatarUrl,
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
    user.reminders = user.reminders.filter((item) => item.matchId !== id);
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

  upsertPredictionArchive(userId: string, input: Omit<PredictionArchive, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
    const user = this.requireUser(userId);
    const now = Date.now();
    const existing = input.id ? user.predictionArchives.find((item) => item.id === input.id) : null;
    user.predictionArchives = upsertById(user.predictionArchives ?? [], {
      id: input.id || randomUUID(),
      name: input.name.trim() || `模拟 ${user.predictionArchives.length + 1}`,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      groupScores: input.groupScores,
      knockoutPicks: input.knockoutPicks,
    }).slice(0, 4);
    this.touch(user);
    return user;
  }

  removePredictionArchive(userId: string, id: string) {
    const user = this.requireUser(userId);
    user.predictionArchives = (user.predictionArchives ?? []).filter((item) => item.id !== id);
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

  markNotificationsRead(userId: string, ids?: string[]) {
    const user = this.requireUser(userId);
    const idSet = ids?.length ? new Set(ids) : null;
    user.notifications = user.notifications.map((notification) => (
      !idSet || idSet.has(notification.id) ? { ...notification, read: true } : notification
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

  deleteUser(userId: string) {
    const user = this.requireUser(userId);
    this.data.users = this.data.users.filter((item) => item.id !== userId);
    void this.save();
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
    user.predictionArchives = uniqueValidById(user.predictionArchives).filter((item) => Boolean(item.name));
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
      this.data.invitationCodes = (this.data.invitationCodes ?? []).map(normalizeStoredInvitationCode);
    } catch {
      this.data = { users: [], invitationCodes: [] };
    }
  }

  private async loadFromPostgres(databaseUrl: string) {
    const { Pool } = await import("pg");
    this.pool = new Pool({ connectionString: databaseUrl });
    if (!isDatabaseSchemaInitDisabled()) {
      await this.pool.query(`
        create table if not exists user_store_documents (
          id text primary key,
          data jsonb not null,
          updated_at timestamptz not null default now()
        )
      `);
    }

    const result = await this.pool.query<{ data: UserDatabase }>(
      "select data from user_store_documents where id = $1",
      ["default"]
    );

    if (result.rows[0]?.data) {
      this.data = result.rows[0].data;
      this.data.users = this.data.users.map(normalizeStoredUser);
      this.data.invitationCodes = (this.data.invitationCodes ?? []).map(normalizeStoredInvitationCode);
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

  private requireUsableInvitationCode(code: string) {
    const normalized = normalizeInvitationCode(code);
    if (!normalized) throw createUserStoreError("invitation_code_required", 400);

    const invitation = this.data.invitationCodes.find((item) => item.code === normalized);
    if (!invitation) throw createUserStoreError("invalid_invitation_code", 403);
    if (invitation.disabledAt) throw createUserStoreError("invitation_code_disabled", 403);
    if (invitation.expiresAt && invitation.expiresAt <= Date.now()) throw createUserStoreError("invitation_code_expired", 403);
    if (invitation.usedCount >= invitation.maxUses) throw createUserStoreError("invitation_code_exhausted", 403);
    return invitation;
  }
}

export function toPublicUser(user: WorldCupUser) {
  const { passwordHash, passwordSalt, emailVerificationTokenHash, emailVerificationExpiresAt, ...publicUser } = user;
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

function normalizeSignature(value: unknown, fallback?: string | null) {
  if (typeof value !== "string") return fallback || pickRandomSignature();
  const signature = value.trim().slice(0, 36);
  return signature || fallback || pickRandomSignature();
}

function pickRandomSignature(seed?: string) {
  const phrases = loadBuiltInSignatures();
  if (!phrases.length) return FALLBACK_SIGNATURES[0];
  if (!seed) return phrases[Math.floor(Math.random() * phrases.length)] ?? phrases[0];
  const hash = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return phrases[hash % phrases.length] ?? phrases[0];
}

let builtInSignaturesCache: string[] | null = null;

function loadBuiltInSignatures() {
  if (builtInSignaturesCache) return builtInSignaturesCache;
  const paths = [
    resolve(process.cwd(), "data", "football_moves.json"),
    resolve(process.cwd(), "backend", "data", "football_moves.json"),
  ];

  for (const filePath of paths) {
    if (!existsSync(filePath)) continue;
    try {
      const payload = JSON.parse(readFileSync(filePath, "utf8")) as { football_moves?: unknown };
      const moves = Array.isArray(payload.football_moves) ? payload.football_moves : [];
      builtInSignaturesCache = moves.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      if (builtInSignaturesCache.length) return builtInSignaturesCache;
    } catch {
      break;
    }
  }

  builtInSignaturesCache = FALLBACK_SIGNATURES;
  return builtInSignaturesCache;
}

function normalizeStoredUser(user: WorldCupUser) {
  return {
    ...user,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    emailVerificationTokenHash: user.emailVerificationTokenHash ?? null,
    emailVerificationExpiresAt: user.emailVerificationExpiresAt ?? null,
    emailVerificationSentAt: user.emailVerificationSentAt ?? null,
    disabledAt: user.disabledAt ?? null,
    profile: {
      ...user.profile,
      signature: normalizeSignature(user.profile?.signature, pickRandomSignature(user.id || user.email)),
      avatarPlayerId: user.profile?.avatarPlayerId ?? "lionel-messi",
      avatarUrl: user.profile?.avatarUrl ?? null,
    },
    followedTeams: user.followedTeams ?? [],
    followedPlayers: user.followedPlayers ?? [],
    favoriteMatches: user.favoriteMatches ?? [],
    reminders: user.reminders ?? [],
    predictions: user.predictions ?? [],
    predictionArchives: (user.predictionArchives ?? []).slice(0, 4),
    watchHistory: user.watchHistory ?? [],
    newsSubscriptions: user.newsSubscriptions ?? [],
    notifications: user.notifications ?? [],
  };
}

function normalizeStoredInvitationCode(invitation: InvitationCode) {
  return {
    ...invitation,
    code: normalizeInvitationCode(invitation.code),
    maxUses: clampInteger(invitation.maxUses, 1, 100000, 1),
    usedCount: clampInteger(invitation.usedCount, 0, 100000, 0),
    expiresAt: invitation.expiresAt ?? null,
    disabledAt: invitation.disabledAt ?? null,
    usedBy: invitation.usedBy ?? [],
  };
}

function normalizeInvitationCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

function generateInvitationCode() {
  return `WC26-${randomBytes(3).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function normalizeTimestamp(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function isDatabaseSchemaInitDisabled() {
  return process.env.DB_SCHEMA_INIT_DISABLED === "true" || process.env.DATABASE_SCHEMA_INIT_DISABLED === "true";
}

function getUserRecordCounts(user: WorldCupUser) {
  return {
    followedTeams: user.followedTeams?.length ?? 0,
    followedPlayers: user.followedPlayers?.length ?? 0,
    favoriteMatches: user.favoriteMatches?.length ?? 0,
    reminders: user.reminders?.length ?? 0,
    predictions: user.predictions?.length ?? 0,
    predictionArchives: user.predictionArchives?.length ?? 0,
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
