"use client";

import { useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { fetchWithTimeout } from "@/lib/request-cache";
import { useStore } from "@/lib/store";
import { getBackendApiUrl } from "@/lib/world-cup-api";
import type {
  DeltaMessage,
  HistoryResponseMessage,
  ServerMessage,
  SnapshotMessage,
} from "@/types/messages";

const STALE_AFTER_MS = 15_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const SNAPSHOT_STORAGE_KEY = "wc-market-last-snapshot";

function getApiUrl() {
  return getBackendApiUrl();
}

function getWsUrl(apiUrl: string) {
  const configured = process.env.NEXT_PUBLIC_MARKET_WS_URL;
  if (configured) return configured;
  return apiUrl.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function applySnapshot(message: SnapshotMessage, options: { persist?: boolean } = {}) {
  const persist = options.persist ?? true;
  const store = useStore.getState();
  unstable_batchedUpdates(() => {
    store.updateCountries(message.countries);
    store.setEvents(message.events);
    store.setAllHistory(message.history ?? {});

    store.recomputeRankings();
    store.recordUpdate(message.timestamp, Math.max(0, Date.now() - message.timestamp));
    store.setDataSource("live");
    store.setStatus("connected");
  });
  if (persist) saveLastSnapshot(message);
}

function applyDelta(message: DeltaMessage) {
  const store = useStore.getState();
  const historyUpdates = message.updates.filter((update) => update.historyPoint);
  unstable_batchedUpdates(() => {
    const changedCountryCodes = store.updateCountriesFromDelta(message.updates);

    if (historyUpdates.length) {
      store.appendHistoryPoints(historyUpdates);
    }

    if (message.newEvents.length) {
      store.addEvents(message.newEvents);
    }

    if (changedCountryCodes.length) {
      store.scheduleRankingsRecompute();
    }
    store.recordUpdate(message.timestamp, Math.max(0, Date.now() - message.timestamp));
    store.setDataSource("live");
    store.setStatus("connected");
  });
  saveLastSnapshot({
    type: "snapshot",
    timestamp: message.timestamp,
    countries: useStore.getState().getAllCountries(),
    events: useStore.getState().events,
    history: {},
  });
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
        const response = await fetchWithTimeout(`${apiUrl}/api/snapshot`, { cache: "no-store" }, 5_000);
        if (!response.ok) throw new Error(`Snapshot returned ${response.status}`);
        const snapshot = (await response.json()) as SnapshotMessage;
        if (snapshot.countries.length) {
          applySnapshot(snapshot);
          return;
        }

        const lastSnapshot = readLastSnapshot();
        if (lastSnapshot) {
          applySnapshot(lastSnapshot, { persist: false });
          useStore.getState().setStatus("stale");
          return;
        }

        applySnapshot(snapshot, { persist: false });
      } catch (err) {
        console.warn("[MarketData] Snapshot request failed:", err);
        const lastSnapshot = readLastSnapshot();
        if (lastSnapshot) {
          applySnapshot(lastSnapshot, { persist: false });
          useStore.getState().setStatus("stale");
          return;
        }
        if (useStore.getState().countries.size) {
          useStore.getState().setStatus("stale");
          return;
        }
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
        useStore.getState().setStatus(useStore.getState().countries.size ? "stale" : "disconnected");
        scheduleReconnect();
      };
    }

    discardMockMarketData();
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

function discardMockMarketData() {
  const store = useStore.getState();
  if (store.dataSource !== "mock") return;

  useStore.setState({
    countries: new Map(),
    history: new Map(),
    events: [],
    rankings: [],
    squeezePairs: [],
    vibrationTriggers: [],
    lastUpdateTimestamp: null,
    updateCount: 0,
    latency: 0,
    dataSource: "empty",
  });
}

function saveLastSnapshot(message: SnapshotMessage) {
  if (typeof window === "undefined" || !message.countries.length) return;

  try {
    const compact: SnapshotMessage = {
      type: "snapshot",
      timestamp: message.timestamp,
      countries: message.countries,
      events: message.events,
      history: {},
    };
    window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), snapshot: compact }));
  } catch {
    // If storage is unavailable, the in-memory store still preserves the current frame.
  }
}

function readLastSnapshot() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as { snapshot?: SnapshotMessage };
    if (!payload.snapshot?.countries?.length) return null;
    return payload.snapshot;
  } catch {
    return null;
  }
}
