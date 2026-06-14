"use client";

import { useMemo } from "react";
import { BarChart3, Zap } from "lucide-react";
import { getFavoriteTeamCode, type FavoriteMatchCard } from "@/lib/favorite-matches";
import { buildOddsSelectionForTeams, sameOddsMarket, type OddsSelection } from "@/lib/match-odds-selection";
import { useMatchLines } from "@/lib/use-match-lines";
import type { Team } from "@/types/match";
import type { MatchLineMarket } from "@/types/messages";

type FavoriteOddsItem = {
  label: string;
  value: number;
  active: boolean;
};

export function FavoriteLiveOddsPanel({ match }: { match: FavoriteMatchCard }) {
  const { events, timestamp } = useMatchLines();
  const selection = useMemo(
    () =>
      buildOddsSelectionForTeams(
        {
          homeTeamCode: match.sourceMatch?.homeTeam?.code || getFavoriteTeamCode(match.home),
          awayTeamCode: match.sourceMatch?.awayTeam?.code || getFavoriteTeamCode(match.away),
        },
        events,
        timestamp,
      ),
    [events, match.away, match.home, match.sourceMatch?.awayTeam?.code, match.sourceMatch?.homeTeam?.code, timestamp],
  );
  const odds = getFavoriteMatchLiveOdds(match, selection);
  const [homeOdds, drawOdds, awayOdds] = odds;
  const hasLiveOdds = selection.source === "api" && Boolean(homeOdds && drawOdds && awayOdds);
  const probabilitySegments = hasLiveOdds ? buildFavoriteLiveProbabilitySegments(homeOdds, drawOdds, awayOdds) : [];

  return (
    <div className="favorites-odds-panel relative mx-auto overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111113]/90 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:shadow-[0_24px_56px_rgba(0,0,0,0.3)]">
      <div className="favorites-odds-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(216,255,62,0.12),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(255,154,31,0.10),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />

      <div className="favorites-odds-header relative border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-volt" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.13em] text-white">比赛预测</h4>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${hasLiveOdds ? "text-volt" : "text-white/35"}`}>
            {hasLiveOdds ? "Polymarket 实时" : "暂无盘口"}
          </span>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <FavoritePredictionTeam team={match.home} align="left" />
          <div className="flex items-center gap-1.5 text-white/30">
            <div className="h-px w-6 bg-white/10" />
            <div className="favorite-prediction-bolt grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[0.035] shadow-[0_0_22px_rgba(216,255,62,0.10)]">
              <Zap className="h-3.5 w-3.5 text-volt/70" />
            </div>
            <div className="h-px w-6 bg-white/10" />
          </div>
          <FavoritePredictionTeam team={match.away} align="right" />
        </div>

        {hasLiveOdds ? (
          <div className="favorites-probability-card relative overflow-hidden rounded-2xl border border-white/[0.07] bg-black/26 px-4 py-3">
            <div className="relative grid grid-cols-3 gap-2">
              {probabilitySegments.map((segment) => (
                <div key={segment.label} className={`min-w-0 ${segment.alignClass}`}>
                  <p
                    className={`favorites-segment-value text-xl font-black leading-none tabular-nums ${segment.valueClass}`}
                    style={{ fontFamily: "ScreenMatrix, monospace" }}
                  >
                    {segment.probability}%
                  </p>
                  <p className="favorites-segment-label mt-1 truncate text-[9px] font-black uppercase tracking-[0.12em] text-white/30">{segment.label}</p>
                </div>
              ))}
            </div>
            <div className="favorites-probability-track relative mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="flex h-full w-full">
                {probabilitySegments.map((segment) => (
                  <div
                    key={`${segment.label}-bar`}
                    className={`h-full ${segment.barClass}`}
                    style={{ width: `${segment.width}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="favorites-probability-card relative rounded-2xl border border-white/[0.07] bg-black/26 px-4 py-6 text-center">
            <p className="text-sm font-black text-white/70">暂无真实盘口数据</p>
            <p className="mt-2 text-xs leading-5 text-white/35">还没有匹配到这场比赛的 Polymarket 市场。</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FavoritePredictionTeam({ team, align }: { team: Team; align: "left" | "right" }) {
  const isRight = align === "right";

  return (
    <div className={`favorite-prediction-team flex min-w-0 items-center gap-2 ${isRight ? "justify-end text-right" : "justify-start text-left"}`}>
      {!isRight && <TeamMark team={team} muted />}
      <span className="truncate text-xs font-black text-white/68">{team.name}</span>
      {isRight && <TeamMark team={team} muted />}
    </div>
  );
}

function TeamMark({ team, muted = false }: { team: Team; muted?: boolean }) {
  return (
    <div className={`grid h-8 w-8 place-items-center overflow-hidden rounded-full ${muted ? "bg-white/10" : "bg-black/12"}`}>
      {team.image ? (
        <img src={team.image} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[10px] font-black">{team.badge}</span>
      )}
    </div>
  );
}

function buildFavoriteLiveProbabilitySegments(homeOdds: FavoriteOddsItem, drawOdds: FavoriteOddsItem, awayOdds: FavoriteOddsItem) {
  const items = [
    { label: "主胜", probability: Math.round(homeOdds.value), valueClass: "text-volt", barClass: "bg-volt", alignClass: "text-left" },
    { label: "平局", probability: Math.round(drawOdds.value), valueClass: "text-white/82", barClass: "bg-white/35", alignClass: "text-center" },
    { label: "客胜", probability: Math.round(awayOdds.value), valueClass: "text-flare", barClass: "bg-flare", alignClass: "text-right" },
  ];
  const total = items.reduce((sum, item) => sum + item.probability, 0) || 1;

  return items.map((item) => ({
    ...item,
    width: (item.probability / total) * 100,
  }));
}

function getFavoriteMatchLiveOdds(match: FavoriteMatchCard, selection: OddsSelection): FavoriteOddsItem[] {
  if (selection.source !== "api" || selection.markets.length < 3) return [];

  const [home, draw, away] = selection.markets;
  const strongest = selection.markets.reduce<MatchLineMarket | null>(
    (best, market) => (!best || market.yesPrice > best.yesPrice ? market : best),
    null,
  );
  return [
    { label: `${match.home.name} 胜`, value: home.yesPrice, active: sameOddsMarket(home, strongest) },
    { label: "平局", value: draw.yesPrice, active: sameOddsMarket(draw, strongest) },
    { label: `${match.away.name} 胜`, value: away.yesPrice, active: sameOddsMarket(away, strongest) },
  ];
}
