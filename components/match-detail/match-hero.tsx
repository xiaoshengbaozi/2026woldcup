"use client";

import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, Trophy } from "lucide-react";
import messiImage from "@/assets/players/ARG-argentina/headshots/lionel-messi.png";
import deBruyneImage from "@/assets/players/BEL-belgium/headshots/kevin-de-bruyne.png";
import viniciusImage from "@/assets/players/BRA-brazil/headshots/vinicius-junior.png";
import daviesImage from "@/assets/players/CAN-canada/headshots/alphonso-davies.png";
import diazImage from "@/assets/players/COL-colombia/headshots/luis-diaz.png";
import modricImage from "@/assets/players/CRO-croatia/headshots/luka-modric.png";
import hojlundImage from "@/assets/players/DEN-denmark/headshots/rasmus-hojlund.png";
import caicedoImage from "@/assets/players/ECU-ecuador/headshots/moises-caicedo.png";
import salahImage from "@/assets/players/EGY-egypt/headshots/mohamed-salah.png";
import bellinghamImage from "@/assets/players/ENG-england/headshots/jude-bellingham.png";
import yamalImage from "@/assets/players/ESP-spain/headshots/lamine-yamal.png";
import mbappeImage from "@/assets/players/FRA-france/headshots/kylian-mbappe.png";
import musialaImage from "@/assets/players/GER-germany/headshots/jamal-musiala.png";
import mitomaImage from "@/assets/players/JPN-japan/headshots/kaoru-mitoma.png";
import sonImage from "@/assets/players/KOR-south-korea/headshots/son-heung-min.png";
import hakimiImage from "@/assets/players/MAR-morocco/headshots/achraf-hakimi.png";
import gimenezImage from "@/assets/players/MEX-mexico/headshots/santiago-gimenez.png";
import vanDijkImage from "@/assets/players/NED-netherlands/headshots/virgil-van-dijk.png";
import haalandImage from "@/assets/players/NOR-norway/headshots/erling-haaland.png";
import lewandowskiImage from "@/assets/players/POL-poland/headshots/robert-lewandowski.png";
import ronaldoImage from "@/assets/players/POR-portugal/headshots/cristiano-ronaldo.png";
import maneImage from "@/assets/players/SEN-senegal/headshots/sadio-mane.png";
import vlahovicImage from "@/assets/players/SRB-serbia/headshots/dusan-vlahovic.png";
import xhakaImage from "@/assets/players/SUI-switzerland/headshots/granit-xhaka.png";
import isakImage from "@/assets/players/SWE-sweden/headshots/alexander-isak.png";
import gulerImage from "@/assets/players/TUR-turkey/headshots/arda-guler.png";
import valverdeImage from "@/assets/players/URU-uruguay/headshots/federico-valverde.png";
import pulisicImage from "@/assets/players/USA-united-states/headshots/christian-pulisic.png";
import { formatTime } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import type { MatchDetail } from "@/types/match";

const STATUS_LABEL: Record<string, string> = {
  not_started: "未开始",
  live: "进行中",
  halftime: "半场",
  finished: "已结束",
};

const STATUS_COLOR: Record<string, string> = {
  not_started: "text-white/50",
  live: "text-red-400",
  halftime: "text-yellow-400",
  finished: "text-white/40",
};

const STAGE_LABEL: Record<string, string> = {
  "小组赛A组": "GROUP A",
  "小组赛B组": "GROUP B",
  "小组赛C组": "GROUP C",
  "小组赛D组": "GROUP D",
  "小组赛E组": "GROUP E",
  "小组赛F组": "GROUP F",
  "小组赛G组": "GROUP G",
  "小组赛H组": "GROUP H",
  "小组赛I组": "GROUP I",
  "小组赛J组": "GROUP J",
  "小组赛K组": "GROUP K",
  "小组赛L组": "GROUP L",
  "1/16决赛": "ROUND OF 32",
  "1/8决赛": "ROUND OF 16",
  "1/4决赛": "QUARTER-FINAL",
  "半决赛": "SEMI-FINAL",
  "决赛": "FINAL",
  "三/四名决赛": "3RD PLACE",
};

const PLAYER_ASSETS: Record<string, { src: string; name: string }> = {
  ARG: { src: messiImage.src, name: "Lionel Messi" },
  BEL: { src: deBruyneImage.src, name: "Kevin De Bruyne" },
  BRA: { src: viniciusImage.src, name: "Vinicius Junior" },
  CAN: { src: daviesImage.src, name: "Alphonso Davies" },
  COL: { src: diazImage.src, name: "Luis Diaz" },
  CRO: { src: modricImage.src, name: "Luka Modric" },
  DEN: { src: hojlundImage.src, name: "Rasmus Hojlund" },
  ECU: { src: caicedoImage.src, name: "Moises Caicedo" },
  EGY: { src: salahImage.src, name: "Mohamed Salah" },
  ENG: { src: bellinghamImage.src, name: "Jude Bellingham" },
  ESP: { src: yamalImage.src, name: "Lamine Yamal" },
  FRA: { src: mbappeImage.src, name: "Kylian Mbappe" },
  GER: { src: musialaImage.src, name: "Jamal Musiala" },
  JPN: { src: mitomaImage.src, name: "Kaoru Mitoma" },
  KOR: { src: sonImage.src, name: "Son Heung-min" },
  MAR: { src: hakimiImage.src, name: "Achraf Hakimi" },
  MEX: { src: gimenezImage.src, name: "Santiago Gimenez" },
  NED: { src: vanDijkImage.src, name: "Virgil van Dijk" },
  NOR: { src: haalandImage.src, name: "Erling Haaland" },
  POL: { src: lewandowskiImage.src, name: "Robert Lewandowski" },
  POR: { src: ronaldoImage.src, name: "Cristiano Ronaldo" },
  SEN: { src: maneImage.src, name: "Sadio Mane" },
  SRB: { src: vlahovicImage.src, name: "Dusan Vlahovic" },
  SUI: { src: xhakaImage.src, name: "Granit Xhaka" },
  SWE: { src: isakImage.src, name: "Alexander Isak" },
  TUR: { src: gulerImage.src, name: "Arda Guler" },
  URU: { src: valverdeImage.src, name: "Federico Valverde" },
  USA: { src: pulisicImage.src, name: "Christian Pulisic" },
};

const TEAM_ACCENTS: Record<string, { primary: string; secondary: string }> = {
  ARG: { primary: "rgba(80,180,255,0.55)", secondary: "rgba(255,255,255,0.2)" },
  FRA: { primary: "rgba(38,91,255,0.56)", secondary: "rgba(255,55,72,0.3)" },
  BRA: { primary: "rgba(216,255,62,0.42)", secondary: "rgba(0,190,120,0.28)" },
  ESP: { primary: "rgba(255,154,31,0.5)", secondary: "rgba(210,30,45,0.32)" },
  GER: { primary: "rgba(255,255,255,0.28)", secondary: "rgba(216,255,62,0.24)" },
  ENG: { primary: "rgba(255,255,255,0.32)", secondary: "rgba(220,40,55,0.28)" },
  MEX: { primary: "rgba(0,160,95,0.42)", secondary: "rgba(220,40,55,0.28)" },
  USA: { primary: "rgba(35,110,255,0.44)", secondary: "rgba(225,40,60,0.3)" },
};

function getAccent(teamCode: string) {
  return (
    TEAM_ACCENTS[teamCode] ?? {
      primary: "rgba(216,255,62,0.36)",
      secondary: "rgba(255,154,31,0.25)",
    }
  );
}

function fadeToTransparent(color: string) {
  return color.replace(/rgba\((\s*\d+\s*,\s*\d+\s*,\s*\d+)\s*,\s*[\d.]+\s*\)/, "rgba($1,0)");
}

export function MatchHero({ detail }: { detail: MatchDetail }) {
  const teams = parseTeams(detail.match.summary);
  const stageLabel = STAGE_LABEL[detail.match.stage] ?? detail.match.stage;
  const statusLabel = STATUS_LABEL[detail.status];
  const statusColor = STATUS_COLOR[detail.status];
  const adjustedStart = detail.match.start;
  const isLive = detail.status === "live" || detail.status === "halftime";
  const homeAccent = getAccent(detail.homeTeamCode);
  const awayAccent = getAccent(detail.awayTeamCode);
  const homePlayer = PLAYER_ASSETS[detail.homeTeamCode];
  const awayPlayer = PLAYER_ASSETS[detail.awayTeamCode];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="hero-card relative mt-12 min-h-[360px] overflow-visible rounded-[2rem] shadow-none sm:mt-14 sm:min-h-[380px] lg:min-h-[360px]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015)_34%,rgba(0,0,0,0.24))]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />

      <PosterWedge side="left" accent={homeAccent} />
      <PosterWedge side="right" accent={awayAccent} />
      <div className="pointer-events-none absolute left-1/2 top-12 hidden h-64 w-[520px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.13),transparent_68%)] blur-2xl sm:block" />

      <div className="relative z-10 flex min-h-[360px] flex-col justify-between px-4 pb-0 pt-5 sm:min-h-[380px] sm:px-8 sm:pb-0 sm:pt-7 lg:min-h-[360px]">
        <div className="flex items-center justify-between gap-3">
          <span className="glass-chip px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62">
            {stageLabel}
          </span>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
            <span className={`glass-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusColor}`}>
              {statusLabel}
              {detail.status === "live" && " 63'"}
            </span>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-6">
          <PlayerPosterSide
            side="left"
            team={teams.home}
            teamCode={detail.homeTeamCode}
            player={homePlayer}
            accent={homeAccent}
          />
          <PlayerPosterSide
            side="right"
            team={teams.away}
            teamCode={detail.awayTeamCode}
            player={awayPlayer}
            accent={awayAccent}
          />

          <div className="relative z-20 flex max-w-[580px] -translate-y-4 flex-col items-center text-center sm:-translate-y-5">
            <img
              src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75"
              alt="FIFA World Cup 2026"
              className="h-auto max-h-[98px] w-auto object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] sm:max-h-[126px]"
              loading="eager"
            />
            <div
              className="mt-3 text-5xl font-bold tabular-nums text-white sm:text-6xl"
              style={{ fontFamily: "ScreenMatrix, monospace" }}
            >
              {detail.status === "not_started" ? (
                formatTime(adjustedStart)
              ) : (
                <>
                  {detail.score.home}<span className="mx-3 text-white/25">:</span>{detail.score.away}
                </>
              )}
            </div>
            <div className="mt-3 grid w-[min(100%,560px)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
              <MatchupTeam team={teams.home} align="left" />
              <span className="relative z-10 rounded-full bg-white/[0.08] px-4 py-2 text-lg font-black uppercase tracking-[0.08em] text-volt shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(216,255,62,0.16)] ring-1 ring-white/[0.1] sm:px-5 sm:text-xl">
                VS
              </span>
              <MatchupTeam team={teams.away} align="right" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/50">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-volt/70" />
                {adjustedStart.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-flare/70" />
                {formatTime(adjustedStart)}
              </span>
              {detail.match.location && (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-flare/70" />
                  <span className="max-w-[230px] truncate">{detail.match.location}</span>
                </span>
              )}
              {detail.match.stage.includes("决赛") && (
                <span className="inline-flex items-center gap-1.5 text-volt/75">
                  <Trophy className="h-3.5 w-3.5" />
                  冠军争夺战
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PosterWedge({
  side,
  accent,
}: {
  side: "left" | "right";
  accent: { primary: string; secondary: string };
}) {
  const isLeft = side === "left";

  return (
    <div
      className={`absolute inset-y-0 w-[46%] ${
        isLeft ? "left-0 rounded-l-[2rem]" : "right-0 rounded-r-[2rem]"
      }`}
      style={{
        background: isLeft
          ? `linear-gradient(90deg, ${accent.primary}, ${fadeToTransparent(accent.secondary)})`
          : `linear-gradient(90deg, ${fadeToTransparent(accent.secondary)}, ${accent.primary})`,
      }}
    />
  );
}

function PlayerPosterSide({
  side,
  team,
  teamCode,
  player,
  accent,
}: {
  team: { badge: string; image: string; name: string };
  teamCode: string;
  side: "left" | "right";
  player?: { src: string; name: string };
  accent: { primary: string; secondary: string };
}) {
  const isRight = side === "right";

  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 34 : -34 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-y-0 z-10 hidden w-[42%] sm:block ${
        isRight ? "right-0" : "left-0"
      }`}
    >
      <div
        className={`absolute top-10 h-44 w-44 rounded-full blur-[80px] ${
          isRight ? "right-16" : "left-16"
        }`}
        style={{ backgroundColor: accent.primary }}
      />
      {player ? (
        <img
          src={player.src}
          alt={player.name}
          className={`absolute bottom-0 h-[136%] w-auto max-w-none object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.42)] ${
            isRight ? "right-4 scale-x-[-1] origin-bottom-right" : "left-4 origin-bottom-left"
          }`}
          loading="eager"
        />
      ) : (
        <div
          className={`absolute bottom-0 grid h-full w-64 place-items-center rounded-[2rem] bg-black/20 p-8 shadow-none ring-1 ring-white/[0.1] backdrop-blur-xl ${
            isRight ? "right-12" : "left-12"
          }`}
        >
          <MiniFlag team={team} large />
          <span className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-white/36">
            {teamCode}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function MatchupTeam({
  team,
  align,
}: {
  team: { badge: string; image: string; name: string };
  align: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div
      className={`flex min-w-0 items-center gap-2 sm:gap-3 ${
        isRight ? "justify-start text-left" : "justify-end text-right"
      }`}
    >
      {!isRight && (
        <span className="min-w-0 truncate text-sm font-bold uppercase tracking-[0.08em] text-white/78 sm:text-base">
          {team.name}
        </span>
      )}
      <MiniFlag team={team} />
      {isRight && (
        <span className="min-w-0 truncate text-sm font-bold uppercase tracking-[0.08em] text-white/78 sm:text-base">
          {team.name}
        </span>
      )}
    </div>
  );
}

function MiniFlag({
  team,
  large = false,
}: {
  team: { badge: string; image: string; name: string };
  large?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/[0.1] ${
        large ? "h-24 w-36" : "h-12 w-16 sm:h-14 sm:w-20"
      }`}
    >
      {team.image ? (
        <img src={team.image} alt={team.name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="text-lg font-black text-volt">{team.badge}</span>
      )}
    </div>
  );
}
