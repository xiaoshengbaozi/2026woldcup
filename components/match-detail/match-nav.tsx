"use client";

import { useEffect, useRef, useState } from "react";

export type MatchTab = "lineup" | "live" | "stats" | "events" | "analysis";

const NAV_ITEMS: { id: MatchTab; label: string }[] = [
  { id: "lineup", label: "阵容" },
  { id: "live", label: "直播" },
  { id: "stats", label: "统计" },
  { id: "events", label: "事件" },
  { id: "analysis", label: "分析" },
];

const MOBILE_TOP_MODULE_OFFSET = 66;

export function MatchNav({
  active,
  onTabChange,
}: {
  active: MatchTab;
  onTabChange: (tab: MatchTab) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setIsPinned(false);
        setNavHeight(0);
        return;
      }

      const sentinel = sentinelRef.current;
      const nav = navRef.current;
      if (!sentinel || !nav) return;

      const nextHeight = nav.offsetHeight;
      setNavHeight((current) => (current === nextHeight ? current : nextHeight));
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

  const scrollToTabHead = () => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const offset = MOBILE_TOP_MODULE_OFFSET + (navRef.current?.offsetHeight ?? 0) + 12;
    const target = sentinel.getBoundingClientRect().top + window.scrollY - offset;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    });
  };

  const handleTabChange = (tab: MatchTab) => {
    if (tab === active) return;
    onTabChange(tab);
    if (!isPinned) scrollToTabHead();
  };

  return (
    <>
    <div ref={sentinelRef} className="lg:hidden" style={{ height: isPinned ? navHeight : 0 }} />
    <div
      ref={navRef}
      className={`${
        isPinned
          ? "match-tabs-rail fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[65] px-3 py-2"
          : "match-tabs-rail relative -mx-3 px-3 py-2"
      } mb-5 lg:static lg:mx-0 lg:bg-transparent lg:px-1 lg:py-0 lg:backdrop-blur-none`}
    >
      <div
        className="scrollbar-hidden flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain"
        role="tablist"
        aria-label="比赛详情"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(item.id)}
              className={`group relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-left text-sm font-bold transition duration-300 ${
                isActive
                  ? "bg-volt text-black shadow-[0_0_26px_rgba(216,255,62,.2)]"
                : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
    </>
  );
}
