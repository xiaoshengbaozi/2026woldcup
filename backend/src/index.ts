import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { WebSocketServer } from "ws";
import { createApiFootballService } from "./apiFootball";
import { createPolymarketClient } from "./polymarket";
import { createDeltaEngine } from "./deltaEngine";
import { createEventDetector } from "./eventDetector";
import { createHistoryBuffer } from "./historyBuffer";
import { createHttpServer } from "./httpServer";
import { createMatchLinesService } from "./matchLines";
import { createPlayerXTimelineService } from "./playerXTimeline";
import { createReminderWorker } from "./reminderWorker";
import { createSnapshotCache } from "./snapshotCache";
import { UserStore } from "./userStore";
import { createUserSystem } from "./userSystem";
import { createWorldCupCache } from "./worldCupCache";
import { createWsServer } from "./wsServer";
import type { CountryData, HistoryPoint } from "./types";

loadLocalEnv(resolve(process.cwd(), ".env"));
loadLocalEnv(resolve(process.cwd(), "backend", ".env"));

const PORT = parseInt(process.env.PORT || "3001");
const POLYMARKET_API_KEY = process.env.POLYMARKET_API_KEY || "";
const SNAPSHOT_CACHE_INTERVAL_MS = 15_000;

function loadLocalEnv(path: string) {
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function main() {
  console.log("[Backend] Starting World Cup Prediction OS backend...");

  // 1. Initialize components
  const historyBuffer = createHistoryBuffer();
  const deltaEngine = createDeltaEngine(historyBuffer);
  const eventDetector = createEventDetector();
  const snapshotCache = createSnapshotCache();
  const wsServer = createWsServer();
  const matchLines = createMatchLinesService();
  const apiFootball = createApiFootballService();
  const playerXTimeline = createPlayerXTimelineService();
  let currentCountries: Map<string, CountryData> = new Map();
  const worldCupCache = createWorldCupCache({
    apiFootball,
    getMarkets: () => Array.from(currentCountries.values()),
  });
  const userStore = new UserStore();
  await userStore.ready();
  const userSystem = createUserSystem(userStore, apiFootball, playerXTimeline);
  matchLines.start();
  worldCupCache.start();
  if (process.env.ENABLE_EMBEDDED_REMINDER_WORKER === "true") {
    createReminderWorker(userStore, { apiFootball }).start();
  }

  // 2. Connect to Polymarket
  const polymarket = createPolymarketClient(POLYMARKET_API_KEY);

  // 3. State for delta computation
  let sequenceNumber = 0;
  let lastPolymarketUpdate: number | null = null;
  let lastSnapshotCacheAt = 0;
  const startedAt = Date.now();

  polymarket.on("countryUpdate", (country: CountryData) => {
    currentCountries.set(country.countryCode, country);
    lastPolymarketUpdate = Date.now();
  });

  polymarket.on("ready", (countries?: CountryData[]) => {
    if (Array.isArray(countries)) {
      currentCountries = new Map(countries.map((country) => [country.countryCode, country]));
    }
    const now = Date.now();
    snapshotCache.update({
      type: "snapshot",
      timestamp: now,
      countries: Array.from(currentCountries.values()),
      events: [],
      history: {},
    });
    console.log(`[Backend] Snapshot initialized with ${currentCountries.size} countries.`);
  });

  polymarket.on("error", (err) => {
    console.error("[Backend] Polymarket client error:", err);
  });

  await polymarket.connect();

  // 4. Data processing loop (every 3 seconds)
  setInterval(() => {
    if (currentCountries.size === 0) return;

    const now = Date.now();
    const countries = Array.from(currentCountries.values());

    // Compute deltas
    const withDeltas = deltaEngine.computeDeltas(countries);

    // Build history snapshot
    const historySnapshot = new Map<string, HistoryPoint>();
    for (const c of withDeltas) {
      historySnapshot.set(c.countryCode, {
        timestamp: now,
        probability: c.impliedProbability,
        volume: c.volume5m,
      });
    }
    historyBuffer.append(now, historySnapshot);

    // Detect events
    const newEvents = eventDetector.detect(currentCountries, withDeltas);

    if (now - lastSnapshotCacheAt >= SNAPSHOT_CACHE_INTERVAL_MS || !snapshotCache.getLatest()) {
      const snapshotHistory: Record<string, HistoryPoint[]> = {};
      for (const c of withDeltas) {
        snapshotHistory[c.countryCode] = historyBuffer.getHistory(
          c.countryCode,
          now - 24 * 60 * 60 * 1000,
          now
        );
      }

      snapshotCache.update({
        type: "snapshot",
        timestamp: now,
        countries: withDeltas,
        events: newEvents,
        history: snapshotHistory,
      });
      lastSnapshotCacheAt = now;
    }

    wsServer.broadcast({
      type: "delta",
      timestamp: now,
      sequenceNumber: ++sequenceNumber,
      updates: withDeltas.map((c) => buildCountryDelta(currentCountries.get(c.countryCode), c, historySnapshot.get(c.countryCode)!)),
      newEvents,
    });

    // Update current state
    currentCountries = new Map(withDeltas.map((c) => [c.countryCode, c]));
  }, 3000);

  // 5. HTTP server + WebSocket
  const server = createHttpServer({
    snapshotCache,
    historyBuffer,
    wsServer,
    apiFootball,
    playerXTimeline,
    worldCupCache,
    userSystem,
    getState: () => ({
      countries: Array.from(currentCountries.values()),
      sequenceNumber,
      startedAt,
      polymarketConnected: polymarket.isConnected(),
      lastPolymarketUpdate,
      matchLines: matchLines.getLatest(),
    }),
  });

  const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

  wss.on("connection", (ws, req) => {
    wsServer.handleConnection(ws, snapshotCache, historyBuffer, req);
  });

  server.listen(PORT, () => {
    console.log(`[Backend] HTTP + WebSocket server running on port ${PORT}`);
    console.log(`[Backend] WebSocket: ws://localhost:${PORT}`);
    console.log(`[Backend] REST API:  http://localhost:${PORT}/api/snapshot`);
    console.log(`[Backend] Health:    http://localhost:${PORT}/api/health`);
  });
}

main().catch((err) => {
  console.error("[Backend] Fatal error:", err);
  process.exit(1);
});

function buildCountryDelta(previous: CountryData | undefined, current: CountryData, historyPoint: HistoryPoint) {
  const update: Partial<Pick<
    CountryData,
    | "yesPrice"
    | "impliedProbability"
    | "delta1m"
    | "delta5m"
    | "delta1h"
    | "delta24h"
    | "volume24h"
    | "volume5m"
    | "spread"
  >> & { countryCode: string; historyPoint: HistoryPoint } = {
    countryCode: current.countryCode,
    historyPoint,
  };

  const keys = [
    "yesPrice",
    "impliedProbability",
    "delta1m",
    "delta5m",
    "delta1h",
    "delta24h",
    "volume24h",
    "volume5m",
    "spread",
  ] as const;

  for (const key of keys) {
    if (!previous || previous[key] !== current[key]) {
      update[key] = current[key];
    }
  }

  return update;
}
