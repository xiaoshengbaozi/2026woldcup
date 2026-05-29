import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { detailRows } from "@/lib/calendar";
import { formatTime } from "@/lib/format";
import { parseTeams } from "@/lib/teams";
import { generateMatchSlug } from "@/lib/match-detail";
import type { Match, Team } from "@/types/match";

function formatStage(stage: string): string {
  const groupMatch = stage.match(/Group\s+([A-L])/i);
  if (groupMatch) return "Group " + groupMatch[1];
  return stage;
}

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
      className="relative flex flex-col gap-2 rounded-3xl p-2.5 transition hover:bg-white/5 sm:gap-3 sm:p-4 cursor-pointer"
    >
      <div className="relative flex items-center justify-between gap-1 sm:gap-3">
        <TeamBlock team={teams.home} align="left" />
        <div className="absolute left-1/2 -translate-x-1/2 flex shrink-0 flex-col items-center">
          <div className="text-xs uppercase tracking-widest text-white/40">
            {formatStage(match.stage)}
          </div>
          <div className="mt-1 text-xl font-semibold leading-none text-white sm:text-3xl">
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
  return (
    <div className={`flex min-w-0 items-center gap-2 ${isRight ? "flex-row-reverse text-right" : "flex-row text-left"}`}>
      <div className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10">
        {team.image ? (
          <img src={team.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs font-semibold text-volt">{team.badge}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white sm:text-base">{team.name}</p>
      </div>
    </div>
  );
}
