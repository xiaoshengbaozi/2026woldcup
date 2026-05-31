"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Radio } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import { generateMatchSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import { parseTeams } from "@/lib/teams";
import type { Match } from "@/types/match";

type LiveMatchesStripProps = {
  matches: Match[];
};

const TICKER_SPEED = 50; // px per second, matching the data page ticker
const TICKER_ITEM_WIDTH = 260;

export function LiveMatchesStrip({ matches }: LiveMatchesStripProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

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
  const tickerWidth = displayMatches.length * TICKER_ITEM_WIDTH;

  const animateTicker = useCallback(
    (time: number) => {
      if (!streamRef.current || isPaused || tickerWidth === 0) {
        lastTimeRef.current = time;
        rafRef.current = requestAnimationFrame(animateTicker);
        return;
      }

      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      offsetRef.current -= TICKER_SPEED * dt;
      if (Math.abs(offsetRef.current) >= tickerWidth) {
        offsetRef.current += tickerWidth;
      }

      streamRef.current.style.transform = `translateX(${offsetRef.current}px)`;
      rafRef.current = requestAnimationFrame(animateTicker);
    },
    [isPaused, tickerWidth]
  );

  useEffect(() => {
    offsetRef.current = 0;
    lastTimeRef.current = 0;
    if (streamRef.current) streamRef.current.style.transform = "translateX(0px)";
  }, [tickerWidth]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateTicker);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animateTicker]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="space-y-3"
    >
      <div className="hero-card overflow-hidden">
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="relative z-10 flex h-[var(--ticker-height)] w-full items-center overflow-hidden border-b border-white/[0.04] text-[10px] uppercase tracking-[0.12em] transition hover:text-white/90"
        >
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-full shrink-0 items-center gap-2.5 border-r border-white/[0.06] px-4 transition-colors duration-150 hover:bg-white/[0.04]"
            aria-expanded={expanded}
          >
            <span className="relative flex h-2 w-2">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-volt shadow-[0_0_10px_rgba(216,255,62,0.7)]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-volt">
              LIVE
            </span>
            <Radio className="h-3.5 w-3.5 animate-pulse text-volt/70" />
          </button>

          {displayMatches.length > 0 && (
            <div className="relative h-full min-w-0 flex-1 overflow-hidden">
              <div
                ref={streamRef}
                className="flex h-full whitespace-nowrap will-change-transform"
                style={{ width: tickerWidth * 2 }}
              >
                {displayMatches.map((match) => (
                  <MatchTickerItem key={match.uid} match={match} isLive={isLive} />
                ))}
                {displayMatches.map((match) => (
                  <MatchTickerItem key={`dup-${match.uid}`} match={match} isLive={isLive} />
                ))}
              </div>
            </div>
          )}

          <div className="h-full w-px shrink-0 bg-white/[0.06]" />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-full shrink-0 items-center gap-2 px-4 transition-colors duration-150 hover:bg-white/[0.04]"
            aria-expanded={expanded}
          >
            <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-white/32">
              Details
            </span>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-white/40"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {displayMatches.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {displayMatches.map((match) => (
                  <LiveMatchCard key={match.uid} match={match} isLive={isLive} />
                ))}
              </div>
            ) : (
              <div
                className="rounded-3xl px-5 py-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), rgba(5,8,8,0.88)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(216,255,62,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-sm font-semibold text-white/78">No live matches right now</p>
                <p className="mt-2 text-xs leading-5 text-white/42">
                  The ticker will automatically show the next scheduled fixtures.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function MatchTickerItem({ match, isLive }: { match: Match; isLive: boolean }) {
  const teams = parseTeams(match.summary);
  const slug = generateMatchSlug(match.summary);
  const time = match.start.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Link
      href={"/matches/" + slug}
      className="inline-flex h-full shrink-0 items-center gap-3 border-r border-white/[0.04] px-3 text-[10px] uppercase tracking-[0.12em] text-white/52 transition-colors duration-150 hover:bg-white/[0.04]"
      style={{ width: TICKER_ITEM_WIDTH }}
    >
      <span className="truncate font-semibold text-white/72">{teams.home.name}</span>
      <span className="text-white/26">vs</span>
      <span className="truncate font-semibold text-white/72">{teams.away.name}</span>
      <span className="text-white/22">/</span>
      <span className="truncate text-white/36">{formatStageLabel(match.stage)}</span>
      <span className={`ml-auto font-semibold ${isLive ? "text-volt" : "text-white/40"}`}>
        {time}
      </span>
    </Link>
  );
}
