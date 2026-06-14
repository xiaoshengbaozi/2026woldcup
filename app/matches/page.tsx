"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LiveMatchesStrip } from "@/components/live-matches-strip";
import { getCityFilterGroup, getStageFilterGroup, MatchFilters, readFilterGroupValue } from "@/components/match-filters";
import { MatchStats } from "@/components/match-stats";
import { MobileMatchDayStrip, type MatchDayOption } from "@/components/mobile-match-day-strip";
import { ScheduleList } from "@/components/schedule-list";
import { extractCity, groupMatchesByDay } from "@/lib/calendar";
import { getEffectiveMatchStatus } from "@/lib/match-status";
import { getStageGroupId } from "@/lib/stage";
import { useMobilePinnedRail } from "@/lib/use-mobile-pinned-rail";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export type ScheduleLayout = "default" | "waterfall" | "topology" | "calendar";
export type ScheduleCompletionFilter = "all" | "not_started";

const MOBILE_MATCH_RAIL_STICKY_OFFSET = 56;

export default function MatchesPage() {
  const { matches, warmupMatches, activeCity, setActiveCity, loading, error } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [layout, setLayout] = useState<ScheduleLayout>("default");
  const [completionFilter, setCompletionFilter] = useState<ScheduleCompletionFilter>("all");
  const [selectedDay, setSelectedDay] = useState("");
  const mobileRailSentinelRef = useRef<HTMLDivElement>(null);
  const mobileRailRef = useRef<HTMLDivElement>(null);
  const { pinned: isMobileRailPinned, height: mobileRailHeight } = useMobilePinnedRail(
    mobileRailSentinelRef,
    mobileRailRef,
    MOBILE_MATCH_RAIL_STICKY_OFFSET
  );

  useEffect(() => {
    const requestedLayout = new URLSearchParams(window.location.search).get("layout");
    if (requestedLayout === "calendar") setLayout("calendar");
  }, []);

  const scheduleMatches = matches;
  const scheduleLoading = loading;
  const scheduleError = error;
  const liveQueueMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  const completionFilteredMatches = useMemo(
    () => scheduleMatches.filter((match) => {
      if (completionFilter === "all") return true;
      return getEffectiveMatchStatus(match) === "not_started";
    }),
    [completionFilter, scheduleMatches]
  );

  const stages = useMemo(
    () => [...new Set(completionFilteredMatches.map((match) => match.stage))],
    [completionFilteredMatches]
  );

  const cities = useMemo(() => {
    const values = completionFilteredMatches
      .map((match) => extractCity(match.location))
      .filter(Boolean);

    return ["全部城市", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [completionFilteredMatches]);

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const stageGroup = readFilterGroupValue(stage);
    const cityGroup = readFilterGroupValue(activeCity);

    return completionFilteredMatches.filter((match) => {
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
  }, [activeCity, completionFilteredMatches, query, selectedDay, stage, timezoneOffset]);

  const grouped = useMemo(() => groupMatchesByDay(filteredMatches), [filteredMatches]);
  const matchDays = useMemo(
    () => buildMatchDayOptions(completionFilteredMatches, timezoneOffset),
    [completionFilteredMatches, timezoneOffset]
  );

  useEffect(() => {
    if (selectedDay && !matchDays.some((day) => day.key === selectedDay)) setSelectedDay("");
  }, [matchDays, selectedDay]);

  useEffect(() => {
    setStage("");
    setSelectedDay("");
    setActiveCity("全部城市");
  }, [completionFilter, setActiveCity]);

  useEffect(() => {
    if (!cities.includes(activeCity)) setActiveCity("全部城市");
  }, [activeCity, cities, setActiveCity]);

  const totalMatchDays = new Set(scheduleMatches.map((match) => match.start.toDateString())).size;

  const totalTeams = 48;

  const totalCities = useMemo(
    () => new Set(scheduleMatches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [scheduleMatches]
  );

  const filteredCities = useMemo(
    () => new Set(filteredMatches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [filteredMatches]
  );

  const remainingMatchDays = new Set(
    scheduleMatches.filter((m) => getEffectiveMatchStatus(m) !== "finished").map((m) => m.start.toDateString())
  ).size;

  const scheduleTeamTotal = totalTeams;

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
      <LiveMatchesStrip matches={liveQueueMatches} />

      <MatchStats
        totalMatches={scheduleMatches.length}
        visible={filteredMatches.length}
        totalMatchDays={totalMatchDays}
        remainingMatchDays={remainingMatchDays}
        activeTeamCount={stageTeamCount}
        totalTeamCount={scheduleTeamTotal}
        visibleCities={filteredCities}
        totalCities={totalCities}
      />

      <div className="hidden sm:block">
        <MatchFilters
          query={query}
          completionFilter={completionFilter}
          stage={stage}
          stages={stages}
          activeCity={activeCity}
          cities={cities}
          timezoneOffset={timezoneOffset}
          layout={layout}
          onQueryChange={setQuery}
          onCompletionFilterChange={setCompletionFilter}
          onStageChange={setStage}
          onCityChange={setActiveCity}
          onTimezoneChange={setTimezoneOffset}
          onLayoutChange={setLayout}
        />
      </div>

      <div className="-mt-3 sm:hidden">
        <div ref={mobileRailSentinelRef} data-mobile-match-rail-sentinel="true" className="h-px" />
        <div className="relative -mx-3" style={{ height: mobileRailHeight || undefined }}>
          <div
            ref={mobileRailRef}
            data-mobile-match-rail="true"
            className={`${
              isMobileRailPinned
                ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+3.5rem)]"
                : "absolute left-0 right-0 top-0"
            } z-[86] px-3 py-1.5 [backface-visibility:hidden] [transform:translateZ(0)]`}
          >
            <div className="space-y-2">
              <MatchFilters
                query={query}
                completionFilter={completionFilter}
                stage={stage}
                stages={stages}
                activeCity={activeCity}
                cities={cities}
                timezoneOffset={timezoneOffset}
                layout={layout}
                onQueryChange={setQuery}
                onCompletionFilterChange={setCompletionFilter}
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
            </div>
          </div>
        </div>
      </div>

      <ScheduleList
        grouped={grouped}
        loading={scheduleLoading}
        error={scheduleError}
        isEmpty={!scheduleLoading && !scheduleError && !filteredMatches.length}
        timezoneOffset={timezoneOffset}
        layout={layout}
        matchesForRoundLabels={scheduleMatches}
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
