"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LiveMatchesStrip } from "@/components/live-matches-strip";
import { getCityFilterGroup, getStageFilterGroup, MatchFilters, readFilterGroupValue } from "@/components/match-filters";
import { MatchStats } from "@/components/match-stats";
import { MobileLiveMatchesEntry } from "@/components/mobile-live-matches-entry";
import { MobileMatchDayStrip, type MatchDayOption } from "@/components/mobile-match-day-strip";
import { ScheduleList } from "@/components/schedule-list";
import { extractCity, groupMatchesByDay } from "@/lib/calendar";
import { getStageGroupId } from "@/lib/stage";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export type ScheduleLayout = "default" | "waterfall" | "topology" | "calendar";

export default function MatchesPage() {
  const { matches, activeCity, setActiveCity, cities, loading, error } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [layout, setLayout] = useState<ScheduleLayout>("default");
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const requestedLayout = new URLSearchParams(window.location.search).get("layout");
    if (requestedLayout === "calendar") setLayout("calendar");
  }, []);

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
        (activeCity === "全部城市" || (cityGroup ? getCityFilterGroup(city) === cityGroup : city === activeCity)) &&
        (!selectedDay || getMatchDayKey(match.start, timezoneOffset) === selectedDay)
      );
    });
  }, [activeCity, matches, query, selectedDay, stage, timezoneOffset]);

  const grouped = useMemo(() => groupMatchesByDay(filteredMatches), [filteredMatches]);
  const matchDays = useMemo(
    () => buildMatchDayOptions(matches, timezoneOffset),
    [matches, timezoneOffset]
  );

  useEffect(() => {
    if (selectedDay && !matchDays.some((day) => day.key === selectedDay)) setSelectedDay("");
  }, [matchDays, selectedDay]);

  const totalMatchDays = new Set(matches.map((match) => match.start.toDateString())).size;

  const totalTeams = 48;
  const now = Date.now();

  const totalCities = useMemo(
    () => new Set(matches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [matches]
  );

  const filteredCities = useMemo(
    () => new Set(filteredMatches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [filteredMatches]
  );

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
        visibleCities={filteredCities}
        totalCities={totalCities}
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

      <MobileMatchDayStrip
        days={matchDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />
      <MobileLiveMatchesEntry matches={matches} />

      <ScheduleList
        grouped={grouped}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && !filteredMatches.length}
        timezoneOffset={timezoneOffset}
        layout={layout}
        matchesForRoundLabels={matches}
      />
    </DashboardShell>
  );
}

function buildMatchDayOptions(matches: { start: Date }[], timezoneOffset: number): MatchDayOption[] {
  const byDay = new Map<string, { date: Date; count: number }>();

  for (const match of matches) {
    const adjusted = getAdjustedDate(match.start, timezoneOffset);
    const key = formatDayKey(adjusted);
    const current = byDay.get(key);
    byDay.set(key, {
      date: current?.date ?? adjusted,
      count: (current?.count ?? 0) + 1
    });
  }

  return [...byDay.entries()]
    .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
    .map(([key, item]) => ({
      key,
      weekday: item.date.toLocaleDateString("en-US", { weekday: "short" }),
      day: String(item.date.getDate()).padStart(2, "0"),
      month: item.date.toLocaleDateString("en-US", { month: "short" }),
      count: item.count
    }));
}

function getMatchDayKey(date: Date, timezoneOffset: number) {
  return formatDayKey(getAdjustedDate(date, timezoneOffset));
}

function getAdjustedDate(date: Date, timezoneOffset: number) {
  return new Date(date.getTime() + timezoneOffset * 3600000);
}

function formatDayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
