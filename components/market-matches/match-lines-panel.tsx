"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, X, Zap, Globe2, ChevronDown } from "lucide-react";
import { getTeamCodeFromName, localizeTeamName } from "@/lib/team-localization";
import { useMatchLines } from "@/lib/use-match-lines";
import { formatVolume } from "@/lib/format";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";

export function MatchLinesPanel() {
  const { events, timestamp, loading, error } = useMatchLines();
  const [selected, setSelected] = useState<MatchLineEvent | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (selected) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, close]);

  return (
    <>
    <section ref={panelRef} className="hero-card relative overflow-hidden p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(216,255,62,0.10),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(255,154,31,0.08),transparent_32%)]" />

      <div className="relative flex items-center justify-between border-b border-white/[0.04] pb-3 mb-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-volt" />
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">
            比赛盘口
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-black uppercase tracking-[0.12em] text-volt"
            style={{ fontFamily: "ScreenMatrix" }}
          >
            {events.length} 场
          </span>
          {!loading && !error && events.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-white/30 transition hover:text-volt/60"
            >
              <span>{expanded ? "收起" : "展开"}</span>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
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
          <>
            <div
              className="grid grid-cols-1 gap-2.5 overflow-hidden transition-all duration-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              style={{ maxHeight: expanded ? "4000px" : "160px" }}
            >
              {visibleEvents(events, expanded).map((event, index) => (
                <MatchLineCard
                  key={event.id}
                  event={event}
                  index={index}
                  isSelected={selected?.id === event.id}
                  isHovered={hoveredId === event.id}
                  onSelect={setSelected}
                  onHover={setHoveredId}
                />
              ))}
            </div>
            {events.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] text-white/30 transition hover:text-volt/60"
              >
                <span>{expanded ? "收起" : "展开更多"}</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </>
        )}
      </div>

    </section>

    {/* Detail Modal — portal escapes overflow-hidden containers */}
    {createPortal(
      <AnimatePresence>
        {selected && (
          <MatchDetailModal event={selected} onClose={close} />
        )}
      </AnimatePresence>,
      document.body,
    )}
    </>
  );
}

/* ──────────── Simplified Card ──────────── */

const MatchLineCard = memo(function MatchLineCard({
  event,
  index,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: {
  event: MatchLineEvent;
  index: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (e: MatchLineEvent) => void;
  onHover: (id: string | null) => void;
}) {
  const moneyline = pickMoneyline(event);
  const homeMarket = findTeamMarket(moneyline, event.homeTeam);
  const awayMarket = findTeamMarket(moneyline, event.awayTeam);
  const strongest = moneyline.reduce<MatchLineMarket | null>(
    (best, m) => (!best || m.yesPrice > best.yesPrice ? m : best),
    null,
  );
  const homeCode = getTeamCodeFromName(event.homeTeam);
  const awayCode = getTeamCodeFromName(event.awayTeam);
  const homeLocalized = localizeTeamName(event.homeTeam, homeCode);
  const awayLocalized = localizeTeamName(event.awayTeam, awayCode);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.4 }}
      onClick={() => onSelect(event)}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        group relative cursor-pointer overflow-hidden rounded-2xl border p-3.5 transition-all duration-200
        ${isSelected
          ? "border-volt/20 bg-volt/[0.04]"
          : isHovered
            ? "border-white/[0.10] bg-white/[0.035]"
            : "border-white/[0.05] bg-white/[0.025]"
        }
      `}
    >
      {/* Top row — teams with centered date/time */}
      <div className="relative flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex min-w-0 items-center gap-2">
          {homeCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getFlagUrl(homeCode, 40)}
              alt={homeLocalized}
              className={`h-5 w-7 shrink-0 rounded-[3px] object-cover ring-1 transition ${
                sameMarket(strongest, homeMarket)
                  ? "ring-volt/30"
                  : "ring-white/10"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="grid h-5 w-7 shrink-0 place-items-center rounded-[3px] bg-white/[0.06] text-[8px] font-bold text-white/40">
              {homeLocalized.slice(0, 2)}
            </div>
          )}
          <span
            className={`truncate text-[12px] font-semibold leading-tight ${
              sameMarket(strongest, homeMarket) ? "text-white" : "text-white/60"
            }`}
          >
            {homeLocalized}
          </span>
        </div>

        {/* Centered date + time */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none">
          <span className="text-[8px] uppercase tracking-[0.1em] text-white/25">
            {formatDate(event.startTime)}
          </span>
          <span className="mt-0.5 text-[11px] font-bold tabular-nums text-white/45" style={{ fontFamily: "ScreenMatrix" }}>
            {formatTimeOnly(event.startTime)}
          </span>
        </div>

        {/* Away */}
        <div className="flex min-w-0 items-center gap-2 flex-row-reverse">
          {awayCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getFlagUrl(awayCode, 40)}
              alt={awayLocalized}
              className={`h-5 w-7 shrink-0 rounded-[3px] object-cover ring-1 transition ${
                sameMarket(strongest, awayMarket)
                  ? "ring-volt/30"
                  : "ring-white/10"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="grid h-5 w-7 shrink-0 place-items-center rounded-[3px] bg-white/[0.06] text-[8px] font-bold text-white/40">
              {awayLocalized.slice(0, 2)}
            </div>
          )}
          <span
            className={`truncate text-[12px] font-semibold leading-tight ${
              sameMarket(strongest, awayMarket) ? "text-white" : "text-white/60"
            }`}
          >
            {awayLocalized}
          </span>
        </div>
      </div>

      {/* Bottom row — odds bar */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <div className="flex h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          {moneyline.map((m, i) => {
            const hot = sameMarket(strongest, m);
            return (
              <div
                key={m.id}
                className={`h-full transition-all ${hot ? "bg-volt/70" : i === 1 ? "bg-white/15" : "bg-flare/30"}`}
                style={{ width: `${Math.max(3, m.yesPrice)}%` }}
              />
            );
          })}
        </div>
      </div>
    </motion.article>
  );
});

/* ──────────── Detail Modal (Flight-card inspired) ──────────── */

function MatchDetailModal({
  event,
  onClose,
}: {
  event: MatchLineEvent;
  onClose: () => void;
}) {
  const moneyline = pickMoneyline(event);
  const homeMarket = findTeamMarket(moneyline, event.homeTeam);
  const awayMarket = findTeamMarket(moneyline, event.awayTeam);
  const homeCode = getTeamCodeFromName(event.homeTeam);
  const awayCode = getTeamCodeFromName(event.awayTeam);
  const homeLocalized = localizeTeamName(event.homeTeam, homeCode);
  const awayLocalized = localizeTeamName(event.awayTeam, awayCode);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[380px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111113] shadow-[0_32px_64px_rgba(0,0,0,0.6)]"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/[0.06] text-white/40 transition hover:bg-white/[0.12] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Ambient top glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-volt/[0.06] to-transparent" />

        {/* Main content area — flight card layout */}
        <div className="relative px-6 pt-7 pb-5">
          {/* Time row */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/25" style={{ fontFamily: "ScreenMatrix" }}>
              开赛时间
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/25" style={{ fontFamily: "ScreenMatrix" }}>
              {event.ticker}
            </span>
          </div>

          {/* Teams vs layout — flight path inspired */}
          <div className="flex items-center justify-between gap-3">
            {/* Home team */}
            <div className="flex flex-col items-center min-w-0 gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35" style={{ fontFamily: "ScreenMatrix" }}>
                {homeCode || "???"}
              </span>
              {homeCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getFlagUrl(homeCode, 80)}
                  alt={homeLocalized}
                  className="h-9 w-12 rounded-lg object-cover ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                />
              ) : (
                <div className="grid h-9 w-12 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-white/40">
                  {homeLocalized.slice(0, 2)}
                </div>
              )}
              <span className="truncate text-[12px] font-semibold text-white text-center max-w-[80px]">
                {homeLocalized}
              </span>
            </div>

            {/* Center — odds percentage / connector */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1.5 text-white/30">
                <div className="h-[1px] w-8 bg-white/10" />
                <div className="grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Zap className="h-3 w-3 text-volt/60" />
                </div>
                <div className="h-[1px] w-8 bg-white/10" />
              </div>

              {/* Win probability */}
              {homeMarket && awayMarket && (
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="font-bold text-volt tabular-nums" style={{ fontFamily: "ScreenMatrix" }}>
                    {homeMarket.yesPrice.toFixed(0)}%
                  </span>
                  <span className="text-white/20">:</span>
                  <span className="font-bold text-flare tabular-nums" style={{ fontFamily: "ScreenMatrix" }}>
                    {awayMarket.yesPrice.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center min-w-0 gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/35" style={{ fontFamily: "ScreenMatrix" }}>
                {awayCode || "???"}
              </span>
              {awayCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getFlagUrl(awayCode, 80)}
                  alt={awayLocalized}
                  className="h-9 w-12 rounded-lg object-cover ring-1 ring-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                />
              ) : (
                <div className="grid h-9 w-12 place-items-center rounded-lg bg-white/[0.06] text-[10px] font-bold text-white/40">
                  {awayLocalized.slice(0, 2)}
                </div>
              )}
              <span className="truncate text-[12px] font-semibold text-white text-center max-w-[80px]">
                {awayLocalized}
              </span>
            </div>
          </div>

          {/* Dotted flight path */}
          <div className="relative mt-4 h-[1px]">
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          {/* Odds grid — adapts to 2 or 3 markets */}
          <div
            className="mt-5 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${moneyline.length}, 1fr)` }}
          >
            {moneyline.map((market, idx) => {
              const isHome = idx === 0;
              const isDraw = moneyline.length === 3 && idx === 2;
              const isAway = !isHome && !isDraw;
              return (
                <div
                  key={market.id}
                  className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.025] px-2 py-2.5 transition hover:border-volt/15"
                >
                  <span className="text-[9px] uppercase tracking-[0.1em] text-white/30">
                    {isHome ? "主胜" : isDraw ? "平局" : "客胜"}
                  </span>
                  <span
                    className={`text-lg font-black tabular-nums ${
                      isHome ? "text-volt" : isDraw ? "text-white/50" : "text-flare"
                    }`}
                    style={{ fontFamily: "ScreenMatrix" }}
                  >
                    {(market.yesPrice).toFixed(0)}%
                  </span>
                  {market.bestBid != null && (
                    <span className="text-[9px] tabular-nums text-white/20">
                      Bid {market.bestBid.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Market stats footer */}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <Globe2 className="h-3 w-3" />
              <span>流动性 {formatVolume(event.liquidity)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <TrendingUp className="h-3 w-3" />
              <span>24h 交易量 {formatVolume(event.volume24h)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ──────────── Helpers ──────────── */

function visibleEvents(events: MatchLineEvent[], expanded: boolean) {
  return expanded ? events : events.slice(0, 8);
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

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function formatTimeOnly(ts: number) {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
