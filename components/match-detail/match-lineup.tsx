"use client";

import { motion } from "framer-motion";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail, LineupPlayer, PlayerPosition } from "@/types/match";

// Formation-specific layouts: [x%, y%]
// Y: 0=top(far goal), 100=bottom(near goal)
const FORMATION_LAYOUTS: Record<string, Array<{ x: number; y: number }>> = {
  "4-3-3": [
    { x: 50, y: 84 },  // GK
    { x: 18, y: 72 },  // LB
    { x: 38, y: 72 },  // CB
    { x: 62, y: 72 },  // CB
    { x: 82, y: 72 },  // RB
    { x: 30, y: 52 },  // LCM
    { x: 50, y: 52 },  // CCM
    { x: 70, y: 52 },  // RCM
    { x: 18, y: 32 },  // LW
    { x: 50, y: 26 },  // ST
    { x: 82, y: 32 },  // RW
  ],
  "4-2-3-1": [
    { x: 50, y: 84 },  // GK
    { x: 18, y: 72 },  // LB
    { x: 38, y: 72 },  // CB
    { x: 62, y: 72 },  // CB
    { x: 82, y: 72 },  // RB
    { x: 38, y: 56 },  // LDM
    { x: 62, y: 56 },  // RDM
    { x: 20, y: 40 },  // LW
    { x: 50, y: 40 },  // CAM
    { x: 80, y: 40 },  // RW
    { x: 50, y: 24 },  // ST
  ],
  "3-5-2": [
    { x: 50, y: 84 },  // GK
    { x: 25, y: 72 },  // LCB
    { x: 50, y: 72 },  // CB
    { x: 75, y: 72 },  // RCB
    { x: 10, y: 52 },  // LWB
    { x: 35, y: 54 },  // LCM
    { x: 50, y: 48 },  // CCM
    { x: 65, y: 54 },  // RCM
    { x: 90, y: 52 },  // RWB
    { x: 36, y: 28 },  // LST
    { x: 64, y: 28 },  // RST
  ],
  "4-4-2": [
    { x: 50, y: 84 },  // GK
    { x: 18, y: 72 },  // LB
    { x: 38, y: 72 },  // CB
    { x: 62, y: 72 },  // CB
    { x: 82, y: 72 },  // RB
    { x: 18, y: 50 },  // LM
    { x: 38, y: 50 },  // LCM
    { x: 62, y: 50 },  // RCM
    { x: 82, y: 50 },  // RM
    { x: 36, y: 28 },  // LST
    { x: 64, y: 28 },  // RST
  ],
  "4-1-4-1": [
    { x: 50, y: 84 },  // GK
    { x: 18, y: 72 },  // LB
    { x: 38, y: 72 },  // CB
    { x: 62, y: 72 },  // CB
    { x: 82, y: 72 },  // RB
    { x: 50, y: 58 },  // CDM
    { x: 18, y: 42 },  // LM
    { x: 38, y: 42 },  // LCM
    { x: 62, y: 42 },  // RCM
    { x: 82, y: 42 },  // RM
    { x: 50, y: 26 },  // ST
  ],
};

const FORMATION_SLOTS: Record<string, PlayerPosition[]> = {
  "4-3-3":  ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"],
  "4-2-3-1": ["GK", "LB", "CB", "CB", "RB", "CDM", "CDM", "LW", "CAM", "RW", "ST"],
  "3-5-2":  ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "CM", "RM", "ST", "ST"],
  "4-4-2":  ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
  "4-1-4-1": ["GK", "LB", "CB", "CB", "RB", "CDM", "LM", "CM", "CM", "RM", "ST"],
};

function getLayout(formation: string) {
  return FORMATION_LAYOUTS[formation] ?? FORMATION_LAYOUTS["4-3-3"];
}

export function MatchLineup({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="hero-card overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/25 to-transparent" />

      <div className="relative grid grid-cols-1 gap-5 p-4 md:grid-cols-2 md:p-5">
        <PitchView
          teamName={teams.home.name}
          players={detail.homeLineup.players.filter((p) => p.isStarter)}
          formation={detail.homeLineup.formation}
          side="home"
        />
        <div className="absolute bottom-5 left-1/2 top-5 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/[0.06] to-transparent md:block" />
        <PitchView
          teamName={teams.away.name}
          players={detail.awayLineup.players.filter((p) => p.isStarter)}
          formation={detail.awayLineup.formation}
          side="away"
        />
      </div>
    </motion.div>
  );
}

function PitchView({
  teamName,
  players,
  formation,
  side,
}: {
  teamName: string;
  players: LineupPlayer[];
  formation: string;
  side: "home" | "away";
}) {
  const layout = getLayout(formation);
  const isHome = side === "home";

  return (
    <div className="relative min-w-0">
      <div className="mx-auto mb-3 flex w-full max-w-[500px] items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${isHome ? "bg-volt" : "bg-flare"}`} />
          <span className="text-xs font-semibold uppercase tracking-wide text-white">{teamName}</span>
        </div>
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-white/50">
          {formation}
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[500px] px-4 pb-2 sm:px-6">
        <div
          className="relative overflow-hidden rounded-[1.35rem] bg-ink-950/60 ring-1 ring-white/[0.08]"
          style={{ aspectRatio: "4 / 5" }}
        >
          <div
            className={`pointer-events-none absolute inset-0 ${
              isHome
                ? "bg-[radial-gradient(circle_at_50%_18%,rgba(216,255,62,0.12),transparent_42%)]"
                : "bg-[radial-gradient(circle_at_50%_18%,rgba(255,154,31,0.12),transparent_42%)]"
            }`}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:32px_32px] opacity-50" />

          <svg viewBox="0 0 100 125" className="relative h-full w-full" preserveAspectRatio="none">
            <rect x="7" y="6" width="86" height="113" rx="0.8" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.45" />
            <line x1="7" y1="62.5" x2="93" y2="62.5" stroke="rgba(255,255,255,0.12)" strokeWidth="0.38" />
            <circle cx="50" cy="62.5" r="13" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.38" />
            <circle cx="50" cy="62.5" r="0.75" fill="rgba(255,255,255,0.22)" />
            <rect x="28" y="6" width="44" height="18" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.38" />
            <rect x="38" y="6" width="24" height="7.5" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.38" />
            <rect x="28" y="101" width="44" height="18" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.38" />
            <rect x="38" y="111.5" width="24" height="7.5" fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth="0.38" />
          </svg>

          {players.map((player, i) => {
            const coord = layout[i] ?? { x: 50, y: 50 };
            const isGK = i === 0;
            const x = 7 + (coord.x / 100) * 86;
            const y = 6 + (coord.y / 100) * 105;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div
                      className={`relative flex h-8 w-8 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${
                        isGK
                          ? "bg-gradient-to-b from-emerald-600/80 to-emerald-800/80 ring-1 ring-emerald-500/40"
                          : isHome
                            ? "bg-gradient-to-b from-volt/25 to-volt/15 ring-1 ring-volt/30"
                            : "bg-gradient-to-b from-flare/25 to-flare/15 ring-1 ring-flare/30"
                      } shadow-lg transition-transform duration-200 group-hover:scale-110`}
                    >
                      <span className="tabular text-xs font-bold text-white">{player.number}</span>
                    </div>
                    {player.isCaptain && (
                      <div className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-flare text-[7px] font-bold text-black sm:h-4 sm:w-4 sm:text-[8px]">C</div>
                    )}
                  </div>
                  <p className="mt-1 max-w-[72px] truncate text-center text-[9px] font-medium leading-tight text-white/78 sm:max-w-[86px] sm:text-[10px]">
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
