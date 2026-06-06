"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { MatchCalendarView } from "@/components/match-calendar-view";
import { MobileSecondaryPageActions } from "@/components/mobile-secondary-page-actions";
import { parseCalendar } from "@/lib/calendar";
import type { Match } from "@/types/match";

export default function MatchCalendarPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCalendar() {
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

    void loadCalendar();

    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell>
      <MobileSecondaryPageActions backHref="/matches" backLabel="返回赛程" reserveSpace />

      <main className="space-y-4 pb-6 lg:pb-0">
        {loading ? (
          <div className="hero-card p-8 text-center">
            <p className="text-white/55">正在同步赛事日历...</p>
          </div>
        ) : null}

        {error ? (
          <div className="hero-card p-8 text-center">
            <p className="text-flare">{error}</p>
          </div>
        ) : null}

        {!loading && !error ? <MatchCalendarView matches={matches} timezoneOffset={0} frameless /> : null}
      </main>
    </DashboardShell>
  );
}
