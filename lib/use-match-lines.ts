"use client";

import { useEffect, useState } from "react";
import type { MatchLineEvent, MatchLinesResponse } from "@/types/messages";

const DEFAULT_API_URL = "http://localhost:3001";
const REFRESH_INTERVAL_MS = 30_000;

function getApiUrl() {
  return (process.env.NEXT_PUBLIC_MARKET_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
}

export function useMatchLines() {
  const [events, setEvents] = useState<MatchLineEvent[]>([]);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const apiUrl = getApiUrl();

    async function load() {
      try {
        const response = await fetch(`${apiUrl}/api/match-lines`, { cache: "no-store" });
        if (!response.ok) throw new Error(`接口返回 ${response.status}`);
        const data = (await response.json()) as MatchLinesResponse;
        if (!active) return;
        setEvents(data.events);
        setTimestamp(data.timestamp);
        setError("");
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "比赛盘口不可用");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return { events, timestamp, loading, error };
}
