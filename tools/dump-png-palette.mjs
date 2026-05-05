// tools/dump-png-palette.mjs
// Dump unikátních barev z PNG palety (256×1 nebo podobné). Použití:
// `node tools/dump-png-palette.mjs assets/tunel.png`
import fs from "node:fs";
import zlib from "node:zlib";

const file = process.argv[2];
if (!file) { console.error("Usage: node dump-png-palette.mjs <png-file>"); process.exit(1); }
const buf = fs.readFileSync(file);

let pos = 8;   // skip PNG signature
let width, height, idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos); pos += 4;
  const type = buf.toString("ascii", pos, pos + 4); pos += 4;
  const data = buf.subarray(pos, pos + len); pos += len + 4;  // +4 CRC
  if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); }
  else if (type === "IDAT") idatChunks.push(data);
  else if (type === "IEND") break;
}
const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
console.log(`PNG ${width}×${height}, inflated ${inflated.length} bytes`);

const colorSet = new Map();   // hex → first index
for (let row = 0; row < height; row++) {
  const rowOffset = row * (1 + width * 4);
  for (let i = 0; i < width; i++) {
    const o = rowOffset + 1 + i * 4;   // +1 = filter byte
    const r = inflated[o], g = inflated[o + 1], b = inflated[o + 2], a = inflated[o + 3];
    if (a === 0) continue;
    const hex = `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
    if (!colorSet.has(hex)) colorSet.set(hex, i);
  }
}
console.log(`${colorSet.size} unikátních barev:`);
for (const [hex, idx] of colorSet) console.log(`  idx ${idx.toString().padStart(3)}: ${hex}`);
