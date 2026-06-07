"use client";

import { Radio } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { LiveMatchCard } from "@/components/world-cup-hero/live-match-card";
import { getUpcomingMatchesWithinWindow, isMatchInLiveWindow } from "@/lib/live-match-queue";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import type { Match } from "@/types/match";

type MobileLiveMatchesListProps = {
  matches: Match[];
  className?: string;
  scrollClassName?: string;
  action?: ReactNode;
};

export function MobileLiveMatchesList({
  matches,
  className = "",
  scrollClassName = "pb-6",
  action,
}: MobileLiveMatchesListProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const displayMatches = useMemo(
    () => getUpcomingMatchesWithinWindow(matches, currentTime, 24),
    [currentTime, matches]
  );
  const roundLabels = useMemo(() => buildMatchRoundLabels(matches), [matches]);

  return (
    <section className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Radio className="h-4 w-4 shrink-0 text-volt/80" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-white/34">NEXT 24H</p>
            <p className="truncate text-sm font-semibold text-white/86">24小时内即将开赛</p>
          </div>
        </div>
        {action}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 scrollbar-hidden ${scrollClassName}`}>
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
    </section>
  );
}
