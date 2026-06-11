import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_STAR_PATH = "C:/Users/caiyu/Desktop/star.txt";
const inputPath = process.argv[2] || DEFAULT_STAR_PATH;
const officialPath = path.join(ROOT, "data", "fifa-official-squads.json");
const outputPath = path.join(ROOT, "data", "match-star-players.json");

const TEAM_CN_TO_CODE = {
  阿根廷: "ARG",
  阿尔及利亚: "ALG",
  澳大利亚: "AUS",
  奥地利: "AUT",
  巴拉圭: "PAR",
  巴拿马: "PAN",
  巴西: "BRA",
  比利时: "BEL",
  波黑: "BIH",
  德国: "GER",
  厄瓜多尔: "ECU",
  法国: "FRA",
  佛得角: "CPV",
  哥伦比亚: "COL",
  韩国: "KOR",
  荷兰: "NED",
  加纳: "GHA",
  加拿大: "CAN",
  捷克: "CZE",
  卡塔尔: "QAT",
  库拉索: "CUW",
  墨西哥: "MEX",
  摩洛哥: "MAR",
  南非: "RSA",
  挪威: "NOR",
  葡萄牙: "POR",
  日本: "JPN",
  瑞典: "SWE",
  瑞士: "SUI",
  沙特阿拉伯: "SAU",
  塞内加尔: "SEN",
  苏格兰: "SCO",
  土耳其: "TUR",
  乌拉圭: "URU",
  乌兹别克斯坦: "UZB",
  西班牙: "ESP",
  新西兰: "NZL",
  伊拉克: "IRQ",
  伊朗: "IRN",
  意大利: "ITA",
  英格兰: "ENG",
  约旦: "JOR",
  刚果民主共和国: "COD",
  海地: "HAI",
  埃及: "EGY",
  尼日利亚: "NGA",
  美国: "USA",
  科特迪瓦: "CIV",
  象牙海岸: "CIV",
  卡达: "QAT",
};

const MANUAL_PLAYER_ALIASES = {
  "POR:C罗": "Cristiano Ronaldo",
  "POR:B费": "Bruno Fernandes",
  "ARG:梅西": "Lionel Messi",
  "JPN:远藤航等": "Wataru Endo",
};

const starText = fs.readFileSync(inputPath, "utf8");
const official = JSON.parse(fs.readFileSync(officialPath, "utf8"));

const playersByTeam = new Map(
  Object.entries(official.squads ?? {}).map(([code, squad]) => [code, squad.players ?? []])
);

const result = {
  source: "star.txt",
  sourcePath: inputPath,
  generatedAt: new Date().toISOString(),
  count: 0,
  teams: {},
};
const unmatched = [];

for (const rawLine of starText.split(/\r?\n/)) {
  const line = rawLine.trim();
  const match = line.match(/^\*\s+\*\*(.+?)\*\*.*?[:：](.+)$/);
  if (!match) continue;

  const teamName = match[1].replace(/\s*\(.+?\)\s*/g, "").trim();
  const teamCode = TEAM_CN_TO_CODE[teamName];
  if (!teamCode) {
    unmatched.push({ team: teamName, reason: "unknown_team" });
    continue;
  }

  const players = parsePlayers(match[2]);
  const officialPlayers = playersByTeam.get(teamCode) ?? [];
  const teamStars = [];

  for (const player of players) {
    const lookupName =
      MANUAL_PLAYER_ALIASES[`${teamCode}:${player.nameCn}`] ??
      (player.nameEn ? MANUAL_PLAYER_ALIASES[`${teamCode}:${player.nameEn}`] : undefined) ??
      player.nameEn ??
      player.nameCn;
    const officialPlayer = findOfficialPlayer(officialPlayers, lookupName);
    if (!officialPlayer) {
      unmatched.push({ team: teamName, code: teamCode, player: player.nameEn ?? player.nameCn, reason: "not_in_official_squad" });
      continue;
    }

    teamStars.push({
      id: typeof officialPlayer.apiFootballId === "number" ? String(officialPlayer.apiFootballId) : null,
      nameEn: officialPlayer.name,
      nameCn: player.nameCn,
      aliases: unique([
        player.nameCn,
        player.nameEn,
        lookupName,
        officialPlayer.name,
        officialPlayer.officialName,
        officialPlayer.firstNames,
        officialPlayer.lastNames,
        officialPlayer.shirtName,
        ...(officialPlayer.aliases ?? []),
      ]),
    });
  }

  if (teamStars.length) {
    result.teams[teamCode] = teamStars;
  }
}

result.count = Object.values(result.teams).reduce((sum, players) => sum + players.length, 0);

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Wrote ${result.count} star players to ${path.relative(ROOT, outputPath)}`);
if (unmatched.length) {
  console.log("Unmatched entries:");
  for (const item of unmatched) console.log(JSON.stringify(item));
}

function parsePlayers(value) {
  return value
    .split("、")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const paren = part.match(/^(.+?)\s*[（(](.+?)[）)]/);
      if (!paren) return { nameCn: stripNote(part), nameEn: null };
      const nameCn = stripNote(paren[1]);
      const rawEn = stripNote(paren[2]);
      const nameEn = /[A-Za-z]/.test(rawEn) ? rawEn : null;
      return { nameCn, nameEn };
    });
}

function findOfficialPlayer(players, name) {
  const key = normalizeName(name);
  if (!key) return null;

  return players.find((player) => {
    const keys = [
      player.name,
      player.officialName,
      player.firstNames,
      player.lastNames,
      player.shirtName,
      ...(player.aliases ?? []),
    ].map(normalizeName).filter(Boolean);

    return keys.some((candidate) =>
      candidate === key || (key.length >= 8 && candidate.includes(key)) || (candidate.length >= 8 && key.includes(candidate))
    );
  }) ?? null;
}

function stripNote(value) {
  return value.replace(/\s+-\s+.+$/, "").trim();
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}
