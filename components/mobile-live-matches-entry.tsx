"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import type { Match } from "@/types/match";

type MobileLiveMatchesEntryProps = {
  matches: Match[];
};

export function MobileLiveMatchesEntry({ matches }: MobileLiveMatchesEntryProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [open, setOpen] = useState(false);

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
  const isLive = liveNow.length > 0;
  const roundLabels = useMemo(() => buildMatchRoundLabels(matches), [matches]);

  return (
    <>
      <button
        type="button"
        aria-label="打开直播比赛"
        onClick={() => setOpen(true)}
        className={`pointer-events-auto fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[75] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition lg:hidden ${
          open ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
        }`}
      >
        <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
          {isLive ? <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" /> : null}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isLive ? "bg-volt" : "bg-flare"}`} />
        </span>
        <Radio className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭直播比赛"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[100] bg-black/52 backdrop-blur-md lg:hidden"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="直播比赛"
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-[110] flex h-[54dvh] min-h-[20rem] flex-col overflow-hidden rounded-t-[2rem] bg-black/82 shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-2xl lg:hidden"
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
              <div className="flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                <span className="h-1 w-10 rounded-full bg-white/18" />
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Radio className="h-4 w-4 shrink-0 text-volt/80" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-white/34">{isLive ? "LIVE" : "NEXT"}</p>
                    <p className="truncate text-sm font-semibold text-white/86">
                      {isLive ? "正在直播比赛" : "即将开始比赛"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 scrollbar-hidden">
                {displayMatches.length ? (
                  <div className="grid gap-3">
                    {displayMatches.map((match) => (
                      <LiveMatchCard
                        key={match.uid}
                        match={match}
                        isLive={isLive}
                        stageLabel={roundLabels.get(match.uid)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white/[0.04] px-5 py-6 text-center ring-1 ring-white/[0.06]">
                    <p className="text-sm font-semibold text-white/78">暂无直播比赛</p>
                    <p className="mt-2 text-xs leading-5 text-white/42">有新的比赛信号时会在这里出现。</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
