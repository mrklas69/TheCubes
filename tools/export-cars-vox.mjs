// tools/export-cars-vox.mjs
// Vygeneruje 2 jednoduchá voxelová auta (~50 voxelů každé) ve formátu `.vox`.
// Sedan + truck profil, modré + červené tělo. Ulož do `assets/car-simple-{0,1}.vox`.
// User otevře v MagicaVoxelu, ověří/upraví, vyexportuje jako `.obj` → nahradí
// `cars-0`/`cars-1` v `assets/`.
//
// Layout: MagicaVoxel je Z-up. X = délka (přední → zadní), Y = šířka, Z = výška.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "../assets");
const SIZE = 16;   // bbox 16³ (jen pár voxelů uvnitř)

// === Sdílená paleta pro auta ===
// Indexy:
//   1 = body 1 (modré pro car-0)
//   2 = body 2 (červené pro car-1)
//   3 = window/glass (světle modrošedá)
//   4 = wheel (skoro černá)
//   5 = headlight (žlutá)
//   6 = chassis tmavá (pod kabinou)
const palette = new Array(256).fill({ r: 0, g: 0, b: 0, a: 0 });
function hex(s, a = 255) {
  const v = parseInt(s.slice(1), 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff, a };
}
palette[1] = hex("#3060c0");   // car-0 body modré
palette[2] = hex("#c03838");   // car-1 body červené
palette[3] = hex("#c8d8e8");   // okna (světle modrošedá)
palette[4] = hex("#202020");   // kola (skoro černá)
palette[5] = hex("#f0d860");   // světlomety (žlutá)
palette[6] = hex("#404040");   // chassis (tmavě šedá)

// === Builder helpery ===
// Vyplní vrstvu (z konstantní) obdélníkem voxelů (color index).
function rect(voxels, x0, y0, z, w, d, colorIndex) {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < d; dy++) {
      voxels.push({ x: x0 + dx, y: y0 + dy, z, colorIndex });
    }
  }
}
// Plný 3D blok od (x0,y0,z0) do (x0+w-1, y0+d-1, z0+h-1).
function box(voxels, x0, y0, z0, w, d, h, colorIndex) {
  for (let dz = 0; dz < h; dz++) rect(voxels, x0, y0, z0 + dz, w, d, colorIndex);
}

// === SEDAN (car-0) ===
// 7 dlouhý × 3 široký × 4 vysoký, sloty pro 4 kola, body, okna, roof.
function buildSedan(bodyColor) {
  const v = [];
  // Z=0: 4 kola (Y=0 a Y=2, X=1 a X=5)
  v.push({ x: 1, y: 0, z: 0, colorIndex: 4 });
  v.push({ x: 5, y: 0, z: 0, colorIndex: 4 });
  v.push({ x: 1, y: 2, z: 0, colorIndex: 4 });
  v.push({ x: 5, y: 2, z: 0, colorIndex: 4 });
  // Z=0 chassis mezi koly (Y=1 střed)
  for (const x of [1, 2, 3, 4, 5]) v.push({ x, y: 1, z: 0, colorIndex: 6 });
  // Z=1: tělo (7×3) — body color celá vrstva
  rect(v, 0, 0, 1, 7, 3, bodyColor);
  // Z=2: tělo s okny (5×3 zkráceno ze stran; okna na bočních stranách Y=0/2 X=2..4)
  rect(v, 1, 0, 2, 5, 3, bodyColor);
  // Boční okna: nahradíme body voxely v Y=0 a Y=2 sklem na X=2,3
  for (const x of [2, 3]) {
    v[v.findIndex(p => p.x === x && p.y === 0 && p.z === 2)].colorIndex = 3;
    v[v.findIndex(p => p.x === x && p.y === 2 && p.z === 2)].colorIndex = 3;
  }
  // Přední/zadní okno (čelní sklo): Y=1 na X=1 (přední) a X=5 (zadní)
  v[v.findIndex(p => p.x === 1 && p.y === 1 && p.z === 2)].colorIndex = 3;
  v[v.findIndex(p => p.x === 5 && p.y === 1 && p.z === 2)].colorIndex = 3;
  // Z=3: roof (3×3 ve středu)
  rect(v, 2, 0, 3, 3, 3, bodyColor);
  // Světlomety na předku (Z=1, X=0, Y=0 a Y=2)
  v[v.findIndex(p => p.x === 0 && p.y === 0 && p.z === 1)].colorIndex = 5;
  v[v.findIndex(p => p.x === 0 && p.y === 2 && p.z === 1)].colorIndex = 5;
  return v;
}

// === TRUCK / PICKUP (car-1) ===
// Stejné kola + chassis, ale zadní část je otevřený korbík (lower body, no roof back).
function buildTruck(bodyColor) {
  const v = [];
  // Kola
  v.push({ x: 1, y: 0, z: 0, colorIndex: 4 });
  v.push({ x: 5, y: 0, z: 0, colorIndex: 4 });
  v.push({ x: 1, y: 2, z: 0, colorIndex: 4 });
  v.push({ x: 5, y: 2, z: 0, colorIndex: 4 });
  for (const x of [1, 2, 3, 4, 5]) v.push({ x, y: 1, z: 0, colorIndex: 6 });
  // Z=1: tělo (7×3)
  rect(v, 0, 0, 1, 7, 3, bodyColor);
  // Z=2: jen kabina vpředu (X=0..2), korba vzadu má jen boční stěny (Y=0 a Y=2 X=3..6)
  rect(v, 0, 0, 2, 3, 3, bodyColor);            // kabina
  for (const x of [3, 4, 5, 6]) {
    v.push({ x, y: 0, z: 2, colorIndex: bodyColor });   // levá stěna korby
    v.push({ x, y: 2, z: 2, colorIndex: bodyColor });   // pravá stěna korby
  }
  // Zadní stěna korby (X=6, Y=1)
  v.push({ x: 6, y: 1, z: 2, colorIndex: bodyColor });
  // Boční okna kabiny (Y=0 a Y=2 na X=1)
  v[v.findIndex(p => p.x === 1 && p.y === 0 && p.z === 2)].colorIndex = 3;
  v[v.findIndex(p => p.x === 1 && p.y === 2 && p.z === 2)].colorIndex = 3;
  // Čelní sklo (X=0, Y=1)
  v[v.findIndex(p => p.x === 0 && p.y === 1 && p.z === 2)].colorIndex = 3;
  // Z=3: roof nad kabinou (3×3)
  rect(v, 0, 0, 3, 3, 3, bodyColor);
  // Světlomety
  v[v.findIndex(p => p.x === 0 && p.y === 0 && p.z === 1)].colorIndex = 5;
  v[v.findIndex(p => p.x === 0 && p.y === 2 && p.z === 1)].colorIndex = 5;
  return v;
}

// === Vox encoder ===
function encodeVox(voxels, palette) {
  const sizeContent = 12;
  const xyziContent = 4 + 4 * voxels.length;
  const rgbaContent = 256 * 4;
  const HDR = 12;
  const mainChildren = (HDR + sizeContent) + (HDR + xyziContent) + (HDR + rgbaContent);
  const buf = Buffer.alloc(8 + HDR + mainChildren);
  let off = 0;
  const w4 = (s) => { buf.write(s, off, 4, "ascii"); off += 4; };
  const w32 = (v) => { buf.writeUInt32LE(v, off); off += 4; };
  const w8 = (v) => { buf.writeUInt8(v, off); off += 1; };
  w4("VOX "); w32(150);
  w4("MAIN"); w32(0); w32(mainChildren);
  w4("SIZE"); w32(sizeContent); w32(0); w32(SIZE); w32(SIZE); w32(SIZE);
  w4("XYZI"); w32(xyziContent); w32(0); w32(voxels.length);
  for (const v of voxels) { w8(v.x); w8(v.y); w8(v.z); w8(v.colorIndex); }
  w4("RGBA"); w32(rgbaContent); w32(0);
  for (let i = 1; i < 256; i++) {
    const c = palette[i]; w8(c.r); w8(c.g); w8(c.b); w8(c.a);
  }
  w8(0); w8(0); w8(0); w8(0);
  return buf;
}

fs.mkdirSync(ASSETS, { recursive: true });
const sedan = buildSedan(1);          // body color = 1 = modré
const truck = buildTruck(2);          // body color = 2 = červené
fs.writeFileSync(path.resolve(ASSETS, "car-simple-0.vox"), encodeVox(sedan, palette));
fs.writeFileSync(path.resolve(ASSETS, "car-simple-1.vox"), encodeVox(truck, palette));
console.log(`car-simple-0.vox (sedan, ${sedan.length} voxelů) — modré`);
console.log(`car-simple-1.vox (truck, ${truck.length} voxelů) — červené`);
