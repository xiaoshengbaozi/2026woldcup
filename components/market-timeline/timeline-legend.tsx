"use client";

import { useStore } from "@/lib/store";
import { Globe } from "lucide-react";

const LINE_COLORS = [
  "#d8ff3e", "#FF6B35", "#00E676", "#FFD700", "#FF1744",
  "#7B9E4A", "#C0C0C0", "#CD7F32", "#4A7FB5", "#2563C7",
];

export function TimelineLegend() {
  const history = useStore((s) => s.history);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);

  const entries: Array<{ code: string; prob: number }> = [];
  for (const [code, data] of history) {
    if (data.length > 0) {
      entries.push({ code, prob: data[data.length - 1].probability });
    }
  }
  entries.sort((a, b) => b.prob - a.prob);

  const display = selectedCountry
    ? entries.filter((e) => e.code === selectedCountry).slice(0, 1)
    : entries.slice(0, 10);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-white/[0.04] overflow-x-auto">
      <Globe className="h-3 w-3 text-white/28 shrink-0" />
      {display.map((entry, i) => {
        const colorIdx = entries.findIndex((e) => e.code === entry.code);
        return (
          <button
            key={entry.code}
            onClick={() => selectCountry(entry.code, "timeline")}
            className="flex items-center gap-1.5 shrink-0 text-[10px] uppercase tracking-wider transition hover:opacity-80"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: LINE_COLORS[colorIdx % LINE_COLORS.length],
                boxShadow: `0 0 6px ${LINE_COLORS[colorIdx % LINE_COLORS.length]}60`,
              }}
            />
            <span className="text-white/52">{entry.code}</span>
          </button>
        );
      })}
    </div>
  );
}
