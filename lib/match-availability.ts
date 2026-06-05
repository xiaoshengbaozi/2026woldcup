import { parseTeams } from "@/lib/teams";
import type { Team } from "@/types/match";

const pendingTeamPattern = /(?:TBD|待定|球队待定|晋级球队待定|胜者|负者|附加赛|To be decided|Winner|Loser|Play-?off)/i;
const conditionalSlotPattern =
  /^(?:(?:[A-L]\s*组\s*(?:第?\s*)?(?:一|二|三|四|1|2|3|4))|(?:Group\s+[A-L]\s+(?:winner|runner-up|third|fourth))|(?:[A-L][1-4])|(?:[1-4][A-L]))$/i;
const multiGroupConditionalSlotPattern = /^\([A-L](?:\s*,\s*[A-L])+\)第[1-4]$/i;

export function areMatchTeamsConfirmed(summary: string) {
  const teams = parseTeams(summary);
  return isTeamConfirmed(teams.home) && isTeamConfirmed(teams.away);
}

function isTeamConfirmed(team: Team) {
  const name = team.name.trim();
  return (
    Boolean(name) &&
    team.badge !== "TBD" &&
    !pendingTeamPattern.test(name) &&
    !conditionalSlotPattern.test(name) &&
    !multiGroupConditionalSlotPattern.test(name)
  );
}
