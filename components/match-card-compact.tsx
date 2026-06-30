import { MapPin } from "lucide-react";
import Link from "next/link";
import { detailRows } from "@/lib/calendar";
import { areMatchTeamsConfirmed } from "@/lib/match-availability";
import { getMatchLiveDisplay, getMatchScore, getPenaltyScore } from "@/lib/match-live-display";
import { parseTeams } from "@/lib/teams";
import { generateMatchRouteSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import type { Match, Team } from "@/types/match";

export function MatchCardCompact({
  match,
  timezoneOffset = 0,
  stageLabel,
}: {
  match: Match;
  timezoneOffset?: number;
  stageLabel?: string;
}) {
  const teams = parseTeams(match.summary);
  const details = detailRows(match);
  const venue =
    details.find((detail) => detail.type === "venue")?.text ||
    match.location;
  const adjustedStart = new Date(
    match.start.getTime() + timezoneOffset * 3600000,
  );
  const slug = generateMatchRouteSlug(match);
  const isUnlocked = areMatchTeamsConfirmed(match.summary);
  const display = getMatchLiveDisplay({
    match,
    kickoff: adjustedStart,
    scheduledStageLabel: stageLabel ?? formatStageLabel(match.stage, match.summary),
  });

  const card = (
    <article
      className={`group relative flex min-w-0 flex-col gap-1.5 rounded-[1.25rem] p-2 transition sm:gap-2 sm:p-3 ${
        isUnlocked ? "cursor-pointer" : "cursor-default opacity-70"
      }`}
    >
      <div className="relative flex items-center justify-between gap-1 sm:gap-3">
        <TeamBlockCompact team={teams.home} align="left" />

        <div className="absolute left-1/2 -translate-x-1/2 flex w-16 shrink-0 flex-col items-center sm:w-auto">
          <div className="max-w-full truncate text-[9px] uppercase tracking-[0.1em] text-white/40 transition group-hover:text-volt/60 sm:text-xs sm:tracking-[0.18em]">
            {display.topLabel}
          </div>
          <div
            className="mt-1 text-xl font-semibold leading-none text-white transition group-hover:text-volt sm:text-2xl"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {display.hasStarted ? <InlineScore match={match} /> : display.centerLabel}
          </div>
        </div>

        <TeamBlockCompact team={teams.away} align="right" />
      </div>
    </article>
  );

  return isUnlocked ? (
    <Link href={"/matches/" + slug} prefetch={false}>
      {card}
    </Link>
  ) : (
    card
  );
}

function InlineScore({ match }: { match: Match }) {
  const score = getMatchScore(match);
  const penalty = getPenaltyScore(match);

  if (!penalty) return <>{score.home} - {score.away}</>;

  return (
    <>
      {score.home}
      <span className="align-[0.08em] text-[0.58em] opacity-85">({penalty.home})</span>
      {" - "}
      {score.away}
      <span className="align-[0.08em] text-[0.58em] opacity-85">({penalty.away})</span>
    </>
  );
}

function TeamBlockCompact({
  team,
  align,
}: {
  team: Team;
  align: "left" | "right";
}) {
  const isRight = align === "right";
  const localName = getLocalName(team);

  return (
    <div
      className={`flex min-w-0 max-w-[38%] items-center gap-1 sm:max-w-none sm:gap-2 ${
        isRight ? "flex-row-reverse text-right" : "flex-row text-left"
      }`}
    >
      <div className="grid h-[26px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[4px] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,.1)] sm:h-[29px] sm:w-[38px] sm:rounded-lg">
        {team.image ? (
          <img
            src={team.image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="tabular text-[9px] font-semibold text-volt sm:text-xs">
            {team.badge}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-medium text-white transition group-hover:text-volt sm:text-[13px] sm:font-semibold">
          {team.name}
        </p>
        <p className="mt-0.5 hidden text-[9px] uppercase tracking-[0.12em] text-white/24 sm:block">
          {localName}
        </p>
      </div>
    </div>
  );
}

const countryNames: Record<string, string> = {
  mx: "Mexico",
  za: "South Africa",
  kr: "South Korea",
  cz: "Czech Republic",
  ca: "Canada",
  ba: "Bosnia & Herz.",
  us: "United States",
  py: "Paraguay",
  qa: "Qatar",
  ch: "Switzerland",
  br: "Brazil",
  ma: "Morocco",
  ht: "Haiti",
  "gb-sct": "Scotland",
  tr: "Turkey",
  jp: "Japan",
  de: "Germany",
  cw: "Curacao",
  au: "Australia",
  eg: "Egypt",
  fr: "France",
  co: "Colombia",
  it: "Italy",
  tn: "Tunisia",
  dz: "Algeria",
  pe: "Peru",
  ar: "Argentina",
  at: "Austria",
  dk: "Denmark",
  uy: "Uruguay",
  pt: "Portugal",
  no: "Norway",
  "gb-eng": "England",
  hr: "Croatia",
  ec: "Ecuador",
  nl: "Netherlands",
  sn: "Senegal",
  ae: "UAE",
  ir: "Iran",
  nz: "New Zealand",
  ci: "Cote d'Ivoire",
  gh: "Ghana",
  pa: "Panama",
  cv: "Cape Verde",
};

function getLocalName(team: Team): string {
  if (!team.image) return team.name;
  const code = team.image.split("/").pop()?.split(".")[0] ?? "";
  return countryNames[code] ?? code.toUpperCase();
}
