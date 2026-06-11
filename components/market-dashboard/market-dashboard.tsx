"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Map as MapIcon } from "lucide-react";
import { useLiveMarketData } from "@/lib/use-live-market-data";
import { useStore } from "@/lib/store";
import { ModuleD_Ticker } from "@/components/market-ticker/module-d-ticker";
import { MarketOddsCard } from "@/components/market-ranking/market-odds-card";
import { RankingOverflowCard } from "@/components/market-ranking/ranking-overflow-card";
import { MatchLinesPanel } from "@/components/market-matches/match-lines-panel";
import { ThreeGlobe } from "@/components/market-map/three-globe";
import { StatusBar } from "./status-bar";
import { NavBar } from "@/components/nav-bar";
import { useMobileTopBar } from "@/components/mobile-top-bar-provider";
import { SiteFooter } from "@/components/site-footer";

const MOBILE_TOP_MODULE_OFFSET = 66;

export function MarketDashboard() {
  useLiveMarketData();
  const dataSource = useStore((s) => s.dataSource);
  const countryCount = useStore((s) => s.countries.size);
  const [webFullscreen, setWebFullscreen] = useState(false);
  const [systemFsPending, setSystemFsPending] = useState(false);
  const [mobileDataTab, setMobileDataTab] = useState<"teams" | "matches">("teams");
  const mobileTabsSentinelRef = useRef<HTMLDivElement>(null);
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  const [mobileTabsPinned, setMobileTabsPinned] = useState(false);
  const [mobileTabsHeight, setMobileTabsHeight] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { setTopRightAction } = useMobileTopBar();

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

  const shouldShowMarketDashboard = dataSource !== "mock";
  const hasMarketCountries = dataSource === "live" && countryCount > 0;

  useEffect(() => {
    if (!hasMarketCountries) {
      setTopRightAction(null);
      return;
    }

    setTopRightAction({
      ariaLabel: "打开概率地图",
      active: webFullscreen,
      icon: <MapIcon className="h-4 w-4" />,
      onClick: () => handleFullscreenChange(true, false),
    });

    return () => {
      setTopRightAction(null);
    };
  }, [handleFullscreenChange, hasMarketCountries, setTopRightAction, webFullscreen]);

  return (
    <div className="relative flex min-h-screen flex-col px-4 pb-28 pt-[calc(env(safe-area-inset-top)+4.125rem)] sm:px-6 lg:px-8 lg:pb-5 lg:pt-5">
      {/* Ambient glow — same as homepage */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-flare/10 blur-[110px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5">
        {/* Navigation bar */}
        <NavBar />

        {!shouldShowMarketDashboard ? (
          <MarketDataLoadingPanel />
        ) : (
          <>
        {/* Ticker strip */}
        <div className="hero-card hidden overflow-hidden sm:block">
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
                ? "fixed left-0 right-0 top-[calc(env(safe-area-inset-top)+4.125rem)] z-[75] px-4 py-2"
                : "relative -mx-4 bg-black/58 px-4 py-2 backdrop-blur-2xl"
            } lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none`}
          >
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="数据分类">
              {[
                { key: "teams" as const, title: "球队" },
                { key: "matches" as const, title: "比赛" },
              ].map((item) => {
                const isActive = mobileDataTab === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMobileDataTab(item.key)}
                    className={`relative overflow-hidden rounded-full px-4 py-2 text-sm font-bold transition-colors duration-300 ${
                      isActive
                        ? "text-black"
                        : "bg-white/[0.045] text-white/58 ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="market-mobile-tab-pill"
                        className="absolute inset-0 rounded-full bg-volt shadow-[0_0_26px_rgba(216,255,62,.2)]"
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.75 }}
                      />
                    )}
                    <span className="relative z-10">{item.title}</span>
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
        <div className="hidden lg:block">
          <MatchLinesPanel />
        </div>

        <StatusBar />
          </>
        )}
        <SiteFooter />
      </div>

      {/* Web fullscreen overlay — globe + rankings + overflow */}
      {createPortal(
        hasMarketCountries && webFullscreen ? (
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

function MarketDataLoadingPanel() {
  return (
    <section className="hero-card relative flex min-h-[60vh] items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(216,255,62,0.9) 0.8px, transparent 0.8px)",
          backgroundSize: "16px 16px",
        }}
      />
      <div className="relative z-10">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-volt/60 border-t-transparent" />
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/74">
          正在连接实时市场数据
        </p>
        <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/34">
          Waiting for live Polymarket snapshot
        </p>
      </div>
    </section>
  );
}
