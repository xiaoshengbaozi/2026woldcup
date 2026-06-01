export const PLAYER_NAME_CN_BY_ID: Record<number, string> = {
  154: "利昂内尔·梅西",
  186: "孙兴慜",
  629: "凯文·德布劳内",
  762: "维尼修斯",
  1100: "埃尔林·哈兰德",
  129718: "裘德·贝林厄姆",
};

export const PLAYER_NAME_CN_BY_NAME: Record<string, string> = {
  "K. De Bruyne": "凯文·德布劳内",
  "L. Messi": "利昂内尔·梅西",
  "Vinícius Júnior": "维尼修斯",
  "K. Mbappé": "基利安·姆巴佩",
  "L. Yamal": "拉明·亚马尔",
  "Cristiano Ronaldo": "克里斯蒂亚诺·罗纳尔多",
  "Son Heung-Min": "孙兴慜",
  "M. Salah": "穆罕默德·萨拉赫",
  "E. Haaland": "埃尔林·哈兰德",
  "J. Bellingham": "裘德·贝林厄姆",
};

export function localizePlayerName(playerId: number | null | undefined, name: string) {
  if (typeof playerId === "number" && PLAYER_NAME_CN_BY_ID[playerId]) {
    return PLAYER_NAME_CN_BY_ID[playerId];
  }

  return PLAYER_NAME_CN_BY_NAME[name] ?? name;
}
