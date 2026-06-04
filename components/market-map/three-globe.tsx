"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, Expand } from "lucide-react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { getTeamCodeFromName, localizeTeamName } from "@/lib/team-localization";
import { useMatchLines } from "@/lib/use-match-lines";
import { getFlagUrl } from "@/lib/world-cup-2026";
import type { MatchLineEvent, MatchLineMarket } from "@/types/messages";
import { CAMERA_Z, GLOBE_RADIUS } from "./three-globe/constants";
import { ll2v, lonLatToFocusRotation } from "./three-globe/geo";
import { addGlobeParticles } from "./three-globe/particles";
import { EARTH_FS, EARTH_VS, INNER_GLOW_FS, INNER_GLOW_VS, OUTER_GLOW_FS } from "./three-globe/shaders";

const HOME_MATCH_TAG_OFFSETS = [
  { x: 112, y: 0 },
];

const AWAY_MATCH_TAG_OFFSETS = [
  { x: -326, y: 0 },
];

const MATCH_TAG_WIDTH = 142;
const MATCH_TAG_HEIGHT = 50;
const MATCH_TAG_VERTICAL_GAP = 8;

/* ── component ── */
export function ThreeGlobe({
  webFullscreen = false,
  onWebFullscreenChange,
  onSystemFullscreen,
  className,
  paused = false,
}: {
  webFullscreen?: boolean;
  onWebFullscreenChange?: (v: boolean) => void;
  onSystemFullscreen?: () => void;
  className?: string;
  paused?: boolean;
} = {}) {
  const countries = useStore((s) => s.countries);
  const selectCountry = useStore((s) => s.selectCountry);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const hoveredCountry = useStore((s) => s.hoveredCountry);
  const focusedModule = useStore((s) => s.focusedModule);
  const { events: matchLineEvents } = useMatchLines();

  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const dragRef = useRef({ on: false, lx: 0, ly: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const autoRotRef = useRef(0);
  const targetRef = useRef<{ y: number; x: number; s: number } | null>(null);
  const labelHoverRef = useRef(false);
  const fullscreenScaleRef = useRef(webFullscreen ? 0.85 : 1);
  const pausedRef = useRef(paused);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());

  const [labels, setLabels] = useState<
    Array<{ code: string; name: string; prob: number }>
  >([]);
  const [hoveredLabelCode, setHoveredLabelCode] = useState<string | null>(null);
  const rankingHoverCode = focusedModule === "ranking" ? hoveredCountry : null;
  const focusCountryCode = rankingHoverCode;
  const expandedCountryCode = hoveredLabelCode ?? rankingHoverCode;

  const focusTarget = useMemo(() => {
    if (!focusCountryCode) return null;
    const c = countries.get(focusCountryCode);
    if (!c || !hasRenderableCentroid(c.centroid)) return null;
    return {
      lon: c.centroid[0],
      lat: Math.max(-60, Math.min(65, c.centroid[1])),
      scale: 1.9,
    };
  }, [focusCountryCode, countries]);

  const labelCountries = useMemo(() => {
    const ranked = Array.from(countries.values())
      .filter((country) => hasRenderableCentroid(country.centroid))
      .sort((a, b) => b.impliedProbability - a.impliedProbability);

    if (!expandedCountryCode || ranked.some((country) => country.countryCode === expandedCountryCode)) {
      return ranked;
    }

    const activeCountry = countries.get(expandedCountryCode);
    return activeCountry ? [...ranked, activeCountry] : ranked;
  }, [countries, expandedCountryCode]);

  const topRef = useRef(labelCountries);
  topRef.current = labelCountries;

  useEffect(() => {
    fullscreenScaleRef.current = webFullscreen ? 0.85 : 1;
  }, [webFullscreen]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    setLabels(
      labelCountries.map((country) => ({
        code: country.countryCode,
        name: localizeTeamName(country.countryName, country.countryCode),
        prob: country.impliedProbability,
      }))
    );
  }, [labelCountries]);

  const expandedMatchTags = useMemo(
    () => buildMatchTags(matchLineEvents, expandedCountryCode),
    [matchLineEvents, expandedCountryCode]
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(getGlobePixelRatio());
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, W / H, 1, 2000);
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const globe = new THREE.Group();
    scene.add(globe);
    globeRef.current = globe;

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: EARTH_VS, fragmentShader: EARTH_FS,
        uniforms: {
          uGlobeColor: { value: new THREE.Color(0x10101a) },
          uLightDir: { value: new THREE.Vector3(0.3, 0.5, 0.8).normalize() },
        },
      })
    ));

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: INNER_GLOW_VS, fragmentShader: INNER_GLOW_FS,
        uniforms: {
          uColor: { value: new THREE.Color(0xe5ff7a) },
          uIntensity: { value: 0.45 },
          uPower: { value: 8.0 },
        },
        side: THREE.FrontSide, transparent: true, depthWrite: false,
      })
    ));

    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.008, 64, 64),
      new THREE.ShaderMaterial({
        vertexShader: INNER_GLOW_VS, fragmentShader: OUTER_GLOW_FS,
        uniforms: {
          uColor: { value: new THREE.Color(0xe5ff7a) },
        },
        side: THREE.BackSide, transparent: true, depthWrite: false,
      })
    ));

    addGlobeParticles(globe);

    /* pointer controls */
    const onDown = (e: PointerEvent) => {
      dragRef.current = { on: true, lx: e.clientX, ly: e.clientY };
      velRef.current = { x: 0, y: 0 };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.on) return;
      const dx = e.clientX - dragRef.current.lx;
      const dy = e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      
      velRef.current.y = dx * 0.005;
      velRef.current.x = dy * 0.005;
      
      globe.rotation.y += velRef.current.y;
      globe.rotation.x += velRef.current.x;
      globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
      autoRotRef.current = 0;
    };
    const onUp = () => {
      dragRef.current.on = false;
      el.style.cursor = "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(getGlobePixelRatio());
    });
    ro.observe(el);

    const autoRotSpeed = 0.15;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (pausedRef.current) {
        clockRef.current.getDelta();
        return;
      }
      const dt = clockRef.current.getDelta();

      if (!dragRef.current.on && !targetRef.current) {
        if (Math.abs(velRef.current.y) > 0.0001 || Math.abs(velRef.current.x) > 0.0001) {
          globe.rotation.y += velRef.current.y;
          globe.rotation.x += velRef.current.x;
          globe.rotation.x = Math.max(-1.2, Math.min(1.2, globe.rotation.x));
          
          velRef.current.y *= 0.95;
          velRef.current.x *= 0.95;
        }
      }

      if (!targetRef.current && !dragRef.current.on && !labelHoverRef.current) {
        autoRotRef.current += dt;
        if (autoRotRef.current > 1.5) {
          const elapsed = autoRotRef.current - 1.5;
          const ease = Math.min(1, elapsed / 2.0);
          globe.rotation.y += autoRotSpeed * dt * ease;
        }
      }

      const tgt = targetRef.current;
      const baseScale = fullscreenScaleRef.current;
      if (tgt) {
        /* shortest-path angle interpolation for Y (longitude) */
        let dy = tgt.y - globe.rotation.y;
        if (dy > Math.PI) dy -= Math.PI * 2;
        if (dy < -Math.PI) dy += Math.PI * 2;
        globe.rotation.y += dy * 0.12;
        globe.rotation.x += (tgt.x - globe.rotation.x) * 0.12;
        const cs = globe.scale.x;
        const targetScale = tgt.s * baseScale;
        globe.scale.setScalar(cs + (targetScale - cs) * 0.10);
      } else {
        globe.rotation.x += (0 - globe.rotation.x) * 0.06;
        const cs = globe.scale.x;
        if (Math.abs(cs - baseScale) > 0.001) {
          globe.scale.setScalar(cs + (baseScale - cs) * 0.06);
        }
      }

      renderer.render(scene, camera);

      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const v = new THREE.Vector3();
      for (const c of topRef.current) {
        const labelEl = labelRefs.current.get(c.countryCode);
        if (!labelEl) continue;

        v.copy(ll2v(c.centroid[0], c.centroid[1], GLOBE_RADIUS + 6));
        globe.localToWorld(v);
        const normal = v.clone().normalize();
        const toCamera = camera.position.clone().sub(v).normalize();
        const facing = normal.dot(toCamera) > 0.2;
        v.project(camera);
        const sx = ((v.x + 1) / 2) * cw;
        const sy = ((-v.y + 1) / 2) * ch;
        const visible = facing && v.z < 1 && v.z > -1;

        labelEl.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
        labelEl.style.opacity = visible ? "1" : "0";
        labelEl.style.pointerEvents = visible ? "auto" : "none";
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      
      // Dispose of three.js resources recursively to prevent GPU memory leaks
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (focusTarget) {
      const { y, x } = lonLatToFocusRotation(focusTarget.lon, focusTarget.lat);
      targetRef.current = { y, x, s: focusTarget.scale };
      autoRotRef.current = 0;
    } else {
      targetRef.current = null;
    }
  }, [focusTarget]);

  const onLabelClick = useCallback(
    (code: string) => selectCountry(code, "map"),
    [selectCountry]
  );

  const onLabelHover = useCallback((code: string | null) => {
    labelHoverRef.current = Boolean(code);
    setHoveredLabelCode(code);
    if (code) {
      autoRotRef.current = 0;
    }
  }, []);

  const toggleWebFullscreen = useCallback(() => {
    if (onWebFullscreenChange) onWebFullscreenChange(!webFullscreen);
  }, [webFullscreen, onWebFullscreenChange]);

  const toggleSystemFullscreen = useCallback(() => {
    if (onSystemFullscreen) {
      onSystemFullscreen();
    }
  }, [onSystemFullscreen]);

  // Escape to exit web fullscreen
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && webFullscreen && onWebFullscreenChange) {
        document.body.style.overflow = "";
        onWebFullscreenChange(false);
      }
    };
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("keydown", keyHandler);
    };
  }, [webFullscreen, onWebFullscreenChange]);

  // Resize renderer when web fullscreen toggles
  useEffect(() => {
    const el = wrapRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!el || !renderer || !camera) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }, [webFullscreen]);

  return (
    <section className={`relative h-full min-h-0 overflow-hidden ${className ?? ""}`}>
      <div ref={wrapRef} className="relative h-full min-h-0" style={{ cursor: "grab" }}>
        <div className="globe-label absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[rgba(8,12,12,0.85)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/80 ring-1 ring-white/[0.08] backdrop-blur-xl">
          <svg className="h-4 w-4 text-volt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          概率地图
        </div>

        {/* Fullscreen buttons */}
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleWebFullscreen}
            title={webFullscreen ? "退出网页全屏" : "网页全屏"}
            className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(8,12,12,0.85)] text-white/40 ring-1 ring-white/[0.08] backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-volt"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleSystemFullscreen}
            title="系统全屏"
            className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(8,12,12,0.85)] text-white/40 ring-1 ring-white/[0.08] backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-volt"
          >
            <Expand className="h-3.5 w-3.5" />
          </button>
        </div>

        {labels.map((l) => {
          const sel = selectedCountry === l.code;
          const isActive = expandedCountryCode === l.code;
          return (
            <div
              key={l.code}
              ref={(node) => {
                if (node) {
                  labelRefs.current.set(l.code, node);
                } else {
                  labelRefs.current.delete(l.code);
                }
              }}
              onPointerEnter={() => onLabelHover(l.code)}
              onPointerLeave={() => onLabelHover(null)}
              onMouseEnter={() => onLabelHover(l.code)}
              onMouseLeave={() => onLabelHover(null)}
              className={`pointer-events-none absolute left-0 top-0 opacity-0 will-change-transform ${
                isActive ? "z-[90]" : "z-10"
              }`}
            >
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerEnter={() => onLabelHover(l.code)}
                onPointerLeave={() => onLabelHover(null)}
                onMouseEnter={() => onLabelHover(l.code)}
                onMouseLeave={() => onLabelHover(null)}
                onFocus={() => onLabelHover(l.code)}
                onBlur={() => onLabelHover(null)}
                onClick={() => onLabelClick(l.code)}
                className={`globe-label probability-map-label relative z-[110] flex h-[30px] w-max items-center gap-1.5 rounded-full border bg-[rgba(8,12,12,0.82)] px-2.5 py-1.5 text-xs font-bold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-[background-color,border-color,box-shadow] duration-150 hover:bg-white/[0.1] ${
                  "border-white/[0.08]"
                }`}
                style={{
                  boxShadow: isActive || sel ? "0 0 0 2px rgba(216,255,62,0.18), 0 0 24px rgba(216,255,62,0.18)" : undefined,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFlagUrl(l.code)}
                  alt={l.name}
                  className="h-4 w-5 rounded-sm object-cover"
                  loading="lazy"
                />
                {isActive && (
                  <span className="max-w-[112px] truncate text-white">
                    {l.name}
                  </span>
                )}
                <span>{l.prob > 0 && l.prob < 1 ? "<1%" : `${Math.round(l.prob)}%`}</span>
              </button>

              {isActive && expandedMatchTags.length > 0 && (
                <div className="pointer-events-none absolute left-1/2 top-1/2 z-[100]">
                  <svg
                    className="absolute overflow-visible"
                    width="640"
                    height="380"
                    viewBox="-320 -190 640 380"
                    aria-hidden="true"
                    style={{
                      left: -320,
                      top: -190,
                      zIndex: 102,
                    }}
                  >
                    <defs>
                      <filter id={`match-tag-glow-${l.code}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {expandedMatchTags.map((tag, index) => {
                      const offset = getSatelliteOffset(expandedMatchTags, tag, index);

                      return (
                        <motion.path
                          key={`${tag.id}-line`}
                          d={getConnectorPath(tag.isHome, offset)}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.18, delay: index * 0.035 }}
                          fill="none"
                          stroke="rgba(255,255,255,0.52)"
                          strokeLinecap="round"
                          strokeWidth="1.35"
                          filter={`url(#match-tag-glow-${l.code})`}
                        />
                      );
                    })}
                  </svg>
                  {expandedMatchTags.map((tag, index) => {
                    const offset = getSatelliteOffset(expandedMatchTags, tag, index);
                    return (
                      <motion.div
                        key={tag.id}
                        initial={{ opacity: 0, scale: 0.72, x: tag.isHome ? 12 : -42, y: -16 }}
                        animate={{ opacity: 1, scale: 1, x: offset.x, y: offset.y }}
                        transition={{ type: "spring", stiffness: 360, damping: 28, delay: index * 0.035 }}
                        className="globe-info-card absolute z-[105] w-[142px] overflow-hidden rounded-xl border border-flare/20 bg-[linear-gradient(135deg,rgba(255,154,31,0.12),rgba(8,12,12,0.82)_42%,rgba(216,255,62,0.07))] px-2.5 py-2 text-left shadow-[0_12px_34px_rgba(0,0,0,0.34),0_0_18px_rgba(255,154,31,0.10)] backdrop-blur-2xl"
                      >
                        <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.08em] text-white/42">
                          <span className="truncate">{formatMatchDateTime(tag.startTime)}</span>
                          <span className="shrink-0 text-[12px] font-black leading-none text-volt tabular-nums" style={{ fontFamily: "ScreenMatrix" }}>
                            {formatOdds(tag.yesPrice)}
                          </span>
                        </div>
                        <div className={`mt-1.5 flex min-w-0 items-center gap-1.5 ${tag.isHome ? "" : "justify-end text-right"}`}>
                          {tag.isHome ? (
                            <>
                              <span className="shrink-0 text-[11px] font-black text-flare/85">→</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getFlagUrl(tag.opponentCode, 40)}
                                alt={tag.opponentName}
                                className="h-3.5 w-5 shrink-0 rounded-sm object-cover ring-1 ring-white/10"
                                loading="lazy"
                              />
                              <span className="min-w-0 flex-1 truncate text-[10px] font-bold leading-none text-white/78">
                                {tag.opponentName}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1 truncate text-[10px] font-bold leading-none text-white/78">
                                {tag.opponentName}
                              </span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getFlagUrl(tag.opponentCode, 40)}
                                alt={tag.opponentName}
                                className="h-3.5 w-5 shrink-0 rounded-sm object-cover ring-1 ring-white/10"
                                loading="lazy"
                              />
                              <span className="shrink-0 text-[11px] font-black text-flare/85">←</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type GlobeMatchTag = {
  id: string;
  opponentCode: string;
  opponentName: string;
  isHome: boolean;
  yesPrice: number;
  startTime: number;
};

function hasRenderableCentroid(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function getSatelliteOffset(tags: GlobeMatchTag[], tag: GlobeMatchTag, index: number) {
  const sideTags = tags.filter((item) => item.isHome === tag.isHome);
  const sideIndex = tags.slice(0, index).filter((item) => item.isHome === tag.isHome).length;
  const base = tag.isHome ? HOME_MATCH_TAG_OFFSETS[0] : AWAY_MATCH_TAG_OFFSETS[0];
  const step = MATCH_TAG_HEIGHT + MATCH_TAG_VERTICAL_GAP;
  const centerY = (sideIndex - (sideTags.length - 1) / 2) * step;

  return {
    x: base.x,
    y: base.y + centerY - MATCH_TAG_HEIGHT / 2,
  };
}

function getConnectorPath(isHome: boolean, offset: { x: number; y: number }) {
  const startX = isHome ? 54 : -54;
  const startY = 0;
  const endX = isHome ? offset.x : offset.x + MATCH_TAG_WIDTH + 4;
  const endY = offset.y + MATCH_TAG_HEIGHT / 2;
  const stemX = isHome ? startX + 34 : startX - 34;
  const controlX = isHome
    ? Math.max(stemX + 28, endX - 52)
    : Math.min(stemX - 28, endX + 52);

  return `M ${startX} ${startY} L ${stemX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
}

function buildMatchTags(events: MatchLineEvent[], countryCode: string | null): GlobeMatchTag[] {
  if (!countryCode) return [];

  return events
    .map((event) => toMatchTag(event, countryCode))
    .filter((tag): tag is GlobeMatchTag => Boolean(tag))
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 4);
}

function toMatchTag(event: MatchLineEvent, countryCode: string): GlobeMatchTag | null {
  const homeCode = getTeamCodeFromName(event.homeTeam);
  const awayCode = getTeamCodeFromName(event.awayTeam);
  const isHome = homeCode === countryCode;
  const isAway = awayCode === countryCode;
  if (!isHome && !isAway) return null;

  const teamName = isHome ? event.homeTeam : event.awayTeam;
  const opponentName = isHome ? event.awayTeam : event.homeTeam;
  const opponentCode = isHome ? awayCode : homeCode;
  const market = findMoneylineMarket(event.markets, teamName);
  if (!market || !opponentCode) return null;

  return {
    id: `${event.id}-${countryCode}`,
    opponentCode,
    opponentName: localizeTeamName(opponentName, opponentCode),
    isHome,
    yesPrice: market.yesPrice,
    startTime: event.startTime,
  };
}

function findMoneylineMarket(markets: MatchLineMarket[], teamName: string) {
  return markets.find(
    (market) => market.marketType === "moneyline" && normalizeMatchName(market.label) === normalizeMatchName(teamName)
  );
}

function normalizeMatchName(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function formatOdds(value: number) {
  if (value > 0 && value < 1) return "<1%";
  return `${Math.round(value)}%`;
}

function formatMatchDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(timestamp);
}

function getGlobePixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const isCompactViewport = window.matchMedia("(max-width: 768px)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = "connection" in navigator && Boolean((navigator as Navigator & {
    connection?: { saveData?: boolean };
  }).connection?.saveData);

  if (saveData || prefersReducedMotion) return Math.min(dpr, 1);
  if (isCompactViewport) return Math.min(dpr, 1.35);
  return Math.min(dpr, 1.65);
}
