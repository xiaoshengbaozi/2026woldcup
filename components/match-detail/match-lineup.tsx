"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import matchStarPlayers from "@/data/match-star-players.json";
import playerArticles from "@/data/player-articles.json";
import { localizeCoachName } from "@/lib/coach-localization";
import { PlayerFmScoutCard } from "@/components/player-fm-scout-card";
import {
  getLineupPlayerEnterTransition,
  lineupPlayerEnterAnimate,
  lineupPlayerEnterInitial,
} from "@/components/motion/lineup-player-enter";
import { getOfficialPlayerCatalog, type OfficialPlayerCatalogItem } from "@/lib/official-player-catalog";
import { hasKnownBlankPlayerPhoto } from "@/lib/player-photo-overrides";
import { findPlayerScoutNoteByIdentity, type PlayerScoutNote } from "@/lib/player-scout-notes";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail, LineupPlayer, PlayerPosition } from "@/types/match";

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

type PitchCoord = { x: number; y: number };

function getPlayerPitchCoords(starters: LineupPlayer[], formation: string): PitchCoord[] {
  const gridCoords = starters.map((player) => parsePlayerGrid(player.grid));
  const usableGridCoords = gridCoords.filter((coord): coord is { row: number; col: number } => Boolean(coord));

  if (usableGridCoords.length >= Math.min(starters.length, 8)) {
    const maxRow = Math.max(...usableGridCoords.map((coord) => coord.row), 1);
    const colsByRow = usableGridCoords.reduce((map, coord) => {
      map.set(coord.row, Math.max(map.get(coord.row) ?? 0, coord.col));
      return map;
    }, new Map<number, number>());

    return gridCoords.map((coord, index) => {
      if (!coord) return getLayout(formation)[index] ?? { x: 50, y: 50 };

      const colsInRow = Math.max(colsByRow.get(coord.row) ?? coord.col, 1);
      const x = (coord.col / (colsInRow + 1)) * 100;
      const y = maxRow <= 1 ? 50 : 88 - ((coord.row - 1) / (maxRow - 1)) * 64;
      return { x, y };
    });
  }

  return getLayout(formation);
}

function parsePlayerGrid(grid: string | null | undefined) {
  const match = String(grid ?? "").match(/^(\d+):(\d+)$/);
  if (!match) return null;

  const row = Number(match[1]);
  const col = Number(match[2]);
  if (!Number.isFinite(row) || !Number.isFinite(col) || row < 1 || col < 1) return null;

  return { row, col };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const OFFICIAL_PLAYERS = getOfficialPlayerCatalog();
const OFFICIAL_PLAYERS_BY_TEAM = OFFICIAL_PLAYERS.reduce((map, player) => {
  const code = player.teamCode.toUpperCase();
  const players = map.get(code) ?? [];
  players.push(player);
  map.set(code, players);
  return map;
}, new Map<string, OfficialPlayerCatalogItem[]>());

function reconcileLineupPlayers(players: LineupPlayer[], teamCode: string): LineupPlayer[] {
  const officialPlayers = OFFICIAL_PLAYERS_BY_TEAM.get(teamCode.toUpperCase()) ?? [];
  if (!officialPlayers.length || !players.length) return players;

  const officialById = new Map(officialPlayers.map((player) => [String(player.apiPlayerId), player]));
  const officialByName = new Map<string, OfficialPlayerCatalogItem>();
  for (const player of officialPlayers) {
    for (const key of [player.nameEn, player.nameCn, ...player.aliases].map(normalizePlayerKey).filter(Boolean)) {
      officialByName.set(key, player);
    }
  }

  return players.map((player) => {
    const official =
      officialById.get(String(player.id)) ??
      [player.nameEn, player.nameCn, player.name]
        .map(normalizePlayerKey)
        .map((key) => officialByName.get(key))
        .find((item): item is OfficialPlayerCatalogItem => Boolean(item));

    if (!official) return player;

    return {
      ...player,
      id: String(official.apiPlayerId),
      name: official.nameCn || official.nameEn || player.name,
      nameCn: official.nameCn || player.nameCn,
      nameEn: official.nameEn || player.nameEn,
      number: official.number ?? player.number,
      position: reconcilePlayerPosition(player.position, official.position),
      positionCn: official.positionCn || player.positionCn,
      photo: hasKnownBlankPlayerPhoto(official.apiPlayerId) ? "" : official.photo || player.photo,
    };
  });
}

function reconcilePlayerPosition(current: PlayerPosition, officialPosition: string): PlayerPosition {
  if (current && current !== "CM") return current;
  if (officialPosition === "GK") return "GK";
  if (officialPosition === "DF") return "CB";
  if (officialPosition === "MF") return "CM";
  if (officialPosition === "FW") return "ST";
  return current || "CM";
}

/* ═══════════════════════════════════════════════
   Main Lineup Component
   ═══════════════════════════════════════════════ */

export function MatchLineup({ detail, compactMobile = false }: { detail: MatchDetail; compactMobile?: boolean }) {
  const teams = parseTeams(detail.match.summary);
  const [activeSide, setActiveSide] = useState<"home" | "away">("home");

  const currentLineup = activeSide === "home" ? detail.homeLineup : detail.awayLineup;
  const currentTeamName = activeSide === "home" ? teams.home.name : teams.away.name;
  const isSquadList = currentLineup.listType === "squad_pool" || currentLineup.listType === "final_squad";
  const isHome = activeSide === "home";
  const currentTeamCode = isHome ? detail.homeTeamCode : detail.awayTeamCode;
  const currentPlayers = reconcileLineupPlayers(currentLineup.players, currentTeamCode);

  const accentHex = isHome ? "#D8FF3E" : "#FF9A1F";
  const accentDark = isHome ? "#8BA824" : "#CC7C19";

  return (
    <>
    {compactMobile && (
      <MobileLiveFormationPitch
        detail={detail}
      />
    )}

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`hero-card overflow-hidden ${compactMobile ? "hidden lg:block" : ""}`}
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
          className={`relative grid grid-cols-1 gap-4 p-4 sm:p-5 ${compactMobile ? "lg:grid-cols-[2fr_3fr]" : "md:grid-cols-[2fr_3fr]"}`}
        >
          {isSquadList ? (
            <SquadLineupPanel
              teamName={currentTeamName}
              teamCode={currentTeamCode}
              coach={currentLineup.coach}
              players={currentPlayers}
              officialWorldCupSquad={Boolean(currentLineup.officialWorldCupSquad)}
              accentHex={accentHex}
              accentFrom={isHome ? "rgba(216,255,62," : "rgba(255,154,31,"}
            />
          ) : (
            <FormationPitch
              coach={currentLineup.coach}
              players={currentPlayers}
              formation={currentLineup.formation}
              accentHex={accentHex}
              accentDark={accentDark}
              compactMobile={compactMobile}
            />
          )}

          {!isSquadList && (
            <PlayerGrid
              players={currentPlayers}
              separateSubstitutes={currentLineup.listType === "confirmed_lineup" && currentPlayers.some((player) => player.isStarter)}
              accentHex={accentHex}
              accentFrom={isHome ? "rgba(216,255,62," : "rgba(255,154,31,"}
              className={compactMobile ? "hidden lg:block" : ""}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   Formation Pitch (left side)
   ═══════════════════════════════════════════════ */

function MobileLiveFormationPitch({
  detail,
}: {
  detail: MatchDetail;
}) {
  const homePlayers = reconcileLineupPlayers(detail.homeLineup.players, detail.homeTeamCode);
  const awayPlayers = reconcileLineupPlayers(detail.awayLineup.players, detail.awayTeamCode);
  const homeStarters = homePlayers.filter((player) => player.isStarter).slice(0, 11);
  const awayStarters = awayPlayers.filter((player) => player.isStarter).slice(0, 11);
  const homeSubstitutes = homePlayers.filter((player) => !player.isStarter);
  const awaySubstitutes = awayPlayers.filter((player) => !player.isStarter);
  const homeLayout = getPlayerPitchCoords(homeStarters, detail.homeLineup.formation);
  const awayLayout = getPlayerPitchCoords(awayStarters, detail.awayLineup.formation);
  const homeCoach = localizeCoachName(detail.homeLineup.coach) || "主教练待更新";
  const awayCoach = localizeCoachName(detail.awayLineup.coach) || "主教练待更新";
  const hasStarters = homeStarters.length > 0 || awayStarters.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="hero-card overflow-hidden p-3 lg:hidden"
    >
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{homeCoach}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{detail.homeLineup.formation}</p>
        </div>
        <div className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black tabular-nums text-white ring-1 ring-white/[0.08]">
          {detail.score.home} - {detail.score.away}
        </div>
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-black text-white">{awayCoach}</p>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{detail.awayLineup.formation}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.35rem] bg-[#486f4d]" style={{ aspectRatio: "68 / 118" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#4f7654] via-[#486f4d] to-[#3f6847]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_bottom,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:100%_8.333%]" />
        <svg viewBox="0 0 680 1180" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <rect x="36" y="28" width="608" height="1124" rx="6" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="4" />
          <line x1="36" y1="590" x2="644" y2="590" stroke="rgba(255,255,255,0.32)" strokeWidth="3" />
          <circle cx="340" cy="590" r="68" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
          <circle cx="340" cy="590" r="7" fill="rgba(255,255,255,0.45)" />
          <rect x="142" y="28" width="396" height="150" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" />
          <rect x="230" y="28" width="220" height="58" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="3" />
          <path d="M 260 178 Q 340 216 420 178" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
          <rect x="142" y="1002" width="396" height="150" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="3" />
          <rect x="230" y="1094" width="220" height="58" fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="3" />
          <path d="M 260 1002 Q 340 964 420 1002" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="3" />
        </svg>

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(216,255,62,.10),transparent_34%),radial-gradient(circle_at_50%_82%,rgba(255,154,31,.11),transparent_34%)]" />

        {hasStarters ? (
          <>
            {homeStarters.map((player, index) => (
              <MobilePitchPlayer
                key={`home-${player.id}`}
                player={player}
                coord={homeLayout[index] ?? { x: 50, y: 50 }}
                side="home"
                delay={index}
              />
            ))}
            {awayStarters.map((player, index) => (
              <MobilePitchPlayer
                key={`away-${player.id}`}
                player={player}
                coord={awayLayout[index] ?? { x: 50, y: 50 }}
                side="away"
                delay={index + 11}
              />
            ))}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center px-8 text-center">
            <p className="rounded-2xl bg-black/22 px-4 py-3 text-sm font-bold text-white/68 backdrop-blur-md ring-1 ring-white/[0.08]">
              官方阵型待更新
            </p>
          </div>
        )}
      </div>

      {(homeSubstitutes.length > 0 || awaySubstitutes.length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-3 px-1">
          <MobileBenchList players={homeSubstitutes} align="left" />
          <MobileBenchList players={awaySubstitutes} align="right" />
        </div>
      )}
    </motion.div>
  );
}

function MobilePitchPlayer({
  player,
  coord,
  side,
  delay,
}: {
  player: LineupPlayer;
  coord: PitchCoord;
  side: "home" | "away";
  delay: number;
}) {
  const x = clamp(50 + (coord.x - 50) * 1.12 - 1.5, 11, 89);
  const y = side === "home"
    ? clamp(6 + ((100 - coord.y) / 100) * 41, 9, 46)
    : clamp(53 + (coord.y / 100) * 41, 54, 94);
  const label = player.number ? `${player.number} ${player.nameCn || player.name}` : player.nameCn || player.name;
  const fallback = player.number ?? getPlayerInitial(player);

  return (
    <motion.div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={{ opacity: 0, scale: 0.84, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.06 + delay * 0.025, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-[#30343d] text-xs font-black text-white shadow-[0_10px_22px_rgba(0,0,0,.26)] ring-1 ring-white/15">
        <span>{fallback}</span>
        {player.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.nameEn || player.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
      <p className="mt-1 w-[4.8rem] truncate text-center text-[10px] font-black leading-tight text-white/90 [text-shadow:0_1px_5px_rgba(0,0,0,.55)]" title={label}>
        {label}
      </p>
    </motion.div>
  );
}

function MobileBenchList({
  players,
  align,
}: {
  players: LineupPlayer[];
  align: "left" | "right";
}) {
  if (!players.length) return <div />;

  return (
    <div className={`min-w-0 space-y-1.5 ${align === "right" ? "text-right" : "text-left"}`}>
      <p className="text-[10px] font-black text-white/35">替补</p>
      <div className={`flex flex-col gap-1.5 ${align === "right" ? "items-end" : "items-start"}`}>
        {players.slice(0, 9).map((player) => {
          const label = player.number ? `${player.number} ${player.nameCn || player.name}` : player.nameCn || player.name;
          const positionLabel = player.positionCn || player.position;

          return (
            <div
              key={player.id}
              className={`flex max-w-full items-center gap-1.5 rounded-2xl bg-white/[0.035] px-1.5 py-1 ring-1 ring-white/[0.055] ${align === "right" ? "flex-row-reverse" : ""}`}
              title={label}
            >
              <div className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#30343d] text-[10px] font-black text-white ring-1 ring-white/12">
                <span>{player.number ?? getPlayerInitial(player)}</span>
                {player.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.photo}
                    alt={player.nameEn || player.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold leading-tight text-white/68">{label}</p>
                <p className="mt-0.5 truncate text-[9px] font-bold leading-tight text-white/34">{positionLabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormationPitch({
  coach, players, formation, accentHex, accentDark, compactMobile = false,
}: {
  coach?: string | null; players: LineupPlayer[]; formation: string; accentHex: string; accentDark: string; compactMobile?: boolean;
}) {
  const starters = players.filter((p) => p.isStarter).slice(0, 11);
  const layout = getPlayerPitchCoords(starters, formation);
  const accentFrom = accentHex === "#D8FF3E" ? "rgba(216,255,62," : "rgba(255,154,31,";
  const displayCoach = localizeCoachName(coach) || "待更新";

  return (
    <div className="flex flex-col items-center pt-1 sm:pt-2">
      <div
        className={`${compactMobile ? "mb-5 hidden w-full max-w-[320px] items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-white/[0.07] backdrop-blur-xl sm:mb-6 lg:flex" : "mb-5 flex w-full max-w-[320px] items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-white/[0.07] backdrop-blur-xl sm:mb-6"}`}
        style={{
          background: `linear-gradient(135deg, ${accentFrom}0.12), rgba(255,255,255,0.025))`,
          boxShadow: `0 18px 42px rgba(0,0,0,0.18), 0 0 24px ${accentFrom}0.08)`,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-[11px] font-black text-black shadow-[inset_0_1px_0_rgba(255,255,255,.35)]"
            style={{ background: `linear-gradient(135deg, ${accentHex}, ${accentDark})` }}
          >
            CO
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">主教练</p>
            <p className="mt-0.5 truncate text-sm font-black text-white sm:text-base">{displayCoach}</p>
          </div>
        </div>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accentHex, boxShadow: `0 0 18px ${accentHex}` }} />
      </div>

      {/* Formation badge */}
      <div className={`${compactMobile ? "mb-4 hidden items-center gap-2 sm:mb-5 lg:flex" : "mb-4 flex items-center gap-2 sm:mb-5"}`}>
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
      <div className="w-full max-w-[420px] lg:max-w-[320px]">
        <div className={`relative overflow-hidden rounded-2xl ${compactMobile ? "aspect-[68/108] lg:aspect-[68/105]" : ""}`} style={!compactMobile ? { aspectRatio: "68 / 105" } : undefined}>
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
            const rowDensity = layout.filter((item) => Math.abs(item.y - coord.y) < 4).length;
            const labelWidth = rowDensity >= 5 ? 44 : rowDensity === 4 ? 52 : rowDensity === 3 ? 62 : 72;
            const isGK = player.position === "GK";
            const isCapt = player.isCaptain;
            const x = 5.9 + (coord.x / 100) * 88.2;
            const y = 3 + (coord.y / 100) * 94;

            return (
              <div
                key={player.id}
                className="absolute z-10"
                style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                  <p
                    className={`mt-0.5 truncate rounded-full bg-black/18 px-1 text-center font-semibold leading-tight text-white/80 backdrop-blur-sm ${
                      rowDensity >= 5 ? "text-[7px] sm:text-[8px]" : "text-[8px] sm:text-[9px]"
                    }`}
                    style={{ maxWidth: `${labelWidth}px`, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                    title={player.name}
                  >
                    {player.name}
                  </p>
                </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SquadLineupPanel({
  teamCode, coach, players, accentHex, accentFrom, hideHeader = false,
}: {
  teamName: string;
  teamCode: string;
  coach?: string | null;
  players: LineupPlayer[];
  officialWorldCupSquad: boolean;
  accentHex: string;
  accentFrom: string;
  hideHeader?: boolean;
}) {
  const displayPlayers = reconcileLineupPlayers(players, teamCode);

  return (
    <>
      <FeaturedSquadSummary
        teamCode={teamCode}
        coach={coach}
        players={displayPlayers}
        accentHex={accentHex}
        accentFrom={accentFrom}
        hideHeader={hideHeader}
      />
      <PlayerGrid players={displayPlayers} accentHex={accentHex} accentFrom={accentFrom} />
    </>
  );
}

function FeaturedSquadSummary({
  teamCode, coach, players, accentHex, accentFrom, hideHeader,
}: {
  teamCode: string;
  coach?: string | null;
  players: LineupPlayer[];
  accentHex: string;
  accentFrom: string;
  hideHeader: boolean;
}) {
  const grouped = groupPlayersByPosition(players);
  const availableGroups = POSITION_GROUPS
    .map((group) => ({ ...group, count: grouped[group.key]?.length ?? 0 }))
    .filter((group) => group.count > 0);
  const featuredPlayers = getFeaturedPlayers(players, teamCode).slice(0, 6);
  const displayCoach = localizeCoachName(coach) || "待更新";

  return (
    <div className={`flex min-h-[320px] flex-col justify-between rounded-3xl bg-white/[0.025] p-5 ring-1 ring-white/[0.055]${hideHeader ? " squad-summary-hide-header" : ""}`}>
      <div>
        <div
          className="rounded-2xl px-4 py-3 ring-1 ring-white/[0.055]"
          style={{ background: `linear-gradient(135deg, ${accentFrom}0.14), rgba(255,255,255,0.025))` }}
        >
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/35">主教练</p>
          <p className="mt-1 truncate text-lg font-black text-white">{displayCoach}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">明星球员</p>
          <span className="text-[10px] font-bold tabular-nums" style={{ color: `${accentHex}cc` }}>
            {featuredPlayers.length}
          </span>
        </div>
        {featuredPlayers.length ? (
          <div className="space-y-2">
            {featuredPlayers.map((item, index) => (
              <FeaturedPlayerRow
                key={`${item.player.id}-${item.category}`}
                item={item}
                accentHex={accentHex}
                accentFrom={accentFrom}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.025] px-4 py-5 text-center ring-1 ring-white/[0.055]">
            <p className="text-sm font-semibold text-white/42">暂无明星球员数据</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold text-white/65 ring-1 ring-white/[0.06]"
          style={{ background: `${accentFrom}0.08)` }}
        >
          名单 {players.length || 0}
        </span>
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

type FeaturedCategory = "superstar" | "wonderkid" | "star" | "rating";

type FeaturedPlayer = {
  player: LineupPlayer;
  category: FeaturedCategory;
};

type PlayerArticle = (typeof playerArticles.players)[number];
type MatchStarPlayer = {
  id: string | null;
  aliases: string[];
};

const PLAYER_ARTICLES_BY_ID = new Map(
  playerArticles.players.map((player) => [String(player.apiPlayerId), player])
);
const MATCH_STAR_PLAYERS_BY_TEAM = matchStarPlayers.teams as Record<string, MatchStarPlayer[] | undefined>;

function getFeaturedPlayers(players: LineupPlayer[], teamCode: string): FeaturedPlayer[] {
  const byPlayer = new Map<string, FeaturedPlayer>();
  const normalizedTeamCode = teamCode.toUpperCase();

  for (const player of players) {
    const article = PLAYER_ARTICLES_BY_ID.get(player.id);
    const articleCategory = getArticleCategory(article, normalizedTeamCode);
    const category =
      articleCategory ??
      (isMatchStarPlayer(player, normalizedTeamCode) ? "star" : null) ??
      (player.rating && player.rating >= 7 ? "rating" : null);
    if (!category) continue;

    byPlayer.set(player.id, {
      player: { ...player, featuredCategory: category },
      category,
    });
  }

  return [...byPlayer.values()].sort((a, b) => {
    const priorityDiff = getFeaturedPriority(a.category) - getFeaturedPriority(b.category);
    if (priorityDiff) return priorityDiff;
    return (b.player.rating ?? 0) - (a.player.rating ?? 0);
  });
}

function getArticleCategory(article: PlayerArticle | undefined, teamCode: string): FeaturedCategory | null {
  if (!article || article.teamCode?.toUpperCase() !== teamCode) return null;
  if (article.category === "superstars") return "superstar";
  if (article.category === "wonderkids") return "wonderkid";
  return null;
}

function getFeaturedPriority(category: FeaturedCategory) {
  if (category === "superstar") return 0;
  if (category === "wonderkid") return 1;
  if (category === "star") return 2;
  return 3;
}

function getFeaturedLabel(category: FeaturedCategory) {
  if (category === "superstar") return "超级巨星";
  if (category === "wonderkid") return "世界杯新星";
  if (category === "star") return "核心球星";
  return "评分 7+";
}

function isMatchStarPlayer(player: LineupPlayer, teamCode: string) {
  const teamStars = MATCH_STAR_PLAYERS_BY_TEAM[teamCode] ?? [];
  if (!teamStars.length) return false;

  const playerId = /^\d+$/.test(player.id) ? player.id : null;
  const playerKeys = [player.name, player.nameEn, player.nameCn].map(normalizePlayerKey).filter(Boolean);

  return teamStars.some((star) => {
    if (playerId && star.id === playerId) return true;
    const starKeys = star.aliases.map(normalizePlayerKey).filter(Boolean);
    return playerKeys.some((playerKey) =>
      starKeys.some((starKey) =>
        playerKey === starKey ||
        (playerKey.length >= 8 && starKey.includes(playerKey)) ||
        (starKey.length >= 8 && playerKey.includes(starKey))
      )
    );
  });
}

function normalizePlayerKey(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "")
    .trim();
}

function getPlayerInitial(player: LineupPlayer) {
  const name = player.nameCn || player.name || player.nameEn || "";
  const chineseChar = name.match(/[\u4e00-\u9fff]/u)?.[0];
  if (chineseChar) return chineseChar;
  return name.trim().charAt(0).toUpperCase() || "·";
}

function getLineupPlayerScoutNote(player: LineupPlayer) {
  return findPlayerScoutNoteByIdentity({
    id: player.id,
    name: player.name,
    nameEn: player.nameEn,
    nameCn: player.nameCn,
  });
}

function ScoutNoteDialog({
  open,
  onClose,
  player,
  note,
}: {
  open: boolean;
  onClose: () => void;
  player: LineupPlayer;
  note: PlayerScoutNote;
}) {
  if (typeof document === "undefined") return null;

  const href = /^\d+$/.test(player.id) ? `/players/${player.id}/` : null;
  const playerName = player.nameCn || player.name;
  const identityContent = (
    <>
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-volt/[0.12] ring-1 ring-volt/20 transition group-hover:ring-volt/45">
        <span className="text-xs font-black text-volt">{player.number ?? getPlayerInitial(player)}</span>
        {player.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.nameEn || player.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white transition group-hover:text-volt">{playerName}</p>
        <p className="mt-0.5 truncate text-xs text-white/38">{player.nameEn || note.nameEn}</p>
      </div>
    </>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center bg-black/70 px-4 py-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-[27rem]"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="player-scout-identity hero-card mb-3 flex items-center justify-between gap-3 rounded-[2rem] p-3">
              {href ? (
                <Link href={href} className="group relative z-10 flex min-w-0 items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-volt/60">
                  {identityContent}
                </Link>
              ) : (
                <div className="relative z-10 flex min-w-0 items-center gap-3">{identityContent}</div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-white/55 ring-1 ring-white/[0.08] transition hover:bg-white/[0.1] hover:text-white"
                aria-label="关闭球探卡片"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PlayerFmScoutCard note={note} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function FeaturedPlayerRow({
  item, accentHex, accentFrom, index,
}: {
  item: FeaturedPlayer;
  accentHex: string;
  accentFrom: string;
  index: number;
}) {
  const { player, category } = item;
  const href = /^\d+$/.test(player.id) ? `/players/${player.id}/` : null;
  const scoutNote = getLineupPlayerScoutNote(player);
  const [scoutOpen, setScoutOpen] = useState(false);
  const content = (
    <>
      <div
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full ring-1"
        style={{
          background: `linear-gradient(135deg, ${accentFrom}0.18), rgba(255,255,255,0.04))`,
          borderColor: `${accentFrom}0.22)`,
        }}
      >
        <span className="text-[11px] font-black tabular-nums text-white">{player.number ?? getPlayerInitial(player)}</span>
        {player.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.nameEn || player.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black leading-tight text-white">{player.nameCn || player.name}</p>
          {player.rating ? (
            <span className="shrink-0 text-[10px] font-black tabular-nums" style={{ color: accentHex }}>
              {player.rating}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[10px] font-bold text-white/42">
          {getFeaturedLabel(category)} · {player.positionCn || player.position}{player.number ? ` · ${player.number}号` : ""}
        </p>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-center gap-3 overflow-hidden rounded-2xl bg-white/[0.025] px-3 py-2.5 ring-1 ring-white/[0.055] transition-all duration-200 hover:bg-white/[0.045]"
    >
      {scoutNote ? (
        <button type="button" onClick={() => setScoutOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {content}
        </button>
      ) : href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">{content}</Link>
      ) : (
        content
      )}
      {scoutNote && <ScoutNoteDialog open={scoutOpen} onClose={() => setScoutOpen(false)} player={player} note={scoutNote} />}
    </motion.div>
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

export function PlayerGrid({
  players, separateSubstitutes = false, accentHex, accentFrom, className = "",
}: {
  players: LineupPlayer[]; separateSubstitutes?: boolean; accentHex: string; accentFrom: string; className?: string;
}) {
  const startingPlayers = separateSubstitutes ? players.filter((player) => player.isStarter) : players;
  const substitutePlayers = separateSubstitutes ? players.filter((player) => !player.isStarter) : [];
  const grouped = groupPlayersByPosition(startingPlayers);

  let globalIndex = 0;

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {POSITION_GROUPS.map((group) => {
        const groupPlayers = grouped[group.key];
        if (!groupPlayers.length) return null;

        return (
          <div key={group.key}>
            <div className="mb-2 flex items-center gap-2 pl-0.5">
              <span className="inline-block h-3 w-1.5 rounded-full" style={{ backgroundColor: accentHex, opacity: 0.55 }} />
              <span className="squad-position-group-title text-xs font-black uppercase tracking-[0.12em] sm:text-sm" style={{ color: `${accentHex}bb` }}>
                {group.label}
              </span>
              <span className="text-xs text-white/28 sm:text-sm">({groupPlayers.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
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

      {substitutePlayers.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 pl-0.5">
            <span className="inline-block h-3 w-1.5 rounded-full" style={{ backgroundColor: accentHex, opacity: 0.35 }} />
            <span className="text-xs font-black uppercase tracking-[0.12em] text-white/55 sm:text-sm">
              替补
            </span>
            <span className="text-xs text-white/28 sm:text-sm">({substitutePlayers.length})</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
            {substitutePlayers.map((player) => {
              const idx = globalIndex++;
              return (
                <PlayerCell key={player.id} player={player} accentHex={accentHex} accentFrom={accentFrom} index={idx} />
              );
            })}
          </div>
        </div>
      )}

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
  const scoutNote = getLineupPlayerScoutNote(player);
  const [scoutOpen, setScoutOpen] = useState(false);
  const content = (
    <>
      <div
        className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full ring-1 sm:h-11 sm:w-11"
        style={{
          background: isGK
            ? "linear-gradient(135deg, rgba(46,204,113,0.2), rgba(26,138,74,0.15))"
            : `linear-gradient(135deg, ${accentFrom}0.18), ${accentFrom}0.08))`,
          borderColor: isGK ? "rgba(46,204,113,0.3)" : `${accentFrom}0.2)`,
        }}
      >
        <span className="text-[11px] font-black tabular-nums text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>
          {player.number ?? getPlayerInitial(player)}
        </span>
        {player.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.nameEn || player.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
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
      initial={lineupPlayerEnterInitial}
      animate={lineupPlayerEnterAnimate}
      transition={getLineupPlayerEnterTransition(index)}
      className="group relative flex items-center gap-2 overflow-hidden rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-white/[0.04]"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {scoutNote ? (
        <button type="button" onClick={() => setScoutOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {content}
        </button>
      ) : href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">{content}</Link>
      ) : (
        content
      )}
      {scoutNote && <ScoutNoteDialog open={scoutOpen} onClose={() => setScoutOpen(false)} player={player} note={scoutNote} />}
    </motion.div>
  );
}
