import type { TeamProfile } from "@/types/team-profile";

const playoff_2: TeamProfile = {
  countryCode: "??",
  fifaCode: "PO2",
  nameCn: "附加赛胜者2",
  nameEn: "Playoff Winner 2",
  confederation: "TBD",
  fifaRanking: 999,
  flagEmoji: "\u{1F534}",

  heroTags: ["洲际附加赛胜者"],
  heroStats: [
    { value: "待定", label: "最佳名次" },
  ],
  heroBanner: "/team-profiles/playoff-2/hero-banner.svg",

  timeline: [
    { year: 2026, host: "美国/加拿大/墨西哥", result: "参赛中", highlight: true },
  ],

  infoCards: [
    { label: "大洲", value: "待定", desc: "洲际附加赛胜者" },
  ],

  stories: [
    {
      icon: "\u{2753}", title: "附加赛待定",
      body: "该名额将由洲际附加赛决出。",
    },
  ],

  keyPlayers: [],
};

export default playoff_2;
