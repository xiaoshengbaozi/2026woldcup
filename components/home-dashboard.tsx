"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { WorldCupHero } from "@/components/world-cup-hero";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import dynamic from "next/dynamic";
import { useMemo } from "react";

const GroupStandings = dynamic(
  () => import("@/components/group-standings").then((mod) => mod.GroupStandings),
  {
    ssr: false,
    loading: () => (
      <section className="hero-card min-h-[360px] animate-pulse overflow-hidden px-3 py-4 sm:px-4" aria-hidden="true" />
    ),
  }
);

export function HomeDashboard() {
  const {
    matches,
    warmupMatches,
    calendarUrl,
    webcalUrl,
    progress,
    completedCount,
    ongoingCount
  } = useWorldCupData();
  const liveQueueMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  return (
    <DashboardShell>
      <WorldCupHero
        matches={liveQueueMatches}
        progress={progress}
        completedCount={completedCount}
        ongoingCount={ongoingCount}
        calendarUrl={calendarUrl}
        webcalUrl={webcalUrl}
        matchCount={matches.length}
      />
      <GroupStandings matches={matches} />
    </DashboardShell>
  );
}
