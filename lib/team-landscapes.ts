import { qualifiedTeams } from "@/data/teams";

const TEAM_CODE_ALIASES: Record<string, string> = {
  ALG: "DZA",
  KSA: "SAU",
};

const teamSlugByCode = new Map(qualifiedTeams.map((team) => [team.code, team.slug]));

export function getTeamLandscapePath(slug: string) {
  return `/team-landscapes/${slug}.webp`;
}

export function getTeamLandscapePathByCode(code?: string | null) {
  if (!code) return "";
  const normalizedCode = TEAM_CODE_ALIASES[code] ?? code;
  const slug = teamSlugByCode.get(normalizedCode);
  return slug ? getTeamLandscapePath(slug) : "";
}
