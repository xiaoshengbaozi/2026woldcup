"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractCity, getTournamentProgress, parseCalendar } from "@/lib/calendar";
import { hasMatchInLiveRefreshWindow } from "@/lib/live-match-queue";
import { parseTeams } from "@/lib/teams";
import { cachedText, fetchWithTimeout } from "@/lib/request-cache";
import { useNow } from "@/lib/use-now";
import {
  fetchWorldCupFixtures,
  fetchWorldCupStandings,
  fetchWorldCupWarmupFixtures,
  type NormalizedWorldCupStandingRow,
} from "@/lib/world-cup-api";
import type { Match, MatchTeamMeta } from "@/types/match";

const LIVE_FIXTURE_REFRESH_MS = 60_000;

export function useWorldCupData() {
  const currentTime = useNow(30_000);
  const [matches, setMatches] = useState<Match[]>([]);
  const [warmupMatches, setWarmupMatches] = useState<Match[]>([]);
  const [activeCity, setActiveCity] = useState("全部城市");
  const [calendarUrl, setCalendarUrl] = useState("calendar.ics");
  const [loading, setLoading] = useState(true);
  const [warmupLoading, setWarmupLoading] = useState(true);
  const [error, setError] = useState("");
  const [warmupError, setWarmupError] = useState("");
  const matchesRef = useRef<Match[]>([]);
  const warmupMatchesRef = useRef<Match[]>([]);

  useEffect(() => {
    setCalendarUrl(new URL("/calendar.ics", window.location.href).href);

    let active = true;

    async function loadMatches(forceRefresh = false) {
      let calendarMatches: Match[] = [];

      try {
        const text = await cachedText("calendar.ics", 60 * 60 * 1000, async () => {
          const response = await fetchWithTimeout("/calendar.ics", {}, 5_000);
          if (!response.ok) throw new Error("calendar fetch failed");
          return response.text();
        }, { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 });
        calendarMatches = parseCalendar(text);
        if (active && calendarMatches.length && !forceRefresh) {
          matchesRef.current = calendarMatches;
          setMatches(calendarMatches);
          setError("");
          setLoading(false);
        }
      } catch {
        if (active) setError("赛程同步失败，请直接下载日历文件。");
      }

      try {
        const liveMatches = await fetchWorldCupFixtures({ forceRefresh });
        if (!active) return;
        if (liveMatches.length) {
          const standings = await fetchWorldCupStandings().catch(() => []);
          const nextMatches = enrichKnockoutMatchesWithStandings(
            mergeCalendarWithLiveFixtures(calendarMatches, liveMatches),
            standings
          );
          matchesRef.current = nextMatches;
          setMatches(nextMatches);
          setError("");
          setLoading(false);
          if (!forceRefresh && hasMatchInLiveRefreshWindow(nextMatches, Date.now())) {
            void loadMatches(true);
          }
          return;
        }
      } catch (err) {
        console.warn("[WorldCupData] API-Football normalized fixtures unavailable, falling back to calendar:", err);
        if (forceRefresh) return;
      }

      if (calendarMatches.length) {
        if (!active) return;
        const standings = await fetchWorldCupStandings().catch(() => []);
        const nextMatches = enrichKnockoutMatchesWithStandings(calendarMatches, standings);
        matchesRef.current = nextMatches;
        setMatches(nextMatches);
        setError("");
        if (!forceRefresh && hasMatchInLiveRefreshWindow(nextMatches, Date.now())) {
          void loadMatches(true);
        }
      }

      if (active) setLoading(false);
    }

    void loadMatches();
    const refreshId = window.setInterval(() => {
      if (hasMatchInLiveRefreshWindow(matchesRef.current, Date.now())) {
        void loadMatches(true);
      }
    }, LIVE_FIXTURE_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWarmups(forceRefresh = false) {
      try {
        const warmups = await fetchWorldCupWarmupFixtures({ forceRefresh });
        if (!active) return;
        warmupMatchesRef.current = warmups;
        setWarmupMatches(warmups);
        setWarmupError("");
        if (!forceRefresh && hasMatchInLiveRefreshWindow(warmups, Date.now())) {
          void loadWarmups(true);
        }
      } catch (err) {
        console.warn("[WorldCupData] warmup fixtures unavailable:", err);
        if (active) setWarmupError("热身赛同步失败，请稍后重试。");
      } finally {
        if (active) setWarmupLoading(false);
      }
    }

    const startWarmups = () => void loadWarmups();
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(startWarmups, { timeout: 2_500 });
    } else {
      timeoutId = setTimeout(startWarmups, 1_200);
    }

    const refreshId = window.setInterval(() => {
      if (hasMatchInLiveRefreshWindow(warmupMatchesRef.current, Date.now())) {
        void loadWarmups(true);
      }
    }, LIVE_FIXTURE_REFRESH_MS);

    return () => {
      active = false;
      if (idleId !== null) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.clearInterval(refreshId);
    };
  }, []);

  const cities = useMemo(() => {
    const values = matches
      .map((match) => extractCity(match.location))
      .filter(Boolean);

    return ["全部城市", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [matches]);

  const matchStats = useMemo(() => {
    const now = currentTime > 0 ? currentTime : 0;
    let completed = 0;
    let ongoing = 0;

    if (!now) return { completedCount: completed, ongoingCount: ongoing };

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
  }, [currentTime, matches]);

  const progress = useMemo(
    () => (currentTime > 0 ? getTournamentProgress(matches, currentTime) : 0),
    [currentTime, matches]
  );

  return {
    matches,
    warmupMatches,
    activeCity,
    setActiveCity,
    calendarUrl,
    webcalUrl: calendarUrl.replace(/^https?:/, "webcal:"),
    cities,
    firstMatch: matches[0] ?? null,
    progress,
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

export function enrichKnockoutMatchesWithStandings(
  matches: Match[],
  standings: NormalizedWorldCupStandingRow[]
) {
  if (!standings.length) return matches;

  const slotIndex = buildGroupSlotIndex(standings);
  if (!slotIndex.size) return matches;

  return matches.map((match) => {
    if (!isFirstKnockoutRound(match)) return match;

    const resolved = resolveKnockoutSummary(match.summary, slotIndex);
    if (!resolved) return match;

    return {
      ...match,
      summary: resolved.summary,
      homeTeam: resolved.homeTeam ?? match.homeTeam,
      awayTeam: resolved.awayTeam ?? match.awayTeam,
    };
  });
}

function buildGroupSlotIndex(standings: NormalizedWorldCupStandingRow[]) {
  const slots = new Map<string, MatchTeamMeta>();

  for (const row of standings) {
    const groupId = getStandingGroupId(row.group);
    if (!groupId || row.rank > 2 || !row.description) continue;
    slots.set(`${groupId}:${row.rank}`, {
      id: row.team.id,
      name: row.team.name,
      englishName: row.team.englishName,
      code: row.team.code,
      logo: row.team.logo,
    });
  }

  return slots;
}

function isFirstKnockoutRound(match: Match) {
  return match.stage.includes("1/16") || match.summary.includes("1/16");
}

function resolveKnockoutSummary(summary: string, slots: Map<string, MatchTeamMeta>) {
  const match = summary.match(/^(.*?)([^()]+?)\s+vs\s+([^()]+?)(\s*\([^)]+\)\s*)$/i);
  if (!match) return null;

  const [, prefix, homeSlot, awaySlot, suffix] = match;
  const homeTeam = resolveGroupSlot(homeSlot, slots);
  const awayTeam = resolveGroupSlot(awaySlot, slots);
  if (!homeTeam && !awayTeam) return null;

  const nextHome = homeTeam?.name ?? homeSlot.trim();
  const nextAway = awayTeam?.name ?? awaySlot.trim();

  return {
    summary: `${prefix}${nextHome} vs ${nextAway}${suffix}`,
    homeTeam,
    awayTeam,
  };
}

function resolveGroupSlot(value: string, slots: Map<string, MatchTeamMeta>) {
  const match = value.trim().match(/^([A-L])组第([12])$/i);
  if (!match) return null;
  return slots.get(`${match[1].toUpperCase()}:${match[2]}`) ?? null;
}

function getStandingGroupId(group: string) {
  return group.match(/([A-L])\s*组/i)?.[1]?.toUpperCase() ?? null;
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


