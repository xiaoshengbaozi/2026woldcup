import officialSquadsData from "@/data/fifa-official-squads.json";
import { getApiSportsPlayerPhoto } from "@/lib/player-photo-overrides";

export type UserPreferenceTeam = {
  id: string;
  name: string;
  region?: string;
  logo?: string;
};

export type UserPreferencePlayer = {
  id: string;
  name: string;
  team?: string;
  position?: string;
  photo?: string;
  avatar?: string;
};

export type UserPreferenceMatch = {
  id: string;
  matchId?: string;
  title: string;
  stage?: string;
  startsAt?: string;
};

export type UserPreferenceCatalog = {
  source: "api-football" | "fallback";
  timestamp: number;
  teams: UserPreferenceTeam[];
  players: UserPreferencePlayer[];
  matches: UserPreferenceMatch[];
};

export const preferenceTeams: UserPreferenceTeam[] = [
  { id: "26", name: "阿根廷", region: "ARG", logo: "https://media.api-sports.io/football/teams/26.png" },
  { id: "6", name: "巴西", region: "BRA", logo: "https://media.api-sports.io/football/teams/6.png" },
  { id: "2", name: "法国", region: "FRA", logo: "https://media.api-sports.io/football/teams/2.png" },
  { id: "10", name: "英格兰", region: "ENG", logo: "https://media.api-sports.io/football/teams/10.png" },
  { id: "12", name: "日本", region: "JPN", logo: "https://media.api-sports.io/football/teams/12.png" },
];

const staticPreferencePlayers: UserPreferencePlayer[] = [
  { id: "154", name: "Lionel Messi", team: "阿根廷", position: "Forward", photo: "https://media.api-sports.io/football/players/154.png" },
  { id: "278", name: "Kylian Mbappe", team: "法国", position: "Forward", photo: "https://media.api-sports.io/football/players/278.png" },
  { id: "762", name: "Vinicius Junior", team: "巴西", position: "Forward", photo: "https://media.api-sports.io/football/players/762.png" },
  { id: "386828", name: "Lamine Yamal", team: "西班牙", position: "Forward", photo: "https://media.api-sports.io/football/players/386828.png" },
  { id: "1100", name: "Erling Haaland", team: "挪威", position: "Forward", photo: "https://media.api-sports.io/football/players/1100.png" },
];

const officialPreferenceCatalog = buildOfficialPreferenceCatalog();

export const preferencePlayers: UserPreferencePlayer[] = officialPreferenceCatalog.players.length
  ? officialPreferenceCatalog.players
  : staticPreferencePlayers;

export const preferenceMatches: UserPreferenceMatch[] = [
  {
    id: "opening-match",
    matchId: "opening-match",
    title: "揭幕战 · 2026 世界杯",
    stage: "小组赛",
    startsAt: "2026-06-11T19:00:00-05:00",
  },
  {
    id: "usa-group-opener",
    matchId: "usa-group-opener",
    title: "美国小组赛首战",
    stage: "小组赛",
    startsAt: "2026-06-12T18:00:00-05:00",
  },
  {
    id: "final-match",
    matchId: "final-match",
    title: "决赛 · 世界冠军之夜",
    stage: "决赛",
    startsAt: "2026-07-19T15:00:00-04:00",
  },
];

export const fallbackUserPreferenceCatalog: UserPreferenceCatalog = {
  source: "fallback",
  timestamp: 0,
  teams: officialPreferenceCatalog.teams.length ? officialPreferenceCatalog.teams : preferenceTeams,
  players: preferencePlayers,
  matches: preferenceMatches,
};

const LEGACY_PLAYER_PHOTOS: Record<string, string> = {
  "lionel-messi": "/player-stories/26_superstars/avatar-webp/Lionel_Messi_avatar.webp",
  "kylian-mbappe": "/player-stories/26_superstars/avatar-webp/Kylian_Mbappe_avatar.webp",
  "erling-haaland": "/player-stories/26_superstars/avatar-webp/Erling_Haaland_avatar.webp",
  "vinicius-junior": "/player-stories/26_superstars/avatar-webp/Vinicius_Junior_avatar.webp",
  "jude-bellingham": "/player-stories/26_superstars/avatar-webp/Jude_Bellingham_avatar.webp",
  "harry-kane": "/player-stories/26_superstars/avatar-webp/Harry_Kane_avatar.webp",
  "cristiano-ronaldo": "/player-stories/26_superstars/avatar-webp/Cristiano_Ronaldo_avatar.webp",
  "mohamed-salah": "/player-stories/26_superstars/avatar-webp/Mohamed_Salah_avatar.webp",
  "kevin-de-bruyne": "/player-stories/26_superstars/avatar-webp/Kevin_De_Bruyne_avatar.webp",
  "bruno-fernandes": "/player-stories/26_superstars/avatar-webp/Bruno_Fernandes_avatar.webp",
  "federico-valverde": "/player-stories/26_superstars/avatar-webp/Federico_Valverde_avatar.webp",
  "luka-modric": "/player-stories/26_superstars/avatar-webp/Luka_Modric_avatar.webp",
  "raphinha": "/player-stories/26_superstars/avatar-webp/Raphinha_avatar.webp",
  "julian-alvarez": "/player-stories/26_superstars/avatar-webp/Julian_Alvarez_avatar.webp",
  "pedri": "/player-stories/26_superstars/avatar-webp/Pedri_avatar.webp",
  "florian-wirtz": "/player-stories/26_superstars/avatar-webp/Florian_Wirtz_avatar.webp",
  "son-heungmin": "/player-stories/26_superstars/avatar-webp/Son_Heungmin_avatar.webp",
  "lamine-yamal": "/player-stories/26_superstars/avatar-webp/Lamine_Yamal_avatar.webp",
  "enzo-fernandez": "/player-stories/26_superstars/avatar-webp/Enzo_Fernandez_avatar.webp",
  "luis-diaz": "/player-stories/26_superstars/avatar-webp/Luis_Diaz_avatar.webp",
  "ousmane-dembele": "/player-stories/26_superstars/avatar-webp/Ousmane_Dembele_avatar.webp",
  "sadio-mane": "/player-stories/26_superstars/avatar-webp/Sadio_Mane_avatar.webp",
  "riyad-mahrez": "/player-stories/26_superstars/avatar-webp/Riyad_Mahrez_avatar.webp",
  "moises-caicedo": "/player-stories/26_superstars/avatar-webp/Moises_Caicedo_avatar.webp",
  "michael-olise": "/player-stories/26_superstars/avatar-webp/Michael_Olise_avatar.webp",
  "christian-pulisic": "/player-stories/26_superstars/avatar-webp/Christian_Pulisic_avatar.webp",
  "kaoru-mitoma": "https://media.api-sports.io/football/players/2911.png",
};

export function getPlayerAvatar(playerId: string | null | undefined, players: UserPreferencePlayer[] = preferencePlayers) {
  if (!playerId) return preferencePlayers[0].photo!;
  const player = players.find((item) => item.id === playerId);
  return player?.photo || player?.avatar || LEGACY_PLAYER_PHOTOS[playerId] || preferencePlayers[0].photo!;
}

type OfficialSquadsData = {
  squads?: Record<string, {
    teamName?: string;
    players?: Array<{
      number?: number;
      position?: string;
      name?: string;
      officialName?: string;
      apiFootballId?: number | null;
    }>;
  }>;
};

function buildOfficialPreferenceCatalog() {
  const data = officialSquadsData as OfficialSquadsData;
  const squads = data.squads ?? {};
  const teams: UserPreferenceTeam[] = [];
  const players: UserPreferencePlayer[] = [];

  for (const [teamCode, squad] of Object.entries(squads)) {
    const teamName = squad.teamName?.trim() || teamCode;
    teams.push({
      id: teamCode,
      name: teamName,
      region: teamCode,
      logo: `/team-covers/fifa/${slugifyTeam(teamName)}.webp`,
    });

    for (const player of squad.players ?? []) {
      const apiFootballId = player.apiFootballId ? String(player.apiFootballId) : "";
      const name = player.name?.trim() || player.officialName?.trim();
      if (!name) continue;
      players.push({
        id: apiFootballId || `${teamCode}-${player.number || slugifyTeam(name)}`,
        name,
        team: teamName,
        position: normalizePosition(player.position),
        photo: apiFootballId ? getApiSportsPlayerPhoto(apiFootballId) : undefined,
      });
    }
  }

  return {
    teams: teams.sort((a, b) => (a.region || a.name).localeCompare(b.region || b.name)),
    players: players.sort((a, b) => (a.team || "").localeCompare(b.team || "") || a.name.localeCompare(b.name)),
  };
}

function normalizePosition(position: string | undefined) {
  return {
    GK: "Goalkeeper",
    DF: "Defender",
    MF: "Midfielder",
    FW: "Forward",
  }[position || ""] || position || "Player";
}

function slugifyTeam(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
