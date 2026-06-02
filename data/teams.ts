export type TeamContinent = "north-america" | "south-america" | "africa" | "asia-oceania" | "europe";

export interface QualifiedTeamCard {
  slug: string;
  code: string;
  nameCn: string;
  nameEn: string;
  continent: TeamContinent;
  confederation: string;
  cover: string;
  detailHref: string;
}

export const teamContinentLabels: Record<TeamContinent, { title: string; eyebrow: string }> = {
  "north-america": { title: "北美洲", eyebrow: "CONCACAF" },
  "south-america": { title: "南美洲", eyebrow: "CONMEBOL" },
  africa: { title: "非洲", eyebrow: "CAF" },
  "asia-oceania": { title: "亚洲及大洋洲", eyebrow: "AFC / OFC" },
  europe: { title: "欧洲", eyebrow: "UEFA" },
};

export const continentOrder: TeamContinent[] = [
  "north-america",
  "south-america",
  "africa",
  "asia-oceania",
  "europe",
];

const qualifiedTeamBase: QualifiedTeamCard[] = [
  { slug: "canada", code: "CAN", nameCn: "加拿大", nameEn: "Canada", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/canada.svg", detailHref: "/teams/canada" },
  { slug: "mexico", code: "MEX", nameCn: "墨西哥", nameEn: "Mexico", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/mexico.svg", detailHref: "/teams/mexico" },
  { slug: "united-states", code: "USA", nameCn: "美国", nameEn: "United States", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/united-states.svg", detailHref: "/teams/united-states" },
  { slug: "haiti", code: "HAI", nameCn: "海地", nameEn: "Haiti", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/haiti.svg", detailHref: "/teams/haiti" },
  { slug: "curacao", code: "CUW", nameCn: "库拉索", nameEn: "Curacao", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/curacao.svg", detailHref: "/teams/curacao" },
  { slug: "panama", code: "PAN", nameCn: "巴拿马", nameEn: "Panama", continent: "north-america", confederation: "CONCACAF", cover: "/team-covers/panama.svg", detailHref: "/teams/panama" },

  { slug: "argentina", code: "ARG", nameCn: "阿根廷", nameEn: "Argentina", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/argentina.svg", detailHref: "/teams/argentina" },
  { slug: "brazil", code: "BRA", nameCn: "巴西", nameEn: "Brazil", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/brazil.svg", detailHref: "/teams/brazil" },
  { slug: "colombia", code: "COL", nameCn: "哥伦比亚", nameEn: "Colombia", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/colombia.svg", detailHref: "/teams/colombia" },
  { slug: "ecuador", code: "ECU", nameCn: "厄瓜多尔", nameEn: "Ecuador", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/ecuador.svg", detailHref: "/teams/ecuador" },
  { slug: "paraguay", code: "PAR", nameCn: "巴拉圭", nameEn: "Paraguay", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/paraguay.svg", detailHref: "/teams/paraguay" },
  { slug: "uruguay", code: "URU", nameCn: "乌拉圭", nameEn: "Uruguay", continent: "south-america", confederation: "CONMEBOL", cover: "/team-covers/uruguay.svg", detailHref: "/teams/uruguay" },

  { slug: "algeria", code: "DZA", nameCn: "阿尔及利亚", nameEn: "Algeria", continent: "africa", confederation: "CAF", cover: "/team-covers/algeria.svg", detailHref: "/teams/algeria" },
  { slug: "morocco", code: "MAR", nameCn: "摩洛哥", nameEn: "Morocco", continent: "africa", confederation: "CAF", cover: "/team-covers/morocco.svg", detailHref: "/teams/morocco" },
  { slug: "south-africa", code: "RSA", nameCn: "南非", nameEn: "South Africa", continent: "africa", confederation: "CAF", cover: "/team-covers/south-africa.svg", detailHref: "/teams/south-africa" },
  { slug: "cape-verde", code: "CPV", nameCn: "佛得角", nameEn: "Cabo Verde", continent: "africa", confederation: "CAF", cover: "/team-covers/cape-verde.svg", detailHref: "/teams/cape-verde" },
  { slug: "ivory-coast", code: "CIV", nameCn: "科特迪瓦", nameEn: "Cote d'Ivoire", continent: "africa", confederation: "CAF", cover: "/team-covers/ivory-coast.svg", detailHref: "/teams/ivory-coast" },
  { slug: "dr-congo", code: "COD", nameCn: "刚果民主共和国", nameEn: "DR Congo", continent: "africa", confederation: "CAF", cover: "/team-covers/dr-congo.svg", detailHref: "/teams/dr-congo" },
  { slug: "egypt", code: "EGY", nameCn: "埃及", nameEn: "Egypt", continent: "africa", confederation: "CAF", cover: "/team-covers/egypt.svg", detailHref: "/teams/egypt" },
  { slug: "ghana", code: "GHA", nameCn: "加纳", nameEn: "Ghana", continent: "africa", confederation: "CAF", cover: "/team-covers/ghana.svg", detailHref: "/teams/ghana" },
  { slug: "senegal", code: "SEN", nameCn: "塞内加尔", nameEn: "Senegal", continent: "africa", confederation: "CAF", cover: "/team-covers/senegal.svg", detailHref: "/teams/senegal" },
  { slug: "tunisia", code: "TUN", nameCn: "突尼斯", nameEn: "Tunisia", continent: "africa", confederation: "CAF", cover: "/team-covers/tunisia.svg", detailHref: "/teams/tunisia" },

  { slug: "australia", code: "AUS", nameCn: "澳大利亚", nameEn: "Australia", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/australia.svg", detailHref: "/teams/australia" },
  { slug: "iran", code: "IRN", nameCn: "伊朗", nameEn: "Iran", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/iran.svg", detailHref: "/teams/iran" },
  { slug: "iraq", code: "IRQ", nameCn: "伊拉克", nameEn: "Iraq", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/iraq.svg", detailHref: "/teams/iraq" },
  { slug: "japan", code: "JPN", nameCn: "日本", nameEn: "Japan", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/japan.svg", detailHref: "/teams/japan" },
  { slug: "jordan", code: "JOR", nameCn: "约旦", nameEn: "Jordan", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/jordan.svg", detailHref: "/teams/jordan" },
  { slug: "qatar", code: "QAT", nameCn: "卡塔尔", nameEn: "Qatar", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/qatar.svg", detailHref: "/teams/qatar" },
  { slug: "saudi-arabia", code: "SAU", nameCn: "沙特阿拉伯", nameEn: "Saudi Arabia", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/saudi-arabia.svg", detailHref: "/teams/saudi-arabia" },
  { slug: "korea-republic", code: "KOR", nameCn: "韩国", nameEn: "Korea Republic", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/korea-republic.svg", detailHref: "/teams/korea-republic" },
  { slug: "uzbekistan", code: "UZB", nameCn: "乌兹别克斯坦", nameEn: "Uzbekistan", continent: "asia-oceania", confederation: "AFC", cover: "/team-covers/uzbekistan.svg", detailHref: "/teams/uzbekistan" },
  { slug: "new-zealand", code: "NZL", nameCn: "新西兰", nameEn: "New Zealand", continent: "asia-oceania", confederation: "OFC", cover: "/team-covers/new-zealand.svg", detailHref: "/teams/new-zealand" },

  { slug: "austria", code: "AUT", nameCn: "奥地利", nameEn: "Austria", continent: "europe", confederation: "UEFA", cover: "/team-covers/austria.svg", detailHref: "/teams/austria" },
  { slug: "belgium", code: "BEL", nameCn: "比利时", nameEn: "Belgium", continent: "europe", confederation: "UEFA", cover: "/team-covers/belgium.svg", detailHref: "/teams/belgium" },
  { slug: "bosnia-and-herzegovina", code: "BIH", nameCn: "波黑", nameEn: "Bosnia and Herzegovina", continent: "europe", confederation: "UEFA", cover: "/team-covers/bosnia-and-herzegovina.svg", detailHref: "/teams/bosnia-and-herzegovina" },
  { slug: "croatia", code: "CRO", nameCn: "克罗地亚", nameEn: "Croatia", continent: "europe", confederation: "UEFA", cover: "/team-covers/croatia.svg", detailHref: "/teams/croatia" },
  { slug: "czechia", code: "CZE", nameCn: "捷克", nameEn: "Czechia", continent: "europe", confederation: "UEFA", cover: "/team-covers/czechia.svg", detailHref: "/teams/czechia" },
  { slug: "england", code: "ENG", nameCn: "英格兰", nameEn: "England", continent: "europe", confederation: "UEFA", cover: "/team-covers/england.svg", detailHref: "/teams/england" },
  { slug: "france", code: "FRA", nameCn: "法国", nameEn: "France", continent: "europe", confederation: "UEFA", cover: "/team-covers/france.svg", detailHref: "/teams/france" },
  { slug: "germany", code: "GER", nameCn: "德国", nameEn: "Germany", continent: "europe", confederation: "UEFA", cover: "/team-covers/germany.svg", detailHref: "/teams/germany" },
  { slug: "netherlands", code: "NED", nameCn: "荷兰", nameEn: "Netherlands", continent: "europe", confederation: "UEFA", cover: "/team-covers/netherlands.svg", detailHref: "/teams/netherlands" },
  { slug: "norway", code: "NOR", nameCn: "挪威", nameEn: "Norway", continent: "europe", confederation: "UEFA", cover: "/team-covers/norway.svg", detailHref: "/teams/norway" },
  { slug: "portugal", code: "POR", nameCn: "葡萄牙", nameEn: "Portugal", continent: "europe", confederation: "UEFA", cover: "/team-covers/portugal.svg", detailHref: "/teams/portugal" },
  { slug: "scotland", code: "SCO", nameCn: "苏格兰", nameEn: "Scotland", continent: "europe", confederation: "UEFA", cover: "/team-covers/scotland.svg", detailHref: "/teams/scotland" },
  { slug: "spain", code: "ESP", nameCn: "西班牙", nameEn: "Spain", continent: "europe", confederation: "UEFA", cover: "/team-covers/spain.svg", detailHref: "/teams/spain" },
  { slug: "sweden", code: "SWE", nameCn: "瑞典", nameEn: "Sweden", continent: "europe", confederation: "UEFA", cover: "/team-covers/sweden.svg", detailHref: "/teams/sweden" },
  { slug: "switzerland", code: "SUI", nameCn: "瑞士", nameEn: "Switzerland", continent: "europe", confederation: "UEFA", cover: "/team-covers/switzerland.svg", detailHref: "/teams/switzerland" },
  { slug: "turkiye", code: "TUR", nameCn: "土耳其", nameEn: "Turkiye", continent: "europe", confederation: "UEFA", cover: "/team-covers/turkiye.svg", detailHref: "/teams/turkiye" },
];

export const qualifiedTeams: QualifiedTeamCard[] = qualifiedTeamBase.map((team) => ({
  ...team,
  cover: `/team-covers/fifa-profiles/${team.slug}.jpg`,
}));

export function getQualifiedTeam(slug: string) {
  return qualifiedTeams.find((team) => team.slug === slug);
}
