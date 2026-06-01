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
import { MatchNav, type MatchTab } from "@/components/match-detail/match-nav";

export function MatchDetailClient({ slug }: { slug: string }) {
  const { detail, loading, error } = useMatchDetail(slug);
  const [activeTab, setActiveTab] = useState<MatchTab>("lineup");

  if (loading) {
    return (
      <DashboardShell>
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
        <div className="hero-card p-12 text-center">
          <p className="text-xl text-white/60">{error || "Match not found"}</p>
          <a href="/matches/" className="mt-4 inline-block text-sm text-volt hover:underline">
            Back to schedule
          </a>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <MatchHero detail={detail} />
      <MatchNav active={activeTab} onTabChange={setActiveTab} />

      <div className="space-y-5">
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
