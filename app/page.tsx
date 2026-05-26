"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { GroupStandings } from "@/components/group-standings";
import { WorldCupHero } from "@/components/world-cup-hero";
import { useWorldCupData } from "@/lib/use-world-cup-data";

export default function Home() {
  const {
    matches,
    activeCity,
    setActiveCity,
    calendarUrl,
    webcalUrl,
    cities,
    firstMatch,
    progress,
    completedCount,
    ongoingCount
  } = useWorldCupData();

  return (
    <DashboardShell>
      <WorldCupHero
        firstMatch={firstMatch}
        progress={progress}
        completedCount={completedCount}
        ongoingCount={ongoingCount}
        calendarUrl={calendarUrl}
        webcalUrl={w