"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarDays,
  CloudSun,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Sparkles,
  Star,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { UserActionButton } from "@/components/user-action-button";
import { detailRows, extractCity, localizeLocationText } from "@/lib/calendar";
import { generateMatchRouteSlug, generateMatchSlug } from "@/lib/match-detail";
import { getMatchLiveDisplay } from "@/lib/match-live-display";
import { parseTeams } from "@/lib/teams";
import { userApi, type UserHomePayload } from "@/lib/user-system";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import type { Match, Team } from "@/types/match";

type FavoritePreference = UserHomePayload["user"]["favoriteMatches"][number];

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
  const [home, setHome] = useState<UserHomePayload | null>(null);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedFavoriteIds, setDismissedFavoriteIds] = useState<Set<string>>(() => new Set());

  const scheduleMatches = useMemo(
    () => [...matches, ...warmupMatches].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [matches, warmupMatches]
  );

  useEffect(() => {
    let mounted = true;
    userApi<UserHomePayload>("/api/me/home", { cache: "no-store" })
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
            <PinnedMatchInfo match={activeMatch} position={activeIndex + 1} total={visibleCards.length} />
          </>
        )}

        <section className="grid gap-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/32">Pinned Queue</p>
              <h2 className="mt-1 text-lg font-black text-white">全部收藏</h2>
            </div>
            <Link href="/me?tab=matches" className="inline-flex items-center gap-1 text-xs font-bold text-volt/82">
              管理
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {!homeLoaded || loading ? (
            <LoadingStack />
          ) : visibleCards.length ? (
            visibleCards.map((match, index) => (
              <CompactFavoriteCard
                key={`${match.id}-${index}`}
                match={match}
                index={index}
                signedIn={Boolean(home)}
                active={index === activeIndex}
                onSelect={() => setActiveIndex(index)}
              />
            ))
          ) : (
            <div className="rounded-[1.7rem] bg-white/[0.045] p-5 text-sm text-white/52 ring-1 ring-white/[0.08] backdrop-blur-2xl">
              没有找到匹配的收藏比赛。
            </div>
          )}
        </section>
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
    <section className="relative h-[390px] overflow-visible pt-1">
      <div className="absolute inset-x-3 top-10 h-[270px] rounded-[2rem] bg-volt/10 blur-3xl" />
      <AnimatePresence initial={false} mode="popLayout">
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
      <div className="absolute bottom-0 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
        {matches.slice(0, 6).map((match, index) => (
          <button
            key={`${match.id}-dot`}
            type="button"
            aria-label={`切换到第 ${index + 1} 场`}
            onClick={() => onSelect(index)}
            className={`h-2 w-2 rounded-full transition ${
              index === activeIndex
                ? "bg-volt shadow-[0_0_14px_rgba(216,255,62,.65)]"
                : "bg-white/[0.055] ring-1 ring-white/[0.14]"
            }`}
          />
        ))}
      </div>
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
      layout
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (info.offset.x < -76 || info.velocity.x < -520) onAdvance();
      }}
      onClick={() => {
        if (!isTop) onSelect();
      }}
      initial={{ opacity: 0, y: 36, scale: 0.92 }}
      animate={{
        opacity: 1 - depth * 0.16,
        x: 0,
        y: depth * 78,
        scale: 1 - depth * 0.035,
        rotate: 0,
      }}
      exit={{ opacity: 0, x: -360, rotate: -8, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 360, damping: 34 }}
      className={`absolute inset-x-0 top-0 overflow-hidden rounded-[2.25rem] p-4 shadow-[0_28px_90px_rgba(0,0,0,.58),0_0_42px_rgba(216,255,62,.16)] ${
        isTop
          ? "z-30 cursor-grab bg-volt text-black active:cursor-grabbing"
          : "z-20 cursor-pointer bg-[#101411]/92 text-white ring-1 ring-white/[0.08] backdrop-blur-3xl"
      }`}
      style={{ zIndex: 30 - depth }}
    >
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

function PinnedMatchInfo({ match, position, total }: { match: FavoriteMatchCard; position: number; total: number }) {
  const kickoff = match.startsAt ? new Date(match.startsAt) : null;
  const countdown = getCountdown(kickoff);

  return (
    <motion.section
      key={match.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.9rem] bg-white/[0.055] p-4 shadow-[0_22px_70px_rgba(0,0,0,.34),inset_0_1px_0_rgba(255,255,255,.1)] ring-1 ring-white/[0.08] backdrop-blur-3xl"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-volt/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-volt/70">
            Top Match {position}/{total}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">比赛信息</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-volt px-3 py-1 text-[11px] font-black text-black">
          <Sparkles className="h-3.5 w-3.5" />
          {countdown}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2">
        <InfoTile icon={<CalendarDays className="h-4 w-4" />} label="比赛时间" value={formatFullDate(kickoff)} />
        <InfoTile icon={<MapPin className="h-4 w-4" />} label="比赛城市" value={match.city || "TBD"} />
        <InfoTile icon={<Clock3 className="h-4 w-4" />} label="比赛阶段" value={compactStage(match.stage)} />
        <InfoTile icon={<Star className="h-4 w-4" />} label="收藏状态" value={match.tag} />
      </div>

      <Link
        href={match.href}
        className="relative mt-3 flex h-11 items-center justify-between rounded-full bg-black/32 px-4 text-sm font-black text-white ring-1 ring-white/[0.08] transition hover:bg-volt hover:text-black"
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

function getCountdown(date: Date | null) {
  if (!date || !Number.isFinite(date.getTime())) return "待定";
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return "进行中";
  const hours = Math.ceil(diff / 3600000);
  if (hours < 24) return `${hours}小时`;
  return `${Math.ceil(hours / 24)}天`;
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
