import messiImage from "@/assets/players/ARG-argentina/headshots/lionel-messi.webp";
import mbappeImage from "@/assets/players/FRA-france/headshots/kylian-mbappe.webp";
import bellinghamImage from "@/assets/players/ENG-england/headshots/jude-bellingham.webp";
import viniciusImage from "@/assets/players/BRA-brazil/headshots/vinicius-junior.webp";
import mitomaImage from "@/assets/players/JPN-japan/headshots/kaoru-mitoma.webp";

export const preferenceTeams = [
  { id: "ARG", name: "阿根廷", region: "CONMEBOL" },
  { id: "BRA", name: "巴西", region: "CONMEBOL" },
  { id: "FRA", name: "法国", region: "UEFA" },
  { id: "ENG", name: "英格兰", region: "UEFA" },
  { id: "JPN", name: "日本", region: "AFC" },
];

export const preferencePlayers = [
  { id: "lionel-messi", name: "Lionel Messi", team: "阿根廷", position: "Forward", avatar: messiImage },
  { id: "kylian-mbappe", name: "Kylian Mbappe", team: "法国", position: "Forward", avatar: mbappeImage },
  { id: "jude-bellingham", name: "Jude Bellingham", team: "英格兰", position: "Midfielder", avatar: bellinghamImage },
  { id: "vinicius-junior", name: "Vinicius Junior", team: "巴西", position: "Forward", avatar: viniciusImage },
  { id: "kaoru-mitoma", name: "Kaoru Mitoma", team: "日本", position: "Forward", avatar: mitomaImage },
];

export const preferenceMatches = [
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
    title: "决赛 · 纽约新泽西",
    stage: "决赛",
    startsAt: "2026-07-19T15:00:00-04:00",
  },
];

export function getPlayerAvatar(playerId: string | null | undefined) {
  return preferencePlayers.find((player) => player.id === playerId)?.avatar ?? preferencePlayers[0].avatar;
}
