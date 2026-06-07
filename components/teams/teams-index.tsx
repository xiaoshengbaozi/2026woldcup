"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import {
  continentOrder,
  qualifiedTeams,
  teamContinentLabels,
  type QualifiedTeamCard,
} from "@/data/teams";

const MOBILE_TOP_MODULE_OFFSET = 66;
const FOLLOWED_TEAMS_STORAGE_KEY = "worldcup-followed-teams";

export function TeamsIndex() {
  const [activeContinent, setActiveContinent] = useState(continentOrder[0]);
  const [followedTeamSlugs, setFollowedTeamSlugs] = useState<string[]>([]);
  const [hasLoadedFollowedTeams, setHasLoadedFollowedTeams] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [tabsHeight, setTabsHeight] = useState(0);
  const tabItems = useMemo(
    () =>
      continentOrder.map((continent) => {
        const teams = qualifiedTeams.filter((team) => team.continent === continent);
        return {
          continent,
          label: teamContinentLabels[continent],
          teams,
        };
      }),
    []
  );
  const activeTab = tabItems.find((item) => item.continent === activeContinent) ?? tabItems[0];
  const teamsBySlug = useMemo(() => new Map(qualifiedTeams.map((team) => [team.slug, team])), []);
  const followedTeams = useMemo(
    () => followedTeamSlugs.map((slug) => teamsBySlug.get(slug)).filter((team): team is QualifiedTeamCard => Boolean(team)),
    [followedTeamSlugs, teamsBySlug]
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FOLLOWED_TEAMS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setFollowedTeamSlugs(parsed.filter((slug): slug is string => typeof slug === "string" && teamsBySlug.has(slug)));
      }
    } catch {
      setFollowedTeamSlugs([]);
    } finally {
      setHasLoadedFollowedTeams(true);
    }
  }, [teamsBySlug]);

  useEffect(() => {
    if (!hasLoadedFollowedTeams) return;
    window.localStorage.setItem(FOLLOWED_TEAMS_STORAGE_KEY, JSON.stringify(followedTeamSlugs));
  }, [followedTeamSlugs, hasLoadedFollowedTeams]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 639px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setIsPinned(false);
        setTabsHeight(0);
        return;
      }

      const sentinel = sentinelRef.current;
      const tabs = tabsRef.current;
      if (!sentinel || !tabs) return;

      const nextHeight = tabs.offsetHeight;
      setTabsHeight((current) => (current === nextHeight ? current : nextHeight));
      setIsPinned(sentinel.getBoundingClientRect().top <= MOBILE_TOP_MODULE_OFFSET);
    };

    syncPinnedState();
    window.addEventListener("scroll", syncPinnedState, { passive: true });
    window.addEventListener("resize", syncPinnedState);
    mobileQuery.addEventListener?.("change", syncPinnedState);

    return () => {
      window.removeEventListener("scroll", syncPinnedState);
      window.removeEventListener("resize", syncPinnedState);
      mobileQuery.removeEventListener?.("change", syncPinnedState);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: isPinned } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [isPinned]);

  const handleContinentChange = (continent: typeof activeContinent) => {
    if (continent === activeContinent) return;
    setActiveContinent(continent);
  };

  const toggleFollowTeam = (slug: string) => {
    setFollowedTeamSlugs((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
  };

  return (
    <main className="relative -mt-3 min-h-screen overflow-hidden pb-8 pt-0 text-white sm:mt-0 sm:py-8">
      <div className="relative">
        <section className="scroll-mt-24">
          <div className="mb-4 flex flex-col gap-3 px-1">
            {followedTeams.length > 0 && (
              <FollowedTeamsRail teams={followedTeams} onToggleFollow={toggleFollowTeam} />
            )}

            <div
              ref={sentinelRef}
              className="sm:hidden"
              style={{ height: isPinned ? tabsHeight : 0 }}
            />
            <div
              ref={tabsRef}
              className={`${
                isPinned
                  ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[65] px-3 py-2"
                  : "relative -mx-3 bg-black/58 px-3 py-2 backdrop-blur-2xl"
              } sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none`}
            >
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="地区分类"
            >
              {tabItems.map((item) => {
                const isActive = item.continent === activeContinent;

                return (
                  <button
                    key={item.continent}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleContinentChange(item.continent)}
                    className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm ${
                      isActive
                        ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                        : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
                    }`}
                  >
                    <span>{item.label.title}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:px-2 sm:text-[11px] ${
                        isActive
                          ? "bg-black/15 text-black"
                          : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"
                      }`}
                    >
                      {item.teams.length}
                    </span>
                  </button>
                );
              })}
            </div>
            </div>
          </div>

          <motion.div
            key={activeTab.continent}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeTab.teams.map((team, index) => (
                <TeamCard
                  key={team.slug}
                  team={team}
                  index={index}
                  isFollowed={followedTeamSlugs.includes(team.slug)}
                  onToggleFollow={toggleFollowTeam}
                />
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function FollowedTeamsRail({
  teams,
  onToggleFollow,
}: {
  teams: QualifiedTeamCard[];
  onToggleFollow: (slug: string) => void;
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
  }, [checkScroll, teams]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.6 : el.clientWidth * 0.6, behavior: "smooth" });
  };

  return (
    <div className="relative rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] px-3 py-3 shadow-[0_18px_70px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
        aria-label="Followed teams"
      >
        {teams.map((team) => (
          <div
            key={team.slug}
            className="group relative h-9 min-w-0 shrink-0 basis-[calc((100%-2.25rem)/10)] overflow-hidden rounded-full bg-black/30 ring-1 ring-white/[0.08] transition duration-300 hover:ring-volt/45 sm:h-12 sm:basis-[calc((100%-4.5rem)/10)]"
          >
            <Link href={team.detailHref} className="block h-full w-full" aria-label={team.nameCn}>
              <Image src={team.cover} alt={team.nameCn} fill sizes="10vw" className="object-cover opacity-80 transition duration-500 group-hover:scale-110 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <span className="absolute inset-x-1 bottom-1 hidden truncate text-center text-[10px] font-black text-white drop-shadow sm:block">
                {team.nameCn}
              </span>
            </Link>
            <button
              type="button"
              aria-label={`Unfollow ${team.nameCn}`}
              onClick={() => onToggleFollow(team.slug)}
              className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-volt text-black opacity-0 shadow-[0_0_18px_rgba(216,255,62,.35)] transition duration-300 hover:scale-110 group-hover:opacity-100 sm:h-5 sm:w-5"
            >
              <Heart className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" />
            </button>
          </div>
        ))}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll followed teams left"
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll followed teams right"
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white/70 backdrop-blur-sm ring-1 ring-white/[0.1] transition hover:bg-volt hover:text-black"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function TeamCard({
  team,
  index,
  isFollowed,
  onToggleFollow,
}: {
  team: QualifiedTeamCard;
  index: number;
  isFollowed: boolean;
  onToggleFollow: (slug: string) => void;
}) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.18), ease: "easeOut" }}
    >
      <Link
        href={team.detailHref}
        className="group relative block aspect-square overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,.34)] outline-none transition duration-500 hover:-translate-y-1 hover:border-volt/35 hover:shadow-[0_28px_100px_rgba(216,255,62,.10)] focus-visible:border-volt/60"
      >
        <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
          <Image
            src={team.cover}
            alt={`${team.nameCn} 封面`}
            fill
            sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover saturate-[1.08] transition duration-700 group-hover:scale-105"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-gradient-to-t from-black/75 via-black/45 to-transparent px-5 pt-12 pb-5">
          <h3 className="text-2xl font-black tracking-normal text-white drop-shadow-lg">{team.nameCn}</h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-md">
              {team.confederation}
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-black/30 text-volt backdrop-blur-md transition duration-300 group-hover:border-volt/50 group-hover:bg-volt/[0.15]">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
      <button
        type="button"
        aria-pressed={isFollowed}
        aria-label={`${isFollowed ? "Unfollow" : "Follow"} ${team.nameCn}`}
        onClick={() => onToggleFollow(team.slug)}
        className={`absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl transition duration-300 ${
          isFollowed
            ? "border-volt/50 bg-volt text-black shadow-[0_0_28px_rgba(216,255,62,.24)]"
            : "border-white/15 bg-black/35 text-white/72 hover:border-volt/45 hover:bg-volt/[0.16] hover:text-volt"
        }`}
      >
        <Heart className={`h-4 w-4 ${isFollowed ? "fill-current" : ""}`} />
      </button>
    </motion.div>
  );
}
