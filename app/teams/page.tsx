"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { LiveMatchesStrip } from "@/components/live-matches-strip";
import { MatchStats } from "@/components/match-stats";
import { TeamsIndex } from "@/components/teams/teams-index";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { extractCity } from "@/lib/calendar";
import { useMemo } from "react";

export default function TeamsPage() {
  const { matches, warmupMatches } = useWorldCupData();
  const liveQueueMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  const totalMatchDays = useMemo(
    () => new Set(matches.map((m) => m.start.toDateString())).size,
    [matches]
  );

  const totalCities = useMemo(
    () => new Set(matches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [matches]
  );

  return (
    <DashboardShell>
      <LiveMatchesStrip matches={liveQueueMatches} />
      <MatchStats
        totalMatches={104}
        visible={104}
        totalMatchDays={totalMatchDays}
        remainingMatchDays={totalMatchDays}
        activeTeamCount={48}
        totalTeamCount={48}
        visibleCities={totalCities}
        totalCities={totalCities}
      />
      <TeamsIndex />
    </DashboardShell>
  );
}
