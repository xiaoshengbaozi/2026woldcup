import http from "http";
import { randomBytes } from "crypto";
import { UserStore, toPublicUser } from "./userStore";
import type { WorldCupUser } from "./userStore";

const SESSION_COOKIE = "wc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionRecord {
  userId: string;
  expiresAt: number;
}

export class UserSystem {
  private readonly sessions = new Map<string, SessionRecord>();

  constructor(private readonly store = new UserStore()) {}

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    try {
      if (req.method === "POST" && url.pathname === "/api/auth/register") {
        const body = await readJsonBody(req);
        const user = this.store.createUser({
          email: String(body.email ?? ""),
          password: String(body.password ?? ""),
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
        });
        this.issueSession(res, user);
        sendJson(res, { user: toPublicUser(user) }, 201);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await readJsonBody(req);
        const user = this.store.getUserByEmail(String(body.email ?? ""));
        if (!user || !this.store.verifyPassword(user, String(body.password ?? ""))) {
          sendJson(res, { error: "invalid_email_or_password" }, 401);
          return true;
        }
        this.issueSession(res, user);
        sendJson(res, { user: toPublicUser(user) });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/logout") {
        const sessionId = getSessionId(req);
        if (sessionId) this.sessions.delete(sessionId);
        clearSessionCookie(res);
        sendJson(res, { ok: true });
        return true;
      }

      if (url.pathname === "/api/me/home") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, buildHomePayload(user));
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
        sendJson(res, { user: toPublicUser(this.store.upsertTeam(user.id, normalizeNamedEntity(body))) });
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
        sendJson(res, { user: toPublicUser(this.store.upsertPlayer(user.id, normalizeNamedEntity(body))) });
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
        sendJson(res, { user: toPublicUser(this.store.upsertFavoriteMatch(user.id, normalizeMatch(body))) });
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

  private issueSession(res: http.ServerResponse, user: WorldCupUser) {
    const sessionId = randomBytes(32).toString("hex");
    this.sessions.set(sessionId, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    });
    res.setHeader("Set-Cookie", serializeCookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: "Lax",
      path: "/",
    }));
  }
}

export function createUserSystem() {
  return new UserSystem();
}

function buildHomePayload(user: WorldCupUser) {
  return {
    user: toPublicUser(user),
    summary: {
      followedTeamCount: user.followedTeams.length,
      followedPlayerCount: user.followedPlayers.length,
      favoriteMatchCount: user.favoriteMatches.length,
      enabledReminderCount: user.reminders.filter((item) => item.enabled).length,
      predictionCount: user.predictions.length,
      watchedMatchCount: user.watchHistory.filter((item) => item.status === "watched").length,
      activeNewsTopicCount: user.newsSubscriptions.filter((item) => item.enabled).length,
    },
  };
}

async function readJsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function normalizeNamedEntity(body: Record<string, unknown>) {
  const id = String(body.id || body.name || "").trim();
  const name = String(body.name || body.id || "").trim();
  if (!id || !name) throw Object.assign(new Error("missing_entity"), { statusCode: 400 });
  return { ...body, id, name } as { id: string; name: string };
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

function normalizeReminder(body: Record<string, unknown>) {
  const channel = body.channel === "email" || body.channel === "push" ? body.channel : "site";
  return {
    id: typeof body.id === "string" ? body.id : undefined,
    matchId: String(body.matchId || body.id || "next-match"),
    title: String(body.title || "世界杯比赛提醒"),
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

function serializeCookie(
  name: string,
  value: string,
  options: { httpOnly?: boolean; maxAge?: number; sameSite?: "Lax" | "Strict" | "None"; path?: string }
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.httpOnly) parts.push("HttpOnly");
  return parts.join("; ");
}

function sendJson(res: http.ServerResponse, payload: unknown, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
