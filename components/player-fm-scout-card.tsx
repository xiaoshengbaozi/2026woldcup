import { CircleDollarSign, ExternalLink, Sparkles } from "lucide-react";
import type { PlayerScoutNote } from "@/lib/player-scout-notes";

export function PlayerFmScoutCard({
  note,
  className = "",
  href,
}: {
  note: PlayerScoutNote;
  className?: string;
  href?: string;
}) {
  const cardHref = href || note.sourceUrl;
  const isExternal = /^https?:\/\//i.test(cardHref);
  const ratingTone =
    note.gsRating >= 95
      ? "text-volt"
      : note.gsRating >= 90
        ? "text-flare"
        : "text-white/84";

  return (
    <a
      href={cardHref}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={`group block overflow-hidden rounded-[1.35rem] bg-[linear-gradient(145deg,rgba(216,255,62,0.08),rgba(255,255,255,0.035)_48%,rgba(255,123,84,0.07))] p-4 ring-1 ring-volt/12 transition hover:-translate-y-0.5 hover:bg-white/[0.06] hover:ring-volt/28 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-volt/80 ring-1 ring-volt/12">
            <Sparkles className="h-3 w-3" />
            FM Scout
          </div>
          <p className="mt-2 text-xs font-bold text-white/40">{note.gameVersion} 社区球探</p>
        </div>
        <ExternalLink className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-volt" />
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-black/22 ring-1 ring-white/[0.07]">
          <div className="text-center">
            <p className={`text-3xl font-black tabular-nums ${ratingTone}`} style={{ fontFamily: "ScreenMatrix, monospace" }}>
              {note.gsRating}
            </p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/28">GS</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white/88">{note.bestRoleCn}</p>
          <p className="mt-1 truncate text-xs text-white/36">{note.bestRole}</p>
          <p className="mt-3 text-xs leading-5 text-white/48">{note.summary}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ScoutMiniStat label="潜力" value={note.potentialAbility} />
        <ScoutMiniStat label="惯用脚" value={note.footCn} />
        <ScoutMiniStat label="投票" value={note.communityVotes} />
      </div>

      {note.contractDetails && (
        <div className="mt-3 rounded-2xl bg-black/18 p-3 ring-1 ring-white/[0.045]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-volt/10 text-volt ring-1 ring-volt/10">
                <CircleDollarSign className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white/78">{note.contractDetails.statusCn}</p>
                <p className="mt-0.5 truncate text-[10px] font-bold text-white/30">
                  Contract Details · {note.contractDetails.contractUntil}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-black text-volt tabular-nums">{formatCny(note.contractDetails.weeklyWageCny)}</p>
              <p className="mt-0.5 text-[10px] font-bold text-white/28">人民币/周</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ScoutMiniStat label="身价" value={formatCny(note.contractDetails.marketValueCny)} />
            <ScoutMiniStat
              label="转会区间"
              value={`${formatCny(note.contractDetails.transferValueRangeCny[0])}-${formatCny(note.contractDetails.transferValueRangeCny[1])}`}
            />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-white/28">{note.contractDetails.sourceCn}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-white/[0.045] px-2.5 py-1 text-[11px] font-bold text-white/52 ring-1 ring-white/[0.055]">
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}

export function formatCny(value: number) {
  if (!Number.isFinite(value)) return "待更新";
  if (Math.abs(value) >= 100000000) {
    const text = (value / 100000000).toFixed(value >= 1000000000 ? 1 : 2);
    return `¥${trimTrailingZero(text)}亿`;
  }
  if (Math.abs(value) >= 10000) {
    return `¥${trimTrailingZero((value / 10000).toFixed(value >= 1000000 ? 0 : 1))}万`;
  }
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

function trimTrailingZero(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function ScoutMiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-black/18 px-2.5 py-2 ring-1 ring-white/[0.045]">
      <p className="text-[10px] font-bold text-white/30">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-white/76">{value}</p>
    </div>
  );
}
