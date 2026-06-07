"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BarChart3,
  CalendarDays,
  CloudSun,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Star,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { UserActionButton } from "@/components/user-action-button";
import { detailRows, extractCity, localizeLocationText } from "@/lib/calendar";
import { generateMatchRouteSlug, generateMatchSlug } from "@/lib/match-detail";
import { getMatchLiveDisplay } from "@/lib/match-live-display";
import { parseTeams } from "@/lib/teams";
import { userApi, type UserSessionPayload } from "@/lib/user-system";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import type { Match, Team } from "@/types/match";

type FavoritePreference = UserSessionPayload["user"]["favoriteMatches"][number];

type FavoriteMatchCard = {
  id: string;
  title: string;
  stage: string;
  startsAt?: string;
  location: string;
  city: string;
  href: string;
  sourceMatch?: Match;
  home: Team;
  away: Team;
  tag: string;
};

const FEATURED_TEAM_KEYWORDS = [
  "Argentina",
  "Brazil",
  "France",
  "England",
  "Spain",
  "Portugal",
  "United States",
  "Mexico",
];

const FLAG_TO_TEAM_CODE: Record<string, string> = {
  ar: "ARG",
  at: "AUT",
  au: "AUS",
  ba: "BIH",
  be: "BEL",
  br: "BRA",
  ca: "CAN",
  cd: "COD",
  ch: "SUI",
  ci: "CIV",
  co: "COL",
  cv: "CPV",
  cw: "CUW",
  cz: "CZE",
  de: "GER",
  dz: "ALG",
  ec: "ECU",
  eg: "EGY",
  es: "ESP",
  fr: "FRA",
  "gb-eng": "ENG",
  "gb-sct": "SCO",
  gh: "GHA",
  hr: "CRO",
  ht: "HAI",
  iq: "IRQ",
  ir: "IRN",
  it: "ITA",
  jo: "JOR",
  jp: "JPN",
  kr: "KOR",
  ma: "MAR",
  mx: "MEX",
  nl: "NED",
  no: "NOR",
  nz: "NZL",
  pa: "PAN",
  pt: "POR",
  py: "PAR",
  qa: "QAT",
  sa: "SAU",
  se: "SWE",
  sn: "SEN",
  tn: "TUN",
  tr: "TUR",
  us: "USA",
  uy: "URU",
  uz: "UZB",
  za: "RSA",
};

export default function FavoritesPage() {
  const { matches, warmupMatches, loading } = useWorldCupData();
  const [home, setHome] = useState<UserSessionPayload | null>(null);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedFavoriteIds, setDismissedFavoriteIds] = useState<Set<string>>(() => new Set());

  const scheduleMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  useEffect(() => {
    let mounted = true;
    userApi<UserSessionPayload>("/api/me/session", { cache: "no-store" })
      .then((payload) => {
        if (mounted) setHome(payload);
      })
      .catch(() => {
        if (mounted) setHome(null);
      })
      .finally(() => {
        if (mounted) setHomeLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const favoriteCards = useMemo(() => {
    const saved = home?.user.favoriteMatches ?? [];
    if (saved.length) {
      return saved
        .map((favorite) => favoritePreferenceToCard(favorite, scheduleMatches))
        .sort((a, b) => getSortTime(a) - getSortTime(b));
    }

    return getDefaultFavoriteMatches(scheduleMatches).map((match, index) =>
      matchToCard(match, index === 0 ? "主收藏" : "推荐收藏")
    );
  }, [home, scheduleMatches]);

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
    <section className="relative h-[326px] overflow-visible pt-1">
      <div className="absolute inset-x-3 top-10 h-[232px] rounded-[2rem] bg-volt/10 blur-3xl" />
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
      initial={{ opacity: 0, y: depth * 78, scale: 1 - depth * 0.035 }}
      animate={{
        opacity: 1 - depth * 0.16,
        x: 0,
        y: depth * 78,
        scale: 1 - depth * 0.035,
        rotate: 0,
      }}
      exit={{ opacity: 0, x: -360, rotate: -7, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ type: "spring", stiffness: 430, damping: 42, mass: 0.82 }}
      className={`absolute inset-x-0 top-0 overflow-hidden rounded-[2.25rem] p-4 shadow-[0_28px_90px_rgba(0,0,0,.58),0_0_42px_rgba(216,255,62,.16)] ${
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
        <PassInfo icon={<Star className="h-3 w-3" />} label="阶段" value={compactStage(match.stage)} muted={!isTop} />
      </div>
      <div className="relative mt-4 flex items-center justify-between gap-3">
        <p className={`flex min-w-0 items-center gap-1.5 pl-3 text-xs font-medium ${isTop ? "text-black/52" : "text-white/42"}`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{match.location || "球场待定"}</span>
        </p>
        {isTop && (
          <Link
            href={getVenueNavigationHref(match)}
            target="_blank"
            rel="noreferrer"
            aria-label="导航到球场"
            className="mr-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/45 bg-transparent text-black"
          >
            <Navigation className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </motion.article>
  );
}

function PinnedMatchInfo({ match }: { match: FavoriteMatchCard }) {
  const odds = getFavoriteMatchOdds(match);

  return (
    <motion.section
      key={match.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <FavoriteOddsPanel match={match} odds={odds} />

      <Link
        href={match.href}
        className="relative mt-3 flex h-10 items-center justify-between rounded-full bg-black/32 px-4 text-sm font-black text-white ring-1 ring-white/[0.08] transition hover:bg-volt hover:text-black"
      >
        查看完整比赛页
        <ChevronRight className="h-4 w-4" />
      </Link>
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.18) }}
      className={`group relative overflow-hidden rounded-[1.75rem] p-3 shadow-[0_22px_70px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.1)] ring-1 backdrop-blur-3xl transition ${
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

function FavoriteOddsPanel({ match, odds }: { match: FavoriteMatchCard; odds: FavoriteOddsItem[] }) {
  const [homeOdds, drawOdds, awayOdds] = odds;

  return (
    <div className="relative mx-auto overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111113]/90 shadow-[0_28px_64px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(216,255,62,0.12),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(255,154,31,0.10),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />

      <div className="relative border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-volt" />
            <h4 className="text-[11px] font-black uppercase tracking-[0.13em] text-white">比赛赔率</h4>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/30">十进制</span>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <FavoriteOddsTeam team={match.home} odds={homeOdds} align="left" />

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-white/30">
              <div className="h-px w-6 bg-white/10" />
              <div className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[0.035] shadow-[0_0_22px_rgba(216,255,62,0.10)]">
                <Zap className="h-3.5 w-3.5 text-volt/70" />
              </div>
              <div className="h-px w-6 bg-white/10" />
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span className="font-black tabular-nums text-volt">{getImpliedProbability(homeOdds.value)}%</span>
              <span className="text-white/20">:</span>
              <span className="font-black tabular-nums text-flare">{getImpliedProbability(awayOdds.value)}%</span>
            </div>
          </div>

          <FavoriteOddsTeam team={match.away} odds={awayOdds} align="right" />
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/26 px-4 py-3">
          <div
            className="absolute inset-y-0 left-0 bg-white/[0.045]"
            style={{ width: `${Math.min(getImpliedProbability(drawOdds.value), 56)}%` }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/34">平局</span>
            <span className="text-lg font-black tabular-nums text-white">{drawOdds.value.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FavoriteOddsTeam({ team, odds, align }: { team: Team; odds: FavoriteOddsItem; align: "left" | "right" }) {
  const isRight = align === "right";
  const probability = getImpliedProbability(odds.value);

  return (
    <div className={`min-w-0 ${isRight ? "text-right" : "text-left"}`}>
      <div className={`mb-2 flex items-center gap-2 ${isRight ? "justify-end" : "justify-start"}`}>
        {!isRight && <TeamMark team={team} muted />}
        <span className="truncate text-xs font-black text-white/68">{team.name}</span>
        {isRight && <TeamMark team={team} muted />}
      </div>
      <p className={`text-3xl font-black leading-none tabular-nums ${odds.active ? "text-volt" : "text-white"}`}>
        {odds.value.toFixed(2)}
      </p>
      <div className={`mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08] ${isRight ? "ml-auto" : ""}`}>
        <div className="h-full rounded-full bg-volt/80" style={{ width: `${Math.min(probability, 72)}%` }} />
      </div>
    </div>
  );
}

function getImpliedProbability(value: number) {
  return Math.round((1 / value) * 100);
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

function matchToCard(match: Match, tag = "收藏"): FavoriteMatchCard {
  const teams = parseTeams(match.summary);
  const venue = detailRows(match).find((detail) => detail.type === "venue")?.text || localizeLocationText(match.location);

  return {
    id: match.uid,
    title: normalizeTitle(match.summary),
    stage: match.stage,
    startsAt: match.start.toISOString(),
    location: venue,
    city: extractCity(match.location),
    href: `/matches/${generateMatchRouteSlug(match)}`,
    sourceMatch: match,
    home: teams.home,
    away: teams.away,
    tag,
  };
}

function favoritePreferenceToCard(favorite: FavoritePreference, scheduleMatches: Match[]): FavoriteMatchCard {
  const matched = findScheduleMatch(favorite, scheduleMatches);
  if (matched) return matchToCard(matched, "已收藏");

  const teams = parseTeams(favorite.title);
  return {
    id: favorite.id,
    title: normalizeTitle(favorite.title),
    stage: favorite.stage || "收藏赛程",
    startsAt: favorite.startsAt,
    location: "球场待公布",
    city: "TBD",
    href: `/matches/${generateMatchSlug(favorite.title)}`,
    home: teams.home,
    away: teams.away,
    tag: "已收藏",
  };
}

function findScheduleMatch(favorite: FavoritePreference, scheduleMatches: Match[]) {
  const direct = scheduleMatches.find((match) => match.uid === favorite.id);
  if (direct) return direct;

  const favoriteTitle = normalizeTitle(favorite.title);
  const favoriteStart = favorite.startsAt ? new Date(favorite.startsAt).getTime() : NaN;

  return scheduleMatches.find((match) => {
    if (normalizeTitle(match.summary) !== favoriteTitle) return false;
    if (!Number.isFinite(favoriteStart)) return true;
    return Math.abs(match.start.getTime() - favoriteStart) < 60_000;
  });
}

function getDefaultFavoriteMatches(scheduleMatches: Match[]) {
  const now = Date.now();
  const upcoming = scheduleMatches
    .filter((match) => match.start.getTime() >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const featured = upcoming.filter((match) => {
    const text = [match.summary, match.homeTeam?.name, match.awayTeam?.name, match.homeTeam?.englishName, match.awayTeam?.englishName].join(" ");
    return FEATURED_TEAM_KEYWORDS.some((keyword) => text.includes(keyword));
  });

  return (featured.length ? featured : upcoming.length ? upcoming : scheduleMatches).slice(0, 5);
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
  const flagCode = team.image.match(/flagcdn\.com\/([^/.]+)\./)?.[1];
  if (flagCode && FLAG_TO_TEAM_CODE[flagCode]) return FLAG_TO_TEAM_CODE[flagCode];
  if (/^[A-Z]{2,4}$/.test(team.badge)) return team.badge;
  return team.name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase() || "TBD";
}

function getVenueNavigationHref(match: FavoriteMatchCard) {
  const query = [match.location, match.city].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || match.title)}`;
}

type FavoriteOddsItem = {
  label: string;
  value: number;
  active: boolean;
};

function getFavoriteMatchOdds(match: FavoriteMatchCard): FavoriteOddsItem[] {
  const seed = getStableNumber(match.id || match.title);
  const home = 2.05 + (seed % 42) / 100;
  const away = 2.18 + ((seed >> 3) % 46) / 100;
  const draw = 3.05 + ((seed >> 5) % 34) / 100;
  const strongest = Math.min(home, draw, away);

  return [
    { label: `${match.home.name} 胜`, value: home, active: home === strongest },
    { label: "平局", value: draw, active: draw === strongest },
    { label: `${match.away.name} 胜`, value: away, active: away === strongest },
  ];
}

function getStableNumber(value: string) {
  return value.split("").reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) >>> 0, 0);
}

function getMatchWeatherSummary(match: FavoriteMatchCard) {
  const weather = match.sourceMatch?.weather?.trim();
  if (weather && weather !== "待更新" && !/^https?:\/\//i.test(weather)) return weather;
  return "赛日天气待更新";
}

function normalizeTitle(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s*（[^）]*）\s*$/, "").trim();
}

function getSortTime(match: FavoriteMatchCard) {
  if (!match.startsAt) return Number.MAX_SAFE_INTEGER;
  const value = new Date(match.startsAt).getTime();
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
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
