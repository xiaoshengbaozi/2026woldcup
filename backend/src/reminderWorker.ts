import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { UserStore, type MatchReminder, type WorldCupUser } from "./userStore";
import { sendWxPusherMessage } from "./wxPusherService";

loadLocalEnv(resolve(process.cwd(), ".env"));

const DEFAULT_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = parseInt(process.env.REMINDER_WORKER_INTERVAL_MS || "", 10) || DEFAULT_INTERVAL_MS;

export interface ReminderWorkerOptions {
  intervalMs?: number;
  now?: () => number;
  logger?: Pick<Console, "log" | "warn" | "error">;
}

export function createReminderWorker(store = new UserStore(), options: ReminderWorkerOptions = {}) {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;

    try {
      const jobs = collectDueReminderJobs(store.listUsers(), now());
      for (const job of jobs) {
        store.queueNotification(job.user.id, {
          type: "match_reminder",
          title: job.reminder.title,
          body: buildReminderBody(job.reminder),
          channel: job.reminder.channel,
          metadata: {
            reminderId: job.reminder.id,
            matchId: job.reminder.matchId,
            startsAt: job.reminder.startsAt ?? null,
          },
        });
        await deliverReminder(job.user, job.reminder).catch((error) => {
          logger.warn(`[ReminderWorker] push delivery failed; user=${job.user.email}; reminder=${job.reminder.id}; error=${error.message}`);
        });
        store.markReminderQueued(job.user.id, job.reminder.id, now());
        logDeliveryHook(logger, job.user, job.reminder);
      }

      if (jobs.length) {
        logger.log(`[ReminderWorker] queued ${jobs.length} reminder notification(s).`);
      }
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
      if (!isReminderDue(reminder, now)) continue;
      jobs.push({ user, reminder });
    }
  }

  return jobs;
}

async function deliverReminder(user: WorldCupUser, reminder: MatchReminder) {
  if (reminder.channel !== "push") return;
  if (!user.wxpusherUid) {
    throw Object.assign(new Error("wxpusher_uid_missing"), { statusCode: 400 });
  }

  await sendWxPusherMessage({
    uid: user.wxpusherUid,
    summary: reminder.title,
    content: buildReminderBody(reminder),
    url: process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/matches` : undefined,
  });
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

function logDeliveryHook(logger: Pick<Console, "log" | "warn">, user: WorldCupUser, reminder: MatchReminder) {
  if (reminder.channel === "site" || reminder.channel === "push") return;
  logger.warn(
    `[ReminderWorker] ${reminder.channel} delivery adapter pending; user=${user.email}; reminder=${reminder.id}`
  );
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
  createReminderWorker(store).start();
}
