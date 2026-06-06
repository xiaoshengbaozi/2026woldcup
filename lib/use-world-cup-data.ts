"use client";

import { useEffect, useMemo, useState } from "react";
import { extractCity, getTournamentProgress, parseCalendar } from "@/lib/calendar";
import { parseTeams } from "@/lib/teams";
import { fetchWorldCupFixtures, fetchWorldCupWarmupFixtures } from "@/lib/world-cup-api";
import type { Match } from "@/types/match";

export function useWorldCupData() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [warmupMatches, setWarmupMatches] = useState<Match[]>([]);
  const [activeCity, setActiveCity] = useState("全部城市");
  const [calendarUrl, setCalendarUrl] = useState("calendar.ics");
  const [loading, setLoading] = useState(true);
  const [warmupLoading, setWarmupLoading] = useState(true);
  const [error, setError] = useState("");
  const [warmupError, setWarmupError] = useState("");

  useEffect(() => {
    setCalendarUrl(new URL("/calendar.ics", window.location.href).href);

    let active = true;

    async function loadMatches() {
      let calendarMatches: Match[] = [];

      try {
        const response = await fetch("/calendar.ics");
        if (!response.ok) throw new Error("calendar fetch failed");
        const text = await response.text();
        calendarMatches = parseCalendar(text);
      } catch {
        if (active) setError("赛程同步失败，请直接下载日历文件。");
      }

      try {
        const liveMatches = await fetchWorldCupFixtures();
        if (!active) return;
        if (liveMatches.length) {
          setMatches(mergeCalendarWithLiveFixtures(calendarMatches, liveMatches));
          setError("");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[WorldCupData] API-Football normalized fixtures unavailable, falling back to calendar:", err);
      }

      if (calendarMatches.length) {
        if (!active) return;
        setMatches(calendarMatches);
        setError("");
      }

      if (active) setLoading(false);
    }

    void loadMatches();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWarmups() {
      try {
        const warmups = await fetchWorldCupWarmupFixtures();
        if (!active) return;
        setWarmupMatches(warmups);
        setWarmupError("");
      } catch (err) {
        console.warn("[WorldCupData] warmup fixtures unavailable:", err);
        if (active) setWarmupError("热身赛同步失败，请稍后重试。");
      } finally {
        if (active) setWarmupLoading(false);
      }
    }

    void loadWarmups();

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => {
    const values = matches
      .map((match) => extractCity(match.location))
      .filter(Boolean);

    return ["全部城市", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [matches]);

  const matchStats = useMemo(() => {
    const now = Date.now();
    let completed = 0;
    let ongoing = 0;

    for (const match of matches) {
      const started = match.start.getTime() <= now;
      const ended = (match.end || match.start).getTime() < now;

      if (ended) {
        completed++;
      } else if (started) {
        ongoing++;
      }
    }

    return { completedCount: completed, ongoingCount: ongoing };
  }, [matches]);

  return {
    matches,
    warmupMatches,
    activeCity,
    setActiveCity,
    calendarUrl,
    webcalUrl: calendarUrl.replace(/^https?:/, "webcal:"),
    cities,
    firstMatch: matches[0] ?? null,
    progress: getTournamentProgress(matches),
    completedCount: matchStats.completedCount,
    ongoingCount: matchStats.ongoingCount,
    loading,
    warmupLoading,
    error,
    warmupError
  };
}

export function mergeCalendarWithLiveFixtures(calendarMatches: Match[], liveMatches: Match[]) {
  if (!calendarMatches.length) return liveMatches;

  const liveByIdentity = new Map(liveMatches.map((match) => [getMatchIdentity(match), match]));
  const usedLiveIds = new Set<string>();

  const merged = calendarMatches.map((calendarMatch) => {
    const liveMatch = liveByIdentity.get(getMatchIdentity(calendarMatch));
    if (!liveMatch) return calendarMatch;

    usedLiveIds.add(liveMatch.uid);

    return {
      ...calendarMatch,
      ...liveMatch,
      location: mergeMatchLocation(calendarMatch.location, liveMatch.location),
      stage: calendarMatch.stage,
      weather: liveMatch.weather || calendarMatch.weather,
      geo: liveMatch.geo || calendarMatch.geo,
    };
  });

  const unmatchedLive = liveMatches.filter((match) => !usedLiveIds.has(match.uid));
  return [...merged, ...unmatchedLive].sort((a, b) => a.start.getTime() - b.start.getTime());
}

function mergeMatchLocation(calendarLocation: string, liveLocation: string) {
  if (!liveLocation) return calendarLocation;
  if (hasExplicitCity(liveLocation)) return liveLocation;

  const city = extractCity(calendarLocation);
  if (!city || city === calendarLocation) return liveLocation;
  return `${liveLocation} · ${city}`;
}

function hasExplicitCity(location: string) {
  return (
    location.includes("·") ||
    /（[^）]+）/.test(location) ||
    location.split(",").length > 1
  );
}

function getMatchIdentity(match: Match) {
  const teams = parseTeams(match.summary);
  return [
    match.start.getTime(),
    normalizeTeamName(teams.home.name),
    normalizeTeamName(teams.away.name),
  ].join("|");
}

function normalizeTeamName(name: string) {
  const normalized = name.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  if (normalized === "刚果金") return "刚果民主共和国";
  return normalized;
}


