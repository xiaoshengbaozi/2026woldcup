"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail } from "@/types/match";

export function MatchHeadToHead({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);
  const { headToHead } = detail;

  // Count results
  const results = headToHead.reduce(
    (acc, m) => {
      const [homeGoals, awayGoals] = m.score.split("-").map((s) => {
        const num = parseInt(s.trim().split("(")[0]);
        return isNaN(num) ? 0 : num;
      });
      if (homeGoals > awayGoals) acc.homeWins++;
      else if (homeGoals < awayGoals) acc.awayWins++;
      else acc.draws++;
      return acc;
    },
    { homeWins: 0, draws: 0, awayWins: 0 }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-center gap-2">
          <History className="h-4 w-4 text-volt" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
            历史交锋
          </h3>
        </div>

        {/* Summary */}
        <div className="mb-5 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-volt">{results.homeWins}</p>
            <p className="text-[10px] text-white/40">{teams.home.name}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white/50">{results.draws}</p>
            <p className="text-[10px] text-white/40">平局</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-flare">{results.awayWins}</p>
            <p className="text-[10px] text-white/40">{teams.away.name}</p>
          </div>
        </div>

        {/* Match list */}
        <div className="space-y-2">
          {headToHead.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.04 }}
              className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-white/35">{m.date}</span>
                <span className="text-[10px] text-white/25">{m.competition}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-white/60">{m.homeTeam}</span>
                <span className="rounded bg-white/[0.08] px-2 py-0.5 text-xs font-bold tabular-nums text-white">
                  {m.score}
                </span>
                <span className="text-[10px] font-medium text-white/60">{m.awayTeam}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
