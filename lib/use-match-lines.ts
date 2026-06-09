"use client";

import { useEffect, useState } from "react";
import { cachedJson, fetchWithTimeout } from "@/lib/request-cache";
import { getBackendApiUrl } from "@/lib/world-cup-api";
import type { MatchLineEvent, MatchLinesResponse } from "@/types/messages";

const REFRESH_INTERVAL_MS = 30_000;

type MatchLinesState = {
  events: MatchLineEvent[];
  timestamp: number | null;
  loading: boolean;
  error: string;
};

const matchLinesState: MatchLinesState = {
  events: [],
  timestamp: null,
  loading: true,
  error: "",
};

const subscribers = new Set<(state: MatchLinesState) => void>();
let timer: number | null = null;
let requestInFlight: Promise<void> | null = null;

function getApiUrl() {
  return getBackendApiUrl();
}

function emit() {
  const snapshot = { ...matchLinesState };
  subscribers.forEach((subscriber) => subscriber(snapshot));
}

function setMatchLinesState(next: Partial<MatchLinesState>) {
  Object.assign(matchLinesState, next);
  emit();
}

async function loadMatchLines() {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      const endpoint = `${getApiUrl()}/api/match-lines`;
      const data = await cachedJson<MatchLinesResponse>(endpoint, REFRESH_INTERVAL_MS, async () => {
        const response = await fetchWithTimeout(endpoint, { cache: "no-store" }, 5_000);
        if (!response.ok) throw new Error(`Match lines returned ${response.status}`);
        return (await response.json()) as MatchLinesResponse;
      }, { persist: true, staleTtlMs: 6 * 60 * 60 * 1000 });

      setMatchLinesState({
        events: data.events,
        timestamp: data.timestamp,
        loading: false,
        error: "",
      });
    } catch (err) {
      setMatchLinesState({
        loading: false,
        error: err instanceof Error ? err.message : "Match lines unavailable",
      });
    } finally {
      requestInFlight = null;
    }
  })();

  return requestInFlight;
}

function subscribeMatchLines(subscriber: (state: MatchLinesState) => void) {
  subscribers.add(subscriber);
  subscriber({ ...matchLinesState });

  if (matchLinesState.events.length === 0) {
    void loadMatchLines();
  }

  if (!timer) {
    timer = window.setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        void loadMatchLines();
      }
    }, REFRESH_INTERVAL_MS);
  }

  const refreshWhenVisible = () => {
    if (!document.hidden && navigator.onLine) {
      void loadMatchLines();
    }
  };
  document.addEventListener("visibilitychange", refreshWhenVisible);
  window.addEventListener("online", refreshWhenVisible);

  return () => {
    subscribers.delete(subscriber);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
    window.removeEventListener("online", refreshWhenVisible);
    if (subscribers.size === 0 && timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

export function useMatchLines() {
  const [state, setState] = useState<MatchLinesState>(() => ({ ...matchLinesState }));

  useEffect(() => {
    return subscribeMatchLines(setState);
  }, []);

  return state;
}
