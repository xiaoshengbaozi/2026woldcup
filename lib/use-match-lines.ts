"use client";

import { useEffect, useState } from "react";
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
      const response = await fetch(`${getApiUrl()}/api/match-lines`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Match lines returned ${response.status}`);
      const data = (await response.json()) as MatchLinesResponse;

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

  if (!timer) {
    void loadMatchLines();
    timer = window.setInterval(() => {
      void loadMatchLines();
    }, REFRESH_INTERVAL_MS);
  }

  return () => {
    subscribers.delete(subscriber);
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
