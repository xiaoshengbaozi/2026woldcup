import type { Match } from "@/types/match";

/**
 * Generate a stable ASCII URL slug from a match summary.
 * e.g. "墨西哥 vs 南非（小组赛第 1 轮）" -> "mexico-vs-south-africa"
 */
export function generateMatchSlug(summary: string): string {
  const teams = splitMatchTeams(summary);
  if (!teams) return slugify(summary);

  return `${slugifyTeamName(teams.home)}-vs-${slugifyTeamName(teams.away)}`;
}

export function generateLegacyMatchSlug(summary: string): string {
  const teams = splitMatchTeams(summary);
  if (!teams) return slugify(summary);

  return `${slugify(teams.home)}-vs-${slugify(teams.away)}`;
}

export function generateStageLegacyMatchSlug(summary: string): string {
  const clean = summary.replace(/^⚽\s*/, "").replace(/\s*\([^)]+\)\s*$/, "").trim();
  const parts = clean.split(/\s+vs\s+/i);
  if (parts.length < 2) return slugify(clean);

  return `${slugify(stripFlag(parts[0]))}-vs-${slugify(stripFlag(parts[1]))}`;
}

function splitMatchTeams(summary: string) {
  const clean = summary
    .replace(/^⚽\s*/, "")
    .replace(/\s*(?:\([^)]+\)|（[^）]+）)\s*$/, "")
    .trim();
  const parts = clean.split(/\s+vs\s+/i);

  if (parts.length < 2) return null;
  return {
    home: stripFlag(parts[0]),
    away: stripFlag(parts[1]),
  };
}

function stripFlag(value: string): string {
  return value
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .trim();
}

function slugifyTeamName(name: string): string {
  return slugify(TEAM_NAME_TO_SLUG[name] ?? name);
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const TEAM_NAME_TO_SLUG: Record<string, string> = {
  阿根廷: "argentina",
  阿尔及利亚: "algeria",
  阿联酋: "united-arab-emirates",
  澳大利亚: "australia",
  奥地利: "austria",
  巴拉圭: "paraguay",
  巴拿马: "panama",
  巴西: "brazil",
  比利时: "belgium",
  波黑: "bosnia-and-herzegovina",
  丹麦: "denmark",
  德国: "germany",
  厄瓜多尔: "ecuador",
  俄罗斯: "russia",
  法国: "france",
  佛得角: "cape-verde",
  哥伦比亚: "colombia",
  哥斯达黎加: "costa-rica",
  韩国: "south-korea",
  荷兰: "netherlands",
  加纳: "ghana",
  加拿大: "canada",
  捷克: "czech-republic",
  喀麦隆: "cameroon",
  卡塔尔: "qatar",
  科特迪瓦: "ivory-coast",
  克罗地亚: "croatia",
  库拉索: "curacao",
  墨西哥: "mexico",
  摩洛哥: "morocco",
  南非: "south-africa",
  挪威: "norway",
  葡萄牙: "portugal",
  日本: "japan",
  瑞典: "sweden",
  瑞士: "switzerland",
  沙特阿拉伯: "saudi-arabia",
  塞尔维亚: "serbia",
  塞内加尔: "senegal",
  苏格兰: "scotland",
  突尼斯: "tunisia",
  土耳其: "turkiye",
  乌拉圭: "uruguay",
  乌兹别克斯坦: "uzbekistan",
  西班牙: "spain",
  新西兰: "new-zealand",
  伊拉克: "iraq",
  伊朗: "iran",
  意大利: "italy",
  英格兰: "england",
  约旦: "jordan",
  "刚果(金)": "dr-congo",
  刚果金: "dr-congo",
  刚果民主共和国: "dr-congo",
  "DR Congo": "dr-congo",
  "Congo DR": "dr-congo",
  海地: "haiti",
  埃及: "egypt",
  秘鲁: "peru",
  波兰: "poland",
  乌克兰: "ukraine",
  尼日利亚: "nigeria",
  牙买加: "jamaica",
  洪都拉斯: "honduras",
  美国: "united-states",
  威尔士: "wales",
};

/**
 * Reverse lookup: find a match by its slug from a list of matches.
 */
export function findMatchBySlug(matches: Match[], slug: string): Match | undefined {
  const decodedSlug = decodeURIComponent(slug);
  return matches.find((match) => {
    return (
      generateMatchSlug(match.summary) === decodedSlug ||
      generateLegacyMatchSlug(match.summary) === decodedSlug ||
      generateStageLegacyMatchSlug(match.summary) === decodedSlug
    );
  });
}
