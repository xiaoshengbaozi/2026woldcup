"use client";

import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";

const LINE_COLORS = [
  "#d8ff3e", "#FF6B35", "#00E676", "#FFD700", "#FF1744",
  "#7B9E4A", "#C0C0C0", "#CD7F32", "#4A7FB5", "#2563C7",
];

const FALLBACK_ENTRIES = [
  "ESP", "FRA", "ENG", "POR", "BRA", "ARG", "GER", "NED", "NOR", "JPN",
].map((code, index) => ({ code, prob: 10 - index }));

const TIMELINE_LABELS: Record<string, string> = {
  ARG: "阿根廷",
  BRA: "巴西",
  ENG: "英格兰",
  ESP: "西班牙",
  FRA: "法国",
  GER: "德国",
  JPN: "日本",
  NED: "荷兰",
  NOR: "挪威",
  POR: "葡萄牙",
};

export function TimelineLegend() {
  const history = useStore((s) => s.history);
  const countryMap = useStore((s) => s.countries);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);
  const deselectCountry = useStore((s) => s.deselectCountry);
  const countries = useStore((s) => s.getCountry);

  const entries: Array<{ code: string; prob: number }> = [];
  for (const [code, data] of history) {
    if (data.length > 0) {
      entries.push({ code, prob: data[data.length - 1].probability });
    }
  }
  entries.sort((a, b) => b.prob - a.prob);

  const display = (entries.length > 0
    ? entries
    : Array.from(countryMap.values()).length > 0
      ? Array.from(countryMap.values())
      .map((country) => ({
        code: country.countryCode,
        prob: country.impliedProbability,
      }))
      .sort((a, b) => b.prob - a.prob)
      : FALLBACK_ENTRIES
  ).slice(0, 10);

  return (
    <div className="timeline-legend-list scrollbar-hidden flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
      {display.map((entry) => {
        const colorIdx = entries.findIndex((e) => e.code === entry.code);
        const country = countries(entry.code);
        const isSelected = selectedCountry === entry.code;
        const label = country
          ? localizeTeamName(country.countryName, country.countryCode)
          : TIMELINE_LABELS[entry.code] ?? entry.code;

        return (
          <button
            key={entry.code}
            type="button"
            onClick={() => {
              if (isSelected) {
                deselectCountry();
              } else {
                selectCountry(entry.code, "timeline");
              }
            }}
            className="timeline-legend-chip flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition hover:bg-white/[0.08]"
            style={{
              background: isSelected ? "rgba(216,255,62,0.12)" : "rgba(255,255,255,0.035)",
              color: isSelected ? "#d8ff3e" : "rgba(255,255,255,0.62)",
              boxShadow: isSelected ? "0 0 18px rgba(216,255,62,0.14), inset 0 1px 0 rgba(255,255,255,0.08)" : undefined,
            }}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: LINE_COLORS[colorIdx % LINE_COLORS.length],
                boxShadow: `0 0 6px ${LINE_COLORS[colorIdx % LINE_COLORS.length]}60`,
              }}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
