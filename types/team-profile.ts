export interface WorldCupAppearance {
  year: number;
  host: string;
  result: string;
  highlight?: boolean;
  note?: string;
  momentImg?: string;
}

export interface TeamInfoCard {
  label: string;
  value: string;
  desc: string;
  highlight?: boolean;
}

export interface TeamStory {
  icon: string;
  title: string;
  body: string;
  coverImg?: string;
}

export interface KeyPlayer {
  number: number;
  name: string;
  position: string;
  club: string;
  photo?: string;
}

export interface GalleryItem {
  src: string;
  caption: string;
  credit?: string;
}

export interface TeamProfile {
  countryCode: string;
  fifaCode: string;
  nameCn: string;
  nameEn: string;
  confederation: string;
  fifaRanking: number;
  flagEmoji: string;
  heroTags: string[];
  heroStats: { value: string | number; label: string }[];
  heroBanner?: string;
  timeline: WorldCupAppearance[];
  infoCards: TeamInfoCard[];
  stories: TeamStory[];
  quote?: { text: string; source: string };
  gallery?: GalleryItem[];
  keyPlayers: KeyPlayer[];
}
