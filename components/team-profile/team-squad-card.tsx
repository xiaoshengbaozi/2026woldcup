"use client";

import { motion } from "framer-motion";
import { SquadLineupPanel } from "@/components/match-detail/match-lineup";
import type { WorldCupSquadDetail } from "@/lib/world-cup-squads";

interface TeamSquadCardProps {
  teamName: string;
  coach: string | null;
  squad: WorldCupSquadDetail | null;
  loading: boolean;
  error: string | null;
}

const TEAM_PAGE_ACCENT_HEX = "#D8FF3E";
const TEAM_PAGE_ACCENT_FROM = "rgba(216,255,62,";

export function TeamSquadCard({ teamName, coach, squad, loading, error }: TeamSquadCardProps) {
  const players = squad?.players ?? [];
  const displayTeamName = squad?.team.name || teamName;
  const teamCode = squad?.team.code || "";

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="team-squad-card relative grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[2fr_3fr]"
      >
        <div className="min-h-[320px] rounded-3xl bg-white/[0.025] p-5 ring-1 ring-white/[0.055]">
          <div className="h-5 w-40 rounded-full bg-white/[0.06]" />
          <div className="mt-5 h-8 w-48 rounded-full bg-white/[0.08]" />
          <div className="mt-4 h-20 rounded-2xl bg-white/[0.04]" />
        </div>
        <div className="grid min-h-[320px] place-items-center rounded-3xl bg-white/[0.025] p-8 ring-1 ring-white/[0.055]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-volt/30 border-t-volt" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="team-squad-card relative grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[2fr_3fr]"
    >
      <SquadLineupPanel
        teamName={displayTeamName}
        teamCode={teamCode}
        coach={squad?.coach || coach}
        players={players}
        officialWorldCupSquad={Boolean(squad?.officialWorldCupSquad)}
        accentHex={error ? "#FF9A1F" : TEAM_PAGE_ACCENT_HEX}
        accentFrom={error ? "rgba(255,154,31," : TEAM_PAGE_ACCENT_FROM}
        hideHeader
      />
    </motion.div>
  );
}
