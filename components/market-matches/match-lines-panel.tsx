"use client";

import { Radio } from "lucide-react";
import { motion } from "framer-motion";
import { getTeamCodeFromName, localizeTeamName } from "@/lib/team-localization";
import { useMatchLines } from "@/lib/use-match-lines";
import { formatDateTime } from "@/lib/format";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";

export function MatchLinesPanel() {
  const { events, timestamp, loading, error } = useMatchLines();
  const visibleEvents = events.slice(0, 18);

  return (
    <section className="hero-card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(216,255,62,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,154,31,0.08),transparent_32%)]" />

      <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-volt">
            <Radio className="h-3.5 w-3.5" />
            Polymarket 比赛盘口
          </div>
          <h2 className="text-xl font-semibold text-white">每场比赛盘口</h2>
          <p className="mt-1 text-xs text-white/42">独赢盘主胜 / 平局 / 客胜</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/38">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            {events.length} 场比赛
          </span>
          {timestamp && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              更新时间 {formatDateTime(timestamp)}
            </span>
          )}
        </div>
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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
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
      className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition hover:border-volt/20 hover:bg-white/[0.055]"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <TeamSide
          name={event.homeTeam}
          market={findTeamMarket(moneyline, event.homeTeam)}
          isHot={sameMarket(strongest, findTeamMarket(moneyline, event.homeTeam))}
          align="left"
        />
        <div className="shrink-0 px-2 text-center">
          <p className="text-[10px] font-medium tracking-[0.06em] text-white/42">
            {formatDateTime(event.startTime)}
          </p>
        </div>
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
  market,
  isHot,
  align,
}: {
  name: string;
  market?: MatchLineMarket;
  isHot: boolean;
  align: "left" | "right";
}) {
  const localized = localizeTeamName(name);
  const isRight = align === "right";

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${isRight ? "flex-row-reverse text-right" : ""}`}>
      <div
        className={[
          "grid h-9 w-12 shrink-0 place-items-center rounded-2xl border text-xs font-bold transition",
          isHot
            ? "border-volt/30 bg-volt/10 text-volt shadow-[0_0_26px_rgba(216,255,62,0.14)]"
            : "border-white/10 bg-white/[0.04] text-white/62",
        ].join(" ")}
      >
        {localized.slice(0, 2)}
      </div>
      <div className="min-w-0">
        <p className={isHot ? "truncate text-sm font-bold text-volt" : "truncate text-sm font-semibold text-white/85"}>
          {localized}
        </p>
        {market && (
          <p className="mt-0.5 text-[10px] font-semibold text-white/36">
            {market.yesPrice.toFixed(market.yesPrice < 10 ? 1 : 0)}¢
          </p>
        )}
      </div>
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
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.055]">
        {markets.map((market, index) => {
          const isHot = sameMarket(strongest, market);
          return (
            <div
              key={market.id}
              className={[
                "h-full transition-all",
                isHot
                  ? "bg-volt shadow-[0_0_18px_rgba(216,255,62,0.42)]"
                  : index === 1
                    ? "bg-white/35"
                    : "bg-flare/70",
              ].join(" ")}
              style={{ width: `${Math.max(2, market.yesPrice)}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.1em] text-white/34">
        {markets.map((market) => {
          const isHot = sameMarket(strongest, market);
          return (
            <div key={market.id} className={isHot ? "font-bold text-volt" : ""}>
              <span className="block truncate">{localizeMarketLabel(market.label)}</span>
              <span>{market.yesPrice.toFixed(market.yesPrice < 10 ? 1 : 0)}¢</span>
            </div>
          );
        })}
      </div>
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

function localizeMarketLabel(label: string) {
  if (label === "Draw") return "平局";
  return localizeTeamName(label);
}

function sameMarket(a?: MatchLineMarket | null, b?: MatchLineMarket | null) {
  return Boolean(a && b && a.id === b.id);
}

function normalize(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
