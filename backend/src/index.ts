import { WebSocketServer } from "ws";
import http from "http";
import { createPolymarketClient } from "./polymarket";
import { createDeltaEngine } from "./deltaEngine";
import { createEventDetector } from "./eventDetector";
import { createHistoryBuffer } from "./historyBuffer";
import { createSnapshotCache } from "./snapshotCache";
import { createWsServer } from "./wsServer";
import type { CountryData, HistoryPoint } from "./types";

const PORT = parseInt(process.env.PORT || "3001");
const POLYMARKET_API_KEY = process.env.POLYMARKET_API_KEY || "";

async function main() {
  console.log("[Backend] Starting World Cup Prediction OS backend...");

  // 1. Initialize components
  const historyBuffer = createHistoryBuffer();
  const deltaEngine = createDeltaEngine(historyBuffer);
  const eventDetector = createEventDetector();
  const snapshotCache = createSnapshotCache();
  const wsServer = createWsServer();

  // 2. Connect to Polymarket
  const polymarket = createPolymarketClient(POLYMARKET_API_KEY);
  await polymarket.connect();

  // 3. State for delta computation
  let currentCountries: Map<string, CountryData> = new Map();
  let sequenceNumber = 0;

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

    // Broadcast delta to all clients
    wsServer.broadcast({
      type: "delta",
      timestamp: now,
      sequenceNumber: ++sequenceNumber,
      updates: withDeltas.map((c) => ({
        countryCode: c.countryCode,
        yesPrice: c.yesPrice,
        impliedProbability: c.impliedProbability,
        delta1m: c.delta1m,
        delta5m: c.delta5m,
        delta1h: c.delta1h,
        delta24h: c.delta24h,
        volume24h: c.volume24h,
        volume5m: c.volume5m,
        spread: c.spread,
        historyPoint: historySnapshot.get(c.countryCode)!,
      })),
      newEvents,
    });

    // Update current state
    currentCountries = new Map(withDeltas.map((c) => [c.countryCode, c]));
  }, 3000);

  // 5. HTTP server + WebSocket
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    // REST API endpoints
    if (req.url === "/api/snapshot") {
      const snapshot = snapshotCache.getLatest();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(snapshot ?? { type: "snapshot", countries: [] }));
      return;
    }

    if (req.url === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          clients: wsServer.getClientCount(),
          uptime: process.uptime(),
        })
      );
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    wsServer.handleConnection(ws, snapshotCache, historyBuffer);
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
