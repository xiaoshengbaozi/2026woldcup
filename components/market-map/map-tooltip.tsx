"use client";

import { useRef, useEffect, useState } from "react";
import type { CountryData } from "@/types/country";
import { formatDelta, formatVolume } from "@/lib/format";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";

// 3-letter → 2-letter country code mapping
const TOOLTIP_WIDTH = 200;
const TOOLTIP_HEIGHT = 140;
const OFFSET = 16;

interface MapTooltipProps {
  country: CountryData | null;
  x: number;
  y: number;
  containerWidth?: number;
  containerHeight?: number;
}

export function MapTooltip({ country, x, y, containerWidth = 600, containerHeight = 400 }: MapTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [actualSize, setActualSize] = useState({ w: TOOLTIP_WIDTH, h: TOOLTIP_HEIGHT });

  useEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setActualSize({ w: rect.width || TOOLTIP_WIDTH, h: rect.height || TOOLTIP_HEIGHT });
    }
  }, [country]);

  if (!country) return null;

  // Calculate position to keep tooltip within bounds
  let left = x + OFFSET;
  let top = y - OFFSET;

  // Right edge: flip to left side
  if (left + actualSize.w > containerWidth) {
    left = x - actualSize.w - OFFSET;
  }
  // Bottom edge: flip above
  if (top + actualSize.h > containerHeight) {
    top = y - actualSize.h - OFFSET;
  }
  // Left edge: ensure minimum
  if (left < 8) left = 8;
  // Top edge: ensure minimum
  if (top < 8) top = 8;

  return (
    <div
      ref={tooltipRef}
      className="absolute z-30 pointer-events-none rounded-2xl p-4"
      style={{
        left,
        top,
        minWidth: TOOLTIP_WIDTH,
        background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)), rgba(5,8,8,0.95)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(216,255,62,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(32px)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getFlagUrl(country.countryCode)}
          alt={country.countryCode}
          className="h-5 w-7 shrink-0 rounded object-cover ring-1 ring-white/10"
          loading="lazy"
        />
        <div>
          <div className="text-[13px] font-bold text-white">
            {localizeTeamName(country.countryName, country.countryCode)}
          </div>
          <div className="text-[10px] text-white/40 tracking-wider">
            {country.countryCode}
          </div>
        </div>
      </div>

      <div
        className="text-[24px] font-bold text-volt mb-2"
        style={{ textShadow: "0 0 20px rgba(216,255,62,0.3)" }}
      >
        {country.impliedProbability.toFixed(1)}%
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] uppercase tracking-wider">
        <div className="text-white/32">1h</div>
        <div className="text-white/62">{formatDelta(country.delta1h)}</div>
        <div className="text-white/32">24h</div>
        <div className="text-white/62">{formatDelta(country.delta24h)}</div>
        <div className="text-white/32">成交量</div>
        <div className="text-white/62">{formatVolume(country.volume24h)}</div>
      </div>
    </div>
  );
}
