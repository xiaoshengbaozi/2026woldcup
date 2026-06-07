import type { Match } from "@/types/match";

export function getLiveMatchQueue(matches: Match[], currentTime: number, limit = 4) {
  const liveNow = matches
    .filter((match) => isMatchInLiveWindow(match, currentTime))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);

  const liveIds = new Set(liveNow.map((match) => match.uid));
  const upcomingMatches = matches
    .filter((match) => !liveIds.has(match.uid) && match.start.getTime() > currentTime)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit);
  const displayMatches = liveNow.length
    ? [...liveNow, ...upcomingMatches].slice(0, limit)
    : upcomingMatches;

  return {
    liveNow,
    upcomingMatches,
    displayMatches,
    isLive: liveNow.length > 0,
  };
}

export function isMatchInLiveWindow(match: Match, currentTime: number) {
  if (match.status === "live" || match.status === "halftime") return true;
  if (match.status === "finished" || match.status === "postponed") return false;

  const start = match.start.getTime();
  const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
  return start <= currentTime && currentTime <= end;
}
