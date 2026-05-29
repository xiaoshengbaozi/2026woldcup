"use client";

import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatDelta, formatVolume, formatNumber } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import { getFlagUrl } from "@/lib/world-cup-2026";

// 3-letter → 2-letter country code mapping
export function DetailOverlay() {
  const selectedCountry = useStore((s) => s.selectedCountry);
  const focusedModule = useStore((s) => s.focusedModule);
  const deselectCountry = useStore((s) => s.deselectCountry);
  const countries = useStore((s) => s.getCountry);
  const history = useStore((s) => s.getHistory);
  const rankings = useStore((s) => s.rankings);

  const isOpen = selectedCountry !== null && focusedModule === "ranking";
  const country = selectedCountry ? countries(selectedCountry) : undefined;
  const countryHistory = useMemo(
    () => (selectedCountry ? history(selectedCountry) : []),
    [history, selectedCountry]
  );
  const rankEntry = useMemo(
    () => rankings.find((r) => r.countryCode === selectedCountry),
    [rankings, selectedCountry]
  );

  const handleClose = useCallback(() => {
    deselectCountry();
  }, [deselectCountry]);

  const stats = useMemo(() => {
    if (countryHistory.length === 0) return { high: 0, low: 0, avg: 0, change: 0 };
    const probs = countryHistory.map((h) => h.probability);
    const high = Math.max(...probs);
    const low = Math.min(...probs);
    const avg = probs.reduce((a, b) => a + b, 0) / probs.length;
    const change = probs[probs.length - 1] - probs[0];
    return { high, low, avg, change };
  }, [countryHistory]);

  return (
    <AnimatePresence>
      {isOpen && country && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 z-50 flex flex-col"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), rgba(5,8,8,0.98)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] shrink-0">
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(country.countryCode, 160)}
              alt={country.countryCode}
              className="h-8 w-11 shrink-0 rounded object-cover ring-1 ring-white/10"
            />
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-white truncate">{country.countryName}</h2>
              <span className="text-[11px] text-white/45 tracking-wider">
                {country.countryCode} · #{rankEntry?.rank ?? "—"}
              </span>
            </div>
          </div>

          {/* Hero probability */}
          <div className="px-4 py-4 text-center shrink-0">
            <div
              className="text-[44px] font-bold text-volt leading-none"
              style={{ textShadow: "0 0 28px rgba(216,255,62,0.35)" }}
            >
              {country.impliedProbability.toFixed(1)}%
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              <span className="text-[12px] text-white/55 uppercase tracking-wider">
                1h {formatDelta(country.delta1h)}
              </span>
              <span className="text-[12px] text-white/55 uppercase tracking-wider">
                24h {formatDelta(country.delta24h)}
              </span>
            </div>
          </div>

          {/* Sparkline */}
          {countryHistory.length > 0 && (
            <div className="px-4 mb-3 shrink-0">
              <div className="text-[10px] uppercase tracking-[0.12em] text-white/35 mb-1.5">
                历史概率 (24h)
              </div>
              <div
                className="rounded-xl overflow-hidden p-2"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <svg viewBox="0 0 300 50" className="w-full h-[50px]" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#d8ff3e"
                    strokeWidth="1.5"
                    points={countryHistory
                      .slice(-100)
                      .map((p, i, arr) => {
                        const x = (i / (arr.length - 1)) * 300;
                        const minP = Math.min(...arr.map((h) => h.probability));
                        const maxP = Math.max(...arr.map((h) => h.probability));
                        const range = maxP - minP || 1;
                        const y = 45 - ((p.probability - minP) / range) * 40;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Stats — horizontal pairs */}
          <div className="px-4 pb-4 shrink-0">
            <div className="space-y-px rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <StatRow
                left={{ label: "最高", value: `${stats.high.toFixed(1)}%` }}
                right={{ label: "最低", value: `${stats.low.toFixed(1)}%` }}
              />
              <StatRow
                left={{ label: "均值", value: `${stats.avg.toFixed(1)}%` }}
                right={{ label: "变化", value: formatDelta(stats.change), colored: true, positive: stats.change > 0 }}
              />
              <StatRow
                left={{ label: "24H 成交量", value: formatVolume(country.volume24h) }}
                right={{ label: "价差", value: `${country.spread.toFixed(2)}¢` }}
              />
              <StatRow
                left={{ label: "流动性", value: formatVolume(country.liquidity) }}
                right={{ label: "合约数", value: formatNumber(country.marketCount) }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCell({
  label, value, colored, positive,
}: {
  label: string; value: string; colored?: boolean; positive?: boolean;
}) {
  return (
    <div className="flex flex-col justify-center min-w-0">
      <div className="text-[10px] uppercase tracking-[0.1em] text-white/38">{label}</div>
      <div
        className="text-[15px] font-bold leading-tight truncate"
        style={{
          color: colored
            ? positive ? "#d8ff3e" : "#FF1744"
            : "rgba(255,255,255,0.85)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatRow({
  left,
  right,
}: {
  left: { label: string; value: string; colored?: boolean; positive?: boolean };
  right: { label: string; value: string; colored?: boolean; positive?: boolean };
}) {
  return (
    <div className="grid grid-cols-2 gap-px" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="px-3 py-3" style={{ background: "rgba(5,8,8,0.8)" }}>
        <StatCell {...left} />
      </div>
      <div className="px-3 py-3" style={{ background: "rgba(5,8,8,0.8)" }}>
        <StatCell {...right} />
      </div>
    </div>
  );
}
