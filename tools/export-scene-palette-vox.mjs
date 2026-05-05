// tools/export-scene-palette-vox.mjs
// Vygeneruje `.vox` s předem nastavenou paletou TheCubes (12 barev: tráva ×4 +
// hlína ×4 + skála ×4) + 12 vizuálních swatch voxelů, ať user v MagicaVoxelu
// vidí, který index = která barva.
// Použití: `node tools/export-scene-palette-vox.mjs` → `assets/scene-palette.vox`
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../assets/scene-palette.vox");
const SIZE = 16;

// Naše paleta (z src/main.js):
const COLORS = [
  // Tráva (4)
  { hex: "#5d9446", label: "grass-base"   },
  { hex: "#4e823c", label: "grass-darker" },
  { hex: "#3e6a32", label: "grass-dark"   },
  { hex: "#6ea054", label: "grass-light"  },
  // Hlína (4)
  { hex: "#6b4a2a", label: "dirt-base"    },
  { hex: "#5a3a22", label: "dirt-darker"  },
  { hex: "#7a5630", label: "dirt-light"   },
  { hex: "#48301d", label: "dirt-dark"    },
  // Skála (4)
  { hex: "#8a8278", label: "stone-base"   },
  { hex: "#6f6860", label: "stone-darker" },
  { hex: "#a09890", label: "stone-light"  },
  { hex: "#5a5450", label: "stone-dark"   },
];

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff, a: 255 };
}

// Paleta: indexy 1..12 = naše barvy. Zbytek (13..255) prázdný (transparent).
const palette = new Array(256).fill({ r: 0, g: 0, b: 0, a: 0 });
COLORS.forEach((c, i) => { palette[i + 1] = { ...hexToRgb(c.hex) }; });

// Voxely: 12 swatch v 4×3 mřížce ve spodním rohu (X 0..3, Y 0..2, Z 0).
// Index swatchu odpovídá indexu palety (1..12).
// MagicaVoxel je Z-up — Y axis je „do hloubky", Z je „nahoru".
const voxels = [];
for (let i = 0; i < COLORS.length; i++) {
  const col = i % 4;
  const row = Math.floor(i / 4);
  // Postavíme 2×2×2 swatch krychličku, ať je dobře vidět
  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dz = 0; dz < 2; dz++) {
        voxels.push({
          x: col * 3 + dx,         // 0..1, 3..4, 6..7, 9..10
          y: row * 3 + dy,         // 0..1, 3..4, 6..7
          z: dz,                   // 0..1
          colorIndex: i + 1,
        });
      }
    }
  }
}

// === Vox encoder (kopie z export-grass-vox.mjs) ===
function encodeVox(voxels, palette) {
  const sizeContent = 12;
  const xyziContent = 4 + 4 * voxels.length;
  const rgbaContent = 256 * 4;
  const CHUNK_HEADER = 12;
  const mainChildren = (CHUNK_HEADER + sizeContent)
                     + (CHUNK_HEADER + xyziContent)
                     + (CHUNK_HEADER + rgbaContent);
  const total = 8 + CHUNK_HEADER + mainChildren;
  const buf = Buffer.alloc(total);
  let offset = 0;
  const writeStr4 = (s) => { buf.write(s, offset, 4, "ascii"); offset += 4; };
  const writeU32 = (v) => { buf.writeUInt32LE(v, offset); offset += 4; };
  const writeU8  = (v) => { buf.writeUInt8(v, offset);  offset += 1; };

  writeStr4("VOX "); writeU32(150);
  writeStr4("MAIN"); writeU32(0); writeU32(mainChildren);
  writeStr4("SIZE"); writeU32(sizeContent); writeU32(0);
  writeU32(SIZE); writeU32(SIZE); writeU32(SIZE);
  writeStr4("XYZI"); writeU32(xyziContent); writeU32(0); writeU32(voxels.length);
  for (const v of voxels) { writeU8(v.x); writeU8(v.y); writeU8(v.z); writeU8(v.colorIndex); }
  writeStr4("RGBA"); writeU32(rgbaContent); writeU32(0);
  // Posun o 1 — v MagicaVoxelu je file index 1 = palette UI index 1.
  for (let i = 1; i < 256; i++) {
    const c = palette[i]; writeU8(c.r); writeU8(c.g); writeU8(c.b); writeU8(c.a);
  }
  writeU8(0); writeU8(0); writeU8(0); writeU8(0);
  return buf;
}

const buf = encodeVox(voxels, palette);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, buf);
console.log(`Wrote ${OUTPUT} (${buf.length} bytes, ${voxels.length} voxelů, ${COLORS.length} swatchů)`);
console.log("Paleta:");
COLORS.forEach((c, i) => console.log(`  index ${i + 1}: ${c.hex}  (${c.label})`));
