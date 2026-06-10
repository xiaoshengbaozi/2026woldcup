"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ExternalLink, Flag, MapPin, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/stat-card";

type MatchStatsProps = {
  totalMatches: number;
  visible: number;
  totalMatchDays: number;
  remainingMatchDays: number;
  activeTeamCount: number;
  totalTeamCount: number;
  visibleCities: number;
  totalCities: number;
};

const CITY_GUIDE_URL = "/guides/2026-world-cup-guides/index.html";

export function MatchStats({
  totalMatches,
  visible,
  totalMatchDays,
  remainingMatchDays,
  activeTeamCount,
  totalTeamCount,
  visibleCities,
  totalCities,
}: MatchStatsProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (!guideOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuideOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [guideOpen]);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65 }}
        className="grid grid-cols-4 gap-1.5 sm:gap-3"
      >
        <StatCard
          label="比赛"
          value={`${visible}/${totalMatches}`}
          detail="筛选 / 全部"
          icon={Trophy}
          accent
          href="/matches"
          tone="violet"
          bareIcon
        />
        <StatCard
          label="比赛日"
          value={`${remainingMatchDays}/${totalMatchDays}`}
          detail="剩余 / 全部"
          icon={CalendarDays}
          href="/matches"
          tone="emerald"
          bareIcon
        />
        <StatCard
          label="球队"
          value={`${activeTeamCount}/${totalTeamCount}`}
          detail="当前 / 全部"
          icon={Flag}
          href="/teams"
          tone="amber"
          bareIcon
        />
        <StatCard
          label="城市"
          value={`${visibleCities}/${totalCities}`}
          detail="筛选 / 全部"
          icon={MapPin}
          onClick={() => setGuideOpen(true)}
          ariaLabel="打开城市指南"
          tone="cyan"
          bareIcon
        />
      </motion.section>

      <AnimatePresence>
        {guideOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="世界杯城市指南"
            className="fixed left-0 top-0 z-[100000] h-screen w-screen bg-black/78 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="relative flex h-full w-full flex-col overflow-hidden bg-black/86 shadow-[0_30px_120px_rgba(0,0,0,.72),0_0_0_1px_rgba(255,255,255,.12),0_0_70px_rgba(56,189,248,.16)] backdrop-blur-2xl sm:rounded-[2rem]"
              initial={{ y: 24, scale: 0.985, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.985, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/45 to-transparent" />
              <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-black/62 px-4 backdrop-blur-xl sm:h-16 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white sm:text-base">2026 World Cup Host City Guide</p>
                  <p className="hidden truncate text-xs text-white/42 sm:block">{CITY_GUIDE_URL}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={CITY_GUIDE_URL}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="新窗口打开城市指南"
                    title="新窗口打开"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/64 ring-1 ring-white/[0.08] transition hover:bg-white/[0.1] hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(false)}
                    aria-label="关闭城市指南"
                    title="关闭"
                    className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-white/76 ring-1 ring-white/[0.1] transition hover:bg-white/[0.14] hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <iframe
                title="2026 World Cup city guide"
                src={CITY_GUIDE_URL}
                className="h-full w-full flex-1 border-0 bg-black"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
