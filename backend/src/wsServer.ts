import type { WebSocket } from "ws";
import type http from "http";
import type { SnapshotCache } from "./snapshotCache";
import type { HistoryBuffer } from "./historyBuffer";

const MAX_WS_CLIENTS = 500;
const WS_MESSAGE_WINDOW_MS = 10 * 1000;
const WS_MAX_MESSAGES_PER_WINDOW = 30;
const MAX_HISTORY_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

interface WsClient {
  ws: WebSocket;
  id: string;
  subscribed: boolean;
  messageCount: number;
  messageWindowResetAt: number;
}

export function createWsServer() {
  const clients: Map<string, WsClient> = new Map();
  let clientCounter = 0;

  return {
    handleConnection(
      ws: WebSocket,
      snapshotCache: SnapshotCache,
      historyBuffer: HistoryBuffer,
      req?: http.IncomingMessage
    ) {
      if (clients.size >= MAX_WS_CLIENTS || !isAllowedOrigin(req)) {
        ws.close(1008, "policy_violation");
        return;
      }

      const clientId = `client-${++clientCounter}`;
      const client: WsClient = {
        ws,
        id: clientId,
        subscribed: false,
        messageCount: 0,
        messageWindowResetAt: Date.now() + WS_MESSAGE_WINDOW_MS,
      };
      clients.set(clientId, client);

      console.log(`[WS] Client connected: ${clientId} (total: ${clients.size})`);

      // Send initial snapshot
      const snapshot = snapshotCache.getLatest();
      if (snapshot) {
        ws.send(JSON.stringify(toLightweightSnapshot(snapshot)));
      }

      ws.on("message", (raw) => {
        try {
          if (!allowClientMessage(client)) {
            ws.close(1008, "rate_limited");
            return;
          }

          const msg = JSON.parse(raw.toString());

          if (msg.type === "subscribe") {
            client.subscribed = true;
            console.log(`[WS] Client subscribed: ${clientId}`);
          }

          if (msg.type === "history_request") {
            const { countryCode, from, to } = parseHistoryRequest(msg);
            const data = historyBuffer.getHistory(countryCode, from, to);
            ws.send(
              JSON.stringify({
                type: "history_response",
                countryCode,
                resolution: msg.resolution,
                data,
              })
            );
          }
        } catch (err) {
          console.error(`[WS] Invalid message from ${clientId}:`, err);
        }
      });

      ws.on("close", () => {
        clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId} (total: ${clients.size})`);
      });

      ws.on("error", (err) => {
        console.error(`[WS] Error from ${clientId}:`, err);
        clients.delete(clientId);
      });
    },

    broadcast(data: object) {
      const json = JSON.stringify(data);
      for (const [, client] of clients) {
        if (client.subscribed && client.ws.readyState === 1) {
          client.ws.send(json);
        }
      }
    },

    getClientCount() {
      return clients.size;
    },

    getSubscribedClientCount() {
      return Array.from(clients.values()).filter((client) => client.subscribed).length;
    },
  };
}

function toLightweightSnapshot(snapshot: NonNullable<ReturnType<SnapshotCache["getLatest"]>>) {
  return {
    type: "snapshot" as const,
    timestamp: snapshot.timestamp,
    countries: snapshot.countries,
    events: snapshot.events,
    history: {},
  };
}

function allowClientMessage(client: WsClient) {
  const now = Date.now();
  if (client.messageWindowResetAt <= now) {
    client.messageCount = 0;
    client.messageWindowResetAt = now + WS_MESSAGE_WINDOW_MS;
  }

  client.messageCount += 1;
  return client.messageCount <= WS_MAX_MESSAGES_PER_WINDOW;
}

function parseHistoryRequest(msg: Record<string, unknown>) {
  const countryCode = String(msg.countryCode || "").toUpperCase();
  const from = Number(msg.from);
  const to = Number(msg.to);

  if (!/^[A-Z]{3}$/.test(countryCode)) {
    throw new Error("invalid_country_code");
  }

  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
    throw new Error("invalid_history_range");
  }

  if (to - from > MAX_HISTORY_RANGE_MS) {
    throw new Error("history_range_too_large");
  }

  return { countryCode, from, to };
}

function isAllowedOrigin(req?: http.IncomingMessage) {
  const origin = req?.headers.origin;
  if (!origin) return true;

  const allowed = new Set(
    (process.env.WS_ORIGIN || process.env.CORS_ORIGIN || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item !== "*")
  );

  if (!allowed.size) return true;
  return allowed.has(origin);
}
