import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import type { ApiFootballService } from "./apiFootball";
import { createApiFootballService } from "./apiFootball";
import { sendTelegramMessage } from "./telegramService";
import { UserStore, type MatchReminder, type WorldCupUser } from "./userStore";

loadLocalEnv(resolve(process.cwd(), ".env"));

const DEFAULT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = parseInt(process.env.REMINDER_WORKER_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL_MS;

export interface ReminderWorkerOptions {
  intervalMs?: number;
  now?: () => number;
  logger?: Pick<Console, "log" | "warn" | "error">;
  apiFootball?: ApiFootballService;
}

export function createReminderWorker(store = new UserStore(), options: ReminderWorkerOptions = {}) {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  const apiFootball = options.apiFootball;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;

    try {
      const users = store.listUsers();
      const jobs = collectDueReminderJobs(users, now());
      for (const job of jobs) {
        const beforeIds = new Set(job.user.notifications.map((notification) => notification.id));
        const urgent = isTwentyMinuteReminder(job.reminder);
        const updatedUser = store.queueNotification(job.user.id, {
          type: "match_reminder",
          title: job.reminder.title,
          body: buildWorkerReminderBody(urgent),
          channel: job.reminder.channel,
          metadata: {
            reminderId: job.reminder.id,
            matchId: job.reminder.matchId,
            startsAt: job.reminder.startsAt ?? null,
            urgent,
          },
        });
        const notification = updatedUser.notifications.find((item) => !beforeIds.has(item.id));
        store.markReminderQueued(job.user.id, job.reminder.id, now());
        if (notification) {
          await deliverTelegramNotification(store, job.user.id, notification.id, logger);
        }
      }

      if (jobs.length) {
        logger.log(`[ReminderWorker] queued ${jobs.length} reminder notification(s).`);
      }

      if (apiFootball?.isConfigured()) {
        await queueFollowUpdateNotifications(store, apiFootball, logger);
      }

      await deliverPendingTelegramNotifications(store, logger);
    } catch (error) {
      logger.error("[ReminderWorker] tick failed:", error);
    } finally {
      running = false;
    }
  }

  return {
    tick,
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(() => void tick(), intervalMs);
      logger.log(`[ReminderWorker] started; interval=${intervalMs}ms`);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      logger.log("[ReminderWorker] stopped");
    },
  };
}

export function collectDueReminderJobs(users: WorldCupUser[], now: number) {
  const jobs: Array<{ user: WorldCupUser; reminder: MatchReminder }> = [];

  for (const user of users) {
    for (const reminder of user.reminders) {
      if (!isWorkerReminderDue(reminder, now)) continue;
      jobs.push({ user, reminder });
    }
  }

  return jobs;
}

function isWorkerReminderDue(reminder: MatchReminder, now: number) {
  if (!reminder.enabled || !reminder.startsAt || reminder.lastQueuedAt) return false;
  const startsAt = Date.parse(reminder.startsAt);
  if (!Number.isFinite(startsAt)) return false;
  const timeToStart = startsAt - now;
  const isSameDay = new Date(now).toDateString() === new Date(startsAt).toDateString();

  if (isTwentyMinuteReminder(reminder)) {
    return timeToStart <= 20 * 60_000 && timeToStart >= -2 * 60 * 60_000;
  }

  if (isDayReminder(reminder)) {
    return isSameDay && timeToStart > 20 * 60_000;
  }

  const dueAt = startsAt - reminder.remindBeforeMinutes * 60_000;
  return now >= dueAt && now <= startsAt + 2 * 60 * 60_000;
}

function isTwentyMinuteReminder(reminder: MatchReminder) {
  return reminder.id.endsWith(":20m") || reminder.remindBeforeMinutes <= 20;
}

function isDayReminder(reminder: MatchReminder) {
  return reminder.id.endsWith(":day") || reminder.remindBeforeMinutes > 20;
}

function buildWorkerReminderBody(urgent: boolean) {
  if (urgent) return "比赛即将开始，别错过你收藏的比赛。";
  return "你收藏的比赛今天开赛。";
}

function isReminderDue(reminder: MatchReminder, now: number) {
  if (!reminder.enabled || !reminder.startsAt || reminder.lastQueuedAt) return false;
  const startsAt = Date.parse(reminder.startsAt);
  if (!Number.isFinite(startsAt)) return false;
  const dueAt = startsAt - reminder.remindBeforeMinutes * 60 * 1000;
  return now >= dueAt && now <= startsAt + 2 * 60 * 60 * 1000;
}

function buildReminderBody(reminder: MatchReminder) {
  const minutes = reminder.remindBeforeMinutes;
  if (!reminder.startsAt) return `${reminder.title} 即将开始。`;
  return `${reminder.title} 将在 ${minutes} 分钟内进入比赛窗口。`;
}

async function queueFollowUpdateNotifications(
  store: UserStore,
  apiFootball: ApiFootballService,
  logger: Pick<Console, "warn" | "error">
) {
  let fixtures: LiveFixture[] = [];
  try {
    fixtures = await fetchNotificationFixtures(apiFootball);
  } catch (error) {
    logger.warn("[ReminderWorker] live fixture scan failed:", error);
    return;
  }

  for (const fixture of fixtures) {
    const events = fixture.status === "live" || fixture.status === "halftime" || fixture.status === "finished"
      ? await fetchFixtureEvents(apiFootball, fixture.id, logger)
      : [];

    for (const user of store.listUsers()) {
      queueKickoffNotifications(store, user, fixture);
      queueGoalNotifications(store, user, fixture, events);
      queueWinNotifications(store, user, fixture);
    }
  }
}

async function fetchNotificationFixtures(apiFootball: ApiFootballService) {
  const fixturesById = new Map<number, LiveFixture>();
  const now = new Date();
  const recentFrom = formatApiDate(addUtcDays(now, -1));
  const recentTo = formatApiDate(addUtcDays(now, 1));

  for (const params of [
    new URLSearchParams({ league: "1", season: "2026", live: "all" }),
    new URLSearchParams({ league: "1", season: "2026", from: recentFrom, to: recentTo }),
  ]) {
    const payload = await apiFootball.request("fixtures", params);
    const upstream = payload.upstream as { response?: unknown[] };
    for (const fixture of (upstream.response ?? []).map(normalizeLiveFixture)) {
      if (fixture) fixturesById.set(fixture.id, fixture);
    }
  }

  return [...fixturesById.values()];
}

async function fetchFixtureEvents(apiFootball: ApiFootballService, fixtureId: number, logger: Pick<Console, "warn">) {
  try {
    const payload = await apiFootball.request("fixtures/events", new URLSearchParams({ fixture: String(fixtureId) }));
    const upstream = payload.upstream as { response?: unknown[] };
    return (upstream.response ?? []).map(normalizeLiveEvent).filter((event): event is LiveEvent => Boolean(event));
  } catch (error) {
    logger.warn(`[ReminderWorker] fixture events scan failed; fixture=${fixtureId}:`, error);
    return [];
  }
}

function queueKickoffNotifications(store: UserStore, user: WorldCupUser, fixture: LiveFixture) {
  if (fixture.status !== "live" && fixture.status !== "halftime") return;

  for (const team of matchingFollowedTeams(user, fixture)) {
    queueFollowNotification(store, user.id, {
      key: `follow:kickoff:${fixture.id}:team:${team.id}`,
      title: `${team.name} 开赛了`,
      body: `${fixture.home.name} vs ${fixture.away.name} 已经开始，当前比分 ${scoreText(fixture)}。`,
      metadata: {
        followType: "team",
        eventType: "kickoff",
        fixtureId: fixture.id,
        teamId: team.id,
      },
    });
  }
}

function queueGoalNotifications(store: UserStore, user: WorldCupUser, fixture: LiveFixture, events: LiveEvent[]) {
  for (const event of events) {
    if (event.type !== "Goal" || /Missed Penalty/i.test(event.detail)) continue;

    for (const team of matchingFollowedTeams(user, fixture, event.team)) {
      queueFollowNotification(store, user.id, {
        key: `follow:goal:${fixture.id}:team:${team.id}:${event.id}`,
        title: `${event.team.name || team.name} 进球`,
        body: `${event.minute}' ${event.player || "球队"} 破门，${fixture.home.name} ${fixture.score.home ?? 0} - ${fixture.score.away ?? 0} ${fixture.away.name}。`,
        metadata: {
          followType: "team",
          eventType: "goal",
          fixtureId: fixture.id,
          teamId: team.id,
          eventId: event.id,
        },
      });
    }

    for (const player of matchingFollowedPlayers(user, event)) {
      queueFollowNotification(store, user.id, {
        key: `follow:goal:${fixture.id}:player:${player.id}:${event.id}`,
        title: `${player.name} 进球`,
        body: `${event.minute}' ${player.name} 为 ${event.team.name || player.team || "球队"} 破门。`,
        metadata: {
          followType: "player",
          eventType: "goal",
          fixtureId: fixture.id,
          playerId: player.id,
          eventId: event.id,
        },
      });
    }
  }
}

function queueWinNotifications(store: UserStore, user: WorldCupUser, fixture: LiveFixture) {
  if (fixture.status !== "finished") return;
  const winner = getFixtureWinner(fixture);
  if (!winner) return;

  for (const team of matchingFollowedTeams(user, fixture, winner)) {
    queueFollowNotification(store, user.id, {
      key: `follow:win:${fixture.id}:team:${team.id}`,
      title: `${team.name} 获胜`,
      body: `${fixture.home.name} ${fixture.score.home ?? 0} - ${fixture.score.away ?? 0} ${fixture.away.name}，你关注的球队拿下比赛。`,
      metadata: {
        followType: "team",
        eventType: "win",
        fixtureId: fixture.id,
        teamId: team.id,
      },
    });
  }
}

function queueFollowNotification(
  store: UserStore,
  userId: string,
  input: { key: string; title: string; body: string; metadata: Record<string, string | number | boolean | null> }
) {
  store.queueNotification(userId, {
    type: "follow_update",
    title: input.title,
    body: input.body,
    channel: "site",
    metadata: {
      ...input.metadata,
      notificationKey: input.key,
    },
  });
}

type LiveTeam = {
  id: number | null;
  name: string;
};

type LiveFixture = {
  id: number;
  status: "not_started" | "live" | "halftime" | "finished" | "other";
  home: LiveTeam;
  away: LiveTeam;
  score: {
    home: number | null;
    away: number | null;
  };
};

type LiveEvent = {
  id: string;
  minute: number;
  type: string;
  detail: string;
  team: LiveTeam;
  player: string;
  playerId: number | null;
};

function normalizeLiveFixture(raw: unknown): LiveFixture | null {
  const item = readObject(raw);
  if (!item) return null;
  const fixture = readObject(item.fixture);
  const id = Number(fixture?.id ?? 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  const teams = readObject(item.teams);
  const goals = readObject(item.goals);
  const status = readObject(fixture?.status);

  return {
    id,
    status: normalizeLiveStatus(String(status?.short ?? "")),
    home: normalizeLiveTeam(readObject(teams?.home)),
    away: normalizeLiveTeam(readObject(teams?.away)),
    score: {
      home: numberOrNull(goals?.home),
      away: numberOrNull(goals?.away),
    },
  };
}

function normalizeLiveEvent(raw: unknown, index: number): LiveEvent | null {
  const item = readObject(raw);
  if (!item) return null;
  const time = readObject(item.time);
  const team = normalizeLiveTeam(readObject(item.team));
  const player = readObject(item.player);
  const minute = Number(time?.elapsed ?? 0);
  const type = String(item.type ?? "");
  const playerName = String(player?.name ?? "").trim();

  return {
    id: `${minute || "event"}:${type}:${team.id ?? team.name}:${player?.id ?? playerName}:${String(item.detail ?? "")}:${index}`,
    minute,
    type,
    detail: String(item.detail ?? ""),
    team,
    player: playerName,
    playerId: numberOrNull(player?.id),
  };
}

function normalizeLiveTeam(team: Record<string, unknown> | null | undefined): LiveTeam {
  return {
    id: numberOrNull(team?.id),
    name: String(team?.name ?? "").trim(),
  };
}

function normalizeLiveStatus(status: string): LiveFixture["status"] {
  if (["1H", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(status)) return "live";
  if (status === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(status)) return "finished";
  if (["NS", "TBD"].includes(status)) return "not_started";
  return "other";
}

function matchingFollowedTeams(user: WorldCupUser, fixture: LiveFixture, targetTeam?: LiveTeam) {
  const teams = targetTeam ? [targetTeam] : [fixture.home, fixture.away];
  return user.followedTeams.filter((followed) =>
    teams.some((team) => entityMatchesTeam(followed, team))
  );
}

function matchingFollowedPlayers(user: WorldCupUser, event: LiveEvent) {
  return user.followedPlayers.filter((player) => {
    if (event.playerId !== null && String(player.id) === String(event.playerId)) return true;
    return normalizeText(player.name) === normalizeText(event.player);
  });
}

function entityMatchesTeam(entity: { id: string; name: string; region?: string }, team: LiveTeam) {
  const ids = [entity.id, entity.region, entity.name].map(String).map(normalizeText).filter(Boolean);
  const teamValues = [team.id === null ? "" : String(team.id), team.name].map(normalizeText).filter(Boolean);
  return ids.some((id) => teamValues.includes(id));
}

function getFixtureWinner(fixture: LiveFixture) {
  const home = fixture.score.home;
  const away = fixture.score.away;
  if (home === null || away === null || home === away) return null;
  return home > away ? fixture.home : fixture.away;
}

function scoreText(fixture: LiveFixture) {
  return `${fixture.score.home ?? 0} - ${fixture.score.away ?? 0}`;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatApiDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function deliverPendingTelegramNotifications(store: UserStore, logger: Pick<Console, "warn" | "error">) {
  for (const user of store.listUsers()) {
    if (!user.telegram?.chatId || !user.telegram.notificationsEnabled) continue;

    const pending = user.notifications.filter((notification) => (
      !notification.read &&
      !notification.metadata?.telegramDeliveredAt &&
      (notification.channel === "site" || notification.channel === "telegram")
    ));

    for (const notification of pending) {
      await deliverTelegramNotification(store, user.id, notification.id, logger);
    }
  }
}

async function deliverTelegramNotification(
  store: UserStore,
  userId: string,
  notificationId: string,
  logger: Pick<Console, "warn" | "error">
) {
  const user = store.getUserById(userId);
  const notification = user?.notifications.find((item) => item.id === notificationId);
  if (!user?.telegram?.chatId || !user.telegram.notificationsEnabled || !notification) return;
  if (notification.metadata?.telegramDeliveredAt) return;
  if (notification.channel !== "site" && notification.channel !== "telegram") return;

  try {
    const delivery = await sendTelegramMessage(user.telegram.chatId, `${notification.title}\n\n${notification.body}`);
    if (!delivery.sent) {
      logger.warn(`[ReminderWorker] Telegram delivery failed; user=${user.email}; notification=${notification.id}; error=${delivery.error || delivery.status || "unknown"}`);
      return;
    }

    store.markNotificationTelegramDelivered(user.id, notification.id);
    store.markTelegramDeliverySent(user.id);
  } catch (error) {
    logger.error(`[ReminderWorker] Telegram delivery crashed; user=${user.email}; notification=${notification.id}:`, error);
  }
}

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

if (import.meta.main) {
  const store = new UserStore();
  await store.ready();
  createReminderWorker(store, { apiFootball: createApiFootballService() }).start();
}
