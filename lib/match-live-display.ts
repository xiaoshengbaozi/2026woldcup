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
  return `${home} - ${away}`;
}

export function getMatchPhaseLabel(match: Match) {
  if (match.status === "halftime") return "中场";
  if (match.status === "finished") return "完场";
  if (match.status === "postponed") return match.statusLabel || "延期";

  const elapsed = match.elapsed;
  if (typeof elapsed === "number" && elapsed > 0) {
    const phase = elapsed <= 45 ? "上半场" : elapsed <= 90 ? "下半场" : "加时";
    return `${phase} ${elapsed}'`;
  }

  return match.statusLabel || "比赛中";
}

export function hasMatchStarted(match: Match) {
  return (
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "finished" ||
    hasNumericScore(match)
  );
}
