import officialSquadsData from "@/data/fifa-official-squads.json";

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
  "lionel-messi": "/player-stories/26_superstars/Lionel_Messi_main.webp",
  "kylian-mbappe": "/player-stories/26_superstars/Kylian_Mbappe_main.webp",
  "erling-haaland": "/player-stories/26_superstars/Erling_Haaland_main.webp",
  "vinicius-junior": "/player-stories/26_superstars/Vinicius_Junior_main.webp",
  "jude-bellingham": "/player-stories/26_superstars/Jude_Bellingham_main.webp",
  "harry-kane": "/player-stories/26_superstars/Harry_Kane_main.webp",
  "cristiano-ronaldo": "/player-stories/26_superstars/Cristiano_Ronaldo_main.webp",
  "mohamed-salah": "/player-stories/26_superstars/Mohamed_Salah_main.webp",
  "kevin-de-bruyne": "/player-stories/26_superstars/Kevin_De_Bruyne_main.webp",
  "bruno-fernandes": "/player-stories/26_superstars/Bruno_Fernandes_main.webp",
  "federico-valverde": "/player-stories/26_superstars/Federico_Valverde_main.webp",
  "luka-modric": "/player-stories/26_superstars/Luka_Modric_main.webp",
  "raphinha": "/player-stories/26_superstars/Raphinha_main.webp",
  "julian-alvarez": "/player-stories/26_superstars/Julian_Alvarez_main.webp",
  "pedri": "/player-stories/26_superstars/Pedri_main.webp",
  "florian-wirtz": "/player-stories/26_superstars/Florian_Wirtz_main.webp",
  "son-heungmin": "/player-stories/26_superstars/Son_Heungmin_main.webp",
  "lamine-yamal": "/player-stories/26_superstars/Lamine_Yamal_main.webp",
  "enzo-fernandez": "/player-stories/26_superstars/Enzo_Fernandez_main.webp",
  "luis-diaz": "/player-stories/26_superstars/Luis_Diaz_main.webp",
  "ousmane-dembele": "/player-stories/26_superstars/Ousmane_Dembele_main.webp",
  "sadio-mane": "/player-stories/26_superstars/Sadio_Mane_main.webp",
  "riyad-mahrez": "/player-stories/26_superstars/Riyad_Mahrez_main.webp",
  "moises-caicedo": "/player-stories/26_superstars/Moises_Caicedo_main.webp",
  "michael-olise": "/player-stories/26_superstars/Michael_Olise_main.webp",
  "christian-pulisic": "/player-stories/26_superstars/Christian_Pulisic_main.webp",
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
      logo: `/team-covers/fifa/${slugifyTeam(teamName)}.png`,
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
        photo: apiFootballId ? `https://media.api-sports.io/football/players/${apiFootballId}.png` : undefined,
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
