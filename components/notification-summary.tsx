"use client";

import { X } from "lucide-react";
import type { UserSessionPayload } from "@/lib/user-system";

export type NotificationSummaryItem = {
  id: string;
  title: string;
  body: string;
};

export type NotificationSummaryGroups = {
  playerGoals: NotificationSummaryItem[];
  teamWins: NotificationSummaryItem[];
  matchResults: NotificationSummaryItem[];
};

export function buildNotificationSummaryGroups(home: UserSessionPayload | null | undefined): NotificationSummaryGroups {
  return {
    playerGoals:
      home?.user.followedPlayers.slice(0, 6).map((player, index) => ({
        id: `followed-player-goal-${player.id}`,
        title: `${player.name} 进球动态`,
        body: `${player.team ? `${player.team} · ` : ""}${index === 0 ? "关键破门已收录，进球提醒将优先推送。" : "进球提醒已加入你的关注汇总。"}`,
      })) ?? [],
    teamWins:
      home?.user.followedTeams.slice(0, 6).map((team, index) => ({
        id: `followed-team-win-${team.id}`,
        title: `${team.name} 胜利动态`,
        body: `${team.region ? `${team.region} · ` : ""}${index === 0 ? "胜场结果与晋级信号将同步到通知。" : "球队胜利提醒已开启。"}`,
      })) ?? [],
    matchResults:
      home?.user.favoriteMatches.slice(0, 6).map((match) => ({
        id: `favorite-match-result-${match.id}`,
        title: `${match.title} 赛果`,
        body: `${match.stage ? `${match.stage} · ` : ""}${match.startsAt ? `${formatNotificationTime(match.startsAt)} · ` : ""}赛果更新会在完场后汇总。`,
      })) ?? [],
  };
}

export function NotificationSummaryPanel({
  groups,
  className = "",
}: {
  groups: NotificationSummaryGroups;
  className?: string;
}) {
  return (
    <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
      <NotificationSummarySection title="关注的球员进球" items={groups.playerGoals} emptyText="关注球员后，这里会汇总他们的进球动态。" />
      <NotificationSummarySection title="关注的球队胜利" items={groups.teamWins} emptyText="关注球队后，这里会汇总胜利与晋级动态。" />
      <NotificationSummarySection title="收藏的比赛结果" items={groups.matchResults} emptyText="收藏比赛后，这里会汇总完场赛果。" />
    </div>
  );
}

export function NotificationSummaryDialog({
  groups,
  onClose,
}: {
  groups: NotificationSummaryGroups;
  onClose: () => void;
}) {
  return (
    <div className="notification-summary-backdrop fixed inset-0 z-[420] hidden items-center justify-center bg-black/62 px-6 backdrop-blur-2xl lg:flex" role="dialog" aria-modal="true" aria-label="通知汇总">
      <button type="button" aria-label="关闭通知汇总" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="notification-summary-panel relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/[0.16] bg-[#070a11]/[0.96] p-6 text-white shadow-[0_34px_110px_rgba(0,0,0,.78),0_0_70px_rgba(216,255,62,.13)] backdrop-blur-3xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-volt/12 blur-[70px]" />
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-volt/75">Notification Center</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">通知汇总</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/66 ring-1 ring-white/[0.1] transition hover:text-volt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <NotificationSummaryPanel groups={groups} className="relative mt-6" />
      </div>
    </div>
  );
}

function NotificationSummarySection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: NotificationSummaryItem[];
  emptyText: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/[0.1] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
      <h3 className="text-sm font-semibold text-white/86">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="rounded-[1.1rem] bg-black/18 p-3 ring-1 ring-white/[0.06]">
              <p className="text-xs font-semibold text-white/78">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/42">{item.body}</p>
            </article>
          ))
        ) : (
          <p className="rounded-[1.1rem] bg-black/18 p-3 text-[11px] leading-4 text-white/42 ring-1 ring-white/[0.06]">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

export function formatNotificationTime(startsAt?: string | number) {
  if (!startsAt) return "时间待定";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startsAt));
  } catch {
    return startsAt;
  }
}
