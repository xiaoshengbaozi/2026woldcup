import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { generateMatchSlug } from "@/lib/match-detail";
import { formatStageLabel } from "@/lib/stage";
import { parseTeams } from "@/lib/teams";
import type { Match } from "@/types/match";

export function LiveMatchCard({
  match,
  isLive = true,
  stageLabel,
}: {
  match: Match;
  isLive?: boolean;
  stageLabel?: string;
}) {
  const teams = parseTeams(match.summary);
  const slug = generateMatchSlug(match.summary);
  const elapsed = Math.max(0, Math.floor((Date.now() - match.start.getTime()) / 60000));
  const isHT = isLive && elapsed >= 45 && elapsed < 60;
  const minute = isLive ? (isHT ? "HT" : `${Math.min(elapsed, 90)}'`) : formatKickoff(match.start);
  const statusLabel = isLive ? (isHT ? "中场" : "直播中") : "即将开赛";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl transition" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(5,8,8,0.7)", boxShadow: isHT ? "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(251,191,36,0.1), 0 0 40px rgba(251,191,36,0.08)" : "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(216,255,62,0.08), 0 0 40px rgba(216,255,62,0.06)" }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ background: isHT ? "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.12) 0%, transparent 60%)" : "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.12) 0%, transparent 60%)" }} />
      <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ padding: "1px", background: isHT ? "linear-gradient(135deg, rgba(251,191,36,0.3), rgba(255,255,255,0.08), rgba(251,191,36,0.1))" : "linear-gradient(135deg, rgba(216,255,62,0.3), rgba(255,255,255,0.08), rgba(216,255,62,0.1))", mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", maskComposite: "exclude" }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between px-3.5 pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{stageLabel ?? formatStageLabel(match.stage)}</span>
          <span className={`tabular text-xs font-bold ${isHT ? "text-amber-400" : "text-volt"}`}>{minute}</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-3.5 py-4">
          <div className="flex min-w-0 items-center gap-1.5">{teams.home.image ? <img src={teams.home.image} alt={teams.home.name} className="h-5 w-7 shrink-0 rounded-sm object-cover ring-1 ring-white/10" loading="lazy" /> : <span className="grid h-5 w-7 shrink-0 place-items-center rounded-sm bg-white/10 text-[9px] font-bold text-volt">{teams.home.badge}</span>}<span className="truncate text-sm font-bold text-white/90">{teams.home.name}</span></div>
          <span className="tabular text-xl font-bold text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>0</span>
          <span className="text-xs text-white/25">-</span>
          <span className="tabular text-xl font-bold text-white" style={{ fontFamily: "ScreenMatrix, monospace" }}>0</span>
          <div className="flex min-w-0 items-center gap-1.5"><span className="truncate text-sm font-bold text-white/90">{teams.away.name}</span>{teams.away.image ? <img src={teams.away.image} alt={teams.away.name} className="h-5 w-7 shrink-0 rounded-sm object-cover ring-1 ring-white/10" loading="lazy" /> : <span className="grid h-5 w-7 shrink-0 place-items-center rounded-sm bg-white/10 text-[9px] font-bold text-volt">{teams.away.badge}</span>}</div>
        </div>
        <div className="flex items-center justify-center gap-2 pb-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isHT ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30 shadow-[0_0_12px_rgba(251,191,36,0.3)]" : "bg-volt/15 text-volt ring-1 ring-volt/25 shadow-[0_0_12px_rgba(216,255,62,0.25)]"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isHT ? "bg-amber-400" : isLive ? "bg-volt live-dot" : "bg-flare"}`} />{statusLabel}
          </span>
          <Link href={"/matches/" + slug} className="inline-flex items-center gap-1 rounded-full bg-white/[0.055] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 ring-1 ring-white/10 transition hover:bg-volt hover:text-black hover:shadow-[0_0_18px_rgba(216,255,62,.28)]">
            详情<ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="h-1 w-full bg-white/[0.04]">
          <motion.div initial={{ width: 0 }} animate={{ width: isLive ? (isHT ? "45%" : `${Math.min(elapsed / 90 * 100, 100)}%`) : "8%" }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className={`h-full ${isHT ? "bg-gradient-to-r from-amber-500 to-amber-400" : isLive ? "bg-gradient-to-r from-volt to-volt/80" : "bg-gradient-to-r from-flare to-volt"}`} style={{ boxShadow: isHT ? "0 0 16px rgba(251,191,36,0.6)" : isLive ? "0 0 16px rgba(216,255,62,0.5)" : "0 0 16px rgba(255,154,31,0.45)" }} />
        </div>
      </div>
    </div>
  );
}

function formatKickoff(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
