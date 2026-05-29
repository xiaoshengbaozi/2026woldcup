export type Team = {
  badge: string;
  badgeType: "code" | "image";
  image: string;
  name: string;
};

export type Match = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  start: Date;
  end: Date | null;
  geo: {
    lat: number;
    lon: number;
  } | null;
  stage: string;
  weather: string;
};

export type DetailRow = {
  icon: string;
  text: string;
  type: "venue" | "meta";
};

// Match Detail Extended Types

export type MatchStatus = "not_started" | "live" | "halftime" | "finished";

export type MatchOdds = {
  homeWin: number;
  draw: number;
  awayWin: number;
  history: OddsPoint[];
};

export type OddsPoint = {
  timestamp: number;
  homeWin: number;
  draw: number;
  awayWin: number;
};

export type PlayerPosition =
  | "GK" | "CB" | "LB" | "RB"
  | "CDM" | "CM" | "CAM" | "LM" | "RM"
  | "LW" | "RW" | "LF" | "RF"
  | "ST" | "CF";

export type LineupPlayer = {
  id: string;
  name: string;
  number: number;
  position: PlayerPosition;
  isStarter: boolean;
  country: string;
  club: string;
  age: number;
  rating?: number;
  isCaptain?: boolean;
  injury?: boolean;
  yellowCards?: number;
};

export type MatchLineup = {
  formation: string;
  players: LineupPlayer[];
};

export type MatchEventType =
  | "goal" | "own_goal" | "penalty_goal" | "missed_penalty"
  | "yellow_card" | "second_yellow" | "red_card"
  | "substitution" | "var_review" | "kickoff" | "halftime" | "fulltime";

export type MatchEvent = {
  id: string;
  minute: number;
  addedTime?: number;
  type: MatchEventType;
  player?: string;
  playerOut?: string;
  team: "home" | "away";
  description?: string;
};

export type MatchStats = {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  xG: [number, number];
  passAccuracy: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  offsides: [number, number];
};

export type MatchNewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  image?: string;
  publishedAt: number;
  category: "preview" | "lineup" | "injury" | "analysis" | "postmatch";
};

export type HeadToHeadMatch = {
  date: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
};

export type MatchDetail = {
  match: Match;
  slug: string;
  homeTeamCode: string;
  awayTeamCode: string;
  status: MatchStatus;
  score: { home: number; away: number };
  odds: MatchOdds;
  homeLineup: MatchLineup;
  awayLineup: MatchLineup;
  events: MatchEvent[];
  stats: MatchStats;
  news: MatchNewsItem[];
  headToHead: HeadToHeadMatch[];
};
