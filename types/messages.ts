import type { CountryData, HistoryPoint } from "./country";
import type { ChartEvent } from "./events";

// Server → Client
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

export interface HistoryResponseMessage {
  type: "history_response";
  countryCode: string;
  resolution: "raw" | "1m" | "1h" | "1d";
  data: HistoryPoint[];
}

// Client → Server
export interface SubscribeMessage {
  type: "subscribe";
  clientId: string;
}

export interface HistoryRequestMessage {
  type: "history_request";
  countryCode: string;
  resolution: "raw" | "1m" | "1h" | "1d";
  from: number;
  to: number;
}

export type ServerMessage = SnapshotMessage | DeltaMessage | HistoryResponseMessage;
export type ClientMessage = SubscribeMessage | HistoryRequestMessage;
