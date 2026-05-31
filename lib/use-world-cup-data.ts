"use client";

import { useEffect, useMemo, useState } from "react";
import { extractCity, getTournamentProgress, parseCalendar } from "@/lib/calendar";
import { fetchWorldCupFixtures } from "@/lib/world-cup-api";
import type { Match } from "@/types/match";

export function useWorldCupData() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeCity, setActiveCity] = useState("全部城市");
  const [calendarUrl, setCalendarUrl] = useState("calendar.ics");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCalendarUrl(new URL("/calendar.ics", window.location.href).href);

    let active = true;

    async function loadMatches() {
      try {
        const liveMatches = await fetchWorldCupFixtures();
        if (!active) return;
        if (liveMatches.length) {
          setMatches(liveMatches);
          setError("");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[WorldCupData] API-Football normalized fixtures unavailable, falling back to calendar:", err);
      }

      try {
        const response = await fetch("/calendar.ics");
        if (!response.ok) throw new Error("calendar fetch failed");
        const text = await response.text();
        if (!active) return;
        setMatches(parseCalendar(text));
        setError("");
      } catch {
        if (active) setError("赛程同步失败，请直接下载日历文件。");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMatches();

    return () => {
      active = false;
    };
  }, []);

  const cities = useMemo(() => {
    const values = matches
      .map((match) => extractCity(match.location))
      .filter(Boolean);

    return ["全部城市", ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }, [matches]);

  const matchStats = useMemo(() => {
    const now = Date.now();
    let completed = 0;
    let ongoing = 0;

    for (const match of matches) {
      const started = match.start.getTime() <= now;
      const ended = (match.end || match.start).getTime() < now;

      if (ended) {
        completed++;
      } else if (started) {
        ongoing++;
      }
    }

    return { completedCount: completed, ongoingCount: ongoing };
  }, [matches]);

  return {
    matches,
    activeCity,
    setActiveCity,
    calendarUrl,
    webcalUrl: calendarUrl.replace(/^https?:/, "webcal:"),
    cities,
    firstMatch: matches[0] ?? null,
    progress: getTournamentProgress(matches),
    completedCount: matchStats.completedCount,
    ongoingCount: matchStats.ongoingCount,
    loading,
    error
  };
}


