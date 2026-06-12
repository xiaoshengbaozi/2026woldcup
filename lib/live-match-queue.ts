import type { Match } from "@/types/match";

const PRE_MATCH_REFRESH_MS = 60 * 60_000;
const POST_MATCH_REFRESH_MS = 6 * 60 * 60_000;

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

export function getNextUpcomingMatch(matches: Match[], currentTime: number) {
  const now = currentTime > 0 ? currentTime : Date.now();

  return [...matches]
    .filter((match) => {
      if (match.status === "live" || match.status === "halftime" || match.status === "finished" || match.status === "postponed") {
        return false;
      }

      return match.start.getTime() > now;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null;
}

export function hasMatchInLiveRefreshWindow(matches: Match[], currentTime: number) {
  const now = currentTime > 0 ? currentTime : Date.now();
  return matches.some((match) => isMatchInLiveRefreshWindow(match, now));
}

export function getUpcomingMatchesWithinWindow(
  matches: Match[],
  currentTime: number,
  windowHours = 24
) {
  const windowEnd = currentTime + windowHours * 60 * 60 * 1000;

  return matches
    .filter((match) => {
      const start = match.start.getTime();
      return start > currentTime && start <= windowEnd;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function isMatchInLiveWindow(match: Match, currentTime: number) {
  if (match.status === "live" || match.status === "halftime") return true;
  if (match.status === "finished" || match.status === "postponed") return false;

  const start = match.start.getTime();
  const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
  return start <= currentTime && currentTime <= end;
}

export function isMatchInLiveRefreshWindow(match: Match, currentTime: number) {
  if (match.status === "live" || match.status === "halftime") return true;
  if (match.status === "finished" || match.status === "postponed") return false;

  const start = match.start.getTime();
  const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
  return start - PRE_MATCH_REFRESH_MS <= currentTime && currentTime <= end + POST_MATCH_REFRESH_MS;
}
