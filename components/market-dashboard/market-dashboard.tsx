"use client";

import { useLiveMarketData } from "@/lib/use-live-market-data";
import { ModuleD_Ticker } from "@/components/market-ticker/module-d-ticker";
import { MarketOddsCard } from "@/components/market-ranking/market-odds-card";
import { MatchLinesPanel } from "@/components/market-matches/match-lines-panel";
import { ModuleC_OddsTimeline } from "@/components/market-timeline/module-c-timeline";
import { ThreeGlobe } from "@/components/market-map/three-globe";
import { StatusBar } from "./status-bar";
import { NavBar } from "@/components/nav-bar";
import { MobileNavBar } from "@/components/mobile-nav-bar";

export function MarketDashboard() {
  useLiveMarketData();

  return (
    <div className="relative min-h-screen px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-5">
      {/* Ambient glow — same as homepage */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-volt/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-flare/10 blur-[110px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        {/* Navigation bar */}
        <NavBar />

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-white">
              预测市场终端
            </h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-[0.12em]">
              Real-time Polymarket Prediction Data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-volt shadow-[0_0_14px_rgba(216,255,62,0.9)]" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-volt">
              LIVE
            </span>
          </div>
        </div>

        {/* Ticker strip */}
        <div className="hero-card overflow-hidden">
          <ModuleD_Ticker />
        </div>

        {/* Main grid — same max-w-7xl as homepage */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(620px,780px)_minmax(280px,1fr)] xl:grid-rows-[minmax(600px,1.08fr)_minmax(260px,0.82fr)] xl:[height:calc(100vh-230px)] xl:min-h-[900px]">
          {/* Map — left */}
          <div className="hero-card relative min-h-[540px] overflow-hidden xl:min-h-0">
            {/* Subtle dot matrix background */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(216,255,62,0.9) 0.8px, transparent 0.8px)",
                backgroundSize: "16px 16px",
              }}
            />
            <ThreeGlobe />
          </div>

          {/* Rankings — right */}
          <div className="hero-card relative min-h-[520px] overflow-hidden p-5 xl:min-h-0">
            <MarketOddsCard />
          </div>

          {/* Timeline — bottom full width */}
          <div className="hero-card min-h-[320px] overflow-hidden p-5 xl:col-span-2 xl:min-h-0">
            <ModuleC_OddsTimeline />
          </div>
        </div>

        <MatchLinesPanel />

        <StatusBar />
      </div>

      <MobileNavBar />
    </div>
  );
}
