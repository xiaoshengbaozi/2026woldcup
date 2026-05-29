"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { getFlagUrl } from "@/lib/world-cup-2026";

/* ── flag helpers ── */
/* ── constants ── */
const GLOBE_RADIUS = 278;
const CAMERA_Z = 820;

/* ── noise / randomness ── */
function hash21(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, octaves: number = 4): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

/* ── shaders ── */
const EARTH_VS = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const EARTH_FS = `
  uniform vec3 uGlobeColor;
  uniform vec3 uLightDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float fresnel = smoothstep(0.0, 0.65, 1.0 - NdotV) * 0.22;
    float diff = max(dot(vNormal, uLightDir), 0.0);
    vec3 c = uGlobeColor * (0.38 + diff * 0.35) + vec3(1.0) * fresnel;
    gl_FragColor = vec4(c, 1.0);
  }
`;
const INNER_GLOW_VS = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const INNER_GLOW_FS = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float glow = pow(1.0 - NdotV, uPower) * uIntensity;
    gl_FragColor = vec4(uColor, glow);
  }
`;
const OUTER_GLOW_FS = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 V = normalize(cameraPosition - vWorldPos);
    float NdotV = max(dot(V, vNormal), 0.0);
    float glow = pow(1.0 - NdotV, 2.2) * 0.12;
    gl_FragColor = vec4(uColor, glow);
  }
`;

const DOT_VS = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute float aDepth;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vDepth = aDepth;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / -mv.z) * (0.55 + aDepth * 0.45);
    gl_Position = projectionMatrix * mv;
  }
`;
const DOT_FS = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vDepth;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float core  = exp(-12.0 * d * d);
    float halo  = exp(-4.0  * d * d) * 0.25;
    float shape = core + halo;
    shape *= smoothstep(0.5, 0.2, d);
    float brightness = 1.0 + vDepth * 0.2;
    vec3 c = vColor * brightness;
    gl_FragColor = vec4(c, vAlpha * shape);
  }
`;

/* ── land detection ── */
function toRad(v: number) {
  return (v * Math.PI) / 180;
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

function isLandLike(lon: number, lat: number): boolean {
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

/* ── dot data ── */
interface Dot { lon: number; lat: number; }

const CELL_SIZE   = 2.4;
const JITTER_STR  = 0.78;
const POLE_THIN   = 0.30;
const OCEAN_SPARSE = 0.12;

const LAND_DOTS: Dot[] = (() => {
  const dots: Dot[] = [];
  const rowCount = Math.ceil(155 / CELL_SIZE);
  const colCount = Math.ceil(360 / CELL_SIZE);
  for (let row = 0; row < rowCount; row++) {
    const baseLat = -77 + row * CELL_SIZE;
    const hexOffset = (row & 1) * CELL_SIZE * 0.5;
    const latRad = toRad(baseLat);
    const poleFactor = 1 - POLE_THIN * Math.pow(Math.sin(latRad), 2);
    for (let col = 0; col < colCount; col++) {
      const baseLon = -180 + col * CELL_SIZE + hexOffset;
      const jitterLon = fbm(baseLon * 0.009, baseLat * 0.009, 4) - 0.5;
      const jitterLat = fbm(baseLon * 0.011 + 73.1, baseLat * 0.011 + 41.9, 4) - 0.5;
      const lon = baseLon + jitterLon * CELL_SIZE * JITTER_STR;
      const lat = baseLat + jitterLat * CELL_SIZE * JITTER_STR * 0.8;
      if (!isLandLike(lon, lat)) continue;
      const rnd = hash21(col * 137 + row, row * 251 + col);
      if (rnd > 0.74 * poleFactor) continue;
      dots.push({ lon, lat });
    }
  }
  return dots;
})();

const OCEAN_DOTS: Dot[] = (() => {
  const dots: Dot[] = [];
  const cellO = CELL_SIZE * 1.6;
  const rowCount = Math.ceil(156 / cellO);
  const colCount = Math.ceil(360 / cellO);
  for (let row = 0; row < rowCount; row++) {
    const baseLat = -78 + row * cellO;
    const hexOffset = (row & 1) * cellO * 0.5;
    for (let col = 0; col < colCount; col++) {
      const baseLon = -180 + col * cellO + hexOffset;
      const jL = fbm(baseLon * 0.008, baseLat * 0.008, 2) - 0.5;
      const jB = fbm(baseLon * 0.01 + 200, baseLat * 0.01 + 200, 2) - 0.5;
      const lon = baseLon + jL * cellO * 0.7;
      const lat = baseLat + jB * cellO * 0.6;
      if (hash21(col * 89 + row, row * 173 + col) > OCEAN_SPARSE) continue;
      dots.push({ lon, lat });
    }
  }
  return dots;
})();

function ll2v(lon: number, lat: number, r: number): THREE.Vector3 {
  const phi = toRad(90 - lat);
  const theta = toRad(lon + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function lonLatToFocusRotation(lon: number, lat: number) {
  return {
    y: -toRad(lon + 90),
    x: toRad(lat),
  };
}

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

    /* ocean dots */
    {
      const n = OCEAN_DOTS.length;
      const pos = new Float32Array(n * 3);
      const sz = new Float32Array(n);
      const col = new Float32Array(n * 3);
      const al = new Float32Array(n);
      const depthArr = new Float32Array(n);
      const tmp = new THREE.Vector3();
      OCEAN_DOTS.forEach((d, i) => {
        tmp.copy(ll2v(d.lon, d.lat, GLOBE_RADIUS + 0.3));
        pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
        const nz = tmp.z / GLOBE_RADIUS;
        const depth = Math.max(0, Math.min(1, (nz + 1) * 0.5));
        depthArr[i] = depth;
        sz[i] = 6.0 + hash21(i, 0) * 0.8;
        col[i * 3] = 0.28; col[i * 3 + 1] = 0.45; col[i * 3 + 2] = 0.58;
        al[i] = 0.10 + depth * 0.08;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
      g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      g.setAttribute("aAlpha", new THREE.BufferAttribute(al, 1));
      g.setAttribute("aDepth", new THREE.BufferAttribute(depthArr, 1));
      globe.add(new THREE.Points(g, new THREE.ShaderMaterial({
        vertexShader: DOT_VS, fragmentShader: DOT_FS, transparent: true, depthWrite: false,
      })));
    }

    /* land dots */
    {
      const n = LAND_DOTS.length;
      const pos = new Float32Array(n * 3);
      const sz = new Float32Array(n);
      const col = new Float32Array(n * 3);
      const al = new Float32Array(n);
      const depthArr = new Float32Array(n);
      const tmp = new THREE.Vector3();
      LAND_DOTS.forEach((d, i) => {
        tmp.copy(ll2v(d.lon, d.lat, GLOBE_RADIUS + 0.4));
        pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
        const nz = tmp.z / GLOBE_RADIUS;
        const depth = Math.max(0, Math.min(1, (nz + 1) * 0.5));
        depthArr[i] = depth;
        const n1 = fbm(d.lon * 0.05, d.lat * 0.05, 2);
        const n2 = hash21(Math.floor(d.lon * 3), Math.floor(d.lat * 3));
        const sizeBase = 9.6 + depth * 4.0;
        const sizeNoise = (n1 - 0.5) * 1.6 + (n2 - 0.5) * 1.0;
        sz[i] = Math.max(7.0, sizeBase + sizeNoise);
        const hueShift = (n2 - 0.5) * 0.04;
        const t = depth;
        col[i * 3] = 0.48 + t * 0.44 + hueShift;
        col[i * 3 + 1] = 0.82 + t * 0.18 - hueShift * 0.5;
        col[i * 3 + 2] = 0.08 + t * 0.14;
        al[i] = 0.40 + depth * 0.45 + (n2 - 0.5) * 0.04;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
      g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      g.setAttribute("aAlpha", new THREE.BufferAttribute(al, 1));
      g.setAttribute("aDepth", new THREE.BufferAttribute(depthArr, 1));
      globe.add(new THREE.Points(g, new THREE.ShaderMaterial({
        vertexShader: DOT_VS, fragmentShader: DOT_FS, transparent: true, depthWrite: false,
      })));
    }

    /* pointer controls */
    const onDown = (e: PointerEvent) => {
      dragRef.current = { on: true, lx: e.clientX, ly: e.clientY };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.on) return;
      const dx = e.clientX - dragRef.current.lx;
      const dy = e.clientY - dragRef.current.ly;
      dragRef.current.lx = e.clientX;
      dragRef.current.ly = e.clientY;
      globe.rotation.y += dx * 0.005;
      globe.rotation.x += dy * 0.005;
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

    let labelFrame = 0;
    const autoRotSpeed = 0.15;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const dt = clockRef.current.getDelta();

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

      labelFrame++;
      if (labelFrame % 3 === 0) {
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
              name: c.countryName,
              prob: c.impliedProbability,
              sx,
              sy,
              vis: facing && v.z < 1 && v.z > -1,
            };
          })
        );
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
              className={`probability-map-label absolute flex h-[30px] w-max -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border bg-[rgba(8,12,12,0.82)] px-2.5 py-1.5 text-xs font-bold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-all duration-200 hover:bg-white/[0.1] ${
                l.vis ? "border-white/[0.08] pointer-events-auto" : "border-transparent pointer-events-none"
              }`}
              style={{
                left: l.sx,
                top: l.sy,
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
