"use client";

import dynamic from "next/dynamic";

const MarketDashboard = dynamic(
  () =>
    import("@/components/market-dashboard/market-dashboard").then(
      (mod) => mod.MarketDashboard
    ),
  {
    ssr: false,
    loading: () => (
      <div className="data-page-loading flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="data-page-loading-spinner mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-volt/60 border-t-transparent" />
          <p className="data-page-loading-title font-mono text-xs uppercase tracking-[0.16em] text-white/40">
            加载预测市场数据...
          </p>
          <p className="data-page-loading-subtitle mt-2 font-mono text-[10px] tracking-wider text-white/20">
            Initializing Polymarket Terminal
          </p>
        </div>
      </div>
    ),
  }
);

export default function DataPage() {
  return <MarketDashboard />;
}
