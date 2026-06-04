export type GroupTeam = {
  code: string;
  name: string;
  nameCn: string;
  flagEmoji: string;
  flagCode: string;
  pot: 1 | 2 | 3 | 4;
};

export type GroupMatch = {
  id: string;
  homeTeamCode: string;
  awayTeamCode: string;
  round: 1 | 2 | 3;
};

export type Group = {
  id: string;
  teams: [GroupTeam, GroupTeam, GroupTeam, GroupTeam];
  matches: [GroupMatch, GroupMatch, GroupMatch, GroupMatch, GroupMatch, GroupMatch];
};

// 48 teams, 12 groups, distributed by FIFA ranking pots (simplified mock draw)
const GROUPS_RAW: {
  id: string;
  teams: [string, string, string, string];
}[] = [
  { id: "A", teams: ["MEX", "RSA", "NOR", "CPV"] },
  { id: "B", teams: ["ENG", "SCO", "BIH", "PAN"] },
  { id: "C", teams: ["BRA", "SUI", "IRQ", "HAI"] },
  { id: "D", teams: ["FRA", "AUT", "SAU", "CUW"] },
  { id: "E", teams: ["ESP", "CIV", "PAR", "NZL"] },
  { id: "F", teams: ["GER", "TUN", "UZB", "SWE"] },
  { id: "G", teams: ["ARG", "IRN", "ECU", "ALG"] },
  { id: "H", teams: ["POR", "JPN", "EGY", "COD"] },
  { id: "I", teams: ["USA", "GHA", "JOR", "QAT"] },
  { id: "J", teams: ["BEL", "SEN", "CHI", "CZE"] },
  { id: "K", teams: ["COL", "MAR", "AUS", "ROU"] },
  { id: "L", teams: ["NED", "KOR", "URU", "CRC"] },
];

const TEAM_DB: Record<string, GroupTeam> = {
  MEX: { code: "MEX", name: "Mexico", nameCn: "墨西哥", flagEmoji: "🇲🇽", flagCode: "mx", pot: 1 },
  USA: { code: "USA", name: "United States", nameCn: "美国", flagEmoji: "🇺🇸", flagCode: "us", pot: 1 },
  ENG: { code: "ENG", name: "England", nameCn: "英格兰", flagEmoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", flagCode: "gb-eng", pot: 1 },
  FRA: { code: "FRA", name: "France", nameCn: "法国", flagEmoji: "🇫🇷", flagCode: "fr", pot: 1 },
  BRA: { code: "BRA", name: "Brazil", nameCn: "巴西", flagEmoji: "🇧🇷", flagCode: "br", pot: 1 },
  ARG: { code: "ARG", name: "Argentina", nameCn: "阿根廷", flagEmoji: "🇦🇷", flagCode: "ar", pot: 1 },
  ESP: { code: "ESP", name: "Spain", nameCn: "西班牙", flagEmoji: "🇪🇸", flagCode: "es", pot: 1 },
  GER: { code: "GER", name: "Germany", nameCn: "德国", flagEmoji: "🇩🇪", flagCode: "de", pot: 1 },
  POR: { code: "POR", name: "Portugal", nameCn: "葡萄牙", flagEmoji: "🇵🇹", flagCode: "pt", pot: 1 },
  BEL: { code: "BEL", name: "Belgium", nameCn: "比利时", flagEmoji: "🇧🇪", flagCode: "be", pot: 1 },
  COL: { code: "COL", name: "Colombia", nameCn: "哥伦比亚", flagEmoji: "🇨🇴", flagCode: "co", pot: 1 },
  NED: { code: "NED", name: "Netherlands", nameCn: "荷兰", flagEmoji: "🇳🇱", flagCode: "nl", pot: 1 },
  RSA: { code: "RSA", name: "South Africa", nameCn: "南非", flagEmoji: "🇿🇦", flagCode: "za", pot: 2 },
  SCO: { code: "SCO", name: "Scotland", nameCn: "苏格兰", flagEmoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", flagCode: "gb-sct", pot: 2 },
  SUI: { code: "SUI", name: "Switzerland", nameCn: "瑞士", flagEmoji: "🇨🇭", flagCode: "ch", pot: 2 },
  AUT: { code: "AUT", name: "Austria", nameCn: "奥地利", flagEmoji: "🇦🇹", flagCode: "at", pot: 2 },
  CIV: { code: "CIV", name: "Cote d'Ivoire", nameCn: "科特迪瓦", flagEmoji: "🇨🇮", flagCode: "ci", pot: 2 },
  TUN: { code: "TUN", name: "Tunisia", nameCn: "突尼斯", flagEmoji: "🇹🇳", flagCode: "tn", pot: 2 },
  IRN: { code: "IRN", name: "Iran", nameCn: "伊朗", flagEmoji: "🇮🇷", flagCode: "ir", pot: 2 },
  JPN: { code: "JPN", name: "Japan", nameCn: "日本", flagEmoji: "🇯🇵", flagCode: "jp", pot: 2 },
  GHA: { code: "GHA", name: "Ghana", nameCn: "加纳", flagEmoji: "🇬🇭", flagCode: "gh", pot: 2 },
  SEN: { code: "SEN", name: "Senegal", nameCn: "塞内加尔", flagEmoji: "🇸🇳", flagCode: "sn", pot: 2 },
  MAR: { code: "MAR", name: "Morocco", nameCn: "摩洛哥", flagEmoji: "🇲🇦", flagCode: "ma", pot: 2 },
  KOR: { code: "KOR", name: "South Korea", nameCn: "韩国", flagEmoji: "🇰🇷", flagCode: "kr", pot: 2 },
  NOR: { code: "NOR", name: "Norway", nameCn: "挪威", flagEmoji: "🇳🇴", flagCode: "no", pot: 3 },
  BIH: { code: "BIH", name: "Bosnia & Herz.", nameCn: "波黑", flagEmoji: "🇧🇦", flagCode: "ba", pot: 3 },
  IRQ: { code: "IRQ", name: "Iraq", nameCn: "伊拉克", flagEmoji: "🇮🇶", flagCode: "iq", pot: 3 },
  SAU: { code: "SAU", name: "Saudi Arabia", nameCn: "沙特", flagEmoji: "🇸🇦", flagCode: "sa", pot: 3 },
  PAR: { code: "PAR", name: "Paraguay", nameCn: "巴拉圭", flagEmoji: "🇵🇾", flagCode: "py", pot: 3 },
  UZB: { code: "UZB", name: "Uzbekistan", nameCn: "乌兹别克", flagEmoji: "🇺🇿", flagCode: "uz", pot: 3 },
  ECU: { code: "ECU", name: "Ecuador", nameCn: "厄瓜多尔", flagEmoji: "🇪🇨", flagCode: "ec", pot: 3 },
  EGY: { code: "EGY", name: "Egypt", nameCn: "埃及", flagEmoji: "🇪🇬", flagCode: "eg", pot: 3 },
  JOR: { code: "JOR", name: "Jordan", nameCn: "约旦", flagEmoji: "🇯🇴", flagCode: "jo", pot: 3 },
  CHI: { code: "CHI", name: "Chile", nameCn: "智利", flagEmoji: "🇨🇱", flagCode: "cl", pot: 3 },
  AUS: { code: "AUS", name: "Australia", nameCn: "澳大利亚", flagEmoji: "🇦🇺", flagCode: "au", pot: 3 },
  URU: { code: "URU", name: "Uruguay", nameCn: "乌拉圭", flagEmoji: "🇺🇾", flagCode: "uy", pot: 3 },
  CPV: { code: "CPV", name: "Cabo Verde", nameCn: "佛得角", flagEmoji: "🇨🇻", flagCode: "cv", pot: 4 },
  PAN: { code: "PAN", name: "Panama", nameCn: "巴拿马", flagEmoji: "🇵🇦", flagCode: "pa", pot: 4 },
  HAI: { code: "HAI", name: "Haiti", nameCn: "海地", flagEmoji: "🇭🇹", flagCode: "ht", pot: 4 },
  CUW: { code: "CUW", name: "Curacao", nameCn: "库拉索", flagEmoji: "🇨🇼", flagCode: "cw", pot: 4 },
  NZL: { code: "NZL", name: "New Zealand", nameCn: "新西兰", flagEmoji: "🇳🇿", flagCode: "nz", pot: 4 },
  SWE: { code: "SWE", name: "Sweden", nameCn: "瑞典", flagEmoji: "🇸🇪", flagCode: "se", pot: 4 },
  ALG: { code: "ALG", name: "Algeria", nameCn: "阿尔及利亚", flagEmoji: "🇩🇿", flagCode: "dz", pot: 4 },
  COD: { code: "COD", name: "DR Congo", nameCn: "刚果(金)", flagEmoji: "🇨🇩", flagCode: "cd", pot: 4 },
  QAT: { code: "QAT", name: "Qatar", nameCn: "卡塔尔", flagEmoji: "🇶🇦", flagCode: "qa", pot: 4 },
  CZE: { code: "CZE", name: "Czech Republic", nameCn: "捷克", flagEmoji: "🇨🇿", flagCode: "cz", pot: 4 },
  ROU: { code: "ROU", name: "Romania", nameCn: "罗马尼亚", flagEmoji: "🇷🇴", flagCode: "ro", pot: 4 },
  CRC: { code: "CRC", name: "Costa Rica", nameCn: "哥斯达黎加", flagEmoji: "🇨🇷", flagCode: "cr", pot: 4 },
};

function buildGroup(raw: { id: string; teams: [string, string, string, string] }): Group {
  const [a, b, c, d] = raw.teams;
  return {
    id: raw.id,
    teams: [
      TEAM_DB[a],
      TEAM_DB[b],
      TEAM_DB[c],
      TEAM_DB[d],
    ],
    matches: [
      // Round 1: A vs B, C vs D
      { id: `${raw.id}-R1-M1`, homeTeamCode: a, awayTeamCode: b, round: 1 },
      { id: `${raw.id}-R1-M2`, homeTeamCode: c, awayTeamCode: d, round: 1 },
      // Round 2: A vs C, B vs D
      { id: `${raw.id}-R2-M1`, homeTeamCode: a, awayTeamCode: c, round: 2 },
      { id: `${raw.id}-R2-M2`, homeTeamCode: b, awayTeamCode: d, round: 2 },
      // Round 3: A vs D, B vs C
      { id: `${raw.id}-R3-M1`, homeTeamCode: a, awayTeamCode: d, round: 3 },
      { id: `${raw.id}-R3-M2`, homeTeamCode: b, awayTeamCode: c, round: 3 },
    ],
  };
}

export const GROUPS: Group[] = GROUPS_RAW.map(buildGroup);

export function getTeamByCode(code: string): GroupTeam | undefined {
  return TEAM_DB[code];
}

export function getAllTeams(): GroupTeam[] {
  return Object.values(TEAM_DB);
}
