"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Map as MapIcon } from "lucide-react";
import { useLiveMarketData } from "@/lib/use-live-market-data";
import { ModuleD_Ticker } from "@/components/market-ticker/module-d-ticker";
import { MarketOddsCard } from "@/components/market-ranking/market-odds-card";
import { RankingOverflowCard } from "@/components/market-ranking/ranking-overflow-card";
import { MatchLinesPanel } from "@/components/market-matches/match-lines-panel";
import { ModuleC_OddsTimeline } from "@/components/market-timeline/module-c-timeline";
import { ThreeGlobe } from "@/components/market-map/three-globe";
import { StatusBar } from "./status-bar";
import { NavBar } from "@/components/nav-bar";
import { MobileMeEntry } from "@/components/mobile-me-entry";
import { MobileNavBar } from "@/components/mobile-nav-bar";
import { SiteFooter } from "@/components/site-footer";

const MOBILE_TOP_MODULE_OFFSET = 66;

export function MarketDashboard() {
  useLiveMarketData();
  const [webFullscreen, setWebFullscreen] = useState(false);
  const [systemFsPending, setSystemFsPending] = useState(false);
  const [mobileDataTab, setMobileDataTab] = useState<"teams" | "matches">("teams");
  const mobileTabsSentinelRef = useRef<HTMLDivElement>(null);
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  const [mobileTabsPinned, setMobileTabsPinned] = useState(false);
  const [mobileTabsHeight, setMobileTabsHeight] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleFullscreenChange = useCallback((v: boolean, system = false) => {
    setWebFullscreen(v);
    document.body.style.overflow = v ? "hidden" : "";
    if (system && v) setSystemFsPending(true);
  }, []);

  // Restore body overflow on unmount
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  // Trigger native fullscreen on overlay when pending
  useEffect(() => {
    if (systemFsPending && overlayRef.current) {
      setSystemFsPending(false);
      overlayRef.current.requestFullscreen().catch(() => {});
    }
  }, [systemFsPending]);

  // Sync state when user exits native fullscreen via browser controls
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && webFullscreen) {
        setWebFullscreen(false);
        document.body.style.overflow = "";
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [webFullscreen]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    const syncPinnedState = () => {
      if (!mobileQuery.matches) {
        setMobileTabsPinned(false);
        setMobileTabsHeight(0);
        return;
      }

      const sentinel = mobileTabsSentinelRef.current;
      const tabs = mobileTabsRef.current;
      if (!sentinel || !tabs) return;

      const nextHeight = tabs.offsetHeight;
      setMobileTabsHeight((current) => (current === nextHeight ? current : nextHeight));
      setMobileTabsPinned(sentinel.getBoundingClientRect().top <= MOBILE_TOP_MODULE_OFFSET);
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
    window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: mobileTabsPinned } }));
    return () => {
      window.dispatchEvent(new CustomEvent("mobile-top-rail-change", { detail: { pinned: false } }));
    };
  }, [mobileTabsPinned]);

  return (
    <div className="relative min-h-screen px-4 pb-28 pt-[calc(env(safe-area-inset-top)+4.125rem)] sm:px-6 lg:px-8 lg:pb-5 lg:pt-5">
      {/* Ambient glow — same as homepage */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-flare/10 blur-[110px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        {/* Navigation bar */}
        <NavBar />

        {/* Ticker strip */}
        <div className="hero-card overflow-hidden">
          <ModuleD_Ticker />
        </div>

        {/* Main grid — same max-w-7xl as homepage */}
        <div className="hidden grid-cols-1 gap-5 lg:grid xl:grid-cols-[minmax(620px,780px)_minmax(280px,1fr)]">
          {/* Map — left */}
          <div className="hero-card relative hidden min-h-[320px] overflow-hidden sm:min-h-[420px] lg:block xl:min-h-0">
            {/* Subtle dot matrix background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(216,255,62,0.9) 0.8px, transparent 0.8px)",
                backgroundSize: "16px 16px",
              }}
            />
            {!webFullscreen && (
              <ThreeGlobe
                webFullscreen={webFullscreen}
                onWebFullscreenChange={(v) => handleFullscreenChange(v, false)}
                onSystemFullscreen={() => handleFullscreenChange(true, true)}
              />
            )}
          </div>

          {/* Rankings — right */}
          <div className="hero-card relative hidden min-h-[520px] p-5 lg:block xl:min-h-0">
            <MarketOddsCard />
          </div>

        </div>

        <section className="lg:hidden">
          <div
            ref={mobileTabsSentinelRef}
            className="lg:hidden"
            style={{ height: mobileTabsPinned ? mobileTabsHeight : 0 }}
          />
          <div
            ref={mobileTabsRef}
            className={`${
              mobileTabsPinned
                ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[65] px-4 py-2"
                : "relative -mx-4 bg-black/58 px-4 py-2 backdrop-blur-2xl"
            } lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none`}
          >
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="数据分类">
              {[
                { key: "teams" as const, title: "球队", count: 2 },
                { key: "matches" as const, title: "比赛", count: 1 },
              ].map((item) => {
                const isActive = mobileDataTab === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMobileDataTab(item.key)}
                    className={`group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-left text-xs font-bold transition duration-300 ${
                      isActive
                        ? "bg-volt text-black shadow-[0_0_24px_rgba(216,255,62,.2)]"
                        : "bg-white/[0.055] text-white/62 ring-1 ring-white/[0.08] hover:bg-white/[0.09] hover:text-white"
                    }`}
                  >
                    <span>{item.title}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
                        isActive
                          ? "bg-black/15 text-black"
                          : "bg-black/25 text-volt/80 group-hover:bg-volt/[0.12]"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 space-y-5">
            {mobileDataTab === "teams" ? (
              <>
                <div className="hero-card relative min-h-[520px] p-5">
                  <MarketOddsCard />
                </div>
                <RankingOverflowCard />
              </>
            ) : (
              <MatchLinesPanel />
            )}
          </div>
        </section>

        <div className="hidden lg:block">
          <RankingOverflowCard />
        </div>
        <div className="hero-card hidden h-[220px] overflow-hidden p-4 lg:block">
          <ModuleC_OddsTimeline />
        </div>
        <div className="hidden lg:block">
          <MatchLinesPanel />
        </div>

        <StatusBar />
        <SiteFooter />
      </div>

      <MobileMeEntry
        topRightAction={{
          ariaLabel: "打开概率地图",
          active: webFullscreen,
          icon: <MapIcon className="h-4 w-4" />,
          onClick: () => handleFullscreenChange(true, false),
        }}
      />
      <MobileNavBar />

      {/* Web fullscreen overlay — globe + rankings + overflow */}
      {createPortal(
        webFullscreen ? (
          <div ref={overlayRef} className="fixed inset-0 z-[9999] overflow-hidden bg-[#050505]">
            {/* Globe remains full-frame; panels float above it. */}
            <div className="pointer-events-none absolute inset-0">
              {/* Globe */}
              <div className="pointer-events-auto absolute inset-0 overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(216,255,62,0.9) 0.8px, transparent 0.8px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <ThreeGlobe
                  webFullscreen={webFullscreen}
                  onWebFullscreenChange={(v) => handleFullscreenChange(v, false)}
                  onSystemFullscreen={() => handleFullscreenChange(true, true)}
                  className="absolute inset-0"
                />
              </div>
              {/* Ranking card */}
              <div className="hero-card pointer-events-auto absolute right-5 top-1/2 z-20 hidden max-h-[calc(100vh-2.5rem)] w-[340px] max-w-[calc(100vw-2.5rem)] -translate-y-1/2 overflow-y-auto p-5 lg:block">
                <MarketOddsCard />
              </div>
            </div>
            {/* Bottom overflow card */}
            <div className="pointer-events-auto absolute bottom-5 left-1/2 z-20 hidden max-h-[32vh] w-[calc(100vw-2.5rem)] max-w-5xl -translate-x-1/2 overflow-y-auto lg:block">
              <RankingOverflowCard />
            </div>
          </div>
        ) : null,
        document.body,
      )}
    </div>
  );
}
