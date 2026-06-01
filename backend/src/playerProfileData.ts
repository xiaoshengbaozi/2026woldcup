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

  return {
    source: "api-football",
    normalized: true,
    localized: true,
    timestamp: Date.now(),
    count: response.length,
    scorers: response,
  };
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
