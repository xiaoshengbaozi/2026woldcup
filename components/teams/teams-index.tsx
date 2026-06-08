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
import { getFlagUrl } from "@/lib/world-cup-2026";
import { userApi, type PublicUser, type UserSessionPayload } from "@/lib/user-system";

const MOBILE_TOP_MODULE_OFFSET = 66;
const FOLLOWED_TEAMS_STORAGE_KEY = "worldcup-followed-teams";
const TEAM_CODE_ALIASES: Record<string, string> = {
  ALG: "DZA",
  KSA: "SAU",
};

type FollowedTeamRailItem = {
  key: string;
  savedId: string;
  name: string;
  flag: string;
  detailHref: string;
};

export function TeamsIndex() {
  const [activeContinent, setActiveContinent] = useState(continentOrder[0]);
  const [followedTeamSlugs, setFollowedTeamSlugs] = useState<string[]>([]);
  const [sessionUser, setSessionUser] = useState<PublicUser | null>(null);
  const [signedIn, setSignedIn] = useState(false);
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
  const followedTeamKeys = useMemo(() => {
    if (signedIn && sessionUser) {
      return new Set(sessionUser.followedTeams.flatMap((team) => getSavedTeamKeys(team)));
    }

    return new Set(
      followedTeamSlugs
        .map((slug) => teamsBySlug.get(slug))
        .filter((team): team is QualifiedTeamCard => Boolean(team))
        .flatMap((team) => getQualifiedTeamKeys(team))
    );
  }, [followedTeamSlugs, sessionUser, signedIn, teamsBySlug]);
  const followedTeams = useMemo(
    () =>
      signedIn && sessionUser
        ? sessionUser.followedTeams.map((team) => toFollowedRailItem(team)).filter((team): team is FollowedTeamRailItem => Boolean(team))
        : followedTeamSlugs
            .map((slug) => teamsBySlug.get(slug))
            .filter((team): team is QualifiedTeamCard => Boolean(team))
            .map((team) => toFollowedRailItem(team)),
    [followedTeamSlugs, sessionUser, signedIn, teamsBySlug]
  );

  const refreshSession = useCallback(() => {
    let active = true;
    userApi<UserSessionPayload>("/api/me/session", { cache: "no-store" })
      .then((payload) => {
        if (!active) return;
        setSessionUser(payload.user);
        setSignedIn(true);
      })
      .catch(() => {
        if (!active) return;
        setSessionUser(null);
        setSignedIn(false);
      })
      .finally(() => {
        if (active) setHasLoadedFollowedTeams(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => refreshSession(), [refreshSession]);

  useEffect(() => {
    if (signedIn) return;
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
  }, [signedIn, teamsBySlug]);

  useEffect(() => {
    if (!hasLoadedFollowedTeams || signedIn) return;
    window.localStorage.setItem(FOLLOWED_TEAMS_STORAGE_KEY, JSON.stringify(followedTeamSlugs));
  }, [followedTeamSlugs, hasLoadedFollowedTeams, signedIn]);

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

  const toggleFollowTeam = async (team: QualifiedTeamCard | string) => {
    if (!signedIn) {
      const target = typeof team === "string" ? teamsBySlug.get(team) : team;
      if (!target) return;
      setFollowedTeamSlugs((current) => (current.includes(target.slug) ? current.filter((item) => item !== target.slug) : [...current, target.slug]));
      return;
    }

    const target = typeof team === "string" ? teamsBySlug.get(team) : team;
    const currentSaved = target
      ? sessionUser?.followedTeams.find((item) => savedTeamMatchesQualified(item, target))
      : sessionUser?.followedTeams.find((item) => item.id === team);
    if (currentSaved) {
      const result = await userApi<{ user: PublicUser }>(`/api/me/follow/team/${encodeURIComponent(currentSaved.id)}`, { method: "DELETE" });
      setSessionUser(result.user);
      return;
    }

    if (!target) return;

    const result = await userApi<{ user: PublicUser }>("/api/me/follow/team", {
      method: "POST",
      body: JSON.stringify({
        id: target.code,
        name: target.nameCn,
        region: target.code,
        logo: getTeamFlagUrl(target),
      }),
    });
    setSessionUser(result.user);
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
                  isFollowed={qualifiedTeamIsFollowed(team, followedTeamKeys)}
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
  teams: FollowedTeamRailItem[];
  onToggleFollow: (team: QualifiedTeamCard | string) => void;
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
    <div className="relative px-1 py-1">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
        aria-label="Followed teams"
      >
        {teams.map((team) => (
          <div
            key={team.key}
            className="group relative min-w-0 shrink-0 basis-[calc((100%_-_1.25rem)/6)] sm:basis-[calc((100%_-_5.5rem)/12)]"
          >
            <Link href={team.detailHref} className="flex min-w-0 flex-col items-center gap-1.5 px-1 py-0.5 text-center" aria-label={team.name}>
              <Image
                src={team.flag}
                alt={team.name}
                width={80}
                height={54}
                sizes="80px"
                className="h-5 w-auto max-w-full rounded-[0.2rem] opacity-90 shadow-[0_0_18px_rgba(255,255,255,.08)] transition duration-500 group-hover:scale-110 group-hover:opacity-100 sm:h-7"
              />
              <span className="block w-full truncate text-[10px] font-black leading-none text-white/78 transition group-hover:text-white sm:text-[11px]">
                {team.name}
              </span>
            </Link>
            <button
              type="button"
              aria-label={`Unfollow ${team.name}`}
              onClick={() => onToggleFollow(team.savedId)}
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
  onToggleFollow: (team: QualifiedTeamCard | string) => void;
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
        onClick={() => onToggleFollow(team)}
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

function toFollowedRailItem(team: QualifiedTeamCard | PublicUser["followedTeams"][number]): FollowedTeamRailItem {
  if ("slug" in team) {
    return {
      key: team.slug,
      savedId: team.slug,
      name: team.nameCn,
      flag: getTeamFlagUrl(team),
      detailHref: team.detailHref,
    };
  }

  const qualified = findQualifiedTeamForSaved(team);
  const code = normalizeTeamCode(team.region || team.id);

  return {
    key: qualified?.slug || normalizeTeamKey(team.id) || team.id,
    savedId: team.id,
    name: qualified?.nameCn || team.name,
    flag: qualified ? getTeamFlagUrl(qualified) : getSavedTeamFlagUrl(team, code),
    detailHref: qualified?.detailHref || `/teams/${slugifyRoute(team.name)}`,
  };
}

function qualifiedTeamIsFollowed(team: QualifiedTeamCard, followedKeys: Set<string>) {
  return getQualifiedTeamKeys(team).some((key) => followedKeys.has(key));
}

function savedTeamMatchesQualified(saved: PublicUser["followedTeams"][number], team: QualifiedTeamCard) {
  const savedKeys = getSavedTeamKeys(saved);
  return getQualifiedTeamKeys(team).some((key) => savedKeys.includes(key));
}

function getQualifiedTeamKeys(team: QualifiedTeamCard) {
  return [
    normalizeTeamCode(team.code),
    normalizeTeamKey(team.slug),
    normalizeTeamKey(team.nameCn),
    normalizeTeamKey(team.nameEn),
  ].filter(Boolean);
}

function getSavedTeamKeys(team: PublicUser["followedTeams"][number]) {
  return [
    normalizeTeamCode(team.id),
    normalizeTeamCode(team.region),
    normalizeTeamKey(team.id),
    normalizeTeamKey(team.name),
  ].filter(Boolean);
}

function findQualifiedTeamForSaved(team: PublicUser["followedTeams"][number]) {
  const savedKeys = new Set(getSavedTeamKeys(team));
  return qualifiedTeams.find((item) => getQualifiedTeamKeys(item).some((key) => savedKeys.has(key)));
}

function getTeamFlagUrl(team: QualifiedTeamCard) {
  return getFlagUrl(normalizeTeamCode(team.code), 160);
}

function getSavedTeamFlagUrl(team: PublicUser["followedTeams"][number], code: string) {
  if (team.logo?.includes("flagcdn.com/")) return team.logo;
  if (code) return getFlagUrl(code, 160);
  return team.logo || getFlagUrl("FIFA", 160);
}

function normalizeTeamCode(code?: string) {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2,4}$/.test(upper)) return "";
  return TEAM_CODE_ALIASES[upper] ?? upper;
}

function normalizeTeamKey(value?: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function slugifyRoute(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
