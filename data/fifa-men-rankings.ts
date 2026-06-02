export type FifaConfederation = "AFC" | "CAF" | "CONCACAF" | "CONMEBOL" | "OFC" | "UEFA";

export interface FifaMenRankingEntry {
  slug: string;
  projectCode: string;
  fifaCode: string;
  nameCn: string;
  nameEn: string;
  fifaName: string;
  confederation: FifaConfederation;
  worldRank: number;
  confederationRank: number;
  points: number;
  previousWorldRank: number;
  rankMovement: number;
  matches: number;
}

export const fifaMenRankingMeta = {
  source: "FIFA/Coca-Cola Men's World Ranking",
  sourceUrl: "https://api.fifa.com/api/v3/rankings?gender=1&count=250",
  pageUrl: "https://inside.fifa.com/fifa-world-ranking/men",
  publishedAt: "2026-04-01T13:00:00+00:00",
  gender: "men",
  note: "confederationRank is calculated from the full FIFA ranking list within each confederation.",
} as const;

export const fifaMenRankings: FifaMenRankingEntry[] = [
  { "slug": "canada", "projectCode": "CAN", "fifaCode": "CAN", "nameCn": "加拿大", "nameEn": "Canada", "fifaName": "Canada", "confederation": "CONCACAF", "worldRank": 30, "confederationRank": 3, "points": 1556.48, "previousWorldRank": 29, "rankMovement": -1, "matches": 49 },
  { "slug": "mexico", "projectCode": "MEX", "fifaCode": "MEX", "nameCn": "墨西哥", "nameEn": "Mexico", "fifaName": "Mexico", "confederation": "CONCACAF", "worldRank": 15, "confederationRank": 1, "points": 1681.03, "previousWorldRank": 16, "rankMovement": 1, "matches": 61 },
  { "slug": "united-states", "projectCode": "USA", "fifaCode": "USA", "nameCn": "美国", "nameEn": "United States", "fifaName": "USA", "confederation": "CONCACAF", "worldRank": 16, "confederationRank": 2, "points": 1673.13, "previousWorldRank": 15, "rankMovement": -1, "matches": 61 },
  { "slug": "haiti", "projectCode": "HAI", "fifaCode": "HAI", "nameCn": "海地", "nameEn": "Haiti", "fifaName": "Haiti", "confederation": "CONCACAF", "worldRank": 83, "confederationRank": 9, "points": 1291.71, "previousWorldRank": 83, "rankMovement": 0, "matches": 33 },
  { "slug": "curacao", "projectCode": "CUW", "fifaCode": "CUW", "nameCn": "库拉索", "nameEn": "Curacao", "fifaName": "Curaçao", "confederation": "CONCACAF", "worldRank": 82, "confederationRank": 8, "points": 1294.65, "previousWorldRank": 81, "rankMovement": -1, "matches": 32 },
  { "slug": "panama", "projectCode": "PAN", "fifaCode": "PAN", "nameCn": "巴拿马", "nameEn": "Panama", "fifaName": "Panama", "confederation": "CONCACAF", "worldRank": 33, "confederationRank": 4, "points": 1540.64, "previousWorldRank": 33, "rankMovement": 0, "matches": 53 },
  { "slug": "argentina", "projectCode": "ARG", "fifaCode": "ARG", "nameCn": "阿根廷", "nameEn": "Argentina", "fifaName": "Argentina", "confederation": "CONMEBOL", "worldRank": 3, "confederationRank": 1, "points": 1874.81, "previousWorldRank": 2, "rankMovement": -1, "matches": 49 },
  { "slug": "brazil", "projectCode": "BRA", "fifaCode": "BRA", "nameCn": "巴西", "nameEn": "Brazil", "fifaName": "Brazil", "confederation": "CONMEBOL", "worldRank": 6, "confederationRank": 2, "points": 1761.16, "previousWorldRank": 5, "rankMovement": -1, "matches": 44 },
  { "slug": "colombia", "projectCode": "COL", "fifaCode": "COL", "nameCn": "哥伦比亚", "nameEn": "Colombia", "fifaName": "Colombia", "confederation": "CONMEBOL", "worldRank": 13, "confederationRank": 3, "points": 1693.09, "previousWorldRank": 14, "rankMovement": 1, "matches": 45 },
  { "slug": "ecuador", "projectCode": "ECU", "fifaCode": "ECU", "nameCn": "厄瓜多尔", "nameEn": "Ecuador", "fifaName": "Ecuador", "confederation": "CONMEBOL", "worldRank": 23, "confederationRank": 5, "points": 1594.78, "previousWorldRank": 23, "rankMovement": 0, "matches": 46 },
  { "slug": "paraguay", "projectCode": "PAR", "fifaCode": "PAR", "nameCn": "巴拉圭", "nameEn": "Paraguay", "fifaName": "Paraguay", "confederation": "CONMEBOL", "worldRank": 40, "confederationRank": 6, "points": 1503.5, "previousWorldRank": 40, "rankMovement": 0, "matches": 39 },
  { "slug": "uruguay", "projectCode": "URU", "fifaCode": "URU", "nameCn": "乌拉圭", "nameEn": "Uruguay", "fifaName": "Uruguay", "confederation": "CONMEBOL", "worldRank": 17, "confederationRank": 4, "points": 1673.07, "previousWorldRank": 17, "rankMovement": 0, "matches": 43 },
  { "slug": "algeria", "projectCode": "DZA", "fifaCode": "ALG", "nameCn": "阿尔及利亚", "nameEn": "Algeria", "fifaName": "Algeria", "confederation": "CAF", "worldRank": 28, "confederationRank": 4, "points": 1564.26, "previousWorldRank": 28, "rankMovement": 0, "matches": 65 },
  { "slug": "morocco", "projectCode": "MAR", "fifaCode": "MAR", "nameCn": "摩洛哥", "nameEn": "Morocco", "fifaName": "Morocco", "confederation": "CAF", "worldRank": 8, "confederationRank": 1, "points": 1755.87, "previousWorldRank": 8, "rankMovement": 0, "matches": 69 },
  { "slug": "south-africa", "projectCode": "RSA", "fifaCode": "RSA", "nameCn": "南非", "nameEn": "South Africa", "fifaName": "South Africa", "confederation": "CAF", "worldRank": 60, "confederationRank": 11, "points": 1429.73, "previousWorldRank": 60, "rankMovement": 0, "matches": 67 },
  { "slug": "cape-verde", "projectCode": "CPV", "fifaCode": "CPV", "nameCn": "佛得角", "nameEn": "Cabo Verde", "fifaName": "Cabo Verde", "confederation": "CAF", "worldRank": 69, "confederationRank": 13, "points": 1366.13, "previousWorldRank": 67, "rankMovement": -2, "matches": 43 },
  { "slug": "ivory-coast", "projectCode": "CIV", "fifaCode": "CIV", "nameCn": "科特迪瓦", "nameEn": "Cote d'Ivoire", "fifaName": "Côte d'Ivoire", "confederation": "CAF", "worldRank": 34, "confederationRank": 6, "points": 1532.98, "previousWorldRank": 37, "rankMovement": 3, "matches": 57 },
  { "slug": "dr-congo", "projectCode": "COD", "fifaCode": "COD", "nameCn": "刚果民主共和国", "nameEn": "DR Congo", "fifaName": "Congo DR", "confederation": "CAF", "worldRank": 46, "confederationRank": 9, "points": 1478.35, "previousWorldRank": 48, "rankMovement": 2, "matches": 54 },
  { "slug": "egypt", "projectCode": "EGY", "fifaCode": "EGY", "nameCn": "埃及", "nameEn": "Egypt", "fifaName": "Egypt", "confederation": "CAF", "worldRank": 29, "confederationRank": 5, "points": 1563.24, "previousWorldRank": 31, "rankMovement": 2, "matches": 53 },
  { "slug": "ghana", "projectCode": "GHA", "fifaCode": "GHA", "nameCn": "加纳", "nameEn": "Ghana", "fifaName": "Ghana", "confederation": "CAF", "worldRank": 74, "confederationRank": 14, "points": 1346.31, "previousWorldRank": 72, "rankMovement": -2, "matches": 54 },
  { "slug": "senegal", "projectCode": "SEN", "fifaCode": "SEN", "nameCn": "塞内加尔", "nameEn": "Senegal", "fifaName": "Senegal", "confederation": "CAF", "worldRank": 14, "confederationRank": 2, "points": 1688.99, "previousWorldRank": 12, "rankMovement": -2, "matches": 71 },
  { "slug": "tunisia", "projectCode": "TUN", "fifaCode": "TUN", "nameCn": "突尼斯", "nameEn": "Tunisia", "fifaName": "Tunisia", "confederation": "CAF", "worldRank": 44, "confederationRank": 7, "points": 1483.05, "previousWorldRank": 47, "rankMovement": 3, "matches": 51 },
  { "slug": "australia", "projectCode": "AUS", "fifaCode": "AUS", "nameCn": "澳大利亚", "nameEn": "Australia", "fifaName": "Australia", "confederation": "AFC", "worldRank": 27, "confederationRank": 4, "points": 1580.67, "previousWorldRank": 27, "rankMovement": 0, "matches": 45 },
  { "slug": "iran", "projectCode": "IRN", "fifaCode": "IRN", "nameCn": "伊朗", "nameEn": "Iran", "fifaName": "IR Iran", "confederation": "AFC", "worldRank": 21, "confederationRank": 2, "points": 1615.3, "previousWorldRank": 20, "rankMovement": -1, "matches": 46 },
  { "slug": "iraq", "projectCode": "IRQ", "fifaCode": "IRQ", "nameCn": "伊拉克", "nameEn": "Iraq", "fifaName": "Iraq", "confederation": "AFC", "worldRank": 57, "confederationRank": 7, "points": 1447.14, "previousWorldRank": 58, "rankMovement": 1, "matches": 50 },
  { "slug": "japan", "projectCode": "JPN", "fifaCode": "JPN", "nameCn": "日本", "nameEn": "Japan", "fifaName": "Japan", "confederation": "AFC", "worldRank": 18, "confederationRank": 1, "points": 1660.43, "previousWorldRank": 19, "rankMovement": 1, "matches": 55 },
  { "slug": "jordan", "projectCode": "JOR", "fifaCode": "JOR", "nameCn": "约旦", "nameEn": "Jordan", "fifaName": "Jordan", "confederation": "AFC", "worldRank": 63, "confederationRank": 9, "points": 1391.45, "previousWorldRank": 64, "rankMovement": 1, "matches": 51 },
  { "slug": "qatar", "projectCode": "QAT", "fifaCode": "QAT", "nameCn": "卡塔尔", "nameEn": "Qatar", "fifaName": "Qatar", "confederation": "AFC", "worldRank": 55, "confederationRank": 6, "points": 1454.96, "previousWorldRank": 56, "rankMovement": 1, "matches": 57 },
  { "slug": "saudi-arabia", "projectCode": "SAU", "fifaCode": "KSA", "nameCn": "沙特阿拉伯", "nameEn": "Saudi Arabia", "fifaName": "Saudi Arabia", "confederation": "AFC", "worldRank": 61, "confederationRank": 8, "points": 1421.43, "previousWorldRank": 61, "rankMovement": 0, "matches": 62 },
  { "slug": "korea-republic", "projectCode": "KOR", "fifaCode": "KOR", "nameCn": "韩国", "nameEn": "Korea Republic", "fifaName": "Korea Republic", "confederation": "AFC", "worldRank": 25, "confederationRank": 3, "points": 1588.66, "previousWorldRank": 22, "rankMovement": -3, "matches": 56 },
  { "slug": "uzbekistan", "projectCode": "UZB", "fifaCode": "UZB", "nameCn": "乌兹别克斯坦", "nameEn": "Uzbekistan", "fifaName": "Uzbekistan", "confederation": "AFC", "worldRank": 50, "confederationRank": 5, "points": 1465.34, "previousWorldRank": 52, "rankMovement": 2, "matches": 45 },
  { "slug": "new-zealand", "projectCode": "NZL", "fifaCode": "NZL", "nameCn": "新西兰", "nameEn": "New Zealand", "fifaName": "New Zealand", "confederation": "OFC", "worldRank": 85, "confederationRank": 1, "points": 1281.57, "previousWorldRank": 85, "rankMovement": 0, "matches": 36 },
  { "slug": "austria", "projectCode": "AUT", "fifaCode": "AUT", "nameCn": "奥地利", "nameEn": "Austria", "fifaName": "Austria", "confederation": "UEFA", "worldRank": 24, "confederationRank": 13, "points": 1593.45, "previousWorldRank": 24, "rankMovement": 0, "matches": 44 },
  { "slug": "belgium", "projectCode": "BEL", "fifaCode": "BEL", "nameCn": "比利时", "nameEn": "Belgium", "fifaName": "Belgium", "confederation": "UEFA", "worldRank": 9, "confederationRank": 6, "points": 1734.71, "previousWorldRank": 9, "rankMovement": 0, "matches": 46 },
  { "slug": "bosnia-and-herzegovina", "projectCode": "BIH", "fifaCode": "BIH", "nameCn": "波黑", "nameEn": "Bosnia and Herzegovina", "fifaName": "Bosnia and Herzegovina", "confederation": "UEFA", "worldRank": 65, "confederationRank": 30, "points": 1385.84, "previousWorldRank": 71, "rankMovement": 6, "matches": 37 },
  { "slug": "croatia", "projectCode": "CRO", "fifaCode": "CRO", "nameCn": "克罗地亚", "nameEn": "Croatia", "fifaName": "Croatia", "confederation": "UEFA", "worldRank": 11, "confederationRank": 8, "points": 1717.07, "previousWorldRank": 11, "rankMovement": 0, "matches": 49 },
  { "slug": "czechia", "projectCode": "CZE", "fifaCode": "CZE", "nameCn": "捷克", "nameEn": "Czechia", "fifaName": "Czechia", "confederation": "UEFA", "worldRank": 41, "confederationRank": 21, "points": 1501.38, "previousWorldRank": 43, "rankMovement": 2, "matches": 43 },
  { "slug": "england", "projectCode": "ENG", "fifaCode": "ENG", "nameCn": "英格兰", "nameEn": "England", "fifaName": "England", "confederation": "UEFA", "worldRank": 4, "confederationRank": 3, "points": 1825.97, "previousWorldRank": 4, "rankMovement": 0, "matches": 50 },
  { "slug": "france", "projectCode": "FRA", "fifaCode": "FRA", "nameCn": "法国", "nameEn": "France", "fifaName": "France", "confederation": "UEFA", "worldRank": 1, "confederationRank": 1, "points": 1877.32, "previousWorldRank": 3, "rankMovement": 2, "matches": 50 },
  { "slug": "germany", "projectCode": "GER", "fifaCode": "GER", "nameCn": "德国", "nameEn": "Germany", "fifaName": "Germany", "confederation": "UEFA", "worldRank": 10, "confederationRank": 7, "points": 1730.37, "previousWorldRank": 10, "rankMovement": 0, "matches": 47 },
  { "slug": "netherlands", "projectCode": "NED", "fifaCode": "NED", "nameCn": "荷兰", "nameEn": "Netherlands", "fifaName": "Netherlands", "confederation": "UEFA", "worldRank": 7, "confederationRank": 5, "points": 1757.87, "previousWorldRank": 7, "rankMovement": 0, "matches": 49 },
  { "slug": "norway", "projectCode": "NOR", "fifaCode": "NOR", "nameCn": "挪威", "nameEn": "Norway", "fifaName": "Norway", "confederation": "UEFA", "worldRank": 31, "confederationRank": 14, "points": 1550.94, "previousWorldRank": 32, "rankMovement": 1, "matches": 40 },
  { "slug": "portugal", "projectCode": "POR", "fifaCode": "POR", "nameCn": "葡萄牙", "nameEn": "Portugal", "fifaName": "Portugal", "confederation": "UEFA", "worldRank": 5, "confederationRank": 4, "points": 1763.83, "previousWorldRank": 6, "rankMovement": 1, "matches": 49 },
  { "slug": "scotland", "projectCode": "SCO", "fifaCode": "SCO", "nameCn": "苏格兰", "nameEn": "Scotland", "fifaName": "Scotland", "confederation": "UEFA", "worldRank": 43, "confederationRank": 23, "points": 1498.35, "previousWorldRank": 38, "rankMovement": -5, "matches": 43 },
  { "slug": "spain", "projectCode": "ESP", "fifaCode": "ESP", "nameCn": "西班牙", "nameEn": "Spain", "fifaName": "Spain", "confederation": "UEFA", "worldRank": 2, "confederationRank": 2, "points": 1876.4, "previousWorldRank": 1, "rankMovement": -1, "matches": 49 },
  { "slug": "sweden", "projectCode": "SWE", "fifaCode": "SWE", "nameCn": "瑞典", "nameEn": "Sweden", "fifaName": "Sweden", "confederation": "UEFA", "worldRank": 38, "confederationRank": 19, "points": 1514.77, "previousWorldRank": 42, "rankMovement": 4, "matches": 43 },
  { "slug": "switzerland", "projectCode": "SUI", "fifaCode": "SUI", "nameCn": "瑞士", "nameEn": "Switzerland", "fifaName": "Switzerland", "confederation": "UEFA", "worldRank": 19, "confederationRank": 10, "points": 1649.4, "previousWorldRank": 18, "rankMovement": -1, "matches": 48 },
  { "slug": "turkiye", "projectCode": "TUR", "fifaCode": "TUR", "nameCn": "土耳其", "nameEn": "Turkiye", "fifaName": "Türkiye", "confederation": "UEFA", "worldRank": 22, "confederationRank": 12, "points": 1599.04, "previousWorldRank": 25, "rankMovement": 3, "matches": 45 },
];

export const fifaMenRankingsBySlug = new Map(fifaMenRankings.map((team) => [team.slug, team]));
export const fifaMenRankingsByProjectCode = new Map(fifaMenRankings.map((team) => [team.projectCode, team]));
export const fifaMenRankingsByFifaCode = new Map(fifaMenRankings.map((team) => [team.fifaCode, team]));

export function getFifaMenRankingByTeamKey(teamKey: string) {
  return (
    fifaMenRankingsBySlug.get(teamKey) ??
    fifaMenRankingsByProjectCode.get(teamKey.toUpperCase()) ??
    fifaMenRankingsByFifaCode.get(teamKey.toUpperCase()) ??
    null
  );
}
