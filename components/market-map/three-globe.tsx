"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { localizeTeamName } from "@/lib/team-localization";
import { getFlagUrl } from "@/lib/world-cup-2026";
import { CAMERA_Z, GLOBE_RADIUS } from "./three-globe/constants";
import { ll2v, lonLatToFocusRotation } from "./three-globe/geo";
import { addGlobeParticles } from "./three-globe/particles";
import { EARTH_FS, EARTH_VS, INNER_GLOW_FS, INNER_GLOW_VS, OUTER_GLOW_FS } from "./three-globe/shaders";

/* ── component ── */
export function ThreeGlobe() {
  const countries = useStore((s) => s.countries);
  const selectCountry = useStore((s) => s.selectCountry);
  const selectedCountry = useStore((s) => s.selectedCountry);
  const hoveredCountry = useStore((s) => s.hoveredCountry);
  const focusCountryCode = hoveredCountry ?? selectedCountry;

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

  const [labels, setLabels] = useState<
    Array<{ code: string; name: string; prob: number; sx: number; sy: number; vis: boolean }>
  >([]);
  const [hoveredLabelCode, setHoveredLabelCode] = useState<string | null>(null);
  const expandedCountryCode = hoveredLabelCode ?? focusCountryCode;

  const focusTarget = useMemo(() => {
    if (!focusCountryCode) return null;
    const c = countries.get(focusCountryCode);
    if (!c) return null;
    return {
      lon: c.centroid[0],
      lat: Math.max(-60, Math.min(65, c.centroid[1])),
      scale: 1.9,
    };
  }, [focusCountryCode, countries]);

  const labelCountries = useMemo(() => {
    const ranked = Array.from(countries.values())
      .sort((a, b) => b.impliedProbability - a.impliedProbability)
      .slice(0, 18);

    if (!expandedCountryCode || ranked.some((country) => country.countryCode === expandedCountryCode)) {
      return ranked;
    }

    const activeCountry = countries.get(expandedCountryCode);
    return activeCountry ? [...ranked, activeCountry] : ranked;
  }, [countries, expandedCountryCode]);

  const topRef = useRef(labelCountries);
  topRef.current = labelCountries;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const W = el.clientWidth || 800;
    const H = el.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    });
    ro.observe(el);

    const autoRotSpeed = 0.15;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
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
      if (tgt) {
        /* shortest-path angle interpolation for Y (longitude) */
        let dy = tgt.y - globe.rotation.y;
        if (dy > Math.PI) dy -= Math.PI * 2;
        if (dy < -Math.PI) dy += Math.PI * 2;
        globe.rotation.y += dy * 0.12;
        globe.rotation.x += (tgt.x - globe.rotation.x) * 0.12;
        const cs = globe.scale.x;
        globe.scale.setScalar(cs + (tgt.s - cs) * 0.10);
      } else {
        globe.rotation.x += (0 - globe.rotation.x) * 0.06;
        const cs = globe.scale.x;
        if (Math.abs(cs - 1) > 0.001) {
          globe.scale.setScalar(cs + (1 - cs) * 0.06);
        }
      }

      renderer.render(scene, camera);

      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const v = new THREE.Vector3();
      setLabels(
        topRef.current.map((c) => {
          v.copy(ll2v(c.centroid[0], c.centroid[1], GLOBE_RADIUS + 6));
          globe.localToWorld(v);
          const normal = v.clone().normalize();
          const toCamera = camera.position.clone().sub(v).normalize();
          const facing = normal.dot(toCamera) > 0.2;
          v.project(camera);
          const sx = ((v.x + 1) / 2) * cw;
          const sy = ((-v.y + 1) / 2) * ch;
          return {
            code: c.countryCode,
            name: localizeTeamName(c.countryName, c.countryCode),
            prob: c.impliedProbability,
            sx,
            sy,
            vis: facing && v.z < 1 && v.z > -1,
          };
        })
      );
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

  return (
    <section className="relative h-full min-h-0 overflow-hidden">
      <div ref={wrapRef} className="relative h-full min-h-0" style={{ cursor: "grab" }}>
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-[rgba(8,12,12,0.85)] px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white/80 ring-1 ring-white/[0.08] backdrop-blur-xl">
          <svg className="h-4 w-4 text-volt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          概率地图
        </div>

        {labels.map((l) => {
          const sel = selectedCountry === l.code;
          const isActive = expandedCountryCode === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerEnter={() => onLabelHover(l.code)}
              onPointerLeave={() => onLabelHover(null)}
              onFocus={() => onLabelHover(l.code)}
              onBlur={() => onLabelHover(null)}
              onClick={() => onLabelClick(l.code)}
              className={`probability-map-label absolute left-0 top-0 flex h-[30px] w-max items-center gap-1.5 rounded-full border bg-[rgba(8,12,12,0.82)] px-2.5 py-1.5 text-xs font-bold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-[background-color,border-color,box-shadow,opacity] duration-150 will-change-transform hover:bg-white/[0.1] ${
                l.vis ? "border-white/[0.08] pointer-events-auto" : "border-transparent pointer-events-none"
              }`}
              style={{
                transform: `translate3d(${l.sx}px, ${l.sy}px, 0) translate(-50%, -50%)`,
                opacity: l.vis ? 1 : 0,
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
          );
        })}
      </div>
    </section>
  );
}
