"use client";

import { useStore } from "@/lib/store";
import type { TimePreset } from "@/lib/store/history";
import { TrendingUp } from "lucide-react";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

const PRESETS: TimePreset[] = ["1H", "24H", "7D", "30D"];

export function TimelineHeader() {
  const activeTimePreset = useStore((s) => s.activeTimePreset);
  const setTimePreset = useStore((s) => s.setTimePreset);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const countries = useStore((s) => s.getCountry);
  const deselectCountry = useStore((s) => s.deselectCountry);

  const country = selectedCountry ? countries(selectedCountry) : null;

  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 mb-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-volt" />
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
          赔率时间线
        </p>
        {country && (
          <button
            onClick={deselectCountry}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider transition-all"
            style={{
              background: "rgba(216,255,62,0.1)",
              color: "#d8ff3e",
              border: "1px solid rgba(216,255,62,0.2)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(country.countryCode, 40)}
              alt={country.countryCode}
              className="h-3 w-4 shrink-0 rounded object-cover"
              loading="lazy"
            />
            {localizeTeamName(country.countryName, country.countryCode)}
            <span className="ml-1 opacity-50">x</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setTimePreset(preset)}
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.08em] transition-all"
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
