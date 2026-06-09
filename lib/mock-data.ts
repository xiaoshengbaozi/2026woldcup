import type { CountryData, HistoryPoint } from "@/types/country";
import type { ChartEvent } from "@/types/events";
import {
  WORLD_CUP_2026_QUALIFIED_TEAMS,
  type WorldCupQualifiedTeam,
} from "@/lib/world-cup-2026";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateCountryData(team: WorldCupQualifiedTeam, baseProb: number): CountryData {
  const jitter = randomBetween(-0.45, 0.45);
  const prob = Math.max(0.1, Math.min(99.9, baseProb + jitter));

  return {
    countryCode: team.code,
    countryName: team.nameCn,
    flagEmoji: team.flagEmoji,
    yesPrice: Math.round(prob * 100) / 100,
    impliedProbability: Math.round(prob * 100) / 100,
    lastUpdated: Date.now(),
    delta1m: randomBetween(-0.5, 0.5),
    delta5m: randomBetween(-1, 1),
    delta1h: randomBetween(-2, 2),
    delta24h: randomBetween(-5, 5),
    volume24h: Math.round(randomBetween(50000, 5000000)),
    volume5m: Math.round(randomBetween(1000, 100000)),
    spread: Math.round(randomBetween(0.5, 3) * 100) / 100,
    liquidity: Math.round(randomBetween(10000, 500000)),
    marketCount: Math.round(randomBetween(1, 5)),
    centroid: team.centroid,
  };
}

const BASE_PROBS: Record<string, number> = {
  ESP: 17, FRA: 17, ENG: 11, POR: 10, BRA: 9, ARG: 8,
  GER: 5, NED: 4, BEL: 2, COL: 2, JPN: 2,
  MAR: 1.4, SUI: 1.3, USA: 1.2, URU: 1.1, MEX: 1.0,
  ECU: 1.0, CRO: 1.0, TUR: 1.0, SEN: 0.9, AUT: 0.8,
  CAN: 0.7, KOR: 0.7, NOR: 0.7, GHA: 0.6, PAR: 0.6,
  CIV: 0.5, CZE: 0.5, EGY: 0.5, IRN: 0.5, DZA: 0.5,
  TUN: 0.4, AUS: 0.4, QAT: 0.3, SAU: 0.3, NZL: 0.3,
  SCO: 0.3, SWE: 0.3, UZB: 0.3, BIH: 0.2, COD: 0.2,
  CPV: 0.2, CUW: 0.2, HAI: 0.2, IRQ: 0.2, JOR: 0.2,
  PAN: 0.2, RSA: 0.2,
};

export function generateMockCountries(): CountryData[] {
  return WORLD_CUP_2026_QUALIFIED_TEAMS.map((team) =>
    generateCountryData(team, BASE_PROBS[team.code] ?? 0.1)
  );
}

export function generateMockHistory(
  countryCode: string,
  points: number = 144
): HistoryPoint[] {
  const now = Date.now();
  const interval = (24 * 60 * 60 * 1000) / points;
  const base = BASE_PROBS[countryCode] ?? 1;
  const history: HistoryPoint[] = [];
  let current = base;

  for (let i = 0; i < points; i++) {
    current += randomBetween(-0.3, 0.3);
    current = Math.max(0.01, Math.min(99.99, current));
    history.push({
      timestamp: now - (points - i) * interval,
      probability: Math.round(current * 100) / 100,
      volume: Math.round(randomBetween(1000, 200000)),
    });
  }

  return history;
}

export function generateMockEvents(): ChartEvent[] {
  const eventTypes: ChartEvent["type"][] = [
    "tournament", "injury", "volume_spike", "price_shock", "news",
  ];
  const now = Date.now();
  const events: ChartEvent[] = [];

  for (let i = 0; i < 15; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const start = Math.floor(Math.random() * WORLD_CUP_2026_QUALIFIED_TEAMS.length);
    const affected = WORLD_CUP_2026_QUALIFIED_TEAMS.slice(start, start + 2).map((team) => team.code);

    events.push({
      id: `evt-${i}`,
      timestamp: now - Math.floor(randomBetween(0, 7 * 24 * 60 * 60 * 1000)),
      type,
      title: getEventTitle(type),
      description: getEventDescription(type),
      severity: (["low", "medium", "high"] as const)[
        Math.floor(Math.random() * 3)
      ],
      affectedCountries: affected,
      source: "auto",
    });
  }

  return events.sort((a, b) => a.timestamp - b.timestamp);
}

function getEventTitle(type: ChartEvent["type"]): string {
  const titles: Record<string, string[]> = {
    tournament: ["Group draw completed", "Seeding announced", "Venue confirmed"],
    injury: ["Key player injured", "Star midfielder doubtful", "Captain ruled out"],
    volume_spike: ["Volume surge detected", "Unusual trading activity", "Market interest spike"],
    price_shock: ["Odds shift sharply", "Price shock event", "Sudden probability jump"],
    news: ["Manager change rumored", "Transfer news", "Preparation update"],
  };
  const options = titles[type] ?? ["Event"];
  return options[Math.floor(Math.random() * options.length)];
}

function getEventDescription(type: ChartEvent["type"]): string {
  return `Automated detection: ${type} event recorded in the prediction market.`;
}

export function injectMockData() {
  const { useStore } = require("@/lib/store");
  const store = useStore.getState();

  const countries = generateMockCountries();
  store.updateCountries(countries);

  for (const country of countries) {
    store.setHistory(country.countryCode, generateMockHistory(country.countryCode));
  }

  store.setEvents(generateMockEvents());
  store.recomputeRankings();
  store.setStatus("connected");
  store.setDataSource("mock");

  console.log(`[Mock] Injected ${countries.length} countries with history and events`);
}
