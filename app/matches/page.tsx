"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { LiveMatchesStrip } from "@/components/live-matches-strip";
import { getCityFilterGroup, getStageFilterGroup, MatchFilters, readFilterGroupValue } from "@/components/match-filters";
import { MatchStats } from "@/components/match-stats";
import { MobileMatchDayStrip, type MatchDayOption } from "@/components/mobile-match-day-strip";
import { ScheduleList } from "@/components/schedule-list";
import { extractCity, groupMatchesByDay } from "@/lib/calendar";
import { getStageGroupId } from "@/lib/stage";
import { useMobilePinnedRail } from "@/lib/use-mobile-pinned-rail";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export type ScheduleLayout = "default" | "waterfall" | "topology" | "calendar";
export type ScheduleMatchSource = "official" | "warmups";

const MOBILE_MATCH_RAIL_STICKY_OFFSET = 56;

export default function MatchesPage() {
  const { matches, warmupMatches, activeCity, setActiveCity, loading, warmupLoading, error, warmupError } = useWorldCupData();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const [timezoneOffset, setTimezoneOffset] = useState(0);
  const [layout, setLayout] = useState<ScheduleLayout>("default");
  const [matchSource, setMatchSource] = useState<ScheduleMatchSource>("official");
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

  const scheduleMatches = matchSource === "warmups" ? warmupMatches : matches;
  const scheduleLoading = matchSource === "warmups" ? warmupLoading : loading;
  const scheduleError = matchSource === "warmups" ? warmupError : error;
  const liveQueueMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  const stages = useMemo(
    () => [...new Set(scheduleMatches.map((match) => match.stage))],
    [scheduleMatches]
  );

  const cities = useMemo(() => {
    const values = scheduleMatches
      .map((match) => extractCity(match.location))
      .filter(Boolean);

    return ["全部城市", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [scheduleMatches]);

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const stageGroup = readFilterGroupValue(stage);
    const cityGroup = readFilterGroupValue(activeCity);

    return scheduleMatches.filter((match) => {
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
  }, [activeCity, query, scheduleMatches, selectedDay, stage, timezoneOffset]);

  const grouped = useMemo(() => groupMatchesByDay(filteredMatches), [filteredMatches]);
  const matchDays = useMemo(
    () => buildMatchDayOptions(scheduleMatches, timezoneOffset),
    [scheduleMatches, timezoneOffset]
  );

  useLayoutEffect(() => {
    if (selectedDay && !matchDays.some((day) => day.key === selectedDay)) setSelectedDay("");
  }, [matchDays, selectedDay]);

  useEffect(() => {
    setStage("");
    setSelectedDay("");
    setActiveCity("全部城市");
  }, [matchSource, setActiveCity]);

  useEffect(() => {
    if (!cities.includes(activeCity)) setActiveCity("全部城市");
  }, [activeCity, cities, setActiveCity]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", {
      detail: { pinned: isMobileRailPinned, height: mobileRailHeight + 12 }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [isMobileRailPinned, mobileRailHeight]);

  const totalMatchDays = new Set(scheduleMatches.map((match) => match.start.toDateString())).size;

  const totalTeams = 48;
  const now = Date.now();

  const totalCities = useMemo(
    () => new Set(scheduleMatches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [scheduleMatches]
  );

  const filteredCities = useMemo(
    () => new Set(filteredMatches.map((m) => extractCity(m.location)).filter(Boolean)).size,
    [filteredMatches]
  );

  const remainingMatchDays = new Set(
    scheduleMatches.filter((m) => m.start.getTime() > now).map((m) => m.start.toDateString())
  ).size;

  const visibleTeamCount = useMemo(() => {
    const teams = new Set<string>();
    for (const match of scheduleMatches) {
      if (match.homeTeam?.code || match.homeTeam?.name) teams.add(match.homeTeam.code || match.homeTeam.name);
      if (match.awayTeam?.code || match.awayTeam?.name) teams.add(match.awayTeam.code || match.awayTeam.name);
    }
    return teams.size;
  }, [scheduleMatches]);

  const scheduleTeamTotal = matchSource === "warmups" ? visibleTeamCount : totalTeams;

  const stageTeamCount = useMemo(() => {
    if (matchSource === "warmups") return visibleTeamCount;
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
  }, [matchSource, stage, totalTeams, visibleTeamCount]);

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
          matchSource={matchSource}
          stage={stage}
          stages={stages}
          activeCity={activeCity}
          cities={cities}
          timezoneOffset={timezoneOffset}
          layout={layout}
          onQueryChange={setQuery}
          onMatchSourceChange={setMatchSource}
          onStageChange={setStage}
          onCityChange={setActiveCity}
          onTimezoneChange={setTimezoneOffset}
          onLayoutChange={setLayout}
        />
      </div>

      <div className="-mt-3 sm:hidden">
        <div
          ref={mobileRailSentinelRef}
          data-mobile-match-rail-sentinel="true"
          style={{ height: isMobileRailPinned ? mobileRailHeight : 0 }}
        />
        <div
          ref={mobileRailRef}
          data-mobile-match-rail="true"
          className={`${
            isMobileRailPinned
              ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[75]"
              : "relative -mx-3 bg-black/58 backdrop-blur-2xl"
          } px-3 py-1.5`}
        >
          <div className="space-y-2">
            <MatchFilters
              query={query}
              matchSource={matchSource}
              stage={stage}
              stages={stages}
              activeCity={activeCity}
              cities={cities}
              timezoneOffset={timezoneOffset}
              layout={layout}
              onQueryChange={setQuery}
              onMatchSourceChange={setMatchSource}
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
