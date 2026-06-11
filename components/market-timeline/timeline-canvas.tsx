"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "@/lib/store";
import type { HistoryPoint } from "@/types/country";

interface LineGeometry {
  code: string;
  screenPoints: Array<{ x: number; y: number }>;
}

const LINE_COLORS = [
  "#d8ff3e", "#FF6B35", "#00E676", "#FFD700", "#FF1744",
  "#7B9E4A", "#C0C0C0", "#CD7F32", "#4A7FB5", "#2563C7",
];

interface CanvasSize {
  width: number;
  height: number;
}

export function TimelineCanvas({ size }: { size: CanvasSize }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const history = useStore((s) => s.history);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const selectCountry = useStore((s) => s.selectCountry);
  const activeTimePreset = useStore((s) => s.activeTimePreset);
  const lineGeosRef = useRef<LineGeometry[]>([]);

  const draw = useCallback(() => {
    void themeVersion;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = size;
    const isLightTheme =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme") === "light";
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear with site background
    ctx.fillStyle = isLightTheme ? "rgba(255,253,247,0.52)" : "rgba(5,8,8,0.6)";
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Determine countries to draw
    let entries: Array<{ code: string; data: HistoryPoint[] }> = [];

    if (selectedCountry) {
      const d = history.get(selectedCountry);
      if (d) entries = [{ code: selectedCountry, data: d }];
    } else {
      for (const [code, data] of history) {
        if (data.length > 0) entries.push({ code, data });
      }
      entries.sort(
        (a, b) =>
          (b.data[b.data.length - 1]?.probability ?? 0) -
          (a.data[a.data.length - 1]?.probability ?? 0)
      );
      entries = entries.slice(0, 10);
    }

    if (entries.length === 0) {
      ctx.fillStyle = isLightTheme ? "rgba(35,45,31,0.48)" : "rgba(255,255,255,0.3)";
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("等待数据...", width / 2, height / 2);
      return;
    }

    // Time range
    const now = Date.now();
    const presetRanges: Record<string, number> = {
      "1H": 3600_000, "24H": 86400_000, "7D": 7 * 86400_000, "30D": 30 * 86400_000,
    };
    const range = presetRanges[activeTimePreset] ?? 86400_000;
    const tMin = now - range;
    const tMax = now;

    // Probability range
    let pMin = Infinity, pMax = -Infinity;
    for (const entry of entries) {
      for (const pt of entry.data) {
        if (pt.timestamp >= tMin) {
          pMin = Math.min(pMin, pt.probability);
          pMax = Math.max(pMax, pt.probability);
        }
      }
    }
    if (pMin === Infinity) { pMin = 0; pMax = 100; }
    const pRange = pMax - pMin || 1;
    pMin -= pRange * 0.05;
    pMax += pRange * 0.05;
    const pTotal = pMax - pMin;

    const toX = (t: number) => padding.left + ((t - tMin) / (tMax - tMin)) * chartW;
    const toY = (p: number) => padding.top + (1 - (p - pMin) / pTotal) * chartH;

    // Grid
    drawGrid(ctx, padding, chartW, chartH, tMin, tMax, pMin, pMax, isLightTheme);

    // Lines with glow
    const lineGeos: LineGeometry[] = [];
    entries.forEach((entry, i) => {
      const color = LINE_COLORS[i % LINE_COLORS.length];
      const points = entry.data
        .filter((pt) => pt.timestamp >= tMin)
        .map((pt) => ({ x: toX(pt.timestamp), y: toY(pt.probability) }));

      if (points.length < 2) return;

      lineGeos.push({ code: entry.code, screenPoints: points });

      // Glow
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.filter = "blur(4px)";
      drawSmoothLine(ctx, points);
      ctx.restore();

      // Core
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      drawSmoothLine(ctx, points);
    });

    lineGeosRef.current = lineGeos;
  }, [size, history, selectedCountry, activeTimePreset, themeVersion]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => setThemeVersion((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const geos = lineGeosRef.current;
      let bestCode: string | null = null;
      let bestDist = Infinity;

      for (const geo of geos) {
        for (const pt of geo.screenPoints) {
          const dx = mx - pt.x;
          const dy = my - pt.y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            bestCode = geo.code;
          }
        }
      }

      if (bestCode && bestDist < 400) {
        selectCountry(bestCode, "timeline");
      }
    },
    [selectCountry]
  );

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size.width, height: size.height }}
      className="block cursor-crosshair"
      onClick={handleClick}
    />
  );
}

function drawSmoothLine(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  padding: { top: number; right: number; bottom: number; left: number },
  chartW: number, chartH: number,
  tMin: number, tMax: number, pMin: number, pMax: number,
  isLightTheme: boolean
) {
  ctx.strokeStyle = isLightTheme ? "rgba(60,75,52,0.12)" : "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;

  const pStep = (pMax - pMin) / 5;
  for (let i = 0; i <= 5; i++) {
    const p = pMin + i * pStep;
    const y = padding.top + (1 - i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();

    ctx.fillStyle = isLightTheme ? "rgba(38,50,34,0.62)" : "rgba(255,255,255,0.28)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${p.toFixed(1)}%`, padding.left - 6, y + 3);
  }

  const tStep = (tMax - tMin) / 6;
  for (let i = 0; i <= 6; i++) {
    const t = tMin + i * tStep;
    const x = padding.left + (i / 6) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartH);
    ctx.stroke();

    ctx.fillStyle = isLightTheme ? "rgba(38,50,34,0.62)" : "rgba(255,255,255,0.28)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    const d = new Date(t);
    ctx.fillText(
      `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`,
      x, padding.top + chartH + 16
    );
  }
}
