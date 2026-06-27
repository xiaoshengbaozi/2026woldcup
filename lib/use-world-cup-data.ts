"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { extractCity, getTournamentProgress, parseCalendar } from "@/lib/calendar";
import { hasMatchInLiveRefreshWindow } from "@/lib/live-match-queue";
import { parseTeams } from "@/lib/teams";
import { cachedText, fetchWithTimeout } from "@/lib/request-cache";
import { getStageKind } from "@/lib/stage";
import { useNow } from "@/lib/use-now";
import { GROUPS } from "@/data/world-cup-2026-groups";
import {
  fetchWorldCupFixtures,
  fetchWorldCupStandings,
  fetchWorldCupWarmupFixtures,
  type NormalizedWorldCupStandingRow,
} from "@/lib/world-cup-api";
import type { Match, MatchTeamMeta } from "@/types/match";

const LIVE_FIXTURE_REFRESH_MS = 60_000;

type ThirdPlaceRanking = {
  groupId: string;
  team: MatchTeamMeta;
  points: number;
  goalsDiff: number;
  goalsFor: number;
};

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
  const liveByStartStage = new Map(liveMatches.map((match) => [getMatchStartStageIdentity(match), match]));
  const usedLiveIds = new Set<string>();

  const merged = calendarMatches.map((calendarMatch) => {
    const exactMatch = liveByIdentity.get(getMatchIdentity(calendarMatch));
    const stageMatch =
      exactMatch ||
      (isPlaceholderKnockoutMatch(calendarMatch)
        ? liveByStartStage.get(getMatchStartStageIdentity(calendarMatch))
        : undefined);
    const liveMatch = stageMatch;
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
  const thirdPlaceRankings = buildThirdPlaceRankings(standings);
  if (!slotIndex.size && !thirdPlaceRankings.length) return matches;

  const usedThirdPlaceGroups = getConfirmedThirdPlaceGroups(matches, thirdPlaceRankings);

  return matches.map((match) => {
    if (!isFirstKnockoutRound(match)) return match;

    const resolved = resolveKnockoutSummary(match.summary, slotIndex, thirdPlaceRankings, usedThirdPlaceGroups);
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
  const rowsByGroup = groupStandingsById(standings);

  for (const group of GROUPS) {
    const groupRows = rowsByGroup.get(group.id) ?? [];
    const accepted = new Map<string, NormalizedWorldCupStandingRow>();

    for (const row of groupRows) {
      const code = normalizeStandingCode(row.team.code);
      if (!group.teams.some((team) => team.code === code) || accepted.has(code)) continue;
      accepted.set(code, row);
    }

    const officialRows = [...accepted.values()];
    if (!isGroupComplete(officialRows)) continue;

    const ordered = officialRows.sort((a, b) => a.rank - b.rank).slice(0, 3);
    for (const row of ordered) {
      const slot = `${group.id}:${row.rank}`;
      slots.set(slot, toMatchTeamMeta(row));
    }
  }

  return slots;
}

function buildThirdPlaceRankings(standings: NormalizedWorldCupStandingRow[]): ThirdPlaceRanking[] {
  const rowsByGroup = groupStandingsById(standings);

  return GROUPS.flatMap((group) => {
    const officialRows = (rowsByGroup.get(group.id) ?? [])
      .filter((row) => group.teams.some((team) => team.code === normalizeStandingCode(row.team.code)));
    if (!isGroupComplete(officialRows)) return [];

    return officialRows
      .filter((row) => row.rank === 3 && group.teams.some((team) => team.code === normalizeStandingCode(row.team.code)))
      .slice(0, 1)
      .map((row) => ({
        groupId: group.id,
        team: toMatchTeamMeta(row),
        points: row.points,
        goalsDiff: row.goalsDiff,
        goalsFor: row.goalsFor,
      }));
  })
    .sort((left, right) => {
      return (
        right.points - left.points ||
        right.goalsDiff - left.goalsDiff ||
        right.goalsFor - left.goalsFor ||
        left.groupId.localeCompare(right.groupId)
      );
    });
}

function getConfirmedThirdPlaceGroups(matches: Match[], thirdPlaceRankings: ThirdPlaceRanking[]) {
  const groups = new Set<string>();
  if (!thirdPlaceRankings.length) return groups;

  const thirdPlaceByTeamKey = new Map<string, string>();
  for (const row of thirdPlaceRankings) {
    getMatchTeamKeys(row.team).forEach((key) => thirdPlaceByTeamKey.set(key, row.groupId));
  }

  for (const match of matches) {
    if (!isFirstKnockoutRound(match) || isPlaceholderKnockoutMatch(match)) continue;

    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!team) continue;
      for (const key of getMatchTeamKeys(team)) {
        const groupId = thirdPlaceByTeamKey.get(key);
        if (groupId) groups.add(groupId);
      }
    }
  }

  return groups;
}

function getMatchTeamKeys(team: MatchTeamMeta) {
  return [team.code, team.englishName, team.name]
    .map(normalizeTeamName)
    .filter(Boolean);
}

function isGroupComplete(rows: NormalizedWorldCupStandingRow[]) {
  return rows.length >= 4 && rows.every((row) => row.played >= 3);
}

function groupStandingsById(standings: NormalizedWorldCupStandingRow[]) {
  return standings.reduce<Map<string, NormalizedWorldCupStandingRow[]>>((acc, row) => {
    const groupId = getStandingGroupId(row.group);
    if (!groupId) return acc;
    if (!acc.has(groupId)) acc.set(groupId, []);
    acc.get(groupId)?.push(row);
    return acc;
  }, new Map());
}

function toMatchTeamMeta(row: NormalizedWorldCupStandingRow): MatchTeamMeta {
  return {
    id: row.team.id,
    name: row.team.name,
    englishName: row.team.englishName,
    code: row.team.code,
    logo: row.team.logo,
  };
}

function normalizeStandingCode(code: string) {
  return code.trim().toUpperCase();
}

function isFirstKnockoutRound(match: Match) {
  return match.stage.includes("1/16") || match.summary.includes("1/16");
}

function resolveKnockoutSummary(
  summary: string,
  slots: Map<string, MatchTeamMeta>,
  thirdPlaceRankings: ThirdPlaceRanking[],
  usedThirdPlaceGroups: Set<string>
) {
  const match = summary.match(/^(.*?)([^()]+?)\s+vs\s+([^()]+?)(\s*\([^)]+\)\s*)$/i);
  if (!match) return null;

  const [, prefix, homeSlot, awaySlot, suffix] = match;
  const homeTeam = resolveKnockoutSlot(homeSlot, slots, thirdPlaceRankings, usedThirdPlaceGroups);
  const awayTeam = resolveKnockoutSlot(awaySlot, slots, thirdPlaceRankings, usedThirdPlaceGroups);
  if (!homeTeam && !awayTeam) return null;

  const nextHome = homeTeam?.name ?? homeSlot.trim();
  const nextAway = awayTeam?.name ?? awaySlot.trim();

  return {
    summary: `${prefix}${nextHome} vs ${nextAway}${suffix}`,
    homeTeam,
    awayTeam,
  };
}

function resolveKnockoutSlot(
  value: string,
  slots: Map<string, MatchTeamMeta>,
  thirdPlaceRankings: ThirdPlaceRanking[],
  usedThirdPlaceGroups: Set<string>
) {
  const direct = resolveGroupSlot(value, slots);
  if (direct) return direct;
  return resolveThirdPlaceSlot(value, thirdPlaceRankings, usedThirdPlaceGroups);
}

function resolveGroupSlot(value: string, slots: Map<string, MatchTeamMeta>) {
  const match = value.trim().match(/^([A-L])组第([123])$/i);
  if (!match) return null;
  return slots.get(`${match[1].toUpperCase()}:${match[2]}`) ?? null;
}

function resolveThirdPlaceSlot(
  value: string,
  thirdPlaceRankings: ThirdPlaceRanking[],
  usedThirdPlaceGroups: Set<string>
) {
  const match = value
    .trim()
    .match(/^小组第三\(([^)]+)\)$/i);
  if (!match) return null;

  const allowedGroups = match[1]
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const candidate = thirdPlaceRankings.find(
    (row) => allowedGroups.includes(row.groupId) && !usedThirdPlaceGroups.has(row.groupId)
  );
  if (!candidate) return null;

  usedThirdPlaceGroups.add(candidate.groupId);
  return candidate.team;
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

function getMatchStartStageIdentity(match: Match) {
  return [
    match.start.getTime(),
    getStageKind(match.stage, match.stageKind),
  ].join("|");
}

function isPlaceholderKnockoutMatch(match: Match) {
  const stageKind = getStageKind(match.stage, match.stageKind);
  if (!["r32", "r16", "qf", "sf", "third", "final"].includes(stageKind)) return false;

  const rawSummary = match.summary.toLowerCase();
  if (
    /[a-l]\s*组\s*第\s*[123]/i.test(match.summary) ||
    /小组第三|待定|胜者|负者|winner|runner-up|third/i.test(rawSummary)
  ) {
    return true;
  }

  const teams = parseTeams(match.summary);
  const values = [teams.home.name, teams.away.name].join(" ").toLowerCase();
  return (
    values.includes("组第") ||
    values.includes("待定") ||
    values.includes("winner") ||
    values.includes("runner-up") ||
    values.includes("third")
  );
}

function normalizeTeamName(name: string) {
  const normalized = name.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
  if (normalized === "刚果金") return "刚果民主共和国";
  return normalized;
}


