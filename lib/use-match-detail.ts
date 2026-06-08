"use client";

import { useEffect, useMemo, useState } from "react";
import { findMatchBySlug } from "@/lib/match-detail";
import { localizePlayerDisplayName } from "@/lib/football-localization-client";
import { getEffectiveMatchStatus } from "@/lib/match-status";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import { parseTeams } from "@/lib/teams";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import { fetchWorldCupHeadToHead } from "@/lib/world-cup-head-to-head";
import {
  fetchWorldCupMatchDetail,
  type WorldCupFixtureEvent,
  type WorldCupFixtureLineup,
  type WorldCupFixtureLineupPlayer,
  type WorldCupFixtureStats,
  type WorldCupMatchDetailPayload,
} from "@/lib/world-cup-match-detail";
import { fetchWorldCupSquadDetails, type WorldCupSquadDetail } from "@/lib/world-cup-squads";
import type {
  HeadToHeadMatch,
  LineupPlayer,
  Match,
  MatchDetail,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  MatchStats,
  MatchTeamMeta,
  PlayerPosition,
} from "@/types/match";

export function useMatchDetail(slug: string): {
  detail: MatchDetail | null;
  loading: boolean;
  error: string | null;
} {
  const { matches, warmupMatches, loading, warmupLoading, error, warmupError } = useWorldCupData();
  const [remoteSquads, setRemoteSquads] = useState<Map<number, WorldCupSquadDetail> | null>(null);
  const [remoteHeadToHead, setRemoteHeadToHead] = useState<HeadToHeadMatch[] | null>(null);
  const [remoteMatchDetail, setRemoteMatchDetail] = useState<WorldCupMatchDetailPayload | null>(null);
  const isWarmupSlug = slug.startsWith("warmup-");
  const lookupMatches = isWarmupSlug ? warmupMatches : matches;
  const lookupLoading = isWarmupSlug ? warmupLoading : loading;
  const lookupError = isWarmupSlug ? warmupError : error;

  const match = useMemo(() => {
    if (lookupLoading || lookupError || !lookupMatches.length) return null;
    return findMatchBySlug(lookupMatches, slug) ?? null;
  }, [lookupError, lookupLoading, lookupMatches, slug]);

  const roundLabels = useMemo(() => buildMatchRoundLabels(lookupMatches), [lookupMatches]);

  useEffect(() => {
    let active = true;
    setRemoteSquads(null);

    const teamIds = [match?.homeTeam?.id, match?.awayTeam?.id].filter(
      (id): id is number => typeof id === "number" && id > 0
    );

    if (!teamIds.length) return;

    fetchWorldCupSquadDetails(teamIds)
      .then((squads) => {
        if (active) setRemoteSquads(squads);
      })
      .catch((err) => {
        console.warn("[MatchDetail] World Cup squads unavailable:", err);
      });

    return () => {
      active = false;
    };
  }, [match?.awayTeam?.id, match?.homeTeam?.id]);

  useEffect(() => {
    let active = true;
    setRemoteMatchDetail(null);

    if (!match?.apiFixtureId) return;

    fetchWorldCupMatchDetail(match.apiFixtureId)
      .then((detail) => {
        if (active) setRemoteMatchDetail(detail);
      })
      .catch((err) => {
        console.warn("[MatchDetail] live match detail unavailable:", err);
      });

    return () => {
      active = false;
    };
  }, [match?.apiFixtureId]);

  useEffect(() => {
    let active = true;
    setRemoteHeadToHead(null);

    if (!match?.homeTeam || !match.awayTeam) return;

    fetchWorldCupHeadToHead(match.homeTeam, match.awayTeam)
      .then((items) => {
        if (active) setRemoteHeadToHead(items);
      })
      .catch((err) => {
        console.warn("[MatchDetail] Head-to-head unavailable:", err);
      });

    return () => {
      active = false;
    };
  }, [match?.awayTeam, match?.homeTeam]);

  const detail = useMemo(() => {
    if (!match) return null;

    const enriched = buildRealMatchDetail(match, slug, remoteMatchDetail);
    const roundLabel = roundLabels.get(match.uid);
    if (roundLabel) enriched.match = { ...enriched.match, stage: roundLabel };

    const homeSquad = match.homeTeam?.id ? remoteSquads?.get(match.homeTeam.id) : null;
    const awaySquad = match.awayTeam?.id ? remoteSquads?.get(match.awayTeam.id) : null;

    if (!hasConfirmedLineup(enriched.homeLineup) && match.homeTeam?.id) {
      enriched.homeLineup = squadToLineup(homeSquad);
    }

    if (!hasConfirmedLineup(enriched.awayLineup) && match.awayTeam?.id) {
      enriched.awayLineup = squadToLineup(awaySquad);
    }

    enriched.headToHead = match.homeTeam?.id && match.awayTeam?.id ? remoteHeadToHead ?? [] : [];
    return enriched;
  }, [match, remoteHeadToHead, remoteMatchDetail, remoteSquads, roundLabels, slug]);

  return {
    detail,
    loading: lookupLoading,
    error: lookupError || (!lookupLoading && !detail && lookupMatches.length > 0 ? "未找到该比赛" : null),
  };
}

const EMPTY_STATS: MatchStats = {
  possession: [0, 0],
  shots: [0, 0],
  shotsOnTarget: [0, 0],
  xG: [0, 0],
  passAccuracy: [0, 0],
  corners: [0, 0],
  fouls: [0, 0],
  yellowCards: [0, 0],
  redCards: [0, 0],
  offsides: [0, 0],
};

function buildRealMatchDetail(match: Match, slug: string, remote: WorldCupMatchDetailPayload | null): MatchDetail {
  const fixture = remote?.fixture;
  const mergedStatus = getEffectiveMatchStatus(match, fixture?.status ?? match.status);
  const mergedMatch = fixture
    ? {
        ...match,
        status: mergedStatus,
        statusLabel: mergedStatus === "finished" ? "已结束" : fixture.statusLabel,
        elapsed: fixture.elapsed,
        score: fixture.score,
      }
    : {
        ...match,
        status: mergedStatus,
        statusLabel: mergedStatus === "finished" ? "已结束" : match.statusLabel,
      };

  const teams = parseTeams(match.summary);

  return {
    match: mergedMatch,
    slug,
    homeTeamCode: match.homeTeam?.code || teams.home.badge || "",
    awayTeamCode: match.awayTeam?.code || teams.away.badge || "",
    status: toDetailStatus(mergedStatus, mergedMatch),
    score: {
      home: fixture?.score?.home ?? match.score?.home ?? 0,
      away: fixture?.score?.away ?? match.score?.away ?? 0,
    },
    odds: { homeWin: 0, draw: 0, awayWin: 0, history: [] },
    homeLineup: findTeamLineup(remote?.lineups ?? [], match.homeTeam) ?? emptyLineup("官方阵容待公布"),
    awayLineup: findTeamLineup(remote?.lineups ?? [], match.awayTeam) ?? emptyLineup("官方阵容待公布"),
    events: toMatchEvents(remote?.events ?? [], match.homeTeam, match.awayTeam),
    stats: toMatchStats(remote?.stats ?? [], match.homeTeam, match.awayTeam),
    news: [],
    headToHead: [],
  };
}

function squadToLineup(squad: WorldCupSquadDetail | null | undefined): MatchLineup {
  return {
    formation: squad?.officialWorldCupSquad ? "FIFA 官方最终名单" : "FIFA 官方名单待录入",
    players: squad?.players ?? [],
    listType: squad?.listType ?? "squad_pool",
    officialWorldCupSquad: Boolean(squad?.officialWorldCupSquad),
    coach: squad?.coach ?? null,
  };
}

function hasConfirmedLineup(lineup: MatchLineup) {
  return lineup.listType === "confirmed_lineup" && lineup.players.some((player) => player.isStarter);
}

function emptyLineup(formation: string): MatchLineup {
  return {
    formation,
    players: [],
    listType: "squad_pool",
    officialWorldCupSquad: false,
    coach: null,
  };
}

function findTeamLineup(lineups: WorldCupFixtureLineup[], team?: MatchTeamMeta): MatchLineup | null {
  if (!team) return null;
  const lineup = lineups.find((item) => sameTeam(item.team, team));
  if (!lineup || !lineup.startXI.length) return null;

  return {
    formation: lineup.formation || "官方阵容",
    players: [
      ...lineup.startXI.map((player, index) => toLineupPlayer(player, team, true, index)),
      ...lineup.substitutes.map((player, index) => toLineupPlayer(player, team, false, index)),
    ],
    listType: "confirmed_lineup",
    officialWorldCupSquad: true,
    coach: lineup.coach || null,
  };
}

function toLineupPlayer(
  player: WorldCupFixtureLineupPlayer,
  team: MatchTeamMeta,
  isStarter: boolean,
  index: number
): LineupPlayer {
  return {
    id: String(player.id ?? `${team.code}-${isStarter ? "xi" : "sub"}-${index}`),
    name: player.name || "待更新",
    number: player.number,
    position: toPlayerPosition(player.position),
    grid: player.grid ?? null,
    positionCn: player.position || undefined,
    isStarter,
    country: team.code,
    club: "",
    age: 0,
  };
}

function toMatchEvents(events: WorldCupFixtureEvent[], home?: MatchTeamMeta, away?: MatchTeamMeta): MatchEvent[] {
  return events
    .map<MatchEvent | null>((event, index) => {
      const team = sameTeam(event.team, home) ? "home" : sameTeam(event.team, away) ? "away" : null;
      if (!team) return null;

      const item: MatchEvent = {
        id: event.id || `${event.minute}-${index}`,
        minute: event.minute,
        addedTime: event.addedTime ?? undefined,
        type: toEventType(event.type, event.detail),
        player: localizePlayerDisplayName(event.player) || undefined,
        playerOut: localizePlayerDisplayName(event.assist) || undefined,
        team,
        description: [event.detail, event.comments].filter(Boolean).join(" · ") || undefined,
      };
      return item;
    })
    .filter((event): event is MatchEvent => Boolean(event));
}

function toEventType(type: string, detail: string): MatchEventType {
  const value = `${type} ${detail}`.toLowerCase();
  if (value.includes("own")) return "own_goal";
  if (value.includes("missed penalty")) return "missed_penalty";
  if (value.includes("penalty") || value.includes("点球")) return "penalty_goal";
  if (value.includes("goal") || value.includes("进球")) return "goal";
  if (value.includes("red") || value.includes("红牌")) return "red_card";
  if (value.includes("yellow") || value.includes("黄牌")) return "yellow_card";
  if (value.includes("subst") || value.includes("换人")) return "substitution";
  if (value.includes("var")) return "var_review";
  return "kickoff";
}

function toMatchStats(stats: WorldCupFixtureStats[], home?: MatchTeamMeta, away?: MatchTeamMeta): MatchStats {
  const homeStats = stats.find((item) => sameTeam(item.team, home));
  const awayStats = stats.find((item) => sameTeam(item.team, away));
  if (!homeStats && !awayStats) return EMPTY_STATS;

  const possessionHome = readStat(homeStats, ["Ball Possession", "控球率"]);
  const possessionAway = readStat(awayStats, ["Ball Possession", "控球率"]);
  const normalizedPossession = normalizeSplitPercentage(possessionHome, possessionAway);

  return {
    possession: normalizedPossession,
    shots: [readStat(homeStats, ["Total Shots", "射门"]), readStat(awayStats, ["Total Shots", "射门"])],
    shotsOnTarget: [readStat(homeStats, ["Shots on Goal", "射正"]), readStat(awayStats, ["Shots on Goal", "射正"])],
    xG: [0, 0],
    passAccuracy: [readStat(homeStats, ["Passes %", "传球成功率"]), readStat(awayStats, ["Passes %", "传球成功率"])],
    corners: [readStat(homeStats, ["Corner Kicks", "角球"]), readStat(awayStats, ["Corner Kicks", "角球"])],
    fouls: [readStat(homeStats, ["Fouls", "犯规"]), readStat(awayStats, ["Fouls", "犯规"])],
    yellowCards: [readStat(homeStats, ["Yellow Cards", "黄牌"]), readStat(awayStats, ["Yellow Cards", "黄牌"])],
    redCards: [readStat(homeStats, ["Red Cards", "红牌"]), readStat(awayStats, ["Red Cards", "红牌"])],
    offsides: [readStat(homeStats, ["Offsides", "越位"]), readStat(awayStats, ["Offsides", "越位"])],
  };
}

function readStat(stats: WorldCupFixtureStats | undefined, labels: string[]) {
  if (!stats) return 0;
  const item = stats.statistics.find((stat) => labels.some((label) => normalizeLabel(stat.type).includes(normalizeLabel(label))));
  return parseStatValue(item?.value);
}

function parseStatValue(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSplitPercentage(home: number, away: number): [number, number] {
  if (home <= 0 && away <= 0) return [0, 0];
  if (home > 0 && away > 0) {
    const total = home + away;
    const normalizedHome = Math.round((home / total) * 100);
    return [normalizedHome, 100 - normalizedHome];
  }
  const clampedHome = Math.max(0, Math.min(100, Math.round(home || 100 - away)));
  return [clampedHome, 100 - clampedHome];
}

function toDetailStatus(status: Match["status"] | undefined, match: Match): MatchDetail["status"] {
  if (status === "not_started" || status === "live" || status === "halftime" || status === "finished") return status;
  const now = Date.now();
  if (match.end && match.end.getTime() < now) return "finished";
  if (match.start.getTime() <= now) return "live";
  return "not_started";
}

function toPlayerPosition(position: string): PlayerPosition {
  const normalized = position.toLowerCase();
  if (normalized.includes("goal") || normalized.includes("keeper") || normalized.includes("门将")) return "GK";
  if (normalized.includes("back") || normalized.includes("def") || normalized.includes("后卫")) return "CB";
  if (normalized.includes("wing") || normalized.includes("att") || normalized.includes("forward") || normalized.includes("前锋")) return "ST";
  return "CM";
}

function sameTeam(left?: MatchTeamMeta, right?: MatchTeamMeta) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;
  if (left.code && right.code && left.code === right.code) return true;
  return normalizeLabel(left.name || left.englishName) === normalizeLabel(right.name || right.englishName);
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}
