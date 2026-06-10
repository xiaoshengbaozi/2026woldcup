import { CircleDollarSign, Sparkles } from "lucide-react";
import type { PlayerScoutNote } from "@/lib/player-scout-notes";

export function PlayerFmScoutCard({
  note,
  className = "",
}: {
  note: PlayerScoutNote;
  className?: string;
}) {
  const ratingTone =
    note.gsRating >= 95
      ? "text-volt"
      : note.gsRating >= 90
        ? "text-flare"
        : "text-white/84";

  return (
    <div
      className={`player-scout-card hero-card block overflow-hidden p-4 ${className}`}
    >
      <div className="relative z-10 flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-volt/80" />
        <p className="min-w-0 truncate text-sm font-black text-white/88">{note.gameVersion}社区球探</p>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-[auto_1fr] gap-4">
        <div className="grid h-20 w-20 place-items-center border-r border-white/[0.08] pr-4">
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

      <div className="relative z-10 mt-4 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.08] py-3">
        <ScoutMiniStat label="潜力" value={note.potentialAbility} />
        <ScoutMiniStat label="惯用脚" value={note.footCn} />
        <ScoutMiniStat label="投票" value={note.communityVotes} />
      </div>

      {note.contractDetails && (
        <div className="relative z-10 mt-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center text-volt">
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
          <div className="mt-3 grid grid-cols-2 divide-x divide-white/[0.08] border-t border-white/[0.08] pt-3">
            <ScoutMiniStat label="身价" value={formatCny(note.contractDetails.marketValueCny)} />
            <ScoutMiniStat
              label="转会区间"
              value={`${formatCny(note.contractDetails.transferValueRangeCny[0])}-${formatCny(note.contractDetails.transferValueRangeCny[1])}`}
            />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-white/28">{note.contractDetails.sourceCn}</p>
        </div>
      )}

      {note.tags.length > 0 && (
        <p className="relative z-10 mt-3 text-[11px] font-bold leading-5 text-white/48">
          {note.tags.join(" · ")}
        </p>
      )}
    </div>
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
    <div className="min-w-0 px-2.5">
      <p className="text-[10px] font-bold text-white/30">{label}</p>
      <p className="mt-0.5 truncate text-xs font-black text-white/76">{value}</p>
    </div>
  );
}
