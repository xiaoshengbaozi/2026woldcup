import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { detailRows } from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import { generateMatchSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import type { Match, Team } from "@/types/match";

export function MatchCard({ match, timezoneOffset = 0 }: { match: Match; timezoneOffset?: number }) {
  const teams = parseTeams(match.summary);
  const details = detailRows(match);
  const venue = details.find((detail) => detail.type === "venue")?.text || match.location;
  const adjustedStart = new Date(match.start.getTime() + timezoneOffset * 3600000);
  const slug = generateMatchSlug(match.summary);

  return (
    <Link href={"/matches/" + slug}>
    <motion.article
      layout
      className="group relative flex min-w-0 flex-col gap-2 rounded-3xl p-2.5 transition sm:gap-3 sm:p-4 cursor-pointer"
    >
      <div className="relative flex items-center justify-between gap-1 sm:gap-3">
        <TeamBlock team={teams.home} align="left" />
        <div className="absolute left-1/2 -translate-x-1/2 flex w-20 shrink-0 flex-col items-center sm:w-auto">
          <div className="max-w-full truncate text-[10px] uppercase tracking-[0.12em] text-white/40 transition group-hover:text-volt/60 sm:text-xs sm:tracking-widest">
            {formatStageLabel(match.stage)}
          </div>
          <div
            className="mt-1 text-lg font-semibold leading-none text-white transition group-hover:text-volt sm:text-3xl"
            style={{ fontFamily: "ScreenMatrix, monospace" }}
          >
            {formatTime(adjustedStart)}
          </div>
        </div>
        <TeamBlock team={teams.away} align="right" />
      </div>
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-white/50">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-flare" />
          <span className="max-w-[180px] truncate">{venue}</span>
        </span>
      </div>
    </motion.article>
    </Link>
  );
}

function TeamBlock({ team, align }: { team: Team; align: "left" | "right" }) {
  const isRight = align === "right";
  const localName = getLocalName(team);
  return (
    <div className={`flex min-w-0 max-w-[38%] items-center gap-1.5 sm:max-w-none sm:gap-2 ${isRight ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
      <div className="grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 sm:h-10 sm:w-14">
        {team.image ? (
          <img src={team.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs font-semibold text-volt">{team.badge}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-white transition group-hover:text-volt sm:text-base">{team.name}</p>
        <p className="mt-0.5 hidden truncate text-[10px] uppercase tracking-[0.1em] text-white/30 transition group-hover:text-volt/40 sm:block sm:text-xs">{localName}</p>
      </div>
    </div>
  );
}

const countryNames: Record<string, string> = {
  mx: "Mexico", za: "South Africa", kr: "South Korea", cz: "Czech Republic",
  ca: "Canada", ba: "Bosnia & Herz.", us: "United States", py: "Paraguay",
  qa: "Qatar", ch: "Switzerland", br: "Brazil", ma: "Morocco",
  ht: "Haiti", "gb-sct": "Scotland", tr: "Turkey", jp: "Japan",
  de: "Germany", cw: "Curacao", au: "Australia", eg: "Egypt",
  fr: "France", co: "Colombia", it: "Italy", tn: "Tunisia",
  dz: "Algeria", pe: "Peru", ar: "Argentina", at: "Austria",
  dk: "Denmark", uy: "Uruguay", pt: "Portugal", no: "Norway",
  "gb-eng": "England", hr: "Croatia", ec: "Ecuador", nl: "Netherlands",
  sn: "Senegal", ae: "UAE", ir: "Iran", nz: "New Zealand",
  ci: "Cote d'Ivoire", gh: "Ghana", pa: "Panama", cv: "Cape Verde",
};

function getLocalName(team: Team): string {
  if (!team.image) return team.name;
  const code = team.image.split("/").pop()?.split(".")[0] ?? "";
  return countryNames[code] ?? code.toUpperCase();
}
