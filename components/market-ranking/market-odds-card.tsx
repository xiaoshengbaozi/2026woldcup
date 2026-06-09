"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { getTeamDetailHrefByCode } from "@/lib/team-links";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { CountryData } from "@/types/country";

function probabilityLabel(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

function getRankColor(rank: number) {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "rgba(255,255,255,0.34)";
}

function formatDeltaAbs(value: number): string {
  const abs = Math.abs(value);
  if (abs > 0 && abs < 0.1) return "<0.1";
  return abs.toFixed(1);
}

export function MarketOddsCard() {
  const countries = useStore((s) => s.countries);

  const sortedCountries = useMemo(
    () => Array.from(countries.values()).sort((a, b) => b.impliedProbability - a.impliedProbability),
    [countries]
  );

  const maxProbability = Math.max(1, sortedCountries[0]?.impliedProbability ?? 1);
  const topCountries = sortedCountries.slice(0, 10);

  return (
    <section
      data-testid="market-odds-card"
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            概率排名
          </p>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-[0.12em] text-volt"
          style={{ fontFamily: "ScreenMatrix" }}
        >
          TOP 10
        </span>
      </div>

      <div className="relative z-10">
        {topCountries.map((country, index) => (
          <MarketOddsRow
            key={country.countryCode}
            country={country}
            index={index}
            maxProbability={maxProbability}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

const MarketOddsRow = memo(function MarketOddsRow({
  country,
  index,
  maxProbability,
  rank,
}: {
  country: CountryData;
  index: number;
  maxProbability: number;
  rank: number;
}) {
  const selectCountry = useStore((s) => s.selectCountry);
  const hoverCountry = useStore((s) => s.hoverCountry);
  const isSelected = useStore((s) => s.selectedCountry === country.countryCode);
  const width = Math.max(2, (country.impliedProbability / maxProbability) * 100);
  const isUp = country.delta1h > 0.05;
  const isDown = country.delta1h < -0.05;
  const teamHref = getTeamDetailHrefByCode(country.countryCode);
  const teamName = localizeTeamName(country.countryName, country.countryCode);

  const content = (
    <>
      <span
        className="market-odds-rank w-5 shrink-0 text-center text-xs font-black tabular"
        style={{ color: getRankColor(rank) }}
      >
        {rank}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getFlagUrl(country.countryCode)}
        alt={teamName}
        className="h-4 w-6 shrink-0 rounded object-cover ring-1 ring-white/10"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="market-odds-team truncate text-[13px] font-bold text-white/90">
          {teamName}
        </div>
        <div className="market-odds-track mt-1 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.018 }}
            className="market-odds-fill h-full rounded-full bg-volt shadow-[0_0_10px_rgba(216,255,62,0.35)]"
          />
        </div>
      </div>
      <div className="flex shrink-0 items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular text-white" style={{ fontFamily: "ScreenMatrix" }}>
          {probabilityLabel(country.impliedProbability)}
        </span>
        {(isUp || isDown) && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-bold tabular"
            style={{
              color: isUp ? "#d8ff3e" : "#FF1744",
            }}
          >
            {isUp ? "▲" : "▼"}
            {formatDeltaAbs(country.delta1h)}
          </span>
        )}
      </div>
    </>
  );

  const interactionProps = {
    "data-testid": `market-odds-row-${country.countryCode}`,
    onClick: () => selectCountry(country.countryCode, "map"),
    onMouseEnter: () => hoverCountry(country.countryCode, "ranking"),
    onMouseLeave: () => hoverCountry(null, "ranking"),
    onFocus: () => hoverCountry(country.countryCode, "ranking"),
    onBlur: () => hoverCountry(null, "ranking"),
    className: "market-odds-row group flex w-full items-center gap-3 px-3 py-2.5 text-left transition duration-150 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-volt/50",
    style: {
      background: isSelected ? "rgba(216,255,62,0.06)" : undefined,
    },
  };

  if (teamHref) {
    return (
      <Link href={teamHref} aria-label={`查看${teamName}球队页`} {...interactionProps}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" {...interactionProps}>
      {content}
    </button>
  );
});
