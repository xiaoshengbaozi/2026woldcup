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
import { MatchSeoContent } from "@/components/match-detail/match-seo-content";
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

  return (
    <DashboardShell>
      <MobileSecondaryPageActions
        backHref="/matches/"
        backLabel="返回赛程"
        reserveSpace
        rightAction={
          <UserActionButton
            kind="match"
            payload={favoritePayload}
            className="h-[34px] whitespace-nowrap px-3 text-[10px] shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-2xl"
          />
        }
      />
      <MatchHero detail={detail} />
      <div className="-mt-2 hidden justify-end lg:flex">
        <UserActionButton
          kind="match"
          payload={favoritePayload}
          className="h-9 px-4 text-[11px]"
        />
      </div>
      <MatchNav active={activeTab} onTabChange={setActiveTab} />

      <div className="space-y-5">
        {activeTab === "live" && <LivePlayer detail={detail} />}
        {activeTab === "odds" && <MatchOdds detail={detail} />}
        {activeTab === "lineup" && <MatchLineup detail={detail} />}
        {activeTab === "timeline" && (
          <>
            {detail.events.length > 0 && <MatchTimeline detail={detail} />}
            {detail.news.length > 0 && <MatchNews detail={detail} />}
          </>
        )}
        {activeTab === "stats" && (detail.status === "finished" || detail.status === "live") && (
          <MatchStatsPanel detail={detail} />
        )}
        {activeTab === "h2h" && <MatchHeadToHead detail={detail} />}
      </div>

      <MatchSeoContent detail={detail} />
    </DashboardShell>
  );
}
