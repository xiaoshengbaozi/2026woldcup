"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Clock3, MapPin, Star, Zap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { OptimizedImage } from "@/components/optimized-image";
import { UserActionButton } from "@/components/user-action-button";
import { useUserSession } from "@/components/user-session-provider";
import { buildFavoriteMatchCards, compactFavoriteMatchStage, formatFavoriteVenueLine, getFavoriteTeamCode, type FavoriteMatchCard } from "@/lib/favorite-matches";
import { buildOddsSelectionForTeams, sameOddsMarket, type OddsSelection } from "@/lib/match-odds-selection";
import { getMatchLiveDisplay, getMatchScore } from "@/lib/match-live-display";
import { useMatchLines } from "@/lib/use-match-lines";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import type { Team } from "@/types/match";
import type { MatchLineMarket } from "@/types/messages";

export default function FavoriteMatchesPage() {
  const { matches, warmupMatches, loading } = useWorldCupData();
  const { home } = useUserSession();
  const scheduleMatches = [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime());
  const favoriteCards = buildFavoriteMatchCards(home, scheduleMatches);

  return (
    <DashboardShell>
      <main className="favorites-match-list mx-auto grid w-full max-w-[430px] gap-4 pb-4 sm:max-w-3xl lg:max-w-4xl">
        <section className="grid gap-3">
          {favoriteCards.length ? (
            favoriteCards.map((match, index) => (
              <FavoriteMatchListCard key={`${match.id}-${index}`} match={match} index={index} />
            ))
          ) : (
            <div className="hero-card px-5 py-8 text-center">
              <p className="text-sm font-semibold text-white/58">{loading ? "正在加载关注比赛" : "还没有关注的比赛"}</p>
            </div>
          )}
        </section>
      </main>
    </DashboardShell>
  );
}

function FavoriteMatchListCard({ match, index }: { match: FavoriteMatchCard; index: number }) {
  const { events, timestamp } = useMatchLines();
  const kickoff = match.startsAt ? new Date(match.startsAt) : null;
  const display = match.sourceMatch && kickoff
    ? getMatchLiveDisplay({ match: match.sourceMatch, kickoff, scheduledStageLabel: match.stage })
    : null;
  const finishedScore = match.sourceMatch?.status === "finished"
    ? getMatchScore(match.sourceMatch)
    : null;
  const oddsSelection = buildOddsSelectionForTeams(
    {
      homeTeamCode: match.sourceMatch?.homeTeam?.code || getFavoriteTeamCode(match.home),
      awayTeamCode: match.sourceMatch?.awayTeam?.code || getFavoriteTeamCode(match.away),
    },
    events,
    timestamp,
  );

  return (
    <motion.article
      initial={{ opacity: 0, x: 12, scale: 0.992 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.24, delay: Math.min(index * 0.035, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className="favorite-match-list-card hero-card premium-mobile-surface relative overflow-hidden rounded-[2rem] px-4 py-4 transition"
    >
      <div className="premium-mobile-hairline" />
      <div className="relative flex items-center justify-between gap-3 px-1 text-xs font-semibold text-white/48">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 shrink-0 text-volt" />
          <span className="truncate">{match.tag}</span>
        </span>
        <UserActionButton
          kind="match"
          iconOnly
          payload={{
            id: match.id,
            matchId: match.id,
            title: match.title,
            stage: match.stage,
            startsAt: match.startsAt,
          }}
          className="favorite-match-reminder-button h-9 w-9 min-w-9"
        />
      </div>

      <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_76px_minmax(0,1fr)] items-end gap-3 px-2">
        <TeamColumn team={match.home} align="left" score={finishedScore?.home} />
        <div className="grid place-items-center pb-1">
          <div className="favorite-match-logo-frame relative grid h-[58px] w-[68px] place-items-center">
            <OptimizedImage
              src="/logos/world-cup-2026-inverted.svg"
              alt="FIFA World Cup 2026"
              className="favorite-match-logo-dark h-[58px] w-[66px] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,.45)]"
              width={66}
              height={58}
              priority={index < 2}
            />
            <OptimizedImage
              src="/logos/world-cup-2026-alternate.svg"
              alt="FIFA World Cup 2026"
              className="favorite-match-logo-light hidden h-[58px] w-[66px] object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,.16)]"
              width={66}
              height={58}
              priority={index < 2}
            />
          </div>
        </div>
        <TeamColumn team={match.away} align="right" score={finishedScore?.away} />
      </div>

      <div className="relative mx-2 mt-4 grid grid-cols-4 divide-x divide-white/[0.08] border-y border-white/[0.08] py-1">
        <MatchInfo icon={<Clock3 className="h-3 w-3" />} label="开赛" value={finishedScore ? formatTime(kickoff) : display?.centerLabel ?? formatTime(kickoff)} />
        <MatchInfo icon={<CalendarDays className="h-3 w-3" />} label="日期" value={formatShortDate(kickoff)} />
        <MatchInfo icon={<MapPin className="h-3 w-3" />} label="城市" value={match.city || "TBD"} />
        <MatchInfo icon={<Star className="h-3 w-3" />} label="阶段" value={compactFavoriteMatchStage(match.stage)} />
      </div>

      <FavoriteProbabilityInline selection={oddsSelection} />

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 pl-2 text-xs font-medium text-white/50">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-volt/70" />
          <span className="truncate">{formatFavoriteVenueLine(match)}</span>
        </p>
        <Link
          href={match.href}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-volt bg-volt px-3 text-xs font-black text-black shadow-[0_0_22px_rgba(216,255,62,.2)] transition hover:scale-[1.01]"
        >
          查看详情
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.article>
  );
}


function FavoriteProbabilityInline({ selection }: { selection: OddsSelection }) {
  const probabilitySegments = buildFavoriteProbabilitySegments(selection);
  const hasLiveOdds = selection.source === "api" && probabilitySegments.length === 3;

  return (
    <div className="relative mx-2 border-b border-white/[0.08] px-3 py-3">
      {hasLiveOdds ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {probabilitySegments.map((segment) => (
              <div key={segment.label} className={`min-w-0 ${segment.alignClass}`}>
                <p
                  className={`text-xl font-black leading-none tabular-nums ${segment.valueClass}`}
                  style={{ fontFamily: "ScreenMatrix, monospace" }}
                >
                  {segment.probability}%
                </p>
                <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.12em] text-white/34">{segment.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[0.08]">
            {probabilitySegments.map((segment) => (
              <div key={`${segment.label}-bar`} className={`h-full ${segment.barClass}`} style={{ width: `${segment.width}%` }} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-black/[0.05] px-3 py-3 text-center ring-1 ring-white/[0.06]">
          <p className="text-xs font-black text-white/58">暂无真实盘口数据</p>
          <p className="mt-1 text-[10px] font-semibold text-white/34">未匹配到这场比赛的 Polymarket 市场</p>
        </div>
      )}
    </div>
  );
}

function TeamColumn({ team, align, score }: { team: Team; align: "left" | "right"; score?: number }) {
  const isRight = align === "right";
  const code = getFavoriteTeamCode(team);
  const value = typeof score === "number" ? String(score) : code;

  return (
    <div className={`flex min-w-0 flex-col ${isRight ? "items-end text-right" : "items-start text-left"}`}>
      <p className="mb-2 max-w-[116px] truncate text-sm font-medium leading-none text-white/58">{team.name}</p>
      <div className={`flex items-center gap-2 ${isRight ? "justify-end" : "justify-start"}`}>
        {!isRight && <TeamMark team={team} />}
        <p className="truncate text-[2rem] leading-none text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {value}
        </p>
        {isRight && <TeamMark team={team} />}
      </div>
    </div>
  );
}

function TeamMark({ team }: { team: Team }) {
  return (
    <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/[0.08]">
      {team.image ? (
        <OptimizedImage src={team.image} alt="" className="h-full w-full object-cover" width={32} height={32} />
      ) : (
        <span className="text-[10px] font-black text-white">{team.badge}</span>
      )}
    </div>
  );
}

function MatchInfo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const numeric = /\d/.test(value);

  return (
    <div className="min-w-0 px-1.5 py-2">
      <div className="flex min-w-0 items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/42">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={`mt-1 truncate font-black text-white tabular-nums ${numeric ? "text-[15px]" : "text-sm"}`}
        style={numeric ? { fontFamily: "ScreenMatrix, monospace" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function formatTime(date: Date | null) {
  if (!date || !Number.isFinite(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatShortDate(date: Date | null) {
  if (!date || !Number.isFinite(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildFavoriteProbabilitySegments(selection: OddsSelection) {
  if (selection.source !== "api" || selection.markets.length < 3) return [];
  const [homeOdds, drawOdds, awayOdds] = selection.markets;
  const strongest = selection.markets.reduce<MatchLineMarket | null>(
    (best, market) => (!best || market.yesPrice > best.yesPrice ? market : best),
    null,
  );
  const items = [
    { label: "主胜", probability: Math.round(homeOdds.yesPrice), valueClass: "text-volt", barClass: "bg-volt", alignClass: "text-left", active: sameOddsMarket(homeOdds, strongest) },
    { label: "平局", probability: Math.round(drawOdds.yesPrice), valueClass: "text-white/82", barClass: "bg-white/35", alignClass: "text-center", active: sameOddsMarket(drawOdds, strongest) },
    { label: "客胜", probability: Math.round(awayOdds.yesPrice), valueClass: "text-flare", barClass: "bg-flare", alignClass: "text-right", active: sameOddsMarket(awayOdds, strongest) },
  ];
  const total = items.reduce((sum, item) => sum + item.probability, 0) || 1;

  return items.map((item) => ({
    ...item,
    width: (item.probability / total) * 100,
  }));
}
