import { getBackendApiUrl, type NormalizedWorldCupFixture } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import type { MatchTeamMeta } from "@/types/match";

export type WorldCupFixtureStatistic = {
  type: string;
  value: number | string | null;
};

export type WorldCupFixtureStats = {
  team: MatchTeamMeta;
  statistics: WorldCupFixtureStatistic[];
};

export type WorldCupFixtureLineupPlayer = {
  id: number | null;
  name: string;
  number: number | null;
  position: string;
  grid?: string | null;
};

export type WorldCupFixtureLineup = {
  team: MatchTeamMeta;
  formation: string;
  coach: string;
  startXI: WorldCupFixtureLineupPlayer[];
  substitutes: WorldCupFixtureLineupPlayer[];
};

export type WorldCupFixtureEvent = {
  id: string;
  minute: number;
  addedTime: number | null;
  team: MatchTeamMeta;
  player: string;
  assist: string;
  type: string;
  detail: string;
  comments: string;
};

export type WorldCupMatchDetailPayload = {
  fixture: NormalizedWorldCupFixture | null;
  stats: WorldCupFixtureStats[];
  lineups: WorldCupFixtureLineup[];
  events: WorldCupFixtureEvent[];
};

export async function fetchWorldCupMatchDetail(fixtureId: number, options: { forceRefresh?: boolean } = {}) {
  const params = new URLSearchParams({ fixture: String(fixtureId) });
  if (options.forceRefresh) params.set("forceRefresh", String(Date.now()));

  const url = `${getBackendApiUrl()}/api/worldcup/match-detail?${params}`;
  const fetchDetail = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 5_000);
    const payload = (await response.json()) as WorldCupMatchDetailPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup match detail returned ${response.status}`);
    }

    return payload;
  };

  return options.forceRefresh
    ? fetchDetail()
    : cachedJson<WorldCupMatchDetailPayload & { error?: string }>(url, 60 * 1000, fetchDetail, { persist: true, staleTtlMs: 6 * 60 * 60 * 1000 });
}
