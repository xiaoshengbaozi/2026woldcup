"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Radio } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import { getLiveMatchQueue, isMatchInLiveWindow } from "@/lib/live-match-queue";
import { areMatchTeamsConfirmed } from "@/lib/match-availability";
import { generateMatchRouteSlug } from "@/lib/match-detail";
import { getMatchPhaseLabel, getMatchScore, hasMatchStarted } from "@/lib/match-live-display";
import { formatStageLabel } from "@/lib/stage";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import { parseTeams } from "@/lib/teams";
import { useNow } from "@/lib/use-now";
import { useVisibleRaf } from "@/lib/use-visible-raf";
import type { Match } from "@/types/match";

type LiveMatchesStripProps = {
  matches: Match[];
};

const TICKER_SPEED = 50; // px per second, matching the data page ticker
const TICKER_ITEM_WIDTH = 260;

export function LiveMatchesStrip({ matches }: LiveMatchesStripProps) {
  const currentTime = useNow(30_000);
  const [expanded, setExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const tickerContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number>(0);

  const { displayMatches, isLive } = useMemo(
    () => getLiveMatchQueue(matches, currentTime),
    [currentTime, matches]
  );
  const tickerWidth = displayMatches.length * TICKER_ITEM_WIDTH;
  const roundLabels = useMemo(() => buildMatchRoundLabels(matches), [matches]);

  const animateTicker = useCallback(
    (time: number) => {
      if (!streamRef.current || isPaused || tickerWidth === 0) {
        lastTimeRef.current = time;
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
    },
    [isPaused, tickerWidth]
  );

  useEffect(() => {
    offsetRef.current = 0;
    lastTimeRef.current = 0;
    if (streamRef.current) streamRef.current.style.transform = "translateX(0px)";
  }, [tickerWidth]);

  useVisibleRaf(animateTicker, {
    enabled: !isPaused && tickerWidth > 0,
    elementRef: tickerContainerRef,
    onStop: () => {
      lastTimeRef.current = 0;
    },
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65 }}
      className="hidden space-y-3 sm:block"
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
              直播
            </span>
            <Radio className="h-3.5 w-3.5 animate-pulse text-volt/70" />
          </button>

          {displayMatches.length > 0 && (
            <div ref={tickerContainerRef} className="relative h-full min-w-0 flex-1 overflow-hidden">
              <div
                ref={streamRef}
                className="flex h-full whitespace-nowrap will-change-transform"
                style={{ width: tickerWidth * 2 }}
              >
                {displayMatches.map((match) => (
                  <MatchTickerItem key={match.uid} match={match} isLive={isMatchInLiveWindow(match, currentTime)} stageLabel={roundLabels.get(match.uid)} currentTime={currentTime} />
                ))}
                {displayMatches.map((match) => (
                  <MatchTickerItem key={`dup-${match.uid}`} match={match} isLive={isMatchInLiveWindow(match, currentTime)} stageLabel={roundLabels.get(match.uid)} currentTime={currentTime} />
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
              展开
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
                  <LiveMatchCard key={match.uid} match={match} isLive={isMatchInLiveWindow(match, currentTime)} stageLabel={roundLabels.get(match.uid)} currentTime={currentTime} />
                ))}
              </div>
            ) : (
              <div
                className="live-matches-empty rounded-3xl px-5 py-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), rgba(5,8,8,0.88)",
                  boxShadow: "0 30px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(216,255,62,0.06)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-sm font-semibold text-white/78">暂无正在直播的比赛</p>
                <p className="mt-2 text-xs leading-5 text-white/42">
                  直播条会自动显示下一批赛程。
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function MatchTickerItem({ match, isLive, stageLabel, currentTime }: { match: Match; isLive: boolean; stageLabel?: string; currentTime: number }) {
  const teams = parseTeams(match.summary);
  const slug = generateMatchRouteSlug(match);
  const isUnlocked = areMatchTeamsConfirmed(match.summary);
  const hasStarted = hasMatchStarted(match) || isLive;
  const elapsed = Math.max(0, Math.floor(((currentTime > 0 ? currentTime : match.start.getTime()) - match.start.getTime()) / 60000));
  const time = hasStarted ? getMatchPhaseLabel({ ...match, elapsed }) : match.start.toLocaleTimeString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const score = getMatchScore(match);
  const matchup = hasStarted
    ? `${teams.home.name}${score.home}:${score.away}${teams.away.name}`
    : `${teams.home.name} 对 ${teams.away.name}`;

  const content = (
    <>
      <span className="truncate text-white/36">{stageLabel ?? formatStageLabel(match.stage, match.summary)}</span>
      <span className="text-white/22">/</span>
      <span className="truncate font-semibold text-white/72">{matchup}</span>
      <span className={`shrink-0 font-semibold ${isLive ? "text-volt" : "text-white/40"}`}>
        {time}
      </span>
    </>
  );

  return isUnlocked ? (
    <Link
      href={"/matches/" + slug}
      prefetch={false}
      className="inline-flex h-full shrink-0 items-center gap-3 border-r border-white/[0.04] px-3 text-[10px] uppercase tracking-[0.12em] text-white/52 transition-colors duration-150 hover:bg-white/[0.04]"
      style={{ width: TICKER_ITEM_WIDTH }}
    >
      {content}
    </Link>
  ) : (
    <div
      aria-disabled="true"
      className="inline-flex h-full shrink-0 items-center gap-3 border-r border-white/[0.04] px-3 text-[10px] uppercase tracking-[0.12em] text-white/42 opacity-70"
      style={{ width: TICKER_ITEM_WIDTH }}
    >
      {content}
    </div>
  );
}
