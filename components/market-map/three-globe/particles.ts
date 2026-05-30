import * as THREE from "three";
import { GLOBE_RADIUS } from "./constants";
import { DOT_FS, DOT_VS } from "./shaders";
import { fbm, hash21, isLandLike, ll2v, toRad, type Dot } from "./geo";

const CELL_SIZE = 2.4;
const LAND_CELL_SIZE = 2.1;
const LAND_DOT_SIZE = 9.2;
const OCEAN_SPARSE = 0.12;

const LAND_DOTS: Dot[] = (() => {
  const dots: Dot[] = [];
  const rowCount = Math.ceil(155 / LAND_CELL_SIZE);

  for (let row = 0; row < rowCount; row++) {
    const lat = -77 + row * LAND_CELL_SIZE;
    const latScale = Math.max(0.35, Math.cos(toRad(lat)));
    const lonStep = LAND_CELL_SIZE / latScale;
    const colCount = Math.ceil(360 / lonStep);
    const hexOffset = (row & 1) * lonStep * 0.5;

    for (let col = 0; col < colCount; col++) {
      const lon = -180 + col * lonStep + hexOffset;
      if (!isLandLike(lon, lat)) continue;
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

function createOceanParticles() {
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

  return createParticlePoints(pos, sz, col, al, depthArr);
}

function createLandParticles() {
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
    const n2 = hash21(Math.floor(d.lon * 3), Math.floor(d.lat * 3));
    sz[i] = LAND_DOT_SIZE;
    const hueShift = (n2 - 0.5) * 0.04;
    const t = depth;
    col[i * 3] = 0.48 + t * 0.44 + hueShift;
    col[i * 3 + 1] = 0.82 + t * 0.18 - hueShift * 0.5;
    col[i * 3 + 2] = 0.08 + t * 0.14;
    al[i] = 0.40 + depth * 0.45 + (n2 - 0.5) * 0.04;
  });

  return createParticlePoints(pos, sz, col, al, depthArr);
}

function createParticlePoints(
  positions: Float32Array,
  sizes: Float32Array,
  colors: Float32Array,
  alphas: Float32Array,
  depths: Float32Array
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));

  return new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: DOT_VS,
      fragmentShader: DOT_FS,
      transparent: true,
      depthWrite: false,
    })
  );
}

export function addGlobeParticles(globe: THREE.Group) {
  globe.add(createOceanParticles());
  globe.add(createLandParticles());
}
