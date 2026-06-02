import http from "http";
import { randomBytes } from "crypto";
import type { ApiFootballService } from "./apiFootball";
import { getWorldCupFixtures, getWorldCupSquads } from "./worldCupData";
import { UserStore, toPublicUser } from "./userStore";
import type { WorldCupUser } from "./userStore";

const SESSION_COOKIE = "wc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

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

  constructor(private readonly store = new UserStore(), private readonly apiFootball?: ApiFootballService) {}

  async handleRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
    try {
      if (req.method === "GET" && url.pathname === "/api/user-preferences") {
        sendJson(res, await this.getPreferenceCatalog());
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/register") {
        const body = await readJsonBody(req);
        const user = this.store.createUser({
          email: String(body.email ?? ""),
          password: String(body.password ?? ""),
          displayName: typeof body.displayName === "string" ? body.displayName : undefined,
          avatarPlayerId: typeof body.avatarPlayerId === "string" ? body.avatarPlayerId : undefined,
        });
        applyRegistrationPreferences(this.store, user.id, body);
        this.issueSession(res, user);
        sendJson(res, { user: toPublicUser(this.store.getUserById(user.id) ?? user) }, 201);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/api/auth/login") {
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
        this.issueSession(res, user);
        sendJson(res, { user: toPublicUser(user) });
        return true;
      }

      if (url.pathname.startsWith("/api/admin/users")) {
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

      if (url.pathname === "/api/me/home") {
        const user = this.requireSessionUser(req, res);
        if (!user) return true;
        sendJson(res, buildHomePayload(user, await this.getPreferenceCatalog()));
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

  private async handleAdminRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
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

  private async getPreferenceCatalog() {
    if (this.catalogCache && this.catalogCache.expiresAt > Date.now()) return this.catalogCache.payload;

    const payload = await buildPreferenceCatalog(this.apiFootball);
    this.catalogCache = {
      expiresAt: Date.now() + 6 * 60 * 60_000,
      payload,
    };
    return payload;
  }
}

export function createUserSystem(store = new UserStore(), apiFootball?: ApiFootballService) {
  return new UserSystem(store, apiFootball);
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

function buildHomePayload(user: WorldCupUser, catalog: UserPreferenceCatalog) {
  return {
    user: toPublicUser(user),
    catalog,
    summary: {
      followedTeamCount: user.followedTeams.length,
      followedPlayerCount: user.followedPlayers.length,
      favoriteMatchCount: user.favoriteMatches.length,
      enabledReminderCount: user.reminders.filter((item) => item.enabled).length,
      predictionCount: user.predictions.length,
      watchedMatchCount: user.watchHistory.filter((item) => item.status === "watched").length,
      activeNewsTopicCount: user.newsSubscriptions.filter((item) => item.enabled).length,
      unreadNotificationCount: user.notifications.filter((item) => !item.read).length,
    },
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

    const matches = fixtures.slice(0, 18).map((fixture) => ({
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
      teams: teams.length ? teams : fallback.teams,
      players: players.length ? players : fallback.players,
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
  return clampNumber(process.env.USER_PREFERENCE_SQUAD_TEAM_LIMIT, 1, 48, 12);
}

function getPreferencePlayersPerTeam() {
  return clampNumber(process.env.USER_PREFERENCE_PLAYERS_PER_TEAM, 1, 12, 6);
}

function buildFallbackPreferenceCatalog(): UserPreferenceCatalog {
  return {
    source: "fallback",
    timestamp: Date.now(),
    teams: [
      { id: "26", name: "阿根廷", region: "ARG", logo: "https://media.api-sports.io/football/teams/26.png" },
      { id: "6", name: "巴西", region: "BRA", logo: "https://media.api-sports.io/football/teams/6.png" },
      { id: "2", name: "法国", region: "FRA", logo: "https://media.api-sports.io/football/teams/2.png" },
      { id: "10", name: "英格兰", region: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" },
      { id: "12", name: "日本", region: "JPN", logo: "https://media.api-sports.io/football/teams/12.png" },
    ],
    players: [
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

function applyRegistrationPreferences(store: UserStore, userId: string, body: Record<string, unknown>) {
  const teams = Array.isArray(body.followedTeams) ? body.followedTeams : [];
  const players = Array.isArray(body.followedPlayers) ? body.followedPlayers : [];
  const matches = Array.isArray(body.favoriteMatches) ? body.favoriteMatches : [];

  for (const item of teams) {
    if (item && typeof item === "object") {
      store.upsertTeam(userId, normalizeNamedEntity(item as Record<string, unknown>));
    }
  }

  for (const item of players) {
    if (item && typeof item === "object") {
      store.upsertPlayer(userId, normalizeNamedEntity(item as Record<string, unknown>));
    }
  }

  for (const item of matches) {
    if (item && typeof item === "object") {
      store.upsertFavoriteMatch(userId, normalizeMatch(item as Record<string, unknown>));
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
