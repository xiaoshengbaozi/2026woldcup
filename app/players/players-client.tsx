"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownAZ, ArrowUpAZ, ChevronLeft, ChevronRight, Flag, Globe2, Search, Star, Trophy } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { FilterDropdown } from "@/components/match-filters";
import { UserActionButton } from "@/components/user-action-button";
import { useUserSession } from "@/components/user-session-provider";
import { hasMatchInLiveRefreshWindow } from "@/lib/live-match-queue";
import { useMobilePinnedRail } from "@/lib/use-mobile-pinned-rail";
import { useNow } from "@/lib/use-now";
import { useWorldCupData } from "@/lib/use-world-cup-data";
import playerArticles from "@/data/player-articles.json";
import { getOfficialPlayerCatalog, type OfficialPlayerCatalogItem } from "@/lib/official-player-catalog";
import { fallbackTopScorerProfiles, fetchWorldCupTopScorers, TOP_SCORERS_REFRESH_MS, type WorldCupTopScorer } from "@/lib/world-cup-top-scorers";

type PlayerArticle = (typeof playerArticles.players)[number];
type PlayerListItem = PlayerArticle | OfficialPlayerCatalogItem;
type PlayerTab = "following" | "superstars" | "wonderkids" | "squads";
type SquadSortRule = "age" | "rating";
type SortDirection = "asc" | "desc";
type PlayerRailItem = {
  id: string | number;
  apiPlayerId?: string | number | null;
  nameCn: string;
  nameEn?: string;
  photo: string;
  meta: string;
};

const tabs: { id: PlayerTab; label: string }[] = [
  { id: "following", label: "我的关注" },
  { id: "superstars", label: "超级巨星" },
  { id: "wonderkids", label: "神童" },
  { id: "squads", label: "最佳射手" },
];

const INITIAL_SQUAD_RENDER_COUNT = 72;
const SQUAD_RENDER_BATCH_SIZE = 72;
const MOBILE_PLAYERS_FILTERS_STICKY_OFFSET = 56;

const officialPlayers = getOfficialPlayerCatalog();

const countryNameCn: Record<string, string> = {
  Argentina: "阿根廷",
  Norway: "挪威",
  France: "法国",
  Egypt: "埃及",
  Brazil: "巴西",
  England: "英格兰",
  Spain: "西班牙",
  Uruguay: "乌拉圭",
  Portugal: "葡萄牙",
  Belgium: "比利时",
  Colombia: "哥伦比亚",
  Germany: "德国",
  Croatia: "克罗地亚",
  USA: "美国",
  Algeria: "阿尔及利亚",
  Senegal: "塞内加尔",
  Ecuador: "厄瓜多尔",
  Turkey: "土耳其",
  "Côte d'Ivoire": "科特迪瓦",
};

export function PlayersClient() {
  const [activeTab, setActiveTab] = useState<PlayerTab>("superstars");
  const [playerQuery, setPlayerQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [sortRule, setSortRule] = useState<SquadSortRule>("age");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const mobileFiltersSentinelRef = useRef<HTMLDivElement>(null);
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const signedInDefaultAppliedRef = useRef(false);
  const { pinned: isMobileFiltersPinned, height: mobileFiltersHeight } = useMobilePinnedRail(
    mobileFiltersSentinelRef,
    mobileFiltersRef,
    MOBILE_PLAYERS_FILTERS_STICKY_OFFSET
  );
  const [topScorers, setTopScorers] = useState<WorldCupTopScorer[]>(fallbackTopScorerProfiles);
  const [topScorersLoading, setTopScorersLoading] = useState(true);
  const { home } = useUserSession();
  const { matches, warmupMatches } = useWorldCupData();
  const currentTime = useNow(30_000);
  const signedIn = Boolean(home);

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.id !== "following" || signedIn),
    [signedIn]
  );

  const regionOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const player of officialPlayers) {
      options.set(player.region, player.regionLabel);
    }
    return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const countryOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const player of officialPlayers) {
      if (regionFilter && player.region !== regionFilter) continue;
      options.set(player.teamCode, player.countryCn);
    }
    return Array.from(options, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [regionFilter]);

  const squadPlayers = useMemo(() => {
    const query = playerQuery.trim().toLowerCase();
    const normalizedQuery = normalizePlayerLookupKey(playerQuery);
    const filtered = officialPlayers.filter((player) => {
      if (regionFilter && player.region !== regionFilter) return false;
      if (countryFilter && player.teamCode !== countryFilter) return false;
      if ((query || normalizedQuery) && !officialPlayerMatchesQuery(player, query, normalizedQuery)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const valueA = sortRule === "age" ? a.age : a.rating;
      const valueB = sortRule === "age" ? b.age : b.rating;
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return 1;
      if (valueB == null) return -1;
      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });
  }, [countryFilter, playerQuery, regionFilter, sortDirection, sortRule]);

  const followedPlayers = useMemo<PlayerRailItem[]>(() => {
    if (!home) return [];
    return home.user.followedPlayers.map((player) => ({
      id: player.id,
      apiPlayerId: player.id,
      nameCn: player.name,
      nameEn: player.name,
      photo: player.photo || "",
      meta: [player.team, player.position].filter(Boolean).join(" · ") || "已关注",
    }));
  }, [home]);

  const topScorerRailItems = useMemo<PlayerRailItem[]>(
    () =>
      topScorers.map((player) => ({
        id: player.id,
        apiPlayerId: player.id,
        nameCn: player.name,
        nameEn: player.name,
        photo: player.photo,
        meta: `${player.teamName} · ${player.goals ?? 0}球`,
      })),
    [topScorers]
  );
  const topScorersRefreshEnabled = useMemo(
    () => hasMatchInLiveRefreshWindow([...matches, ...warmupMatches], currentTime),
    [currentTime, matches, warmupMatches]
  );

  const visiblePlayers = useMemo((): PlayerRailItem[] => {
    if (activeTab === "following") return followedPlayers;
    if (activeTab === "squads") return topScorerRailItems;
    return playerArticles.players.filter((player) => player.category === activeTab).map(toRailItem);
  }, [activeTab, followedPlayers, topScorerRailItems]);

  useEffect(() => {
    let active = true;
    setTopScorersLoading(true);
    const syncTopScorers = (forceRefresh = false) => {
      fetchWorldCupTopScorers({ forceRefresh })
        .then((items) => {
          if (active) setTopScorers(items.length ? items : fallbackTopScorerProfiles);
        })
        .catch((error) => {
          console.warn("[PlayersClient] top scorers unavailable:", error);
          if (active && !forceRefresh) setTopScorers(fallbackTopScorerProfiles);
        })
        .finally(() => {
          if (active) setTopScorersLoading(false);
        });
    };

    syncTopScorers(false);
    const refreshId = topScorersRefreshEnabled
      ? window.setInterval(() => syncTopScorers(true), TOP_SCORERS_REFRESH_MS)
      : null;

    return () => {
      active = false;
      if (refreshId !== null) window.clearInterval(refreshId);
    };
  }, [topScorersRefreshEnabled]);

  useEffect(() => {
    if (signedIn && !signedInDefaultAppliedRef.current) {
      signedInDefaultAppliedRef.current = true;
      setActiveTab("following");
      return;
    }

    if (!signedIn) {
      signedInDefaultAppliedRef.current = false;
      if (activeTab === "following") setActiveTab("superstars");
    }
  }, [activeTab, signedIn]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", {
      detail: { pinned: isMobileFiltersPinned, height: mobileFiltersHeight + 12 }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [isMobileFiltersPinned, mobileFiltersHeight]);

  return (
    <DashboardShell>
      <div className="players-page grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-5">
          <section className="hero-card px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="球员分类">
              {visibleTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${
                      active
                        ? "text-black"
                        : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="players-tab-pill"
                        className="absolute inset-0 rounded-full bg-volt shadow-[0_0_26px_rgba(216,255,62,.2)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 min-h-[7.5rem] sm:min-h-[8.75rem]"
              >
                <PlayerRail
                  players={visiblePlayers}
                  loading={activeTab === "squads" && topScorersLoading}
                  emptyLabel={activeTab === "squads" ? "本届世界杯暂无进球数据" : "暂无球员数据"}
                />
              </motion.div>
            </AnimatePresence>
          </section>

          <section className="space-y-4">
            <div className="hidden sm:block">
              <SquadFilters
                query={playerQuery}
                regions={regionOptions}
                countries={countryOptions}
                region={regionFilter}
                country={countryFilter}
                sortRule={sortRule}
                sortDirection={sortDirection}
                resultCount={squadPlayers.length}
                onQueryChange={setPlayerQuery}
                onRegionChange={(value) => {
                  setRegionFilter(value);
                  setCountryFilter("");
                }}
                onCountryChange={setCountryFilter}
                onSortRuleChange={setSortRule}
                onSortDirectionChange={setSortDirection}
              />
            </div>

            <div className="-mt-1 sm:hidden">
              <div
                ref={mobileFiltersSentinelRef}
                data-mobile-players-filters-sentinel="true"
                className="h-px"
              />
              <div className="relative -mx-3" style={{ height: mobileFiltersHeight || undefined }}>
                <div
                  ref={mobileFiltersRef}
                  data-mobile-players-filters="true"
                  className={`${
                    isMobileFiltersPinned
                      ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+3.5rem)]"
                      : "absolute left-0 right-0 top-0"
                  } z-[86] px-3 py-1.5 [backface-visibility:hidden] [transform:translateZ(0)]`}
                >
                  <SquadFilters
                    query={playerQuery}
                    regions={regionOptions}
                    countries={countryOptions}
                    region={regionFilter}
                    country={countryFilter}
                    sortRule={sortRule}
                    sortDirection={sortDirection}
                    resultCount={squadPlayers.length}
                    onQueryChange={setPlayerQuery}
                    onRegionChange={(value) => {
                      setRegionFilter(value);
                      setCountryFilter("");
                    }}
                    onCountryChange={setCountryFilter}
                    onSortRuleChange={setSortRule}
                    onSortDirectionChange={setSortDirection}
                  />
                </div>
              </div>
            </div>

            <SquadPlayerGrid players={squadPlayers} />
          </section>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <ScorerBoard players={topScorers} loading={topScorersLoading} />
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/50">{"资料覆盖"}</h2>
              <span className="text-xs font-black text-volt" style={{ fontFamily: "ScreenMatrix, monospace" }}>{playerArticles.count}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <MiniStat label="巨星" value={playerArticles.players.filter((p) => p.category === "superstars").length} />
              <MiniStat label="新星" value={playerArticles.players.filter((p) => p.category === "wonderkids").length} />
              <MiniStat label="阵容" value={officialPlayers.length} />
            </div>
          </section>
        </aside>
      </div>
    </DashboardShell>
  );
}

function SquadFilters({
  query,
  regions,
  countries,
  region,
  country,
  sortRule,
  sortDirection,
  resultCount,
  onQueryChange,
  onRegionChange,
  onCountryChange,
  onSortRuleChange,
  onSortDirectionChange,
}: {
  query: string;
  regions: { value: string; label: string }[];
  countries: { value: string; label: string }[];
  region: string;
  country: string;
  sortRule: SquadSortRule;
  sortDirection: SortDirection;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSortRuleChange: (value: SquadSortRule) => void;
  onSortDirectionChange: (value: SortDirection) => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.45 }}
      className="scrollbar-hidden relative z-[10000] flex flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain sm:z-20 sm:flex-wrap sm:gap-3 sm:overflow-visible"
    >
      <label className="glass-chip order-1 flex h-10 w-[calc(100vw-17rem)] min-w-[6.25rem] max-w-[10rem] shrink-0 items-center gap-2 px-3 text-white/70 transition focus-within:text-white sm:order-none sm:w-auto sm:min-w-[240px] sm:max-w-none sm:flex-1 sm:basis-auto sm:gap-3 sm:px-5">
        <Search className="h-5 w-5 shrink-0 text-volt/80" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索球员、国家或位置"
          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/35"
        />
      </label>

      <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-none sm:gap-3">
        <FilterDropdown
          icon={Globe2}
          value={region}
          fallbackLabel="地区"
          allLabel="全部地区"
          options={regions}
          onChange={onRegionChange}
        />
        <FilterDropdown
          icon={Flag}
          value={country}
          fallbackLabel="国家"
          allLabel="全部国家"
          options={countries}
          onChange={onCountryChange}
        />
      </div>

      <div className="order-2 flex shrink-0 items-center gap-1.5 sm:order-none sm:gap-3">
        <SortControls
          rule={sortRule}
          direction={sortDirection}
          onRuleChange={onSortRuleChange}
          onDirectionChange={onSortDirectionChange}
        />
      </div>

      <div className="ml-auto hidden h-10 items-center rounded-full bg-white/[0.035] px-4 text-[11px] font-semibold text-white/42 ring-1 ring-white/[0.06] sm:flex">
        <span>当前阵容</span>
        <span className="ml-2 tabular-nums text-volt/80">{resultCount} 人</span>
      </div>
    </motion.section>
  );
}

function SortControls({
  rule,
  direction,
  onRuleChange,
  onDirectionChange,
}: {
  rule: SquadSortRule;
  direction: SortDirection;
  onRuleChange: (value: SquadSortRule) => void;
  onDirectionChange: (value: SortDirection) => void;
}) {
  const rules: { value: SquadSortRule; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { value: "age", label: "年龄", icon: Trophy },
    { value: "rating", label: "评分", icon: Star },
  ];
  const DirectionIcon = direction === "asc" ? ArrowUpAZ : ArrowDownAZ;
  const handleSortClick = (nextRule: SquadSortRule) => {
    if (nextRule === rule) {
      onDirectionChange(direction === "asc" ? "desc" : "asc");
      return;
    }
    onRuleChange(nextRule);
    onDirectionChange("asc");
  };

  return (
    <div className="glass-chip flex h-10 min-w-0 flex-1 items-center gap-1 overflow-hidden p-1 sm:flex-none">
      {rules.map((item) => {
        const Icon = item.icon;
        const active = rule === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-label={`${item.label}${active && direction === "desc" ? "倒序" : "正序"}排序`}
            onClick={() => handleSortClick(item.value)}
            className={`player-sort-pill flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition-colors duration-150 sm:flex-none sm:px-4 ${
              active ? "is-active" : ""
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.label}</span>
            {active ? (
              <DirectionIcon className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <ArrowUpAZ className="h-3.5 w-3.5 shrink-0 opacity-45" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function PlayerRail({
  players,
  loading = false,
  emptyLabel = "暂无球员数据",
}: {
  players: PlayerRailItem[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const eps = 2;
    setCanScrollLeft(el.scrollLeft > eps);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - eps);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, players]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.6 : el.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div className="relative">
        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${loading || players.length === 0 ? "min-h-[7rem] items-center" : ""}`}
        >
          {loading ? (
            <div className="w-full rounded-3xl bg-white/[0.025] px-4 py-6 text-center text-xs font-semibold text-white/36 ring-1 ring-white/[0.06]">
              正在同步本届世界杯进球数据
            </div>
          ) : players.length === 0 ? (
            <div className="w-full rounded-3xl bg-white/[0.025] px-4 py-6 text-center text-xs font-semibold text-white/36 ring-1 ring-white/[0.06]">
              {emptyLabel}
            </div>
          ) : null}
          {players.map((player) => (
            <Link
              key={player.id}
              href={playerProfileHref(player)}
              className="group flex w-20 shrink-0 flex-col items-center text-center sm:w-24"
            >
              <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.1] transition duration-300 group-hover:scale-105 group-hover:ring-volt/45 sm:h-20 sm:w-20">
                {player.photo ? (
                  <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-black text-volt/70">
                    {player.nameCn.slice(0, 1)}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              </div>
              <span className="mt-2.5 w-full truncate text-[11px] font-medium text-white/60 group-hover:text-volt sm:mt-3 sm:text-xs">
                {player.nameCn}
              </span>
              <span className="mt-0.5 w-full truncate text-[10px] text-white/28 sm:text-[11px]">{player.meta}</span>
            </Link>
          ))}
        </div>

        {!loading && players.length > 0 && canScrollLeft && (
          <button
            type="button"
            aria-label="向左滚动"
            onClick={() => scroll("left")}
            className="absolute left-0 top-[34px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black sm:top-[40px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {!loading && players.length > 0 && canScrollRight && (
          <button
            type="button"
            aria-label="向右滚动"
            onClick={() => scroll("right")}
            className="absolute right-0 top-[34px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black sm:top-[40px]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SquadPlayerGrid({ players }: { players: OfficialPlayerCatalogItem[] }) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_SQUAD_RENDER_COUNT, players.length));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const visiblePlayers = useMemo(() => players.slice(0, visibleCount), [players, visibleCount]);
  const hasMore = visibleCount < players.length;

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_SQUAD_RENDER_COUNT, players.length));
  }, [players]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") {
      setVisibleCount(players.length);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisibleCount((count) => Math.min(count + SQUAD_RENDER_BATCH_SIZE, players.length));
      },
      { rootMargin: "720px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, players.length, visibleCount]);

  return (
    <>
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visiblePlayers.map((player) => (
        <div
          key={player.id}
          className="squad-player-card group relative min-w-0 rounded-3xl border border-white/[0.06] bg-white/[0.025] p-3 shadow-[0_16px_46px_rgba(0,0,0,.18)] backdrop-blur-xl transition duration-300 hover:border-volt/30 hover:bg-white/[0.04]"
        >
          <div className="absolute right-2.5 top-2.5 z-10">
            <UserActionButton
              kind="player"
              iconOnly
              payload={{
                id: player.apiPlayerId,
                name: player.nameCn,
                team: player.countryCn,
                position: player.positionCn || player.position,
                photo: player.photo,
              }}
              className="h-8 w-8 min-w-8 bg-black/36 shadow-none ring-white/[0.08] hover:bg-white/[0.1] hover:ring-volt/25"
            />
          </div>

          <Link
            href={playerProfileHref(player)}
            className="grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-3 pr-8 sm:grid-cols-[72px_minmax(0,1fr)]"
          >
          <div className="relative h-14 w-14 overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.08] sm:h-[72px] sm:w-[72px]">
            <img src={player.photo} alt={player.nameCn} className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-white/82 group-hover:text-volt">{player.nameCn}</p>
            </div>
            <p className="mt-0.5 truncate text-xs text-white/36">{player.nameEn}</p>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-medium text-white/32">
              <span className="min-w-0 truncate">
                {player.countryCn} · {player.positionCn}
                {player.number ? ` · ${player.number}号` : ""}
              </span>
              {player.rating ? (
                <span className="shrink-0 rounded-full bg-volt/[0.1] px-2 py-0.5 text-[10px] font-black text-volt/80 ring-1 ring-volt/[0.12] sm:hidden">
                  评分 {player.rating}
                </span>
              ) : null}
              <span className="shrink-0 rounded-full bg-volt/[0.1] px-2 py-0.5 text-[10px] font-black text-volt/80 ring-1 ring-volt/[0.12] sm:hidden">
                {player.age ? `${player.age} 岁` : "年龄待更"}
              </span>
            </div>
            <div className="mt-2 hidden min-w-0 flex-wrap gap-1.5 sm:flex">
              {player.rating ? (
                <span className="shrink-0 rounded-full bg-volt/[0.1] px-2 py-1 text-[10px] font-black text-volt/80 ring-1 ring-volt/[0.12]">
                  评分 {player.rating}
                </span>
              ) : null}
              <span className="shrink-0 rounded-full bg-volt/[0.1] px-2 py-1 text-[10px] font-black text-volt/80 ring-1 ring-volt/[0.12]">
                {player.age ? `${player.age} 岁` : "年龄待更"}
              </span>
            </div>
          </div>
          </Link>
        </div>
      ))}
    </div>
    {hasMore ? <div ref={sentinelRef} className="h-10" aria-hidden="true" /> : null}
    </>
  );
}

function countryLabel(player: PlayerListItem) {
  return countryNameCn[player.countryCn] || countryNameCn[player.countryEn] || player.countryCn;
}

function toRailItem(player: PlayerListItem): PlayerRailItem {
  return {
    id: player.id,
    apiPlayerId: player.apiPlayerId,
    nameCn: player.nameCn,
    nameEn: "nameEn" in player ? player.nameEn : undefined,
    photo: player.photo,
    meta: railMetaLabel(player),
  };
}

function railMetaLabel(player: PlayerListItem) {
  if (isOfficialPlayer(player) && player.goals > 0) {
    return `${countryLabel(player)} · ${player.goals}球`;
  }
  return countryLabel(player);
}

function isOfficialPlayer(player: PlayerListItem): player is OfficialPlayerCatalogItem {
  return "goals" in player;
}

function officialPlayerMatchesQuery(player: OfficialPlayerCatalogItem, query: string, normalizedQuery: string) {
  const rawFields = [
    player.nameCn,
    player.nameEn,
    player.countryCn,
    player.countryEn,
    player.positionCn,
    player.position,
    player.teamCode,
    player.number ? `${player.number}号` : "",
    player.number ? String(player.number) : "",
  ];
  const rawMatch = query && rawFields.some((field) => field.toLowerCase().includes(query));
  if (rawMatch) return true;

  return Boolean(
    normalizedQuery &&
      rawFields.some((field) => normalizePlayerLookupKey(field).includes(normalizedQuery))
  );
}

function normalizePlayerLookupKey(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function playerProfileHref(player: Pick<PlayerRailItem, "apiPlayerId" | "id">) {
  return `/players/${player.apiPlayerId || player.id}/`;
}

function ScorerBoard({ players, loading }: { players: WorldCupTopScorer[]; loading: boolean }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-volt/50">Ranking</p>
          <h2 className="mt-0.5 text-sm font-bold text-white/80">{"射手榜"}</h2>
        </div>
        <Trophy className="h-4 w-4 text-volt/60" />
      </div>
      <div className="divide-y divide-white/[0.04]">
        {loading ? (
          <div className="px-4 py-6 text-center text-xs font-semibold text-white/34">正在同步本届世界杯进球数据</div>
        ) : players.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs font-semibold text-white/34">本届世界杯暂无进球数据</div>
        ) : null}
        {players.slice(0, 8).map((player, index) => (
          <Link
            key={player.id}
            href={"/players/" + player.id + "/"}
            className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]"
          >
            <span className="w-4 text-center text-[11px] font-bold text-white/25 group-hover:text-white/50" style={{ fontFamily: "ScreenMatrix, monospace" }}>{index + 1}</span>
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs font-black text-volt/70">
                  {player.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-white/70 group-hover:text-white/90">{player.name}</p>
              <p className="truncate text-[11px] text-white/30">{player.teamName}</p>
            </div>
            <span className="text-xs font-bold text-volt/60 group-hover:text-volt" style={{ fontFamily: "ScreenMatrix, monospace" }}>
              {player.goals ?? 0}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
      <p className="text-xl font-black tabular-nums text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>{value}</p>
      <p className="mt-0.5 text-[11px] text-white/32">{label}</p>
    </div>
  );
}
