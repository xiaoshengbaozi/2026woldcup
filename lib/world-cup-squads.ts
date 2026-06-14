import { getBackendApiUrl } from "@/lib/world-cup-api";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import type { LineupPlayer, MatchTeamMeta, PlayerPosition } from "@/types/match";

type SquadPlayerResponse = {
  id: number | null;
  nameEn: string;
  nameCn: string;
  age: number | null;
  number: number | null;
  position: string;
  positionCn: string;
  photo: string;
  rating?: number | string | null;
};

type SquadResponse = {
  team: MatchTeamMeta;
  players: SquadPlayerResponse[];
  coach?: string | null;
  listType?: "final_squad" | "squad_pool";
  officialWorldCupSquad?: boolean;
  officialSquad?: OfficialSquadMeta;
};

type SquadsPayload = {
  squads?: SquadResponse[];
};

type WorldCupCacheEnvelope<T> = {
  ok: boolean;
  data?: T | null;
  error?: string;
};

export type OfficialSquadMeta = {
  source: "fifa_official";
  status: "imported" | "missing_official_list";
  sourceUrl: string;
  publishedAt: string;
  expectedPlayers: number;
  matchedPlayers: number;
  unmatchedOfficialPlayers: number;
  filteredApiFootballPlayers: number;
};

export type WorldCupSquadDetail = {
  team: MatchTeamMeta;
  coach: string | null;
  players: LineupPlayer[];
  listType: "final_squad" | "squad_pool";
  officialWorldCupSquad: boolean;
  officialSquad: OfficialSquadMeta | null;
};

export async function fetchWorldCupSquads(teamIds: number[]) {
  const details = await fetchWorldCupSquadDetails(teamIds);
  const squads = new Map<number, LineupPlayer[]>();
  for (const [teamId, squad] of details) {
    squads.set(teamId, squad.players);
  }
  return squads;
}

export async function fetchWorldCupSquadDetails(teamIds: number[]) {
  const ids = [...new Set(teamIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return new Map<number, WorldCupSquadDetail>();

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("team", String(id)));

  const apiUrl = getBackendApiUrl();
  const cacheUrl = `${apiUrl}/api/worldcup-cache/squads`;
  const url = `${apiUrl}/api/worldcup/squads?${params}`;
  const fetchSquads = async () => {
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
    const payload = (await response.json()) as SquadsPayload & { error?: string };

    if (!response.ok) {
      throw new Error(payload.error || `World Cup squads returned ${response.status}`);
    }

    return payload;
  };

  let payload: SquadsPayload & { error?: string };

  try {
    const cachedPayload = await cachedJson<SquadsPayload & { error?: string }>(
      cacheUrl,
      10 * 60 * 1000,
      () => fetchWorldCupCacheData<SquadsPayload>(cacheUrl, "World Cup cached squads"),
      { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 }
    );
    payload = filterSquadsPayload(cachedPayload, ids);
  } catch {
    payload = await cachedJson<SquadsPayload & { error?: string }>(url, 10 * 60 * 1000, fetchSquads, { persist: true, staleTtlMs: 7 * 24 * 60 * 60 * 1000 });
  }

  const squads = new Map<number, WorldCupSquadDetail>();
  for (const squad of payload.squads ?? []) {
    if (!squad.team.id) continue;
    squads.set(squad.team.id, {
      team: squad.team,
      coach: squad.coach || null,
      players: squad.players.map(toLineupPlayer),
      listType: squad.listType ?? "squad_pool",
      officialWorldCupSquad: Boolean(squad.officialWorldCupSquad),
      officialSquad: squad.officialSquad ?? null,
    });
  }

  return squads;
}

async function fetchWorldCupCacheData<T>(url: string, label: string) {
  const response = await fetchWithTimeout(url, { cache: "no-store" }, 6_000);
  const envelope = (await response.json()) as WorldCupCacheEnvelope<T>;

  if (!response.ok || !envelope.ok || !envelope.data) {
    throw new Error(envelope.error || `${label} returned ${response.status}`);
  }

  return envelope.data;
}

function filterSquadsPayload(payload: SquadsPayload & { error?: string }, teamIds: number[]) {
  const wanted = new Set(teamIds);
  return {
    ...payload,
    squads: (payload.squads ?? []).filter((squad) => squad.team.id && wanted.has(squad.team.id)),
  };
}

function toLineupPlayer(player: SquadPlayerResponse, index: number): LineupPlayer {
  return {
    id: String(player.id ?? `squad-${index}`),
    name: player.nameCn || player.nameEn,
    nameCn: player.nameCn || player.nameEn,
    nameEn: player.nameEn,
    number: player.number,
    position: toPlayerPosition(player.position),
    positionCn: player.positionCn,
    photo: player.photo,
    isStarter: false,
    country: "",
    club: "国家队",
    age: player.age ?? 0,
    rating: parseRating(player.rating),
  };
}

function parseRating(value: number | string | null | undefined) {
  if (value == null) return undefined;
  const rating = typeof value === "number" ? value : Number(value);
  return Number.isFinite(rating) ? Math.round(rating * 10) / 10 : undefined;
}

function toPlayerPosition(position: string): PlayerPosition {
  const normalized = position.toLowerCase();
  if (normalized.includes("goalkeeper")) return "GK";
  if (normalized.includes("defender")) return "CB";
  if (normalized.includes("midfielder")) return "CM";
  if (normalized.includes("attacker")) return "ST";
  return "CM";
}
