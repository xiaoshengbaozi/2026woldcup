"use client";

import { motion } from "framer-motion";
import type { MatchDetail } from "@/types/match";

type StatRow = {
  label: string;
  home: number | string;
  away: number | string;
  unit?: string;
  homeHigher?: boolean;
  awayHigher?: boolean;
};

export function MatchStatsPanel({ detail }: { detail: MatchDetail }) {
  const { stats } = detail;

  const statRows: StatRow[] = [
    {
      label: "控球率",
      home: stats.possession[0],
      away: stats.possession[1],
      unit: "%",
      homeHigher: stats.possession[0] > stats.possession[1],
      awayHigher: stats.possession[1] > stats.possession[0],
    },
    {
      label: "射门",
      home: stats.shots[0],
      away: stats.shots[1],
      homeHigher: stats.shots[0] > stats.shots[1],
      awayHigher: stats.shots[1] > stats.shots[0],
    },
    {
      label: "射正",
      home: stats.shotsOnTarget[0],
      away: stats.shotsOnTarget[1],
      homeHigher: stats.shotsOnTarget[0] > stats.shotsOnTarget[1],
      awayHigher: stats.shotsOnTarget[1] > stats.shotsOnTarget[0],
    },
    {
      label: "xG",
      home: stats.xG[0],
      away: stats.xG[1],
      unit: "",
      homeHigher: stats.xG[0] > stats.xG[1],
      awayHigher: stats.xG[1] > stats.xG[0],
    },
    {
      label: "传球成功率",
      home: stats.passAccuracy[0],
      away: stats.passAccuracy[1],
      unit: "%",
      homeHigher: stats.passAccuracy[0] > stats.passAccuracy[1],
      awayHigher: stats.passAccuracy[1] > stats.passAccuracy[0],
    },
    {
      label: "角球",
      home: stats.corners[0],
      away: stats.corners[1],
      homeHigher: stats.corners[0] > stats.corners[1],
      awayHigher: stats.corners[1] > stats.corners[0],
    },
    {
      label: "犯规",
      home: stats.fouls[0],
      away: stats.fouls[1],
    },
    {
      label: "黄牌",
      home: stats.yellowCards[0],
      away: stats.yellowCards[1],
    },
    {
      label: "越位",
      home: stats.offsides[0],
      away: stats.offsides[1],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="match-stats-panel hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-3">
          {statRows.map((row, i) => (
            <StatBar key={row.label} row={row} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StatBar({ row, index }: { row: StatRow; index: number }) {
  const homeVal = typeof row.home === "number" ? row.home : parseFloat(row.home as string) || 0;
  const awayVal = typeof row.away === "number" ? row.away : parseFloat(row.away as string) || 0;
  const maxVal = Math.max(homeVal, awayVal, 1);
  const homePct = Math.max(5, (homeVal / maxVal) * 100);
  const awayPct = Math.max(5, (awayVal / maxVal) * 100);
  const unit = row.unit ?? "";
  const homeDisplay = formatStatValue(row.home, unit);
  const awayDisplay = formatStatValue(row.away, unit);

  return (
    <motion.div
      className="match-stat-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 + index * 0.03 }}
    >
      <div className="grid grid-cols-[3.75rem_minmax(0,1fr)_5rem_minmax(0,1fr)_3.75rem] items-center gap-2 sm:grid-cols-[4.75rem_minmax(0,1fr)_7rem_minmax(0,1fr)_4.75rem] sm:gap-4">
        <span
          className={`match-stat-value text-right text-xl font-bold leading-none tabular-nums sm:text-2xl ${row.homeHigher ? "text-volt" : "text-white/62"}`}
          style={{ fontFamily: "ScreenMatrix, monospace" }}
        >
          {homeDisplay}
        </span>

        <div className="match-stat-track flex h-2.5 items-center justify-end overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_8px_rgba(0,0,0,.32)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${homePct}%` }}
            transition={{ delay: 0.4 + index * 0.03, duration: 0.6 }}
            className={`h-full rounded-full ${row.homeHigher ? "bg-volt shadow-[0_0_14px_rgba(216,255,62,.32)]" : "bg-volt/30"}`}
          />
        </div>

        <span className="match-stat-label min-w-0 text-center text-xs font-semibold uppercase leading-tight tracking-[0.12em] text-white/66 sm:text-sm">
          {row.label}
        </span>

        <div className="match-stat-track flex h-2.5 items-center overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_8px_rgba(0,0,0,.32)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${awayPct}%` }}
            transition={{ delay: 0.4 + index * 0.03, duration: 0.6 }}
            className={`h-full rounded-full ${row.awayHigher ? "bg-flare shadow-[0_0_14px_rgba(255,154,31,.32)]" : "bg-flare/30"}`}
          />
        </div>

        <span
          className={`match-stat-value text-left text-xl font-bold leading-none tabular-nums sm:text-2xl ${row.awayHigher ? "text-flare" : "text-white/62"}`}
          style={{ fontFamily: "ScreenMatrix, monospace" }}
        >
          {awayDisplay}
        </span>
      </div>
    </motion.div>
  );
}

function formatStatValue(value: number | string, unit: string) {
  const display = typeof value === "number" ? (value % 1 !== 0 ? value.toFixed(1) : String(value)) : value;
  return `${display}${unit}`;
}
