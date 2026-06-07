"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { parseTeams } from "@/lib/teams";
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
  const teams = parseTeams(detail.match.summary);
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
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-volt" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
              数据统计
            </h3>
          </div>
        </div>

        {/* Team labels */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-volt">{teams.home.name}</span>
          <span className="text-xs font-semibold uppercase text-flare">{teams.away.name}</span>
        </div>

        {/* Stats rows */}
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
  const total = homeVal + awayVal;
  const homePct = total > 0 ? (homeVal / total) * 100 : 50;
  const unit = row.unit ?? "";
  const homeDisplay = formatStatValue(row.home, unit);
  const awayDisplay = formatStatValue(row.away, unit);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 + index * 0.03 }}
    >
      <div className="mb-2 flex items-center justify-center">
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-white/62 sm:text-base">
          {row.label}
        </span>
      </div>

      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] sm:gap-4">
        <span
          className={`text-right text-2xl font-bold leading-none tabular-nums sm:text-3xl ${row.homeHigher ? "text-volt" : "text-white/60"}`}
          style={{ fontFamily: "ScreenMatrix, monospace" }}
        >
          {homeDisplay}
        </span>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_8px_rgba(0,0,0,.32)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${homePct}%` }}
            transition={{ delay: 0.4 + index * 0.03, duration: 0.6 }}
            className={`rounded-l-full ${row.homeHigher ? "bg-volt shadow-[0_0_14px_rgba(216,255,62,.32)]" : "bg-volt/30"}`}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - homePct}%` }}
            transition={{ delay: 0.4 + index * 0.03, duration: 0.6 }}
            className={`rounded-r-full ${row.awayHigher ? "bg-flare shadow-[0_0_14px_rgba(255,154,31,.32)]" : "bg-flare/30"}`}
          />
        </div>
        <span
          className={`text-left text-2xl font-bold leading-none tabular-nums sm:text-3xl ${row.awayHigher ? "text-flare" : "text-white/60"}`}
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
