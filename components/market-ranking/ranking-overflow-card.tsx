"use client";

import { useMemo, useState } from "react";
import { Users, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

function probabilityLabel(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

/** Approximate height for 2 rows of pills (36px row + 8px gap) */
const COLLAPSED_PX = 80;
const COLLAPSED_RENDER_COUNT = 24;

export function RankingOverflowCard() {
  const countries = useStore((s) => s.countries);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);
  const hoverCountry = useStore((s) => s.hoverCountry);
  const [expanded, setExpanded] = useState(false);

  const overflowCountries = useMemo(() => {
    const sorted = Array.from(countries.values()).sort(
      (a, b) => b.impliedProbability - a.impliedProbability
    );
    return sorted.slice(10);
  }, [countries]);
  const renderedCountries = expanded
    ? overflowCountries
    : overflowCountries.slice(0, COLLAPSED_RENDER_COUNT);

  if (overflowCountries.length === 0) return null;

  return (
    <section className="hero-card overflow-hidden px-5 py-4">
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            其余队伍
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.12em] text-volt"
            style={{ fontFamily: "ScreenMatrix" }}
          >
            {overflowCountries.length} 队
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-white/30 transition hover:text-volt/60"
          >
            <span>{expanded ? "收起" : "展开"}</span>
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2 overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "2000px" : `${COLLAPSED_PX}px` }}
      >
        {renderedCountries.map((country) => {
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
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] text-white/30 transition hover:text-volt/60"
      >
        <span>{expanded ? "收起" : "展开更多"}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </section>
  );
}
