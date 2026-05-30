"use client";

import { useEffect, useMemo, useState } from "react";
import { extractCity, getTournamentProgress, parseCalendar } from "@/lib/calendar";
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

    fetch("/calendar.ics")
      .then((response) => {
        if (!response.ok) throw new Error("calendar fetch failed");
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        setMatches(parseCalendar(text));
      })
      .catch(() => {
        if (active) setError("Calendar sync failed. Please download the calendar file directly.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

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


