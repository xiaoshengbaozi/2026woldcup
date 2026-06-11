"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { GroupStandings } from "@/components/group-standings";
import { WorldCupHero } from "@/components/world-cup-hero";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { useMemo } from "react";

export function HomeDashboard() {
  const {
    matches,
    warmupMatches,
    calendarUrl,
    webcalUrl,
    firstMatch,
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
        firstMatch={firstMatch}
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
