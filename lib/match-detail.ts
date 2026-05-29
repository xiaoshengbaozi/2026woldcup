import type { Match } from "@/types/match";

/**
 * Generate a URL-friendly slug from match summary.
 * e.g. "⚽ 西班牙 vs 巴西 (小组赛A组)" → "spain-vs-brazil"
 */
export function generateMatchSlug(summary: string): string {
  const clean = summary
    .replace(/^⚽\s*/, "")
    .replace(/\s*\([^)]+\)\s*$/, "")
    .trim();

  const parts = clean.split(/\s+vs\s+/i);
  if (parts.length < 2) return slugify(clean);

  const home = parts[0];
  const away = parts[1];

  return `${slugifyEnglishName(home)}-vs-${slugifyEnglishName(away)}`;
}

function slugifyEnglishName(name: string): string {
  const stripped = name
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .trim();

  const englishName = CN_TO_EN[stripped] ?? stripped;
  return slugify(englishName);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const CN_TO_EN: Record<string, string> = {
  "墨西哥": "mexico",
  "南非": "south-africa",
  "韩国": "south-korea",
  "捷克": "czech-republic",
  "加拿大": "canada",
  "波黑": "bosnia",
  "美国": "united-states",
  "巴拉圭": "paraguay",
  "卡塔尔": "qatar",
  "瑞士": "switzerland",
  "巴西": "brazil",
  "摩洛哥": "morocco",
  "海地": "haiti",
  "苏格兰": "scotland",
  "土耳其": "turkey",
  "日本": "japan",
  "德国": "germany",
  "库拉索": "curacao",
  "澳大利亚": "australia",
  "埃及": "egypt",
  "法国": "france",
  "哥伦比亚": "colombia",
  "意大利": "italy",
  "突尼斯": "tunisia",
  "阿尔及利亚": "algeria",
  "秘鲁": "peru",
  "阿根廷": "argentina",
  "奥地利": "austria",
  "丹麦": "denmark",
  "乌拉圭": "uruguay",
  "葡萄牙": "portugal",
  "挪威": "norway",
  "英格兰": "england",
  "克罗地亚": "croatia",
  "厄瓜多尔": "ecuador",
  "荷兰": "netherlands",
  "塞内加尔": "senegal",
  "阿联酋": "uae",
  "伊朗": "iran",
  "新西兰": "new-zealand",
  "科特迪瓦": "ivory-coast",
  "加纳": "ghana",
  "巴拿马": "panama",
  "佛得角": "cape-verde",
  "智利": "chile",
  "波兰": "poland",
  "乌克兰": "ukraine",
  "塞尔维亚": "serbia",
  "比利时": "belgium",
  "喀麦隆": "cameroon",
  "尼日利亚": "nigeria",
  "沙特阿拉伯": "saudi-arabia",
  "牙买加": "jamaica",
  "洪都拉斯": "honduras",
  "哥斯达黎加": "costa-rica",
  "西班牙": "spain",
};

/**
 * Reverse lookup: find a match by its slug from a list of matches.
 */
export function findMatchBySlug(matches: Match[], slug: string): Match | undefined {
  return matches.find((m) => generateMatchSlug(m.summary) === slug);
}
