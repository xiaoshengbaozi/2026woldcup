export function getStageGroupId(stage: string): string | null {
  const match =
    stage.match(/(?:^|\b)Group\s+([A-L])\b/i) ??
    stage.match(/小组赛\s*([A-L])\s*组/i) ??
    stage.match(/([A-L])\s*组/i);

  return match?.[1]?.toUpperCase() ?? null;
}

const ROUND_WORDS: Record<string, string> = {
  "1": "第一轮",
  "2": "第二轮",
  "3": "第三轮",
  "4": "第四轮",
  "5": "第五轮",
  "6": "第六轮",
  "7": "第七轮",
  "8": "第八轮",
  "9": "第九轮",
  "10": "第十轮",
};

export function getStageRoundLabel(stage: string, summary?: string): string | null {
  const source = [stage, summary].filter(Boolean).join(" ");
  const digitMatch =
    source.match(/Round\s+(\d+)/i) ??
    source.match(/第\s*(\d+)\s*轮/) ??
    source.match(/Matchday\s+(\d+)/i);

  if (digitMatch) return ROUND_WORDS[digitMatch[1]] ?? `第${digitMatch[1]}轮`;

  const wordMatch = source.match(/(第一|第二|第三|第四|第五|第六|第七|第八|第九|第十)\s*轮/);
  return wordMatch ? `${wordMatch[1]}轮` : null;
}

export function formatStageLabel(stage: string, summary?: string): string {
  const source = [stage, summary].filter(Boolean).join(" ");
  const groupId = getStageGroupId(source) ?? getStageGroupId(stage);
  const roundLabel = getStageRoundLabel(stage, summary);

  if (groupId && roundLabel) return `${groupId}组 ${roundLabel}`;
  if (groupId) return `${groupId}组`;
  if (stage.includes("1/16")) return "1/16 决赛";
  if (stage.includes("1/8")) return "1/8 决赛";
  if (stage.includes("1/4")) return "1/4 决赛";
  if (stage.includes("三/四名")) return "三四名决赛";
  return stage;
}

/**
 * Extract round number from stage/summary and format as "小组赛第X轮"
 * Handles formats like: "Group A Round 3", "A组 第3轮", "Matchday 3", "第3轮"
 */
export function formatRoundLabel(stage: string, summary?: string): string {
  return formatStageLabel(stage, summary);
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
