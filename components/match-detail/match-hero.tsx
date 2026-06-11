"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin, Trophy } from "lucide-react";
import carrasquillaImage from "@/assets/players/PAN-panama/headshots/adalberto-carrasquilla.webp";
import afifImage from "@/assets/players/QAT-qatar/headshots/akram-afif.webp";
import messiImage from "@/assets/players/ARG-argentina/headshots/lionel-messi.webp";
import husseinImage from "@/assets/players/IRQ-iraq/headshots/aymen-hussein.webp";
import deBruyneImage from "@/assets/players/BEL-belgium/headshots/kevin-de-bruyne.webp";
import viniciusImage from "@/assets/players/BRA-brazil/headshots/vinicius-junior.webp";
import daviesImage from "@/assets/players/CAN-canada/headshots/alphonso-davies.webp";
import woodImage from "@/assets/players/NZL-new-zealand/headshots/chris-wood.webp";
import alabaImage from "@/assets/players/AUT-austria/headshots/david-alaba.webp";
import nazonImage from "@/assets/players/HAI-haiti/headshots/duckens-nazon.webp";
import dzekoImage from "@/assets/players/BIH-bosnia-and-herzegovina/headshots/edin-dzeko.webp";
import shomurodovImage from "@/assets/players/UZB-uzbekistan/headshots/eldor-shomurodov.webp";
import skhiriImage from "@/assets/players/TUN-tunisia/headshots/ellyes-skhiri.webp";
import kessieImage from "@/assets/players/CIV-ivory-coast/headshots/franck-kessie.webp";
import bacunaImage from "@/assets/players/CUW-curacao/headshots/juninho-bacuna.webp";
import ryanImage from "@/assets/players/AUS-australia/headshots/mathew-ryan.webp";
import diazImage from "@/assets/players/COL-colombia/headshots/luis-diaz.webp";
import modricImage from "@/assets/players/CRO-croatia/headshots/luka-modric.webp";
import hojlundImage from "@/assets/players/DEN-denmark/headshots/rasmus-hojlund.webp";
import caicedoImage from "@/assets/players/ECU-ecuador/headshots/moises-caicedo.webp";
import salahImage from "@/assets/players/EGY-egypt/headshots/mohamed-salah.webp";
import bellinghamImage from "@/assets/players/ENG-england/headshots/jude-bellingham.webp";
import yamalImage from "@/assets/players/ESP-spain/headshots/lamine-yamal.webp";
import mbappeImage from "@/assets/players/FRA-france/headshots/kylian-mbappe.webp";
import musialaImage from "@/assets/players/GER-germany/headshots/jamal-musiala.webp";
import kuboImage from "@/assets/players/JPN-japan/headshots/takefusa-kubo.webp";
import sonImage from "@/assets/players/KOR-south-korea/headshots/son-heung-min.webp";
import hakimiImage from "@/assets/players/MAR-morocco/headshots/achraf-hakimi.webp";
import gimenezImage from "@/assets/players/MEX-mexico/headshots/santiago-gimenez.webp";
import taremiImage from "@/assets/players/IRN-iran/headshots/mehdi-taremi.webp";
import almironImage from "@/assets/players/PAR-paraguay/headshots/miguel-almiron.webp";
import kudusImage from "@/assets/players/GHA-ghana/headshots/mohammed-kudus.webp";
import taamariImage from "@/assets/players/JOR-jordan/headshots/musa-al-taamari.webp";
import vanDijkImage from "@/assets/players/NED-netherlands/headshots/virgil-van-dijk.webp";
import haalandImage from "@/assets/players/NOR-norway/headshots/erling-haaland.webp";
import lewandowskiImage from "@/assets/players/POL-poland/headshots/robert-lewandowski.webp";
import ronaldoImage from "@/assets/players/POR-portugal/headshots/cristiano-ronaldo.webp";
import schickImage from "@/assets/players/CZE-czech-republic/headshots/patrik-schick.webp";
import tauImage from "@/assets/players/RSA-south-africa/headshots/percy-tau.webp";
import mahrezImage from "@/assets/players/DZA-algeria/headshots/riyad-mahrez.webp";
import mendesImage from "@/assets/players/CPV-cape-verde/headshots/ryan-mendes.webp";
import alDawsariImage from "@/assets/players/SAU-saudi-arabia/headshots/salem-al-dawsari.webp";
import mctominayImage from "@/assets/players/SCO-scotland/headshots/scott-mctominay.webp";
import maneImage from "@/assets/players/SEN-senegal/headshots/sadio-mane.webp";
import vlahovicImage from "@/assets/players/SRB-serbia/headshots/dusan-vlahovic.webp";
import xhakaImage from "@/assets/players/SUI-switzerland/headshots/granit-xhaka.webp";
import isakImage from "@/assets/players/SWE-sweden/headshots/alexander-isak.webp";
import gulerImage from "@/assets/players/TUR-turkey/headshots/arda-guler.webp";
import valverdeImage from "@/assets/players/URU-uruguay/headshots/federico-valverde.webp";
import pulisicImage from "@/assets/players/USA-united-states/headshots/christian-pulisic.webp";
import wissaImage from "@/assets/players/COD-dr-congo/headshots/yoane-wissa.webp";
import { formatTime } from "@/lib/format";
import { localizeLocationText } from "@/lib/calendar";
import { getMatchPhaseLabel } from "@/lib/match-live-display";
import { formatStageLabel } from "@/lib/stage";
import { parseTeams } from "@/lib/teams";
import { getVenueBannerImage } from "@/lib/venue-assets";
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

const PLAYER_ASSETS: Record<string, { src: string; name: string }> = {
  ARG: { src: messiImage.src, name: "Lionel Messi" },
  AUS: { src: ryanImage.src, name: "Mathew Ryan" },
  AUT: { src: alabaImage.src, name: "David Alaba" },
  BEL: { src: deBruyneImage.src, name: "Kevin De Bruyne" },
  BIH: { src: dzekoImage.src, name: "Edin Dzeko" },
  BRA: { src: viniciusImage.src, name: "Vinicius Junior" },
  CAN: { src: daviesImage.src, name: "Alphonso Davies" },
  CIV: { src: kessieImage.src, name: "Franck Kessie" },
  COD: { src: wissaImage.src, name: "Yoane Wissa" },
  COL: { src: diazImage.src, name: "Luis Diaz" },
  CPV: { src: mendesImage.src, name: "Ryan Mendes" },
  CRO: { src: modricImage.src, name: "Luka Modric" },
  CUW: { src: bacunaImage.src, name: "Juninho Bacuna" },
  CZE: { src: schickImage.src, name: "Patrik Schick" },
  DEN: { src: hojlundImage.src, name: "Rasmus Hojlund" },
  ALG: { src: mahrezImage.src, name: "Riyad Mahrez" },
  DZA: { src: mahrezImage.src, name: "Riyad Mahrez" },
  ECU: { src: caicedoImage.src, name: "Moises Caicedo" },
  EGY: { src: salahImage.src, name: "Mohamed Salah" },
  ENG: { src: bellinghamImage.src, name: "Jude Bellingham" },
  ESP: { src: yamalImage.src, name: "Lamine Yamal" },
  FRA: { src: mbappeImage.src, name: "Kylian Mbappe" },
  GER: { src: musialaImage.src, name: "Jamal Musiala" },
  GHA: { src: kudusImage.src, name: "Mohammed Kudus" },
  HAI: { src: nazonImage.src, name: "Duckens Nazon" },
  IRN: { src: taremiImage.src, name: "Mehdi Taremi" },
  IRQ: { src: husseinImage.src, name: "Aymen Hussein" },
  JPN: { src: kuboImage.src, name: "Takefusa Kubo" },
  JOR: { src: taamariImage.src, name: "Musa Al-Taamari" },
  KOR: { src: sonImage.src, name: "Son Heung-min" },
  MAR: { src: hakimiImage.src, name: "Achraf Hakimi" },
  MEX: { src: gimenezImage.src, name: "Santiago Gimenez" },
  NED: { src: vanDijkImage.src, name: "Virgil van Dijk" },
  NOR: { src: haalandImage.src, name: "Erling Haaland" },
  NZL: { src: woodImage.src, name: "Chris Wood" },
  PAN: { src: carrasquillaImage.src, name: "Adalberto Carrasquilla" },
  PAR: { src: almironImage.src, name: "Miguel Almiron" },
  POL: { src: lewandowskiImage.src, name: "Robert Lewandowski" },
  POR: { src: ronaldoImage.src, name: "Cristiano Ronaldo" },
  QAT: { src: afifImage.src, name: "Akram Afif" },
  RSA: { src: tauImage.src, name: "Percy Tau" },
  SAU: { src: alDawsariImage.src, name: "Salem Al-Dawsari" },
  SCO: { src: mctominayImage.src, name: "Scott McTominay" },
  SEN: { src: maneImage.src, name: "Sadio Mane" },
  SRB: { src: vlahovicImage.src, name: "Dusan Vlahovic" },
  SUI: { src: xhakaImage.src, name: "Granit Xhaka" },
  SWE: { src: isakImage.src, name: "Alexander Isak" },
  TUR: { src: gulerImage.src, name: "Arda Guler" },
  TUN: { src: skhiriImage.src, name: "Ellyes Skhiri" },
  URU: { src: valverdeImage.src, name: "Federico Valverde" },
  USA: { src: pulisicImage.src, name: "Christian Pulisic" },
  UZB: { src: shomurodovImage.src, name: "Eldor Shomurodov" },
};

const TEAM_ACCENTS: Record<string, { primary: string; secondary: string }> = {
  ARG: { primary: "rgba(80,180,255,0.55)", secondary: "rgba(255,255,255,0.2)" },
  AUT: { primary: "rgba(210,30,30,0.5)", secondary: "rgba(255,255,255,0.2)" },
  BEL: { primary: "rgba(230,30,30,0.5)", secondary: "rgba(255,210,0,0.3)" },
  BIH: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(255,210,0,0.3)" },
  BRA: { primary: "rgba(216,255,62,0.42)", secondary: "rgba(0,190,120,0.28)" },
  CAN: { primary: "rgba(220,30,30,0.48)", secondary: "rgba(255,255,255,0.18)" },
  COD: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(255,210,0,0.28)" },
  COL: { primary: "rgba(255,220,0,0.5)", secondary: "rgba(0,80,200,0.3)" },
  CPV: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(210,30,45,0.28)" },
  CRO: { primary: "rgba(220,30,30,0.48)", secondary: "rgba(255,255,255,0.2)" },
  CUW: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(255,210,0,0.28)" },
  CZE: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(210,30,45,0.28)" },
  DEN: { primary: "rgba(200,30,30,0.5)", secondary: "rgba(255,255,255,0.18)" },
  ALG: { primary: "rgba(0,160,95,0.48)", secondary: "rgba(255,255,255,0.2)" },
  DZA: { primary: "rgba(0,160,95,0.48)", secondary: "rgba(255,255,255,0.2)" },
  ECU: { primary: "rgba(255,220,0,0.48)", secondary: "rgba(0,80,200,0.3)" },
  EGY: { primary: "rgba(200,30,30,0.48)", secondary: "rgba(216,255,62,0.24)" },
  ENG: { primary: "rgba(255,255,255,0.32)", secondary: "rgba(220,40,55,0.28)" },
  ESP: { primary: "rgba(255,154,31,0.5)", secondary: "rgba(210,30,45,0.32)" },
  FRA: { primary: "rgba(38,91,255,0.56)", secondary: "rgba(255,55,72,0.3)" },
  GER: { primary: "rgba(255,255,255,0.28)", secondary: "rgba(216,255,62,0.24)" },
  GHA: { primary: "rgba(255,210,0,0.48)", secondary: "rgba(200,30,30,0.28)" },
  HAI: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(210,30,45,0.3)" },
  IRN: { primary: "rgba(0,160,95,0.48)", secondary: "rgba(210,30,45,0.28)" },
  IRQ: { primary: "rgba(200,30,30,0.48)", secondary: "rgba(255,255,255,0.2)" },
  JPN: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(255,255,255,0.2)" },
  JOR: { primary: "rgba(200,30,30,0.48)", secondary: "rgba(0,160,95,0.28)" },
  KOR: { primary: "rgba(210,30,45,0.5)", secondary: "rgba(0,80,200,0.28)" },
  MAR: { primary: "rgba(200,30,30,0.5)", secondary: "rgba(0,150,80,0.28)" },
  MEX: { primary: "rgba(0,160,95,0.42)", secondary: "rgba(220,40,55,0.28)" },
  NED: { primary: "rgba(255,140,0,0.52)", secondary: "rgba(0,80,200,0.25)" },
  NOR: { primary: "rgba(200,30,30,0.48)", secondary: "rgba(0,80,200,0.25)" },
  NZL: { primary: "rgba(40,40,40,0.55)", secondary: "rgba(255,255,255,0.2)" },
  PAN: { primary: "rgba(210,30,45,0.5)", secondary: "rgba(38,91,255,0.28)" },
  PAR: { primary: "rgba(210,30,45,0.5)", secondary: "rgba(38,91,255,0.28)" },
  POL: { primary: "rgba(255,255,255,0.3)", secondary: "rgba(200,30,30,0.28)" },
  POR: { primary: "rgba(0,120,60,0.48)", secondary: "rgba(210,30,45,0.3)" },
  QAT: { primary: "rgba(140,20,60,0.52)", secondary: "rgba(255,255,255,0.18)" },
  RSA: { primary: "rgba(255,210,0,0.48)", secondary: "rgba(0,160,95,0.28)" },
  SEN: { primary: "rgba(0,150,80,0.48)", secondary: "rgba(255,220,0,0.28)" },
  SRB: { primary: "rgba(200,30,30,0.48)", secondary: "rgba(0,80,200,0.25)" },
  SAU: { primary: "rgba(0,160,95,0.48)", secondary: "rgba(255,255,255,0.2)" },
  SCO: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(255,255,255,0.2)" },
  SUI: { primary: "rgba(220,30,30,0.5)", secondary: "rgba(255,255,255,0.2)" },
  SWE: { primary: "rgba(0,100,200,0.5)", secondary: "rgba(255,220,0,0.3)" },
  TUN: { primary: "rgba(210,30,45,0.5)", secondary: "rgba(255,255,255,0.2)" },
  TUR: { primary: "rgba(220,30,30,0.5)", secondary: "rgba(255,255,255,0.18)" },
  URU: { primary: "rgba(0,100,200,0.5)", secondary: "rgba(216,255,62,0.24)" },
  USA: { primary: "rgba(35,110,255,0.44)", secondary: "rgba(225,40,60,0.3)" },
  UZB: { primary: "rgba(38,91,255,0.5)", secondary: "rgba(210,30,45,0.28)" },
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

function isWarmupStage(stage?: string) {
  return stage === "热身赛";
}

function formatMatchStatus(detail: MatchDetail, start: Date) {
  if (detail.status === "not_started") return formatTime(start);
  if (detail.status === "halftime") return "中场";
  if (detail.status === "finished") return "已结束";

  const elapsed = detail.match.elapsed;
  if (typeof elapsed === "number" && elapsed > 0) {
    const phase = elapsed <= 45 ? "上半场" : "下半场";
    return `${phase} ${elapsed}'`;
  }

  return "比赛中";
}

export function MatchHero({ detail, favoriteAction }: { detail: MatchDetail; favoriteAction?: ReactNode }) {
  const teams = parseTeams(detail.match.summary);
  const stageLabel = formatStageLabel(detail.match.stage, detail.match.summary);
  const statusLabel = STATUS_LABEL[detail.status];
  const statusColor = STATUS_COLOR[detail.status];
  const adjustedStart = detail.match.start;
  const isLive = detail.status === "live" || detail.status === "halftime";
  const isStarted = detail.status !== "not_started";
  const heroStatusText = formatMatchStatus(detail, adjustedStart);
  const desktopLiveStatusText = detail.status === "finished" ? "已结束" : getMatchPhaseLabel(detail.match);
  const desktopCornerStatus = detail.status === "finished" ? "已结束" : "直播中";
  const homeTeamCode = normalizeTeamCode(detail.homeTeamCode);
  const awayTeamCode = normalizeTeamCode(detail.awayTeamCode);
  const homeAccent = getAccent(homeTeamCode);
  const awayAccent = getAccent(awayTeamCode);
  const hidePlayerPosters =
    detail.slug.startsWith("warmup-") ||
    detail.match.uid.startsWith("warmup-") ||
    isWarmupStage(detail.match.stage);
  const homePlayer = hidePlayerPosters ? undefined : PLAYER_ASSETS[homeTeamCode];
  const awayPlayer = hidePlayerPosters ? undefined : PLAYER_ASSETS[awayTeamCode];
  const venueBannerImage = getVenueBannerImage(detail.match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`match-hero-banner hero-card relative -mx-3 -mt-4 min-h-[280px] overflow-hidden rounded-b-[2rem] rounded-t-none shadow-none sm:-mx-6 sm:-mt-5 sm:min-h-[380px] lg:mx-0 lg:overflow-visible lg:rounded-[2rem] ${
        isStarted ? "lg:mt-0 lg:min-h-[216px]" : "lg:mt-14 lg:min-h-[360px]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {venueBannerImage && (
          <img
            src={venueBannerImage}
            alt=""
            aria-hidden="true"
            className="match-hero-bg-image absolute inset-0 h-full w-full object-cover opacity-55 saturate-[1.08]"
            loading="eager"
          />
        )}
        <div className="match-hero-bg-shade absolute inset-0 bg-[linear-gradient(180deg,rgba(2,3,3,0.20),rgba(2,3,3,0.70)),radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_52%)]" />
        <div className="match-hero-bg-glass absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.015)_34%,rgba(0,0,0,0.24))]" />
        <div className="match-hero-grid absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/35 to-transparent" />

        <PosterWedge side="left" accent={homeAccent} />
        <PosterWedge side="right" accent={awayAccent} />
        <div className="absolute left-1/2 top-12 hidden h-64 w-[520px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.13),transparent_68%)] blur-2xl sm:block" />
      </div>

      <div
        className={`relative z-10 flex min-h-[280px] flex-col justify-between pb-0 pt-1 sm:min-h-[380px] sm:pb-0 sm:pt-7 ${
          isStarted ? "lg:min-h-[216px] lg:justify-center lg:py-5" : "lg:min-h-[360px]"
        }`}
      >
        <div className={`flex items-center justify-end gap-3 ${isStarted ? "lg:hidden" : ""}`}>
          {detail.status !== "not_started" && (
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="relative flex h-2 w-2">
                  <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
              )}
              <span className={`glass-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        <div className="relative flex flex-1 translate-y-3 items-center justify-center py-2 sm:translate-y-0 sm:py-6">
          {!hidePlayerPosters && (
            <>
              <PlayerPosterSide
                side="left"
                team={teams.home}
                teamCode={homeTeamCode}
                player={homePlayer}
                accent={homeAccent}
                className={isStarted ? "hidden" : ""}
              />
              <PlayerPosterSide
                side="right"
                team={teams.away}
                teamCode={awayTeamCode}
                player={awayPlayer}
                accent={awayAccent}
                className={isStarted ? "hidden" : ""}
              />
            </>
          )}

          {isStarted && (
            <div className="relative z-20 hidden w-full max-w-[760px] flex-col items-center text-center lg:flex">
              <div className="absolute left-0 top-0 inline-flex items-center gap-2 rounded-full bg-white/[0.055] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-volt ring-1 ring-white/[0.08]">
                {isLive && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-volt opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt" />
                  </span>
                )}
                {desktopCornerStatus}
              </div>
              <div className="absolute right-0 top-0 rounded-full bg-white/[0.055] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/56 ring-1 ring-white/[0.08]">
                {formatTime(adjustedStart)}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/56">
                {stageLabel}
              </span>
              <div className="mt-2 text-xl font-semibold text-white/88">
                {desktopLiveStatusText}
              </div>
              <StartedScoreLine
                home={teams.home}
                away={teams.away}
                homeScore={detail.score.home}
                awayScore={detail.score.away}
              />
              <MatchMetaRow
                start={adjustedStart}
                location={detail.match.location}
                stage={detail.match.stage}
              />
            </div>
          )}

          {isStarted && (
            <StartedMobileBannerContent
              home={teams.home}
              away={teams.away}
              homeScore={detail.score.home}
              awayScore={detail.score.away}
              stageLabel={stageLabel}
              phaseLabel={desktopLiveStatusText}
              start={adjustedStart}
              location={detail.match.location}
              stage={detail.match.stage}
            />
          )}

          <div className={`relative z-20 flex max-w-[580px] -translate-y-1 flex-col items-center text-center sm:-translate-y-5 ${isStarted ? "hidden lg:hidden" : ""}`}>
            <img
              src="https://digitalhub.fifa.com/transform/157d23bf-7e13-4d7b-949e-5d27d340987e/WC26_Logo?&io=transform:fill&quality=75"
              alt="FIFA World Cup 2026"
              className="hidden h-auto w-auto object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.5)] sm:block sm:max-h-[126px]"
              loading="eager"
            />
            <div
              className="mt-2 text-3xl font-bold tabular-nums text-white sm:mt-3 sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "ScreenMatrix, monospace" }}
            >
              {heroStatusText}
            </div>
            <span className="glass-chip mt-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62">
              {stageLabel}
            </span>
            <div className="mt-2 grid w-[min(100%,560px)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:mt-3 sm:gap-4">
              <MatchupTeam team={teams.home} align="left" score={isStarted ? detail.score.home : null} />
              <span className="relative z-10 inline-flex justify-center">{favoriteAction}</span>
              <MatchupTeam team={teams.away} align="right" score={isStarted ? detail.score.away : null} />
            </div>
            <MatchMetaRow
              start={adjustedStart}
              location={detail.match.location}
              stage={detail.match.stage}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MatchMetaRow({
  start,
  location,
  stage,
}: {
  start: Date;
  location: string;
  stage: string;
}) {
  return (
    <div className="match-meta-row mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/50 sm:mt-4 sm:gap-3 sm:text-[11px]">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 text-volt/70" />
        {start.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-flare/70" />
        {formatTime(start)}
      </span>
      {location && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-flare/70" />
          <span className="max-w-[230px] truncate">{localizeLocationText(location)}</span>
        </span>
      )}
      {stage.includes("决赛") && (
        <span className="inline-flex items-center gap-1.5 text-volt/75">
          <Trophy className="h-3.5 w-3.5" />
          冠军争夺战
        </span>
      )}
    </div>
  );
}

function StartedScoreLine({
  home,
  away,
  homeScore,
  awayScore,
}: {
  home: { badge: string; image: string; name: string };
  away: { badge: string; image: string; name: string };
  homeScore: number;
  awayScore: number;
}) {
  return (
    <div className="mt-3 grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto_minmax(0,1fr)] items-center gap-2">
      <span className="min-w-0 truncate text-right text-base font-bold uppercase tracking-[0.08em] text-white/82">
        {home.name}
      </span>
      <MiniFlag team={home} compact />
      <span
        className="px-1 text-4xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.2)]"
        style={{ fontFamily: "ScreenMatrix, monospace" }}
      >
        {homeScore} - {awayScore}
      </span>
      <MiniFlag team={away} compact />
      <span className="min-w-0 truncate text-left text-base font-bold uppercase tracking-[0.08em] text-white/82">
        {away.name}
      </span>
    </div>
  );
}

function StartedMobileBannerContent({
  home,
  away,
  homeScore,
  awayScore,
  stageLabel,
  phaseLabel,
  start,
  location,
  stage,
}: {
  home: { badge: string; image: string; name: string };
  away: { badge: string; image: string; name: string };
  homeScore: number;
  awayScore: number;
  stageLabel: string;
  phaseLabel: string;
  start: Date;
  location: string;
  stage: string;
}) {
  const [phase, minute] = splitPhaseLabel(phaseLabel);

  return (
    <div className="relative z-20 flex w-full max-w-[22rem] flex-col items-center px-3 py-4 text-center lg:hidden">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
        <div className="flex min-w-0 flex-col items-center">
          <span
            className="text-5xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.18)]"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {homeScore}
          </span>
          <div className="mt-5 flex items-center gap-2 self-start">
            <span className="min-w-0 max-w-[5.2rem] truncate text-sm font-semibold text-white/82">
              {home.name}
            </span>
            <MiniFlag team={home} compact />
          </div>
        </div>

        <div className="flex min-w-[5.25rem] flex-col items-center pt-1">
          <span className="text-lg font-semibold leading-none text-white/90">
            {phase}
          </span>
          {minute && <span className="mt-1 text-xs font-semibold text-white/68">{minute}</span>}
          <span className="mt-12 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/62">
            {stageLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-center">
          <span
            className="text-5xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_22px_rgba(255,255,255,0.18)]"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {awayScore}
          </span>
          <div className="mt-5 flex items-center gap-2 self-end">
            <MiniFlag team={away} compact />
            <span className="min-w-0 max-w-[5.2rem] truncate text-sm font-semibold text-white/82">
              {away.name}
            </span>
          </div>
        </div>
      </div>

      <MatchMetaRow start={start} location={location} stage={stage} />
    </div>
  );
}

function splitPhaseLabel(label: string) {
  const match = label.match(/^(.+?)\s+(\d+'(?:\+\d+')?)$/);
  if (!match) return [label, ""] as const;
  return [match[1], match[2]] as const;
}

export function MatchTimelineBanner({
  home,
  away,
  startsAt,
  stage,
}: {
  home: { name: string; image?: string; code?: string };
  away: { name: string; image?: string; code?: string };
  startsAt?: string;
  stage?: string;
}) {
  const homeCode = normalizeTeamCode(home.code);
  const awayCode = normalizeTeamCode(away.code);
  const homeAccent = getAccent(homeCode);
  const awayAccent = getAccent(awayCode);
  const hidePlayerPosters = isWarmupStage(stage);
  const homePlayer = hidePlayerPosters ? undefined : PLAYER_ASSETS[homeCode];
  const awayPlayer = hidePlayerPosters ? undefined : PLAYER_ASSETS[awayCode];
  const startDate = startsAt ? new Date(startsAt) : null;
  const displayTime = startDate && Number.isFinite(startDate.getTime()) ? formatTime(startDate) : "TBD";

  return (
    <div className="relative min-h-[15rem] overflow-hidden bg-[#070b08] ring-1 ring-white/[0.08] sm:min-h-[17rem]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,3,3,0.08),rgba(2,3,3,0.76)),radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_54%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:34px_34px]" />
        <CompactPosterWedge side="left" accent={homeAccent} />
        <CompactPosterWedge side="right" accent={awayAccent} />
        <div className="absolute left-1/2 top-7 h-40 w-[360px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.13),transparent_68%)] blur-2xl" />
      </div>

      {!hidePlayerPosters && (
        <>
          <CompactPosterSide
            side="left"
            team={{ badge: homeCode, image: home.image || "", name: home.name }}
            teamCode={homeCode}
            player={homePlayer}
            accent={homeAccent}
          />
          <CompactPosterSide
            side="right"
            team={{ badge: awayCode, image: away.image || "", name: away.name }}
            teamCode={awayCode}
            player={awayPlayer}
            accent={awayAccent}
          />
        </>
      )}

      <div className="relative z-20 flex min-h-[15rem] flex-col items-center justify-center px-4 py-7 text-center sm:min-h-[17rem]">
        <span className="glass-chip px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/58">
          {formatStageLabel(stage || "Match")}
        </span>
        <div
          className="mt-3 text-4xl font-bold tabular-nums text-white sm:text-5xl"
          style={{ fontFamily: "ScreenMatrix, monospace" }}
        >
          {displayTime}
        </div>
        <div className="mt-4 grid w-full max-w-[520px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          <CompactMatchupTeam team={{ badge: homeCode, image: home.image || "", name: home.name }} align="left" />
          <span className="rounded-full bg-white/[0.08] px-4 py-2 text-base font-black uppercase tracking-[0.08em] text-volt shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(216,255,62,0.16)] ring-1 ring-white/[0.1]">
            VS
          </span>
          <CompactMatchupTeam team={{ badge: awayCode, image: away.image || "", name: away.name }} align="right" />
        </div>
      </div>
    </div>
  );
}

function CompactPosterWedge({
  side,
  accent,
}: {
  side: "left" | "right";
  accent: { primary: string; secondary: string };
}) {
  const isLeft = side === "left";

  return (
    <div
      className={`absolute inset-y-0 w-[46%] ${isLeft ? "left-0" : "right-0"}`}
      style={{
        background: isLeft
          ? `linear-gradient(90deg, ${accent.primary}, ${fadeToTransparent(accent.secondary)})`
          : `linear-gradient(90deg, ${fadeToTransparent(accent.secondary)}, ${accent.primary})`,
      }}
    />
  );
}

function normalizeTeamCode(code?: string) {
  const value = (code || "").trim().toUpperCase();
  if (value === "ALG") return "DZA";
  if (value === "KSA") return "SAU";
  return value;
}

function CompactPosterSide({
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
    <div className={`pointer-events-none absolute inset-y-0 z-10 w-[42%] ${isRight ? "right-0" : "left-0"}`}>
      <div
        className={`absolute top-8 h-24 w-24 rounded-full blur-[54px] sm:h-36 sm:w-36 sm:blur-[70px] ${
          isRight ? "right-4 sm:right-9" : "left-4 sm:left-9"
        }`}
        style={{ backgroundColor: accent.primary }}
      />
      {player ? (
        <img
          src={player.src}
          alt={player.name}
          className={`absolute bottom-0 h-[92%] w-auto max-w-[76%] object-contain object-bottom drop-shadow-[0_14px_22px_rgba(0,0,0,0.42)] sm:h-[98%] ${
            isRight ? "right-0" : "left-0"
          }`}
          loading="lazy"
        />
      ) : (
        <div
          className={`absolute bottom-4 grid h-32 w-24 place-items-center rounded-[1.25rem] bg-black/22 p-3 ring-1 ring-white/[0.1] backdrop-blur-xl sm:h-40 sm:w-32 ${
            isRight ? "right-4 sm:right-8" : "left-4 sm:left-8"
          }`}
        >
          <MiniFlag team={team} />
          <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">{teamCode}</span>
        </div>
      )}
    </div>
  );
}

function CompactMatchupTeam({
  team,
  align,
}: {
  team: { badge: string; image: string; name: string };
  align: "left" | "right";
}) {
  const isRight = align === "right";

  return (
    <div className={`flex min-w-0 items-center gap-2 ${isRight ? "justify-start text-left" : "justify-end text-right"}`}>
      {!isRight && <span className="hidden min-w-0 truncate text-sm font-bold uppercase tracking-[0.08em] text-white/78 sm:block">{team.name}</span>}
      <MiniFlag team={team} />
      {isRight && <span className="hidden min-w-0 truncate text-sm font-bold uppercase tracking-[0.08em] text-white/78 sm:block">{team.name}</span>}
    </div>
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
  className = "",
}: {
  team: { badge: string; image: string; name: string };
  teamCode: string;
  side: "left" | "right";
  player?: { src: string; name: string };
  accent: { primary: string; secondary: string };
  className?: string;
}) {
  const isRight = side === "right";

  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 34 : -34 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-y-0 z-10 w-[30%] sm:w-[42%] ${
        isRight ? "right-0" : "left-0"
      } ${className}`}
    >
      <div
        className={`absolute top-10 h-28 w-28 rounded-full blur-[60px] sm:h-44 sm:w-44 sm:blur-[80px] ${
          isRight ? "right-8 sm:right-16" : "left-8 sm:left-16"
        }`}
        style={{ backgroundColor: accent.primary }}
      />
      {player ? (
        <>
          <img
            src={player.src}
            alt={player.name}
            className={`absolute bottom-0 h-[80%] w-auto max-w-none object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.35)] sm:h-[125%] sm:drop-shadow-[0_18px_28px_rgba(0,0,0,0.42)] ${
              isRight ? "right-[-4%] origin-bottom-right sm:right-0" : "left-[-4%] origin-bottom-left sm:left-0"
            }`}
            loading="eager"
          />
          <span
            className={`absolute hidden text-[13px] font-bold uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:block ${
              isRight ? "right-12 top-[68%] origin-bottom-right" : "left-12 top-[68%] origin-bottom-left"
            }`}
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {player.name}
          </span>
        </>
      ) : (
        <div
          className={`absolute bottom-0 grid h-full w-36 place-items-center rounded-[1.5rem] bg-black/20 p-5 shadow-none ring-1 ring-white/[0.1] backdrop-blur-xl sm:w-64 sm:rounded-[2rem] sm:p-8 ${
            isRight ? "right-6 sm:right-12" : "left-6 sm:left-12"
          }`}
        >
          <MiniFlag team={team} large />
          <span className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/36 sm:mt-4 sm:text-xs">
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
  score,
}: {
  team: { badge: string; image: string; name: string };
  align: "left" | "right";
  score?: number | null;
}) {
  const isRight = align === "right";
  const hasScore = typeof score === "number";

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
      <div className="flex shrink-0 flex-col items-center gap-1">
        {hasScore && (
          <span
            className="text-2xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.24)] sm:text-3xl"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {score}
          </span>
        )}
        <MiniFlag team={team} />
      </div>
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
  compact = false,
}: {
  team: { badge: string; image: string; name: string };
  large?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/[0.1] ${
        large ? "h-24 w-36" : compact ? "h-10 w-14" : "h-12 w-16 sm:h-14 sm:w-20"
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
