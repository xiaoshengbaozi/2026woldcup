export interface WorldCupQualifiedTeam {
  code: string;
  name: string;
  nameCn: string;
  flagEmoji: string;
  flagCode: string;
  centroid: [number, number];
}

export const WORLD_CUP_2026_QUALIFIED_TEAMS: WorldCupQualifiedTeam[] = [
  { code: "MEX", name: "Mexico", nameCn: "墨西哥", flagEmoji: "🇲🇽", flagCode: "mx", centroid: [-102.55, 23.63] },
  { code: "USA", name: "United States", nameCn: "美国", flagEmoji: "🇺🇸", flagCode: "us", centroid: [-95.71, 37.09] },
  { code: "CAN", name: "Canada", nameCn: "加拿大", flagEmoji: "🇨🇦", flagCode: "ca", centroid: [-106.35, 56.13] },
  { code: "ARG", name: "Argentina", nameCn: "阿根廷", flagEmoji: "🇦🇷", flagCode: "ar", centroid: [-63.62, -38.42] },
  { code: "BRA", name: "Brazil", nameCn: "巴西", flagEmoji: "🇧🇷", flagCode: "br", centroid: [-51.93, -14.24] },
  { code: "COL", name: "Colombia", nameCn: "哥伦比亚", flagEmoji: "🇨🇴", flagCode: "co", centroid: [-74.3, 4.57] },
  { code: "ECU", name: "Ecuador", nameCn: "厄瓜多尔", flagEmoji: "🇪🇨", flagCode: "ec", centroid: [-78.18, -1.83] },
  { code: "PAR", name: "Paraguay", nameCn: "巴拉圭", flagEmoji: "🇵🇾", flagCode: "py", centroid: [-58.44, -23.44] },
  { code: "URU", name: "Uruguay", nameCn: "乌拉圭", flagEmoji: "🇺🇾", flagCode: "uy", centroid: [-55.77, -32.52] },
  { code: "JPN", name: "Japan", nameCn: "日本", flagEmoji: "🇯🇵", flagCode: "jp", centroid: [138.25, 36.2] },
  { code: "IRN", name: "Iran", nameCn: "伊朗", flagEmoji: "🇮🇷", flagCode: "ir", centroid: [53.69, 32.43] },
  { code: "UZB", name: "Uzbekistan", nameCn: "乌兹别克斯坦", flagEmoji: "🇺🇿", flagCode: "uz", centroid: [64.59, 41.38] },
  { code: "KOR", name: "South Korea", nameCn: "韩国", flagEmoji: "🇰🇷", flagCode: "kr", centroid: [127.77, 35.91] },
  { code: "JOR", name: "Jordan", nameCn: "约旦", flagEmoji: "🇯🇴", flagCode: "jo", centroid: [36.24, 30.59] },
  { code: "AUS", name: "Australia", nameCn: "澳大利亚", flagEmoji: "🇦🇺", flagCode: "au", centroid: [133.78, -25.27] },
  { code: "QAT", name: "Qatar", nameCn: "卡塔尔", flagEmoji: "🇶🇦", flagCode: "qa", centroid: [51.18, 25.35] },
  { code: "SAU", name: "Saudi Arabia", nameCn: "沙特阿拉伯", flagEmoji: "🇸🇦", flagCode: "sa", centroid: [45.08, 23.89] },
  { code: "IRQ", name: "Iraq", nameCn: "伊拉克", flagEmoji: "🇮🇶", flagCode: "iq", centroid: [43.68, 33.22] },
  { code: "MAR", name: "Morocco", nameCn: "摩洛哥", flagEmoji: "🇲🇦", flagCode: "ma", centroid: [-7.09, 31.79] },
  { code: "TUN", name: "Tunisia", nameCn: "突尼斯", flagEmoji: "🇹🇳", flagCode: "tn", centroid: [9.54, 33.89] },
  { code: "EGY", name: "Egypt", nameCn: "埃及", flagEmoji: "🇪🇬", flagCode: "eg", centroid: [30.8, 26.82] },
  { code: "DZA", name: "Algeria", nameCn: "阿尔及利亚", flagEmoji: "🇩🇿", flagCode: "dz", centroid: [1.66, 28.03] },
  { code: "GHA", name: "Ghana", nameCn: "加纳", flagEmoji: "🇬🇭", flagCode: "gh", centroid: [-1.02, 7.95] },
  { code: "CPV", name: "Cabo Verde", nameCn: "佛得角", flagEmoji: "🇨🇻", flagCode: "cv", centroid: [-23.6, 15.1] },
  { code: "RSA", name: "South Africa", nameCn: "南非", flagEmoji: "🇿🇦", flagCode: "za", centroid: [22.94, -30.56] },
  { code: "SEN", name: "Senegal", nameCn: "塞内加尔", flagEmoji: "🇸🇳", flagCode: "sn", centroid: [-14.5, 14.5] },
  { code: "CIV", name: "Cote d'Ivoire", nameCn: "科特迪瓦", flagEmoji: "🇨🇮", flagCode: "ci", centroid: [-5.55, 7.54] },
  { code: "COD", name: "DR Congo", nameCn: "刚果民主共和国", flagEmoji: "🇨🇩", flagCode: "cd", centroid: [23.65, -2.88] },
  { code: "NZL", name: "New Zealand", nameCn: "新西兰", flagEmoji: "🇳🇿", flagCode: "nz", centroid: [174.89, -40.9] },
  { code: "CUW", name: "Curacao", nameCn: "库拉索", flagEmoji: "🇨🇼", flagCode: "cw", centroid: [-68.99, 12.17] },
  { code: "HAI", name: "Haiti", nameCn: "海地", flagEmoji: "🇭🇹", flagCode: "ht", centroid: [-72.29, 18.97] },
  { code: "PAN", name: "Panama", nameCn: "巴拿马", flagEmoji: "🇵🇦", flagCode: "pa", centroid: [-80.78, 8.54] },
  { code: "ENG", name: "England", nameCn: "英格兰", flagEmoji: "🏴", flagCode: "gb-eng", centroid: [-1.17, 52.36] },
  { code: "FRA", name: "France", nameCn: "法国", flagEmoji: "🇫🇷", flagCode: "fr", centroid: [2.21, 46.23] },
  { code: "GER", name: "Germany", nameCn: "德国", flagEmoji: "🇩🇪", flagCode: "de", centroid: [10.45, 51.17] },
  { code: "ESP", name: "Spain", nameCn: "西班牙", flagEmoji: "🇪🇸", flagCode: "es", centroid: [-3.7, 40.46] },
  { code: "POR", name: "Portugal", nameCn: "葡萄牙", flagEmoji: "🇵🇹", flagCode: "pt", centroid: [-8.22, 39.4] },
  { code: "NED", name: "Netherlands", nameCn: "荷兰", flagEmoji: "🇳🇱", flagCode: "nl", centroid: [5.29, 52.13] },
  { code: "BEL", name: "Belgium", nameCn: "比利时", flagEmoji: "🇧🇪", flagCode: "be", centroid: [4.47, 50.5] },
  { code: "CRO", name: "Croatia", nameCn: "克罗地亚", flagEmoji: "🇭🇷", flagCode: "hr", centroid: [15.2, 45.1] },
  { code: "SUI", name: "Switzerland", nameCn: "瑞士", flagEmoji: "🇨🇭", flagCode: "ch", centroid: [8.23, 46.82] },
  { code: "AUT", name: "Austria", nameCn: "奥地利", flagEmoji: "🇦🇹", flagCode: "at", centroid: [14.55, 47.52] },
  { code: "NOR", name: "Norway", nameCn: "挪威", flagEmoji: "🇳🇴", flagCode: "no", centroid: [8.47, 60.47] },
  { code: "SCO", name: "Scotland", nameCn: "苏格兰", flagEmoji: "🏴", flagCode: "gb-sct", centroid: [-4.2, 56.49] },
  { code: "SWE", name: "Sweden", nameCn: "瑞典", flagEmoji: "🇸🇪", flagCode: "se", centroid: [18.64, 60.13] },
  { code: "TUR", name: "Turkiye", nameCn: "土耳其", flagEmoji: "🇹🇷", flagCode: "tr", centroid: [35.24, 38.96] },
  { code: "CZE", name: "Czechia", nameCn: "捷克", flagEmoji: "🇨🇿", flagCode: "cz", centroid: [15.47, 49.82] },
  { code: "BIH", name: "Bosnia and Herzegovina", nameCn: "波黑", flagEmoji: "🇧🇦", flagCode: "ba", centroid: [17.68, 43.92] },
];

export const FLAG_CODE_MAP: Record<string, string> = {
  ...Object.fromEntries(WORLD_CUP_2026_QUALIFIED_TEAMS.map((team) => [team.code, team.flagCode])),
  PRY: "py",
  PAR: "py",
  CUR: "cw",
  CUW: "cw",
  RSA: "za",
  KOR: "kr",
  SCO: "gb-sct",
  ENG: "gb-eng",
};

export function getFlagCode(code: string): string {
  return FLAG_CODE_MAP[code] ?? code.toLowerCase().slice(0, 2);
}

export function getFlagUrl(code: string, width: 40 | 80 | 160 = 80): string {
  return `https://flagcdn.com/w${width}/${getFlagCode(code)}.png`;
}
