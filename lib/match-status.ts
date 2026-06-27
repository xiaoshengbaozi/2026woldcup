import type { Match } from "@/types/match";

const MATCH_END_GRACE_MS = 10 * 60_000;

export function getEffectiveMatchStatus(match: Match, status: Match["status"] | undefined = match.status): Match["status"] {
  if (status === "finished" || status === "postponed" || status === "unknown") return status;
  if (shouldForceFinishedByClock(match)) return "finished";
  return status ?? "not_started";
}

export function shouldForceFinishedByClock(match: Pick<Match, "start" | "end">) {
  const endTime = match.end?.getTime() ?? match.start.getTime() + 2 * 60 * 60_000;
  return Number.isFinite(endTime) && Date.now() > endTime + MATCH_END_GRACE_MS;
}
