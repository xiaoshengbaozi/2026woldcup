"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  continentOrder,
  qualifiedTeams,
  teamContinentLabels,
  type QualifiedTeamCard,
} from "@/data/teams";

const MOBILE_TOP_MODULE_OFFSET = 66;

export function TeamsIndex() {
  const [activeContinent, setActiveContinent] = useState(continentOrder[0]);
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

  return (
    <main className="relative -mt-3 min-h-screen overflow-hidden pb-8 pt-0 text-white sm:mt-0 sm:py-8">
      <div className="relative">
        <section className="scroll-mt-24">
          <div className="mb-4 flex flex-col gap-3 px-1">
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
                <TeamCard key={team.slug} team={team} index={index} />
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function TeamCard({ team, index }: { team: QualifiedTeamCard; index: number }) {
  return (
    <motion.div
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
    </motion.div>
  );
}
