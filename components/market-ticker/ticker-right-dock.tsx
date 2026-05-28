"use client";

import { useStore } from "@/lib/store";

const FILTER_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "favorites", label: "关注" },
  { value: "movers", label: "热门" },
] as const;

export function TickerRightDock() {
  const countries = useStore((s) => s.countries);
  const allCountries = Array.from(countries.values());
  const totalVolume = allCountries.reduce((sum, c) => sum + c.volume24h, 0);

  const formatBigNumber = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 h-full border-l border-white/[0.06] shrink-0">
      <span className="text-[10px] text-white/32 whitespace-nowrap uppercase tracking-wider">
        VOL 24h: {formatBigNumber(totalVolume)}
      </span>

      <select
        className="bg-white/[0.04] text-white/52 text-[10px] border border-white/[0.08] rounded-full px-2.5 py-0.5 outline-none cursor-pointer transition hover:bg-white/[0.08] hover:text-white/72"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
