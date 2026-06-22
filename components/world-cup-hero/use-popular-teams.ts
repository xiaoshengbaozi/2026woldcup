import { useMemo } from "react";
import { getTeamDetailHrefByCode } from "@/lib/team-links";
import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagCode, getFlagUrl } from "@/lib/world-cup-2026";

const POPULAR_TEAM_CODES = [
  { code: "ESP", pct: 17 },
  { code: "FRA", pct: 17 },
  { code: "ENG", pct: 11 },
  { code: "POR", pct: 10 },
  { code: "BRA", pct: 9 },
];

export function usePopularTeams() {
  const countries = useStore((state) => state.countries);

  return useMemo(() => {
    const rankedTeams = Array.from(countries.values())
      .filter((country) => country.impliedProbability > 0)
      .sort((a, b) => b.impliedProbability - a.impliedProbability)
      .slice(0, 5)
      .map((country) => toPopularTeam(country.countryCode, country.impliedProbability));

    return rankedTeams.length ? rankedTeams : POPULAR_TEAM_CODES.map((team) => toPopularTeam(team.code, team.pct));
  }, [countries]);
}

function toPopularTeam(code: string, pct: number) {
  const iso = getFlagCode(code);
  return {
    code: iso,
    href: getTeamDetailHrefByCode(code),
    name: localizeTeamName(code, code),
    flag: getFlagUrl(code, 160),
    pct: formatProbability(pct),
  };
}

function formatProbability(value: number) {
  if (value > 0 && value < 1) return Number(value.toFixed(1));
  return Math.round(value);
}
