"use client";

import { useState } from "react";
import { useMatchDetail } from "@/lib/use-match-detail";
import { DashboardShell } from "@/components/dashboard-shell";
import { MatchHero } from "@/components/match-detail/match-hero";
import { MatchOdds } from "@/components/match-detail/match-odds";
import { MatchLineup } from "@/components/match-detail/match-lineup";
import { MatchTimeline } from "@/components/match-detail/match-timeline";
import { MatchStatsPanel } from "@/components/match-detail/match-stats-panel";
import { MatchNews } from "@/components/match-detail/match-news";
import { MatchHeadToHead } from "@/components/match-detail/match-head-to-head";
import { LivePlayer } from "@/components/match-detail/live-player";
import { MatchNav, type MatchTab } from "@/components/match-detail/match-nav";
import { MobileSecondaryPageActions } from "@/components/mobile-secondary-page-actions";
import { UserActionButton } from "@/components/user-action-button";

export function MatchDetailClient({ slug }: { slug: string }) {
  const { detail, loading, error } = useMatchDetail(slug);
  const [activeTab, setActiveTab] = useState<MatchTab>("lineup");

  if (loading && !detail) {
    return (
      <DashboardShell>
        <MobileSecondaryPageActions backHref="/matches/" backLabel="返回赛程" reserveSpace />
        <div className="hero-card p-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-volt border-t-transparent" />
          <p className="mt-4 text-white/55">Loading match data...</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !detail) {
    return (
      <DashboardShell>
        <MobileSecondaryPageActions backHref="/matches/" backLabel="返回赛程" reserveSpace />
        <div className="hero-card p-12 text-center">
          <p className="text-xl text-white/60">{error || "Match not found"}</p>
          <a href="/matches/" className="mt-4 inline-block text-sm text-volt hover:underline">
            Back to schedule
          </a>
        </div>
      </DashboardShell>
    );
  }

  const favoritePayload = {
    id: String(detail.match.apiFixtureId || detail.match.uid),
    matchId: String(detail.match.apiFixtureId || detail.match.uid),
    title: detail.match.summary,
    stage: detail.match.stage,
    startsAt: detail.match.start.toISOString(),
  };
  const isStarted = detail.status !== "not_started";
  const hasConfirmedLineup =
    detail.homeLineup.listType === "confirmed_lineup" ||
    detail.awayLineup.listType === "confirmed_lineup";

  return (
    <DashboardShell>
      <MobileSecondaryPageActions
        backHref="/matches/"
        backLabel="返回赛程"
        rightAction={!isStarted ? (
          <UserActionButton
            kind="match"
            payload={favoritePayload}
            iconOnly
          />
        ) : undefined}
      />
      <MatchHero
        detail={detail}
        favoriteAction={!isStarted ? (
          <UserActionButton
            kind="match"
            payload={favoritePayload}
            className="match-hero-favorite-button h-8 px-3 py-0 text-[10px] sm:h-8 sm:px-4 sm:text-[10px]"
          />
        ) : undefined}
      />
      <MatchNav active={activeTab} onTabChange={setActiveTab} />

      <div className="space-y-5">
        {activeTab === "lineup" && <MatchLineup detail={detail} compactMobile={isStarted || hasConfirmedLineup} />}
        {activeTab === "live" && <LivePlayer detail={detail} />}
        {activeTab === "stats" && (
          <MatchStatsPanel detail={detail} />
        )}
        {activeTab === "events" && (
          detail.events.length > 0 ? (
            <MatchTimeline detail={detail} />
          ) : (
            <div className="hero-card px-5 py-10 text-center text-sm font-semibold text-white/45">
              暂无比赛事件
            </div>
          )
        )}
        {activeTab === "analysis" && (
          <>
            <MatchOdds detail={detail} />
            {detail.news.length > 0 && <MatchNews detail={detail} />}
            <MatchHeadToHead detail={detail} />
          </>
        )}
      </div>

    </DashboardShell>
  );
}
