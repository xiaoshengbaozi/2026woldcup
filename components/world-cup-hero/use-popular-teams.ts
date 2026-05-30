import { useEffect, useMemo } from "react";
import { injectMockData } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { getFlagCode, getFlagUrl } from "@/lib/world-cup-2026";

export function usePopularTeams() {
  const countries = useStore((s) => s.countries);
  const countryCount = countries.size;

  useEffect(() => {
    if (countryCount === 0) injectMockData();
  }, [countryCount]);

  return useMemo(() => {
    if (countryCount === 0) return [];
    return Array.from(countries.values())
      .sort((a, b) => b.impliedProbability - a.impliedProbability)
      .slice(0, 5)
      .map((c) => {
        const iso = getFlagCode(c.countryCode);
        return {
          code: iso,
          name: c.countryName,
          flag: getFlagUrl(c.countryCode, 160),
          pct: Math.round(c.impliedProbability),
        };
      });
  }, [countries, countryCount]);
}
