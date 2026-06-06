import type { Metadata } from "next";
import playerRows from "@/data/player-translations.todo.json";
import playerArticles from "@/data/player-articles.json";
import fifaOfficialSquads from "@/data/fifa-official-squads.json";
import playerNameTranslations from "@/data/localization/players.json";
import { findPlayerBreakthroughProfile } from "@/lib/player-breakthroughs";
import { getApiSportsPlayerPhoto } from "@/lib/player-photo-overrides";
import { localizeCountryCode } from "@/lib/team-localization";
import { PlayerProfileClient } from "./player-profile-client";

type Props = {
  params: { id: string };
};

type PlayerPageRow = {
  apiPlayerId: number | null;
  teamCode: string;
  countryCn: string;
  nameEn: string;
  nameCn: string;
  positionCn: string;
  number: number | null;
  photo: string;
};

const PLAYER_NAME_TRANSLATIONS = playerNameTranslations as Record<string, string>;

const countryNameCn: Record<string, string> = {
  Argentina: "阿根廷",
  Norway: "挪威",
  France: "法国",
  Egypt: "埃及",
  Brazil: "巴西",
  England: "英格兰",
  Spain: "西班牙",
  Uruguay: "乌拉圭",
  Portugal: "葡萄牙",
  Belgium: "比利时",
  Colombia: "哥伦比亚",
  Germany: "德国",
  Croatia: "克罗地亚",
  USA: "美国",
  Algeria: "阿尔及利亚",
  Senegal: "塞内加尔",
  Ecuador: "厄瓜多尔",
  Turkey: "土耳其",
  "Côte d'Ivoire": "科特迪瓦",
};

export function generateStaticParams() {
  const rowParams = playerRows.rows
    .filter((row) => Number.isFinite(row.apiPlayerId))
    .map((row) => ({ id: String(row.apiPlayerId) }));
  const articleParams = playerArticles.players.map((player) => ({ id: String(player.apiPlayerId) }));
  const officialSquadParams = getOfficialSquadRows().map((row) => ({ id: String(row.apiPlayerId) }));
  const translatedPlayerParams = Object.keys(PLAYER_NAME_TRANSLATIONS)
    .filter((id) => /^\d+$/.test(id))
    .map((id) => ({ id }));

  return [...rowParams, ...articleParams, ...officialSquadParams, ...translatedPlayerParams].filter(
    (param, index, params) => params.findIndex((item) => item.id === param.id) === index
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const article = playerArticles.players.find((item) => String(item.apiPlayerId) === params.id);
  const officialRow = getOfficialSquadRow(params.id);
  const translatedRow = getTranslatedPlayerRow(params.id);
  const name = officialRow?.nameCn || article?.nameCn || row?.nameCn || translatedRow?.nameCn || row?.nameEn || officialRow?.nameEn || "球员";

  return {
    title: `${name} | 2026 世界杯球员档案`,
    description: `${name} 的国家队、俱乐部、职业生涯与数据档案。`,
  };
}

export default function PlayerPage({ params }: Props) {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const article = playerArticles.players.find((item) => String(item.apiPlayerId) === params.id);
  const officialRow = getOfficialSquadRow(params.id);
  const translatedRow = getTranslatedPlayerRow(params.id);
  const articleRow = article
    ? {
        apiPlayerId: article.apiPlayerId,
        teamCode: article.teamCode,
        countryCn: countryNameCn[article.countryCn] || countryNameCn[article.countryEn] || article.countryCn,
        nameEn: article.nameEn,
        nameCn: article.nameCn,
        positionCn: article.position || "位置待更新",
        number: null,
        photo: article.photo,
      }
    : null;
  const nameHint = row?.nameEn || article?.nameEn || officialRow?.nameEn || row?.nameCn || article?.nameCn || officialRow?.nameCn || translatedRow?.nameCn || "";
  const pageRow = mergeOfficialSquadRow(row ?? articleRow ?? translatedRow, officialRow);
  const breakthrough = findPlayerBreakthroughProfile({
    names: [
      pageRow?.nameEn,
      officialRow?.nameEn,
      article?.nameEn,
      row?.nameEn,
      nameHint,
      pageRow?.nameCn,
      officialRow?.nameCn,
      article?.nameCn,
      row?.nameCn,
    ],
    teamCode: pageRow?.teamCode || officialRow?.teamCode || article?.teamCode || row?.teamCode,
  });

  return <PlayerProfileClient playerId={params.id} nameHint={nameHint} row={pageRow} article={article ?? null} breakthrough={breakthrough} />;
}

function mergeOfficialSquadRow(baseRow: PlayerPageRow | null, officialRow: PlayerPageRow | null): PlayerPageRow | null {
  if (!officialRow) return baseRow;
  return {
    ...(baseRow ?? officialRow),
    ...officialRow,
    photo: baseRow?.photo || officialRow.photo,
  };
}

function getOfficialSquadRow(playerId: string) {
  return getOfficialSquadRows().find((row) => String(row.apiPlayerId) === playerId) ?? null;
}

function getTranslatedPlayerRow(playerId: string): PlayerPageRow | null {
  const nameCn = PLAYER_NAME_TRANSLATIONS[playerId];
  if (!nameCn || !/^\d+$/.test(playerId)) return null;
  const apiPlayerId = Number(playerId);
  return {
    apiPlayerId,
    teamCode: "",
    countryCn: "",
    nameEn: "",
    nameCn,
    positionCn: "位置待更新",
    number: null,
    photo: getApiSportsPlayerPhoto(apiPlayerId),
  };
}

function getOfficialSquadRows() {
  return Object.entries(fifaOfficialSquads.squads ?? {}).flatMap(([teamCode, squad]) =>
    (squad.players ?? [])
      .filter((player) => Number.isFinite(player.apiFootballId))
      .map((player) => {
        const apiPlayerId = player.apiFootballId ?? null;
        return {
          apiPlayerId,
          teamCode,
          countryCn: localizeCountryCode(teamCode),
          nameEn: player.name,
          nameCn: (apiPlayerId ? PLAYER_NAME_TRANSLATIONS[String(apiPlayerId)] : "") || player.name,
          positionCn: localizeOfficialPosition(player.position),
          number: player.number ?? null,
          photo: getApiSportsPlayerPhoto(apiPlayerId),
        };
      })
  );
}

function localizeOfficialPosition(position: string | null | undefined) {
  if (position === "GK") return "门将";
  if (position === "DF") return "后卫";
  if (position === "MF") return "中场";
  if (position === "FW") return "前锋";
  return "位置待更新";
}
