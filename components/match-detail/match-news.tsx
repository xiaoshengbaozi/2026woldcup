"use client";

import { motion } from "framer-motion";
import { Newspaper, ExternalLink } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail, MatchNewsItem } from "@/types/match";

const CATEGORY_COLORS: Record<string, string> = {
  preview:   "bg-blue-500/15 text-blue-400 ring-blue-500/20",
  lineup:    "bg-volt/15 text-volt ring-volt/20",
  injury:    "bg-red-500/15 text-red-400 ring-red-500/20",
  analysis:  "bg-purple-500/15 text-purple-400 ring-purple-500/20",
  postmatch: "bg-flare/15 text-flare ring-flare/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  preview: "赛前",
  lineup: "阵容",
  injury: "伤病",
  analysis: "分析",
  postmatch: "赛后",
};

export function MatchNews({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-volt" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
              相关新闻
            </h3>
          </div>
          <span className="text-[10px] text-white/35">
            {teams.home.name} vs {teams.away.name}
          </span>
        </div>

        {/* News grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {detail.news.map((item, i) => (
            <NewsCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function NewsCard({ item, index }: { item: MatchNewsItem; index: number }) {
  const colorClass = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.analysis;
  const label = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.04, duration: 0.4 }}
      className="group flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.06] transition hover:bg-white/[0.06] hover:ring-white/[0.12]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${colorClass}`}>
          {label}
        </span>
        <ExternalLink className="h-3 w-3 shrink-0 text-white/20 transition group-hover:text-white/50" />
      </div>

      <p className="text-xs font-medium leading-relaxed text-white/80 line-clamp-2 group-hover:text-white">
        {item.title}
      </p>

      <div className="flex items-center gap-2 text-[10px] text-white/35">
        <span>{item.source}</span>
        <span>·</span>
        <span>{formatRelativeTime(item.publishedAt)}</span>
      </div>
    </motion.a>
  );
}
