// Shared types — mirrors client-side types/country.ts

export interface CountryData {
  countryCode: string;
  countryName: string;
  flagEmoji: string;
  yesPrice: number;
  impliedProbability: number;
  lastUpdated: number;
  delta1m: number;
  delta5m: number;
  delta1h: number;
  delta24h: number;
  volume24h: number;
  volume5m: number;
  spread: number;
  liquidity: number;
  marketCount: number;
  centroid: [number, number];
}

export interface HistoryPoint {
  timestamp: number;
  probability: number;
  volume: number;
}

export interface ChartEvent {
  id: string;
  timestamp: number;
  type: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  affectedCountries: string[];
  source: "manual" | "auto" | "polymarket";
}

export interface SnapshotMessage {
  type: "snapshot";
  timestamp: number;
  countries: CountryData[];
  events: ChartEvent[];
  history: Record<string, HistoryPoint[]>;
}

export interface DeltaMessage {
  type: "delta";
  timestamp: number;
  sequenceNumber: number;
  updates: Array<{
    countryCode: string;
    yesPrice: number;
    impliedProbability: number;
    delta1m: number;
    delta5m: number;
    delta1h: number;
    delta24h: number;
    volume24h: number;
    volume5m: number;
    spread: number;
    historyPoint: HistoryPoint;
  }>;
  newEvents: ChartEvent[];
}

export interface MatchLineMarket {
  id: string;
  question: string;
  slug: string;
  marketType: string;
  label: string;
  yesPrice: number;
  noPrice: number;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number | null;
  volume24h: number;
  liquidity: number;
}

export interface MatchLineEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  startTime: number;
  homeTeam: string;
  awayTeam: string;
  volume24h: number;
  liquidity: number;
  markets: MatchLineMarket[];
}

export interface MatchLinesResponse {
  type: "match_lines";
  timestamp: number;
  count: number;
  events: MatchLineEvent[];
}
