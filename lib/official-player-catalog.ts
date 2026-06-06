import fifaOfficialSquads from "@/data/fifa-official-squads.json";
import playerNameTranslations from "@/data/localization/players.json";
import { getApiSportsPlayerPhoto } from "@/lib/player-photo-overrides";
import { localizeCountryCode } from "@/lib/team-localization";

type OfficialSquadPlayer = {
  number?: number | null;
  position?: string | null;
  name: string;
  officialName?: string;
  aliases?: string[];
  apiFootballId?: number | null;
};

export type OfficialPlayerCatalogItem = {
  id: string;
  apiPlayerId: number;
  teamCode: string;
  countryCn: string;
  countryEn: string;
  nameEn: string;
  nameCn: string;
  position: string;
  positionCn: string;
  number: number | null;
  photo: string;
  category: "squads";
  source: "official-squad";
  aliases: string[];
};

const PLAYER_NAME_TRANSLATIONS = playerNameTranslations as Record<string, string>;

export function getOfficialPlayerCatalog(): OfficialPlayerCatalogItem[] {
  const squads = (fifaOfficialSquads as { squads?: Record<string, { players?: OfficialSquadPlayer[] }> }).squads ?? {};
  const players = Object.entries(squads).flatMap(([teamCode, squad]) =>
    (squad.players ?? [])
      .filter((player) => Number.isFinite(player.apiFootballId))
      .map((player) => {
        const apiPlayerId = Number(player.apiFootballId);
        return {
          id: String(apiPlayerId),
          apiPlayerId,
          teamCode,
          countryCn: localizeCountryCode(teamCode),
          countryEn: teamCode,
          nameEn: player.name,
          nameCn: PLAYER_NAME_TRANSLATIONS[String(apiPlayerId)] || player.name,
          position: player.position || "",
          positionCn: localizeOfficialPosition(player.position),
          number: player.number ?? null,
          photo: getApiSportsPlayerPhoto(apiPlayerId),
          category: "squads" as const,
          source: "official-squad" as const,
          aliases: [player.officialName, ...(player.aliases ?? [])].filter(Boolean) as string[],
        };
      })
  );

  return players.filter((player, index, list) => list.findIndex((item) => item.apiPlayerId === player.apiPlayerId) === index);
}

export function getOfficialPlayerById(playerId: string | number) {
  return getOfficialPlayerCatalog().find((player) => String(player.apiPlayerId) === String(playerId)) ?? null;
}

export function localizeOfficialPosition(position: string | null | undefined) {
  if (position === "GK") return "门将";
  if (position === "DF") return "后卫";
  if (position === "MF") return "中场";
  if (position === "FW") return "前锋";
  return "位置待更新";
}
