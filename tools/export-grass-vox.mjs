// tools/export-grass-vox.mjs
// Vygeneruje 16×16×16 grass cube ve formátu MagicaVoxel `.vox` (binární).
// Používá se jednorázově: `node tools/export-grass-vox.mjs > nic` → výstup
// `assets/grass-cube.vox`. User pak otevře v MagicaVoxelu jako šablonu pro
// vlastní varianty (přidá květiny, kameny, dekorace…).
//
// Vox formát: little-endian binární. Hlavička "VOX " + verze, pak chunked
// stromová struktura. Každý chunk: 4-byte ID + uint32 content size +
// uint32 children size + content + children.
// MagicaVoxel souř: Z-up (z=15 = vrch). Paleta indexy 1..255 (0 = empty).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../assets/grass-cube.vox");

// === Paleta ===
// MagicaVoxel paleta = 256 barev RGBA (1024 bytes). Index 0 = "empty" (vždy
// transparentní). Indexy 1..255 mapujeme na náš grass + dirt set.
// Z TheCubes (src/main.js):
//   GRASS_BASE = "#5d9446", DIRT_BASE = "#6b4a2a"
//   + accent shades (4 grass, 4 dirt) — celkem ~10 barev, zbytek prázdný.
const palette = new Array(256).fill({ r: 0, g: 0, b: 0, a: 0 });
palette[0] = { r: 0,   g: 0,   b: 0,   a: 0   };       // empty (default)
// Grass barvy (indexy 1-4)
palette[1] = { r: 0x5d, g: 0x94, b: 0x46, a: 255 };   // grass base
palette[2] = { r: 0x4e, g: 0x82, b: 0x3c, a: 255 };   // grass darker
palette[3] = { r: 0x3e, g: 0x6a, b: 0x32, a: 255 };   // grass darkest
palette[4] = { r: 0x6e, g: 0xa0, b: 0x54, a: 255 };   // grass lighter
// Dirt barvy (indexy 5-8)
palette[5] = { r: 0x6b, g: 0x4a, b: 0x2a, a: 255 };   // dirt base
palette[6] = { r: 0x5a, g: 0x3a, b: 0x22, a: 255 };   // dirt darker
palette[7] = { r: 0x7a, g: 0x56, b: 0x30, a: 255 };   // dirt lighter
palette[8] = { r: 0x48, g: 0x30, b: 0x1d, a: 255 };   // dirt darkest

// === Voxely ===
// Solid 16×16×16 (4096 voxelů). Z-up:
//   z = 14, 15: grass (top 2 vrstvy = grass overhang, sedí izomorfně s
//                       :grass-side texturou v TheCubes 2px stripem)
//   z = 0..13: dirt (spodek bloku)
// Náhodný odstín z accent palety (5% pravděpodobnost) → drobná variace.
// Deterministický seed (volání Math.random nahrazené stabilní funkcí by se
// hodilo pro reproducibilní výstup, ale nejsme tak striktní — KISS).
const SIZE = 16;
const GRASS_TOP_LAYERS = 2;
const voxels = [];
for (let x = 0; x < SIZE; x++) {
  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      let colorIndex;
      if (z >= SIZE - GRASS_TOP_LAYERS) {
        // Grass: 90% base, 10% darker/lighter
        const r = Math.random();
        colorIndex = r < 0.05 ? 2 : r < 0.08 ? 3 : r < 0.10 ? 4 : 1;
      } else {
        // Dirt: 90% base, 10% accents
        const r = Math.random();
        colorIndex = r < 0.05 ? 6 : r < 0.08 ? 7 : r < 0.10 ? 8 : 5;
      }
      voxels.push({ x, y, z, colorIndex });
    }
  }
}

// === Vox binární encoder ===
function encodeVox(voxels, palette) {
  // Velikosti chunků (size bez headeru):
  const sizeContent = 12;                       // 3× uint32 dimensions
  const xyziContent = 4 + 4 * voxels.length;    // count + 4 bytes per voxel
  const rgbaContent = 256 * 4;                  // 256 colors × RGBA
  const CHUNK_HEADER = 12;                      // 4-byte id + 2× uint32

  const mainChildren = (CHUNK_HEADER + sizeContent)
                     + (CHUNK_HEADER + xyziContent)
                     + (CHUNK_HEADER + rgbaContent);
  const total = 8                                // "VOX " + version
              + CHUNK_HEADER                     // MAIN header
              + 0                                // MAIN content (none)
              + mainChildren;                    // MAIN children

  const buf = Buffer.alloc(total);
  let offset = 0;

  function writeStr4(s) {
    buf.write(s, offset, 4, "ascii");
    offset += 4;
  }
  function writeU32(v) {
    buf.writeUInt32LE(v, offset);
    offset += 4;
  }
  function writeU8(v) {
    buf.writeUInt8(v, offset);
    offset += 1;
  }

  // Hlavička souboru
  writeStr4("VOX ");
  writeU32(150);                  // verze formátu

  // MAIN chunk
  writeStr4("MAIN");
  writeU32(0);                    // content size
  writeU32(mainChildren);

  // SIZE chunk (rozměry modelu)
  writeStr4("SIZE");
  writeU32(sizeContent);
  writeU32(0);
  writeU32(SIZE);                 // X
  writeU32(SIZE);                 // Y
  writeU32(SIZE);                 // Z

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

  // RGBA chunk (paleta) — POZOR: MagicaVoxel paleta je posunutá o 1 (index 1
  // v souboru = index 0 v MagicaVoxelu). Píšeme indexy 0..255 z naší palety,
  // ale první barva (index 0) bude v MagicaVoxelu nepoužitelná (background).
  writeStr4("RGBA");
  writeU32(rgbaContent);
  writeU32(0);
  // Píšeme od indexu 1 (přeskočíme empty na 0), pak doplníme jednu prázdnou
  // na konec aby celkem 256 položek.
  for (let i = 1; i < 256; i++) {
    const c = palette[i];
    writeU8(c.r);
    writeU8(c.g);
    writeU8(c.b);
    writeU8(c.a);
  }
  // Poslední (index 255) — extra padding empty
  writeU8(0); writeU8(0); writeU8(0); writeU8(0);

  return buf;
}

const buf = encodeVox(voxels, palette);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, buf);
console.log(`Wrote ${OUTPUT} (${buf.length} bytes, ${voxels.length} voxelů, paleta ${palette.length} barev)`);
