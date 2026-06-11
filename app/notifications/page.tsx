"use client";

import { useState } from "react";
import { Bell, Radio, Send, Unlink } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { buildNotificationSummaryGroups, formatNotificationTime, NotificationSummaryPanel } from "@/components/notification-summary";
import { useUserSession } from "@/components/user-session-provider";
import { userApi, type PublicUser } from "@/lib/user-system";

type TelegramBindPayload = {
  code: string;
  expiresAt: number;
  botUsername: string | null;
  deepLink: string | null;
};

export default function NotificationsPage() {
  const { home, loading, signedIn, refreshSession } = useUserSession();
  const [bindPayload, setBindPayload] = useState<TelegramBindPayload | null>(null);
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState("");
  const groups = buildNotificationSummaryGroups(home);
  const notifications = home?.user.notifications ?? [];
  const unreadCount = home?.summary.unreadNotificationCount ?? 0;
  const telegram = home?.user.telegram ?? null;

  const createTelegramCode = async () => {
    setTelegramBusy(true);
    setTelegramNotice("");
    try {
      const payload = await userApi<TelegramBindPayload>("/api/me/telegram/bind-code", { method: "POST", body: "{}" });
      setBindPayload(payload);
      setTelegramNotice("绑定码已生成，10 分钟内有效。");
    } catch (error) {
      setTelegramNotice(error instanceof Error ? error.message : "telegram_bind_code_failed");
    } finally {
      setTelegramBusy(false);
    }
  };

  const sendTelegramTest = async () => {
    setTelegramBusy(true);
    setTelegramNotice("");
    try {
      const payload = await userApi<{ ok: boolean; delivery?: { configured?: boolean; sent?: boolean; error?: string } }>("/api/me/telegram/test", { method: "POST", body: "{}" });
      await refreshSession();
      setTelegramNotice(payload.ok ? "测试通知已发送。" : payload.delivery?.error || "telegram_test_pending");
    } catch (error) {
      setTelegramNotice(error instanceof Error ? error.message : "telegram_test_failed");
    } finally {
      setTelegramBusy(false);
    }
  };

  const unlinkTelegram = async () => {
    setTelegramBusy(true);
    setTelegramNotice("");
    try {
      await userApi<{ user: PublicUser }>("/api/me/telegram", { method: "DELETE" });
      setBindPayload(null);
      await refreshSession();
      setTelegramNotice("Telegram 已解绑。");
    } catch (error) {
      setTelegramNotice(error instanceof Error ? error.message : "telegram_unlink_failed");
    } finally {
      setTelegramBusy(false);
    }
  };

  return (
    <DashboardShell>
      <main className="mx-auto grid w-full max-w-[430px] gap-4 pb-2 sm:max-w-3xl lg:max-w-5xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.055] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,.42),0_0_42px_rgba(216,255,62,.08)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-volt/12 blur-[56px]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-volt/75">Notification Center</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal">通知汇总</h1>
              <p className="mt-2 text-xs leading-5 text-white/46">
                站内提醒会把关注球员、关注球队和收藏比赛的关键动态集中到这里。
              </p>
            </div>
            <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/[0.08] text-volt ring-1 ring-white/[0.1]">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-flare px-1 text-[10px] font-black text-black ring-2 ring-ink-950">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="rounded-[1.75rem] border border-white/[0.1] bg-white/[0.045] p-5 text-sm text-white/52 backdrop-blur-2xl">
            正在同步你的通知...
          </section>
        ) : null}

        {!loading && signedIn === false ? (
          <section className="rounded-[1.75rem] border border-white/[0.1] bg-white/[0.045] p-5 text-sm leading-6 text-white/52 backdrop-blur-2xl">
            登录后可以同步收藏比赛、关注球队、关注球员和站内通知。
          </section>
        ) : null}

        {signedIn ? (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-white/[0.045] p-4 text-white backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-sky-400/10 blur-[46px]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white/86">Telegram 通知</h2>
                <p className="mt-1 text-[11px] leading-4 text-white/42">
                  {telegram ? `已绑定 ${telegram.username ? `@${telegram.username}` : telegram.firstName || "Telegram"}` : "绑定后可接收比赛提醒和关键动态。"}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${telegram ? "bg-volt text-black" : "bg-white/[0.06] text-white/42"}`}>
                {telegram ? "已接通" : "未绑定"}
              </span>
            </div>

            {telegram ? (
              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={telegramBusy}
                  onClick={sendTelegramTest}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-volt px-3 text-xs font-bold text-black transition hover:bg-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  发送测试
                </button>
                <button
                  type="button"
                  disabled={telegramBusy}
                  onClick={unlinkTelegram}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/[0.06] px-3 text-xs font-semibold text-white/64 ring-1 ring-white/[0.1] transition hover:text-white disabled:opacity-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  解绑
                </button>
              </div>
            ) : (
              <div className="relative mt-4 grid gap-3">
                <button
                  type="button"
                  disabled={telegramBusy}
                  onClick={createTelegramCode}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-volt px-3 text-xs font-bold text-black transition hover:bg-white disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  生成绑定码
                </button>
                {bindPayload ? (
                  <div className="rounded-[1.25rem] bg-black/18 p-3 ring-1 ring-white/[0.06]">
                    <p className="text-[11px] text-white/42">在 Telegram Bot 中发送</p>
                    <p className="mt-1 select-all text-lg font-semibold tracking-normal text-volt">/start {bindPayload.code}</p>
                    {bindPayload.deepLink ? (
                      <a href={bindPayload.deepLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-white/[0.06] px-3 text-[11px] font-semibold text-white/70 ring-1 ring-white/[0.1] transition hover:text-white">
                        打开 Telegram
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {telegramNotice ? <p className="relative mt-3 text-[11px] leading-4 text-white/46">{telegramNotice}</p> : null}
          </section>
        ) : null}

        {signedIn && notifications.length ? (
          <section className="grid gap-3 rounded-[1.75rem] border border-white/[0.1] bg-white/[0.045] p-4 backdrop-blur-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/86">最近站内通知</h2>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/42">{unreadCount} 未读</span>
            </div>
            <div className="grid gap-2">
              {notifications.slice(0, 6).map((item) => (
                <article key={item.id} className="rounded-[1.2rem] bg-black/18 p-3 ring-1 ring-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 grid h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-white/28" : "bg-volt shadow-[0_0_14px_rgba(216,255,62,.6)]"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/78">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/42">{item.body}</p>
                      <p className="mt-2 text-[10px] font-semibold text-white/30">{formatNotificationTime(String(item.createdAt))}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3">
          <div className="flex items-center gap-2 px-1">
            <Radio className="h-4 w-4 text-volt/80" />
            <h2 className="text-sm font-semibold text-white/86">查看全部</h2>
          </div>
          <NotificationSummaryPanel groups={groups} />
        </section>
      </main>
    </DashboardShell>
  );
}
