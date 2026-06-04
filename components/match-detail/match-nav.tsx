"use client";

import { useEffect, useRef, useState } from "react";

export type MatchTab = "lineup" | "odds" | "timeline" | "stats" | "h2h";

const NAV_ITEMS: { id: MatchTab; label: string }[] = [
  { id: "lineup", label: "阵容" },
  { id: "odds", label: "赔率" },
  { id: "timeline", label: "事件" },
  { id: "stats", label: "统计" },
  { id: "h2h", label: "交锋" },
];

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
    const mobileQuery = window.matchMedia("(max-width: 639px)");

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
      setIsPinned(sentinel.getBoundingClientRect().top <= 0);
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

  const scrollToTabHead = () => {
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const target = sentinel.getBoundingClientRect().top + window.scrollY;
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: Math.max(target - 12, 0), behavior: "smooth" });
    });
  };

  const handleTabChange = (tab: MatchTab) => {
    if (tab === active) return;
    onTabChange(tab);
    scrollToTabHead();
  };

  return (
    <>
    <div ref={sentinelRef} className="sm:hidden" style={{ height: isPinned ? navHeight : 0 }} />
    {isPinned ? (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[calc(env(safe-area-inset-top)+6.25rem)] bg-black/72 backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,black_56%,rgba(0,0,0,0)_100%)] sm:hidden" />
    ) : null}
    <div
      ref={navRef}
      className={`${
        isPinned
          ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] px-3 py-2"
          : "relative -mx-3 bg-black/58 px-3 py-2 backdrop-blur-2xl"
      } mb-5 sm:static sm:mx-0 sm:bg-transparent sm:px-1 sm:py-0 sm:backdrop-blur-none`}
    >
      <div
        className="flex flex-wrap gap-1.5"
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
              className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 sm:px-3.5 sm:py-2 sm:text-sm ${
                isActive
                  ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
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
