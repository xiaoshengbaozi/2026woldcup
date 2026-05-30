"use client";

import { useStore } from "@/lib/store";
import type { TimePreset } from "@/lib/store/history";
import { TrendingUp } from "lucide-react";
import { TimelineLegend } from "./timeline-legend";

const PRESETS: TimePreset[] = ["1H", "24H", "7D", "30D"];

export function TimelineHeader() {
  const activeTimePreset = useStore((s) => s.activeTimePreset);
  const setTimePreset = useStore((s) => s.setTimePreset);

  return (
    <div className="mb-2 flex flex-col gap-2 border-b border-white/[0.04] pb-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <TrendingUp className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            赔率时间线
          </p>
        </div>
        <TimelineLegend />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setTimePreset(preset)}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all"
            style={{
              background: activeTimePreset === preset ? "rgba(216,255,62,0.12)" : "rgba(255,255,255,0.03)",
              color: activeTimePreset === preset ? "#d8ff3e" : "rgba(255,255,255,0.4)",
              border: activeTimePreset === preset ? "1px solid rgba(216,255,62,0.25)" : "1px solid transparent",
            }}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
