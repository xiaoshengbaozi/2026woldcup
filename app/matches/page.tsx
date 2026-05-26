"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MatchFilters } from "@/components/match-filters";
import { MatchStats } from "@/components/match-stats";
import { ScheduleList } from "@/components/schedule-list";
import { groupMatchesByDay } from "@/lib/calendar";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export default function MatchesPage() {
  const { matches, activeCity, setActiveCity, cities, loading, error } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);

  const stages = useMemo(
    () => [...new Set(matches.map((match) => match.stage))],
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return matches.filter((match) => {
      const city = match.location.split(",").slice(-1)[0]?.trim();
      const haystack = [match.summary, match.location, match.description, match.stage]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (!stage || match.stage === stage) &&
        (activeCity === "全部城市" || city === activeCity)
      );
    });
  }, [activeCity, matches, query, stage]);

  const grouped = useMemo(() => groupMatchesByDay(filteredMatches), [filteredMatches]);

  const totalMatchDays = new Set(matches.map((match) => match.start.toDateString())).size;

  const totalTeams = 48;
  const now = Date.now();

  const remainingMatchDays = new Set(
    matches.filter((m) => m.start.getTime() > now).map((m) => m.start.toDateString())
  ).size;

  const stageTeamCount = useMemo(() => {
    if (!stage) return totalTeams;
    if (/Group [A-L]$/.test(stage)) return totalTeams;
    if (stage.includes("1/16")) return 32;
    if (stage.includes("1/8")) return 16;
    if (stage.includes("1/4")) return 8;
    if (stage.includes("半决赛")) return 4;
    if (stage.includes("决赛")) return 2;
    return totalTeams;
  }, [stage, totalTeams]);

  return (
    <DashboardShell>
      <MatchStats
        totalMatches={matches.length}
        visible={filteredMatches.length}
        totalMatchDays={totalMatchDays}
        remainingMatchDays={remainingMatchDays}
        activeTeamCount={stageTeamCount}
        totalTeamCount={totalTeams}
      />

      <MatchFilters
        query={query}
        stage={stage}
        stages={stages}
        activeCity={activeCity}
        cities={cities}
        timezoneOffset={timezoneOffset}
        onQueryChange={setQuery}
        onStageChange={setStage}
        onCityChange={setActiveCity}
        onTimezoneChange={setTimezoneOffset}
      />

      <ScheduleList
        grouped={grouped}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && !filteredMatches.length}
        timezoneOffset={timezoneOffset}
      />
    </DashboardShell>
  );
}
