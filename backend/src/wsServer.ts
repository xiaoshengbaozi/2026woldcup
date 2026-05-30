import type { WebSocket } from "ws";
import type { SnapshotCache } from "./snapshotCache";
import type { HistoryBuffer } from "./historyBuffer";

interface WsClient {
  ws: WebSocket;
  id: string;
  subscribed: boolean;
}

export function createWsServer() {
  const clients: Map<string, WsClient> = new Map();
  let clientCounter = 0;

  return {
    handleConnection(
      ws: WebSocket,
      snapshotCache: SnapshotCache,
      historyBuffer: HistoryBuffer
    ) {
      const clientId = `client-${++clientCounter}`;
      const client: WsClient = { ws, id: clientId, subscribed: false };
      clients.set(clientId, client);

      console.log(`[WS] Client connected: ${clientId} (total: ${clients.size})`);

      // Send initial snapshot
      const snapshot = snapshotCache.getLatest();
      if (snapshot) {
        ws.send(JSON.stringify(snapshot));
      }

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "subscribe") {
            client.subscribed = true;
            console.log(`[WS] Client subscribed: ${clientId}`);
          }

          if (msg.type === "history_request") {
            const { countryCode, from, to } = msg;
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
