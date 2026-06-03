"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail, LineupPlayer } from "@/types/match";

/* ─────────────────────────────────────────────
   Formation pitch layouts  [x%, y%]
   ───────────────────────────────────────────── */

const FORMATION_LAYOUTS: Record<string, Array<{ x: number; y: number }>> = {
  "4-3-3": [
    { x: 50, y: 88 }, { x: 16, y: 74 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 74 },
    { x: 30, y: 54 }, { x: 50, y: 52 }, { x: 70, y: 54 },
    { x: 18, y: 34 }, { x: 50, y: 28 }, { x: 82, y: 34 },
  ],
  "4-2-3-1": [
    { x: 50, y: 88 }, { x: 16, y: 74 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 74 },
    { x: 36, y: 58 }, { x: 64, y: 58 },
    { x: 18, y: 42 }, { x: 50, y: 40 }, { x: 82, y: 42 },
    { x: 50, y: 24 },
  ],
  "3-5-2": [
    { x: 50, y: 88 }, { x: 25, y: 74 }, { x: 50, y: 74 }, { x: 75, y: 74 },
    { x: 8, y: 56 }, { x: 32, y: 56 }, { x: 50, y: 50 }, { x: 68, y: 56 }, { x: 92, y: 56 },
    { x: 36, y: 30 }, { x: 64, y: 30 },
  ],
  "4-4-2": [
    { x: 50, y: 88 }, { x: 16, y: 74 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 74 },
    { x: 16, y: 52 }, { x: 38, y: 52 }, { x: 62, y: 52 }, { x: 84, y: 52 },
    { x: 36, y: 30 }, { x: 64, y: 30 },
  ],
  "4-1-4-1": [
    { x: 50, y: 88 }, { x: 16, y: 74 }, { x: 38, y: 74 }, { x: 62, y: 74 }, { x: 84, y: 74 },
    { x: 50, y: 60 },
    { x: 16, y: 44 }, { x: 38, y: 44 }, { x: 62, y: 44 }, { x: 84, y: 44 },
    { x: 50, y: 26 },
  ],
};

function getLayout(formation: string) {
  return FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-3-3"];
}

/* ═══════════════════════════════════════════════
   Main Lineup Component
   ═══════════════════════════════════════════════ */

export function MatchLineup({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");

  const currentLineup = activeSide === "home" ? detail.homeLineup : detail.awayLineup;
  const currentTeamName = activeSide === "home" ? teams.home.name : teams.away.name;
  const isSquadList = currentLineup.listType === "squad_pool" || currentLineup.listType === "final_squad";
  const isHome = activeSide === "home";

  const accentHex = isHome ? "#D8FF3E" : "#FF9A1F";
  const accentDark = isHome ? "#8BA824" : "#CC7C19";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />

      {/* Team Tabs */}
      <div className="relative flex items-center gap-0 border-b border-white/[0.06]">
        {(["home", "away"] as const).map((side) => {
          const label = side === "home" ? teams.home.name : teams.away.name;
          const active = activeSide === side;
          const hex = side === "home" ? "#D8FF3E" : "#FF9A1F";

          return (
            <button
              key={side}
              onClick={() => setActiveSide(side)}
              className="relative flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors sm:py-4 sm:text-base"
              style={{ color: active ? hex : "rgba(255,255,255,0.4)" }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hex, opacity: active ? 1 : 0.3 }} />
              <span className="uppercase tracking-wide">{label}</span>
              {active && (
                <motion.span
                  layoutId="lineup-tab-indicator"
                  className="absolute inset-x-0 bottom-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${hex}, transparent)` }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSide}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="relative grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-[2fr_3fr]"
        >
          {isSquadList ? (
            <SquadPoolSummary
              teamName={currentTeamName}
              players={currentLineup.players}
              officialWorldCupSquad={Boolean(currentLineup.officialWorldCupSquad)}
              accentHex={accentHex}
              accentFrom={isHome ? "rgba(216,255,62," : "rgba(255,154,31,"}
            />
          ) : (
            <FormationPitch
              players={currentLineup.players}
              formation={currentLineup.formation}
              accentHex={accentHex}
              accentDark={accentDark}
            />
          )}

          {/* Right: Player List — 5 per row horizontal grid */}
          <PlayerGrid
            players={currentLineup.players}
            accentHex={accentHex}
            accentFrom={isHome ? "rgba(216,255,62," : "rgba(255,154,31,"}
          />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   Formation Pitch (left side)
   ═══════════════════════════════════════════════ */

function FormationPitch({
  players, formation, accentHex, accentDark,
}: {
  players: LineupPlayer[]; formation: string; accentHex: string; accentDark: string;
}) {
  const layout = getLayout(formation);
  const starters = players.filter((p) => p.isStarter).slice(0, 11);
  const accentFrom = accentHex === "#D8FF3E" ? "rgba(216,255,62," : "rgba(255,154,31,";

  return (
    <div className="flex flex-col items-center">
      {/* Formation badge */}
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-1 rounded-full" style={{ backgroundColor: accentHex }} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]"
          style={{ color: accentHex }}
        >
          阵型
        </span>
        <span className="rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider"
          style={{
            background: `linear-gradient(135deg, ${accentFrom}0.18), ${accentFrom}0.08))`,
            color: accentHex,
            border: `1px solid ${accentFrom}0.25)`,
          }}
        >
          {formation}
        </span>
      </div>

      {/* Pitch */}
      <div className="w-full max-w-[320px]">
        <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "68 / 105" }}>
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a5c2a] via-[#1d6b30] to-[#1a5c2a]" />
          {/* Grass stripes */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="absolute inset-x-0"
                style={{
                  top: `${(i / 12) * 100}%`, height: `${(1 / 12) * 100 + 0.5}%`,
                  background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
                }}
              />
            ))}
          </div>

          {/* SVG markings */}
          <svg viewBox="0 0 680 1050" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <rect x="40" y="30" width="600" height="990" rx="4" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
            <line x1="40" y1="525" x2="640" y2="525" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            <circle cx="340" cy="525" r="91.5" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
            <circle cx="340" cy="525" r="5" fill="rgba(255,255,255,0.4)" />
            <rect x="138" y="30" width="404" height="165" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <rect x="218" y="30" width="244" height="55" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <circle cx="340" cy="142.5" r="4" fill="rgba(255,255,255,0.35)" />
            <path d="M 260 195 Q 340 165 420 195" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <rect x="278" y="10" width="124" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
            <rect x="138" y="855" width="404" height="165" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <rect x="218" y="965" width="244" height="55" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
            <circle cx="340" cy="907.5" r="4" fill="rgba(255,255,255,0.35)" />
            <path d="M 260 855 Q 340 885 420 855" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" />
            <rect x="278" y="1020" width="124" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
            <path d="M 40 48 Q 55 30 72 30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M 608 30 Q 625 30 640 48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M 40 1002 Q 55 1020 72 1020" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M 608 1020 Q 625 1020 640 1002" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
          </svg>

          {/* Team tint */}
          <div className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 50% 30%, ${accentFrom}0.06), transparent 65%)` }}
          />

          {/* Players */}
          {starters.map((player, i) => {
            const coord = layout[i] ?? { x: 50, y: 50 };
            const isGK = player.position === "GK";
            const isCapt = player.isCaptain;
            const x = 4 + (coord.x / 100) * 92;
            const y = 3 + (coord.y / 100) * 94;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.08 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="flex h-[32px] w-[32px] items-center justify-center sm:h-[38px] sm:w-[38px]"
                      style={{
                        background: isGK
                          ? "linear-gradient(135deg, #2ecc71 0%, #1a8a4a 100%)"
                          : `linear-gradient(135deg, ${accentHex} 0%, ${accentDark} 100%)`,
                        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                      }}
                    >
                      <span className="relative z-10 text-[11px] font-black tabular-nums text-white sm:text-[13px]"
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)", fontFamily: "ScreenMatrix, monospace" }}
                      >
                        {player.number ?? "—"}
                      </span>
                    </div>
                    {isCapt && (
                      <div className="absolute -right-1 -top-1 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full sm:h-4 sm:w-4"
                        style={{ background: "linear-gradient(135deg, #FFD700, #FFA000)", boxShadow: "0 1px 6px rgba(255,215,0,0.5)" }}
                      >
                        <span className="text-[6px] font-black text-black sm:text-[7px]">C</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-0.5 max-w-[60px] truncate text-center text-[8px] font-semibold leading-tight text-white/80 sm:max-w-[70px] sm:text-[9px]"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {player.name}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SquadPoolSummary({
  teamName, players, officialWorldCupSquad, accentHex, accentFrom,
}: {
  teamName: string; players: LineupPlayer[]; officialWorldCupSquad: boolean; accentHex: string; accentFrom: string;
}) {
  const grouped = groupPlayersByPosition(players);
  const availableGroups = POSITION_GROUPS
    .map((group) => ({ ...group, count: grouped[group.key]?.length ?? 0 }))
    .filter((group) => group.count > 0);

  return (
    <div className="flex min-h-[320px] flex-col justify-between rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/[0.055]">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-1 rounded-full" style={{ backgroundColor: accentHex }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accentHex }}>
            {officialWorldCupSquad ? "FIFA 官方最终名单" : "FIFA 官方名单待录入"}
          </span>
        </div>

        <h3 className="text-xl font-black text-white sm:text-2xl">{teamName}</h3>
        <p className="mt-2 max-w-[26rem] text-sm leading-relaxed text-white/48">
          {officialWorldCupSquad
            ? "名单以 FIFA 官方名单为筛选依据，球员资料由 API-Football 补充。"
            : "暂未导入该队 FIFA 官方名单，当前不展示 API-Football 候选池。"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <div
          className="rounded-2xl px-4 py-3 ring-1 ring-white/[0.055]"
          style={{ background: `linear-gradient(135deg, ${accentFrom}0.14), rgba(255,255,255,0.025))` }}
        >
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">最终名单</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{players.length || "—"}</p>
        </div>
        <div className="rounded-2xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.055]">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">名单状态</p>
          <p className="mt-2 text-sm font-bold text-white/78">{officialWorldCupSquad ? "已筛选" : "待录入"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {availableGroups.length ? availableGroups.map((group) => (
          <span
            key={group.key}
            className="rounded-full px-3 py-1 text-[11px] font-bold text-white/65 ring-1 ring-white/[0.06]"
            style={{ background: `${accentFrom}0.08)` }}
          >
            {group.label} {group.count}
          </span>
        )) : (
          <span className="text-sm font-semibold text-white/42">暂无官方名单数据</span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Player Grid — grouped by position
   ═══════════════════════════════════════════════ */

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

function getPositionGroup(position: string): string {
  for (const group of POSITION_GROUPS) {
    if (group.positions.includes(position)) return group.key;
  }
  return "MID";
}

function groupPlayersByPosition(players: LineupPlayer[]): Record<string, LineupPlayer[]> {
  const grouped: Record<string, LineupPlayer[]> = {};
  for (const group of POSITION_GROUPS) {
    grouped[group.key] = [];
  }
  for (const player of players) {
    const groupKey = getPositionGroup(player.position);
    grouped[groupKey]?.push(player);
  }
  return grouped;
}

function PlayerGrid({
  players, accentHex, accentFrom,
}: {
  players: LineupPlayer[]; accentHex: string; accentFrom: string;
}) {
  const grouped = groupPlayersByPosition(players);

  let globalIndex = 0;

  return (
    <div className="flex flex-col gap-2.5">
      {POSITION_GROUPS.map((group) => {
        const groupPlayers = grouped[group.key];
        if (!groupPlayers.length) return null;

        return (
          <div key={group.key}>
            <div className="mb-1 flex items-center gap-1.5 pl-0.5">
              <span className="inline-block h-2.5 w-1 rounded-full" style={{ backgroundColor: accentHex, opacity: 0.5 }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: `${accentHex}99` }}>
                {group.label}
              </span>
              <span className="text-[9px] text-white/25">({groupPlayers.length})</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {groupPlayers.map((player) => {
                const idx = globalIndex++;
                return (
                  <PlayerCell key={player.id} player={player} accentHex={accentHex} accentFrom={accentFrom} index={idx} />
                );
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

/* ═══════════════════════════════════════════════
   Player Cell — single card in the 5-col grid
   ═══════════════════════════════════════════════ */

function PlayerCell({
  player, accentHex, accentFrom, index,
}: {
  player: LineupPlayer; accentHex: string; accentFrom: string; index: number;
}) {
  const isGK = player.position === "GK";
  const isCapt = player.isCaptain;
  const href = /^\d+$/.test(player.id)
    ? `/players/${player.id}/`
    : null;
  const content = (
    <>
      <div
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full ring-1 sm:h-11 sm:w-11"
        style={{
          background: isGK
            ? "linear-gradient(135deg, rgba(46,204,113,0.2), rgba(26,138,74,0.15))"
            : `linear-gradient(135deg, ${accentFrom}0.18), ${accentFrom}0.08))`,
          borderColor: isGK ? "rgba(46,204,113,0.3)" : `${accentFrom}0.2)`,
        }}
      >
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

      {isCapt && (
        <div className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full sm:h-3.5 sm:w-3.5"
          style={{ background: "linear-gradient(135deg, #FFD700, #FFA000)" }}
        >
          <span className="text-[5px] font-black text-black sm:text-[6px]">C</span>
        </div>
      )}

      {player.rating && (
        <span className="shrink-0 text-[9px] font-bold tabular-nums"
          style={{
            color: player.rating >= 8 ? "#FFD700" : player.rating >= 7 ? "#D8FF3E" : "rgba(255,255,255,0.45)",
          }}
        >
          {player.rating}
        </span>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-white/[0.04]"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {href ? <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">{content}</Link> : content}
    </motion.div>
  );
}
