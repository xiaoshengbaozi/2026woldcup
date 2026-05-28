export interface CountryData {
  countryCode: string;          // ISO 3166-1 alpha-3: "BRA"
  countryName: string;          // Display: "Brazil"
  flagEmoji: string;            // "🇧🇷"

  // Current market state
  yesPrice: number;             // 0-100 cents
  impliedProbability: number;   // 0-100
  lastUpdated: number;          // Unix ms

  // Computed deltas (signed percentages)
  delta1m: number;
  delta5m: number;
  delta1h: number;
  delta24h: number;

  // Market metrics
  volume24h: number;            // USD
  volume5m: number;
  spread: number;               // Bid-ask in cents
  liquidity: number;            // Order book depth USD
  marketCount: number;          // Active contracts

  // Spatial
  centroid: [number, number];   // [longitude, latitude]
}

export interface HistoryPoint {
  timestamp: number;            // Unix ms
  probability: number;          // 0-100
  volume: number;               // USD at this point
}
