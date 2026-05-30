export const topScorers = [
  { name: "姆巴佩", nation: "法国", flag: "https://flagcdn.com/w160/fr.png", goals: 0 },
  { name: "亚马尔", nation: "西班牙", flag: "https://flagcdn.com/w160/es.png", goals: 0 },
  { name: "维尼修斯", nation: "巴西", flag: "https://flagcdn.com/w160/br.png", goals: 0 },
  { name: "凯恩", nation: "英格兰", flag: "https://flagcdn.com/w160/gb-eng.png", goals: 0 },
  { name: "哈兰德", nation: "挪威", flag: "https://flagcdn.com/w160/no.png", goals: 0 }
];

export const liveMatches = [
  { group: "A 组", homeFlag: "https://flagcdn.com/w160/br.png", homeCode: "巴西", homeName: "巴西", awayFlag: "https://flagcdn.com/w160/ar.png", awayCode: "阿根廷", awayName: "阿根廷", homeScore: 2, awayScore: 1, minute: "72'", status: "live" as const },
  { group: "B 组", homeFlag: "https://flagcdn.com/w160/gb-eng.png", homeCode: "英格兰", homeName: "英格兰", awayFlag: "https://flagcdn.com/w160/fr.png", awayCode: "法国", awayName: "法国", homeScore: 1, awayScore: 1, minute: "45+2'", status: "live" as const },
  { group: "C 组", homeFlag: "https://flagcdn.com/w160/pt.png", homeCode: "葡萄牙", homeName: "葡萄牙", awayFlag: "https://flagcdn.com/w160/gh.png", awayCode: "加纳", awayName: "加纳", homeScore: 3, awayScore: 0, minute: "68'", status: "live" as const },
  { group: "D 组", homeFlag: "https://flagcdn.com/w160/nl.png", homeCode: "荷兰", homeName: "荷兰", awayFlag: "https://flagcdn.com/w160/us.png", awayCode: "美国", awayName: "美国", homeScore: 0, awayScore: 0, minute: "HT", status: "ht" as const },
];

export type LiveMatch = (typeof liveMatches)[number];
