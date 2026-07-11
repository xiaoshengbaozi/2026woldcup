"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchWorldCupTopScorers,
  TOP_SCORERS_REFRESH_MS,
  type WorldCupTopScorer,
} from "@/lib/world-cup-top-scorers";

type UseTopScorersOptions = {
  /** Poll every TOP_SCORERS_REFRESH_MS while true (live-match window). */
  refreshEnabled: boolean;
  /** Trim the list after a successful fetch. */
  limit?: number;
  /** Shown initially and used when the API returns nothing. Must be a stable reference (module const). */
  fallback?: WorldCupTopScorer[];
  /** Delay the first fetch to requestIdleCallback (used by the home hero). */
  deferUntilIdle?: boolean;
  logTag?: string;
};

/**
 * Shared top-scorers loader with live refresh. Replaces the duplicated
 * syncTopScorers effects in world-cup-hero / me page / players page.
 */
export function useTopScorers({
  refreshEnabled,
  limit,
  fallback,
  deferUntilIdle = false,
  logTag = "TopScorers",
}: UseTopScorersOptions) {
  const fallbackRef = useRef<WorldCupTopScorer[]>(fallback ?? []);
  const [topScorers, setTopScorers] = useState<WorldCupTopScorer[]>(fallbackRef.current);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let refreshId: number | null = null;

    const sync = (forceRefresh = false) => {
      fetchWorldCupTopScorers({ forceRefresh })
        .then((items) => {
          if (!active) return;
          const next = items.length ? (limit ? items.slice(0, limit) : items) : fallbackRef.current;
          setTopScorers(next);
        })
        .catch((error) => {
          console.warn(`[${logTag}] top scorers unavailable:`, error);
          if (active && !forceRefresh && fallbackRef.current.length) {
            setTopScorers(fallbackRef.current);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    const start = () => {
      sync(false);
      if (refreshEnabled) {
        refreshId = window.setInterval(() => sync(true), TOP_SCORERS_REFRESH_MS);
      }
    };

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (deferUntilIdle) {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(start, { timeout: 2_500 });
      } else {
        timeoutId = setTimeout(start, 1_200);
      }
    } else {
      start();
    }

    return () => {
      active = false;
      if (refreshId !== null) window.clearInterval(refreshId);
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [refreshEnabled, limit, deferUntilIdle, logTag]);

  return { topScorers, loading };
}
