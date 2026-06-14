import { getTeamDetailHrefByCode } from "@/lib/team-links";
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
  return POPULAR_TEAM_CODES.map((team) => {
    const iso = getFlagCode(team.code);
    return {
      code: iso,
      href: getTeamDetailHrefByCode(team.code),
      name: localizeTeamName(team.code, team.code),
      flag: getFlagUrl(team.code, 160),
      pct: team.pct,
    };
  });
}
