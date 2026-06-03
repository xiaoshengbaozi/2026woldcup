import type { Metadata } from "next";
import playerRows from "@/data/player-translations.todo.json";
import playerArticles from "@/data/player-articles.json";
import { PlayerProfileClient } from "./player-profile-client";

type Props = {
  params: { id: string };
};

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

  return [...rowParams, ...articleParams].filter(
    (param, index, params) => params.findIndex((item) => item.id === param.id) === index
  );
}

export function generateMetadata({ params }: Props): Metadata {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const article = playerArticles.players.find((item) => String(item.apiPlayerId) === params.id);
  const name = article?.nameCn || row?.nameCn || row?.nameEn || "球员";

  return {
    title: `${name} | 2026 世界杯球员档案`,
    description: `${name} 的国家队、俱乐部、职业生涯与数据档案。`,
  };
}

export default function PlayerPage({ params }: Props) {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const article = playerArticles.players.find((item) => String(item.apiPlayerId) === params.id);
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
  const nameHint = row?.nameEn || article?.nameEn || row?.nameCn || article?.nameCn || "";

  return <PlayerProfileClient playerId={params.id} nameHint={nameHint} row={row ?? articleRow ?? null} article={article ?? null} />;
}
