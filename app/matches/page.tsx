"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LiveMatchesStrip } from "@/components/live-matches-strip";
import { getCityFilterGroup, getStageFilterGroup, MatchFilters, readFilterGroupValue } from "@/components/match-filters";
import { MatchStats } from "@/components/match-stats";
import { ScheduleList } from "@/components/schedule-list";
import { extractCity, groupMatchesByDay } from "@/lib/calendar";
import { getStageGroupId } from "@/lib/stage";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export type ScheduleLayout = "default" | "waterfall" | "topology";

export default function MatchesPage() {
  const { matches, activeCity, setActiveCity, cities, loading, error } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [layout, setLayout] = useState<ScheduleLayout>("default");

  const stages = useMemo(
    () => [...new Set(matches.map((match) => match.stage))],
    [matches]
  );

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const stageGroup = readFilterGroupValue(stage);
    const cityGroup = readFilterGroupValue(activeCity);

    return matches.filter((match) => {
      const city = extractCity(match.location);
      const haystack = [match.summary, match.location, match.description, match.stage]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (!stage || (stageGroup ? getStageFilterGroup(match.stage) === stageGroup : match.stage === stage)) &&
        (activeCity === "全部城市" || (cityGroup ? getCityFilterGroup(city) === cityGroup : city === activeCity))
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
    const stageGroup = readFilterGroupValue(stage);
    if (stageGroup === "小组赛") return totalTeams;
    if (stageGroup === "淘汰赛") return 32;
    if (stageGroup === "决赛周") return 4;
    if (getStageGroupId(stage)) return totalTeams;
    if (stage.includes("1/16")) return 32;
    if (stage.includes("1/8")) return 16;
    if (stage.includes("1/4")) return 8;
    if (stage.includes("半决赛")) return 4;
    if (stage.includes("决赛")) return 2;
    return totalTeams;
  }, [stage, totalTeams]);

  return (
    <DashboardShell>
      <LiveMatchesStrip matches={matches} />

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
        layout={layout}
        onQueryChange={setQuery}
        onStageChange={setStage}
        onCityChange={setActiveCity}
        onTimezoneChange={setTimezoneOffset}
        onLayoutChange={setLayout}
      />

      <ScheduleList
        grouped={grouped}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && !filteredMatches.length}
        timezoneOffset={timezoneOffset}
        layout={layout}
      />
    </DashboardShell>
  );
}

