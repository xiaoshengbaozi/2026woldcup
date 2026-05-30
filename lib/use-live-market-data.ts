"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type {
  DeltaMessage,
  HistoryResponseMessage,
  ServerMessage,
  SnapshotMessage,
} from "@/types/messages";

const LOCAL_API_URL = "http://localhost:3001";
const PRODUCTION_API_URL = "https://api-2026.20250114.xyz";
const STALE_AFTER_MS = 15_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

function getApiUrl() {
  const fallbackUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? LOCAL_API_URL
      : PRODUCTION_API_URL;

  return (process.env.NEXT_PUBLIC_MARKET_API_URL || fallbackUrl).replace(/\/$/, "");
}

function getWsUrl(apiUrl: string) {
  const configured = process.env.NEXT_PUBLIC_MARKET_WS_URL;
  if (configured) return configured;
  return apiUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function applySnapshot(message: SnapshotMessage) {
  const store = useStore.getState();
  store.updateCountries(message.countries);
  store.setEvents(message.events);

  for (const [countryCode, history] of Object.entries(message.history ?? {})) {
    store.setHistory(countryCode, history);
  }

  store.recomputeRankings();
  store.recordUpdate(message.timestamp, Math.max(0, Date.now() - message.timestamp));
  store.setStatus("connected");
}

function applyDelta(message: DeltaMessage) {
  const store = useStore.getState();
  store.updateCountriesFromDelta(message.updates);

  for (const update of message.updates) {
    store.appendHistoryPoint(update.countryCode, update.historyPoint);
  }

  if (message.newEvents.length) {
    store.addEvents(message.newEvents);
  }

  store.recomputeRankings();
  store.recordUpdate(message.timestamp, Math.max(0, Date.now() - message.timestamp));
  store.setStatus("connected");
}

function applyHistoryResponse(message: HistoryResponseMessage) {
  useStore.getState().setHistory(message.countryCode, message.data);
}

function applyServerMessage(message: ServerMessage) {
  if (message.type === "snapshot") applySnapshot(message);
  if (message.type === "delta") applyDelta(message);
  if (message.type === "history_response") applyHistoryResponse(message);
}

export function useLiveMarketData() {
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    let reconnectAttempt = 0;

    const apiUrl = getApiUrl();
    const wsUrl = getWsUrl(apiUrl);
    const clientId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `client-${Date.now()}`;

    async function loadSnapshot() {
      try {
        const response = await fetch(`${apiUrl}/api/snapshot`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
        applySnapshot((await response.json()) as SnapshotMessage);
      } catch (err) {
        console.warn("[MarketData] Snapshot request failed:", err);
        useStore.getState().setStatus("disconnected");
      }
    }

    function scheduleReconnect() {
      if (stopped || reconnectTimer) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    }

    function connect() {
      if (stopped) return;
      ws?.close();
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempt = 0;
        useStore.getState().setStatus("connected");
        ws?.send(JSON.stringify({ type: "subscribe", clientId }));
      };

      ws.onmessage = (event) => {
        try {
          applyServerMessage(JSON.parse(event.data) as ServerMessage);
        } catch (err) {
          console.warn("[MarketData] Ignoring invalid WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        useStore.getState().setStatus("stale");
      };

      ws.onclose = () => {
        if (stopped) return;
        useStore.getState().setStatus("disconnected");
        scheduleReconnect();
      };
    }

    useStore.getState().setStatus("initializing");
    void loadSnapshot();
    connect();

    staleTimer = setInterval(() => {
      const { lastUpdateTimestamp, status } = useStore.getState();
      if (
        status === "connected" &&
        lastUpdateTimestamp &&
        Date.now() - lastUpdateTimestamp > STALE_AFTER_MS
      ) {
        useStore.getState().setStatus("stale");
      }
    }, 5_000);

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (staleTimer) clearInterval(staleTimer);
      ws?.close();
    };
  }, []);
}
