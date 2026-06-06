import breakthroughSource from "@/outputs/fifa-player-breakthroughs-cn.json";

type RawSearchRecord = {
  查询?: string;
  结果数量?: number;
};

type RawBreakthroughRecord = {
  链接?: string;
  标题?: string;
  内容长度?: number;
  包含突破信息?: boolean;
  关键词?: string[];
  相关句子?: string[];
};

type RawBreakthroughPlayer = {
  球员?: string;
  球队?: string;
  球队代码?: string;
  位置?: string;
  搜索记录?: RawSearchRecord[];
  突破记录?: RawBreakthroughRecord[];
};

type RawBreakthroughSource = {
  数据来源?: string;
  搜索类型?: string;
  生成时间?: string;
  球员总数?: number;
  球员列表?: RawBreakthroughPlayer[];
};

export type PlayerBreakthroughProfile = {
  playerName: string;
  team: string;
  teamCode: string;
  position: string;
  source: string;
  searchType: string;
  generatedAt: string;
  playerTotal: number;
  searchRecords: Array<{
    query: string;
    resultCount: number;
  }>;
  records: Array<{
    title: string;
    url: string;
    contentLength: number;
    hasBreakthrough: boolean;
    keywords: string[];
    sentences: string[];
  }>;
};

type FindBreakthroughOptions = {
  names: Array<string | null | undefined>;
  teamCode?: string | null;
};

const source = breakthroughSource as RawBreakthroughSource;
const players = source.球员列表 ?? [];

export function findPlayerBreakthroughProfile({ names, teamCode }: FindBreakthroughOptions): PlayerBreakthroughProfile | null {
  const normalizedNames = names.map(normalizeName).filter(Boolean);
  const normalizedTeamCode = normalizeTeamCode(teamCode);

  if (!normalizedNames.length) return null;

  let bestMatch: { player: RawBreakthroughPlayer; score: number } | null = null;

  for (const player of players) {
    const playerName = player.球员 ?? "";
    const normalizedPlayerName = normalizeName(playerName);
    const normalizedPlayerTeamCode = normalizeTeamCode(player.球队代码);
    const teamScore = normalizedTeamCode && normalizedTeamCode === normalizedPlayerTeamCode ? 18 : 0;

    for (const name of normalizedNames) {
      const nameScore = scoreNameMatch(name, normalizedPlayerName);
      const score = nameScore + teamScore;
      if (score > (bestMatch?.score ?? 0)) {
        bestMatch = { player, score };
      }
    }
  }

  if (!bestMatch || bestMatch.score < 72) return null;

  const player = bestMatch.player;

  return {
    playerName: player.球员 ?? "",
    team: player.球队 ?? "",
    teamCode: player.球队代码 ?? "",
    position: player.位置 ?? "",
    source: source.数据来源 ?? "FIFA官网",
    searchType: source.搜索类型 ?? "球员突破表现",
    generatedAt: source.生成时间 ?? "",
    playerTotal: source.球员总数 ?? players.length,
    searchRecords: (player.搜索记录 ?? []).map((record) => ({
      query: record.查询 ?? "",
      resultCount: record.结果数量 ?? 0,
    })),
    records: (player.突破记录 ?? []).map((record) => ({
      title: record.标题 ?? "FIFA突破记录",
      url: record.链接 ?? "",
      contentLength: record.内容长度 ?? 0,
      hasBreakthrough: Boolean(record.包含突破信息),
      keywords: record.关键词 ?? [],
      sentences: record.相关句子 ?? [],
    })),
  };
}

function scoreNameMatch(candidate: string, playerName: string) {
  if (!candidate || !playerName) return 0;
  if (candidate === playerName) return 100;

  const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
  const playerTokens = new Set(playerName.split(" ").filter(Boolean));
  const overlap = [...candidateTokens].filter((token) => playerTokens.has(token)).length;
  const overlapRatio = overlap / Math.max(candidateTokens.size, 1);

  if (candidate.length >= 5 && playerName.includes(candidate)) return 78;
  if (playerName.length >= 5 && candidate.includes(playerName)) return 76;
  if (candidateTokens.size >= 2 && overlapRatio >= 0.75) return 74;

  return overlapRatio >= 0.9 && candidateTokens.size >= 1 ? 58 : 0;
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`´]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTeamCode(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}
