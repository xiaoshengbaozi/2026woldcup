import http from "http";
import { createHash, createHmac, randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ApiFootballService } from "./apiFootball";
import { isEmailConfigured, sendEmail } from "./emailService";
import { getTelegramBotUsername, sendTelegramMessage } from "./telegramService";
import { getWorldCupFixtures, getWorldCupSquads } from "./worldCupData";
import { UserStore, toPublicUser } from "./userStore";
import type { InvitationCode, PredictionArchive, UserNotification, WorldCupUser } from "./userStore";
import type { PlayerXTimelineService, XTimelinePlayerInput } from "./playerXTimeline";

const SESSION_COOKIE = "wc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_JSON_BODY_BYTES = 256 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 12;
const UPLOAD_URL_RATE_LIMIT_MAX_ATTEMPTS = 8;
const EMAIL_VERIFICATION_EXPIRES_MS = 24 * 60 * 60 * 1000;
const EMAIL_RESEND_MIN_INTERVAL_MS = 60 * 1000;
const PASSWORD_RESET_EXPIRES_MS = 30 * 60 * 1000;
const PASSWORD_RESET_RESEND_MIN_INTERVAL_MS = 60 * 1000;
const TELEGRAM_BINDING_EXPIRES_MS = 10 * 60 * 1000;
const LINUXDO_OIDC_PROVIDER = "linuxdo";
const GITHUB_OAUTH_PROVIDER = "github";

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const oidcStates = new Map<string, { provider: string; expiresAt: number }>();

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

interface UserPreferenceCatalog {
  source: "api-football" | "fallback";
  timestamp: number;
  teams: Array<{ id: string; name: string; region?: string; logo?: string }>;
  players: Array<{ id: string; name: string; team?: string; position?: string; photo?: string }>;
  matches: Array<{ id: string; matchId: string; title: string; stage?: string; startsAt?: string }>;
}

export class UserSystem {
  private readonly sessions = new Map<string, SessionRecord>();
  private catalogCache: { expiresAt: number; payload: UserPreferenceCatalog } | null = null;

  constructor(
    private readonly store = new UserStore(),
    private readonly apiFootball?: ApiFootballService,
    private readonly playerXTimeline?: PlayerXTimelineService,
  ) {}

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    try {
      if (req.method === "GET" && url.pathname === "/api/user-preferences") {
        sendJson(res, await this.getPreferenceCatalog());
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/player-x-timeline") {
        sendJson(res, await this.getPublicPlayerXTimeline(url));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/popular-players") {
        const limit = clampInteger(Number(url.searchParams.get("limit") || 24), 1, 48, 24);
        sendJson(res, buildPopularPlayersPayload(this.store.listUsers(), limit));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/register") {
        enforceRateLimit(req, "register", RATE_LIMIT_MAX_ATTEMPTS);
        const body = await readJsonBody(req);
        const invitationCode = String(body.invitationCode ?? "");
        this.store.validateInvitationCode(invitationCode);
        const user = this.store.createUser({
          email: String(body.email ?? ""),
          password: String(body.password ?? ""),
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
          avatarPlayerId: typeof body.avatarPlayerId === "string" ? body.avatarPlayerId : undefined,
          avatarUrl: typeof body.avatarUrl === "string" ? body.avatarUrl : undefined,
        });
        this.store.consumeInvitationCode(invitationCode, user);
        await applyRegistrationPreferences(this.store, user.id, body, await this.getPreferenceCatalog());
        const emailVerificationSent = await createAndSendEmailVerification(req, this.store, user).catch(() => false);
        this.issueSession(req, res, user);
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user), emailVerificationSent }, 201);
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/verify-email") {
        const token = String(url.searchParams.get("token") || "");
        this.store.verifyEmailToken(hashEmailVerificationToken(token));
        redirect(res, `${getPublicAppUrl()}/me?emailVerified=success`);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/verify-email") {
        const body = await readJsonBody(req);
        const user = this.store.verifyEmailToken(hashEmailVerificationToken(String(body.token || "")));
        sendJson(res, { user: toPublicUser(user), emailVerified: true });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/resend-verification") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        enforceRateLimit(req, "resend-email-verification", RATE_LIMIT_MAX_ATTEMPTS);
        if (user.emailVerifiedAt) {
          sendJson(res, { user: toPublicUser(user), emailVerificationSent: false, alreadyVerified: true });
          return true;
        }
        if (user.emailVerificationSentAt && Date.now() - user.emailVerificationSentAt < EMAIL_RESEND_MIN_INTERVAL_MS) {
          sendJson(res, { error: "email_verification_recently_sent" }, 429);
          return true;
        }
        const emailVerificationSent = await createAndSendEmailVerification(req, this.store, user);
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user), emailVerificationSent });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/avatar/upload-url") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        enforceRateLimit(req, "avatar-upload-url", UPLOAD_URL_RATE_LIMIT_MAX_ATTEMPTS);
        const body = await readJsonBody(req);
        sendJson(res, createAvatarUploadUrl(body, user.id));
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
        enforceRateLimit(req, "login", RATE_LIMIT_MAX_ATTEMPTS);
        const body = await readJsonBody(req);
        const user = this.store.getUserByEmail(String(body.email ?? ""));
        if (!user || !this.store.verifyPassword(user, String(body.password ?? ""))) {
          sendJson(res, { error: "invalid_email_or_password" }, 401);
          return true;
        }
        if (user.disabledAt) {
          sendJson(res, { error: "user_disabled" }, 403);
          return true;
        }
        this.issueSession(req, res, user, body.remember === true);
        sendJson(res, { user: toPublicUser(user) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/forgot-password") {
        enforceRateLimit(req, "forgot-password", RATE_LIMIT_MAX_ATTEMPTS);
        const body = await readJsonBody(req);
        const user = this.store.getUserByEmail(String(body.email ?? ""));
        let passwordResetSent = false;
        if (user && !user.disabledAt) {
          if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt < PASSWORD_RESET_RESEND_MIN_INTERVAL_MS) {
            sendJson(res, { ok: true, passwordResetSent: true });
            return true;
          }
          passwordResetSent = await createAndSendPasswordReset(req, this.store, user).catch(() => false);
        }
        sendJson(res, { ok: true, passwordResetSent });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/reset-password") {
        enforceRateLimit(req, "reset-password", RATE_LIMIT_MAX_ATTEMPTS);
        const body = await readJsonBody(req);
        const user = this.store.resetPasswordWithToken(hashPasswordResetToken(String(body.token || "")), String(body.password || ""));
        this.issueSession(req, res, user, true);
        sendJson(res, { user: toPublicUser(user) });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/linuxdo") {
        enforceRateLimit(req, "linuxdo-login", RATE_LIMIT_MAX_ATTEMPTS);
        redirect(res, buildLinuxdoAuthorizeUrl(req));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/linuxdo/callback") {
        await this.handleLinuxdoCallback(req, res, url);
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/github") {
        enforceRateLimit(req, "github-login", RATE_LIMIT_MAX_ATTEMPTS);
        redirect(res, buildGitHubAuthorizeUrl(req));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/auth/github/callback") {
        await this.handleGitHubCallback(req, res, url);
        return true;
      }

      if (url.pathname.startsWith("/api/admin/")) {
        await this.handleAdminRequest(req, res, url);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/logout") {
        const sessionId = getSessionId(req);
        if (sessionId) this.sessions.delete(sessionId);
        clearSessionCookie(res);
        sendJson(res, { ok: true });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/me/session") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const syncedUser = await this.syncNotificationState(user);
        sendJson(res, buildSessionPayload(syncedUser));
        return true;
      }

      if (url.pathname === "/api/me/home") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const catalog = await this.getPreferenceCatalog();
        const syncedUser = syncMutualFollowedMatchesForUser(this.store, user.id, catalog);
        const queuedNotifications = queueDueMatchNotifications(this.store, syncedUser);
        const latestUser = this.store.getUserById(user.id) ?? syncedUser;
        await deliverTelegramNotifications(this.store, latestUser, collectTelegramPendingNotifications(latestUser, queuedNotifications));
        sendJson(res, buildHomePayload(this.store.getUserById(user.id) ?? latestUser, catalog));
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/me/player-x-timeline") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, await this.getPlayerXTimeline(user.followedPlayers));
        return true;
      }

      if (req.method === "PATCH" && url.pathname === "/api/me/profile") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, { user: toPublicUser(this.store.updateProfile(user.id, body.profile ?? body)) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/follow/team") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        const team = normalizeNamedEntity(body);
        this.store.upsertTeam(user.id, team);
        syncMutualFollowedMatchesForUser(this.store, user.id, await this.getPreferenceCatalog());
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user) });
        return true;
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/me/follow/team/")) {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, { user: toPublicUser(this.store.removeTeam(user.id, lastPathPart(url))) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/follow/player") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        const player = normalizeNamedEntity(body);
        this.store.upsertPlayer(user.id, player);
        syncMutualFollowedMatchesForUser(this.store, user.id, await this.getPreferenceCatalog());
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user) });
        return true;
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/me/follow/player/")) {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, { user: toPublicUser(this.store.removePlayer(user.id, lastPathPart(url))) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/favorite-match") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        const match = normalizeMatch(body);
        this.store.upsertFavoriteMatch(user.id, match);
        addMatchReminderPair(this.store, user.id, match);
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/notifications/read") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : undefined;
        sendJson(res, { user: toPublicUser(this.store.markNotificationsRead(user.id, ids)) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/telegram/bind-code") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const code = generateTelegramBindingCode();
        const expiresAt = Date.now() + TELEGRAM_BINDING_EXPIRES_MS;
        this.store.setTelegramBindingCode(user.id, hashTelegramBindingCode(code), expiresAt);
        const botUsername = getTelegramBotUsername();
        sendJson(res, {
          code,
          expiresAt,
          botUsername,
          deepLink: botUsername ? `https://t.me/${botUsername}?start=${encodeURIComponent(code)}` : null,
        });
        return true;
      }

      if (req.method === "DELETE" && url.pathname === "/api/me/telegram") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, { user: toPublicUser(this.store.unlinkTelegramAccount(user.id)) });
        return true;
      }

      if (req.method === "PATCH" && url.pathname === "/api/me/telegram") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, { user: toPublicUser(this.store.setTelegramNotificationsEnabled(user.id, body.enabled !== false)) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/telegram/test") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        if (!user.telegram?.chatId) {
          sendJson(res, { error: "telegram_not_linked" }, 404);
          return true;
        }
        const delivery = await sendTelegramMessage(
          user.telegram.chatId,
          `赛波 CYBERBALL 测试通知已接通。\n\n你好，${user.profile.displayName}。后续比赛提醒会从这里同步给你。`
        );
        if (delivery.sent) this.store.markTelegramDeliverySent(user.id);
        sendJson(res, {
          ok: delivery.sent,
          delivery,
          user: toPublicUser(this.store.getUserById(user.id) ?? user),
        });
        return true;
      }

      if (req.method === "POST" && (url.pathname === "/api/telegram/webhook" || url.pathname === "/api/tg/webhook")) {
        const body = await readJsonBody(req);
        sendJson(res, await this.handleTelegramWebhook(body));
        return true;
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/me/favorite-match/")) {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, { user: toPublicUser(this.store.removeFavoriteMatch(user.id, lastPathPart(url))) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/reminder") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, { user: toPublicUser(this.store.upsertReminder(user.id, normalizeReminder(body))) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/prediction") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, { user: toPublicUser(this.store.upsertPrediction(user.id, normalizePrediction(body))) });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/api/me/prediction-archives") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, { archives: (user.predictionArchives ?? []).slice(0, 4) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/prediction-archives") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        const archiveInput = normalizePredictionArchive(body);
        const updated = this.store.upsertPredictionArchive(user.id, archiveInput);
        const archive = archiveInput.id
          ? updated.predictionArchives.find((item) => item.id === archiveInput.id) ?? null
          : updated.predictionArchives[0] ?? null;
        sendJson(res, { archive, archives: updated.predictionArchives });
        return true;
      }

      if (req.method === "DELETE" && url.pathname.startsWith("/api/me/prediction-archives/")) {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const updated = this.store.removePredictionArchive(user.id, lastPathPart(url));
        sendJson(res, { archives: updated.predictionArchives });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/watch-record") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, { user: toPublicUser(this.store.upsertWatchRecord(user.id, normalizeWatchRecord(body))) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/me/news-subscription") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        const body = await readJsonBody(req);
        sendJson(res, {
          user: toPublicUser(this.store.upsertNewsSubscription(user.id, {
            id: String(body.id || body.topic || "news"),
            topic: String(body.topic || body.id || "世界杯新闻"),
            enabled: Boolean(body.enabled),
            updatedAt: Date.now(),
          })),
        });
        return true;
      }

      return false;
    } catch (error) {
      const err = error as Error & { statusCode?: number };
      sendJson(res, { error: err.message || "user_system_error" }, err.statusCode ?? 500);
      return true;
    }
  }

  private requireSessionUser(req: http.IncomingMessage, res: http.ServerResponse) {
    const sessionId = getSessionId(req);
    const session = sessionId ? this.sessions.get(sessionId) : null;
    if (!session || session.expiresAt < Date.now()) {
      if (sessionId) this.sessions.delete(sessionId);
      sendJson(res, { error: "authentication_required" }, 401);
      return null;
    }

    const user = this.store.getUserById(session.userId);
    if (!user) {
      this.sessions.delete(sessionId!);
      sendJson(res, { error: "authentication_required" }, 401);
      return null;
    }

    return user;
  }

  private issueSession(req: http.IncomingMessage, res: http.ServerResponse, user: WorldCupUser, remember = true) {
    const sessionId = randomBytes(32).toString("hex");
    this.sessions.set(sessionId, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });
    const cookieOptions = getSessionCookieOptions(req);
    res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: remember ? SESSION_MAX_AGE_SECONDS : undefined,
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
      path: "/",
    }));
  }

  private async handleLinuxdoCallback(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    try {
      const error = url.searchParams.get("error");
      if (error) throw Object.assign(new Error(error), { statusCode: 403 });

      const code = String(url.searchParams.get("code") || "");
      const state = String(url.searchParams.get("state") || "");
      consumeOidcState(state, LINUXDO_OIDC_PROVIDER);

      const config = getLinuxdoOidcConfig(req);
      const token = await exchangeOidcCode(config, code);
      const profile = await fetchOidcUser(config.userUrl, token.accessToken);
      const identity = normalizeLinuxdoProfile(profile);
      const user = this.store.upsertExternalUser({
        provider: LINUXDO_OIDC_PROVIDER,
        subject: identity.subject,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      });
      if (user.disabledAt) throw Object.assign(new Error("user_disabled"), { statusCode: 403 });

      this.issueSession(req, res, user, true);
      redirect(res, `${getPublicAppUrl()}/me?oauth=linuxdo_success`);
    } catch (error) {
      console.warn("[Auth] Linux.do login failed:", error instanceof Error ? error.message : error);
      redirect(res, `${getPublicAppUrl()}/me?auth=login&oauth=linuxdo_failed`);
    }
  }

  private async handleGitHubCallback(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    try {
      const error = url.searchParams.get("error");
      if (error) throw Object.assign(new Error(error), { statusCode: 403 });

      const code = String(url.searchParams.get("code") || "");
      const state = String(url.searchParams.get("state") || "");
      consumeOidcState(state, GITHUB_OAUTH_PROVIDER);

      const config = getGitHubOAuthConfig(req);
      const token = await exchangeGitHubCode(config, code);
      const profile = await fetchGitHubUser(config.userUrl, token.accessToken);
      const email = await resolveGitHubEmail(config.emailsUrl, token.accessToken, profile);
      const identity = normalizeGitHubProfile(profile, email);
      const user = this.store.upsertExternalUser({
        provider: GITHUB_OAUTH_PROVIDER,
        subject: identity.subject,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      });
      if (user.disabledAt) throw Object.assign(new Error("user_disabled"), { statusCode: 403 });

      this.issueSession(req, res, user, true);
      redirect(res, `${getPublicAppUrl()}/me?oauth=github_success`);
    } catch (error) {
      console.warn("[Auth] GitHub login failed:", error instanceof Error ? error.message : error);
      redirect(res, `${getPublicAppUrl()}/me?auth=login&oauth=github_failed`);
    }
  }

  private async handleAdminRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    if (url.pathname.startsWith("/api/admin/invitations")) {
      await this.handleAdminInvitationRequest(req, res, url);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/admin/users") {
      sendJson(res, buildAdminUsersPayload(this.store.listUsers()));
      return;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const userId = parts[3];
    const action = parts[4];
    const user = userId ? this.store.getUserById(userId) : null;
    if (!user) {
      sendJson(res, { error: "user_not_found" }, 404);
      return;
    }

    if (req.method === "GET" && parts.length === 4) {
      sendJson(res, buildAdminUserDetail(user));
      return;
    }

    if (req.method === "POST" && action === "disable") {
      sendJson(res, buildAdminUserDetail(this.store.setUserDisabled(user.id, true)));
      return;
    }

    if (req.method === "POST" && action === "enable") {
      sendJson(res, buildAdminUserDetail(this.store.setUserDisabled(user.id, false)));
      return;
    }

    if (req.method === "POST" && action === "delete") {
      const deleted = this.store.deleteUser(user.id);
      this.deleteSessionsForUser(user.id);
      sendJson(res, { deletedUserId: deleted.id, ...buildAdminUsersPayload(this.store.listUsers()) });
      return;
    }

    if (req.method === "POST" && action === "reset-reminders") {
      sendJson(res, buildAdminUserDetail(this.store.resetReminderQueue(user.id)));
      return;
    }

    if (req.method === "POST" && action === "clean-anomalies") {
      const result = this.store.cleanUserAnomalies(user.id);
      sendJson(res, { ...buildAdminUserDetail(result.user), removed: result.removed });
      return;
    }

    sendJson(res, { error: "admin_action_not_found" }, 404);
  }

  private deleteSessionsForUser(userId: string) {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) this.sessions.delete(sessionId);
    }
  }

  private async handleAdminInvitationRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    if (req.method === "GET" && url.pathname === "/api/admin/invitations") {
      sendJson(res, buildAdminInvitationsPayload(this.store.listInvitationCodes()));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/admin/invitations") {
      const body = await readJsonBody(req);
      const invitation = this.store.createInvitationCode({
        code: typeof body.code === "string" ? body.code : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
        maxUses: Number(body.maxUses ?? 1),
        expiresAt: typeof body.expiresAt === "string" || typeof body.expiresAt === "number" ? body.expiresAt : null,
      });
      sendJson(res, { invitation: toPublicInvitation(invitation), ...buildAdminInvitationsPayload(this.store.listInvitationCodes()) }, 201);
      return;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const invitationId = parts[3];
    const action = parts[4];

    if (req.method === "POST" && invitationId && action === "disable") {
      const invitation = this.store.setInvitationDisabled(invitationId, true);
      sendJson(res, { invitation: toPublicInvitation(invitation), ...buildAdminInvitationsPayload(this.store.listInvitationCodes()) });
      return;
    }

    if (req.method === "POST" && invitationId && action === "enable") {
      const invitation = this.store.setInvitationDisabled(invitationId, false);
      sendJson(res, { invitation: toPublicInvitation(invitation), ...buildAdminInvitationsPayload(this.store.listInvitationCodes()) });
      return;
    }

    if (req.method === "POST" && invitationId && action === "delete") {
      const invitation = this.store.deleteInvitationCode(invitationId);
      sendJson(res, { deletedInvitationId: invitation.id, ...buildAdminInvitationsPayload(this.store.listInvitationCodes()) });
      return;
    }

    sendJson(res, { error: "admin_invitation_action_not_found" }, 404);
  }

  private async handleTelegramWebhook(body: Record<string, unknown>) {
    const message = parseTelegramMessage(body);
    if (!message) return { ok: true, ignored: true };

    const code = parseTelegramStartCode(message.text);
    if (!code) {
      await sendTelegramMessage(message.chatId, "请在赛波通知页生成绑定码，然后发送 /start 绑定码。");
      return { ok: true, ignored: true, reason: "missing_start_code" };
    }

    const user = this.store.bindTelegramAccount({
      codeHash: hashTelegramBindingCode(code),
      chatId: message.chatId,
      username: message.username,
      firstName: message.firstName,
    });
    const delivery = await sendTelegramMessage(
      message.chatId,
      `绑定成功，${user.profile.displayName}。\n\n赛波 CYBERBALL 会把你开启的比赛提醒同步到这里。`
    );

    return {
      ok: true,
      linked: true,
      userId: user.id,
      delivery,
    };
  }

  private async getPreferenceCatalog() {
    if (this.catalogCache && this.catalogCache.expiresAt > Date.now()) return this.catalogCache.payload;

    const payload = await buildPreferenceCatalog(this.apiFootball);
    this.catalogCache = {
      expiresAt: Date.now() + 6 * 60 * 60_000,
      payload,
    };
    return payload;
  }

  private async getPublicPlayerXTimeline(url: URL) {
    const playerIds = parseCsv(url.searchParams.get("playerIds"));
    const limit = clampInteger(Number(url.searchParams.get("limit") || 12), 1, 24, 12);
    if (playerIds.length) {
      return this.getPlayerXTimeline(playerIds.slice(0, limit).map((id) => ({ id })));
    }

    const catalog = await this.getPreferenceCatalog();
    return this.getPlayerXTimeline(catalog.players.slice(0, limit));
  }

  private async getPlayerXTimeline(players: XTimelinePlayerInput[]) {
    if (!this.playerXTimeline) {
      return {
        timestamp: Date.now(),
        configured: false,
        warning: "x_timeline_service_unavailable",
        players: [],
        items: [],
      };
    }

    return this.playerXTimeline.getTimeline(players);
  }

  private async syncNotificationState(user: WorldCupUser) {
    const catalog = await this.getPreferenceCatalog();
    const syncedUser = syncMutualFollowedMatchesForUser(this.store, user.id, catalog);
    const queuedNotifications = queueDueMatchNotifications(this.store, syncedUser);
    const latestUser = this.store.getUserById(user.id) ?? syncedUser;
    await deliverTelegramNotifications(this.store, latestUser, collectTelegramPendingNotifications(latestUser, queuedNotifications));
    return this.store.getUserById(user.id) ?? latestUser;
  }
}

export function createUserSystem(store = new UserStore(), apiFootball?: ApiFootballService, playerXTimeline?: PlayerXTimelineService) {
  return new UserSystem(store, apiFootball, playerXTimeline);
}

function buildAdminUsersPayload(users: WorldCupUser[]) {
  const activeUsers = users.filter((user) => !user.disabledAt);
  const reminders = users.flatMap((user) => user.reminders);
  const notifications = users.flatMap((user) => user.notifications);
  const predictions = users.flatMap((user) => user.predictions);
  const subscriptions = users.flatMap((user) => user.newsSubscriptions);
  const now = Date.now();

  return {
    timestamp: now,
    summary: {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      disabledUsers: users.length - activeUsers.length,
      followedTeams: users.reduce((total, user) => total + user.followedTeams.length, 0),
      favoriteMatches: users.reduce((total, user) => total + user.favoriteMatches.length, 0),
      predictions: predictions.length,
      enabledReminders: reminders.filter((item) => item.enabled).length,
      queuedReminders: reminders.filter((item) => item.lastQueuedAt).length,
      unreadNotifications: notifications.filter((item) => !item.read).length,
      activeNewsSubscriptions: subscriptions.filter((item) => item.enabled).length,
      active24h: users.filter((user) => now - user.updatedAt < 24 * 60 * 60 * 1000).length,
    },
    users: users
      .map((user) => buildAdminUserListItem(user))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

function buildAdminUserDetail(user: WorldCupUser) {
  return {
    user: toPublicUser(user),
    summary: buildAdminUserListItem(user),
    reminderStatus: {
      enabled: user.reminders.filter((item) => item.enabled).length,
      queued: user.reminders.filter((item) => item.lastQueuedAt).length,
      missingStartTime: user.reminders.filter((item) => item.enabled && !item.startsAt).length,
    },
    newsStats: {
      total: user.newsSubscriptions.length,
      enabled: user.newsSubscriptions.filter((item) => item.enabled).length,
      disabled: user.newsSubscriptions.filter((item) => !item.enabled).length,
    },
    activity: {
      lastUpdatedAt: user.updatedAt,
      createdAt: user.createdAt,
      records:
        user.followedTeams.length +
        user.followedPlayers.length +
        user.favoriteMatches.length +
        user.reminders.length +
        user.predictions.length +
        user.watchHistory.length +
        user.newsSubscriptions.length,
    },
  };
}

function buildPopularPlayersPayload(users: WorldCupUser[], limit: number) {
  const activeUsers = users.filter((user) => !user.disabledAt);
  const byPlayer = new Map<
    string,
    {
      id: string;
      name: string;
      team?: string;
      position?: string;
      photo?: string;
      followCount: number;
      lastFollowedAt: number;
    }
  >();

  for (const user of activeUsers) {
    for (const player of user.followedPlayers) {
      const id = normalizePopularPlayerId(player.id || player.name);
      if (!id) continue;

      const current = byPlayer.get(id);
      if (current) {
        current.followCount += 1;
        current.lastFollowedAt = Math.max(current.lastFollowedAt, player.followedAt || 0);
        current.name = current.name || player.name;
        current.team = current.team || player.team;
        current.position = current.position || player.position;
        current.photo = current.photo || player.photo;
      } else {
        byPlayer.set(id, {
          id,
          name: player.name,
          team: player.team,
          position: player.position,
          photo: player.photo,
          followCount: 1,
          lastFollowedAt: player.followedAt || 0,
        });
      }
    }
  }

  return {
    timestamp: Date.now(),
    totalUsers: activeUsers.length,
    players: [...byPlayer.values()]
      .sort((a, b) => b.followCount - a.followCount || b.lastFollowedAt - a.lastFollowedAt || a.name.localeCompare(b.name))
      .slice(0, limit),
  };
}

function normalizePopularPlayerId(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateTelegramBindingCode() {
  return `TG-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function hashTelegramBindingCode(code: string) {
  return createHash("sha256").update(normalizeTelegramBindingCode(code)).digest("hex");
}

function normalizeTelegramBindingCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function parseTelegramStartCode(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  if (!match) return null;
  const code = normalizeTelegramBindingCode(match[1] || "");
  return code || null;
}

function parseTelegramMessage(body: Record<string, unknown>) {
  const message = readObject(body.message) || readObject(body.edited_message);
  const chat = readObject(message?.chat);
  if (!message || !chat) return null;

  const text = typeof message.text === "string" ? message.text : "";
  const chatId = chat.id === undefined || chat.id === null ? "" : String(chat.id);
  if (!text || !chatId) return null;

  const from = readObject(message.from);
  return {
    text,
    chatId,
    username: typeof from?.username === "string" ? from.username : null,
    firstName: typeof from?.first_name === "string" ? from.first_name : null,
  };
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function buildAdminUserListItem(user: WorldCupUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.profile.displayName,
    disabledAt: user.disabledAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    followedTeams: user.followedTeams.length,
    followedPlayers: user.followedPlayers.length,
    favoriteMatches: user.favoriteMatches.length,
    reminders: user.reminders.length,
    queuedReminders: user.reminders.filter((item) => item.lastQueuedAt).length,
    predictions: user.predictions.length,
    watchRecords: user.watchHistory.length,
    newsSubscriptions: user.newsSubscriptions.filter((item) => item.enabled).length,
    unreadNotifications: user.notifications.filter((item) => !item.read).length,
  };
}

function buildAdminInvitationsPayload(invitations: InvitationCode[]) {
  const now = Date.now();
  const active = invitations.filter((item) => !item.disabledAt && (!item.expiresAt || item.expiresAt > now) && item.usedCount < item.maxUses);
  return {
    timestamp: now,
    summary: {
      totalInvitationCodes: invitations.length,
      activeInvitationCodes: active.length,
      exhaustedInvitationCodes: invitations.filter((item) => item.usedCount >= item.maxUses).length,
      expiredInvitationCodes: invitations.filter((item) => item.expiresAt && item.expiresAt <= now).length,
      invitationUses: invitations.reduce((total, item) => total + item.usedCount, 0),
    },
    invitations: invitations
      .map(toPublicInvitation)
      .sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

function toPublicInvitation(invitation: InvitationCode) {
  const now = Date.now();
  const expired = Boolean(invitation.expiresAt && invitation.expiresAt <= now);
  const exhausted = invitation.usedCount >= invitation.maxUses;
  return {
    ...invitation,
    status: invitation.disabledAt ? "disabled" : expired ? "expired" : exhausted ? "exhausted" : "active",
    remainingUses: Math.max(0, invitation.maxUses - invitation.usedCount),
  };
}

function buildHomePayload(user: WorldCupUser, catalog: UserPreferenceCatalog) {
  return {
    user: toPublicUser(user),
    catalog,
    summary: buildUserSummary(user),
  };
}

function buildSessionPayload(user: WorldCupUser) {
  return {
    user: toPublicUser(user),
    summary: buildUserSummary(user),
  };
}

function buildUserSummary(user: WorldCupUser) {
  return {
    followedTeamCount: user.followedTeams.length,
    followedPlayerCount: user.followedPlayers.length,
    favoriteMatchCount: user.favoriteMatches.length,
    enabledReminderCount: user.reminders.filter((item) => item.enabled).length,
    predictionCount: user.predictions.length,
    watchedMatchCount: user.watchHistory.filter((item) => item.status === "watched").length,
    activeNewsTopicCount: user.newsSubscriptions.filter((item) => item.enabled).length,
    unreadNotificationCount: user.notifications.filter((item) => !item.read).length,
  };
}

async function buildPreferenceCatalog(apiFootball?: ApiFootballService): Promise<UserPreferenceCatalog> {
  if (!apiFootball?.isConfigured()) return buildFallbackPreferenceCatalog();

  try {
    const fixturesUrl = new URL("http://localhost/api/worldcup/fixtures?league=1&season=2026");
    const fixturesPayload = await getWorldCupFixtures(apiFootball, fixturesUrl);
    const fixtures = fixturesPayload.fixtures ?? [];
    const teamMap = new Map<string, { id: string; name: string; region?: string; logo?: string }>();

    for (const fixture of fixtures) {
      for (const team of [fixture.homeTeam, fixture.awayTeam]) {
        if (!team?.id) continue;
        teamMap.set(String(team.id), {
          id: String(team.id),
          name: team.name,
          region: team.code,
          logo: team.logo,
        });
      }
    }

    const teams = [...teamMap.values()].sort((a, b) => (a.region || a.name).localeCompare(b.region || b.name));
    const players = await buildApiPreferencePlayers(apiFootball, teams);

    const matches = fixtures.map((fixture) => ({
      id: String(fixture.apiFixtureId || fixture.uid),
      matchId: String(fixture.apiFixtureId || fixture.uid),
      title: fixture.summary,
      stage: fixture.stage,
      startsAt: fixture.startIso,
    }));

    const fallback = buildFallbackPreferenceCatalog();
    return {
      source: "api-football",
      timestamp: Date.now(),
      teams: mergePreferenceTeams(teams, fallback.teams),
      players: mergePreferencePlayers(players, fallback.players),
      matches: matches.length ? matches : fallback.matches,
    };
  } catch {
    return buildFallbackPreferenceCatalog();
  }
}

async function buildApiPreferencePlayers(apiFootball: ApiFootballService, teams: Array<{ id: string; name: string; region?: string; logo?: string }>) {
  if (!teams.length) return [];

  try {
    const squadUrl = new URL("http://localhost/api/worldcup/squads");
    teams.slice(0, getPreferenceSquadTeamLimit()).forEach((team) => squadUrl.searchParams.append("team", team.id));
    const squadsPayload = await getWorldCupSquads(apiFootball, squadUrl);
    return buildPreferencePlayers(squadsPayload.squads ?? []);
  } catch {
    return [];
  }
}

function buildPreferencePlayers(squads: Array<{ team: { id: number | null; name: string }; players: Array<{ id: number | null; nameEn: string; nameCn: string; position: string; positionCn: string; photo: string }> }>) {
  const playersPerTeam = getPreferencePlayersPerTeam();
  return squads.flatMap((squad) =>
    squad.players
      .filter((player) => player.id || player.nameEn || player.nameCn)
      .slice(0, playersPerTeam)
      .map((player) => ({
        id: String(player.id ?? `${squad.team.id}-${player.nameEn}`),
        name: player.nameCn || player.nameEn,
        team: squad.team.name,
        position: player.positionCn || player.position,
        photo: player.photo,
      }))
  );
}

function getPreferenceSquadTeamLimit() {
  return clampNumber(process.env.USER_PREFERENCE_SQUAD_TEAM_LIMIT, 1, 48, 48);
}

function getPreferencePlayersPerTeam() {
  return clampNumber(process.env.USER_PREFERENCE_PLAYERS_PER_TEAM, 1, 26, 26);
}

function buildFallbackPreferenceCatalog(): UserPreferenceCatalog {
  const officialCatalog = buildOfficialPreferenceCatalog();
  return {
    source: "fallback",
    timestamp: Date.now(),
    teams: officialCatalog.teams.length ? officialCatalog.teams : [
      { id: "26", name: "阿根廷", region: "ARG", logo: "https://media.api-sports.io/football/teams/26.png" },
      { id: "6", name: "巴西", region: "BRA", logo: "https://media.api-sports.io/football/teams/6.png" },
      { id: "2", name: "法国", region: "FRA", logo: "https://media.api-sports.io/football/teams/2.png" },
      { id: "10", name: "英格兰", region: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" },
      { id: "12", name: "日本", region: "JPN", logo: "https://media.api-sports.io/football/teams/12.png" },
    ],
    players: officialCatalog.players.length ? officialCatalog.players : [
      { id: "154", name: "Lionel Messi", team: "阿根廷", position: "Forward", photo: "https://media.api-sports.io/football/players/154.png" },
      { id: "278", name: "Kylian Mbappe", team: "法国", position: "Forward", photo: "https://media.api-sports.io/football/players/278.png" },
      { id: "762", name: "Vinicius Junior", team: "巴西", position: "Forward", photo: "https://media.api-sports.io/football/players/762.png" },
      { id: "386828", name: "Lamine Yamal", team: "西班牙", position: "Forward", photo: "https://media.api-sports.io/football/players/386828.png" },
      { id: "1100", name: "Erling Haaland", team: "挪威", position: "Forward", photo: "https://media.api-sports.io/football/players/1100.png" },
    ],
    matches: [
      {
        id: "opening-match",
        matchId: "opening-match",
        title: "揭幕战 · 2026 世界杯",
        stage: "小组赛",
        startsAt: "2026-06-11T19:00:00-05:00",
      },
      {
        id: "usa-group-opener",
        matchId: "usa-group-opener",
        title: "美国小组赛首战",
        stage: "小组赛",
        startsAt: "2026-06-12T18:00:00-05:00",
      },
      {
        id: "final-match",
        matchId: "final-match",
        title: "决赛 · 世界冠军之夜",
        stage: "决赛",
        startsAt: "2026-07-19T15:00:00-04:00",
      },
    ],
  };
}

type OfficialSquadsData = {
  squads?: Record<string, {
    teamName?: string;
    players?: Array<{
      number?: number;
      position?: string;
      name?: string;
      officialName?: string;
      apiFootballId?: number | null;
    }>;
  }>;
};

function buildOfficialPreferenceCatalog(): Pick<UserPreferenceCatalog, "teams" | "players"> {
  const data = readOfficialSquadsData();
  const squads = data.squads ?? {};
  const teams: UserPreferenceCatalog["teams"] = [];
  const players: UserPreferenceCatalog["players"] = [];

  for (const [teamCode, squad] of Object.entries(squads)) {
    const teamName = squad.teamName?.trim() || teamCode;
    teams.push({
      id: teamCode,
      name: teamName,
      region: teamCode,
      logo: `/team-covers/fifa/${slugifyTeam(teamName)}.png`,
    });

    for (const player of squad.players ?? []) {
      const apiFootballId = player.apiFootballId ? String(player.apiFootballId) : "";
      const name = player.name?.trim() || player.officialName?.trim();
      if (!name) continue;
      players.push({
        id: apiFootballId || `${teamCode}-${player.number || slugifyTeam(name)}`,
        name,
        team: teamName,
        position: normalizePosition(player.position),
        photo: apiFootballId ? `https://media.api-sports.io/football/players/${apiFootballId}.png` : undefined,
      });
    }
  }

  return {
    teams: teams.sort((a, b) => (a.region || a.name).localeCompare(b.region || b.name)),
    players: players.sort((a, b) => (a.team || "").localeCompare(b.team || "") || a.name.localeCompare(b.name)),
  };
}

function readOfficialSquadsData(): OfficialSquadsData {
  for (const candidate of [
    resolve(process.cwd(), "data", "fifa-official-squads.json"),
    resolve(process.cwd(), "..", "data", "fifa-official-squads.json"),
  ]) {
    if (!existsSync(candidate)) continue;
    try {
      return JSON.parse(readFileSync(candidate, "utf8")) as OfficialSquadsData;
    } catch {
      return {};
    }
  }
  return {};
}

function mergePreferenceTeams(primary: UserPreferenceCatalog["teams"], fallback: UserPreferenceCatalog["teams"]) {
  const byId = new Map<string, UserPreferenceCatalog["teams"][number]>();
  for (const team of fallback) byId.set(preferenceTeamKey(team), team);
  for (const team of primary) byId.set(preferenceTeamKey(team), { ...byId.get(preferenceTeamKey(team)), ...team });
  return [...byId.values()].sort((a, b) => (a.region || a.name).localeCompare(b.region || b.name));
}

function preferenceTeamKey(team: UserPreferenceCatalog["teams"][number]) {
  return (team.region || team.name || team.id).trim().toUpperCase();
}

function mergePreferencePlayers(primary: UserPreferenceCatalog["players"], fallback: UserPreferenceCatalog["players"]) {
  const byId = new Map<string, UserPreferenceCatalog["players"][number]>();
  for (const player of fallback) byId.set(player.id, player);
  for (const player of primary) {
    if (!byId.has(player.id)) continue;
    byId.set(player.id, { ...byId.get(player.id), ...player });
  }
  return [...byId.values()].sort((a, b) => (a.team || "").localeCompare(b.team || "") || a.name.localeCompare(b.name));
}

function normalizePosition(position: string | undefined) {
  return {
    GK: "Goalkeeper",
    DF: "Defender",
    MF: "Midfielder",
    FW: "Forward",
  }[position || ""] || position || "Player";
}

function slugifyTeam(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsv(value: string | null) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function enforceRateLimit(req: http.IncomingMessage, bucket: string, maxAttempts: number) {
  const now = Date.now();
  const key = `${bucket}:${getClientIp(req)}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (current.count >= maxAttempts) {
    throw Object.assign(new Error("rate_limit_exceeded"), { statusCode: 429 });
  }

  current.count += 1;
}

function getClientIp(req: http.IncomingMessage) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

async function readJsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw Object.assign(new Error("request_body_too_large"), { statusCode: 413 });
    }
    chunks.push(buffer);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function createAvatarUploadUrl(body: Record<string, unknown>, userId: string) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw Object.assign(new Error("r2_not_configured"), { statusCode: 503 });
  }

  const contentType = String(body.contentType || "application/octet-stream").toLowerCase();
  if (!/^image\/(png|jpe?g|webp)$/.test(contentType)) {
    throw Object.assign(new Error("invalid_avatar_type"), { statusCode: 400 });
  }

  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const now = new Date();
  const dateStamp = toAmzDate(now).slice(0, 8);
  const amzDate = toAmzDate(now);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "user";
  const key = `avatars/${safeUserId}/${dateStamp}/${randomBytes(12).toString("hex")}.${extension}`;
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${bucket}/${key}`;
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": "900",
    "X-Amz-SignedHeaders": "content-type;host",
  });
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalQuery = [...params.entries()]
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .sort()
    .join("&");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    `content-type:${contentType}\nhost:${host}\n`,
    "content-type;host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, "auto", "s3");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  params.set("X-Amz-Signature", signature);

  return {
    uploadUrl: `${endpoint}?${params.toString()}`,
    publicUrl: `${publicBaseUrl}/${key}`,
    method: "PUT",
    headers: { "Content-Type": contentType },
    expiresIn: 900,
  };
}

async function createAndSendEmailVerification(req: http.IncomingMessage, store: UserStore, user: WorldCupUser) {
  if (!isEmailConfigured()) return false;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashEmailVerificationToken(token);
  store.setEmailVerificationToken(user.id, tokenHash, Date.now() + EMAIL_VERIFICATION_EXPIRES_MS);
  const verifyUrl = `${getRequestBaseUrl(req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "验证你的 Cyberball 账号",
    text: [
      `你好，${user.profile.displayName}`,
      "",
      "请点击下面的链接完成邮箱验证：",
      verifyUrl,
      "",
      "链接将在 24 小时后失效。如果不是你本人注册，请忽略这封邮件。",
    ].join("\n"),
    html: buildVerificationEmailHtml(user.profile.displayName, verifyUrl),
  });
  return true;
}

function buildVerificationEmailHtml(displayName: string, verifyUrl: string) {
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(verifyUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#070a0f;color:#f8fafc;font-family:Arial,'Microsoft YaHei',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="border:1px solid rgba(216,255,62,.22);border-radius:28px;background:#0c1117;padding:28px;">
        <p style="margin:0 0 10px;color:#d8ff3e;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Cyberball</p>
        <h1 style="margin:0;color:#fff;font-size:28px;line-height:1.25;">验证你的邮箱</h1>
        <p style="margin:18px 0 0;color:rgba(255,255,255,.72);font-size:15px;line-height:1.8;">你好，${safeName}。点击下面的按钮完成邮箱验证，之后你的账号会更加安全。</p>
        <a href="${safeUrl}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#d8ff3e;color:#05070a;padding:13px 22px;text-decoration:none;font-size:14px;font-weight:800;">完成邮箱验证</a>
        <p style="margin:22px 0 0;color:rgba(255,255,255,.42);font-size:12px;line-height:1.7;">链接 24 小时内有效。如果按钮无法打开，请复制下面的链接：</p>
        <p style="word-break:break-all;color:rgba(255,255,255,.55);font-size:12px;line-height:1.7;">${safeUrl}</p>
      </div>
    </div>
  </body>
</html>`;
}

function hashEmailVerificationToken(token: string) {
  if (!token || token.length < 24) throw Object.assign(new Error("invalid_email_verification_token"), { statusCode: 400 });
  return createHash("sha256").update(token).digest("hex");
}

async function createAndSendPasswordReset(req: http.IncomingMessage, store: UserStore, user: WorldCupUser) {
  if (!isEmailConfigured()) return false;
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  store.setPasswordResetToken(user.id, tokenHash, Date.now() + PASSWORD_RESET_EXPIRES_MS);
  const resetUrl = `${getPublicAppUrl()}/me?auth=login&resetToken=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "重置你的 Cyberball 密码",
    text: [
      `你好，${user.profile.displayName}`,
      "",
      "请点击下面的链接设置新密码：",
      resetUrl,
      "",
      "链接将在 30 分钟后失效。如果不是你本人操作，请忽略这封邮件。",
    ].join("\n"),
    html: buildPasswordResetEmailHtml(user.profile.displayName, resetUrl),
  });
  return true;
}

function buildPasswordResetEmailHtml(displayName: string, resetUrl: string) {
  const safeName = escapeHtml(displayName);
  const safeUrl = escapeHtml(resetUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#070a0f;color:#f8fafc;font-family:Arial,'Microsoft YaHei',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="border:1px solid rgba(216,255,62,.22);border-radius:28px;background:#0c1117;padding:28px;">
        <p style="margin:0 0 10px;color:#d8ff3e;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;">Cyberball</p>
        <h1 style="margin:0;color:#fff;font-size:28px;line-height:1.25;">重置密码</h1>
        <p style="margin:18px 0 0;color:rgba(255,255,255,.72);font-size:15px;line-height:1.8;">你好，${safeName}。点击下面的按钮设置新密码。</p>
        <a href="${safeUrl}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#d8ff3e;color:#05070a;padding:13px 22px;text-decoration:none;font-size:14px;font-weight:800;">设置新密码</a>
        <p style="margin:22px 0 0;color:rgba(255,255,255,.42);font-size:12px;line-height:1.7;">链接 30 分钟内有效。如果按钮无法打开，请复制下面的链接：</p>
        <p style="word-break:break-all;color:rgba(255,255,255,.55);font-size:12px;line-height:1.7;">${safeUrl}</p>
      </div>
    </div>
  </body>
</html>`;
}

function hashPasswordResetToken(token: string) {
  if (!token || token.length < 24) throw Object.assign(new Error("invalid_password_reset_token"), { statusCode: 400 });
  return createHash("sha256").update(token).digest("hex");
}

type LinuxdoOidcConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  redirectUri: string;
  scope: string;
};

function buildLinuxdoAuthorizeUrl(req: http.IncomingMessage) {
  const config = getLinuxdoOidcConfig(req);
  const state = randomBytes(24).toString("hex");
  oidcStates.set(state, { provider: LINUXDO_OIDC_PROVIDER, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

function consumeOidcState(state: string, provider: string) {
  const record = oidcStates.get(state);
  oidcStates.delete(state);
  if (!record || record.provider !== provider || record.expiresAt <= Date.now()) {
    throw Object.assign(new Error("invalid_oidc_state"), { statusCode: 403 });
  }

  for (const [key, value] of oidcStates.entries()) {
    if (value.expiresAt <= Date.now()) oidcStates.delete(key);
  }
}

function getLinuxdoOidcConfig(req: http.IncomingMessage): LinuxdoOidcConfig {
  const clientId = process.env.LINUXDO_OIDC_CLIENT_ID || "";
  const clientSecret = process.env.LINUXDO_OIDC_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) throw Object.assign(new Error("linuxdo_oidc_not_configured"), { statusCode: 503 });

  return {
    clientId,
    clientSecret,
    authorizeUrl: process.env.LINUXDO_OIDC_AUTHORIZE_URL || "https://connect.linux.do/oauth2/authorize",
    tokenUrl: process.env.LINUXDO_OIDC_TOKEN_URL || "https://connect.linux.do/oauth2/token",
    userUrl: process.env.LINUXDO_OIDC_USER_URL || "https://connect.linux.do/api/user",
    redirectUri: normalizeConfiguredUrl(process.env.LINUXDO_OIDC_REDIRECT_URI) || `${getRequestBaseUrl(req)}/api/auth/linuxdo/callback`,
    scope: process.env.LINUXDO_OIDC_SCOPE || "openid profile email",
  };
}

async function exchangeOidcCode(config: LinuxdoOidcConfig, code: string) {
  if (!code) throw Object.assign(new Error("missing_oidc_code"), { statusCode: 400 });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload?.access_token) {
    throw Object.assign(new Error("linuxdo_token_exchange_failed"), { statusCode: 502 });
  }
  return { accessToken: String(payload.access_token) };
}

async function fetchOidcUser(userUrl: string, accessToken: string) {
  const response = await fetch(userUrl, {
    headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw Object.assign(new Error("linuxdo_user_fetch_failed"), { statusCode: 502 });
  return payload;
}

function normalizeLinuxdoProfile(profile: Record<string, unknown>) {
  const subject = firstString(profile, ["sub", "id", "user_id", "uid"]);
  if (!subject) throw Object.assign(new Error("linuxdo_missing_subject"), { statusCode: 502 });
  const email = firstString(profile, ["email", "mail"]) || `${subject}@linuxdo.local`;
  const displayName = firstString(profile, ["name", "username", "login", "nickname", "display_name"]) || email.split("@")[0];
  const avatarUrl = firstString(profile, ["picture", "avatar_url", "avatar", "profile_image"]);
  return { subject, email, displayName, avatarUrl };
}

type GitHubOAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userUrl: string;
  emailsUrl: string;
  redirectUri: string;
  scope: string;
};

function buildGitHubAuthorizeUrl(req: http.IncomingMessage) {
  const config = getGitHubOAuthConfig(req);
  const state = randomBytes(24).toString("hex");
  oidcStates.set(state, { provider: GITHUB_OAUTH_PROVIDER, expiresAt: Date.now() + 10 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    allow_signup: "true",
  });
  return `${config.authorizeUrl}?${params.toString()}`;
}

function getGitHubOAuthConfig(req: http.IncomingMessage): GitHubOAuthConfig {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) throw Object.assign(new Error("github_oauth_not_configured"), { statusCode: 503 });

  return {
    clientId,
    clientSecret,
    authorizeUrl: process.env.GITHUB_OAUTH_AUTHORIZE_URL || "https://github.com/login/oauth/authorize",
    tokenUrl: process.env.GITHUB_OAUTH_TOKEN_URL || "https://github.com/login/oauth/access_token",
    userUrl: process.env.GITHUB_OAUTH_USER_URL || "https://api.github.com/user",
    emailsUrl: process.env.GITHUB_OAUTH_EMAILS_URL || "https://api.github.com/user/emails",
    redirectUri: normalizeConfiguredUrl(process.env.GITHUB_OAUTH_REDIRECT_URI) || `${getRequestBaseUrl(req)}/api/auth/github/callback`,
    scope: process.env.GITHUB_OAUTH_SCOPE || "read:user user:email",
  };
}

async function exchangeGitHubCode(config: GitHubOAuthConfig, code: string) {
  if (!code) throw Object.assign(new Error("missing_github_code"), { statusCode: 400 });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload?.access_token) {
    throw Object.assign(new Error("github_token_exchange_failed"), { statusCode: 502 });
  }
  return { accessToken: String(payload.access_token) };
}

async function fetchGitHubUser(userUrl: string, accessToken: string) {
  const response = await fetch(userUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Cyberball",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) throw Object.assign(new Error("github_user_fetch_failed"), { statusCode: 502 });
  return payload;
}

async function resolveGitHubEmail(emailsUrl: string, accessToken: string, profile: Record<string, unknown>) {
  const publicEmail = firstString(profile, ["email"]);
  if (publicEmail) return publicEmail;

  const response = await fetch(emailsUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Cyberball",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (response.ok && Array.isArray(payload)) {
    const primary = payload.find((item) => isGitHubEmailRecord(item) && item.primary && item.verified);
    if (isGitHubEmailRecord(primary)) return primary.email;
    const verified = payload.find((item) => isGitHubEmailRecord(item) && item.verified);
    if (isGitHubEmailRecord(verified)) return verified.email;
  }

  const subject = firstString(profile, ["id"]);
  return `${subject || randomBytes(8).toString("hex")}@github.local`;
}

function isGitHubEmailRecord(value: unknown): value is { email: string; primary?: boolean; verified?: boolean } {
  return Boolean(value && typeof value === "object" && typeof (value as { email?: unknown }).email === "string");
}

function normalizeGitHubProfile(profile: Record<string, unknown>, email: string) {
  const subject = firstString(profile, ["id", "node_id"]);
  if (!subject) throw Object.assign(new Error("github_missing_subject"), { statusCode: 502 });
  const displayName = firstString(profile, ["name", "login"]) || email.split("@")[0];
  const avatarUrl = firstString(profile, ["avatar_url"]);
  return { subject, email, displayName, avatarUrl };
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeConfiguredUrl(value: string | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const markdownMatch = raw.match(/^\[[^\]]+\]\((https?:\/\/[^)]+)\)$/);
  return markdownMatch?.[1] || raw;
}

function getRequestBaseUrl(req: http.IncomingMessage) {
  const proto = getHeaderValue(req.headers["x-forwarded-proto"]) || ((req.socket as { encrypted?: boolean }).encrypted ? "https" : "http");
  const host = getHeaderValue(req.headers["x-forwarded-host"]) || getHeaderValue(req.headers.host) || "localhost:3001";
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || "https://ball.boyzi.fun").replace(/\/$/, "");
}

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = createHmac("sha256", `AWS4${secret}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  return createHmac("sha256", kService).update("aws4_request").digest();
}

function normalizeNamedEntity(body: Record<string, unknown>) {
  const id = String(body.id || body.name || "").trim();
  const name = String(body.name || body.id || "").trim();
  if (!id || !name) throw Object.assign(new Error("missing_entity"), { statusCode: 400 });
  return { ...body, id, name } as { id: string; name: string };
}

function syncMutualFollowedMatchesForUser(store: UserStore, userId: string, catalog: UserPreferenceCatalog) {
  const user = store.getUserById(userId);
  if (!user) throw Object.assign(new Error("user_not_found"), { statusCode: 404 });

  const groups = buildFollowedTeamGroups(user, catalog);
  if (groups.length < 2) return user;

  const matches = catalog.matches.filter((match) => isMatchBetweenFollowedGroups(match, groups)).slice(0, 24);
  for (const match of matches) {
    const normalized = normalizeMatch(match);
    const latestUser = store.getUserById(userId) ?? user;
    if (latestUser.favoriteMatches.some((favorite) => sameNormalizedMatch(favorite, normalized))) continue;
    store.upsertFavoriteMatch(userId, normalized);
    addMatchReminderPair(store, userId, normalized);
  }

  return store.getUserById(userId) ?? user;
}

function isMatchBetweenFollowedGroups(match: UserPreferenceCatalog["matches"][number], groups: FollowedTeamGroup[]) {
  const title = normalizeSearchText(match.title);
  const matchedTeamKeys = new Set<string>();
  for (const group of groups) {
    if (group.tokens.some((token) => title.includes(token))) {
      matchedTeamKeys.add(group.key);
    }
  }
  return matchedTeamKeys.size >= 2;
}

type FollowedEntity = { id: string; name: string; team?: string; region?: string };
type FollowedTeamGroup = { key: string; tokens: string[] };

function buildFollowedTeamGroups(user: WorldCupUser, catalog: UserPreferenceCatalog) {
  const byKey = new Map<string, Set<string>>();
  for (const entity of [...user.followedTeams, ...user.followedPlayers]) {
    const group = buildFollowedTeamGroup(entity, catalog);
    if (!group) continue;
    const current = byKey.get(group.key) ?? new Set<string>();
    for (const token of group.tokens) current.add(token);
    byKey.set(group.key, current);
  }

  return [...byKey.entries()].map(([key, tokens]) => ({ key, tokens: [...tokens] }));
}

function buildFollowedTeamGroup(entity: FollowedEntity, catalog: UserPreferenceCatalog): FollowedTeamGroup | null {
  const isPlayer = Boolean(entity.team);
  const catalogTeam = resolveCatalogTeamForEntity(entity, catalog);
  const rawTokens = isPlayer
    ? [entity.team, entity.region, catalogTeam?.id, catalogTeam?.region, catalogTeam?.name]
    : [entity.name, entity.region, entity.id, catalogTeam?.id, catalogTeam?.region, catalogTeam?.name];
  const tokens = rawTokens
    .filter(Boolean)
    .map((value) => normalizeSearchText(String(value)))
    .filter((token) => token.length >= 2 && !/^\d+$/.test(token));
  if (!tokens.length) return null;

  const keySource = catalogTeam?.region || catalogTeam?.id || entity.region || entity.team || entity.name || entity.id;
  const key = normalizeSearchText(String(keySource || tokens[0]));
  return { key, tokens: [...new Set(tokens)] };
}

function resolveCatalogTeamForEntity(entity: FollowedEntity, catalog: UserPreferenceCatalog) {
  const values = [entity.team, entity.region, entity.id, entity.name]
    .filter(Boolean)
    .map((value) => String(value).trim());
  const exact = new Set(values.map((value) => value.toUpperCase()));
  const normalized = new Set(values.map(normalizeSearchText));

  return catalog.teams.find((team) => {
    const identifiers = [team.id, team.region, team.name].filter(Boolean).map((value) => String(value).trim());
    return identifiers.some((identifier) => exact.has(identifier.toUpperCase()) || normalized.has(normalizeSearchText(identifier)));
  });
}

function addMatchReminderPair(store: UserStore, userId: string, match: ReturnType<typeof normalizeMatch>) {
  if (!match.startsAt) return;
  for (const reminder of [
    { id: `${match.id}:day`, minutes: minutesFromMatchDayStart(match.startsAt), title: `${match.title} 今日比赛提醒` },
    { id: `${match.id}:20m`, minutes: 20, title: `${match.title} 赛前 20 分钟提醒` },
  ]) {
    store.upsertReminder(userId, {
      id: reminder.id,
      matchId: match.id,
      title: reminder.title,
      startsAt: match.startsAt,
      remindBeforeMinutes: reminder.minutes,
      channel: "site",
      enabled: true,
    });
  }
}

function minutesFromMatchDayStart(startsAt: string) {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) return 1440;
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  return Math.max(20, Math.round((start.getTime() - dayStart.getTime()) / 60_000));
}

function queueDueMatchNotifications(store: UserStore, user: WorldCupUser, now = Date.now()) {
  const queuedNotifications: UserNotification[] = [];
  const latestUser = store.getUserById(user.id) ?? user;
  for (const reminder of latestUser.reminders) {
    if (!reminder.enabled || !reminder.startsAt || reminder.lastQueuedAt) continue;
    const startsAt = Date.parse(reminder.startsAt);
    if (!Number.isFinite(startsAt)) continue;
    const timeToStart = startsAt - now;
    const isSameDay = new Date(now).toDateString() === new Date(startsAt).toDateString();
    const isTwentyMinuteReminder = reminder.id.endsWith(":20m") || reminder.remindBeforeMinutes <= 20;
    const isDayReminder = reminder.id.endsWith(":day") || reminder.remindBeforeMinutes > 20;

    if (isDayReminder && (!isSameDay || timeToStart <= 20 * 60_000)) continue;
    if (isTwentyMinuteReminder && (timeToStart > 20 * 60_000 || timeToStart < -2 * 60 * 60_000)) continue;

    const beforeIds = new Set((store.getUserById(latestUser.id) ?? latestUser).notifications.map((notification) => notification.id));
    const updatedUser = store.queueNotification(latestUser.id, {
      type: "match_reminder",
      title: reminder.title,
      body: isTwentyMinuteReminder ? "比赛即将开始，别错过你收藏的比赛。" : "你收藏的比赛今天开赛。",
      channel: reminder.channel,
      metadata: {
        reminderId: reminder.id,
        matchId: reminder.matchId,
        startsAt: reminder.startsAt,
        urgent: isTwentyMinuteReminder,
      },
    });
    const queued = updatedUser.notifications.find((notification) => !beforeIds.has(notification.id));
    if (queued) queuedNotifications.push(queued);
    store.markReminderQueued(latestUser.id, reminder.id, now);
  }
  return queuedNotifications;
}

async function deliverTelegramNotifications(store: UserStore, user: WorldCupUser, notifications: UserNotification[]) {
  if (!notifications.length || !user.telegram?.chatId || !user.telegram.notificationsEnabled) return;

  for (const notification of notifications) {
    const delivery = await sendTelegramMessage(user.telegram.chatId, `${notification.title}\n\n${notification.body}`);
    if (!delivery.sent) {
      console.warn(`[Telegram] delivery failed; user=${user.email}; notification=${notification.id}; error=${delivery.error || delivery.status || "unknown"}`);
      continue;
    }
    store.markNotificationTelegramDelivered(user.id, notification.id);
    store.markTelegramDeliverySent(user.id);
  }
}

function collectTelegramPendingNotifications(user: WorldCupUser, queuedNotifications: UserNotification[]) {
  const byId = new Map<string, UserNotification>();
  for (const notification of queuedNotifications) byId.set(notification.id, notification);
  for (const notification of user.notifications) {
    if (notification.read || notification.metadata?.telegramDeliveredAt) continue;
    if (notification.channel !== "site" && notification.channel !== "telegram") continue;
    byId.set(notification.id, notification);
  }
  return [...byId.values()]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

async function applyRegistrationPreferences(store: UserStore, userId: string, body: Record<string, unknown>, catalog: UserPreferenceCatalog) {
  const teams = Array.isArray(body.followedTeams) ? body.followedTeams : [];
  const players = Array.isArray(body.followedPlayers) ? body.followedPlayers : [];
  const matches = Array.isArray(body.favoriteMatches) ? body.favoriteMatches : [];

  for (const item of teams) {
    if (item && typeof item === "object") {
      const entity = normalizeNamedEntity(item as Record<string, unknown>);
      store.upsertTeam(userId, entity);
    }
  }

  for (const item of players) {
    if (item && typeof item === "object") {
      const entity = normalizeNamedEntity(item as Record<string, unknown>);
      store.upsertPlayer(userId, entity);
    }
  }

  syncMutualFollowedMatchesForUser(store, userId, catalog);

  for (const item of matches) {
    if (item && typeof item === "object") {
      const match = normalizeMatch(item as Record<string, unknown>);
      store.upsertFavoriteMatch(userId, match);
      addMatchReminderPair(store, userId, match);
    }
  }
}

function normalizeMatch(body: Record<string, unknown>) {
  const id = String(body.id || body.matchId || "").trim();
  const title = String(body.title || "").trim();
  if (!id || !title) throw Object.assign(new Error("missing_match"), { statusCode: 400 });
  return {
    id,
    title,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
  };
}

function sameNormalizedMatch(left: { id: string; title: string; startsAt?: string }, right: { id: string; title: string; startsAt?: string }) {
  if (left.id && right.id && left.id === right.id) return true;
  const leftKey = getNormalizedMatchKey(left);
  const rightKey = getNormalizedMatchKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

function getNormalizedMatchKey(match: { title: string; startsAt?: string }) {
  const title = normalizeSearchText(match.title);
  const start = normalizeMatchStart(match.startsAt);
  return title && start ? `${title}|${start}` : "";
}

function normalizeMatchStart(value?: string) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  return String(Math.floor(timestamp / 60_000));
}

function normalizeReminder(body: Record<string, unknown>) {
  const channel = body.channel === "email" || body.channel === "push" ? body.channel : "site";
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    matchId: String(body.matchId || body.id || "next-match"),
    title: String(body.title || "世界杯比赛提醒"),
    startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
    remindBeforeMinutes: clampNumber(body.remindBeforeMinutes, 5, 1440, 30),
    channel: channel as "site" | "email" | "push",
    enabled: body.enabled !== false,
  };
}

function normalizePrediction(body: Record<string, unknown>) {
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    matchId: String(body.matchId || body.id || "next-match"),
    title: String(body.title || "世界杯比赛预测"),
    homeScore: clampNumber(body.homeScore, 0, 20, 1),
    awayScore: clampNumber(body.awayScore, 0, 20, 1),
    confidence: clampNumber(body.confidence, 1, 100, 64),
  };
}

function normalizePredictionArchive(body: Record<string, unknown>): Omit<PredictionArchive, "id" | "createdAt" | "updatedAt"> & { id?: string } {
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    name: String(body.name || "我的模拟").trim().slice(0, 40) || "我的模拟",
    groupScores: normalizeGroupScores(body.groupScores),
    knockoutPicks: normalizeKnockoutPicks(body.knockoutPicks),
  };
}

function normalizeGroupScores(value: unknown): PredictionArchive["groupScores"] {
  if (!value || typeof value !== "object") return {};

  const scores: PredictionArchive["groupScores"] = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!id || raw === null) {
      scores[id] = null;
      continue;
    }

    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    scores[id] = {
      home: clampNumber(item.home, 0, 20, 0),
      away: clampNumber(item.away, 0, 20, 0),
    };
  }
  return scores;
}

function normalizeKnockoutPicks(value: unknown): PredictionArchive["knockoutPicks"] {
  if (!value || typeof value !== "object") return {};

  const picks: PredictionArchive["knockoutPicks"] = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!id || !raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const winnerCode = String(item.winnerCode || "").trim();
    if (!winnerCode) continue;
    picks[id] = {
      winnerCode,
      homeScore: clampNumber(item.homeScore, 0, 20, 0),
      awayScore: clampNumber(item.awayScore, 0, 20, 0),
    };
  }
  return picks;
}

function normalizeWatchRecord(body: Record<string, unknown>) {
  const status = body.status === "planned" || body.status === "missed" ? body.status : "watched";
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    matchId: String(body.matchId || body.id || "next-match"),
    title: String(body.title || "世界杯比赛"),
    status: status as "planned" | "watched" | "missed",
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function getSessionId(req: http.IncomingMessage) {
  const cookie = req.headers.cookie ?? "";
  const parts = cookie.split(";").map((item) => item.trim());
  const session = parts.find((item) => item.startsWith(`${SESSION_COOKIE}=`));
  return session ? decodeURIComponent(session.slice(SESSION_COOKIE.length + 1)) : null;
}

function lastPathPart(url: URL) {
  return decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
}

function clearSessionCookie(res: http.ServerResponse) {
  res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    sameSite: "Lax",
    path: "/",
  }));
}

function getSessionCookieOptions(req: http.IncomingMessage): { sameSite: "Lax" | "None"; secure: boolean } {
  const origin = req.headers.origin;
  if (!origin) return { sameSite: "Lax", secure: false };

  try {
    const originUrl = new URL(origin);
    const requestHost = req.headers.host?.split(":")[0];
    const isCapacitorOrigin =
      (originUrl.protocol === "https:" || originUrl.protocol === "capacitor:" || originUrl.protocol === "ionic:") &&
      originUrl.hostname === "localhost";
    const isLocalOrigin = originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1" || originUrl.hostname === "::1";
    const isSameHost = Boolean(requestHost && originUrl.hostname === requestHost);

    if (isCapacitorOrigin) {
      return { sameSite: "None", secure: true };
    }

    if (originUrl.protocol === "https:" && !isLocalOrigin && !isSameHost) {
      return { sameSite: "None", secure: true };
    }
  } catch {
    return { sameSite: "Lax", secure: false };
  }

  return { sameSite: "Lax", secure: false };
}

function serializeCookie(
  name: string,
  value: string,
  options: { httpOnly?: boolean; maxAge?: number; sameSite?: "Lax" | "Strict" | "None"; secure?: boolean; path?: string }
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (options.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

function sendJson(res: http.ServerResponse, payload: unknown, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function redirect(res: http.ServerResponse, location: string, statusCode = 302) {
  res.writeHead(statusCode, { Location: location });
  res.end();
}
