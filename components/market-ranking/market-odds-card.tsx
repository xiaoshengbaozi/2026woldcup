"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

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
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);
  const hoverCountry = useStore((s) => s.hoverCountry);

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
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            概率排名
          </p>
          <span className="rounded-full bg-volt/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-volt ring-1 ring-volt/20">
            TOP 10
          </span>
        </div>
      </div>

      <div className="relative z-10">
        <div>
          {topCountries.map((country, index) => {
            const rank = sortedCountries.findIndex((item) => item.countryCode === country.countryCode) + 1;
            const isSelected = selectedCountry === country.countryCode;
            const width = Math.max(2, (country.impliedProbability / maxProbability) * 100);
            const isUp = country.delta1h > 0.05;
            const isDown = country.delta1h < -0.05;

            return (
              <button
                key={country.countryCode}
                type="button"
                data-testid={`market-odds-row-${country.countryCode}`}
                onClick={() => selectCountry(country.countryCode, "map")}
                onMouseEnter={() => hoverCountry(country.countryCode, "ranking")}
                onMouseLeave={() => hoverCountry(null, "ranking")}
                onFocus={() => hoverCountry(country.countryCode, "ranking")}
                onBlur={() => hoverCountry(null, "ranking")}
                className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition duration-150 hover:bg-white/[0.04]"
                style={{
                  background: isSelected ? "rgba(216,255,62,0.06)" : undefined,
                }}
              >
                <span
                  className="w-5 shrink-0 text-center text-xs font-black tabular"
                  style={{ color: getRankColor(rank) }}
                >
                  {rank}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFlagUrl(country.countryCode)}
                  alt={localizeTeamName(country.countryName, country.countryCode)}
                  className="h-4 w-6 shrink-0 rounded object-cover ring-1 ring-white/10"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-white/90">
                    {localizeTeamName(country.countryName, country.countryCode)}
                  </div>
                  <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 0.35, delay: Math.min(index, 12) * 0.018 }}
                      className="h-full rounded-full bg-volt shadow-[0_0_10px_rgba(216,255,62,0.35)]"
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
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
