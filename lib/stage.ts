export type StageKind = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final" | "warmup" | "other";

const GROUP_STAGE_PATTERNS = [
  /(?:^|\b)Group\s+([A-L])\b/i,
  /(?:^|\b)([A-L])\s*组\b/i,
  /([A-L])\s*组/i,
];

export function getStageKind(stage: string, stageKind?: string | null): StageKind {
  const normalized = normalizeStageKind(stageKind);
  if (normalized) return normalized;

  const text = stage.trim();
  if (getStageGroupId(text)) return "group";
  if (/1\/32|Round of 32|32nd Finals?|32强/i.test(text)) return "r32";
  if (/1\/16|Round of 16|16th Finals?|8th Finals?|1\/8 Finals?|16强/i.test(text)) return "r16";
  if (/1\/4|Quarter/i.test(text)) return "qf";
  if (/1\/2|Semi/i.test(text)) return "sf";
  if (/3rd|Third Place|三四名/i.test(text)) return "third";
  if (/Final/i.test(text)) return "final";
  if (/warmup|热身/i.test(text)) return "warmup";
  return "other";
}

export function getStageGroupId(stage: string): string | null {
  for (const pattern of GROUP_STAGE_PATTERNS) {
    const match = stage.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
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
    source.match(/第\s*(\d+)\s*轮/i) ??
    source.match(/Matchday\s+(\d+)/i);

  if (digitMatch) return ROUND_WORDS[digitMatch[1]] ?? `第${digitMatch[1]}轮`;

  const wordMatch = source.match(/(第一|第二|第三|第四|第五|第六|第七|第八|第九|第十)\s*轮/);
  return wordMatch ? `${wordMatch[1]}轮` : null;
}

export function formatStageLabel(stage: string, summary?: string, stageKind?: string | null): string {
  const source = [stage, summary].filter(Boolean).join(" ");
  const kind = getStageKind(source, stageKind);
  const groupId = getStageGroupId(source);
  const roundLabel = getStageRoundLabel(stage, summary);

  if (kind === "group" && groupId && roundLabel) return `${groupId}组 · ${roundLabel}`;
  if (kind === "group" && groupId) return `${groupId}组`;
  if (kind === "r32") return "1/16决赛";
  if (kind === "r16") return "1/8决赛";
  if (kind === "qf") return "1/4决赛";
  if (kind === "sf") return "半决赛";
  if (kind === "third") return "三四名决赛";
  if (kind === "final") return "决赛";
  if (kind === "warmup") return "热身赛";
  return stage;
}

export function formatRoundLabel(stage: string, summary?: string, stageKind?: string | null): string {
  return formatStageLabel(stage, summary, stageKind);
}

export function rankStage(stage: string, stageKind?: string | null): number {
  const kind = getStageKind(stage, stageKind);
  const groupId = getStageGroupId(stage);
  if (kind === "group" && groupId) return groupId.charCodeAt(0) - 64;
  if (kind === "r32") return 13;
  if (kind === "r16") return 14;
  if (kind === "qf") return 15;
  if (kind === "sf") return 16;
  if (kind === "third") return 17;
  if (kind === "final") return 18;
  if (kind === "warmup") return 19;
  return 99;
}

function normalizeStageKind(value?: string | null): StageKind | null {
  const kind = (value || "").trim().toLowerCase();
  if (!kind) return null;
  if (
    kind === "group" ||
    kind === "r32" ||
    kind === "r16" ||
    kind === "qf" ||
    kind === "sf" ||
    kind === "third" ||
    kind === "final" ||
    kind === "warmup" ||
    kind === "other"
  ) {
    return kind;
  }
  return null;
}
