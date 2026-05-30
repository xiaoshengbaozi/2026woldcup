import type { MatchLineEvent, MatchLineMarket, MatchLinesResponse } from "./types";

const WORLD_CUP_SERIES_ID = "11433";
const GAMMA_EVENTS_URL = `https://gamma-api.polymarket.com/events?series_id=${WORLD_CUP_SERIES_ID}&limit=100&offset=0`;
const REFRESH_INTERVAL_MS = 60_000;

interface GammaSportsEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  endDate: string;
  volume24hr?: number;
  liquidity?: number;
  liquidityClob?: number;
  markets?: GammaSportsMarket[];
}

interface GammaSportsMarket {
  id: string;
  question: string;
  slug: string;
  sportsMarketType?: string;
  groupItemTitle?: string;
  outcomePrices?: string;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  volume24hr?: number;
  liquidity?: string;
  liquidityClob?: number;
  active?: boolean;
  closed?: boolean;
}

export interface MatchLinesService {
  start: () => void;
  stop: () => void;
  refreshNow: () => Promise<void>;
  getLatest: () => MatchLinesResponse;
}

export function createMatchLinesService(): MatchLinesService {
  let latest: MatchLinesResponse = {
    type: "match_lines",
    timestamp: Date.now(),
    count: 0,
    events: [],
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  let refreshing = false;

  async function refreshNow() {
    if (refreshing) return;
    refreshing = true;
    try {
      const response = await fetch(GAMMA_EVENTS_URL);
      if (!response.ok) {
        throw new Error(`Gamma match lines request failed: ${response.status} ${response.statusText}`);
      }

      const events = ((await response.json()) as GammaSportsEvent[])
        .map(normalizeEvent)
        .filter((event): event is MatchLineEvent => Boolean(event))
        .sort((a, b) => a.startTime - b.startTime);

      latest = {
        type: "match_lines",
        timestamp: Date.now(),
        count: events.length,
        events,
      };

      console.log(`[MatchLines] Loaded ${events.length} World Cup game lines.`);
    } catch (err) {
      console.error("[MatchLines] Refresh failed:", err);
    } finally {
      refreshing = false;
    }
  }

  return {
    start() {
      void refreshNow();
      if (!timer) {
        timer = setInterval(() => void refreshNow(), REFRESH_INTERVAL_MS);
      }
    },

    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },

    refreshNow,

    getLatest() {
      return latest;
    },
  };
}

function normalizeEvent(event: GammaSportsEvent): MatchLineEvent | null {
  const teams = parseTitle(event.title);
  if (!teams) return null;

  const markets = (event.markets ?? [])
    .filter((market) => market.active !== false && !market.closed)
    .map((market) => normalizeMarket(market, event.title))
    .filter((market): market is MatchLineMarket => Boolean(market));

  const moneyline = markets.filter((market) => market.marketType === "moneyline");
  if (moneyline.length < 3) return null;

  return {
    id: event.id,
    ticker: event.ticker,
    slug: event.slug,
    title: event.title,
    startTime: new Date(event.endDate).getTime(),
    homeTeam: teams.homeTeam,
    awayTeam: teams.awayTeam,
    volume24h: parseNumber(event.volume24hr),
    liquidity: parseNumber(event.liquidityClob, parseNumber(event.liquidity)),
    markets: sortMarkets(markets, teams.homeTeam, teams.awayTeam),
  };
}

function normalizeMarket(market: GammaSportsMarket, title: string): MatchLineMarket | null {
  const prices = parseJsonArray(market.outcomePrices);
  const yesPrice = parseNumber(prices[0]);
  const noPrice = parseNumber(prices[1], Math.max(0, 1 - yesPrice));
  if (yesPrice <= 0 && noPrice <= 0) return null;

  return {
    id: market.id,
    question: market.question,
    slug: market.slug,
    marketType: market.sportsMarketType ?? "unknown",
    label: normalizeLabel(market.groupItemTitle || market.question, title),
    yesPrice: toPercent(yesPrice),
    noPrice: toPercent(noPrice),
    bestBid: nullablePercent(market.bestBid),
    bestAsk: nullablePercent(market.bestAsk),
    spread: nullablePercent(market.spread),
    volume24h: parseNumber(market.volume24hr),
    liquidity: parseNumber(market.liquidityClob, parseNumber(market.liquidity)),
  };
}

function parseTitle(title: string) {
  const [homeTeam, awayTeam] = title.split(/\s+vs\.?\s+/i).map((part) => part.trim());
  if (!homeTeam || !awayTeam) return null;
  return { homeTeam, awayTeam };
}

function normalizeLabel(label: string, title: string) {
  if (label.toLowerCase().startsWith("draw")) return "Draw";
  return label.replace(` (${title})`, "").trim();
}

function sortMarkets(markets: MatchLineMarket[], homeTeam: string, awayTeam: string) {
  const orderScore = (market: MatchLineMarket) => {
    if (market.marketType !== "moneyline") return 10;
    if (sameTeam(market.label, homeTeam)) return 0;
    if (market.label === "Draw") return 1;
    if (sameTeam(market.label, awayTeam)) return 2;
    return 3;
  };

  return [...markets].sort((a, b) => orderScore(a) - orderScore(b) || b.yesPrice - a.yesPrice);
}

function sameTeam(a: string, b: string) {
  return normalizeTeamName(a) === normalizeTeamName(b);
}

function normalizeTeamName(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function parseJsonArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPercent(decimal: number) {
  return Math.round(decimal * 10_000) / 100;
}

function nullablePercent(value: unknown) {
  const parsed = parseNumber(value, NaN);
  return Number.isFinite(parsed) ? toPercent(parsed) : null;
}
