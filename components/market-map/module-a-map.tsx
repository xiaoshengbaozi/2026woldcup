"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Globe2 } from "lucide-react";

const FLAG_CODE_MAP: Record<string, string> = {
  MEX: "mx", USA: "us", CAN: "ca", BRA: "br", ARG: "ar", COL: "co",
  URU: "uy", ECU: "ec", PAR: "py", PER: "pe", CHI: "cl", FRA: "fr",
  ENG: "gb-eng", ESP: "es", GER: "de", ITA: "it", POR: "pt", NED: "nl",
  BEL: "be", CRO: "hr", DEN: "dk", SUI: "ch", AUT: "at", SRB: "rs",
  POL: "pl", UKR: "ua", CZE: "cz", TUR: "tr", JPN: "jp", KOR: "kr",
  AUS: "au", IRN: "ir", SAU: "sa", QAT: "qa", MAR: "ma", SEN: "sn",
  NGA: "ng", GHA: "gh", CMR: "cm", TUN: "tn", DZA: "dz", EGY: "eg",
  CIV: "ci", NZL: "nz", JAM: "jm", HON: "hn", CRC: "cr", PAN: "pa",
};

const INITIAL_VIEW = { lon: -25, lat: 18 };
const GLOBE_RADIUS = 278;

type ViewState = typeof INITIAL_VIEW;

function getFlagUrl(code: string): string {
  const flagCode = FLAG_CODE_MAP[code] ?? code.toLowerCase().slice(0, 2);
  return `https://flagcdn.com/w80/${flagCode}.png`;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function projectPoint(lon: number, lat: number, view: ViewState) {
  const lambda = toRad(lon - view.lon);
  const phi = toRad(lat);
  const phi0 = toRad(view.lat);
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);

  return {
    x: GLOBE_RADIUS * Math.cos(phi) * Math.sin(lambda),
    y: -GLOBE_RADIUS * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda)),
    visible: cosc > 0.05,
    depth: Math.max(0, Math.min(1, cosc)),
  };
}

function coastNoise(lon: number, lat: number): number {
  return (
    Math.sin(toRad(lon * 2.3 + lat * 1.7)) * 0.45 +
    Math.cos(toRad(lon * 1.4 - lat * 2.8)) * 0.40 +
    Math.sin(toRad(lon * 3.7 + lat * 1.1)) * 0.25 +
    Math.cos(toRad(lon * 5.2 - lat * 3.4)) * 0.15 +
    Math.sin(toRad(lon * 7.1 + lat * 4.3)) * 0.12
  );
}

function isLandLike(lon: number, lat: number) {
  const regions: [number, number, number, number, number][] = [
    // North America
    [-100, 52, 30, 18, 0], [-82, 42, 18, 12, 0], [-106, 30, 14, 8, -10],
    [-120, 60, 20, 10, 0], [-140, 64, 24, 8, -8],
    // Central America & Caribbean
    [-88, 14, 7, 3.5, -15], [-78, 18, 5, 2.5, 0], [-66, 19, 4, 2, 0],
    // South America
    [-62, -5, 16, 18, 8], [-55, -22, 13, 14, 12], [-70, -38, 5, 14, 2], [-48, -16, 16, 10, 5],
    // Europe
    [2, 46, 10, 8, 5], [-6, 53, 5, 4, -10], [-5, 57, 6, 4, 15],
    [12, 50, 8, 5, 0], [12, 44, 4, 6, 10], [-8, 40, 3, 4, -15],
    [20, 44, 6, 4, 30], [42, 44, 4, 3, 0],
    // Scandinavia & Iceland
    [12, 62, 5, 7, 10], [15, 68, 8, 4, 0], [-19, 65, 4, 2, 0],
    // Africa
    [5, 22, 20, 12, 0], [20, -2, 13, 18, 0], [30, -16, 9, 12, 0],
    [-12, 10, 6, 8, -5], [46, -20, 3.5, 5, 10],
    // Middle East
    [35, 38, 6, 4, 0], [45, 22, 10, 6, 15], [55, 33, 8, 5, 20],
    // India
    [78, 22, 10, 12, 5],
    // Central Asia & Russia
    [65, 44, 14, 5, 0], [90, 55, 22, 8, 0], [120, 60, 25, 8, 0],
    [160, 62, 22, 7, 0], [175, 65, 12, 5, 0],
    // China & East Asia
    [104, 36, 16, 8, 0], [120, 28, 10, 10, 0], [110, 16, 6, 4, 0],
    // Southeast Asia
    [108, 14, 6, 6, 0],
    // Korea
    [127, 37, 3, 4, 0],
    // Japan
    [138, 36, 3, 5, 20], [140, 42, 2, 3, 15],
    // Philippines
    [122, 12, 3, 6, 0],
    // Indonesia & Malaysia
    [106, -2, 16, 3, 0], [117, 0, 6, 2, 10], [120, -3, 4, 2, -15],
    // Sri Lanka
    [80, 8, 1.5, 2, 0],
    // Australia
    [134, -26, 18, 12, 0],
    // New Zealand
    [172, -42, 2, 5, 15], [175, -40, 2, 3, -10],
    // Papua New Guinea
    [147, -6, 5, 3, 0],
    // Greenland
    [-42, 72, 12, 6, 0],
    // Taiwan
    [121, 23.5, 1.5, 2.5, 0],
    // Cuba
    [-79, 22, 6, 1.5, 0],
  ];

  for (const [cx, cy, a, b, angleDeg] of regions) {
    const rad = toRad(angleDeg);
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const dx = lon - cx, dy = lat - cy;
    const rx = dx * cosA + dy * sinA;
    const ry = -dx * sinA + dy * cosA;
    const dist = (rx * rx) / (a * a) + (ry * ry) / (b * b);
    if (dist <= 1.0) return true;
  }

  for (const [cx, cy, a, b, angleDeg] of regions) {
    const rad = toRad(angleDeg);
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    const dx = lon - cx, dy = lat - cy;
    const rx = dx * cosA + dy * sinA;
    const ry = -dx * sinA + dy * cosA;
    const dist = (rx * rx) / (a * a) + (ry * ry) / (b * b);
    if (dist < 1.4) {
      const noise = coastNoise(lon, lat);
      if (dist - noise * 0.35 <= 1.0) return true;
    }
  }

  return false;
}

const LAND_DOTS = Array.from({ length: 22500 }, (_, index) => {
  const cols = 200;
  const lon = -180 + (index % cols) * 1.8;
  const lat = -72 + Math.floor(index / cols) * 1.8;
  if (!isLandLike(lon, lat)) return null;

  const jitterLon = Math.sin(index * 12.9898 + 0.7) * 0.22;
  const jitterLat = Math.cos(index * 78.233 + 1.3) * 0.18;

  return { lon: lon + jitterLon, lat: lat + jitterLat };
}).filter(Boolean) as Array<{ lon: number; lat: number }>;

const GLOBAL_DOTS = Array.from({ length: 7200 }, (_, index) => {
  const cols = 110;
  const lon = -180 + (index % cols) * 3.2;
  const lat = -78 + Math.floor(index / cols) * 2.8;

  return {
    lon: lon + Math.sin(index * 8.21 + 0.5) * 0.18,
    lat: lat + Math.cos(index * 13.77 + 0.9) * 0.12,
  };
});

function probabilityLabel(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

export function ModuleA_ProbabilityMap() {
  const countries = useStore((s) => s.countries);
  const selectCountry = useStore((s) => s.selectCountry);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const hoveredCountry = useStore((s) => s.hoveredCountry);
  const allCountries = useMemo(() => Array.from(countries.values()), [countries]);
  const [view, setView] = useState<ViewState>(INITIAL_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const topCountries = useMemo(
    () => [...allCountries].sort((a, b) => b.impliedProbability - a.impliedProbability).slice(0, 18),
    [allCountries]
  );

  const focusedCountry = useMemo(() => {
    const code = hoveredCountry ?? selectedCountry;
    return code ? countries.get(code) : undefined;
  }, [countries, hoveredCountry, selectedCountry]);
  const focusScale = hoveredCountry ? 2.4 : selectedCountry ? 2.0 : 1;

  useEffect(() => {
    if (focusedCountry) {
      setIsFocused(true);
      setView({
        lon: focusedCountry.centroid[0],
        lat: clamp(focusedCountry.centroid[1], -48, 58),
      });
      return;
    }

    setIsFocused(false);
  }, [focusedCountry]);

  useEffect(() => {
    if (isDragging || focusedCountry) return;

    let lastTime = performance.now();
    let rotAccum = 0;
    const baseSpeed = 0.42;

    const animate = (now: number) => {
      const dt = Math.min(50, now - lastTime) / 1000;
      lastTime = now;

      rotAccum += dt;
      const ease = Math.min(1, rotAccum / 2.0);
      const speed = baseSpeed * ease;

      setView((current) => ({
        ...current,
        lon: ((current.lon + speed + 540) % 360) - 180,
      }));

      rafRef.current = requestAnimationFrame(animate);
    };

    rotAccum = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [focusedCountry, isDragging]);

  const dots = useMemo(() => {
    const ocean = GLOBAL_DOTS.map((dot) => {
      const p = projectPoint(dot.lon, dot.lat, view);
      if (!p.visible) return null;
      return { x: p.x, y: p.y, d: p.depth };
    }).filter(Boolean) as Array<{ x: number; y: number; d: number }>;

    const land = LAND_DOTS.map((dot) => {
      const p = projectPoint(dot.lon, dot.lat, view);
      if (!p.visible) return null;
      return { x: p.x, y: p.y, d: p.depth };
    }).filter(Boolean) as Array<{ x: number; y: number; d: number }>;

    return { ocean, land };
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;

    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const vbW = 720, vbH = 600;
    const uniformScale = Math.min(W / vbW, H / vbH);
    const offsetX = (W - vbW * uniformScale) / 2;
    const offsetY = (H - vbH * uniformScale) / 2;
    const cx = W / 2;
    const cy = H / 2;

    const toX = (x: number) => offsetX + (x + vbW / 2) * uniformScale;
    const toY = (y: number) => offsetY + (y + vbH / 2) * uniformScale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, GLOBE_RADIUS * uniformScale, 0, Math.PI * 2);
    ctx.clip();

    for (const dot of dots.ocean) {
      const px = toX(dot.x);
      const py = toY(dot.y);
      const alpha = 0.02 + dot.d * 0.05;
      ctx.fillStyle = `rgba(120,180,220,${alpha})`;
      ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
    }

    for (const dot of dots.land) {
      const px = toX(dot.x);
      const py = toY(dot.y);
      const r = 1.8 + dot.d * 1.4;
      let alpha: number;
      let color: string;
      if (dot.d > 0.65) {
        alpha = 0.65 + dot.d * 0.3;
        color = `rgba(216,255,62,${alpha})`;
      } else if (dot.d > 0.3) {
        alpha = 0.35 + dot.d * 0.4;
        color = `rgba(180,230,55,${alpha})`;
      } else {
        alpha = 0.15 + dot.d * 0.35;
        color = `rgba(140,200,45,${alpha})`;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [dots]);

  const mapLabels = useMemo(() => {
    return topCountries.map((country) => {
      const projected = projectPoint(country.centroid[0], country.centroid[1], view);
      const visible = projected.visible && projected.depth > 0.05;

      return {
        country,
        x: projected.x,
        y: projected.y,
        visible,
        opacity: visible ? 0.38 + projected.depth * 0.62 : 0,
        scale: visible ? 1 : 0.65,
        depth: projected.depth,
      };
    });
  }, [topCountries, view]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const dx = event.clientX - dragRef.current.lastX;
    const dy = event.clientY - dragRef.current.lastY;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastY = event.clientY;

    setView((current) => ({
      lon: ((current.lon - dx * 0.42 + 540) % 360) - 180,
      lat: clamp(current.lat + dy * 0.28, -62, 72),
    }));
  }, []);

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <section className="relative h-full min-h-0 overflow-hidden">
      <div
        className={`relative h-full min-h-0 overflow-hidden ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[rgba(8,12,12,0.85)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/80 ring-1 ring-white/[0.08] backdrop-blur-xl">
          <Globe2 className="h-4 w-4 text-volt" />
          概率地图
        </div>

        <svg
          viewBox="-360 -300 720 600"
          className="probability-globe absolute inset-0 h-full w-full"
          style={{
            transform: `scale(${focusScale})`,
            transition: "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="globe-body" cx="44%" cy="36%" r="64%">
              <stop offset="0%" stopColor="#1a1a26" />
              <stop offset="45%" stopColor="#111118" />
              <stop offset="100%" stopColor="#08080d" />
            </radialGradient>
            <radialGradient id="globe-body-mask" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" />
              <stop offset="80%" stopColor="white" />
              <stop offset="92%" stopColor="rgba(255,255,255,0.82)" />
              <stop offset="97%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </radialGradient>
            <mask id="globe-edge-mask">
              <circle cx="0" cy="0" r={GLOBE_RADIUS} fill="url(#globe-body-mask)" />
            </mask>
            <radialGradient id="globe-highlight" cx="38%" cy="28%" r="52%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
              <stop offset="15%" stopColor="rgba(255,255,255,0.26)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="85%" stopColor="rgba(255,255,255,0.006)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="inner-edge-glow" cx="50%" cy="50%" r="50%">
              <stop offset="92%" stopColor="rgba(229,255,122,0)" />
              <stop offset="96%" stopColor="rgba(229,255,122,0.18)" />
              <stop offset="98%" stopColor="rgba(229,255,122,0.32)" />
              <stop offset="99.5%" stopColor="rgba(229,255,122,0.15)" />
              <stop offset="100%" stopColor="rgba(229,255,122,0)" />
            </radialGradient>
            <filter id="inner-glow-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          <circle
            cx="0" cy="0"
            r={GLOBE_RADIUS}
            fill="url(#globe-body)"
            mask="url(#globe-edge-mask)"
          />

          <circle
            cx="0" cy="0"
            r={GLOBE_RADIUS}
            fill="url(#globe-highlight)"
          />
          <circle
            cx="0" cy="0"
            r={GLOBE_RADIUS}
            fill="url(#inner-edge-glow)"
            filter="url(#inner-glow-soft)"
          />
        </svg>

        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${focusScale})`,
            transition: "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            zIndex: 1,
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: "none" }}
          />

          <div className="absolute inset-0" style={{ zIndex: 2 }}>
          {mapLabels.map(({ country, x, y, opacity, scale, visible }, index) => {
            const isSelected = selectedCountry === country.countryCode;

            return (
              <motion.button
                key={country.countryCode}
                type="button"
                initial={false}
                animate={{ scale }}
                transition={{ delay: index * 0.01, duration: 0.2 }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  selectCountry(country.countryCode, "map");
                }}
                className="probability-map-label absolute flex h-[30px] w-max origin-center items-center gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(8,12,12,0.82)] px-2.5 py-1.5 text-xs font-bold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition hover:bg-white/[0.1]"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(216,255,62,0.18), 0 0 24px rgba(216,255,62,0.18)"
                    : undefined,
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible ? "auto" : "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFlagUrl(country.countryCode)}
                  alt={country.countryName}
                  className="h-4 w-5 rounded-sm object-cover"
                  loading="lazy"
                />
                <span>{probabilityLabel(country.impliedProbability)}</span>
              </motion.button>
            );
          })}
          </div>
        </div>

      </div>
    </section>
  );
}
