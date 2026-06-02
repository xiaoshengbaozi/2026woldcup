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

export const preferencePlayers: UserPreferencePlayer[] = [
  { id: "154", name: "Lionel Messi", team: "阿根廷", position: "Forward", photo: "https://media.api-sports.io/football/players/154.png" },
  { id: "278", name: "Kylian Mbappe", team: "法国", position: "Forward", photo: "https://media.api-sports.io/football/players/278.png" },
  { id: "762", name: "Vinicius Junior", team: "巴西", position: "Forward", photo: "https://media.api-sports.io/football/players/762.png" },
  { id: "386828", name: "Lamine Yamal", team: "西班牙", position: "Forward", photo: "https://media.api-sports.io/football/players/386828.png" },
  { id: "1100", name: "Erling Haaland", team: "挪威", position: "Forward", photo: "https://media.api-sports.io/football/players/1100.png" },
];

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
  teams: preferenceTeams,
  players: preferencePlayers,
  matches: preferenceMatches,
};

const LEGACY_PLAYER_PHOTOS: Record<string, string> = {
  "lionel-messi": "https://media.api-sports.io/football/players/154.png",
  "kylian-mbappe": "https://media.api-sports.io/football/players/278.png",
  "vinicius-junior": "https://media.api-sports.io/football/players/762.png",
  "jude-bellingham": "https://media.api-sports.io/football/players/1463.png",
  "kaoru-mitoma": "https://media.api-sports.io/football/players/2911.png",
};

export function getPlayerAvatar(playerId: string | null | undefined, players: UserPreferencePlayer[] = preferencePlayers) {
  if (!playerId) return preferencePlayers[0].photo!;
  const player = players.find((item) => item.id === playerId);
  return player?.photo || player?.avatar || LEGACY_PLAYER_PHOTOS[playerId] || preferencePlayers[0].photo!;
}
