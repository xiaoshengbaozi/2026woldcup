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
      <div className="flex items-center justify-center h-screen" style={{ background: "#050505" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-volt/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 font-mono text-xs uppercase tracking-[0.16em]">
            加载预测市场数据...
          </p>
          <p className="text-white/20 font-mono text-[10px] mt-2 tracking-wider">
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
