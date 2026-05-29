"use client";

import { motion } from "framer-motion";
import { TrendingUp, Activity } from "lucide-react";
import { useState } from "react";
import type { MatchDetail } from "@/types/match";

export function MatchOdds({ detail }: { detail: MatchDetail }) {
  const { odds } = detail;
  const [hovered, setHovered] = useState<"home" | "draw" | "away" | null>(null);

  const total = odds.homeWin + odds.draw + odds.awayWin;
  const homePct = (odds.homeWin / total) * 100;
  const drawPct = (odds.draw / total) * 100;
  const awayPct = (odds.awayWin / total) * 100;

  const maxProb = Math.max(odds.homeWin, odds.draw, odds.awayWin);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-volt" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
              胜率分析
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <TrendingUp className="h-3 w-3" />
            <span>AI 预测模型</span>
          </div>
        </div>

        {/* Probability bars */}
        <div className="space-y-3">
          <ProbabilityBar
            label="胜"
            value={odds.homeWin}
            pct={homePct}
            color="volt"
            isMax={odds.homeWin === maxProb}
            isHovered={hovered === "home"}
            onHover={() => setHovered("home")}
            onLeave={() => setHovered(null)}
          />
          <ProbabilityBar
            label="平"
            value={odds.draw}
            pct={drawPct}
            color="white"
            isMax={odds.draw === maxProb}
            isHovered={hovered === "draw"}
            onHover={() => setHovered("draw")}
            onLeave={() => setHovered(null)}
          />
          <ProbabilityBar
            label="负"
            value={odds.awayWin}
            pct={awayPct}
            color="flare"
            isMax={odds.awayWin === maxProb}
            isHovered={hovered === "away"}
            onHover={() => setHovered("away")}
            onLeave={() => setHovered(null)}
          />
        </div>

        {/* Stacked bar visualization */}
        <div className="mt-6 overflow-hidden rounded-lg bg-black/30 ring-1 ring-white/[0.06]">
          <div className="flex h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${homePct}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="bg-volt"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${drawPct}%` }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/40"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${awayPct}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="bg-flare"
            />
          </div>
          <div className="flex justify-between px-3 py-2 text-[10px] text-white/45">
            <span>{homePct.toFixed(1)}%</span>
            <span>{drawPct.toFixed(1)}%</span>
            <span>{awayPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Mini sparkline */}
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
            24h 概率走势
          </p>
          <div className="h-16 overflow-hidden rounded-lg bg-black/20 ring-1 ring-white/[0.04]">
            <svg
              viewBox="0 0 480 64"
              className="h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sparkHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D8FF3E" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#D8FF3E" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sparkAway" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF9A1F" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF9A1F" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Home line */}
              <path
                d={generateSparklinePath(odds.history.map((h) => h.homeWin), 480, 64)}
                fill="url(#sparkHome)"
                stroke="#D8FF3E"
                strokeWidth="1.5"
              />
              {/* Away line */}
              <path
                d={generateSparklinePath(odds.history.map((h) => h.awayWin), 480, 64)}
                fill="url(#sparkAway)"
                stroke="#FF9A1F"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-white/30">
            <span>24h 前</span>
            <span>现在</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProbabilityBar({
  label,
  value,
  pct,
  color,
  isMax,
  isHovered,
  onHover,
  onLeave,
}: {
  label: string;
  value: number;
  pct: number;
  color: "volt" | "white" | "flare";
  isMax: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const colorMap = {
    volt: { bar: "bg-volt", text: "text-volt", glow: "shadow-[0_0_20px_rgba(216,255,62,0.3)]" },
    white: { bar: "bg-white/60", text: "text-white", glow: "shadow-[0_0_20px_rgba(255,255,255,0.15)]" },
    flare: { bar: "bg-flare", text: "text-flare", glow: "shadow-[0_0_20px_rgba(255,154,31,0.3)]" },
  };
  const c = colorMap[color];

  return (
    <div
      className="group cursor-default"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/70">{label}</span>
          {isMax && (
            <span className="rounded bg-volt/15 px-1.5 py-0.5 text-[9px] font-semibold text-volt">
              FAVORITE
            </span>
          )}
        </div>
        <span className={`tabular text-sm font-bold ${c.text}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${c.bar} ${isHovered ? c.glow : ""} transition-shadow duration-300`}
        />
      </div>
    </div>
  );
}

function generateSparklinePath(data: number[], width: number, height: number): string {
  if (!data.length) return "";

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  });

  const linePath = points.join(" ");
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;

  return fillPath;
}
