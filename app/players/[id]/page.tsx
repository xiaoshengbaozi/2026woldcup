import type { Metadata } from "next";
import playerRows from "@/data/player-translations.todo.json";
import { PlayerProfileClient } from "./player-profile-client";

type Props = {
  params: { id: string };
};

export function generateStaticParams() {
  return playerRows.rows
    .filter((row) => Number.isFinite(row.apiPlayerId))
    .map((row) => ({ id: String(row.apiPlayerId) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const name = row?.nameCn || row?.nameEn || "球员";

  return {
    title: `${name} | 2026 世界杯球员档案`,
    description: `${name} 的国家队、俱乐部、职业生涯与数据档案。`,
  };
}

export default function PlayerPage({ params }: Props) {
  const row = playerRows.rows.find((item) => String(item.apiPlayerId) === params.id);
  const nameHint = row?.nameEn || row?.nameCn || "";

  return <PlayerProfileClient playerId={params.id} nameHint={nameHint} row={row ?? null} />;
}
