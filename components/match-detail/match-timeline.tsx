"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail, MatchEvent, MatchEventType } from "@/types/match";

const EVENT_CONFIG: Record<MatchEventType, { icon: string; label: string; color: string }> = {
  goal:           { icon: "⚽", label: "进球", color: "text-volt" },
  own_goal:       { icon: "⚽", label: "乌龙球", color: "text-red-400" },
  penalty_goal:   { icon: "⚽", label: "点球命中", color: "text-volt" },
  missed_penalty: { icon: "❌", label: "点球未进", color: "text-red-400" },
  yellow_card:    { icon: "🟨", label: "黄牌", color: "text-yellow-400" },
  second_yellow:  { icon: "🟨🟨", label: "两黄变红", color: "text-red-400" },
  red_card:       { icon: "🟥", label: "红牌", color: "text-red-500" },
  substitution:   { icon: "🔁", label: "换人", color: "text-blue-400" },
  var_review:     { icon: "📹", label: "VAR", color: "text-purple-400" },
  kickoff:        { icon: "▶", label: "开球", color: "text-white/50" },
  halftime:       { icon: "⏸", label: "半场", color: "text-yellow-400" },
  fulltime:       { icon: "⏹", label: "终场", color: "text-white/50" },
};

export function MatchTimeline({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);
  const homeName = teams.home.name;
  const awayName = teams.away.name;

  // Split events into home and away halves for visual separation
  const sortedEvents = [...detail.events].sort((a, b) => a.minute - b.minute);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-volt" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
              比赛事件
            </h3>
          </div>
          <span className="text-[10px] text-white/35">
            {sortedEvents.filter((e) => e.type === "goal" || e.type === "penalty_goal").length} 个进球
          </span>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Central line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/5 to-transparent" />

          <div className="space-y-1">
            {sortedEvents.map((event, i) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isHome={event.team === "home"}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineEvent({
  event,
  isHome,
  index,
}: {
  event: MatchEvent;
  isHome: boolean;
  index: number;
}) {
  const config = EVENT_CONFIG[event.type];
  const isGoal = event.type === "goal" || event.type === "penalty_goal";
  const isSpecial = ["goal", "penalty_goal", "red_card", "second_yellow", "var_review"].includes(event.type);

  return (
    <motion.div
      initial={{ opacity: 0, x: isHome ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.03, duration: 0.4 }}
      className={`relative flex items-center gap-3 ${
        isHome ? "flex-row" : "flex-row-reverse"
      } py-1.5`}
    >
      {/* Content side */}
      <div className={`flex-1 ${isHome ? "text-right" : "text-left"}`}>
        <div className={`inline-flex items-center gap-2 ${
          isHome ? "flex-row-reverse" : "flex-row"
        }`}>
          {event.player && (
            <span className={`text-xs font-semibold ${isGoal ? "text-volt" : "text-white/80"}`}>
              {event.player}
            </span>
          )}
          {event.type === "substitution" && event.playerOut && (
            <span className="text-[10px] text-white/40">
              {event.player} ↔ {event.playerOut}
            </span>
          )}
        </div>
        {event.description && (
          <p className={`mt-0.5 text-[10px] text-white/35 ${isHome ? "text-right" : "text-left"}`}>
            {event.description}
          </p>
        )}
      </div>

      {/* Center dot */}
      <div className="relative z-10 flex shrink-0 items-center justify-center">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            isGoal
              ? "bg-volt/20 ring-2 ring-volt/40"
              : isSpecial
              ? "bg-white/10 ring-1 ring-white/20"
              : "bg-white/[0.06] ring-1 ring-white/[0.08]"
          }`}
        >
          <span className="text-xs">{config.icon}</span>
        </div>
      </div>

      {/* Minute badge */}
      <div className={`flex-1 ${isHome ? "text-left" : "text-right"}`}>
        <span className="inline-flex items-center gap-1">
          <span className={`tabular text-xs font-bold ${isGoal ? "text-volt" : "text-white/60"}`}>
            {event.minute}
          </span>
          {event.addedTime && (
            <span className="text-[9px] text-white/30">+{event.addedTime}</span>
          )}
          <span className="text-[9px] text-white/25">{"'"}</span>
        </span>
      </div>
    </motion.div>
  );
}
