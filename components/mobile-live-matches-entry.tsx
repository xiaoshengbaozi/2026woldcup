"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MobileLiveMatchesList } from "@/components/mobile-live-matches-list";
import { mobileFloatingSurfaceStyle } from "@/components/mobile-surface-styles";
import { getLiveAndUpcomingMatchesWithinWindow, isMatchInLiveWindow } from "@/lib/live-match-queue";
import { useNow } from "@/lib/use-now";
import type { Match } from "@/types/match";

type MobileLiveMatchesEntryProps = {
  matches: Match[];
  variant?: "fixed" | "inline";
};

export function MobileLiveMatchesEntry({ matches, variant = "fixed" }: MobileLiveMatchesEntryProps) {
  const currentTime = useNow(30_000);
  const [open, setOpen] = useState(false);

  const displayMatches = useMemo(
    () => getLiveAndUpcomingMatchesWithinWindow(matches, currentTime, 24),
    [currentTime, matches]
  );
  const isLive = displayMatches.some((match) => isMatchInLiveWindow(match, currentTime));
  const buttonPositionClass =
    variant === "fixed"
      ? "fixed right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[75]"
      : "relative";
  const buttonToneClass = open ? "ring-volt/55 text-volt" : "ring-white/12 hover:text-white hover:ring-volt/35";

  return (
    <>
      <button
        type="button"
        aria-label="打开直播比赛"
        onClick={() => setOpen(true)}
        className={`mobile-floating-surface pointer-events-auto grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.08] text-white/72 shadow-[0_14px_34px_rgba(0,0,0,.38),0_0_20px_rgba(216,255,62,.1),inset_0_1px_0_rgba(255,255,255,.16)] ring-1 backdrop-blur-2xl transition lg:hidden ${buttonPositionClass} ${
          buttonToneClass
        }`}
        style={mobileFloatingSurfaceStyle}
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
              initial={{ opacity: 0, y: 22, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 22, scale: 0.99 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-[110] flex h-[54dvh] min-h-[20rem] flex-col overflow-hidden rounded-t-[2rem] bg-black/86 shadow-[0_-28px_90px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.09),0_0_48px_rgba(216,255,62,.08)] backdrop-blur-2xl lg:hidden"
            >
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />
              <div className="flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                <span className="h-1 w-10 rounded-full bg-white/18" />
              </div>
              <MobileLiveMatchesList
                matches={matches}
                scrollClassName="pb-6"
                action={(
                  <button
                    type="button"
                    aria-label="关闭"
                    onClick={() => setOpen(false)}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.055] text-white/52 transition hover:bg-white/[0.09] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
