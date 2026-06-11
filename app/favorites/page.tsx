"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BarChart3,
  CalendarDays,
  ArrowRight,
  CloudSun,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  Star,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { UserActionButton } from "@/components/user-action-button";
import { useUserSession } from "@/components/user-session-provider";
import { buildFavoriteMatchCards, compactFavoriteMatchStage, formatFavoriteVenueLine, getFavoriteTeamCode, type FavoriteMatchCard } from "@/lib/favorite-matches";
import { buildOddsSelectionForTeams, sameOddsMarket, type OddsSelection } from "@/lib/match-odds-selection";
import { getMatchLiveDisplay } from "@/lib/match-live-display";
import { useMatchLines } from "@/lib/use-match-lines";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import type { Team } from "@/types/match";
import type { MatchLineMarket } from "@/types/messages";

const stackDepthStyles = [
  { x: 0, y: 0, scale: 1, opacity: 1 },
  { x: 10, y: 8, scale: 0.975, opacity: 0.82 },
  { x: 18, y: 14, scale: 0.95, opacity: 0.66 },
];

export default function FavoritesPage() {
  const { matches, warmupMatches, loading } = useWorldCupData();
  const { home } = useUserSession();
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedFavoriteIds, setDismissedFavoriteIds] = useState<Set<string>>(() => new Set());

  const scheduleMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  const favoriteCards = useMemo(() => buildFavoriteMatchCards(home, scheduleMatches), [home, scheduleMatches]);

  const visibleCards = useMemo(() => {
    return favoriteCards.filter((match) => !dismissedFavoriteIds.has(match.id));
  }, [dismissedFavoriteIds, favoriteCards]);

  const removeFavoriteCard = (id: string) => {
    setDismissedFavoriteIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
    setActiveIndex((current) => Math.max(0, Math.min(current, visibleCards.length - 2)));
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [favoriteCards.length]);

  useEffect(() => {
    if (activeIndex >= visibleCards.length) setActiveIndex(0);
  }, [activeIndex, visibleCards.length]);

  const activeMatch = visibleCards[activeIndex] ?? null;
  const upcomingCount = favoriteCards.filter((match) => {
    if (!match.startsAt) return true;
    return new Date(match.startsAt).getTime() >= Date.now();
  }).length;
  const liveCount = favoriteCards.filter((match) => match.sourceMatch?.status === "live" || match.sourceMatch?.status === "halftime").length;

  return (
    <DashboardShell>
      <main className="mx-auto grid w-full max-w-[430px] gap-4 pb-2 sm:max-w-3xl lg:max-w-5xl">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-1.5 sm:gap-3"
        >
          <StatCard label="收藏" value={favoriteCards.length || (loading ? "--" : "0")} detail="已收藏" icon={Star} tone="violet" />
          <StatCard label="待开赛" value={upcomingCount} detail="未开始" icon={CalendarDays} tone="emerald" />
          <StatCard label="直播" value={liveCount} detail="进行中" icon={Radio} tone="cyan" />
        </motion.section>

        {activeMatch && (
          <>
            <MatchCardStack
              matches={visibleCards}
              activeIndex={activeIndex}
              signedIn={Boolean(home)}
              onAdvance={() => setActiveIndex((current) => getNextIndex(current, visibleCards.length))}
              onSelect={setActiveIndex}
              onRemove={removeFavoriteCard}
            />
            <PinnedMatchInfo match={activeMatch} />
          </>
        )}
      </main>
    </DashboardShell>
  );
}

function MatchCardStack({
  matches,
  activeIndex,
  signedIn,
  onAdvance,
  onSelect,
  onRemove,
}: {
  matches: FavoriteMatchCard[];
  activeIndex: number;
  signedIn: boolean;
  onAdvance: () => void;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
}) {
  const stack = getStackMatches(matches, activeIndex);

  return (
    <section className="relative h-[288px] overflow-visible pt-1 sm:h-[326px]">
      <div className="absolute inset-x-8 top-8 h-[210px] rounded-[2rem] bg-volt/[0.055] blur-3xl sm:inset-x-3 sm:h-[232px] sm:bg-volt/10" />
      <AnimatePresence initial={false}>
        {stack.map(({ match, index, depth }) => (
          <StackCard
            key={`${match.id}-${index}`}
            match={match}
            depth={depth}
            signedIn={signedIn}
            onAdvance={onAdvance}
            onSelect={() => onSelect(index)}
            onRemove={() => onRemove(match.id)}
          />
        ))}
      </AnimatePresence>
    </section>
  );
}

function StackCard({
  match,
  depth,
  signedIn,
  onAdvance,
  onSelect,
  onRemove,
}: {
  match: FavoriteMatchCard;
  depth: number;
  signedIn: boolean;
  onAdvance: () => void;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const isTop = depth === 0;
  const stackStyle = stackDepthStyles[depth] ?? stackDepthStyles[stackDepthStyles.length - 1];
  const kickoff = match.startsAt ? new Date(match.startsAt) : null;
  const display = match.sourceMatch && kickoff
    ? getMatchLiveDisplay({ match: match.sourceMatch, kickoff, scheduledStageLabel: match.stage })
    : null;

  return (
    <motion.article
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.12}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.x < -76 || info.velocity.x < -520) onAdvance();
      }}
      onClick={() => {
        if (!isTop) onSelect();
      }}
      initial={{ opacity: 0, x: stackStyle.x + 18, y: stackStyle.y, scale: stackStyle.scale }}
      animate={{
        opacity: stackStyle.opacity,
        x: stackStyle.x,
        y: stackStyle.y,
        scale: stackStyle.scale,
        rotate: 0,
      }}
      exit={{ opacity: 0, x: -320, rotate: -4, transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ type: "spring", stiffness: 520, damping: 54, mass: 0.68 }}
      className={`absolute inset-x-0 top-0 overflow-hidden rounded-[2.25rem] p-4 shadow-[0_16px_42px_rgba(0,0,0,.34),0_0_24px_rgba(216,255,62,.08)] sm:shadow-[0_24px_72px_rgba(0,0,0,.5),0_0_34px_rgba(216,255,62,.12)] ${
        isTop
          ? "z-30 cursor-grab bg-volt text-black active:cursor-grabbing"
          : "z-20 cursor-pointer bg-[#101411]/92 text-white ring-1 ring-white/[0.08] backdrop-blur-3xl"
      }`}
      style={{ zIndex: 30 - depth }}
    >
      {isTop && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-[2.25rem]"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.28) 0%, transparent 58%)" }}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[2.25rem]"
            style={{
              padding: "1px",
              background: "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(0,0,0,0.18), rgba(255,255,255,0.22))",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
            }}
          />
        </>
      )}
      <div className="absolute -right-10 top-10 h-24 w-24 rounded-full bg-black/10 blur-2xl" />
      {!isTop && <div className="absolute inset-0 bg-black/18" />}
      <WeatherStrip match={match} muted={!isTop} signedIn={signedIn} onRemove={onRemove} />

      <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_82px_minmax(0,1fr)] items-end gap-3 px-3">
        <TeamTerminal team={match.home} align="left" muted={!isTop} />
        <div className="grid place-items-center pb-0.5">
          <img
            src="/logos/world-cup-2026-alternate.svg"
            alt="FIFA World Cup 2026"
            className={`h-[58px] w-[66px] object-contain ${isTop ? "opacity-88" : "opacity-55"}`}
            loading="eager"
          />
        </div>
        <TeamTerminal team={match.away} align="right" muted={!isTop} />
      </div>
      <div className={`relative mx-3 mt-4 grid grid-cols-4 divide-x border-y py-1 ${
        isTop ? "divide-black/30 border-black/30" : "divide-black/30 border-black/24"
      }`}>
        <PassInfo icon={<Clock3 className="h-3 w-3" />} label="开赛" value={display?.centerLabel ?? formatTime(kickoff)} muted={!isTop} />
        <PassInfo icon={<CalendarDays className="h-3 w-3" />} label="日期" value={formatShortDate(kickoff)} muted={!isTop} />
        <PassInfo icon={<MapPin className="h-3 w-3" />} label="城市" value={match.city || "TBD"} muted={!isTop} />
        <PassInfo icon={<Star className="h-3 w-3" />} label="阶段" value={compactFavoriteMatchStage(match.stage)} muted={!isTop} />
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className={`flex min-w-0 items-center gap-1.5 pl-3 text-xs font-medium ${isTop ? "text-black/52" : "text-white/42"}`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{formatFavoriteVenueLine(match)}</span>
        </p>
        {isTop && (
          <Link
            href={match.href}
            aria-label="查看比赛详情"
            className="mr-3 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/45 bg-transparent px-3 text-xs font-black text-black transition hover:bg-black/10"
          >
            查看详情
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}

function PinnedMatchInfo({ match }: { match: FavoriteMatchCard }) {
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

  return (
    <motion.section
      key={match.id}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <FavoriteLiveOddsPanel match={match} odds={odds} selection={selection} />

      <div className="relative mt-3 flex justify-end">
        <Link
          href="/favorites/matches"
          className="inline-flex h-10 items-center justify-between gap-2 rounded-full bg-volt/15 px-4 text-sm font-black text-volt shadow-[0_0_44px_rgba(216,255,62,.24)] ring-1 ring-volt/25 transition hover:bg-volt hover:text-black"
        >
          查看全部赛事卡
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}

function CompactFavoriteCard({
  match,
  index,
  signedIn,
  active,
  onSelect,
}: {
  match: FavoriteMatchCard;
  index: number;
  signedIn: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const kickoff = match.startsAt ? new Date(match.startsAt) : null;

  return (
    <motion.article
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.18) }}
      className={`group relative overflow-hidden rounded-[1.75rem] p-3 shadow-[0_12px_34px_rgba(0,0,0,.24),inset_0_1px_0_rgba(255,255,255,.1)] ring-1 backdrop-blur-3xl transition sm:shadow-[0_18px_54px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.1)] ${
        active
          ? "bg-volt/[0.12] ring-volt/28"
          : "bg-white/[0.045] ring-white/[0.075] hover:bg-white/[0.07]"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-left"
        >
          <div className={`grid h-12 w-12 place-items-center rounded-full ring-1 ${active ? "bg-volt text-black ring-volt/50" : "bg-black/32 text-volt ring-white/[0.08]"}`}>
            <Star className="h-5 w-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-black text-white">{match.home.name} vs {match.away.name}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/24 transition group-hover:text-volt" />
            </div>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-white/42">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-volt/72" />
              <span className="truncate">{formatFullDate(kickoff)} · {match.city || match.stage}</span>
            </p>
          </div>
        </button>

        <FavoriteAction match={match} signedIn={signedIn} />
      </div>
    </motion.article>
  );
}

function FavoriteAction({
  match,
  signedIn,
  inverted = false,
  className = "",
  onRemoved,
}: {
  match: FavoriteMatchCard;
  signedIn: boolean;
  inverted?: boolean;
  className?: string;
  onRemoved?: () => void;
}) {
  if (signedIn) {
    return (
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
        className={`${inverted ? "bg-black/12 text-black ring-black/10 hover:bg-black/18" : ""} ${className}`}
        onChanged={(active) => {
          if (!active) onRemoved?.();
        }}
      />
    );
  }

  return (
    <Link
      href="/me?auth=login"
      aria-label="登录后收藏"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full backdrop-blur-2xl transition ${
        inverted
          ? "bg-black/12 text-black ring-1 ring-black/10 hover:bg-black/18"
          : "bg-white/[0.07] text-white/68 ring-1 ring-white/[0.09] hover:text-volt"
      } ${className}`}
    >
      <Bell className="h-4 w-4" />
    </Link>
  );
}

function MetricTile({ label, value, active = false }: { label: string; value: string | number; active?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] p-3 ring-1 backdrop-blur-2xl ${active ? "bg-volt text-black ring-volt/60" : "bg-white/[0.055] text-white ring-white/[0.08]"}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${active ? "text-black/52" : "text-white/34"}`}>{label}</p>
      <p className="mt-1 text-2xl font-black leading-none tabular">{value}</p>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.25rem] bg-black/24 p-3 ring-1 ring-white/[0.07]">
      <div className="flex items-center gap-2 text-volt/80">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FavoriteLiveOddsPanel({ match, odds, selection }: { match: FavoriteMatchCard; odds: FavoriteOddsItem[]; selection: OddsSelection }) {
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
                <div key={segment.label} className="min-w-0">
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

function buildFavoriteLiveProbabilitySegments(homeOdds: FavoriteOddsItem, drawOdds: FavoriteOddsItem, awayOdds: FavoriteOddsItem) {
  const items = [
    { label: "主胜", probability: Math.round(homeOdds.value), valueClass: "text-volt", barClass: "bg-volt" },
    { label: "平局", probability: Math.round(drawOdds.value), valueClass: "text-white/82", barClass: "bg-white/35" },
    { label: "客胜", probability: Math.round(awayOdds.value), valueClass: "text-flare", barClass: "bg-flare" },
  ];
  const total = items.reduce((sum, item) => sum + item.probability, 0) || 1;

  return items.map((item) => ({
    ...item,
    width: (item.probability / total) * 100,
  }));
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

function WeatherStrip({
  match,
  signedIn,
  onRemove,
  muted = false,
}: {
  match: FavoriteMatchCard;
  signedIn: boolean;
  onRemove: () => void;
  muted?: boolean;
}) {
  return (
    <div className={`relative flex items-center justify-between gap-3 px-3 text-xs font-medium ${muted ? "text-white/42" : "text-black/52"}`}>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <CloudSun className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
        <span>{getMatchWeatherSummary(match)}</span>
      </span>
      {!muted && (
        <FavoriteAction
          match={match}
          signedIn={signedIn}
          inverted
          className="h-9 w-9 min-w-9 bg-transparent text-black shadow-none ring-1 ring-black/45 hover:bg-black/8"
          onRemoved={onRemove}
        />
      )}
    </div>
  );
}

function TeamTerminal({ team, align, muted = false }: { team: Team; align: "left" | "right"; muted?: boolean }) {
  const isRight = align === "right";
  const code = getTeamCode(team);
  return (
    <div className={`flex min-w-0 flex-col ${isRight ? "items-end text-right" : "items-start text-left"}`}>
      <p className={`mb-2 max-w-[116px] truncate text-sm font-medium leading-none ${muted ? "text-white/44" : "text-black/58"}`}>
        {team.name}
      </p>
      <div className={`flex items-center gap-2 ${isRight ? "justify-end" : "justify-start"}`}>
        {!isRight && <TeamMark team={team} muted={muted} />}
        <p
          className={`truncate text-[2.2rem] leading-none ${muted ? "text-white/86" : "text-black"}`}
          style={{ fontFamily: "ScreenMatrix, monospace" }}
        >
          {code}
        </p>
        {isRight && <TeamMark team={team} muted={muted} />}
      </div>
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

function PassInfo({ icon, label, value, muted = false }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  const numeric = /\d/.test(value);
  return (
    <div className="min-w-0 px-1.5 py-2">
      <div className={`flex min-w-0 items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] ${muted ? "text-white/38" : "text-black/50"}`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p
        className={`mt-1 truncate font-black tabular ${numeric ? "text-[15px]" : "text-sm"}`}
        style={numeric ? { fontFamily: "ScreenMatrix, monospace" } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingStack() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[74px] animate-pulse rounded-[1.75rem] bg-white/[0.045] ring-1 ring-white/[0.06]" />
      ))}
    </div>
  );
}

function getStackMatches(matches: FavoriteMatchCard[], activeIndex: number) {
  return [1, 0].flatMap((depth) => {
    if (!matches.length || depth >= matches.length) return [];
    const index = (activeIndex + depth) % matches.length;
    return [{ match: matches[index], index, depth }];
  });
}

function getNextIndex(current: number, total: number) {
  if (total <= 1) return current;
  return (current + 1) % total;
}

function getTeamCode(team: Team) {
  return getFavoriteTeamCode(team);
}

type FavoriteOddsItem = {
  label: string;
  value: number;
  active: boolean;
};

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

function getMatchWeatherSummary(match: FavoriteMatchCard) {
  const weather = match.sourceMatch?.weather?.trim();
  if (weather && weather !== "待更新" && !/^https?:\/\//i.test(weather)) return weather;
  return "赛日天气待更新";
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

function formatFullDate(date: Date | null) {
  if (!date || !Number.isFinite(date.getTime())) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function compactStage(stage: string) {
  if (!stage) return "赛程";
  if (stage.includes("Group")) return "小组赛";
  if (stage.includes("1/16")) return "32强";
  if (stage.includes("1/8")) return "16强";
  if (stage.includes("1/4")) return "8强";
  if (stage.includes("半决赛")) return "半决赛";
  if (stage.includes("季军")) return "季军赛";
  if (stage.includes("决赛")) return "决赛";
  return stage.replace(/\s*Group\s+[A-L]\s*/i, "").slice(0, 4);
}
