"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import type { RankingEntry } from "@/lib/store/rankings";
import { formatDelta } from "@/lib/format";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

// 3-letter → 2-letter country code mapping for flagcdn.com
interface RankingRowProps {
  entry: RankingEntry;
  isSqueezed: boolean;
}

export function RankingRow({ entry, isSqueezed }: RankingRowProps) {
  const selectCountry = useStore((s) => s.selectCountry);
  const hoverCountry = useStore((s) => s.hoverCountry);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const vibrationTriggers = useStore((s) => s.vibrationTriggers);
  const countries = useStore((s) => s.getCountry);

  const country = countries(entry.countryCode);
  const isSelected = selectedCountry === entry.countryCode;
  const isVibrating = vibrationTriggers.includes(entry.countryCode);
  const isTop3 = entry.rank <= 3;

  const handleClick = useCallback(() => {
    selectCountry(entry.countryCode, "ranking");
  }, [entry.countryCode, selectCountry]);

  const handlePointerEnter = useCallback(() => {
    hoverCountry(entry.countryCode, "ranking");
  }, [entry.countryCode, hoverCountry]);

  const handlePointerLeave = useCallback(() => {
    hoverCountry(null, "ranking");
  }, [hoverCountry]);

  const rankColor = useMemo(() => {
    if (entry.rank === 1) return "#FFD700";
    if (entry.rank === 2) return "#C0C0C0";
    if (entry.rank === 3) return "#CD7F32";
    return "rgba(255,255,255,0.32)";
  }, [entry.rank]);

  const delta1h = entry.delta1h;
  const isUp = delta1h > 0.05;
  const isDown = delta1h < -0.05;

  return (
    <motion.div
      layout={false}
      initial={false}
      animate={{
        x: isVibrating ? [0, -2, 2, -1, 1, 0] : 0,
      }}
      transition={{
        x: isVibrating ? { duration: 0.4, ease: "easeOut" } : { duration: 0 },
      }}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="flex items-center px-4 cursor-pointer border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.05]"
      style={{
        height: isTop3 ? 68 : isSqueezed ? 48 : 56,
        background: isSelected
          ? "rgba(216,255,62,0.06)"
          : isTop3
            ? "rgba(255,255,255,0.025)"
            : undefined,
      }}
    >
      {/* Rank Number */}
      <span
        className="font-bold w-8 text-center shrink-0"
        style={{
          fontSize: isTop3 ? 20 : 15,
          color: rankColor,
          textShadow: isTop3 ? `0 0 12px ${rankColor}40` : undefined,
        }}
      >
        {entry.rank}
      </span>

      {/* Flag Image + Chinese Name */}
      <div className="flex items-center gap-2.5 ml-2 min-w-0 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getFlagUrl(entry.countryCode)}
          alt={entry.countryCode}
          className="h-5 w-7 shrink-0 rounded object-cover ring-1 ring-white/10"
          loading="lazy"
        />
        <span
          className="font-semibold text-white/85 truncate"
          style={{ fontSize: isTop3 ? 16 : 14 }}
        >
          {country ? localizeTeamName(country.countryName, country.countryCode) : entry.countryCode}
        </span>
      </div>

      {/* Probability */}
      <span
        className="font-bold text-white ml-auto mr-4 shrink-0"
        style={{ fontSize: isTop3 ? 22 : 18 }}
      >
        {entry.probability.toFixed(1)}%
      </span>

      {/* Delta */}
      <span
        className="text-sm font-semibold w-16 text-right shrink-0"
        style={{
          color: isUp ? "#d8ff3e" : isDown ? "#FF1744" : "rgba(255,255,255,0.32)",
        }}
      >
        {formatDelta(delta1h)}
      </span>
    </motion.div>
  );
}
