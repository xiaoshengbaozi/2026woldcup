"use client";

import { useStore } from "@/lib/store";
import { formatRelativeTime, formatVolume } from "@/lib/format";
import { Radio } from "lucide-react";

export function StatusBar() {
  const status = useStore((s) => s.status);
  const lastUpdate = useStore((s) => s.lastUpdateTimestamp);
  const updateCount = useStore((s) => s.updateCount);
  const latency = useStore((s) => s.latency);
  const countries = useStore((s) => s.countries);
  const allCountries = Array.from(countries.values());
  const totalVolume = allCountries.reduce((sum, c) => sum + c.volume24h, 0);

  const isConnected = status === "connected";
  const isStale = status === "stale";

  return (
    <div
      className="relative z-10 flex flex-col gap-3 rounded-3xl px-5 py-3 text-[10px] uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), rgba(5,8,8,0.88)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(216,255,62,0.06)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isConnected && (
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${
              isConnected ? "bg-volt shadow-[0_0_10px_rgba(216,255,62,0.7)]" :
              isStale ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" :
              "bg-white/40"
            }`} />
          </span>
          <span className="text-white/52">
            {isConnected ? "已连接" : isStale ? "数据延迟" : status === "disconnected" ? "已断开" : "初始化中"}
          </span>
        </div>
        {latency > 0 && <span className="text-white/32">{latency.toFixed(0)}ms</span>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-white/32">总成交 {formatVolume(totalVolume)}</span>
        <span className="text-white/32">#{updateCount}</span>
        {lastUpdate && <span className="text-white/32">{formatRelativeTime(lastUpdate)}</span>}
        <Radio className="h-3 w-3 text-volt/60" />
      </div>
    </div>
  );
}
