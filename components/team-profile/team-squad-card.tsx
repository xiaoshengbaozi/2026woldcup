"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { localizeCoachName } from "@/lib/coach-localization";
import type { LineupPlayer } from "@/types/match";
import type { WorldCupSquadDetail } from "@/lib/world-cup-squads";

type PositionGroup = {
  key: string;
  label: string;
  positions: string[];
};

const POSITION_GROUPS: PositionGroup[] = [
  { key: "GK", label: "门将", positions: ["GK"] },
  { key: "DEF", label: "后卫", positions: ["CB", "LB", "RB", "LWB", "RWB"] },
  { key: "MID", label: "中场", positions: ["CDM", "CM", "CAM", "LM", "RM"] },
  { key: "FWD", label: "前锋", positions: ["LW", "RW", "LF", "RF", "ST", "CF"] },
];

interface TeamSquadCardProps {
  teamName: string;
  coach: string | null;
  squad: WorldCupSquadDetail | null;
  loading: boolean;
  error: string | null;
}

export function TeamSquadCard({ teamName, coach, squad, loading, error }: TeamSquadCardProps) {
  const players = squad?.players ?? [];
  const displayCoach = localizeCoachName(squad?.coach || coach) || "待更新";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-[2fr_3fr]"
    >
      <SquadSummary
        teamName={teamName}
        coach={displayCoach}
        players={players}
        officialWorldCupSquad={Boolean(squad?.officialWorldCupSquad)}
        officialStatus={squad?.officialSquad?.status ?? null}
        loading={loading}
        error={error}
      />
      <PlayerGrid players={players} loading={loading} />
    </motion.div>
  );
}

function SquadSummary({
  teamName,
  coach,
  players,
  officialWorldCupSquad,
  officialStatus,
  loading,
  error,
}: {
  teamName: string;
  coach: string;
  players: LineupPlayer[];
  officialWorldCupSquad: boolean;
  officialStatus: "imported" | "missing_official_list" | null;
  loading: boolean;
  error: string | null;
}) {
  const grouped = groupPlayersByPosition(players);
  const availableGroups = POSITION_GROUPS
    .map((group) => ({ ...group, count: grouped[group.key]?.length ?? 0 }))
    .filter((group) => group.count > 0);

  return (
    <div className="flex min-h-[320px] flex-col justify-between rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.055]">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-1 rounded-full bg-volt" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-volt">
            {officialWorldCupSquad ? "FIFA 官方最终名单" : "FIFA 官方名单待录入"}
          </span>
        </div>

        <h3 className="text-xl font-black text-white sm:text-2xl">{teamName}</h3>
        <div className="mt-4 rounded-2xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.055]">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">主教练</p>
          <p className="mt-1 text-base font-black text-white">{coach}</p>
        </div>
        <p className="mt-4 max-w-[26rem] text-sm leading-relaxed text-white/48">
          {officialWorldCupSquad
            ? "名单以 FIFA 官方名单为筛选依据，球员资料由 API-Football 补充。"
            : "暂未导入该队 FIFA 官方名单，当前不展示 API-Football 候选池。"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-volt/[0.08] px-4 py-3 ring-1 ring-volt/15">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">最终名单</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">
            {loading ? "..." : players.length || "—"}
          </p>
        </div>
        <div className="rounded-2xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.055]">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">名单状态</p>
          <p className="mt-2 text-sm font-bold text-white/78">
            {error ? "同步失败" : officialStatus === "imported" ? "已筛选" : "待录入"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {availableGroups.length ? availableGroups.map((group) => (
          <span
            key={group.key}
            className="rounded-full bg-volt/[0.08] px-3 py-1 text-[11px] font-bold text-white/65 ring-1 ring-white/[0.06]"
          >
            {group.label} {group.count}
          </span>
        )) : (
          <span className="text-sm font-semibold text-white/42">
            {loading ? "正在同步阵容数据..." : "暂无官方名单数据"}
          </span>
        )}
      </div>
    </div>
  );
}

function PlayerGrid({ players, loading }: { players: LineupPlayer[]; loading: boolean }) {
  const grouped = groupPlayersByPosition(players);
  let globalIndex = 0;

  if (loading) {
    return (
      <div className="grid place-items-center rounded-2xl bg-white/[0.025] p-8 ring-1 ring-white/[0.055]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-volt/30 border-t-volt" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {POSITION_GROUPS.map((group) => {
        const groupPlayers = grouped[group.key];
        if (!groupPlayers.length) return null;

        return (
          <div key={group.key}>
            <div className="mb-1 flex items-center gap-1.5 pl-0.5">
              <span className="inline-block h-2.5 w-1 rounded-full bg-volt/50" />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-volt/70">
                {group.label}
              </span>
              <span className="text-[9px] text-white/25">({groupPlayers.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 xl:grid-cols-4">
              {groupPlayers.map((player) => {
                const idx = globalIndex++;
                return <PlayerCell key={player.id} player={player} index={idx} />;
              })}
            </div>
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="rounded-xl bg-white/[0.035] px-4 py-8 text-center ring-1 ring-white/[0.055]">
          <p className="text-sm font-semibold text-white/72">暂无官方名单数据</p>
        </div>
      )}
    </div>
  );
}

function PlayerCell({ player, index }: { player: LineupPlayer; index: number }) {
  const href = /^\d+$/.test(player.id) ? `/players/${player.id}/` : null;
  const content = (
    <>
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full ring-1 ring-white/10 sm:h-11 sm:w-11">
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.photo} alt={player.nameEn || player.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[11px] font-black tabular-nums text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>
            {player.number ?? "—"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold leading-tight text-white/88 sm:text-[12px]">
          {player.nameCn || player.name}
        </p>
        <p className="mt-0.5 truncate text-[9px] leading-tight text-white/40 sm:text-[10px]">
          {[player.positionCn || player.position, player.number ? `${player.number}号` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.015, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.025] px-2 py-1.5 transition-all duration-200 hover:bg-white/[0.04]"
    >
      {href ? <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">{content}</Link> : content}
    </motion.div>
  );
}

function getPositionGroup(position: string): string {
  for (const group of POSITION_GROUPS) {
    if (group.positions.includes(position)) return group.key;
  }
  return "MID";
}

function groupPlayersByPosition(players: LineupPlayer[]): Record<string, LineupPlayer[]> {
  const grouped: Record<string, LineupPlayer[]> = {};
  for (const group of POSITION_GROUPS) grouped[group.key] = [];
  for (const player of players) {
    grouped[getPositionGroup(player.position)]?.push(player);
  }
  return grouped;
}
