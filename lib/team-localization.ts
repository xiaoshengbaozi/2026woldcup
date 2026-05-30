const CODE_TO_CN: Record<string, string> = {
  ARG: "阿根廷",
  AUS: "澳大利亚",
  AUT: "奥地利",
  BEL: "比利时",
  BIH: "波黑",
  BRA: "巴西",
  CAN: "加拿大",
  CIV: "科特迪瓦",
  COD: "刚果民主共和国",
  COL: "哥伦比亚",
  CPV: "佛得角",
  CUW: "库拉索",
  CZE: "捷克",
  DZA: "阿尔及利亚",
  ECU: "厄瓜多尔",
  EGY: "埃及",
  ENG: "英格兰",
  ESP: "西班牙",
  FRA: "法国",
  GER: "德国",
  GHA: "加纳",
  HAI: "海地",
  IRN: "伊朗",
  IRQ: "伊拉克",
  JOR: "约旦",
  JPN: "日本",
  KOR: "韩国",
  MAR: "摩洛哥",
  MEX: "墨西哥",
  NED: "荷兰",
  NOR: "挪威",
  NZL: "新西兰",
  PAN: "巴拿马",
  PAR: "巴拉圭",
  POR: "葡萄牙",
  QAT: "卡塔尔",
  RSA: "南非",
  SAU: "沙特阿拉伯",
  SCO: "苏格兰",
  SEN: "塞内加尔",
  SUI: "瑞士",
  SWE: "瑞典",
  TUN: "突尼斯",
  TUR: "土耳其",
  URU: "乌拉圭",
  USA: "美国",
  UZB: "乌兹别克斯坦",
};

const NAME_TO_CODE: Record<string, string> = {
  "algeria": "DZA",
  "argentina": "ARG",
  "australia": "AUS",
  "austria": "AUT",
  "belgium": "BEL",
  "bosnia & herz.": "BIH",
  "bosnia and herzegovina": "BIH",
  "bosnia-herzegovina": "BIH",
  "brazil": "BRA",
  "cabo verde": "CPV",
  "canada": "CAN",
  "cape verde": "CPV",
  "colombia": "COL",
  "congo dr": "COD",
  "cote d'ivoire": "CIV",
  "cote divoire": "CIV",
  "curacao": "CUW",
  "curaçao": "CUW",
  "czech republic": "CZE",
  "czechia": "CZE",
  "dr congo": "COD",
  "ecuador": "ECU",
  "egypt": "EGY",
  "england": "ENG",
  "france": "FRA",
  "germany": "GER",
  "ghana": "GHA",
  "haiti": "HAI",
  "iran": "IRN",
  "iraq": "IRQ",
  "ivory coast": "CIV",
  "japan": "JPN",
  "jordan": "JOR",
  "korea republic": "KOR",
  "mexico": "MEX",
  "morocco": "MAR",
  "netherlands": "NED",
  "new zealand": "NZL",
  "norway": "NOR",
  "panama": "PAN",
  "paraguay": "PAR",
  "portugal": "POR",
  "qatar": "QAT",
  "saudi arabia": "SAU",
  "scotland": "SCO",
  "senegal": "SEN",
  "south africa": "RSA",
  "south korea": "KOR",
  "spain": "ESP",
  "sweden": "SWE",
  "switzerland": "SUI",
  "tunisia": "TUN",
  "turkey": "TUR",
  "turkiye": "TUR",
  "türkiye": "TUR",
  "united states": "USA",
  "uruguay": "URU",
  "usa": "USA",
  "uzbekistan": "UZB",
};

export function localizeCountryCode(code: string) {
  return CODE_TO_CN[code] ?? code;
}

export function localizeTeamName(name: string, code?: string) {
  if (code && CODE_TO_CN[code]) return CODE_TO_CN[code];
  const normalized = normalizeName(name);
  const mappedCode = NAME_TO_CODE[normalized];
  return mappedCode ? CODE_TO_CN[mappedCode] : name;
}

export function getTeamCodeFromName(name: string) {
  return NAME_TO_CODE[normalizeName(name)];
}

export function localizeMatchTitle(title: string) {
  const [home, away] = title.split(/\s+vs\.?\s+/i).map((part) => part.trim());
  if (!home || !away) return title;
  return `${localizeTeamName(home)} vs ${localizeTeamName(away)}`;
}

function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}&'.\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
