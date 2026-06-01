import type { Team } from "@/types/match";

const teamFlagCodes = new Map<string, string>([
  ["墨西哥", "mx"],
  ["南非", "za"],
  ["韩国", "kr"],
  ["捷克", "cz"],
  ["加拿大", "ca"],
  ["波黑", "ba"],
  ["美国", "us"],
  ["巴拉圭", "py"],
  ["卡塔尔", "qa"],
  ["瑞士", "ch"],
  ["巴西", "br"],
  ["摩洛哥", "ma"],
  ["海地", "ht"],
  ["苏格兰", "gb-sct"],
  ["土耳其", "tr"],
  ["日本", "jp"],
  ["德国", "de"],
  ["库拉索", "cw"],
  ["澳大利亚", "au"],
  ["伊拉克", "iq"],
  ["约旦", "jo"],
  ["埃及", "eg"],
  ["西班牙", "es"],
  ["比利时", "be"],
  ["沙特阿拉伯", "sa"],
  ["法国", "fr"],
  ["哥伦比亚", "co"],
  ["意大利", "it"],
  ["突尼斯", "tn"],
  ["阿尔及利亚", "dz"],
  ["秘鲁", "pe"],
  ["阿根廷", "ar"],
  ["奥地利", "at"],
  ["丹麦", "dk"],
  ["乌拉圭", "uy"],
  ["葡萄牙", "pt"],
  ["挪威", "no"],
  ["英格兰", "gb-eng"],
  ["克罗地亚", "hr"],
  ["厄瓜多尔", "ec"],
  ["荷兰", "nl"],
  ["塞内加尔", "sn"],
  ["阿联酋", "ae"],
  ["伊朗", "ir"],
  ["新西兰", "nz"],
  ["科特迪瓦", "ci"],
  ["加纳", "gh"],
  ["巴拿马", "pa"],
  ["佛得角", "cv"],
  ["刚果民主共和国", "cd"],
  ["瑞典", "se"],
  ["乌兹别克斯坦", "uz"]
]);

export function parseTeams(summary: string) {
  const clean = summary
    .replace(/^⚽\s*/, "")
    .replace(/\s*(?:\([^)]+\)|（[^）]+）)\s*$/, "");
  const parts = clean.split(/\s+vs\s+/i);

  return {
    home: parseTeam(parts[0] || clean),
    away: parseTeam(parts[1] || "待定")
  };
}

export function parseTeam(value: string): Team {
  const team = value.trim();
  const flagMatch = team.match(/(?:[\u{1F1E6}-\u{1F1FF}]\s*){2}/u);
  const flag = flagMatch ? flagMatch[0].replace(/\s+/g, "") : "";
  const name = team
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\u{1F3F4}[\u{E0061}-\u{E007A}\u{E007F}]*/gu, "")
    .replace(/\u{1F3F3}\u{FE0F}?/gu, "")
    .trim();

  const placeholder = parsePlaceholderTeam(name);
  if (placeholder) return placeholder;

  const code = name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "T";
  const imageCode = teamFlagCodes.get(name) || flagToCountryCode(flag);

  return {
    badge: code,
    badgeType: imageCode ? "image" : "code",
    image: imageCode ? `https://flagcdn.com/${imageCode}.svg` : "",
    name: name || team || "待定"
  };
}

function parsePlaceholderTeam(name: string): Team | null {
  if (/^M(\d+)\s*胜者/i.test(name)) {
    return {
      badge: "TBD",
      badgeType: "code",
      image: "",
      name: "晋级球队待定"
    };
  }

  if (/^M(\d+)\s*负者/i.test(name)) {
    return {
      badge: "TBD",
      badgeType: "code",
      image: "",
      name: "球队待定"
    };
  }

  const groupSlot = name.match(/^([A-L])组\s*(第一|第二|第三|第四)$/i);
  if (groupSlot) {
    return {
      badge: "TBD",
      badgeType: "code",
      image: "",
      name: `${groupSlot[1].toUpperCase()}组${groupSlot[2]}`
    };
  }

  return null;
}

function flagToCountryCode(flag: string) {
  if (!flag) return "";

  const points = [...flag].map((char) => char.codePointAt(0)! - 0x1f1e6 + 97);
  if (points.length !== 2 || points.some((point) => point < 97 || point > 122)) {
    return "";
  }

  return String.fromCodePoint(...points);
}
