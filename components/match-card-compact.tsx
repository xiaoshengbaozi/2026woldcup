import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { detailRows } from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import type { Match, Team } from "@/types/match";

function formatStage(stage: string): string {
  const groupMatch = stage.match(/Group\s+([A-L])/i);
  if (groupMatch) return `小组赛${groupMatch[1]}组`;
  return stage;
}

export function MatchCardCompact({
  match,
  timezoneOffset = 0,
}: {
  match: Match;
  timezoneOffset?: number;
}) {
  const teams = parseTeams(match.summary);
  const details = detailRows(match);
  const venue =
    details.find((detail) => detail.type === "venue")?.text ||
    match.location;
  const adjustedStart = new Date(
    match.start.getTime() + timezoneOffset * 3600000,
  );

  return (
    <motion.article
      layout
      className="relative flex flex-col gap-1.5 rounded-[1.25rem] p-2 sm:gap-2 sm:p-3"
    >
      <div className="relative flex items-center justify-between gap-1 sm:gap-3">
        <TeamBlockCompact team={teams.home} align="left" />

        <div className="absolute left-1/2 -translate-x-1/2 flex shrink-0 flex-col items-center">
          <div className="text-[9px] uppercase tracking-[0.14em] text-white/40 sm:text-xs sm:tracking-[0.18em]">
            {formatStage(match.stage)}
          </div>
          <div
            className="mt-1 text-xl font-semibold leading-none text-white sm:text-2xl"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {formatTime(adjustedStart)}
          </div>
        </div>

        <TeamBlockCompact team={teams.away} align="right" />
      </div>

      <div className="flex justify-center">
        {match.url ? (
          <a
            href={match.url}
            target="_blank"
            rel="noreferrer"
            className="glass-chip inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-white/50 transition hover:text-volt sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs sm:text-white/56"
          >
            <MapPin className="h-3 w-3 shrink-0 text-flare sm:h-3.5 sm:w-3.5" />
            <span className="max-w-[130px] truncate sm:max-w-[180px]">{venue}</span>
          </a>
        ) : (
          <span className="glass-chip inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-white/50 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs sm:text-white/56">
            <MapPin className="h-3 w-3 shrink-0 text-flare sm:h-3.5 sm:w-3.5" />
            <span className="max-w-[130px] truncate sm:max-w-[180px]">{venue}</span>
          </span>
        )}
      </div>
    </motion.article>
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
      className={`flex min-w-0 items-center gap-1 sm:gap-2 ${
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
        <p className="truncate text-[10px] font-medium text-white sm:text-[13px] sm:font-semibold">
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
