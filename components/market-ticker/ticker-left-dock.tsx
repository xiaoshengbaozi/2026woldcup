"use client";

import { useStore } from "@/lib/store";

export function TickerLeftDock() {
  const status = useStore((s) => s.status);
  const lastUpdate = useStore((s) => s.lastUpdateTimestamp);

  const isConnected = status === "connected";
  const timeStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--:--";

  return (
    <div className="flex items-center gap-2.5 px-4 h-full border-r border-white/[0.06] shrink-0">
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${
          isConnected
            ? "bg-volt shadow-[0_0_10px_rgba(216,255,62,0.7)]"
            : "bg-white/30"
        }`} />
      </span>
      <span className="text-[10px] font-bold tracking-widest text-volt uppercase">
        LIVE
      </span>
      <span className="text-[10px] text-white/32">
        {timeStr}
      </span>
    </div>
  );
}
