"use client";

import { useStore } from "@/lib/store";

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
    <div className="flex h-full shrink-0 items-center gap-3 border-l border-white/[0.06] px-4">
      <span className="whitespace-nowrap text-[10px] uppercase tracking-wider text-white/32">
        VOL 24h: {formatBigNumber(totalVolume)}
      </span>
    </div>
  );
}
