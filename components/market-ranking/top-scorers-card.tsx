"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import {
  fallbackTopScorerProfiles,
  fetchWorldCupTopScorers,
  type WorldCupTopScorer,
} from "@/lib/world-cup-top-scorers";

type TopScorersCardProps = {
  limit?: number;
};

export function TopScorersCard({ limit = 10 }: TopScorersCardProps) {
  const [players, setPlayers] = useState<WorldCupTopScorer[]>(fallbackTopScorerProfiles);

  useEffect(() => {
    let active = true;

    fetchWorldCupTopScorers()
      .then((items) => {
        if (active && items.length) setPlayers(items);
      })
      .catch(() => {
        if (active) setPlayers(fallbackTopScorerProfiles);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-5 flex items-center justify-between border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            射手榜
          </p>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-[0.12em] text-volt"
          style={{ fontFamily: "ScreenMatrix" }}
        >
          TOP {limit}
        </span>
      </div>

      <div className="relative z-10">
        {players.slice(0, limit).map((player, index) => (
          <Link
            key={player.id}
            href={`/players/${player.id}/`}
            className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition duration-150 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-volt/50"
          >
            <span
              className="w-5 shrink-0 text-center text-xs font-black tabular"
              style={{ color: getRankColor(index + 1) }}
            >
              {index + 1}
            </span>
            {player.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.photo}
                alt={player.name}
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                loading="lazy"
              />
            ) : (
              <span className="h-8 w-8 shrink-0 rounded-full bg-white/[0.06] ring-1 ring-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white/90 transition group-hover:text-volt">
                {player.name}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-white/35">
                {player.teamLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.teamLogo}
                    alt={player.teamName}
                    className="h-3.5 w-3.5 shrink-0 rounded-full object-contain"
                    loading="lazy"
                  />
                ) : null}
                <span className="truncate">{player.teamName}</span>
              </div>
            </div>
            <span
              className="shrink-0 text-2xl font-bold tabular text-white"
              style={{ fontFamily: "ScreenMatrix" }}
            >
              {player.goals ?? "-"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function getRankColor(rank: number) {
  if (rank === 1) return "#FFD700";
  if (rank === 2) return "#C0C0C0";
  if (rank === 3) return "#CD7F32";
  return "rgba(255,255,255,0.34)";
}
