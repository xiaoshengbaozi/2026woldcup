"use client";

import { motion } from "framer-motion";
import { parseTeams } from "@/lib/teams";
import { formatDate } from "@/lib/format";
import { formatStageLabel } from "@/lib/stage";
import type { MatchDetail } from "@/types/match";

export function MatchSeoContent({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);
  const home = teams.home.name;
  const away = teams.away.name;
  const date = formatDate(detail.match.start);
  const stage = formatStageLabel(detail.match.stage, detail.match.summary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative px-4 py-6 sm:px-6 sm:py-8">
        <h2 className="mb-4 text-lg font-bold text-white">
          {home} vs {away} — {stage} 完整分析
        </h2>

        <div className="space-y-4 text-sm leading-relaxed text-white/55">
          <p>
            {date}，{home}将在{stage}中迎战{away}。这场备受瞩目的对决将决定两队在世界杯征程中的命运。
          </p>

          <h3 className="text-sm font-semibold text-white/80">赛前分析</h3>
          <p>
            从数据来看，{home}在本届赛事中展现出了强劲的竞争力。
            {detail.odds.homeWin > detail.odds.awayWin
              ? `目前赔率显示${home}被看好拿下比赛，胜率达到${detail.odds.homeWin.toFixed(1)}%。`
              : `${away}则被市场更看好，胜率为${detail.odds.awayWin.toFixed(1)}%。`}
            两队在历史交锋中互有胜负，这场比赛注定充满悬念。
          </p>

          <h3 className="text-sm font-semibold text-white/80">阵容展望</h3>
          <p>
            当前阵容栏展示候选大名单与球员池信息，正式世界杯名单和本场首发会在可靠数据更新后再呈现。
            两队的核心球员状态将直接影响比赛走势。
          </p>

          <h3 className="text-sm font-semibold text-white/80">预测</h3>
          <p>
            综合赔率数据、历史交锋和球队近况，我们认为这将是一场势均力敌的较量。
            {detail.odds.homeWin > detail.odds.awayWin
              ? `${home}凭借主场优势和更高的市场预期，略占上风。`
              : `${away}的整体实力和市场认可度更高，有望取得胜利。`}
          </p>
        </div>

        {/* SEO keywords */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            `${home} vs ${away}`,
            `${home} 阵容`,
            `${away} 阵容`,
            `${home} 赔率`,
            `世界杯 ${stage}`,
            `${home} vs ${away} 预测`,
            `${home} vs ${away} 直播`,
          ].map((keyword) => (
            <span
              key={keyword}
              className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-white/30 ring-1 ring-white/[0.06]"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
