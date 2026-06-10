"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, BarChart3, Clock, Globe2, TrendingUp, Zap } from "lucide-react";
import { formatDateTime, formatVolume } from "@/lib/format";
import { getTeamCodeFromName, localizeTeamName } from "@/lib/team-localization";
import { useMatchLines } from "@/lib/use-match-lines";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { MatchDetail } from "@/types/match";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";
import type { ReactNode } from "react";

type OddsSelection = {
  event: MatchLineEvent | null;
  markets: MatchLineMarket[];
  source: "api" | "unavailable";
  updatedAt: number | null;
};

export function MatchOdds({ detail }: { detail: MatchDetail }) {
  const { events, timestamp, loading, error } = useMatchLines();
  const selection = useMemo(
    () => buildOddsSelection(detail, events, timestamp),
    [detail, events, timestamp],
  );

  const homeCode = normalizeCode(detail.homeTeamCode);
  const awayCode = normalizeCode(detail.awayTeamCode);
  const homeName = localizeTeamName(selection.event?.homeTeam ?? homeCode, homeCode);
  const awayName = localizeTeamName(selection.event?.awayTeam ?? awayCode, awayCode);
  const homeMarket = selection.markets[0];
  const drawMarket = selection.markets[1];
  const awayMarket = selection.markets[2];
  const strongest = selection.markets.reduce<MatchLineMarket | null>(
    (best, market) => (!best || market.yesPrice > best.yesPrice ? market : best),
    null,
  );
  const total = selection.markets.reduce((sum, market) => sum + market.yesPrice, 0) || 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.45 }}
      className="hero-card match-odds-panel relative overflow-hidden p-4 sm:p-5"
    >
      <div className="match-odds-shell-glow pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(216,255,62,0.12),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(255,154,31,0.10),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/30 to-transparent" />

      <div className="match-odds-section-header relative mb-4 flex items-center justify-between border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-volt" />
          <h3 className="match-odds-title text-xs font-semibold uppercase tracking-[0.12em] text-white">
            比赛赔率
          </h3>
        </div>
        <div className="match-odds-status flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
          <span className={selection.source === "api" ? "text-volt" : "text-white/35"}>
            {selection.source === "api" ? "Polymarket 实时" : "暂无盘口"}
          </span>
          {loading && <span>同步中</span>}
        </div>
      </div>

      {error && selection.source === "unavailable" && (
        <div className="match-odds-error relative mb-4 rounded-2xl border border-flare/15 bg-flare/[0.04] px-4 py-3 text-xs text-flare/80">
          实时赔率暂不可用：{error}
        </div>
      )}

      {selection.source === "unavailable" && (
        <div className="match-odds-empty relative rounded-2xl bg-white/[0.035] px-4 py-8 text-center ring-1 ring-white/[0.07]">
          <p className="match-odds-empty-title text-sm font-semibold text-white/70">暂无真实盘口数据</p>
          <p className="match-odds-empty-copy mt-2 text-xs leading-5 text-white/38">
            还没有匹配到这场比赛的 Polymarket 市场，因此暂不展示模拟概率。
          </p>
        </div>
      )}

      {selection.source === "api" && homeMarket && drawMarket && awayMarket && (
        <div className="match-odds-card relative mx-auto max-w-[520px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111113]/90 shadow-[0_32px_64px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="match-odds-card-top-glow pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-volt/[0.07] to-transparent" />

          <div className="relative px-5 py-5 sm:px-6 sm:py-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="match-odds-meta flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/28">
                <Clock className="h-3 w-3" />
                <span>{selection.event ? formatDateTime(selection.event.startTime) : "待开赛"}</span>
              </div>
              <span className="match-odds-ticker text-[10px] uppercase tracking-[0.12em] text-white/25">
                {selection.event?.ticker ?? detail.match.stage}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <TeamNode code={homeCode} label={homeName} market={homeMarket} strongest={strongest} tone="home" />

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5 text-white/30">
                  <div className="match-odds-vs-line h-px w-9 bg-white/10" />
                  <div className="match-odds-vs-icon grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/[0.035] shadow-[0_0_22px_rgba(216,255,62,0.10)]">
                    <Zap className="h-3.5 w-3.5 text-volt/70" />
                  </div>
                  <div className="match-odds-vs-line h-px w-9 bg-white/10" />
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="font-black tabular-nums text-volt">
                    {homeMarket.yesPrice.toFixed(0)}%
                  </span>
                  <span className="match-odds-score-separator text-white/20">:</span>
                  <span className="font-black tabular-nums text-flare">
                    {awayMarket.yesPrice.toFixed(0)}%
                  </span>
                </div>
              </div>

              <TeamNode code={awayCode} label={awayName} market={awayMarket} strongest={strongest} tone="away" />
            </div>

            <div className="relative mt-5 h-px">
              <div className="match-odds-divider absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MarketTile label="主胜" market={homeMarket} color="volt" isHot={sameMarket(homeMarket, strongest)} />
              <MarketTile label="平局" market={drawMarket} color="white" isHot={sameMarket(drawMarket, strongest)} />
              <MarketTile label="客胜" market={awayMarket} color="flare" isHot={sameMarket(awayMarket, strongest)} />
            </div>

            <div className="match-odds-probability-track mt-5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="flex h-2">
                {selection.markets.map((market, index) => (
                  <motion.div
                    key={market.id}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(2, (market.yesPrice / total) * 100)}%` }}
                    transition={{ delay: 0.18 + index * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className={index === 0 ? "bg-volt" : index === 1 ? "bg-white/45" : "bg-flare"}
                  />
                ))}
              </div>
            </div>

            <div className="match-odds-footer mt-4 grid grid-cols-1 gap-2 border-t border-white/[0.04] pt-3 text-[10px] text-white/25 sm:grid-cols-3">
              <FooterStat icon={<BarChart3 className="h-3 w-3" />} label="市场" value={`${selection.markets.length}`} />
              <FooterStat
                icon={<Globe2 className="h-3 w-3" />}
                label="流动性"
                value={formatVolume(selection.event?.liquidity ?? sumBy(selection.markets, "liquidity"))}
              />
              <FooterStat
                icon={<TrendingUp className="h-3 w-3" />}
                label="更新"
                value={selection.updatedAt ? formatDateTime(selection.updatedAt) : "本地模型"}
              />
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function TeamNode({
  code,
  label,
  market,
  strongest,
  tone,
}: {
  code: string;
  label: string;
  market: MatchLineMarket;
  strongest: MatchLineMarket | null;
  tone: "home" | "away";
}) {
  const hot = sameMarket(market, strongest);

  return (
    <div className="match-odds-team flex min-w-0 flex-col items-center gap-1.5">
      <span className="match-odds-team-code text-[11px] font-bold uppercase tracking-[0.08em] text-white/35">
        {code || "TBD"}
      </span>
      {code ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getFlagUrl(code, 80)}
          alt={label}
          className={`match-odds-team-flag h-10 w-14 rounded-xl object-cover ring-1 shadow-[0_4px_14px_rgba(0,0,0,0.42)] transition ${
            hot ? "ring-volt/45 shadow-[0_0_18px_rgba(216,255,62,0.18)]" : "ring-white/10"
          }`}
          loading="lazy"
        />
      ) : (
        <div className="match-odds-team-placeholder grid h-10 w-14 place-items-center rounded-xl bg-white/[0.06] text-[10px] font-bold text-white/40">
          TBD
        </div>
      )}
      <span className={`match-odds-team-label max-w-[112px] truncate text-center text-xs font-semibold ${hot ? "text-volt" : tone === "away" ? "text-white/80" : "text-white/85"}`}>
        {label}
      </span>
    </div>
  );
}

function MarketTile({
  label,
  market,
  color,
  isHot,
}: {
  label: string;
  market: MatchLineMarket;
  color: "volt" | "white" | "flare";
  isHot: boolean;
}) {
  const colorClass = color === "volt" ? "text-volt" : color === "flare" ? "text-flare" : "text-white/70";

  return (
    <div
      className={`match-odds-market-tile flex min-h-[94px] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 transition ${
        isHot
          ? "match-odds-market-tile-hot border-volt/20 bg-volt/[0.055] shadow-[0_0_22px_rgba(216,255,62,0.08)]"
          : "border-white/[0.055] bg-white/[0.025]"
      }`}
    >
      <span className="match-odds-market-label text-[9px] uppercase tracking-[0.12em] text-white/30">{label}</span>
      <span className={`text-xl font-black tabular-nums ${colorClass}`}>{market.yesPrice.toFixed(0)}%</span>
      <span className="match-odds-market-depth text-[9px] tabular-nums text-white/22">
        买价 {formatOptionalPrice(market.bestBid)}
      </span>
      <span className="match-odds-market-depth text-[9px] tabular-nums text-white/18">
        卖价 {formatOptionalPrice(market.bestAsk)}
      </span>
    </div>
  );
}

function FooterStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="match-odds-footer-stat flex min-w-0 items-center gap-1.5">
      {icon}
      <span className="shrink-0 uppercase tracking-[0.08em]">{label}</span>
      <span className="match-odds-footer-value min-w-0 truncate text-white/42">{value}</span>
    </div>
  );
}

function buildOddsSelection(
  detail: MatchDetail,
  events: MatchLineEvent[],
  timestamp: number | null,
): OddsSelection {
  const event = findMatchingEvent(detail, events);
  if (event) {
    const markets = pickMoneyline(detail, event);
    if (markets.length >= 3) {
      return { event, markets: markets.slice(0, 3), source: "api", updatedAt: timestamp };
    }
  }

  return {
    event: null,
    markets: [],
    source: "unavailable",
    updatedAt: null,
  };
}

function findMatchingEvent(detail: MatchDetail, events: MatchLineEvent[]) {
  const homeCode = normalizeCode(detail.homeTeamCode);
  const awayCode = normalizeCode(detail.awayTeamCode);

  return events.find((event) => {
    const eventHomeCode = normalizeCode(getTeamCodeFromName(event.homeTeam));
    const eventAwayCode = normalizeCode(getTeamCodeFromName(event.awayTeam));
    return (
      (eventHomeCode === homeCode && eventAwayCode === awayCode) ||
      (eventHomeCode === awayCode && eventAwayCode === homeCode)
    );
  });
}

function pickMoneyline(detail: MatchDetail, event: MatchLineEvent) {
  const markets = event.markets.filter((market) => market.marketType === "moneyline");
  const home = findMarketByCode(markets, detail.homeTeamCode);
  const draw = markets.find((market) => normalizeText(market.label) === "draw");
  const away = findMarketByCode(markets, detail.awayTeamCode);
  const ordered = [home, draw, away].filter((market): market is MatchLineMarket => Boolean(market));

  return ordered.length >= 3 ? ordered : markets.slice(0, 3);
}

function findMarketByCode(markets: MatchLineMarket[], code: string) {
  const normalizedCode = normalizeCode(code);
  return markets.find((market) => normalizeCode(getTeamCodeFromName(market.label)) === normalizedCode);
}

function sameMarket(a?: MatchLineMarket | null, b?: MatchLineMarket | null) {
  return Boolean(a && b && a.id === b.id);
}

function normalizeCode(code?: string) {
  return (code ?? "").trim().toUpperCase();
}

function normalizeText(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

function sumBy(markets: MatchLineMarket[], key: "liquidity" | "volume24h") {
  return markets.reduce((sum, market) => sum + market[key], 0);
}

function formatOptionalPrice(value: number | null) {
  return value == null ? "--" : `${value.toFixed(0)}%`;
}
