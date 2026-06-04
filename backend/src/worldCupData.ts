import type { ApiFootballService } from "./apiFootball";
import fs from "node:fs";
import path from "node:path";
import {
  localizeCoachName,
  localizePlayer as localizeFootballPlayer,
  localizePosition as localizeFootballPosition,
} from "./footballLocalization";
import { localizePlayerName } from "./playerTranslations";

export interface NormalizedWorldCupFixture {
  uid: string;
  apiFixtureId: number;
  summary: string;
  description: string;
  location: string;
  url: string;
  startIso: string;
  endIso: string | null;
  geo: null;
  stage: string;
  weather: string;
  status: "not_started" | "live" | "halftime" | "finished" | "postponed" | "cancelled";
  statusLabel: string;
  elapsed: number | null;
  score: {
    home: number | null;
    away: number | null;
    halftimeHome: number | null;
    halftimeAway: number | null;
  };
  homeTeam: NormalizedTeam;
  awayTeam: NormalizedTeam;
}

export interface NormalizedWorldCupStandingRow {
  group: string;
  rank: number;
  team: NormalizedTeam;
  points: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsDiff: number;
  form: string;
  description: string;
  updatedAt: string | null;
}

export interface NormalizedTeam {
  id: number | null;
  name: string;
  englishName: string;
  code: string;
  logo: string;
}

export interface NormalizedSquadPlayer {
  id: number | null;
  nameEn: string;
  nameCn: string;
  age: number | null;
  number: number | null;
  position: string;
  positionCn: string;
  photo: string;
}

export interface NormalizedSquad {
  team: NormalizedTeam;
  coach: string | null;
  listType: "final_squad" | "squad_pool";
  officialWorldCupSquad: boolean;
  officialSquad: {
    source: "fifa_official";
    status: "imported" | "missing_official_list";
    sourceUrl: string;
    publishedAt: string;
    expectedPlayers: number;
    matchedPlayers: number;
    unmatchedOfficialPlayers: number;
    filteredApiFootballPlayers: number;
  };
  players: NormalizedSquadPlayer[];
}

const DEFAULT_LEAGUE = "1";
const DEFAULT_SEASON = "2026";
const FIFA_OFFICIAL_EXPECTED_SQUAD_SIZE = 26;

type FifaOfficialSquadsFile = {
  source?: string;
  sourceUrl?: string;
  publishedAt?: string;
  squads?: Record<string, FifaOfficialTeamSquad>;
};

type FifaOfficialTeamSquad = {
  sourceUrl?: string;
  players?: FifaOfficialSquadPlayer[];
};

type FifaOfficialSquadPlayer = {
  name: string;
  number?: number | null;
  apiFootballId?: number | null;
  position?: string;
  officialName?: string;
  firstNames?: string;
  lastNames?: string;
  shirtName?: string;
  aliases?: string[];
};

type FifaOfficialSquadFilterResult = NormalizedSquad["officialSquad"] & {
  players: NormalizedSquadPlayer[];
};

let cachedFifaOfficialSquads: FifaOfficialSquadsFile | null = null;

export async function getWorldCupFixtures(apiFootball: ApiFootballService, url: URL) {
  const params = getTournamentParams(url);
  const payload = await apiFootball.request("fixtures", params);
  const upstream = payload.upstream as ApiFootballFixturesResponse;
  assertNoApiFootballErrors(upstream);

  return {
    source: "api-football",
    normalized: true,
    cached: payload.cached,
    timestamp: payload.timestamp,
    league: Number(params.get("league") || DEFAULT_LEAGUE),
    season: Number(params.get("season") || DEFAULT_SEASON),
    count: upstream.response?.length ?? 0,
    fixtures: (upstream.response ?? []).map(normalizeFixture),
  };
}

export async function getWorldCupLiveFixtures(apiFootball: ApiFootballService, url: URL) {
  const params = getTournamentParams(url);
  if (!params.has("live")) params.set("live", "all");
  const payload = await apiFootball.request("fixtures", params);
  const upstream = payload.upstream as ApiFootballFixturesResponse;
  assertNoApiFootballErrors(upstream);

  return {
    source: "api-football",
    normalized: true,
    cached: payload.cached,
    timestamp: payload.timestamp,
    league: Number(params.get("league") || DEFAULT_LEAGUE),
    season: Number(params.get("season") || DEFAULT_SEASON),
    count: upstream.response?.length ?? 0,
    fixtures: (upstream.response ?? []).map(normalizeFixture),
  };
}

export async function getWorldCupRounds(apiFootball: ApiFootballService, url: URL) {
  const params = getTournamentParams(url);
  const payload = await apiFootball.request("fixtures/rounds", params);
  const upstream = payload.upstream as { response?: string[]; errors?: unknown };
  assertNoApiFootballErrors(upstream);

  return {
    source: "api-football",
    normalized: true,
    cached: payload.cached,
    timestamp: payload.timestamp,
    league: Number(params.get("league") || DEFAULT_LEAGUE),
    season: Number(params.get("season") || DEFAULT_SEASON),
    rounds: (upstream.response ?? []).map((round) => ({
      raw: round,
      label: localizeRound(round),
    })),
  };
}

export async function getWorldCupStandings(apiFootball: ApiFootballService, url: URL) {
  const params = getTournamentParams(url);
  const payload = await apiFootball.request("standings", params);
  const upstream = payload.upstream as ApiFootballStandingsResponse;
  assertNoApiFootballErrors(upstream);

  const groups = upstream.response?.[0]?.league?.standings ?? [];
  const standings = groups.flatMap((groupRows) => groupRows.map(normalizeStandingRow));

  return {
    source: "api-football",
    normalized: true,
    cached: payload.cached,
    timestamp: payload.timestamp,
    league: Number(params.get("league") || DEFAULT_LEAGUE),
    season: Number(params.get("season") || DEFAULT_SEASON),
    count: standings.length,
    groups: groupStandings(standings),
    standings,
  };
}

export async function getWorldCupMatchDetail(apiFootball: ApiFootballService, url: URL) {
  const fixtureId = url.searchParams.get("fixture");
  if (!fixtureId) {
    throw createHttpError(400, "missing_fixture");
  }

  const detailParams = new URLSearchParams({ id: fixtureId });
  const statsParams = new URLSearchParams({ fixture: fixtureId });
  const [fixturePayload, statsPayload, lineupPayload, eventsPayload, playersPayload] = await Promise.all([
    apiFootball.request("fixtures", detailParams),
    apiFootball.request("fixtures/statistics", statsParams),
    apiFootball.request("fixtures/lineups", statsParams),
    apiFootball.request("fixtures/events", statsParams),
    apiFootball.request("fixtures/players", statsParams),
  ]);

  const fixtureUpstream = fixturePayload.upstream as ApiFootballFixturesResponse;
  assertNoApiFootballErrors(fixtureUpstream);

  return {
    source: "api-football",
    normalized: true,
    cached:
      fixturePayload.cached &&
      statsPayload.cached &&
      lineupPayload.cached &&
      eventsPayload.cached &&
      playersPayload.cached,
    timestamp: Math.max(
      fixturePayload.timestamp,
      statsPayload.timestamp,
      lineupPayload.timestamp,
      eventsPayload.timestamp,
      playersPayload.timestamp
    ),
    fixture: fixtureUpstream.response?.[0] ? normalizeFixture(fixtureUpstream.response[0]) : null,
    stats: normalizeFixtureStats((statsPayload.upstream as ApiFootballListResponse).response ?? []),
    lineups: normalizeLineups((lineupPayload.upstream as ApiFootballListResponse).response ?? []),
    events: normalizeEvents((eventsPayload.upstream as ApiFootballListResponse).response ?? []),
    players: normalizePlayers((playersPayload.upstream as ApiFootballListResponse).response ?? []),
  };
}

export async function getWorldCupSquads(apiFootball: ApiFootballService, url: URL) {
  const teamIds = url.searchParams
    .getAll("team")
    .flatMap((value) => value.split(","))
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!teamIds.length) {
    throw createHttpError(400, "missing_team");
  }

  const teamLimit = clampNumber(process.env.API_FOOTBALL_SQUAD_TEAM_LIMIT, 1, 48, 48);
  const squads = await Promise.all(
    [...new Set(teamIds)].slice(0, teamLimit).map(async (teamId) => {
      const coach = await getCurrentCoachName(apiFootball, teamId);
      try {
        const payload = await apiFootball.request("players/squads", new URLSearchParams({ team: String(teamId) }));
        const upstream = payload.upstream as ApiFootballSquadsResponse;
        assertNoApiFootballErrors(upstream);
        return attachCoach(normalizeSquad(upstream.response?.[0]), coach);
      } catch {
        return attachCoach(normalizeOfficialOnlySquad(teamId), coach);
      }
    })
  );

  return {
    source: "api-football",
    normalized: true,
    timestamp: Date.now(),
    count: squads.filter(Boolean).length,
    squads: squads.filter((squad): squad is NormalizedSquad => Boolean(squad)),
  };
}

function getTournamentParams(url: URL) {
  const params = new URLSearchParams(url.searchParams);
  if (!params.has("league")) params.set("league", DEFAULT_LEAGUE);
  if (!params.has("season")) params.set("season", DEFAULT_SEASON);
  return params;
}

function normalizeFixture(raw: ApiFootballFixture): NormalizedWorldCupFixture {
  const start = raw.fixture?.date ? new Date(raw.fixture.date) : null;
  const end = start ? new Date(start.getTime() + 2 * 60 * 60 * 1000) : null;
  const homeTeam = normalizeTeam(raw.teams?.home);
  const awayTeam = normalizeTeam(raw.teams?.away);
  const status = normalizeStatus(raw.fixture?.status?.short);
  const stage = localizeRound(raw.league?.round ?? "");

  return {
    uid: `api-football-${raw.fixture?.id ?? `${homeTeam.code}-${awayTeam.code}-${raw.fixture?.timestamp ?? ""}`}`,
    apiFixtureId: raw.fixture?.id ?? 0,
    summary: `${homeTeam.name} vs ${awayTeam.name}${stage ? `（${stage}）` : ""}`,
    description: buildFixtureDescription(raw, homeTeam, awayTeam, stage),
    location: localizeFixtureLocation(raw),
    url: "",
    startIso: start?.toISOString() ?? "",
    endIso: end?.toISOString() ?? null,
    geo: null,
    stage,
    weather: "待更新",
    status,
    statusLabel: STATUS_LABELS[status],
    elapsed: raw.fixture?.status?.elapsed ?? null,
    score: {
      home: raw.goals?.home ?? null,
      away: raw.goals?.away ?? null,
      halftimeHome: raw.score?.halftime?.home ?? null,
      halftimeAway: raw.score?.halftime?.away ?? null,
    },
    homeTeam,
    awayTeam,
  };
}

function normalizeStandingRow(raw: ApiFootballStanding): NormalizedWorldCupStandingRow {
  return {
    group: localizeGroup(raw.group ?? ""),
    rank: raw.rank ?? 0,
    team: normalizeTeam(raw.team),
    points: raw.points ?? 0,
    played: raw.all?.played ?? 0,
    win: raw.all?.win ?? 0,
    draw: raw.all?.draw ?? 0,
    lose: raw.all?.lose ?? 0,
    goalsFor: raw.all?.goals?.for ?? 0,
    goalsAgainst: raw.all?.goals?.against ?? 0,
    goalsDiff: raw.goalsDiff ?? 0,
    form: localizeForm(raw.form ?? ""),
    description: localizeStandingDescription(raw.description),
    updatedAt: raw.update ?? null,
  };
}

function normalizeFixtureStats(items: unknown[]) {
  return items.map((item: any) => ({
    team: normalizeTeam(item.team),
    statistics: (item.statistics ?? []).map((stat: any) => ({
      type: localizeStatType(stat.type),
      value: stat.value ?? 0,
    })),
  }));
}

function normalizeLineups(items: unknown[]) {
  return items.map((item: any) => ({
    team: normalizeTeam(item.team),
    formation: item.formation ?? "待更新",
    coach: item.coach?.name ?? "待更新",
    startXI: (item.startXI ?? []).map((entry: any) => normalizeLineupPlayer(entry.player)),
    substitutes: (item.substitutes ?? []).map((entry: any) => normalizeLineupPlayer(entry.player)),
  }));
}

function normalizeLineupPlayer(player: any) {
  return {
    id: player?.id ?? null,
    name: player?.name ?? "待更新",
    number: player?.number ?? null,
    position: localizePosition(player?.pos),
    grid: player?.grid ?? null,
  };
}

function normalizeEvents(items: unknown[]) {
  return items.map((item: any, index) => ({
    id: `${item.time?.elapsed ?? "event"}-${index}`,
    minute: item.time?.elapsed ?? 0,
    addedTime: item.time?.extra ?? null,
    team: normalizeTeam(item.team),
    player: item.player?.name ?? "",
    assist: item.assist?.name ?? "",
    type: localizeEventType(item.type, item.detail),
    detail: localizeEventDetail(item.detail ?? item.type ?? ""),
    comments: item.comments ?? "",
  }));
}

function normalizePlayers(items: unknown[]) {
  return items.map((item: any) => ({
    team: normalizeTeam(item.team),
    players: (item.players ?? []).map((entry: any) => ({
      id: entry.player?.id ?? null,
      name: entry.player?.name ?? "待更新",
      photo: entry.player?.photo ?? "",
      statistics: (entry.statistics ?? []).map((stat: any) => ({
        games: {
          minutes: stat.games?.minutes ?? 0,
          number: stat.games?.number ?? null,
          position: localizePosition(stat.games?.position),
          rating: stat.games?.rating ?? null,
          captain: Boolean(stat.games?.captain),
        },
        shots: stat.shots ?? {},
        goals: stat.goals ?? {},
        passes: stat.passes ?? {},
        tackles: stat.tackles ?? {},
        cards: stat.cards ?? {},
      })),
    })),
  }));
}

async function getCurrentCoachName(apiFootball: ApiFootballService, teamId: number): Promise<string | null> {
  try {
    const payload = await apiFootball.request("coachs", new URLSearchParams({ team: String(teamId) }));
    const upstream = payload.upstream as ApiFootballCoachsResponse;
    assertNoApiFootballErrors(upstream);
    const coaches = upstream.response ?? [];
    const current = coaches.find((coach) =>
      (coach.career ?? []).some((entry) => entry.team?.id === teamId && !entry.end)
    );
    const name = current?.name ?? coaches[0]?.name ?? null;
    return name ? localizeCoachName(name) : null;
  } catch {
    return null;
  }
}

function attachCoach(squad: NormalizedSquad | null, coach: string | null): NormalizedSquad | null {
  return squad ? { ...squad, coach } : null;
}

function normalizeSquad(raw: ApiFootballSquad | undefined): NormalizedSquad | null {
  if (!raw?.team) return null;
  const team = normalizeTeam(raw.team);
  const apiPlayers = (raw.players ?? []).map(normalizeSquadPlayer);
  const officialFilter = filterOfficialSquadPlayers(team, apiPlayers);

  return {
    team,
    coach: null,
    listType: officialFilter.status === "imported" ? "final_squad" : "squad_pool",
    officialWorldCupSquad: officialFilter.status === "imported",
    officialSquad: toOfficialSquadMeta(officialFilter),
    players: officialFilter.players,
  };
}

function normalizeOfficialOnlySquad(teamId: number): NormalizedSquad | null {
  const teamMeta = TEAM_ID_TO_OFFICIAL_TEAM[teamId];
  if (!teamMeta) return null;
  const [code, englishName] = teamMeta;
  const team: NormalizedTeam = {
    id: teamId,
    code,
    englishName,
    name: TEAM_CODE_TO_CN[code] ?? englishName,
    logo: `https://media.api-sports.io/football/teams/${teamId}.png`,
  };
  const officialFilter = filterOfficialSquadPlayers(team, []);
  if (officialFilter.status !== "imported") return null;
  return {
    team,
    coach: null,
    listType: "final_squad",
    officialWorldCupSquad: true,
    officialSquad: toOfficialSquadMeta(officialFilter),
    players: officialFilter.players,
  };
}

function normalizeSquadPlayer(player: NonNullable<ApiFootballSquad["players"]>[number]): NormalizedSquadPlayer {
  const localized = localizeFootballPlayer(player);
  return {
    id: player.id ?? null,
    nameEn: localized?.nameEn ?? player.name ?? "TBD",
    nameCn: localized?.nameCn ?? localizePlayerName(player.id, player.name ?? ""),
    age: player.age ?? null,
    number: player.number ?? null,
    position: localized?.positionEn ?? player.position ?? "Unknown",
    positionCn: localized?.position ?? localizeFootballPosition(player.position),
    photo: player.photo ?? "",
  };
}

function toOfficialSquadMeta(filter: FifaOfficialSquadFilterResult): NormalizedSquad["officialSquad"] {
  return {
    source: filter.source,
    status: filter.status,
    sourceUrl: filter.sourceUrl,
    publishedAt: filter.publishedAt,
    expectedPlayers: filter.expectedPlayers,
    matchedPlayers: filter.matchedPlayers,
    unmatchedOfficialPlayers: filter.unmatchedOfficialPlayers,
    filteredApiFootballPlayers: filter.filteredApiFootballPlayers,
  };
}

function filterOfficialSquadPlayers(
  team: NormalizedTeam,
  apiPlayers: NormalizedSquadPlayer[]
): FifaOfficialSquadFilterResult {
  const officialFile = getFifaOfficialSquads();
  const sourceUrl = officialFile.sourceUrl ?? "";
  const publishedAt = officialFile.publishedAt ?? "";
  const officialSquad = team.code ? officialFile.squads?.[team.code] : undefined;
  const officialPlayers = officialSquad?.players ?? [];

  if (!officialPlayers.length) {
    return {
      source: "fifa_official",
      status: "missing_official_list",
      sourceUrl: officialSquad?.sourceUrl ?? sourceUrl,
      publishedAt,
      expectedPlayers: FIFA_OFFICIAL_EXPECTED_SQUAD_SIZE,
      matchedPlayers: 0,
      unmatchedOfficialPlayers: 0,
      filteredApiFootballPlayers: apiPlayers.length,
      players: [],
    };
  }

  const apiById = new Map<number, NormalizedSquadPlayer>();
  const apiByName = new Map<string, NormalizedSquadPlayer>();
  for (const player of apiPlayers) {
    if (typeof player.id === "number") apiById.set(player.id, player);
    for (const key of getApiPlayerKeys(player)) apiByName.set(key, player);
  }

  let apiMatchedPlayers = 0;
  const matchedApiIds = new Set<number>();
  const players = officialPlayers.map((officialPlayer) => {
    const byId =
      typeof officialPlayer.apiFootballId === "number"
        ? apiById.get(officialPlayer.apiFootballId)
        : undefined;
    const byName = getOfficialPlayerKeys(officialPlayer)
      .map((key) => apiByName.get(key))
      .find(isUnusedApiPlayer(matchedApiIds));
    const matched = byId ?? byName;
    if (matched) {
      apiMatchedPlayers += 1;
      if (typeof matched.id === "number") matchedApiIds.add(matched.id);
      return mergeOfficialPlayerWithApi(officialPlayer, matched);
    }
    return officialPlayerToNormalized(officialPlayer);
  });

  return {
    source: "fifa_official",
    status: "imported",
    sourceUrl: officialSquad?.sourceUrl ?? sourceUrl,
    publishedAt,
    expectedPlayers: officialPlayers.length,
    matchedPlayers: apiMatchedPlayers,
    unmatchedOfficialPlayers: Math.max(0, officialPlayers.length - apiMatchedPlayers),
    filteredApiFootballPlayers: Math.max(0, apiPlayers.length - matchedApiIds.size),
    players,
  };
}

function isUnusedApiPlayer(matchedApiIds: Set<number>) {
  return (player: NormalizedSquadPlayer | undefined): player is NormalizedSquadPlayer =>
    Boolean(player) && (typeof player?.id !== "number" || !matchedApiIds.has(player.id));
}

function mergeOfficialPlayerWithApi(
  officialPlayer: FifaOfficialSquadPlayer,
  apiPlayer: NormalizedSquadPlayer
): NormalizedSquadPlayer {
  const position = officialPositionToApiPosition(officialPlayer.position);
  return {
    ...apiPlayer,
    number: typeof officialPlayer.number === "number" ? officialPlayer.number : apiPlayer.number,
    position,
    positionCn: localizeFootballPosition(position),
  };
}

function officialPlayerToNormalized(player: FifaOfficialSquadPlayer): NormalizedSquadPlayer {
  return {
    id: null,
    nameEn: player.name,
    nameCn: localizePlayerName(null, player.name),
    age: null,
    number: typeof player.number === "number" ? player.number : null,
    position: officialPositionToApiPosition(player.position),
    positionCn: localizeFootballPosition(officialPositionToApiPosition(player.position)),
    photo: "",
  };
}

function officialPositionToApiPosition(position: string | null | undefined) {
  const normalized = position ?? "";
  if (normalized === "GK") return "Goalkeeper";
  if (normalized === "DF") return "Defender";
  if (normalized === "MF") return "Midfielder";
  if (normalized === "FW") return "Attacker";
  return "Unknown";
}

function getOfficialPlayerKeys(player: FifaOfficialSquadPlayer) {
  return [
    player.name,
    player.officialName,
    player.firstNames,
    player.lastNames,
    player.shirtName,
    ...(player.aliases ?? []),
  ].filter((value): value is string => Boolean(value)).map(normalizeName).filter(Boolean);
}

function getApiPlayerKeys(player: NormalizedSquadPlayer) {
  return [player.nameEn, player.nameCn].map(normalizeName).filter(Boolean);
}

function getFifaOfficialSquads(): FifaOfficialSquadsFile {
  if (cachedFifaOfficialSquads) return cachedFifaOfficialSquads;

  const candidates = [
    path.resolve(process.cwd(), "../data/fifa-official-squads.json"),
    path.resolve(process.cwd(), "data/fifa-official-squads.json"),
  ];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    cachedFifaOfficialSquads = { squads: {} };
    return cachedFifaOfficialSquads;
  }

  try {
    cachedFifaOfficialSquads = JSON.parse(fs.readFileSync(filePath, "utf8")) as FifaOfficialSquadsFile;
  } catch {
    cachedFifaOfficialSquads = { squads: {} };
  }
  cachedFifaOfficialSquads.squads ??= {};
  return cachedFifaOfficialSquads;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function normalizeTeam(team: ApiFootballTeam | undefined): NormalizedTeam {
  const englishName = team?.name ?? "TBD";
  const code = TEAM_NAME_TO_CODE[normalizeName(englishName)] ?? "";

  return {
    id: team?.id ?? null,
    name: code ? TEAM_CODE_TO_CN[code] : englishName,
    englishName,
    code,
    logo: team?.logo ?? "",
  };
}

function groupStandings(rows: NormalizedWorldCupStandingRow[]) {
  return rows.reduce<Record<string, NormalizedWorldCupStandingRow[]>>((groups, row) => {
    groups[row.group] ??= [];
    groups[row.group].push(row);
    return groups;
  }, {});
}

function buildFixtureDescription(
  raw: ApiFootballFixture,
  homeTeam: NormalizedTeam,
  awayTeam: NormalizedTeam,
  stage: string
) {
  const date = raw.fixture?.date
    ? new Date(raw.fixture.date).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "时间待定";
  const venue = localizeFixtureLocation(raw) || "场馆待定";
  return `${homeTeam.name} 对阵 ${awayTeam.name}，${stage || "阶段待定"}，北京时间 ${date}，${venue}`;
}

function localizeFixtureLocation(raw: ApiFootballFixture) {
  const location = localizeVenueLocation(raw.fixture?.venue?.name, raw.fixture?.venue?.city);
  if (location) return location;

  const fixtureId = raw.fixture?.id;
  return fixtureId ? FIXTURE_LOCATION_FALLBACK_CN[fixtureId] ?? "" : "";
}

function localizeVenueLocation(name: string | null | undefined, city: string | null | undefined) {
  const venue = localizeVenueName(name);
  const cityName = localizeCityName(city);
  return [venue, cityName].filter(Boolean).join(" · ");
}

function localizeVenueName(name: string | null | undefined) {
  const normalized = name?.trim() ?? "";
  if (!normalized) return "";
  return VENUE_NAME_TO_CN[normalized] ?? normalized;
}

function localizeCityName(city: string | null | undefined) {
  const normalized = city?.trim() ?? "";
  if (!normalized) return "";
  return CITY_NAME_TO_CN[normalized] ?? normalized;
}

function normalizeStatus(shortStatus = ""): NormalizedWorldCupFixture["status"] {
  if (["NS", "TBD"].includes(shortStatus)) return "not_started";
  if (["1H", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(shortStatus)) return "live";
  if (shortStatus === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(shortStatus)) return "finished";
  if (["PST", "PST"].includes(shortStatus)) return "postponed";
  if (["CANC", "ABD", "AWD", "WO"].includes(shortStatus)) return "cancelled";
  return "not_started";
}

function localizeRound(round: string) {
  const normalized = round.trim();
  const groupMatch = normalized.match(/^Group Stage\s*-\s*(\d+)$/i);
  if (groupMatch) return `小组赛第 ${groupMatch[1]} 轮`;

  const direct: Record<string, string> = {
    "Round of 16": "1/8 决赛",
    "8th Finals": "1/8 决赛",
    "Quarter-finals": "1/4 决赛",
    "Quarter Finals": "1/4 决赛",
    "Semi-finals": "半决赛",
    "Semi Finals": "半决赛",
    "3rd Place Final": "三四名决赛",
    Final: "决赛",
  };

  return direct[normalized] ?? normalized;
}

function localizeGroup(group: string) {
  if (/Ranking of third-placed teams/i.test(group)) return "小组第三排名";
  const match = group.match(/^Group\s+([A-Z])$/i);
  return match ? `${match[1].toUpperCase()} 组` : group;
}

function localizeForm(form: string) {
  return form
    .replace(/W/g, "胜")
    .replace(/D/g, "平")
    .replace(/L/g, "负");
}

function localizeStandingDescription(description: string | null | undefined) {
  if (!description) return "";
  if (/Promotion/i.test(description)) return "晋级淘汰赛";
  return description;
}

function localizePosition(position: string | null | undefined) {
  const labels: Record<string, string> = {
    G: "门将",
    D: "后卫",
    M: "中场",
    F: "前锋",
    Goalkeeper: "门将",
    Defender: "后卫",
    Midfielder: "中场",
    Attacker: "前锋",
  };
  return labels[position ?? ""] ?? position ?? "待更新";
}

function localizeStatType(type: string) {
  const labels: Record<string, string> = {
    "Shots on Goal": "射正",
    "Shots off Goal": "射偏",
    "Total Shots": "射门",
    "Blocked Shots": "封堵射门",
    "Shots insidebox": "禁区内射门",
    "Shots outsidebox": "禁区外射门",
    Fouls: "犯规",
    "Corner Kicks": "角球",
    Offsides: "越位",
    "Ball Possession": "控球率",
    "Yellow Cards": "黄牌",
    "Red Cards": "红牌",
    "Goalkeeper Saves": "门将扑救",
    "Total passes": "传球",
    "Passes accurate": "成功传球",
    "Passes %": "传球成功率",
  };
  return labels[type] ?? type;
}

function localizeEventType(type: string, detail: string) {
  if (type === "Goal" && /Penalty/i.test(detail)) return "点球进球";
  if (type === "Goal" && /Own Goal/i.test(detail)) return "乌龙球";
  if (type === "Goal") return "进球";
  if (type === "Card" && /Red/i.test(detail)) return "红牌";
  if (type === "Card") return "黄牌";
  if (type === "subst") return "换人";
  if (type === "Var") return "VAR";
  return type || "事件";
}

function localizeEventDetail(detail: string) {
  const labels: Record<string, string> = {
    "Normal Goal": "运动战进球",
    "Own Goal": "乌龙球",
    Penalty: "点球",
    "Missed Penalty": "罚丢点球",
    "Yellow Card": "黄牌",
    "Red Card": "红牌",
    Substitution: "换人",
  };
  return labels[detail] ?? detail;
}

function assertNoApiFootballErrors(upstream: { errors?: unknown }) {
  const errors = upstream.errors;
  if (Array.isArray(errors) && errors.length === 0) return;
  if (errors && typeof errors === "object" && Object.keys(errors).length === 0) return;
  if (!errors) return;
  throw createHttpError(502, "api_football_data_unavailable", errors);
}

function createHttpError(statusCode: number, code: string, details?: unknown) {
  const error = new Error(code) as Error & { statusCode?: number; details?: unknown };
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}&'.\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const STATUS_LABELS: Record<NormalizedWorldCupFixture["status"], string> = {
  not_started: "未开始",
  live: "进行中",
  halftime: "中场休息",
  finished: "已结束",
  postponed: "已延期",
  cancelled: "已取消",
};

const VENUE_NAME_TO_CN: Record<string, string> = {
  "AT&T Stadium": "AT&T 体育场",
  "Arrowhead Stadium": "箭头体育场",
  "BC Place": "卑诗体育馆",
  "BMO Field": "BMO 球场",
  "Estadio Akron": "阿克伦体育场",
  "Estadio Azteca": "阿兹特克体育场",
  "Estadio Banorte": "巴诺尔特体育场",
  "Estadio BBVA": "BBVA 体育场",
  "Gillette Stadium": "吉列体育场",
  "Hard Rock Stadium": "硬石体育场",
  "Levi's Stadium": "李维斯体育场",
  "Lincoln Financial Field": "林肯金融球场",
  "Lumen Field": "流明球场",
  "Mercedes-Benz Stadium": "梅赛德斯-奔驰体育场",
  "MetLife Stadium": "大都会人寿体育场",
  "NRG Stadium": "NRG 体育场",
  "SoFi Stadium": "SoFi 体育场",
};

const FIXTURE_LOCATION_FALLBACK_CN: Record<number, string> = {
  1489373: "李维斯体育场 · 旧金山湾区",
  1489376: "AT&T 体育场 · 达拉斯",
  1489382: "李维斯体育场 · 旧金山湾区",
  1489384: "AT&T 体育场 · 达拉斯",
  1539006: "李维斯体育场 · 旧金山湾区",
  1489399: "AT&T 体育场 · 达拉斯",
  1489400: "李维斯体育场 · 旧金山湾区",
  1539011: "AT&T 体育场 · 达拉斯",
  1489411: "李维斯体育场 · 旧金山湾区",
  1489421: "AT&T 体育场 · 达拉斯",
};

const CITY_NAME_TO_CN: Record<string, string> = {
  "Atlanta, Georgia": "佐治亚州亚特兰大",
  "Boston, Massachusetts": "马萨诸塞州波士顿",
  "Dallas, Texas": "得克萨斯州达拉斯",
  "East Rutherford, New Jersey": "新泽西州东卢瑟福",
  "Guadalajara": "瓜达拉哈拉",
  "Houston, Texas": "得克萨斯州休斯敦",
  "Kansas City, Missouri": "密苏里州堪萨斯城",
  "Los Angeles, California": "加利福尼亚州洛杉矶",
  "Mexico City": "墨西哥城",
  "Miami Gardens, Florida": "佛罗里达州迈阿密花园",
  "Monterrey": "蒙特雷",
  "Philadelphia, Pennsylvania": "宾夕法尼亚州费城",
  "Seattle, Washington": "华盛顿州西雅图",
  "Toronto, Ontario": "安大略省多伦多",
  "Vancouver, British Columbia": "不列颠哥伦比亚省温哥华",
  "Zapopan": "萨波潘",
};

const TEAM_CODE_TO_CN: Record<string, string> = {
  ARG: "阿根廷",
  ALG: "阿尔及利亚",
  AUS: "澳大利亚",
  AUT: "奥地利",
  BEL: "比利时",
  BIH: "波黑",
  BRA: "巴西",
  CAN: "加拿大",
  CIV: "科特迪瓦",
  CMR: "喀麦隆",
  COD: "刚果民主共和国",
  COL: "哥伦比亚",
  CPV: "佛得角",
  CRC: "哥斯达黎加",
  CRO: "克罗地亚",
  CUW: "库拉索",
  CZE: "捷克",
  DEN: "丹麦",
  ECU: "厄瓜多尔",
  EGY: "埃及",
  ENG: "英格兰",
  ESP: "西班牙",
  FRA: "法国",
  GER: "德国",
  GHA: "加纳",
  HAI: "海地",
  IRN: "伊朗",
  IRQ: "伊拉克",
  JOR: "约旦",
  JPN: "日本",
  KOR: "韩国",
  MAR: "摩洛哥",
  MEX: "墨西哥",
  NED: "荷兰",
  NOR: "挪威",
  NZL: "新西兰",
  PAN: "巴拿马",
  PAR: "巴拉圭",
  POL: "波兰",
  POR: "葡萄牙",
  QAT: "卡塔尔",
  RSA: "南非",
  KSA: "沙特阿拉伯",
  SCO: "苏格兰",
  SEN: "塞内加尔",
  SRB: "塞尔维亚",
  SUI: "瑞士",
  SWE: "瑞典",
  TUR: "土耳其",
  TUN: "突尼斯",
  URU: "乌拉圭",
  USA: "美国",
  UZB: "乌兹别克斯坦",
  WAL: "威尔士",
};

const TEAM_ID_TO_OFFICIAL_TEAM: Record<number, [string, string]> = {
  1: ["BEL", "Belgium"],
  2: ["FRA", "France"],
  3: ["CRO", "Croatia"],
  5: ["SWE", "Sweden"],
  6: ["BRA", "Brazil"],
  7: ["URU", "Uruguay"],
  8: ["COL", "Colombia"],
  9: ["ESP", "Spain"],
  10: ["ENG", "England"],
  11: ["PAN", "Panama"],
  12: ["JPN", "Japan"],
  13: ["SEN", "Senegal"],
  15: ["SUI", "Switzerland"],
  16: ["MEX", "Mexico"],
  17: ["KOR", "South Korea"],
  20: ["AUS", "Australia"],
  22: ["IRN", "Iran"],
  23: ["KSA", "Saudi Arabia"],
  25: ["GER", "Germany"],
  26: ["ARG", "Argentina"],
  27: ["POR", "Portugal"],
  28: ["TUN", "Tunisia"],
  31: ["MAR", "Morocco"],
  32: ["EGY", "Egypt"],
  770: ["CZE", "Czech Republic"],
  775: ["AUT", "Austria"],
  777: ["TUR", "Türkiye"],
  1090: ["NOR", "Norway"],
  1108: ["SCO", "Scotland"],
  1113: ["BIH", "Bosnia & Herzegovina"],
  1118: ["NED", "Netherlands"],
  1501: ["CIV", "Ivory Coast"],
  1504: ["GHA", "Ghana"],
  1508: ["COD", "Congo DR"],
  1531: ["RSA", "South Africa"],
  1532: ["ALG", "Algeria"],
  1533: ["CPV", "Cape Verde Islands"],
  1548: ["JOR", "Jordan"],
  1567: ["IRQ", "Iraq"],
  1568: ["UZB", "Uzbekistan"],
  1569: ["QAT", "Qatar"],
  2380: ["PAR", "Paraguay"],
  2382: ["ECU", "Ecuador"],
  2384: ["USA", "USA"],
  2386: ["HAI", "Haiti"],
  4673: ["NZL", "New Zealand"],
  5529: ["CAN", "Canada"],
  5530: ["CUW", "Curaçao"],
};

const TEAM_NAME_TO_CODE: Record<string, string> = {
  argentina: "ARG",
  algeria: "ALG",
  australia: "AUS",
  austria: "AUT",
  belgium: "BEL",
  "bosnia & herzegovina": "BIH",
  "bosnia and herzegovina": "BIH",
  brazil: "BRA",
  cameroon: "CMR",
  canada: "CAN",
  "cape verde islands": "CPV",
  "cape verde": "CPV",
  colombia: "COL",
  "congo dr": "COD",
  "congo democratic republic": "COD",
  "costa rica": "CRC",
  croatia: "CRO",
  curacao: "CUW",
  curaçao: "CUW",
  "czech republic": "CZE",
  czechia: "CZE",
  denmark: "DEN",
  ecuador: "ECU",
  egypt: "EGY",
  england: "ENG",
  france: "FRA",
  germany: "GER",
  ghana: "GHA",
  haiti: "HAI",
  iran: "IRN",
  iraq: "IRQ",
  "ivory coast": "CIV",
  japan: "JPN",
  jordan: "JOR",
  mexico: "MEX",
  morocco: "MAR",
  netherlands: "NED",
  "new zealand": "NZL",
  norway: "NOR",
  panama: "PAN",
  paraguay: "PAR",
  poland: "POL",
  portugal: "POR",
  qatar: "QAT",
  "saudi arabia": "KSA",
  scotland: "SCO",
  senegal: "SEN",
  serbia: "SRB",
  "south africa": "RSA",
  "south korea": "KOR",
  spain: "ESP",
  sweden: "SWE",
  switzerland: "SUI",
  turkiye: "TUR",
  türkiye: "TUR",
  turkey: "TUR",
  tunisia: "TUN",
  uruguay: "URU",
  usa: "USA",
  "united states": "USA",
  uzbekistan: "UZB",
  wales: "WAL",
};

interface ApiFootballFixturesResponse {
  response?: ApiFootballFixture[];
  errors?: unknown;
}

interface ApiFootballStandingsResponse {
  response?: Array<{
    league?: {
      standings?: ApiFootballStanding[][];
    };
  }>;
  errors?: unknown;
}

interface ApiFootballListResponse {
  response?: unknown[];
  errors?: unknown;
}

interface ApiFootballSquadsResponse {
  response?: ApiFootballSquad[];
  errors?: unknown;
}

interface ApiFootballCoachsResponse {
  response?: ApiFootballCoach[];
  errors?: unknown;
}

interface ApiFootballFixture {
  fixture?: {
    id?: number;
    date?: string;
    timestamp?: number;
    venue?: {
      name?: string;
      city?: string;
    };
    status?: {
      short?: string;
      elapsed?: number | null;
    };
  };
  league?: {
    round?: string;
  };
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
  score?: {
    halftime?: {
      home?: number | null;
      away?: number | null;
    };
  };
}

interface ApiFootballTeam {
  id?: number | null;
  name?: string;
  logo?: string;
}

interface ApiFootballSquad {
  team?: ApiFootballTeam;
  players?: Array<{
    id?: number | null;
    name?: string;
    age?: number | null;
    number?: number | null;
    position?: string;
    photo?: string;
  }>;
}

interface ApiFootballCoach {
  id?: number;
  name?: string;
  career?: Array<{
    team?: ApiFootballTeam;
    start?: string | null;
    end?: string | null;
  }>;
}

interface ApiFootballStanding {
  rank?: number;
  team?: ApiFootballTeam;
  points?: number;
  goalsDiff?: number;
  group?: string;
  form?: string;
  description?: string | null;
  all?: {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
      for?: number;
      against?: number;
    };
  };
  update?: string;
}
