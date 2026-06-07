"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import { getUpcomingMatchesWithinWindow, isMatchInLiveWindow } from "@/lib/live-match-queue";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import type { Match } from "@/types/match";

type MobileLiveMatchesEntryProps = {
  matches: Match[];
};

export function MobileLiveMatchesEntry({ matches }: MobileLiveMatchesEntryProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [openMode, setOpenMode] = useState<"sheet" | "fullscreen" | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const openLiveMatches = (event: Event) => {
      const liveEvent = event as CustomEvent<{ handled?: boolean }>;
      if (liveEvent.detail) liveEvent.detail.handled = true;
      setOpenMode("fullscreen");
    };
    window.addEventListener("open-mobile-live-matches", openLiveMatches);

    const params = new URLSearchParams(window.location.search);
    if (params.get("live") === "1") setOpenMode("fullscreen");

    return () => window.removeEventListener("open-mobile-live-matches", openLiveMatches);
  }, []);

  const displayMatches = useMemo(
    () => getUpcomingMatchesWithinWindow(matches, currentTime, 24),
    [currentTime, matches]
  );
  const isLive = displayMatches.some((match) => isMatchInLiveWindow(match, currentTime));
  const roundLabels = useMemo(() => buildMatchRoundLabels(matches), [matches]);

  return (
    <>
      <button
        type="button"
        aria-label="打开直播比赛"
        onClick={() => setOpenMode("sheet")}
        className={`pointer-events-auto fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[75] grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition lg:hidden ${
          openMode ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35"
        }`}
      >
        <span className="absolute right-1.5 top-1.5 flex h-1.5 w-1.5">
          {isLive ? <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" /> : null}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${isLive ? "bg-volt" : "bg-flare"}`} />
        </span>
        <Radio className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {openMode ? (
          <>
            <motion.button
              type="button"
              aria-label="关闭直播比赛"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpenMode(null)}
              className={`${openMode === "fullscreen" ? "z-40 bg-black/60" : "z-[100] bg-black/52"} fixed inset-0 backdrop-blur-md lg:hidden`}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="直播比赛"
              initial={{ opacity: 0, y: 22, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`${
                openMode === "fullscreen"
                  ? "fixed inset-0 z-40 pt-[calc(env(safe-area-inset-top)+4.25rem)]"
                  : "fixed inset-x-0 bottom-0 z-[110] h-[54dvh] min-h-[20rem] rounded-t-[2rem]"
              } flex flex-col overflow-hidden bg-black/86 shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-2xl lg:hidden`}
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
              {openMode === "sheet" ? (
                <div className="flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                  <span className="h-1 w-10 rounded-full bg-white/18" />
                </div>
              ) : null}
              <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Radio className="h-4 w-4 shrink-0 text-volt/80" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-white/34">NEXT 24H</p>
                    <p className="truncate text-sm font-semibold text-white/86">
                      24小时内即将开赛
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => setOpenMode(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 scrollbar-hidden ${
                  openMode === "fullscreen" ? "pb-[calc(env(safe-area-inset-bottom)+6rem)]" : "pb-6"
                }`}
              >
                {displayMatches.length ? (
                  <div className="grid gap-3">
                    {displayMatches.map((match) => (
                      <LiveMatchCard
                        key={match.uid}
                        match={match}
                        isLive={isMatchInLiveWindow(match, currentTime)}
                        stageLabel={roundLabels.get(match.uid)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white/[0.04] px-5 py-6 text-center ring-1 ring-white/[0.06]">
                    <p className="text-sm font-semibold text-white/78">24小时内暂无即将开赛</p>
                    <p className="mt-2 text-xs leading-5 text-white/42">有新的比赛进入开赛窗口时会自动出现在这里。</p>
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
