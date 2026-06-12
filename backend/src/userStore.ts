import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import type { Pool, PoolClient } from "pg";

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
  channel: NotificationChannel;
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
  channel: NotificationChannel;
  read: boolean;
  createdAt: number;
  metadata?: Record<string, string | number | boolean | null>;
}

export type NotificationChannel = "site" | "email" | "push" | "telegram";

export interface TelegramAccount {
  chatId: string;
  username?: string | null;
  firstName?: string | null;
  linkedAt: number;
  notificationsEnabled: boolean;
  lastTestSentAt?: number | null;
}

export interface TelegramBinding {
  codeHash: string;
  expiresAt: number;
  createdAt: number;
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
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: number | null;
  passwordResetSentAt?: number | null;
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
  telegram?: TelegramAccount | null;
  telegramBinding?: TelegramBinding | null;
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
    void this.saveInvitationCode(invitation);
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
    void this.saveInvitationCode(invitation);
    return invitation;
  }

  setInvitationDisabled(id: string, disabled: boolean) {
    const invitation = this.data.invitationCodes.find((item) => item.id === id);
    if (!invitation) throw createUserStoreError("invitation_code_not_found", 404);
    invitation.disabledAt = disabled ? Date.now() : null;
    invitation.updatedAt = Date.now();
    void this.saveInvitationCode(invitation);
    return invitation;
  }

  deleteInvitationCode(id: string) {
    const invitation = this.data.invitationCodes.find((item) => item.id === id);
    if (!invitation) throw createUserStoreError("invitation_code_not_found", 404);
    this.data.invitationCodes = this.data.invitationCodes.filter((item) => item.id !== id);
    void this.deleteInvitationCodeFromStore(id);
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
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      passwordResetSentAt: null,
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
      telegram: null,
      telegramBinding: null,
    };

    this.data.users.push(user);
    void this.saveUser(user);
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

  setPasswordResetToken(userId: string, tokenHash: string, expiresAt: number) {
    const user = this.requireUser(userId);
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    user.passwordResetSentAt = Date.now();
    this.touch(user);
    return user;
  }

  resetPasswordWithToken(tokenHash: string, password: string) {
    if (!password || password.length < 8) throw createUserStoreError("invalid_credentials", 400);
    const user = this.data.users.find((item) => item.passwordResetTokenHash === tokenHash) ?? null;
    if (!user) throw createUserStoreError("invalid_password_reset_token", 403);
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt <= Date.now()) {
      throw createUserStoreError("password_reset_token_expired", 403);
    }
    const salt = randomBytes(16).toString("hex");
    user.passwordHash = hashPassword(password, salt);
    user.passwordSalt = salt;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetSentAt = null;
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
    const match = { ...input, addedAt: Date.now() };
    const duplicateIds = new Set(user.favoriteMatches.filter((current) => sameFavoriteMatchRecord(current, match)).map((current) => current.id));
    user.favoriteMatches = upsertFavoriteMatchByIdentity(user.favoriteMatches, match);
    user.reminders = user.reminders.filter((reminder) => !duplicateIds.has(reminder.matchId));
    this.touch(user);
    return user;
  }

  removeFavoriteMatch(userId: string, id: string) {
    const user = this.requireUser(userId);
    const target = user.favoriteMatches.find((item) => item.id === id);
    const removedIds = new Set(
      user.favoriteMatches
        .filter((item) => item.id === id || (target && sameFavoriteMatchRecord(item, target)))
        .map((item) => item.id)
    );
    user.favoriteMatches = user.favoriteMatches.filter((item) => !removedIds.has(item.id));
    user.reminders = user.reminders.filter((item) => !removedIds.has(item.matchId));
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

  markNotificationTelegramDelivered(userId: string, notificationId: string, deliveredAt = Date.now()) {
    const user = this.requireUser(userId);
    user.notifications = user.notifications.map((notification) => (
      notification.id === notificationId
        ? {
            ...notification,
            metadata: {
              ...(notification.metadata ?? {}),
              telegramDeliveredAt: deliveredAt,
            },
          }
        : notification
    ));
    this.touch(user);
    return user;
  }

  setTelegramBindingCode(userId: string, codeHash: string, expiresAt: number) {
    const user = this.requireUser(userId);
    user.telegramBinding = {
      codeHash,
      expiresAt,
      createdAt: Date.now(),
    };
    this.touch(user);
    return user;
  }

  bindTelegramAccount(input: { codeHash: string; chatId: string; username?: string | null; firstName?: string | null }) {
    const now = Date.now();
    const user = this.data.users.find((item) => (
      item.telegramBinding?.codeHash === input.codeHash &&
      item.telegramBinding.expiresAt > now
    ));
    if (!user) throw createUserStoreError("invalid_or_expired_telegram_code", 403);

    for (const current of this.data.users) {
      if (current.id !== user.id && current.telegram?.chatId === input.chatId) {
        current.telegram = null;
        current.updatedAt = now;
        void this.saveUser(current);
      }
    }

    user.telegram = {
      chatId: input.chatId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      linkedAt: now,
      notificationsEnabled: true,
      lastTestSentAt: null,
    };
    user.telegramBinding = null;
    this.touch(user);
    return user;
  }

  unlinkTelegramAccount(userId: string) {
    const user = this.requireUser(userId);
    user.telegram = null;
    user.telegramBinding = null;
    this.touch(user);
    return user;
  }

  setTelegramNotificationsEnabled(userId: string, enabled: boolean) {
    const user = this.requireUser(userId);
    if (!user.telegram) throw createUserStoreError("telegram_not_linked", 404);
    user.telegram = {
      ...user.telegram,
      notificationsEnabled: enabled,
    };
    this.touch(user);
    return user;
  }

  markTelegramTestSent(userId: string, sentAt = Date.now()) {
    return this.markTelegramDeliverySent(userId, sentAt);
  }

  markTelegramDeliverySent(userId: string, sentAt = Date.now()) {
    const user = this.requireUser(userId);
    if (!user.telegram) throw createUserStoreError("telegram_not_linked", 404);
    user.telegram = {
      ...user.telegram,
      lastTestSentAt: sentAt,
    };
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
    void this.deleteUserFromStore(userId);
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
    user.favoriteMatches = uniqueValidFavoriteMatches(user.favoriteMatches);
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
    void this.saveUser(user);
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

    if (await this.loadNormalizedFromPostgres()) {
      return;
    }

    const result = await this.pool.query<{ data: UserDatabase }>(
      "select data from user_store_documents where id = $1",
      ["default"]
    );

    if (result.rows[0]?.data) {
      this.data = result.rows[0].data;
      this.data.users = this.data.users.map(normalizeStoredUser);
      this.data.invitationCodes = (this.data.invitationCodes ?? []).map(normalizeStoredInvitationCode);
      await this.persistAllToPostgres();
      return;
    }

    this.loadFromFile();
    await this.persistAllToPostgres();
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

  private async saveUser(user: WorldCupUser) {
    if (!this.pool) {
      await this.save();
      return;
    }

    await withClient(this.pool, async (client) => {
      await client.query("begin");
      try {
        await upsertUserRow(client, user);
        await replaceUserCollections(client, user);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }).catch((error) => {
      console.warn("[UserStore] save user failed:", error);
    });
  }

  private async saveInvitationCode(invitation: InvitationCode) {
    if (!this.pool) {
      await this.save();
      return;
    }

    await this.pool.query(
      `
      insert into invitation_codes (id, code, note, max_uses, used_count, expires_at, disabled_at, used_by, created_at, updated_at)
      values ($1, $2, $3, $4, $5, to_timestamp($6::double precision / 1000), to_timestamp($7::double precision / 1000), $8, to_timestamp($9::double precision / 1000), to_timestamp($10::double precision / 1000))
      on conflict (id) do update set
        code = excluded.code,
        note = excluded.note,
        max_uses = excluded.max_uses,
        used_count = excluded.used_count,
        expires_at = excluded.expires_at,
        disabled_at = excluded.disabled_at,
        used_by = excluded.used_by,
        updated_at = excluded.updated_at
      `,
      [
        invitation.id,
        invitation.code,
        invitation.note ?? null,
        invitation.maxUses,
        invitation.usedCount,
        invitation.expiresAt ?? null,
        invitation.disabledAt ?? null,
        JSON.stringify(invitation.usedBy ?? []),
        invitation.createdAt,
        invitation.updatedAt,
      ]
    ).catch((error) => {
      console.warn("[UserStore] save invitation failed:", error);
    });
  }

  private async deleteUserFromStore(userId: string) {
    if (!this.pool) {
      await this.save();
      return;
    }
    await this.pool.query("delete from users where id = $1", [userId]).catch((error) => {
      console.warn("[UserStore] delete user failed:", error);
    });
  }

  private async deleteInvitationCodeFromStore(id: string) {
    if (!this.pool) {
      await this.save();
      return;
    }
    await this.pool.query("delete from invitation_codes where id = $1", [id]).catch((error) => {
      console.warn("[UserStore] delete invitation failed:", error);
    });
  }

  private async loadNormalizedFromPostgres() {
    if (!this.pool) return false;

    if (!isDatabaseSchemaInitDisabled()) {
      await ensureUserTelegramColumns(this.pool);
    }

    const [users, invitations] = await Promise.all([
      this.pool.query<Record<string, unknown>>("select * from users order by created_at asc"),
      this.pool.query<Record<string, unknown>>("select * from invitation_codes order by created_at asc"),
    ]);

    if (!users.rowCount && !invitations.rowCount) return false;

    const [
      followedTeams,
      followedPlayers,
      favoriteMatches,
      reminders,
      predictions,
      predictionArchives,
      watchHistory,
      newsSubscriptions,
      notifications,
    ] = await Promise.all([
      this.pool.query<Record<string, unknown>>("select * from user_followed_teams order by followed_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_followed_players order by followed_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_favorite_matches order by added_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_match_reminders order by created_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_match_predictions order by updated_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_prediction_archives order by updated_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_watch_records order by watched_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_news_subscriptions order by updated_at desc"),
      this.pool.query<Record<string, unknown>>("select * from user_notifications order by created_at desc"),
    ]);

    this.data = {
      users: users.rows.map((row) => normalizeStoredUser(rowToUser(
        row,
        rowsByUser(followedTeams.rows, row.id, rowToFollowedTeam),
        rowsByUser(followedPlayers.rows, row.id, rowToFollowedPlayer),
        rowsByUser(favoriteMatches.rows, row.id, rowToFavoriteMatch),
        rowsByUser(reminders.rows, row.id, rowToReminder),
        rowsByUser(predictions.rows, row.id, rowToPrediction),
        rowsByUser(predictionArchives.rows, row.id, rowToPredictionArchive).slice(0, 4),
        rowsByUser(watchHistory.rows, row.id, rowToWatchRecord),
        rowsByUser(newsSubscriptions.rows, row.id, rowToNewsSubscription),
        rowsByUser(notifications.rows, row.id, rowToNotification),
      ))),
      invitationCodes: invitations.rows.map(rowToInvitationCode).map(normalizeStoredInvitationCode),
    };
    return true;
  }

  private async persistAllToPostgres() {
    if (!this.pool) {
      await this.save();
      return;
    }

    for (const user of this.data.users) {
      await this.saveUser(user);
    }
    for (const invitation of this.data.invitationCodes) {
      await this.saveInvitationCode(invitation);
    }
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

async function withClient<T>(pool: Pool, callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

async function ensureUserTelegramColumns(pool: Pool) {
  await pool.query(`
    alter table users add column if not exists telegram_chat_id text;
    alter table users add column if not exists telegram_username text;
    alter table users add column if not exists telegram_first_name text;
    alter table users add column if not exists telegram_linked_at timestamptz;
    alter table users add column if not exists telegram_notifications_enabled boolean not null default false;
    alter table users add column if not exists telegram_last_test_sent_at timestamptz;
    alter table users add column if not exists telegram_binding_code_hash text;
    alter table users add column if not exists telegram_binding_expires_at timestamptz;
    alter table users add column if not exists telegram_binding_created_at timestamptz;
  `);
}

async function upsertUserRow(client: PoolClient, user: WorldCupUser) {
  await client.query(
    `
    insert into users (
      id, email, password_hash, password_salt,
      email_verified_at, email_verification_token_hash, email_verification_expires_at, email_verification_sent_at,
      password_reset_token_hash, password_reset_expires_at, password_reset_sent_at,
      disabled_at, display_name, signature, home_team_id, avatar_player_id, avatar_url, timezone, language,
      telegram_chat_id, telegram_username, telegram_first_name, telegram_linked_at, telegram_notifications_enabled,
      telegram_last_test_sent_at, telegram_binding_code_hash, telegram_binding_expires_at, telegram_binding_created_at,
      created_at, updated_at
    )
    values (
      $1, $2, $3, $4,
      to_timestamp($5::double precision / 1000), $6, to_timestamp($7::double precision / 1000), to_timestamp($8::double precision / 1000),
      $9, to_timestamp($10::double precision / 1000), to_timestamp($11::double precision / 1000),
      to_timestamp($12::double precision / 1000), $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, to_timestamp($23::double precision / 1000), $24,
      to_timestamp($25::double precision / 1000), $26, to_timestamp($27::double precision / 1000), to_timestamp($28::double precision / 1000),
      to_timestamp($29::double precision / 1000), to_timestamp($30::double precision / 1000)
    )
    on conflict (id) do update set
      email = excluded.email,
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      email_verified_at = excluded.email_verified_at,
      email_verification_token_hash = excluded.email_verification_token_hash,
      email_verification_expires_at = excluded.email_verification_expires_at,
      email_verification_sent_at = excluded.email_verification_sent_at,
      password_reset_token_hash = excluded.password_reset_token_hash,
      password_reset_expires_at = excluded.password_reset_expires_at,
      password_reset_sent_at = excluded.password_reset_sent_at,
      disabled_at = excluded.disabled_at,
      display_name = excluded.display_name,
      signature = excluded.signature,
      home_team_id = excluded.home_team_id,
      avatar_player_id = excluded.avatar_player_id,
      avatar_url = excluded.avatar_url,
      timezone = excluded.timezone,
      language = excluded.language,
      telegram_chat_id = excluded.telegram_chat_id,
      telegram_username = excluded.telegram_username,
      telegram_first_name = excluded.telegram_first_name,
      telegram_linked_at = excluded.telegram_linked_at,
      telegram_notifications_enabled = excluded.telegram_notifications_enabled,
      telegram_last_test_sent_at = excluded.telegram_last_test_sent_at,
      telegram_binding_code_hash = excluded.telegram_binding_code_hash,
      telegram_binding_expires_at = excluded.telegram_binding_expires_at,
      telegram_binding_created_at = excluded.telegram_binding_created_at,
      updated_at = excluded.updated_at
    `,
    [
      user.id,
      user.email,
      user.passwordHash,
      user.passwordSalt,
      user.emailVerifiedAt ?? null,
      user.emailVerificationTokenHash ?? null,
      user.emailVerificationExpiresAt ?? null,
      user.emailVerificationSentAt ?? null,
      user.passwordResetTokenHash ?? null,
      user.passwordResetExpiresAt ?? null,
      user.passwordResetSentAt ?? null,
      user.disabledAt ?? null,
      user.profile.displayName,
      user.profile.signature ?? null,
      user.profile.homeTeamId,
      user.profile.avatarPlayerId ?? "lionel-messi",
      user.profile.avatarUrl ?? null,
      user.profile.timezone,
      user.profile.language,
      user.telegram?.chatId ?? null,
      user.telegram?.username ?? null,
      user.telegram?.firstName ?? null,
      user.telegram?.linkedAt ?? null,
      user.telegram?.notificationsEnabled ?? false,
      user.telegram?.lastTestSentAt ?? null,
      user.telegramBinding?.codeHash ?? null,
      user.telegramBinding?.expiresAt ?? null,
      user.telegramBinding?.createdAt ?? null,
      user.createdAt,
      user.updatedAt,
    ]
  );
}

async function replaceUserCollections(client: PoolClient, user: WorldCupUser) {
  const userId = user.id;
  await client.query("delete from user_followed_teams where user_id = $1", [userId]);
  await client.query("delete from user_followed_players where user_id = $1", [userId]);
  await client.query("delete from user_favorite_matches where user_id = $1", [userId]);
  await client.query("delete from user_match_reminders where user_id = $1", [userId]);
  await client.query("delete from user_match_predictions where user_id = $1", [userId]);
  await client.query("delete from user_prediction_archives where user_id = $1", [userId]);
  await client.query("delete from user_watch_records where user_id = $1", [userId]);
  await client.query("delete from user_news_subscriptions where user_id = $1", [userId]);
  await client.query("delete from user_notifications where user_id = $1", [userId]);

  for (const item of user.followedTeams) {
    await client.query(
      "insert into user_followed_teams (user_id, team_id, team_name, region, logo, followed_at) values ($1, $2, $3, $4, $5, to_timestamp($6::double precision / 1000)) on conflict (user_id, team_id) do update set team_name = excluded.team_name, region = excluded.region, logo = excluded.logo, followed_at = excluded.followed_at",
      [userId, item.id, item.name, item.region ?? null, item.logo ?? null, item.followedAt]
    );
  }

  for (const item of user.followedPlayers) {
    await client.query(
      "insert into user_followed_players (user_id, player_id, player_name, team, position, photo, followed_at) values ($1, $2, $3, $4, $5, $6, to_timestamp($7::double precision / 1000)) on conflict (user_id, player_id) do update set player_name = excluded.player_name, team = excluded.team, position = excluded.position, photo = excluded.photo, followed_at = excluded.followed_at",
      [userId, item.id, item.name, item.team ?? null, item.position ?? null, item.photo ?? null, item.followedAt]
    );
  }

  for (const item of user.favoriteMatches) {
    await client.query(
      "insert into user_favorite_matches (user_id, match_id, title, stage, starts_at, added_at) values ($1, $2, $3, $4, $5, to_timestamp($6::double precision / 1000)) on conflict (user_id, match_id) do update set title = excluded.title, stage = excluded.stage, starts_at = excluded.starts_at, added_at = excluded.added_at",
      [userId, item.id, item.title, item.stage ?? null, item.startsAt ?? null, item.addedAt]
    );
  }

  for (const item of user.reminders) {
    await client.query(
      "insert into user_match_reminders (id, user_id, match_id, title, starts_at, remind_before_minutes, channel, enabled, last_queued_at, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9::double precision / 1000), to_timestamp($10::double precision / 1000)) on conflict (user_id, id) do update set match_id = excluded.match_id, title = excluded.title, starts_at = excluded.starts_at, remind_before_minutes = excluded.remind_before_minutes, channel = excluded.channel, enabled = excluded.enabled, last_queued_at = excluded.last_queued_at",
      [item.id, userId, item.matchId, item.title, item.startsAt ?? null, item.remindBeforeMinutes, item.channel, item.enabled, item.lastQueuedAt ?? null, item.createdAt]
    );
  }

  for (const item of user.predictions) {
    await client.query(
      "insert into user_match_predictions (id, user_id, match_id, title, home_score, away_score, confidence, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8::double precision / 1000), to_timestamp($9::double precision / 1000)) on conflict (id) do update set match_id = excluded.match_id, title = excluded.title, home_score = excluded.home_score, away_score = excluded.away_score, confidence = excluded.confidence, updated_at = excluded.updated_at",
      [item.id, userId, item.matchId, item.title, item.homeScore, item.awayScore, item.confidence, item.createdAt, item.updatedAt]
    );
  }

  for (const item of user.predictionArchives ?? []) {
    await client.query(
      "insert into user_prediction_archives (id, user_id, name, group_scores, knockout_picks, created_at, updated_at) values ($1, $2, $3, $4, $5, to_timestamp($6::double precision / 1000), to_timestamp($7::double precision / 1000)) on conflict (id) do update set name = excluded.name, group_scores = excluded.group_scores, knockout_picks = excluded.knockout_picks, updated_at = excluded.updated_at",
      [item.id, userId, item.name, JSON.stringify(item.groupScores ?? {}), JSON.stringify(item.knockoutPicks ?? {}), item.createdAt, item.updatedAt]
    );
  }

  for (const item of user.watchHistory) {
    await client.query(
      "insert into user_watch_records (id, user_id, match_id, title, status, watched_at) values ($1, $2, $3, $4, $5, to_timestamp($6::double precision / 1000)) on conflict (id) do update set match_id = excluded.match_id, title = excluded.title, status = excluded.status, watched_at = excluded.watched_at",
      [item.id, userId, item.matchId, item.title, item.status, item.watchedAt]
    );
  }

  for (const item of user.newsSubscriptions) {
    await client.query(
      "insert into user_news_subscriptions (user_id, topic_id, topic, enabled, updated_at) values ($1, $2, $3, $4, to_timestamp($5::double precision / 1000)) on conflict (user_id, topic_id) do update set topic = excluded.topic, enabled = excluded.enabled, updated_at = excluded.updated_at",
      [userId, item.id, item.topic, item.enabled, item.updatedAt]
    );
  }

  for (const item of user.notifications) {
    await client.query(
      "insert into user_notifications (id, user_id, type, title, body, channel, read, metadata, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9::double precision / 1000)) on conflict (id) do update set title = excluded.title, body = excluded.body, channel = excluded.channel, read = excluded.read, metadata = excluded.metadata",
      [item.id, userId, item.type, item.title, item.body, item.channel, item.read, JSON.stringify(item.metadata ?? {}), item.createdAt]
    );
  }
}

function rowsByUser<T>(rows: Record<string, unknown>[], userId: unknown, mapper: (row: Record<string, unknown>) => T) {
  return rows.filter((row) => String(row.user_id) === String(userId)).map(mapper);
}

function rowToUser(
  row: Record<string, unknown>,
  followedTeams: FollowedTeam[],
  followedPlayers: FollowedPlayer[],
  favoriteMatches: FavoriteMatch[],
  reminders: MatchReminder[],
  predictions: MatchPrediction[],
  predictionArchives: PredictionArchive[],
  watchHistory: WatchRecord[],
  newsSubscriptions: NewsSubscription[],
  notifications: UserNotification[],
): WorldCupUser {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    passwordSalt: String(row.password_salt),
    emailVerifiedAt: dateToMs(row.email_verified_at),
    emailVerificationTokenHash: nullableString(row.email_verification_token_hash),
    emailVerificationExpiresAt: dateToMs(row.email_verification_expires_at),
    emailVerificationSentAt: dateToMs(row.email_verification_sent_at),
    passwordResetTokenHash: nullableString(row.password_reset_token_hash),
    passwordResetExpiresAt: dateToMs(row.password_reset_expires_at),
    passwordResetSentAt: dateToMs(row.password_reset_sent_at),
    disabledAt: dateToMs(row.disabled_at),
    createdAt: dateToMs(row.created_at) ?? Date.now(),
    updatedAt: dateToMs(row.updated_at) ?? Date.now(),
    profile: {
      displayName: String(row.display_name || String(row.email).split("@")[0]),
      signature: nullableString(row.signature),
      homeTeamId: nullableString(row.home_team_id),
      avatarPlayerId: nullableString(row.avatar_player_id) ?? "lionel-messi",
      avatarUrl: nullableString(row.avatar_url),
      timezone: String(row.timezone || "Asia/Shanghai"),
      language: row.language === "en-US" ? "en-US" : "zh-CN",
    },
    followedTeams,
    followedPlayers,
    favoriteMatches,
    reminders,
    predictions,
    predictionArchives,
    watchHistory,
    newsSubscriptions,
    notifications,
    telegram: nullableString(row.telegram_chat_id)
      ? {
          chatId: String(row.telegram_chat_id),
          username: nullableString(row.telegram_username),
          firstName: nullableString(row.telegram_first_name),
          linkedAt: dateToMs(row.telegram_linked_at) ?? Date.now(),
          notificationsEnabled: row.telegram_notifications_enabled !== false,
          lastTestSentAt: dateToMs(row.telegram_last_test_sent_at),
        }
      : null,
    telegramBinding: nullableString(row.telegram_binding_code_hash)
      ? {
          codeHash: String(row.telegram_binding_code_hash),
          expiresAt: dateToMs(row.telegram_binding_expires_at) ?? 0,
          createdAt: dateToMs(row.telegram_binding_created_at) ?? Date.now(),
        }
      : null,
  };
}

function rowToInvitationCode(row: Record<string, unknown>): InvitationCode {
  return {
    id: String(row.id),
    code: String(row.code),
    note: nullableString(row.note) ?? undefined,
    maxUses: Number(row.max_uses ?? 1),
    usedCount: Number(row.used_count ?? 0),
    expiresAt: dateToMs(row.expires_at),
    disabledAt: dateToMs(row.disabled_at),
    createdAt: dateToMs(row.created_at) ?? Date.now(),
    updatedAt: dateToMs(row.updated_at) ?? Date.now(),
    usedBy: parseJsonArray(row.used_by),
  };
}

function rowToFollowedTeam(row: Record<string, unknown>): FollowedTeam {
  return {
    id: String(row.team_id),
    name: String(row.team_name),
    region: nullableString(row.region) ?? undefined,
    logo: nullableString(row.logo) ?? undefined,
    followedAt: dateToMs(row.followed_at) ?? Date.now(),
  };
}

function rowToFollowedPlayer(row: Record<string, unknown>): FollowedPlayer {
  return {
    id: String(row.player_id),
    name: String(row.player_name),
    team: nullableString(row.team) ?? undefined,
    position: nullableString(row.position) ?? undefined,
    photo: nullableString(row.photo) ?? undefined,
    followedAt: dateToMs(row.followed_at) ?? Date.now(),
  };
}

function rowToFavoriteMatch(row: Record<string, unknown>): FavoriteMatch {
  return {
    id: String(row.match_id),
    title: String(row.title),
    stage: nullableString(row.stage) ?? undefined,
    startsAt: dateToIso(row.starts_at),
    addedAt: dateToMs(row.added_at) ?? Date.now(),
  };
}

function rowToReminder(row: Record<string, unknown>): MatchReminder {
  const channel = normalizeNotificationChannel(row.channel);
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    title: String(row.title),
    startsAt: dateToIso(row.starts_at),
    remindBeforeMinutes: Number(row.remind_before_minutes ?? 30),
    channel,
    enabled: row.enabled !== false,
    lastQueuedAt: dateToMs(row.last_queued_at) ?? undefined,
    createdAt: dateToMs(row.created_at) ?? Date.now(),
  };
}

function rowToPrediction(row: Record<string, unknown>): MatchPrediction {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    title: String(row.title),
    homeScore: Number(row.home_score ?? 0),
    awayScore: Number(row.away_score ?? 0),
    confidence: Number(row.confidence ?? 50),
    createdAt: dateToMs(row.created_at) ?? Date.now(),
    updatedAt: dateToMs(row.updated_at) ?? Date.now(),
  };
}

function rowToPredictionArchive(row: Record<string, unknown>): PredictionArchive {
  return {
    id: String(row.id),
    name: String(row.name || "我的模拟"),
    createdAt: dateToMs(row.created_at) ?? Date.now(),
    updatedAt: dateToMs(row.updated_at) ?? Date.now(),
    groupScores: parseJsonObject(row.group_scores),
    knockoutPicks: parseJsonObject(row.knockout_picks),
  };
}

function rowToWatchRecord(row: Record<string, unknown>): WatchRecord {
  const status = row.status === "watched" || row.status === "missed" ? row.status : "planned";
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    title: String(row.title),
    status,
    watchedAt: dateToMs(row.watched_at) ?? Date.now(),
  };
}

function rowToNewsSubscription(row: Record<string, unknown>): NewsSubscription {
  return {
    id: String(row.topic_id),
    topic: String(row.topic),
    enabled: row.enabled !== false,
    updatedAt: dateToMs(row.updated_at) ?? Date.now(),
  };
}

function rowToNotification(row: Record<string, unknown>): UserNotification {
  const type = row.type === "match_reminder" ? "match_reminder" : "system";
  const channel = normalizeNotificationChannel(row.channel);
  return {
    id: String(row.id),
    type,
    title: String(row.title),
    body: String(row.body),
    channel,
    read: row.read === true,
    createdAt: dateToMs(row.created_at) ?? Date.now(),
    metadata: parseJsonObject(row.metadata),
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function dateToMs(value: unknown) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  return Number.isFinite(time) ? time : null;
}

function dateToIso(value: unknown) {
  const time = dateToMs(value);
  return time ? new Date(time).toISOString() : undefined;
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value as InvitationCode["usedBy"];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as InvitationCode["usedBy"] : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, never>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function toPublicUser(user: WorldCupUser) {
  const { passwordHash, passwordSalt, emailVerificationTokenHash, emailVerificationExpiresAt, passwordResetTokenHash, passwordResetExpiresAt, telegramBinding, ...publicUser } = user;
  return publicUser;
}

function normalizeNotificationChannel(value: unknown): NotificationChannel {
  return value === "email" || value === "push" || value === "telegram" ? value : "site";
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

function upsertFavoriteMatchByIdentity(items: FavoriteMatch[], item: FavoriteMatch) {
  const remaining = items.filter((current) => !sameFavoriteMatchRecord(current, item));
  return [item, ...remaining];
}

function uniqueValidFavoriteMatches(items: FavoriteMatch[] = []) {
  const result: FavoriteMatch[] = [];
  for (const item of items) {
    if (!item?.id || result.some((current) => sameFavoriteMatchRecord(current, item))) continue;
    result.push(item);
  }
  return result;
}

function sameFavoriteMatchRecord(left: Pick<FavoriteMatch, "id" | "title" | "startsAt">, right: Pick<FavoriteMatch, "id" | "title" | "startsAt">) {
  if (left.id && right.id && left.id === right.id) return true;
  const leftKey = getFavoriteMatchRecordKey(left);
  const rightKey = getFavoriteMatchRecordKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function getFavoriteMatchRecordKey(match: Pick<FavoriteMatch, "title" | "startsAt">) {
  const title = normalizeFavoriteMatchRecordTitle(match.title);
  const start = normalizeFavoriteMatchRecordStart(match.startsAt);
  return title && start ? `${title}|${start}` : "";
}

function normalizeFavoriteMatchRecordTitle(value?: string) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim()
    .toLowerCase();
}

function normalizeFavoriteMatchRecordStart(value?: string) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  return String(Math.floor(timestamp / 60_000));
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
    passwordResetTokenHash: user.passwordResetTokenHash ?? null,
    passwordResetExpiresAt: user.passwordResetExpiresAt ?? null,
    passwordResetSentAt: user.passwordResetSentAt ?? null,
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
    telegram: user.telegram ?? null,
    telegramBinding: user.telegramBinding?.expiresAt && user.telegramBinding.expiresAt > Date.now()
      ? user.telegramBinding
      : null,
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
