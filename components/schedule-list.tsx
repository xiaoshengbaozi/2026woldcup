import { Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { MatchCard } from "@/components/match-card";
import { MatchCardCompact } from "@/components/match-card-compact";
import { getDayStatus } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { getStageGroupId, getStageKind, type StageKind } from "@/lib/stage";
import { buildMatchRoundLabels } from "@/lib/stage-rounds";
import type { Match } from "@/types/match";
import type { ScheduleLayout } from "@/app/matches/page";

const MatchCalendarView = dynamic(
  () => import("@/components/match-calendar-view").then((mod) => mod.MatchCalendarView),
  { ssr: false, loading: () => null }
);
const TopologyBracket = dynamic(
  () => import("@/components/topology-bracket").then((mod) => mod.TopologyBracket),
  { ssr: false, loading: () => null }
);

type DaySectionProps = {
  day: string;
  matches: Match[];
  index: number;
  timezoneOffset: number;
  roundLabels: Map<string, string>;
};

export function DaySection({ day, matches, index, timezoneOffset, roundLabels }: DaySectionProps) {
  const firstStart = new Date(matches[0].start.getTime() + timezoneOffset * 3600000);

  return (
    <section
      className="hero-card overflow-hidden p-5 sm:p-6"
      style={index > 1 ? { contentVisibility: "auto", containIntrinsicSize: "420px" } : undefined}
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
                  <MatchCard match={left} timezoneOffset={timezoneOffset} stageLabel={roundLabels.get(left.uid)} />
                </div>
                {right ? (
                  <>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent my-3 md:hidden" />
                    <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
                    <div className="md:pl-5">
                      <MatchCard match={right} timezoneOffset={timezoneOffset} stageLabel={roundLabels.get(right.uid)} />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

type GroupCardProps = {
  group: string;
  matches: Match[];
  index: number;
  timezoneOffset: number;
  roundLabels: Map<string, string>;
};

function GroupCard({ group, matches, index, timezoneOffset, roundLabels }: GroupCardProps) {
  return (
    <section
      className="hero-card overflow-hidden p-2.5 sm:p-3"
      style={index > 5 ? { contentVisibility: "auto", containIntrinsicSize: "260px" } : undefined}
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <h2 className="text-sm font-medium text-white sm:text-base">
          {formatGroupTitle(group)}
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
              stageLabel={roundLabels.get(match.uid)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

type ScheduleListProps = {
  grouped: Map<string, Match[]>;
  loading: boolean;
  error: string;
  isEmpty: boolean;
  timezoneOffset: number;
  layout: ScheduleLayout;
  matchesForRoundLabels: Match[];
  topologyMatches?: Match[];
};

export function ScheduleList({
  grouped,
  loading,
  error,
  isEmpty,
  timezoneOffset,
  layout,
  matchesForRoundLabels,
  topologyMatches
}: ScheduleListProps) {
  const days = [...grouped.entries()];
  const flatMatches = Array.from(grouped.values()).flat();
  const roundLabels = buildMatchRoundLabels(matchesForRoundLabels);
  const groupSections = groupMatchesByStageGroup(flatMatches);

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
        <>
          {days.map(([day, dayMatches], index) => (
            <DaySection
              key={day}
              day={day}
              matches={dayMatches}
              index={index}
              timezoneOffset={timezoneOffset}
              roundLabels={roundLabels}
            />
          ))}
        </>
      )}

      {layout === "waterfall" && (
        <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {groupSections.map(([group, groupMatches], index) => (
            <GroupCard
              key={group}
              group={group}
              matches={groupMatches}
              index={index}
              timezoneOffset={timezoneOffset}
              roundLabels={roundLabels}
            />
          ))}
        </div>
      )}
      {layout === "topology" && (
        <TopologyBracket
          matches={topologyMatches?.length ? topologyMatches : flatMatches}
          timezoneOffset={timezoneOffset}
        />
      )}
      {layout === "calendar" && (
        <MatchCalendarView
          matches={flatMatches}
          timezoneOffset={timezoneOffset}
        />
      )}
    </main>
  );
}

function groupMatchesByStageGroup(matches: Match[]) {
  const grouped = matches.reduce<Map<string, Match[]>>((acc, match) => {
    const kind = getStageKind(match.stage, match.stageKind);
    const groupId = getStageGroupId(match.stage) ?? getKnockoutStageGroupId(kind);
    if (!acc.has(groupId)) acc.set(groupId, []);
    acc.get(groupId)?.push(match);
    return acc;
  }, new Map());

  return [...grouped.entries()].sort(([left], [right]) => rankGroup(left) - rankGroup(right));
}

function getKnockoutStageGroupId(kind: StageKind) {
  if (kind === "sf" || kind === "third" || kind === "final") return "final-week";
  return "knockout";
}

function formatGroupTitle(group: string) {
  if (group === "knockout") return "淘汰赛";
  if (group === "final-week") return "决赛周";
  return group + " 组";
}
function rankGroup(group: string) {
  if (group === "knockout") return 99;
  if (group === "final-week") return 100;
  return group.charCodeAt(0) - 64;
}

