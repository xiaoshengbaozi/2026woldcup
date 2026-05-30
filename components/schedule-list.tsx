import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { MatchCardCompact } from "@/components/match-card-compact";
import { TopologyBracket } from "@/components/topology-bracket";
import { getDayStatus } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type { Match } from "@/types/match";
import type { ScheduleLayout } from "@/app/matches/page";

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

type DayCardProps = {
  day: string;
  matches: Match[];
  index: number;
  timezoneOffset: number;
};

function DayCard({ day, matches, index, timezoneOffset }: DayCardProps) {
  const firstStart = new Date(matches[0].start.getTime() + timezoneOffset * 3600000);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16, filter: "blur(12px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(10px)" }}
      transition={{
        delay: Math.min(index * 0.025, 0.22),
        duration: 0.45
      }}
      className="hero-card overflow-hidden p-2.5 sm:p-3"
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <h2 className="text-sm font-medium text-white sm:text-base">
          {formatDate(firstStart)}
        </h2>
      </div>

      <div className="flex flex-col gap-0">
        {matches.map((match, i) => (
          <div key={match.uid}>
            {i > 0 && (
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent my-1.5 md:my-2" />
            )}
            <MatchCardCompact
              match={match}
              timezoneOffset={timezoneOffset}
            />
          </div>
        ))}
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
  layout: ScheduleLayout;
};

export function ScheduleList({
  grouped,
  loading,
  error,
  isEmpty,
  timezoneOffset,
  layout
}: ScheduleListProps) {
  const days = [...grouped.entries()];

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

      {layout === "default" && (
        <AnimatePresence mode="popLayout">
          {days.map(([day, dayMatches], index) => (
            <DaySection
              key={day}
              day={day}
              matches={dayMatches}
              index={index}
              timezoneOffset={timezoneOffset}
            />
          ))}
        </AnimatePresence>
      )}

      {layout === "waterfall" && (
        <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {days.map(([day, dayMatches], index) => (
            <DayCard
              key={day}
              day={day}
              matches={dayMatches}
              index={index}
              timezoneOffset={timezoneOffset}
            />
          ))}
        </div>
      )}
      {layout === "topology" && (
        <TopologyBracket
          matches={Array.from(grouped.values()).flat()}
          timezoneOffset={timezoneOffset}
        />
      )}
    </main>
  );
}
