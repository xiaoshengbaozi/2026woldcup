"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type MatchesHeaderProps = {
  matchCount: number;
};

export function MatchesHeader({
  matchCount
}: MatchesHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      className="hero-shell relative z-30 flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-7"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href="/"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.035] text-white/60 transition hover:text-volt hover:bg-white/[0.065]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold uppercase text-white sm:text-2xl">
            比赛赛程
          </h1>
          <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white/42 sm:text-xs sm:tracking-[0.16em]">
            {matchCount} 场比赛 · 2026 FIFA 世界杯
          </p>
        </div>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <div className="flex h-10 items-center gap-2 rounded-full bg-volt/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-volt shadow-[0_0_22px_rgba(216,255,62,.18)] ring-1 ring-volt/30">
          <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_10px_rgba(216,255,62,.8)]" />
          同步中
        </div>
      </div>
    </motion.header>
  );
}
