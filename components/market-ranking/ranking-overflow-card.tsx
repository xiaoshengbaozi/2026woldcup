"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

function probabilityLabel(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

export function RankingOverflowCard() {
  const countries = useStore((s) => s.countries);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);
  const hoverCountry = useStore((s) => s.hoverCountry);

  const overflowCountries = useMemo(() => {
    const sorted = Array.from(countries.values()).sort(
      (a, b) => b.impliedProbability - a.impliedProbability
    );
    return sorted.slice(10);
  }, [countries]);

  if (overflowCountries.length === 0) return null;

  return (
    <section className="hero-card overflow-hidden px-5 py-4">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
        其余 {overflowCountries.length} 队
      </div>
      <div className="flex flex-wrap gap-2">
        {overflowCountries.map((country) => {
          const isSelected = selectedCountry === country.countryCode;

          return (
            <button
              key={country.countryCode}
              type="button"
              onClick={() => selectCountry(country.countryCode, "map")}
              onMouseEnter={() => hoverCountry(country.countryCode, "ranking")}
              onMouseLeave={() => hoverCountry(null, "ranking")}
              className="group flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 transition hover:border-volt/20 hover:bg-white/[0.06]"
              style={{
                background: isSelected ? "rgba(216,255,62,0.06)" : undefined,
                borderColor: isSelected ? "rgba(216,255,62,0.2)" : undefined,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getFlagUrl(country.countryCode, 40)}
                alt={localizeTeamName(country.countryName, country.countryCode)}
                className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                loading="lazy"
              />
              <span className="text-[11px] font-semibold text-white/70">
                {localizeTeamName(country.countryName, country.countryCode)}
              </span>
              <span className="text-[11px] font-bold tabular-nums text-white/45">
                {probabilityLabel(country.impliedProbability)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
