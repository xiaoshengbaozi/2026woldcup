import { formatTime } from "@/lib/format";
import type { Match } from "@/types/match";

export type MatchLiveDisplay = {
  hasStarted: boolean;
  topLabel: string;
  centerLabel: string;
};

export function getMatchLiveDisplay({
  match,
  kickoff,
  scheduledStageLabel,
}: {
  match: Match;
  kickoff: Date;
  scheduledStageLabel: string;
}): MatchLiveDisplay {
  const status = match.status ?? "not_started";
  const hasStarted =
    status === "live" ||
    status === "halftime" ||
    status === "finished" ||
    hasNumericScore(match);

  if (!hasStarted) {
    return {
      hasStarted: false,
      topLabel: scheduledStageLabel,
      centerLabel: formatTime(kickoff),
    };
  }

  return {
    hasStarted: true,
    topLabel: getMatchPhaseLabel(match),
    centerLabel: formatScore(match),
  };
}

export function hasNumericScore(match: Match) {
  return typeof match.score?.home === "number" || typeof match.score?.away === "number";
}

export function getMatchScore(match: Match) {
  return {
    home: typeof match.score?.home === "number" ? match.score.home : 0,
    away: typeof match.score?.away === "number" ? match.score.away : 0,
  };
}

export function formatScore(match: Match) {
  const { home, away } = getMatchScore(match);
  const penalty = getPenaltyScoreLabel(match);
  return penalty ? `${home} - ${away} ${penalty}` : `${home} - ${away}`;
}

export function getPenaltyScoreLabel(match: Match) {
  const home = match.score?.penaltyHome;
  const away = match.score?.penaltyAway;
  if (typeof home !== "number" || typeof away !== "number") return "";
  return `点球 ${home}-${away}`;
}

export function getMatchPhaseLabel(match: Match) {
  const statusShort = match.statusShort?.trim().toUpperCase();

  if (statusShort === "BT") return "加时中场";
  if (statusShort === "P") return "点球大战";
  if (statusShort === "AET") return "加时后";
  if (statusShort === "PEN") return "点球结束";
  if (match.status === "halftime" || statusShort === "HT") return "中场";
  if (match.status === "finished") return "完场";
  if (match.status === "postponed") return match.statusLabel || "延期";

  const elapsed = match.elapsed;
  if (typeof elapsed === "number" && elapsed > 0) {
    const phase = getMatchPhaseFromStatusShort(statusShort, elapsed);
    return `${phase} ${elapsed}'`;
  }

  return match.statusLabel || "比赛中";
}

function getMatchPhaseFromStatusShort(statusShort: string | undefined, elapsed: number) {
  if (statusShort === "1H") return "上半场";
  if (statusShort === "2H") return "下半场";
  if (statusShort === "ET") return "加时";
  return elapsed <= 45 ? "上半场" : "下半场";
}

export function hasMatchStarted(match: Match) {
  return (
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "finished" ||
    hasNumericScore(match)
  );
}
