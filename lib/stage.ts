export function getStageGroupId(stage: string): string | null {
  const match =
    stage.match(/(?:^|\b)Group\s+([A-L])\b/i) ??
    stage.match(/小组赛\s*([A-L])\s*组/i) ??
    stage.match(/([A-L])\s*组/i);

  return match?.[1]?.toUpperCase() ?? null;
}

export function formatStageLabel(stage: string): string {
  const groupId = getStageGroupId(stage);
  if (groupId) return `小组赛 ${groupId}组`;
  return stage;
}

/**
 * Extract round number from stage/summary and format as "小组赛第X轮"
 * Handles formats like: "Group A Round 3", "A组 第3轮", "Matchday 3", "第3轮"
 */
export function formatRoundLabel(stage: string, summary?: string): string {
  const source = summary || stage;

  const roundMatch =
    source.match(/Round\s+(\d+)/i) ??
    source.match(/第(\d+)\s*轮/) ??
    source.match(/Matchday\s+(\d+)/i);

  if (roundMatch) return `小组赛第${roundMatch[1]}轮`;

  const groupId = getStageGroupId(stage);
  if (groupId) return `小组赛 ${groupId}组`;
  return stage;
}

export function rankStage(stage: string): number {
  const groupId = getStageGroupId(stage);
  if (groupId) return groupId.charCodeAt(0) - 64;
  if (stage.includes("1/16")) return 13;
  if (stage.includes("1/8")) return 14;
  if (stage.includes("1/4")) return 15;
  if (stage.includes("半决赛")) return 16;
  if (stage.includes("三四名") || stage.includes("季军")) return 17;
  if (stage.includes("决赛")) return 18;
  return 99;
}
