"use client";

import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import type { Match } from "@/types/match";

type LiveMatchesStripProps = {
  matches: Match[];
};

export function LiveMatchesStrip({ matches }: LiveMatchesStripProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const liveNow = useMemo(() => {
    return matches
      .filter((match) => {
        const start = match.start.getTime();
        const end = match.end?.getTime() ?? start + 2 * 60 * 60 * 1000;
        return start <= currentTime && currentTime <= end;
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [currentTime, matches]);

  const upcomingMatches = useMemo(() => {
    return matches
      .filter((match) => match.start.getTime() > currentTime)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [currentTime, matches]);

  const displayMatches = liveNow.length ? liveNow : upcomingMatches;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,.7)]" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-wide text-white">正在直播</p>
          <Radio className="h-3.5 w-3.5 animate-pulse text-red-400" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
          {liveNow.length ? "Live Signal" : "Next Fixtures"}
        </span>
      </div>

      {displayMatches.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {displayMatches.map((match) => (
            <LiveMatchCard key={match.uid} match={match} isLive={liveNow.length > 0} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/[0.035] px-5 py-6 text-center ring-1 ring-white/[0.06]">
          <p className="text-sm font-semibold text-white/78">暂无正在直播的比赛</p>
          <p className="mt-2 text-xs leading-5 text-white/42">直播窗口会自动匹配官方赛程中的真实对阵。</p>
        </div>
      )}
    </motion.section>
  );
}
