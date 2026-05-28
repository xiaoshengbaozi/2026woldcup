export type EventType =
  | "tournament"
  | "injury"
  | "volume_spike"
  | "price_shock"
  | "threshold"
  | "news"
  | "social";

export type EventSeverity = "low" | "medium" | "high";

export interface ChartEvent {
  id: string;
  timestamp: number;
  type: EventType;
  title: string;
  description: string;
  severity: EventSeverity;
  affectedCountries: string[];
  source: "manual" | "auto" | "polymarket";
  probabilityImpact?: Array<{
    countryCode: string;
    direction: "up" | "down";
    magnitude: number;
  }>;
}
