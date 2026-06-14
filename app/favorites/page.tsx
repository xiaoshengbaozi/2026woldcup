"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  ArrowRight,
  CloudSun,
  ChevronRight,
  Clock3,
  MapPin,
  Radio,
  Star,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { UserActionButton } from "@/components/user-action-button";
import { useUserSession } from "@/components/user-session-provider";
import { buildFavoriteMatchCards, compactFavoriteMatchStage, formatFavoriteVenueLine, getFavoriteTeamCode, type FavoriteMatchCard } from "@/lib/favorite-matches";
import { getMatchLiveDisplay, getMatchScore } from "@/lib/match-live-display";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import type { WeatherState } from "@/lib/weather";
import type { Team } from "@/types/match";

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
    return favoriteCards.filter((match) => !isFinishedFavoriteMatch(match) && !dismissedFavoriteIds.has(match.id));
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
        <section className="grid grid-cols-3 gap-1.5 sm:gap-3">
          <StatCard label="收藏" value={favoriteCards.length || (loading ? "--" : "0")} detail="已收藏" icon={Star} tone="violet" />
          <StatCard label="待开赛" value={upcomingCount} detail="未开始" icon={CalendarDays} tone="emerald" />
          <StatCard label="直播" value={liveCount} detail="进行中" icon={Radio} tone="cyan" />
        </section>

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
      <>
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
      </>
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
  const dragStartRef = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const kickoff = match.startsAt ? new Date(match.startsAt) : null;
  const display = match.sourceMatch && kickoff
    ? getMatchLiveDisplay({ match: match.sourceMatch, kickoff, scheduledStageLabel: match.stage })
    : null;
  const finishedScore = match.sourceMatch?.status === "finished"
    ? getMatchScore(match.sourceMatch)
    : null;
  const displayX = isTop ? stackStyle.x + dragX : stackStyle.x;

  const updateDrag = (nextX: number) => {
    const clampedX = Math.max(-132, Math.min(88, nextX));
    dragXRef.current = clampedX;
    setDragX(clampedX);
  };

  const resetDrag = () => {
    dragStartRef.current = null;
    dragXRef.current = 0;
    setDragX(0);
  };

  const finishDrag = () => {
    const shouldAdvance = dragXRef.current < -52;
    resetDrag();
    if (shouldAdvance) onAdvance();
  };

  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!isTop || (event.target as HTMLElement).closest("a,button")) return;
    if (event.pointerType === "touch") return;
    dragStartRef.current = event.clientX;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Some mobile browsers may already route the pointer to the card.
    }
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current === null) return;
    updateDrag(event.clientX - dragStartRef.current);
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (dragStartRef.current === null) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture can already be released after a native touch gesture.
    }
    finishDrag();
  };

  const startTouchDrag = (event: React.TouchEvent<HTMLElement>) => {
    if (!isTop || (event.target as HTMLElement).closest("a,button")) return;
    const touch = event.touches[0];
    if (!touch) return;
    dragStartRef.current = touch.clientX;
  };

  const moveTouchDrag = (event: React.TouchEvent<HTMLElement>) => {
    if (dragStartRef.current === null) return;
    const touch = event.touches[0];
    if (!touch) return;
    const nextX = touch.clientX - dragStartRef.current;
    updateDrag(nextX);
  };

  const endTouchDrag = () => {
    if (dragStartRef.current === null) return;
    finishDrag();
  };

  return (
    <article
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onTouchStart={startTouchDrag}
      onTouchMove={moveTouchDrag}
      onTouchEnd={endTouchDrag}
      onTouchCancel={resetDrag}
      onClick={() => {
        if (!isTop) onSelect();
      }}
      className={`absolute inset-x-0 top-0 overflow-hidden rounded-[2.25rem] p-4 shadow-[0_16px_42px_rgba(0,0,0,.34),0_0_24px_rgba(216,255,62,.08)] transition-[opacity,transform] duration-300 ease-out sm:shadow-[0_24px_72px_rgba(0,0,0,.5),0_0_34px_rgba(216,255,62,.12)] ${
        isTop
          ? "z-30 cursor-grab touch-pan-y select-none bg-volt text-black active:cursor-grabbing"
          : "z-20 cursor-pointer bg-[#101411]/92 text-white ring-1 ring-white/[0.08] backdrop-blur-3xl"
      }`}
      style={{
        zIndex: 30 - depth,
        opacity: stackStyle.opacity,
        touchAction: isTop ? "pan-y" : undefined,
        transform: `translate3d(${displayX}px, ${stackStyle.y}px, 0) scale(${stackStyle.scale}) rotate(${isTop ? dragX * 0.018 : 0}deg)`,
      }}
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
        <TeamTerminal team={match.home} align="left" muted={!isTop} score={finishedScore?.home} />
        <div className="grid place-items-center pb-0.5">
          <img
            src="/logos/world-cup-2026-alternate-dark.webp"
            alt="FIFA World Cup 2026"
            width={596}
            height={842}
            className={`h-[58px] w-[66px] object-contain ${isTop ? "opacity-88" : "opacity-55"}`}
            loading="eager"
            fetchPriority={isTop ? "high" : "auto"}
          />
        </div>
        <TeamTerminal team={match.away} align="right" muted={!isTop} score={finishedScore?.away} />
      </div>
      <div className={`relative mx-3 mt-4 grid grid-cols-4 divide-x border-y py-1 ${
        isTop ? "divide-black/30 border-black/30" : "divide-black/30 border-black/24"
      }`}>
        <PassInfo icon={<Clock3 className="h-3 w-3" />} label="开赛" value={finishedScore ? formatTime(kickoff) : display?.centerLabel ?? formatTime(kickoff)} muted={!isTop} />
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
    </article>
  );
}

function PinnedMatchInfo({ match }: { match: FavoriteMatchCard }) {
  const [OddsPanel, setOddsPanel] = useState<ComponentType<{ match: FavoriteMatchCard }> | null>(null);

  useEffect(() => {
    let active = true;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadPanel = () => {
      void import("@/components/favorites/favorite-live-odds-panel").then((mod) => {
        if (active) setOddsPanel(() => mod.FavoriteLiveOddsPanel);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(loadPanel, { timeout: 1_800 });
    } else {
      timeoutId = setTimeout(loadPanel, 600);
    }

    return () => {
      active = false;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section key={match.id} className="relative">
      {OddsPanel ? <OddsPanel match={match} /> : <FavoriteLiveOddsSkeleton />}

      <div className="relative mt-3 flex justify-end">
        <Link
          href="/favorites/matches"
          className="inline-flex h-10 items-center justify-between gap-2 rounded-full bg-volt/15 px-4 text-sm font-black text-volt shadow-[0_0_44px_rgba(216,255,62,.24)] ring-1 ring-volt/25 transition hover:bg-volt hover:text-black"
        >
          查看全部赛事卡
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function FavoriteLiveOddsSkeleton() {
  return (
    <div className="relative mx-auto overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111113]/80 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="h-3 w-28 rounded-full bg-white/[0.08]" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-14 rounded-2xl bg-white/[0.055]" />
        <div className="h-14 rounded-2xl bg-white/[0.055]" />
        <div className="h-14 rounded-2xl bg-white/[0.055]" />
      </div>
    </div>
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
    <article
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
    </article>
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
        className={`favorite-stack-reminder-button ${inverted ? "text-volt ring-volt/55" : ""} ${className}`}
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
  const [weather, setWeather] = useState<WeatherState | undefined>();

  useEffect(() => {
    const sourceMatch = match.sourceMatch;
    if (!sourceMatch?.geo) {
      setWeather(undefined);
      return;
    }

    let active = true;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadWeather = () => {
      void import("@/lib/weather")
        .then(({ fetchCurrentWeather }) => fetchCurrentWeather(sourceMatch))
        .then((data) => {
          if (active) setWeather(data);
        });
    };

    setWeather(undefined);
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(loadWeather, { timeout: 2_000 });
    } else {
      timeoutId = setTimeout(loadWeather, 800);
    }

    return () => {
      active = false;
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [match.sourceMatch]);

  return (
    <div className={`relative flex items-center justify-between gap-3 px-3 text-xs font-medium ${muted ? "text-white/42" : "text-black/52"}`}>
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <CloudSun className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
        <span>{getMatchWeatherSummary(match, weather)}</span>
      </span>
      {!muted && (
        <FavoriteAction
          match={match}
          signedIn={signedIn}
          inverted
          className="h-9 w-9 min-w-9"
          onRemoved={onRemove}
        />
      )}
    </div>
  );
}

function TeamTerminal({ team, align, muted = false, score }: { team: Team; align: "left" | "right"; muted?: boolean; score?: number }) {
  const isRight = align === "right";
  const code = getTeamCode(team);
  const value = typeof score === "number" ? String(score) : code;
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
          {value}
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

function isFinishedFavoriteMatch(match: FavoriteMatchCard) {
  return match.sourceMatch?.status === "finished";
}

function getTeamCode(team: Team) {
  return getFavoriteTeamCode(team);
}

function getMatchWeatherSummary(match: FavoriteMatchCard, liveWeather?: WeatherState) {
  if (liveWeather) return formatWeatherLabel(liveWeather);

  const staticWeather = match.sourceMatch?.weather?.trim();
  if (staticWeather && staticWeather !== "待更新" && !/^https?:\/\//i.test(staticWeather)) return staticWeather;
  if (match.sourceMatch?.geo) return "天气同步中";
  return "暂无天气";
}

function formatWeatherLabel(data?: WeatherState) {
  if (!data) return "\u5929\u6c14\u540c\u6b65\u4e2d";
  if (data.error) return "\u5929\u6c14\u6682\u4e0d\u53ef\u7528";
  return `${weatherIcon(data.code)} ${Math.round(data.temp ?? 0)}\u00b0C`;
}

function weatherIcon(code?: number) {
  if (code === undefined) return "\u5929\u6c14";
  if ([0, 1].includes(code)) return "\u6674";
  if (code === 2) return "\u5c11\u4e91";
  if (code === 3) return "\u591a\u4e91";
  if ([45, 48].includes(code)) return "\u6709\u96fe";
  if ([51, 53, 55, 56, 57].includes(code)) return "\u6bdb\u6bdb\u96e8";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "\u6709\u96e8";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "\u6709\u96ea";
  if ([95, 96, 99].includes(code)) return "\u96f7\u96e8";
  return "\u5929\u6c14";
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
