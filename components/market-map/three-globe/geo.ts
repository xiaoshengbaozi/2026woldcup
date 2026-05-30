import * as THREE from "three";

export interface Dot {
  lon: number;
  lat: number;
}

export function hash21(x: number, y: number): number {
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

export function fbm(x: number, y: number, octaves: number = 4): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return v;
}

export function toRad(v: number) {
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

export function isLandLike(lon: number, lat: number): boolean {
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

export function ll2v(lon: number, lat: number, r: number): THREE.Vector3 {
  const phi = toRad(90 - lat);
  const theta = toRad(lon + 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export function lonLatToFocusRotation(lon: number, lat: number) {
  return {
    y: -toRad(lon + 90),
    x: toRad(lat),
  };
}
