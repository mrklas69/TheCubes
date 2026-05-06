// tools/export-grass-vox.mjs
// Vygeneruje 16×16×16 grass cube ve formátu MagicaVoxel `.vox` (binární),
// kde *povrchové* voxely odpovídají texturám TheCubes grass bloku:
//   TOP    (z=15)            → :grass-top    (16×16, base + 2-4 záplaty)
//   BOTTOM (z=0)             → :dirt         (16×16, base + 2-4 záplaty)
//   SIDES  (x|y na hraně)    → :grass-side   (14 px dirt dole + 2 px grass strip nahoře)
//   INNER  (1..14 v každé ose) → dirt s rozptylem 90/10
//
// Pixel-art textury z `src/main.js` (`makePatchTexture`, `makeGrassSideTexture`)
// jsou tady portovány do Node.js — canvas API není v Node dostupné, takže
// místo `ctx.fillRect` zapisujeme přímo do 2D Uint8Array (každá buňka = paleta
// index). Náhodný vzor není identický s běžícím prohlížečem, ale podobný (A2).
//
// Mapování textury → voxely:
//   - canvas U (X) → world X (top/bottom) nebo world X/Y (side podle stěny)
//   - canvas V (Y, 0 nahoře) → world Z (15 nahoře) na bocích, world Y dole
//
// Použití: `node tools/export-grass-vox.mjs` → přepíše `assets/grass-cube.vox`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../assets/cube-grass.vox");

// === Paleta — 8 barev (4 grass + 4 dirt), zarovnaná s TheCubes (src/main.js) ===
// Indexy 1..8 v naší paletě. MagicaVoxel paleta má 256 slotů (1024 bytes RGBA),
// zbytek empty.
const PAL = {
  EMPTY:         0,
  GRASS_BASE:    1,
  GRASS_DARKER:  2,
  GRASS_DARKEST: 3,
  GRASS_LIGHTER: 4,
  DIRT_BASE:     5,
  DIRT_DARKER:   6,
  DIRT_LIGHTER:  7,
  DIRT_DARKEST:  8,
};

// RGBA paleta v poli o 256 položkách (index 0 = empty).
const palette = new Array(256).fill({ r: 0, g: 0, b: 0, a: 0 });
palette[PAL.GRASS_BASE]    = { r: 0x5d, g: 0x94, b: 0x46, a: 255 };
palette[PAL.GRASS_DARKER]  = { r: 0x4e, g: 0x82, b: 0x3c, a: 255 };
palette[PAL.GRASS_DARKEST] = { r: 0x3e, g: 0x6a, b: 0x32, a: 255 };
palette[PAL.GRASS_LIGHTER] = { r: 0x6e, g: 0xa0, b: 0x54, a: 255 };
palette[PAL.DIRT_BASE]     = { r: 0x6b, g: 0x4a, b: 0x2a, a: 255 };
palette[PAL.DIRT_DARKER]   = { r: 0x5a, g: 0x3a, b: 0x22, a: 255 };
palette[PAL.DIRT_LIGHTER]  = { r: 0x7a, g: 0x56, b: 0x30, a: 255 };
palette[PAL.DIRT_DARKEST]  = { r: 0x48, g: 0x30, b: 0x1d, a: 255 };

// === Texturové generátory (port z src/main.js) ===
// Místo canvas API zapisujeme do 2D pole Uint8Array (16×16, každá buňka =
// paleta index). Záplaty jsou 1-2 px obdélníky v kontrastních odstínech.

const TEX = 16;
const GRASS_STRIP_PX = 2;        // vrchní 2 řádky grass-side textury
const PATCH_MIN = 1;
const PATCH_MAX = 2;

const GRASS_ACCENTS = [PAL.GRASS_DARKER, PAL.GRASS_DARKEST, PAL.GRASS_LIGHTER];
const DIRT_ACCENTS  = [PAL.DIRT_DARKER, PAL.DIRT_LIGHTER, PAL.DIRT_DARKEST];

// Vytvoří prázdné 16×16 pole vyplněné `baseIdx`. Indexace `tex[y][x]` (y = řádek).
function blankTexture(baseIdx) {
  const tex = [];
  for (let y = 0; y < TEX; y++) {
    const row = new Uint8Array(TEX);
    row.fill(baseIdx);
    tex.push(row);
  }
  return tex;
}

// Náhodné obdélníkové záplaty 1-2 px v zadaném vertikálním pásu (yMin..yMax-1).
// Záplata může přesáhnout pravý/dolní okraj — to je OK, KISS clipping.
function drawPatches(tex, accentIndices, count, yMin, yMax) {
  const yRange = yMax - yMin;
  for (let i = 0; i < count; i++) {
    const w = PATCH_MIN + Math.floor(Math.random() * (PATCH_MAX - PATCH_MIN + 1));
    const h = PATCH_MIN + Math.floor(Math.random() * (PATCH_MAX - PATCH_MIN + 1));
    const sx = Math.floor(Math.random() * TEX);
    const sy = yMin + Math.floor(Math.random() * yRange);
    const colorIdx = accentIndices[Math.floor(Math.random() * accentIndices.length)];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const x = sx + dx, y = sy + dy;
        if (x < TEX && y < TEX && y >= yMin && y < yMax) tex[y][x] = colorIdx;
      }
    }
  }
}

function makeGrassTopTexture() {
  const tex = blankTexture(PAL.GRASS_BASE);
  drawPatches(tex, GRASS_ACCENTS, 2 + Math.floor(Math.random() * 3), 0, TEX);
  return tex;
}

function makeDirtTexture() {
  const tex = blankTexture(PAL.DIRT_BASE);
  drawPatches(tex, DIRT_ACCENTS, 2 + Math.floor(Math.random() * 3), 0, TEX);
  return tex;
}

// Boční stěna grass bloku: spodních 14 px dirt + vrchních 2 px grass.
// Záplaty každé vrstvy jen v jejím pásu.
function makeGrassSideTexture() {
  const tex = blankTexture(PAL.DIRT_BASE);
  // Spodní vrstva (canvas y=2..15) už je dirt z blankTexture, jen záplaty.
  drawPatches(tex, DIRT_ACCENTS, 2 + Math.floor(Math.random() * 3), GRASS_STRIP_PX, TEX);
  // Vrchní 2 řádky = grass strip
  for (let y = 0; y < GRASS_STRIP_PX; y++) {
    for (let x = 0; x < TEX; x++) tex[y][x] = PAL.GRASS_BASE;
  }
  // V tenkém pásu jen 0–1 záplata, ať nezakryje base.
  if (Math.random() < 0.6) {
    drawPatches(tex, GRASS_ACCENTS, 1, 0, GRASS_STRIP_PX);
  }
  return tex;
}

// === Generování voxelů 16³ ===
// Pro každý voxel rozhodneme, zda je *povrchový* (z které strany) nebo vnitřní.
// Priorita pro hrany/rohy: TOP > BOTTOM > SIDE (viz `colorIndexAt`).
// MagicaVoxel je Z-up, takže z=15 je vrchol kostky.

const SIZE = 16;

const grassTop  = makeGrassTopTexture();
const dirtFloor = makeDirtTexture();
// Pro každou ze 4 bočních stěn vlastní instance grass-side, aby měly trochu
// odlišný vzor záplat (jako per-cube fresh v TheCubes).
const sideNorth = makeGrassSideTexture(); // y = 15
const sideSouth = makeGrassSideTexture(); // y = 0
const sideEast  = makeGrassSideTexture(); // x = 15
const sideWest  = makeGrassSideTexture(); // x = 0

// Vnitřní voxely — dirt s 90/10 rozptylem (zachováno z předchozí verze).
function innerDirtIndex() {
  const r = Math.random();
  return r < 0.05 ? PAL.DIRT_DARKER
       : r < 0.08 ? PAL.DIRT_LIGHTER
       : r < 0.10 ? PAL.DIRT_DARKEST
       : PAL.DIRT_BASE;
}

// Mapování (x, y, z) → paletový index. Canvas V (řádek) na bocích jde shora dolů,
// world Z naopak — takže `canvasV = 15 - z`.
function colorIndexAt(x, y, z) {
  if (z === SIZE - 1) {
    // TOP face: canvas (u, v) = (x, y) — top textura plochá v rovině XY.
    return grassTop[y][x];
  }
  if (z === 0) {
    // BOTTOM face: stejně jako TOP, canvas (u, v) = (x, y).
    return dirtFloor[y][x];
  }
  // Boční stěny — hierarchie pro hrany: priorita konkrétní stěna podle toho,
  // která souřadnice je na okraji. Pokud obě (rohové sloupce x=0/15 a y=0/15),
  // vybereme north/south (y) přednostně — vizuální rozdíl je minimální.
  const canvasV = SIZE - 1 - z;
  if (y === SIZE - 1) return sideNorth[canvasV][x];
  if (y === 0)         return sideSouth[canvasV][x];
  if (x === SIZE - 1) return sideEast[canvasV][y];
  if (x === 0)         return sideWest[canvasV][y];
  // Vnitřek
  return innerDirtIndex();
}

const voxels = [];
for (let x = 0; x < SIZE; x++) {
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      voxels.push({ x, y, z, colorIndex: colorIndexAt(x, y, z) });
    }
  }
}

// === Vox binární encoder (beze změny — jen binární writer) ===
function encodeVox(voxels, palette) {
  const sizeContent = 12;                       // 3× uint32 dimensions
  const xyziContent = 4 + 4 * voxels.length;    // count + 4 bytes per voxel
  const rgbaContent = 256 * 4;                  // 256 colors × RGBA
  const CHUNK_HEADER = 12;                      // 4-byte id + 2× uint32

  const mainChildren = (CHUNK_HEADER + sizeContent)
                     + (CHUNK_HEADER + xyziContent)
                     + (CHUNK_HEADER + rgbaContent);
  const total = 8                                // "VOX " + version
              + CHUNK_HEADER                     // MAIN header
              + mainChildren;                    // MAIN children

  const buf = Buffer.alloc(total);
  let offset = 0;

  function writeStr4(s) { buf.write(s, offset, 4, "ascii"); offset += 4; }
  function writeU32(v)  { buf.writeUInt32LE(v, offset); offset += 4; }
  function writeU8(v)   { buf.writeUInt8(v, offset); offset += 1; }

  // Hlavička
  writeStr4("VOX ");
  writeU32(150);

  // MAIN chunk
  writeStr4("MAIN");
  writeU32(0);
  writeU32(mainChildren);

  // SIZE chunk (rozměry)
  writeStr4("SIZE");
  writeU32(sizeContent);
  writeU32(0);
  writeU32(SIZE);
  writeU32(SIZE);
  writeU32(SIZE);

  // XYZI chunk (seznam voxelů)
  writeStr4("XYZI");
  writeU32(xyziContent);
  writeU32(0);
  writeU32(voxels.length);
  for (const v of voxels) {
    writeU8(v.x);
    writeU8(v.y);
    writeU8(v.z);
    writeU8(v.colorIndex);
  }

  // RGBA chunk (paleta) — MagicaVoxel paleta je posunutá o 1 (index 1
  // v souboru = index 0 v MagicaVoxelu UI). Píšeme indexy 1..255 + jeden empty
  // padding na konci, celkem 256 RGBA tuplů.
  writeStr4("RGBA");
  writeU32(rgbaContent);
  writeU32(0);
  for (let i = 1; i < 256; i++) {
    const c = palette[i];
    writeU8(c.r); writeU8(c.g); writeU8(c.b); writeU8(c.a);
  }
  writeU8(0); writeU8(0); writeU8(0); writeU8(0);

  return buf;
}

const buf = encodeVox(voxels, palette);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, buf);
console.log(`Wrote ${OUTPUT} (${buf.length} bytes, ${voxels.length} voxelů, paleta 8 barev)`);
