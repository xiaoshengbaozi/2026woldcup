"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { getTeamCodeFromName, localizeTeamName } from "@/lib/team-localization";
import { useMatchLines } from "@/lib/use-match-lines";
import { formatDateTime } from "@/lib/format";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";

export function MatchLinesPanel() {
  const { events, timestamp, loading, error } = useMatchLines();
  const visibleEvents = events;

  return (
    <section className="hero-card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(216,255,62,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,154,31,0.08),transparent_32%)]" />

      <div className="relative flex items-center justify-between border-b border-white/[0.04] pb-3 mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            比赛盘口
          </p>
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-[0.12em] text-volt"
          style={{ fontFamily: "ScreenMatrix" }}
        >
          {events.length} 场
        </span>
      </div>

      <div className="relative">
        {loading && (
          <div className="grid min-h-[220px] place-items-center rounded-3xl border border-white/[0.06] bg-black/20 text-xs uppercase tracking-[0.16em] text-white/35">
            正在同步比赛盘口...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl border border-flare/20 bg-flare/5 p-6 text-sm text-flare">
            比赛盘口暂时不可用：{error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((event, index) => (
              <MatchLineCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MatchLineCard({ event, index }: { event: MatchLineEvent; index: number }) {
  const moneyline = pickMoneyline(event);
  const strongest = moneyline.reduce<MatchLineMarket | null>(
    (best, market) => (!best || market.yesPrice > best.yesPrice ? market : best),
    null
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.45 }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-volt/15 hover:bg-white/[0.05]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <TeamSide
          name={event.homeTeam}
          market={findTeamMarket(moneyline, event.homeTeam)}
          isHot={sameMarket(strongest, findTeamMarket(moneyline, event.homeTeam))}
          align="left"
        />
        <span className="shrink-0 text-[11px] tabular-nums text-white/30">
          {formatDateTime(event.startTime)}
        </span>
        <TeamSide
          name={event.awayTeam}
          market={findTeamMarket(moneyline, event.awayTeam)}
          isHot={sameMarket(strongest, findTeamMarket(moneyline, event.awayTeam))}
          align="right"
        />
      </div>

      <OddsBar markets={moneyline} strongest={strongest} />
    </motion.article>
  );
}

function TeamSide({
  name,
  isHot,
  align,
}: {
  name: string;
  market?: MatchLineMarket;
  isHot: boolean;
  align: "left" | "right";
}) {
  const localized = localizeTeamName(name);
  const teamCode = getTeamCodeFromName(name);
  const isRight = align === "right";

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${isRight ? "flex-row-reverse text-right" : ""}`}>
      {teamCode ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getFlagUrl(teamCode, 40)}
          alt={localized}
          className={`h-6 w-8 shrink-0 rounded object-cover transition ${
            isHot ? "ring-1 ring-volt/40 shadow-[0_0_12px_rgba(216,255,62,0.2)]" : "ring-1 ring-white/10"
          }`}
          loading="lazy"
        />
      ) : (
        <div
          className={`grid h-6 w-8 shrink-0 place-items-center rounded text-[10px] font-bold transition ${
            isHot ? "bg-volt/10 text-volt" : "bg-white/[0.04] text-white/50"
          }`}
        >
          {localized.slice(0, 2)}
        </div>
      )}
      <span className={isHot ? "truncate text-sm font-bold text-volt" : "truncate text-sm font-semibold text-white/80"}>
        {localized}
      </span>
    </div>
  );
}

function OddsBar({
  markets,
  strongest,
}: {
  markets: MatchLineMarket[];
  strongest: MatchLineMarket | null;
}) {
  return (
    <div className="flex h-1 overflow-hidden rounded-full bg-white/[0.055]">
      {markets.map((market, index) => {
        const isHot = sameMarket(strongest, market);
        return (
          <div
            key={market.id}
            className={[
              "h-full transition-all",
              isHot
                ? "bg-volt shadow-[0_0_14px_rgba(216,255,62,0.4)]"
                : index === 1
                  ? "bg-white/30"
                  : "bg-flare/60",
            ].join(" ")}
            style={{ width: `${Math.max(2, market.yesPrice)}%` }}
          />
        );
      })}
    </div>
  );
}

function pickMoneyline(event: MatchLineEvent) {
  return event.markets
    .filter((market) => market.marketType === "moneyline")
    .slice(0, 3);
}

function findTeamMarket(markets: MatchLineMarket[], teamName: string) {
  return markets.find((market) => normalize(market.label) === normalize(teamName));
}

function sameMarket(a?: MatchLineMarket | null, b?: MatchLineMarket | null) {
  return Boolean(a && b && a.id === b.id);
}

function normalize(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
