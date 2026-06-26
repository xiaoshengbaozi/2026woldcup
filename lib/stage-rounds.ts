import { getStageGroupId, getStageKind } from "@/lib/stage";
import type { Match } from "@/types/match";

export function buildMatchRoundLabels(matches: Match[]) {
  const labels = new Map<string, string>();
  const grouped = new Map<string, Match[]>();

  for (const match of matches) {
    const kind = getStageKind(match.stage, match.stageKind);
    if (kind !== "group") continue;

    const groupId = getStageGroupId(match.stage);
    if (!groupId) continue;
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId)?.push(match);
  }

  for (const [groupId, groupMatches] of grouped.entries()) {
    [...groupMatches]
      .sort((left, right) => left.start.getTime() - right.start.getTime())
      .forEach((match, index) => {
        labels.set(match.uid, `${groupId}组 · ${formatRoundTitle(Math.floor(index / 2) + 1)}`);
      });
  }

  return labels;
}

export function formatRoundTitle(round: number) {
  const names = ["第一轮", "第二轮", "第三轮"];
  return names[round - 1] ?? `第${round}轮`;
}
