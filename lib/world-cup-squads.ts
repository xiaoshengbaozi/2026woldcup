import { getBackendApiUrl } from "@/lib/world-cup-api";
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
};

type SquadResponse = {
  team: MatchTeamMeta;
  players: SquadPlayerResponse[];
  listType?: "squad_pool";
  officialWorldCupSquad?: boolean;
};

type SquadsPayload = {
  squads?: SquadResponse[];
};

export async function fetchWorldCupSquads(teamIds: number[]) {
  const ids = [...new Set(teamIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) return new Map<number, LineupPlayer[]>();

  const params = new URLSearchParams();
  ids.forEach((id) => params.append("team", String(id)));

  const response = await fetch(`${getBackendApiUrl()}/api/worldcup/squads?${params}`, { cache: "no-store" });
  const payload = (await response.json()) as SquadsPayload & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || `World Cup squads returned ${response.status}`);
  }

  const squads = new Map<number, LineupPlayer[]>();
  for (const squad of payload.squads ?? []) {
    if (!squad.team.id) continue;
    squads.set(squad.team.id, squad.players.map(toLineupPlayer));
  }

  return squads;
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
  };
}

function toPlayerPosition(position: string): PlayerPosition {
  const normalized = position.toLowerCase();
  if (normalized.includes("goalkeeper")) return "GK";
  if (normalized.includes("defender")) return "CB";
  if (normalized.includes("midfielder")) return "CM";
  if (normalized.includes("attacker")) return "ST";
  return "CM";
}
