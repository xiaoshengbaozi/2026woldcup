import type { ApiFootballService } from "./apiFootball";
import {
  localizeInjuryType,
  localizeLeague,
  localizePlayer,
  localizeTeam,
  localizeTransferType,
  localizeTrophyPlace,
  localizeCountry,
} from "./footballLocalization";

export async function getWorldCupPlayerProfile(apiFootball: ApiFootballService, url: URL) {
  const playerId = Number(url.searchParams.get("player") ?? url.searchParams.get("id"));
  const season = url.searchParams.get("season") ?? "2025";

  if (!Number.isFinite(playerId) || playerId <= 0) {
    throw createHttpError(400, "missing_player");
  }

  const [profile, seasonStats, transfers, trophies, sidelined] = await Promise.allSettled([
    apiFootball.request("players/profiles", new URLSearchParams({ player: String(playerId) })),
    apiFootball.request("players", new URLSearchParams({ id: String(playerId), season })),
    apiFootball.request("transfers", new URLSearchParams({ player: String(playerId) })),
    apiFootball.request("trophies", new URLSearchParams({ player: String(playerId) })),
    apiFootball.request("sidelined", new URLSearchParams({ player: String(playerId) })),
  ]);

  const profileItem = getResponse<any[]>(profile)?.[0];
  const seasonItem = getResponse<any[]>(seasonStats)?.[0];
  const rawPlayer = profileItem?.player ?? seasonItem?.player ?? null;
  const localizedSeasonStats = (seasonItem?.statistics ?? []).map(localizeStatistic);

  return {
    source: "api-football",
    normalized: true,
    localized: true,
    timestamp: Date.now(),
    player: localizePlayer(rawPlayer),
    currentTeam: findCurrentTeam(localizedSeasonStats),
    currentSeason: localizedSeasonStats.length ? Number(season) : null,
    seasonStats: localizedSeasonStats,
    transfers: ((getResponse<any[]>(transfers)?.[0]?.transfers ?? []) as any[]).map(localizeTransfer),
    trophies: (getResponse<any[]>(trophies) ?? []).map(localizeTrophy),
    sidelined: (getResponse<any[]>(sidelined) ?? []).map(localizeSidelined),
    unavailable: {
      profile: profile.status === "rejected",
      seasonStats: seasonStats.status === "rejected",
      transfers: transfers.status === "rejected",
      trophies: trophies.status === "rejected",
      sidelined: sidelined.status === "rejected",
    },
  };
}

export async function getWorldCupTopScorers(apiFootball: ApiFootballService, url: URL) {
  const params = new URLSearchParams(url.searchParams);
  if (!params.has("league")) params.set("league", "1");
  if (!params.has("season")) params.set("season", "2026");

  const payload = await apiFootball.request("players/topscorers", params);
  const response = ((payload.upstream as { response?: any[] })?.response ?? []).map((item) => {
    const player = localizePlayer(item.player);
    const statistic = localizeStatistic(item.statistics?.[0] ?? {});
    return {
      id: player?.id ?? null,
      name: player?.name ?? item.player?.name ?? "",
      nameEn: player?.nameEn ?? item.player?.name ?? "",
      photo: player?.photo ?? item.player?.photo ?? "",
      team: statistic.team ?? null,
      goals: statistic.goals?.total ?? 0,
      raw: item,
    };
  });
  const officialScorers = response.filter((item) => (item.goals ?? 0) > 0);
  const eventScorers = await getTopScorersFromFixtureEvents(apiFootball, params);
  if (eventScorers.length) {
    return {
      source: "api-football-events-fallback",
      normalized: true,
      localized: true,
      timestamp: Date.now(),
      officialCount: officialScorers.length,
      count: eventScorers.length,
      scorers: eventScorers,
    };
  }

  if (officialScorers.length) {
    return {
      source: "api-football",
      normalized: true,
      localized: true,
      timestamp: Date.now(),
      count: officialScorers.length,
      scorers: officialScorers,
    };
  }

  return {
    source: "api-football",
    normalized: true,
    localized: true,
    timestamp: Date.now(),
    count: response.length,
    scorers: response,
  };
}

async function getTopScorersFromFixtureEvents(apiFootball: ApiFootballService, params: URLSearchParams) {
  const fixtureParams = new URLSearchParams({
    league: params.get("league") || "1",
    season: params.get("season") || "2026",
  });
  const fixturesPayload = await apiFootball.request("fixtures", fixtureParams);
  const fixtures = ((fixturesPayload.upstream as { response?: any[] })?.response ?? [])
    .filter((item) => hasStartedFixture(item) && hasAnyRecordedGoal(item))
    .sort((a, b) => String(a.fixture?.date ?? "").localeCompare(String(b.fixture?.date ?? "")));

  const eventResults = await Promise.allSettled(
    fixtures.map((item) => {
      const fixtureId = item.fixture?.id;
      return apiFootball.request("fixtures/events", new URLSearchParams({ fixture: String(fixtureId) }));
    })
  );
  const scorers = new Map<number, EventTopScorer>();

  for (const result of eventResults) {
    if (result.status !== "fulfilled") continue;
    const events = ((result.value.upstream as { response?: any[] })?.response ?? []).filter(isScoringEvent);
    for (const event of events) {
      const playerId = Number(event.player?.id);
      if (!Number.isFinite(playerId) || playerId <= 0) continue;

      const player = localizePlayer({
        id: playerId,
        name: event.player?.name ?? "",
        photo: event.player?.photo ?? `https://media.api-sports.io/football/players/${playerId}.png`,
      });
      const team = localizeTeam({
        id: event.team?.id ?? null,
        name: event.team?.name ?? "",
        logo: event.team?.logo ?? (event.team?.id ? `https://media.api-sports.io/football/teams/${event.team.id}.png` : ""),
      });
      const existing = scorers.get(playerId);
      if (existing) {
        existing.goals += 1;
        existing.raw.push(event);
      } else {
        scorers.set(playerId, {
          id: playerId,
          name: player?.name ?? event.player?.name ?? "",
          nameEn: player?.nameEn ?? event.player?.name ?? "",
          photo: player?.photo ?? `https://media.api-sports.io/football/players/${playerId}.png`,
          team,
          goals: 1,
          raw: [event],
        });
      }
    }
  }

  return [...scorers.values()].sort((a, b) => b.goals - a.goals || a.nameEn.localeCompare(b.nameEn));
}

type EventTopScorer = {
  id: number;
  name: string;
  nameEn: string;
  photo: string;
  team: any;
  goals: number;
  raw: any[];
};

function hasStartedFixture(item: any) {
  const status = String(item.fixture?.status?.short ?? "").toUpperCase();
  return Boolean(item.fixture?.id) && !["", "TBD", "NS", "PST", "CANC", "ABD", "AWD", "WO"].includes(status);
}

function hasAnyRecordedGoal(item: any) {
  return Number(item.goals?.home ?? 0) > 0 || Number(item.goals?.away ?? 0) > 0;
}

function isScoringEvent(event: any) {
  const type = String(event.type ?? "").toLowerCase();
  const detail = String(event.detail ?? "").toLowerCase();
  if (type !== "goal") return false;
  if (detail.includes("own goal")) return false;
  if (detail.includes("missed penalty") || detail.includes("penalty missed")) return false;
  return true;
}

function getResponse<T>(result: PromiseSettledResult<{ upstream: unknown }>) {
  if (result.status !== "fulfilled") return null;
  return ((result.value.upstream as { response?: T })?.response ?? null) as T | null;
}

function localizeStatistic(stat: any) {
  return {
    ...stat,
    team: localizeTeam(stat.team),
    league: localizeLeague(stat.league),
  };
}

function localizeTransfer(transfer: any) {
  return {
    ...transfer,
    type: localizeTransferType(transfer.type),
    typeEn: transfer.type ?? "",
    teams: {
      in: localizeTeam(transfer.teams?.in),
      out: localizeTeam(transfer.teams?.out),
    },
  };
}

function localizeTrophy(trophy: any) {
  return {
    ...trophy,
    leagueEn: trophy.league ?? "",
    league: localizeLeague({ name: trophy.league, country: trophy.country }).name,
    country: localizeCountry(trophy.country),
    countryEn: trophy.country ?? "",
    placeEn: trophy.place ?? "",
    place: localizeTrophyPlace(trophy.place),
  };
}

function localizeSidelined(item: any) {
  return {
    ...item,
    typeEn: item.type ?? "",
    type: localizeInjuryType(item.type),
  };
}

function findCurrentTeam(stats: any[]) {
  const scored = stats
    .filter((item) => item.team?.id)
    .map((item) => ({
      team: item.team,
      minutes: item.games?.minutes ?? 0,
      appearances: item.games?.appearences ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes || b.appearances - a.appearances);

  return scored[0]?.team ?? null;
}

function createHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}
