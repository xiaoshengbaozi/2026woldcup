import { EventEmitter } from "events";
import WebSocket from "ws";
import type { CountryData } from "./types";

export interface PolymarketClient extends EventEmitter {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  getCountries: () => CountryData[];
}

const POLYMARKET_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const POLYMARKET_WORLD_CUP_WINNER_EVENT_ID = "30615";
const GAMMA_EVENT_URL = `https://gamma-api.polymarket.com/events/${POLYMARKET_WORLD_CUP_WINNER_EVENT_ID}`;
const CLOB_BOOKS_URL = "https://clob.polymarket.com/books";
const PING_INTERVAL_MS = 10_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

interface TeamMetadata {
  code: string;
  name: string;
  flagEmoji: string;
  centroid: [number, number];
  aliases: string[];
}

interface GammaMarket {
  id: string;
  question: string;
  active?: boolean;
  closed?: boolean;
  enableOrderBook?: boolean;
  clobTokenIds?: string;
  outcomes?: string;
  outcomePrices?: string;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  lastTradePrice?: number;
  volume24hr?: number;
  volume24hrClob?: number;
  liquidity?: string;
  liquidityClob?: number;
}

interface GammaEvent {
  markets?: GammaMarket[];
}

interface MarketBinding {
  tokenId: string;
  marketId: string;
  countryCode: string;
}

interface MarketState {
  binding: MarketBinding;
  country: CountryData;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
}

interface PolymarketMessage {
  event_type: string;
  asset_id?: string;
  bids?: PriceLevel[];
  asks?: PriceLevel[];
  price?: string;
  size?: string;
  timestamp?: string;
  best_bid?: string;
  best_ask?: string;
  spread?: string;
  price_changes?: Array<{
    asset_id: string;
    best_bid?: string;
    best_ask?: string;
  }>;
}

interface PriceLevel {
  price: string;
  size: string;
}

const TEAM_METADATA: TeamMetadata[] = [
  { code: "MEX", name: "Mexico", flagEmoji: "🇲🇽", centroid: [-102.55, 23.63], aliases: ["Mexico"] },
  { code: "USA", name: "United States", flagEmoji: "🇺🇸", centroid: [-95.71, 37.09], aliases: ["USA", "United States"] },
  { code: "CAN", name: "Canada", flagEmoji: "🇨🇦", centroid: [-106.35, 56.13], aliases: ["Canada"] },
  { code: "ARG", name: "Argentina", flagEmoji: "🇦🇷", centroid: [-63.62, -38.42], aliases: ["Argentina"] },
  { code: "BRA", name: "Brazil", flagEmoji: "🇧🇷", centroid: [-51.93, -14.24], aliases: ["Brazil"] },
  { code: "COL", name: "Colombia", flagEmoji: "🇨🇴", centroid: [-74.3, 4.57], aliases: ["Colombia"] },
  { code: "ECU", name: "Ecuador", flagEmoji: "🇪🇨", centroid: [-78.18, -1.83], aliases: ["Ecuador"] },
  { code: "PAR", name: "Paraguay", flagEmoji: "🇵🇾", centroid: [-58.44, -23.44], aliases: ["Paraguay"] },
  { code: "URU", name: "Uruguay", flagEmoji: "🇺🇾", centroid: [-55.77, -32.52], aliases: ["Uruguay"] },
  { code: "JPN", name: "Japan", flagEmoji: "🇯🇵", centroid: [138.25, 36.2], aliases: ["Japan"] },
  { code: "IRN", name: "Iran", flagEmoji: "🇮🇷", centroid: [53.69, 32.43], aliases: ["Iran"] },
  { code: "UZB", name: "Uzbekistan", flagEmoji: "🇺🇿", centroid: [64.59, 41.38], aliases: ["Uzbekistan"] },
  { code: "KOR", name: "South Korea", flagEmoji: "🇰🇷", centroid: [127.77, 35.91], aliases: ["South Korea", "Korea"] },
  { code: "JOR", name: "Jordan", flagEmoji: "🇯🇴", centroid: [36.24, 30.59], aliases: ["Jordan"] },
  { code: "AUS", name: "Australia", flagEmoji: "🇦🇺", centroid: [133.78, -25.27], aliases: ["Australia"] },
  { code: "QAT", name: "Qatar", flagEmoji: "🇶🇦", centroid: [51.18, 25.35], aliases: ["Qatar"] },
  { code: "SAU", name: "Saudi Arabia", flagEmoji: "🇸🇦", centroid: [45.08, 23.89], aliases: ["Saudi Arabia"] },
  { code: "IRQ", name: "Iraq", flagEmoji: "🇮🇶", centroid: [43.68, 33.22], aliases: ["Iraq"] },
  { code: "MAR", name: "Morocco", flagEmoji: "🇲🇦", centroid: [-7.09, 31.79], aliases: ["Morocco"] },
  { code: "TUN", name: "Tunisia", flagEmoji: "🇹🇳", centroid: [9.54, 33.89], aliases: ["Tunisia"] },
  { code: "EGY", name: "Egypt", flagEmoji: "🇪🇬", centroid: [30.8, 26.82], aliases: ["Egypt"] },
  { code: "DZA", name: "Algeria", flagEmoji: "🇩🇿", centroid: [1.66, 28.03], aliases: ["Algeria"] },
  { code: "GHA", name: "Ghana", flagEmoji: "🇬🇭", centroid: [-1.02, 7.95], aliases: ["Ghana"] },
  { code: "CPV", name: "Cape Verde", flagEmoji: "🇨🇻", centroid: [-23.6, 15.1], aliases: ["Cape Verde", "Cabo Verde"] },
  { code: "RSA", name: "South Africa", flagEmoji: "🇿🇦", centroid: [22.94, -30.56], aliases: ["South Africa"] },
  { code: "SEN", name: "Senegal", flagEmoji: "🇸🇳", centroid: [-14.5, 14.5], aliases: ["Senegal"] },
  { code: "CIV", name: "Ivory Coast", flagEmoji: "🇨🇮", centroid: [-5.55, 7.54], aliases: ["Ivory Coast", "Cote d'Ivoire"] },
  { code: "COD", name: "DR Congo", flagEmoji: "🇨🇩", centroid: [23.65, -2.88], aliases: ["DR Congo", "Congo DR"] },
  { code: "NZL", name: "New Zealand", flagEmoji: "🇳🇿", centroid: [174.89, -40.9], aliases: ["New Zealand"] },
  { code: "CUW", name: "Curacao", flagEmoji: "🇨🇼", centroid: [-68.99, 12.17], aliases: ["Curacao", "Curaçao"] },
  { code: "HAI", name: "Haiti", flagEmoji: "🇭🇹", centroid: [-72.29, 18.97], aliases: ["Haiti"] },
  { code: "PAN", name: "Panama", flagEmoji: "🇵🇦", centroid: [-80.78, 8.54], aliases: ["Panama"] },
  { code: "ENG", name: "England", flagEmoji: "🏴", centroid: [-1.17, 52.36], aliases: ["England"] },
  { code: "FRA", name: "France", flagEmoji: "🇫🇷", centroid: [2.21, 46.23], aliases: ["France"] },
  { code: "GER", name: "Germany", flagEmoji: "🇩🇪", centroid: [10.45, 51.17], aliases: ["Germany"] },
  { code: "ESP", name: "Spain", flagEmoji: "🇪🇸", centroid: [-3.7, 40.46], aliases: ["Spain"] },
  { code: "POR", name: "Portugal", flagEmoji: "🇵🇹", centroid: [-8.22, 39.4], aliases: ["Portugal"] },
  { code: "NED", name: "Netherlands", flagEmoji: "🇳🇱", centroid: [5.29, 52.13], aliases: ["Netherlands"] },
  { code: "BEL", name: "Belgium", flagEmoji: "🇧🇪", centroid: [4.47, 50.5], aliases: ["Belgium"] },
  { code: "CRO", name: "Croatia", flagEmoji: "🇭🇷", centroid: [15.2, 45.1], aliases: ["Croatia"] },
  { code: "SUI", name: "Switzerland", flagEmoji: "🇨🇭", centroid: [8.23, 46.82], aliases: ["Switzerland"] },
  { code: "AUT", name: "Austria", flagEmoji: "🇦🇹", centroid: [14.55, 47.52], aliases: ["Austria"] },
  { code: "NOR", name: "Norway", flagEmoji: "🇳🇴", centroid: [8.47, 60.47], aliases: ["Norway"] },
  { code: "SCO", name: "Scotland", flagEmoji: "🏴", centroid: [-4.2, 56.49], aliases: ["Scotland"] },
  { code: "SWE", name: "Sweden", flagEmoji: "🇸🇪", centroid: [18.64, 60.13], aliases: ["Sweden"] },
  { code: "TUR", name: "Turkiye", flagEmoji: "🇹🇷", centroid: [35.24, 38.96], aliases: ["Turkiye", "Turkey"] },
  { code: "CZE", name: "Czechia", flagEmoji: "🇨🇿", centroid: [15.47, 49.82], aliases: ["Czechia", "Czech Republic"] },
  { code: "BIH", name: "Bosnia and Herzegovina", flagEmoji: "🇧🇦", centroid: [17.68, 43.92], aliases: ["Bosnia-Herzegovina", "Bosnia and Herzegovina"] },
];

const TEAMS_BY_CODE = new Map(TEAM_METADATA.map((team) => [team.code, team]));

function emptyCountry(team: TeamMetadata): CountryData {
  return {
    countryCode: team.code,
    countryName: team.name,
    flagEmoji: team.flagEmoji,
    yesPrice: 0,
    impliedProbability: 0,
    lastUpdated: Date.now(),
    delta1m: 0,
    delta5m: 0,
    delta1h: 0,
    delta24h: 0,
    volume24h: 0,
    volume5m: 0,
    spread: 0,
    liquidity: 0,
    marketCount: 0,
    centroid: team.centroid,
  };
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

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cents(decimalPrice: number): number {
  return Math.max(0, Math.min(100, Math.round(decimalPrice * 10_000) / 100));
}

function matchTeam(question: string): TeamMetadata | null {
  const normalized = question.toLocaleLowerCase();
  return (
    TEAM_METADATA.find((team) =>
      team.aliases.some((alias) =>
        new RegExp(`\\b${escapeRegExp(alias.toLocaleLowerCase())}\\b`, "u").test(normalized)
      )
    ) ?? null
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bestBidFromBook(bids: PriceLevel[] = []): number | undefined {
  const prices = bids.map((level) => parseNumber(level.price, NaN)).filter(Number.isFinite);
  return prices.length ? Math.max(...prices) : undefined;
}

function bestAskFromBook(asks: PriceLevel[] = []): number | undefined {
  const prices = asks.map((level) => parseNumber(level.price, NaN)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : undefined;
}

function bookDepthUsd(levels: PriceLevel[] = []): number {
  return levels.reduce((sum, level) => {
    const price = parseNumber(level.price);
    const size = parseNumber(level.size);
    return sum + price * size;
  }, 0);
}

function getYesTokenId(market: GammaMarket): string | null {
  const outcomes = parseJsonArray(market.outcomes);
  const tokenIds = parseJsonArray(market.clobTokenIds);
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  return tokenIds[yesIndex >= 0 ? yesIndex : 0] ?? null;
}

function getYesPrice(market: GammaMarket): number {
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  return parseNumber(prices[yesIndex >= 0 ? yesIndex : 0], parseNumber(market.lastTradePrice));
}

function marketToState(market: GammaMarket, team: TeamMetadata, tokenId: string): MarketState {
  const yesPrice = cents(getYesPrice(market));
  const bestBid = parseNumber(market.bestBid, NaN);
  const bestAsk = parseNumber(market.bestAsk, NaN);

  return {
    binding: { tokenId, marketId: market.id, countryCode: team.code },
    country: {
      ...emptyCountry(team),
      yesPrice,
      impliedProbability: yesPrice,
      lastUpdated: Date.now(),
      volume24h: parseNumber(market.volume24hrClob, parseNumber(market.volume24hr)),
      spread: cents(parseNumber(market.spread)),
      liquidity: parseNumber(market.liquidityClob, parseNumber(market.liquidity)),
      marketCount: 1,
    },
    bestBid: Number.isFinite(bestBid) ? bestBid : undefined,
    bestAsk: Number.isFinite(bestAsk) ? bestAsk : undefined,
    lastTradePrice: parseNumber(market.lastTradePrice, getYesPrice(market)),
  };
}

function updatePriceFromBidAsk(state: MarketState, timestamp?: string) {
  const prices = [state.bestBid, state.bestAsk].filter(
    (price): price is number => typeof price === "number" && Number.isFinite(price)
  );
  const decimalPrice =
    prices.length === 2
      ? (prices[0] + prices[1]) / 2
      : prices[0] ?? state.lastTradePrice ?? state.country.yesPrice / 100;
  const yesPrice = cents(decimalPrice);

  state.country = {
    ...state.country,
    yesPrice,
    impliedProbability: yesPrice,
    spread:
      typeof state.bestBid === "number" && typeof state.bestAsk === "number"
        ? cents(Math.max(0, state.bestAsk - state.bestBid))
        : state.country.spread,
    lastUpdated: parseNumber(timestamp, Date.now()),
  };
}

async function fetchWorldCupMarkets(): Promise<MarketState[]> {
  const response = await fetch(GAMMA_EVENT_URL);
  if (!response.ok) {
    throw new Error(`Gamma event request failed: ${response.status} ${response.statusText}`);
  }

  const event = (await response.json()) as GammaEvent;
  const states: MarketState[] = [];

  for (const market of event.markets ?? []) {
    if (!market.active || market.closed || !market.enableOrderBook) continue;
    const team = matchTeam(market.question);
    const tokenId = getYesTokenId(market);
    if (!team || !tokenId) continue;
    states.push(marketToState(market, team, tokenId));
  }

  return states;
}

async function hydrateOrderBooks(states: MarketState[]) {
  const body = states.map((state) => ({ token_id: state.binding.tokenId }));
  if (!body.length) return;

  const response = await fetch(CLOB_BOOKS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn(`[Polymarket] CLOB books request failed: ${response.status} ${response.statusText}`);
    return;
  }

  const books = (await response.json()) as Array<{
    asset_id: string;
    bids?: PriceLevel[];
    asks?: PriceLevel[];
    timestamp?: string;
  }>;
  const byToken = new Map(states.map((state) => [state.binding.tokenId, state]));

  for (const book of books) {
    const state = byToken.get(book.asset_id);
    if (!state) continue;
    state.bestBid = bestBidFromBook(book.bids);
    state.bestAsk = bestAskFromBook(book.asks);
    state.country = {
      ...state.country,
      liquidity: Math.max(state.country.liquidity, bookDepthUsd(book.bids) + bookDepthUsd(book.asks)),
    };
    updatePriceFromBidAsk(state, book.timestamp);
  }
}

function parseMessages(raw: WebSocket.RawData): PolymarketMessage[] {
  const text = raw.toString();
  if (text === "PONG" || text === "PING") return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    console.warn("[Polymarket] Ignoring non-JSON message:", text.slice(0, 120));
    return [];
  }
};

export function createPolymarketClient(apiKey: string): PolymarketClient {
  const emitter = new EventEmitter();
  const states = new Map<string, MarketState>();
  const tokenToCode = new Map<string, string>();
  let ws: WebSocket | null = null;
  let connected = false;
  let stopped = false;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  function emitSnapshot() {
    for (const state of states.values()) {
      emitter.emit("countryUpdate", state.country);
    }
    emitter.emit("ready", Array.from(states.values()).map((state) => state.country));
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    const delay = Math.min(1_000 * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    reconnectAttempt += 1;
    console.warn(`[Polymarket] Reconnecting in ${delay}ms...`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void connectWebSocket();
    }, delay);
  }

  function clearPing() {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function subscribe() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        assets_ids: Array.from(tokenToCode.keys()),
        type: "market",
        custom_feature_enabled: true,
      })
    );
    clearPing();
    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send("PING");
    }, PING_INTERVAL_MS);
  }

  function handleCountryMutation(state: MarketState, timestamp?: string) {
    updatePriceFromBidAsk(state, timestamp);
    emitter.emit("countryUpdate", state.country);
  }

  function handleMessage(message: PolymarketMessage) {
    if (message.event_type === "price_change") {
      for (const change of message.price_changes ?? []) {
        const code = tokenToCode.get(change.asset_id);
        const state = code ? states.get(code) : undefined;
        if (!state) continue;
        state.bestBid = parseNumber(change.best_bid, state.bestBid);
        state.bestAsk = parseNumber(change.best_ask, state.bestAsk);
        handleCountryMutation(state, message.timestamp);
      }
      return;
    }

    const assetId = message.asset_id;
    const code = assetId ? tokenToCode.get(assetId) : undefined;
    const state = code ? states.get(code) : undefined;
    if (!state) return;

    if (message.event_type === "book") {
      state.bestBid = bestBidFromBook(message.bids);
      state.bestAsk = bestAskFromBook(message.asks);
      state.country = {
        ...state.country,
        liquidity: Math.max(state.country.liquidity, bookDepthUsd(message.bids) + bookDepthUsd(message.asks)),
      };
      handleCountryMutation(state, message.timestamp);
    }

    if (message.event_type === "best_bid_ask") {
      state.bestBid = parseNumber(message.best_bid, state.bestBid);
      state.bestAsk = parseNumber(message.best_ask, state.bestAsk);
      state.country = {
        ...state.country,
        spread: cents(parseNumber(message.spread, state.country.spread / 100)),
      };
      handleCountryMutation(state, message.timestamp);
    }

    if (message.event_type === "last_trade_price") {
      state.lastTradePrice = parseNumber(message.price, state.lastTradePrice);
      state.country = {
        ...state.country,
        volume5m: state.country.volume5m + parseNumber(message.price) * parseNumber(message.size),
      };
      handleCountryMutation(state, message.timestamp);
    }
  }

  async function connectWebSocket() {
    if (stopped || tokenToCode.size === 0) return;
    ws?.close();
    ws = new WebSocket(POLYMARKET_WS_URL);

    ws.on("open", () => {
      connected = true;
      reconnectAttempt = 0;
      console.log(`[Polymarket] Connected. Subscribing to ${tokenToCode.size} YES tokens.`);
      subscribe();
      emitter.emit("connected");
    });

    ws.on("message", (raw) => {
      for (const message of parseMessages(raw)) {
        handleMessage(message);
      }
    });

    ws.on("close", (code, reason) => {
      connected = false;
      clearPing();
      emitter.emit("disconnected");
      console.warn(`[Polymarket] WebSocket closed (${code}) ${reason.toString()}`);
      scheduleReconnect();
    });

    ws.on("error", (err) => {
      emitter.emit("error", err);
      console.error("[Polymarket] WebSocket error:", err);
    });
  }

  return Object.assign(emitter, {
    async connect() {
      stopped = false;
      console.log("[Polymarket] Loading World Cup Winner markets...");

      if (!apiKey) {
        console.log("[Polymarket] Public market channel does not require an API key.");
      }

      const initialStates = await fetchWorldCupMarkets();
      await hydrateOrderBooks(initialStates);
      states.clear();
      tokenToCode.clear();

      for (const state of initialStates) {
        states.set(state.binding.countryCode, state);
        tokenToCode.set(state.binding.tokenId, state.binding.countryCode);
      }

      console.log(`[Polymarket] Loaded ${states.size} active World Cup Winner markets.`);
      emitSnapshot();
      await connectWebSocket();
    },

    disconnect() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      clearPing();
      ws?.close();
      ws = null;
      connected = false;
      emitter.emit("disconnected");
    },

    isConnected() {
      return connected;
    },

    getCountries() {
      return Array.from(states.values()).map((state) => state.country);
    },
  });
}
