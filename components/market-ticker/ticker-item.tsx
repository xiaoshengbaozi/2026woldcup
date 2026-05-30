"use client";

import { useCallback } from "react";
import { useStore } from "@/lib/store";
import type { CountryData } from "@/types/country";
import { formatDelta, formatVolume } from "@/lib/format";
import { localizeTeamName } from "@/lib/team-localization";

interface TickerItemProps {
  country: CountryData;
}

export function TickerItem({ country }: TickerItemProps) {
  const selectCountry = useStore((s) => s.selectCountry);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const isSelected = selectedCountry === country.countryCode;

  const handleClick = useCallback(() => {
    selectCountry(country.countryCode, "ticker");
  }, [country.countryCode, selectCountry]);

  const delta = country.delta1h;
  const isUp = delta > 0.05;
  const isDown = delta < -0.05;

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 h-full shrink-0 border-r border-white/[0.04] cursor-pointer transition-colors duration-150 hover:bg-white/[0.04]"
      style={{
        width: 180,
        background: isSelected ? "rgba(216,255,62,0.06)" : undefined,
      }}
    >
      <span className="text-[11px] font-bold text-white/70 tracking-wide truncate max-w-[70px]">
        {localizeTeamName(country.countryName, country.countryCode)}
      </span>

      <span className="text-[13px] font-bold text-white ml-auto">
        {country.impliedProbability.toFixed(1)}%
      </span>

      <span
        className="text-[10px] font-semibold"
        style={{
          color: isUp ? "#d8ff3e" : isDown ? "#FF1744" : "rgba(255,255,255,0.32)",
        }}
      >
        {formatDelta(delta)}
      </span>

      <div className="w-[3px] h-4 rounded-full overflow-hidden bg-white/[0.06]">
        <div
          className="w-full rounded-full transition-all duration-300"
          style={{
            height: `${Math.min(100, Math.abs(delta) * 20)}%`,
            background: isUp ? "#d8ff3e" : isDown ? "#FF1744" : "rgba(255,255,255,0.32)",
            marginTop: isDown ? "auto" : undefined,
            marginBottom: isUp ? "auto" : undefined,
          }}
        />
      </div>

      <span className="text-[9px] text-white/28 whitespace-nowrap">
        {formatVolume(country.volume5m)}
      </span>
    </button>
  );
}
