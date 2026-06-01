import { getLocalizationStore, recordMissingLocalization, translate } from "./localizationStore";
import { localizePlayerName } from "./playerTranslations";

export function localizePlayer(player: any) {
  if (!player) return null;
  const nameEn = player.name ?? "";
  const playerKey = String(player.id ?? "");
  const persistedName = playerKey ? getLocalizationStore().players[playerKey] : "";
  if (playerKey && !persistedName && nameEn) recordMissingLocalization("players", playerKey, nameEn);
  const nameCn = persistedName || localizePlayerName(player.id, nameEn);

  return {
    ...player,
    name: nameCn,
    nameCn,
    nameEn,
    nationality: localizeCountry(player.nationality),
    nationalityEn: player.nationality ?? "",
    position: localizePosition(player.position),
    positionEn: player.position ?? "",
    birth: player.birth
      ? {
          ...player.birth,
          country: localizeCountry(player.birth.country),
          countryEn: player.birth.country ?? "",
          place: localizeBirthPlace(player.birth.place),
          placeEn: player.birth.place ?? "",
        }
      : player.birth,
  };
}

export function localizeTeam(team: any) {
  if (!team) return team;
  const nameEn = team.name ?? "";
  return {
    ...team,
    name: translate("clubs", nameEn),
    nameEn,
  };
}

export function localizeLeague(league: any) {
  if (!league) return league;
  const nameEn = league.name ?? "";
  return {
    ...league,
    name: translate("leagues", nameEn),
    nameEn,
    country: localizeCountry(league.country),
    countryEn: league.country ?? "",
  };
}

export function localizePosition(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("positions", normalized);
}

export function localizeTransferType(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("transferTypes", normalized);
}

export function localizeTrophyPlace(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("trophyPlaces", normalized);
}

export function localizeInjuryType(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("injuryTypes", normalized);
}

export function localizeCountry(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("countries", normalized);
}

export function localizeBirthPlace(value: string | null | undefined) {
  const normalized = value ?? "";
  return translate("birthPlaces", normalized);
}

const POSITION_TO_CN: Record<string, string> = {
  Goalkeeper: "门将",
  Defender: "后卫",
  Midfielder: "中场",
  Attacker: "前锋",
};

const TRANSFER_TYPE_TO_CN: Record<string, string> = {
  Free: "自由转会",
  Loan: "租借",
  Transfer: "转会",
  "End of loan": "租借期满",
  "N/A": "未披露",
};

const TROPHY_PLACE_TO_CN: Record<string, string> = {
  Winner: "冠军",
  "2nd Place": "亚军",
  "3rd Place": "季军",
  "4th Place": "第四名",
};

const INJURY_TYPE_TO_CN: Record<string, string> = {
  Hamstring: "腿筋伤势",
  "Groin Injury": "腹股沟伤势",
  "Ankle Injury": "脚踝伤势",
  "Knee Injury": "膝盖伤势",
  "Muscle Injury": "肌肉伤势",
  "Calf Injury": "小腿伤势",
  "Thigh Injury": "大腿伤势",
  Rest: "轮休",
  Illness: "疾病",
};

const COUNTRY_TO_CN: Record<string, string> = {
  Argentina: "阿根廷",
  Australia: "澳大利亚",
  Belgium: "比利时",
  Brazil: "巴西",
  Canada: "加拿大",
  Colombia: "哥伦比亚",
  Croatia: "克罗地亚",
  Denmark: "丹麦",
  England: "英格兰",
  France: "法国",
  Germany: "德国",
  Ghana: "加纳",
  Iran: "伊朗",
  Japan: "日本",
  Mexico: "墨西哥",
  Morocco: "摩洛哥",
  Netherlands: "荷兰",
  Norway: "挪威",
  Portugal: "葡萄牙",
  Senegal: "塞内加尔",
  Spain: "西班牙",
  Switzerland: "瑞士",
  Uruguay: "乌拉圭",
  USA: "美国",
  World: "世界",
  "N/C America": "中北美及加勒比地区",
};

const TEAM_NAME_TO_CN: Record<string, string> = {
  "Inter Miami": "迈阿密国际",
  "Inter Miami CF": "迈阿密国际",
  "Real Madrid": "皇家马德里",
  Barcelona: "巴塞罗那",
  "Paris Saint Germain": "巴黎圣日耳曼",
  "Manchester City": "曼城",
  "Manchester United": "曼联",
  Liverpool: "利物浦",
  Arsenal: "阿森纳",
  Chelsea: "切尔西",
  "Bayern München": "拜仁慕尼黑",
  "Bayern Munich": "拜仁慕尼黑",
  "Borussia Dortmund": "多特蒙德",
  "Al-Nassr": "利雅得胜利",
  "Al-Hilal Saudi FC": "利雅得新月",
};

const LEAGUE_NAME_TO_CN: Record<string, string> = {
  "Major League Soccer": "美国职业足球大联盟",
  "FIFA Club World Cup": "国际足联俱乐部世界杯",
  "CONCACAF Champions League": "中北美及加勒比冠军杯",
  "Leagues Cup": "联盟杯",
  "Friendlies Clubs": "俱乐部友谊赛",
  "US Open Cup": "美国公开杯",
  "CONMEBOL Copa America": "美洲杯",
  "CONMEBOL/UEFA Finalissima": "欧美杯",
  "FIFA World Cup": "世界杯",
  "Trophée des Champions": "法国超级杯",
  "Ligue 1": "法甲",
  "La Liga": "西甲",
  "UEFA Champions League": "欧冠",
  "UEFA Super Cup": "欧洲超级杯",
  "Super Cup": "超级杯",
  "Copa del Rey": "西班牙国王杯",
};

const BIRTH_PLACE_TO_CN: Record<string, string> = {
  Rosario: "罗萨里奥",
  Paris: "巴黎",
  "Rio de Janeiro": "里约热内卢",
  Mogi: "莫日",
};
