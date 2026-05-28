import type { CountryData, HistoryPoint } from "@/types/country";
import type { ChartEvent } from "@/types/events";

// 48 World Cup 2026 qualified teams with centroids
const TEAMS: Array<{
  code: string;
  name: string;
  nameCn: string;
  emoji: string;
  centroid: [number, number];
}> = [
  { code: "MEX", name: "Mexico", nameCn: "墨西哥", emoji: "🇲🇽", centroid: [-102.55, 23.63] },
  { code: "USA", name: "United States", nameCn: "美国", emoji: "🇺🇸", centroid: [-95.71, 37.09] },
  { code: "CAN", name: "Canada", nameCn: "加拿大", emoji: "🇨🇦", centroid: [-106.35, 56.13] },
  { code: "BRA", name: "Brazil", nameCn: "巴西", emoji: "🇧🇷", centroid: [-51.93, -14.24] },
  { code: "ARG", name: "Argentina", nameCn: "阿根廷", emoji: "🇦🇷", centroid: [-63.62, -38.42] },
  { code: "COL", name: "Colombia", nameCn: "哥伦比亚", emoji: "🇨🇴", centroid: [-74.30, 4.57] },
  { code: "URU", name: "Uruguay", nameCn: "乌拉圭", emoji: "🇺🇾", centroid: [-55.77, -32.52] },
  { code: "ECU", name: "Ecuador", nameCn: "厄瓜多尔", emoji: "🇪🇨", centroid: [-78.18, -1.83] },
  { code: "PAR", name: "Paraguay", nameCn: "巴拉圭", emoji: "🇵🇾", centroid: [-58.44, -23.44] },
  { code: "PER", name: "Peru", nameCn: "秘鲁", emoji: "🇵🇪", centroid: [-75.02, -9.19] },
  { code: "CHI", name: "Chile", nameCn: "智利", emoji: "🇨🇱", centroid: [-71.54, -35.68] },
  { code: "FRA", name: "France", nameCn: "法国", emoji: "🇫🇷", centroid: [2.21, 46.23] },
  { code: "ENG", name: "England", nameCn: "英格兰", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", centroid: [-1.17, 52.36] },
  { code: "ESP", name: "Spain", nameCn: "西班牙", emoji: "🇪🇸", centroid: [-3.70, 40.46] },
  { code: "GER", name: "Germany", nameCn: "德国", emoji: "🇩🇪", centroid: [10.45, 51.17] },
  { code: "ITA", name: "Italy", nameCn: "意大利", emoji: "🇮🇹", centroid: [12.57, 41.87] },
  { code: "POR", name: "Portugal", nameCn: "葡萄牙", emoji: "🇵🇹", centroid: [-8.22, 39.40] },
  { code: "NED", name: "Netherlands", nameCn: "荷兰", emoji: "🇳🇱", centroid: [5.29, 52.13] },
  { code: "BEL", name: "Belgium", nameCn: "比利时", emoji: "🇧🇪", centroid: [4.47, 50.50] },
  { code: "CRO", name: "Croatia", nameCn: "克罗地亚", emoji: "🇭🇷", centroid: [15.20, 45.10] },
  { code: "DEN", name: "Denmark", nameCn: "丹麦", emoji: "🇩🇰", centroid: [9.50, 56.26] },
  { code: "SUI", name: "Switzerland", nameCn: "瑞士", emoji: "🇨🇭", centroid: [8.23, 46.82] },
  { code: "AUT", name: "Austria", nameCn: "奥地利", emoji: "🇦🇹", centroid: [14.55, 47.52] },
  { code: "SRB", name: "Serbia", nameCn: "塞尔维亚", emoji: "🇷🇸", centroid: [20.83, 44.02] },
  { code: "POL", name: "Poland", nameCn: "波兰", emoji: "🇵🇱", centroid: [19.15, 51.92] },
  { code: "UKR", name: "Ukraine", nameCn: "乌克兰", emoji: "🇺🇦", centroid: [31.17, 48.38] },
  { code: "CZE", name: "Czech Republic", nameCn: "捷克", emoji: "🇨🇿", centroid: [15.47, 49.82] },
  { code: "TUR", name: "Turkey", nameCn: "土耳其", emoji: "🇹🇷", centroid: [35.24, 38.96] },
  { code: "JPN", name: "Japan", nameCn: "日本", emoji: "🇯🇵", centroid: [138.25, 36.20] },
  { code: "KOR", name: "South Korea", nameCn: "韩国", emoji: "🇰🇷", centroid: [127.77, 35.91] },
  { code: "AUS", name: "Australia", nameCn: "澳大利亚", emoji: "🇦🇺", centroid: [133.78, -25.27] },
  { code: "IRN", name: "Iran", nameCn: "伊朗", emoji: "🇮🇷", centroid: [53.69, 32.43] },
  { code: "SAU", name: "Saudi Arabia", nameCn: "沙特阿拉伯", emoji: "🇸🇦", centroid: [45.08, 23.89] },
  { code: "QAT", name: "Qatar", nameCn: "卡塔尔", emoji: "🇶🇦", centroid: [51.18, 25.35] },
  { code: "MAR", name: "Morocco", nameCn: "摩洛哥", emoji: "🇲🇦", centroid: [-7.09, 31.79] },
  { code: "SEN", name: "Senegal", nameCn: "塞内加尔", emoji: "🇸🇳", centroid: [-14.50, 14.50] },
  { code: "NGA", name: "Nigeria", nameCn: "尼日利亚", emoji: "🇳🇬", centroid: [8.68, 9.08] },
  { code: "GHA", name: "Ghana", nameCn: "加纳", emoji: "🇬🇭", centroid: [-1.02, 7.95] },
  { code: "CMR", name: "Cameroon", nameCn: "喀麦隆", emoji: "🇨🇲", centroid: [12.35, 7.37] },
  { code: "TUN", name: "Tunisia", nameCn: "突尼斯", emoji: "🇹🇳", centroid: [9.54, 33.89] },
  { code: "DZA", name: "Algeria", nameCn: "阿尔及利亚", emoji: "🇩🇿", centroid: [1.66, 28.03] },
  { code: "EGY", name: "Egypt", nameCn: "埃及", emoji: "🇪🇬", centroid: [30.80, 26.82] },
  { code: "CIV", name: "Ivory Coast", nameCn: "科特迪瓦", emoji: "🇨🇮", centroid: [-5.55, 7.54] },
  { code: "NZL", name: "New Zealand", nameCn: "新西兰", emoji: "🇳🇿", centroid: [174.89, -40.90] },
  { code: "JAM", name: "Jamaica", nameCn: "牙买加", emoji: "🇯🇲", centroid: [-77.30, 18.11] },
  { code: "HON", name: "Honduras", nameCn: "洪都拉斯", emoji: "🇭🇳", centroid: [-87.24, 15.20] },
  { code: "CRC", name: "Costa Rica", nameCn: "哥斯达黎加", emoji: "🇨🇷", centroid: [-83.75, 9.75] },
  { code: "PAN", name: "Panama", nameCn: "巴拿马", emoji: "🇵🇦", centroid: [-80.78, 8.54] },
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateCountryData(team: typeof TEAMS[0], baseProb: number): CountryData {
  const jitter = randomBetween(-0.45, 0.45);
  const prob = Math.max(0.1, Math.min(99.9, baseProb + jitter));

  return {
    countryCode: team.code,
    countryName: team.nameCn,
    flagEmoji: team.emoji,
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

// Assign base probabilities (top teams higher)
const BASE_PROBS: Record<string, number> = {
  ESP: 17, FRA: 17, ENG: 11, POR: 10, BRA: 9, ARG: 8,
  GER: 5, NED: 4, JPN: 2, COL: 2, BEL: 2,
  MAR: 1.4, SUI: 1.3, USA: 1.2, URU: 1.1, MEX: 1.0,
  ECU: 1.0, CRO: 1.0, TUR: 1.0, SEN: 0.9, AUT: 0.8,
  CAN: 0.7, KOR: 0.7, GHA: 0.6, PAR: 0.6, CIV: 0.5,
  CZE: 0.5, EGY: 0.5, IRN: 0.5, DZA: 0.5, TUN: 0.4,
  AUS: 0.4, NZL: 0.3, QAT: 0.3, SAU: 0.3, ITA: 0.2,
  PER: 0.2, DEN: 0.2, SRB: 0.2, POL: 0.2, UKR: 0.2,
  CMR: 0.2, JAM: 0.2, HON: 0.2, CRC: 0.2, PAN: 0.2,
  CHI: 0.2,
};

export function generateMockCountries(): CountryData[] {
  return TEAMS.map((team) =>
    generateCountryData(team, BASE_PROBS[team.code] ?? 0.1)
  );
}

export function generateMockHistory(
  countryCode: string,
  points: number = 144
): HistoryPoint[] {
  const now = Date.now();
  const interval = (24 * 60 * 60 * 1000) / points; // spread over 24h
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
    const affected = TEAMS.slice(
      Math.floor(Math.random() * TEAMS.length),
      Math.floor(Math.random() * TEAMS.length) + 2
    ).map((t) => t.code);

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

// Initialize store with mock data
export function injectMockData() {
  const { useStore } = require("@/lib/store");
  const store = useStore.getState();

  const countries = generateMockCountries();
  store.updateCountries(countries);

  // Generate history for each country
  for (const c of countries) {
    store.setHistory(c.countryCode, generateMockHistory(c.countryCode));
  }

  store.setEvents(generateMockEvents());
  store.recomputeRankings();
  store.setStatus("connected");

  console.log(`[Mock] Injected ${countries.length} countries with history and events`);
}
