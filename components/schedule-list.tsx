import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { getDayStatus } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type { Match } from "@/types/match";

type DaySectionProps = {
  day: string;
  matches: Match[];
  index: number;
  timezoneOffset: number;
};

export function DaySection({ day, matches, index, timezoneOffset }: DaySectionProps) {
  const firstStart = new Date(matches[0].start.getTime() + timezoneOffset * 3600000);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 20, filter: "blur(14px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -10, filter: "blur(12px)" }}
      transition={{
        delay: Math.min(index * 0.035, 0.28),
        duration: 0.55
      }}
      className="hero-card overflow-hidden p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-medium text-white">
          {formatDate(firstStart)}
        </h2>
        <div className="glass-chip flex items-center gap-2 px-4 py-2 text-sm text-white/66">
          <Clock className="h-4 w-4 text-flare" />
          {getDayStatus(matches)}
        </div>
      </div>

      <div className="grid gap-0">
        {Array.from({ length: Math.ceil(matches.length / 2) }, (_, i) => {
          const left = matches[i * 2];
          const right = matches[i * 2 + 1];
          return (
            <div key={left.uid}>
              {i > 0 && (
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent my-4 md:my-6" />
              )}
              <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_1px_1fr]">
                <div className="md:pr-5">
                  <MatchCard match={left} timezoneOffset={timezoneOffset} />
                </div>
                {right ? (
                  <>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent my-3 md:hidden" />
                    <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
                    <div className="md:pl-5">
                      <MatchCard match={right} timezoneOffset={timezoneOffset} />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

type ScheduleListProps = {
  grouped: Map<string, Match[]>;
  loading: boolean;
  error: string;
  isEmpty: boolean;
  timezoneOffset: number;
};

export function ScheduleList({
  grouped,
  loading,
  error,
  isEmpty,
  timezoneOffset
}: ScheduleListProps) {
  return (
    <main className="space-y-5">
      {loading && (
        <div className="hero-card p-8 text-center">
          <p className="text-white/55">正在同步赛事控制台...</p>
        </div>
      )}

      {error && (
        <div className="hero-card p-8 text-center">
          <p className="text-flare">{error}</p>
        </div>
      )}

      {isEmpty && (
        <div className="hero-card p-8 text-center">
          <p className="text-white/55">没有找到匹配的赛事信号。</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {[...grouped.entries()].map(([day, dayMatches], index) => (
          <DaySection
            key={day}
            day={day}
            matches={dayMatches}
            index={index}
            timezoneOffset={timezoneOffset}
          />
        ))}
      </AnimatePresence>
    </main>
  );
}
