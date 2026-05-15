// src/resources.js
// RESOURCE_REGISTRY + voxel sub-grid konstanty + shuffled expand helper.
// Sez. 51, v1.1-voxel-mvp arc (DD-56 + DD-57 sez. 51 patch).
//
// Model-layer file = žádná Three.js dependency (paralel `terrain.js` / `model.js`).
// Per DD-11: vizualizační dispatch (barva → MeshStandardMaterial, sub-grid pozice
// → InstancedMesh.setMatrixAt) žije v `main.js` (engine).

// mulberry32 seeded RNG — DRY single source z terrain.js. Žádné cyclic risk
// (terrain.js neimportuje resources.js). Až vznikne `src/random.js` shared
// util, oba (terrain.js + resources.js) re-import z tam.
import { mulberry32 } from "./terrain.js";

/**
 * RESOURCE_REGISTRY = pojmenovaná tabulka surovin (DD-56 klíčový koncept 2 +
 * DD-57 sez. 51 patch: pátá surovina `dirt`).
 *
 * 5 typů, pořadí dle user-spec (sez. 51 follow-up): voda → písek → hlína →
 * kámen → dřevo. Insertion order Object.keys určí UI display sekvenci.
 *
 * Per-type metadata:
 *  - `color`   — JS number 0xRRGGBB pro voxel material.
 *  - `state`   — `"solid" | "granular" | "liquid"`. Future polish hook
 *                (density gravity / pile shape — DD-56 out of scope, IDEAS).
 *  - `density` — relativní hustota (water = 1.0 baseline). Stejný IDEAS hook.
 *
 * **Barvy sjednocené s terénem/decor paletou (sez. 51 patch #3 — calibration):**
 * Voxely kopírují canonical hex z prod paletních zdrojů (BLOCK_COLORS top face
 * + water plane mat + BARK_BROWN decor) — bez sjednocení by žlutá písku v cube
 * mismatchovala žlutou v rubik voxelu (user feedback sez. 51).
 *
 *  - water = 0x3a7090 (zdroj: `_waterMat.color` v main.js ř. 1091)
 *  - sand  = 0xe8d97a (zdroj: `BLOCK_COLORS.sand.TOP` v main.js ř. 937)
 *  - dirt  = 0x8a5e36 (zdroj: `BLOCK_COLORS.dirt.TOP` v main.js ř. 936)
 *  - stone = 0x9a9a9a (zdroj: `BLOCK_COLORS.stone.TOP` v main.js ř. 937)
 *  - wood  = 0x5a3e22 (zdroj: `BARK_BROWN` v composites/toolkit.js ř. 41)
 *
 * **Single source of truth caveat:** inline hex duplikace zdrojů (DRY drift
 * risk). Extract do `src/palette.js` shared (= pure data bez THREE.js) je
 * sub-prah refactor mimo voxel arc scope. Při změně canonical paletních hex
 * v main.js/toolkit.js synchronizovat zde manuálně.
 */
export const RESOURCE_REGISTRY = {
  water: { color: 0x3a7090, state: "liquid",   density: 1.0 },
  sand:  { color: 0xe8d97a, state: "granular", density: 1.5 },
  dirt:  { color: 0x8a5e36, state: "solid",    density: 1.7 },
  stone: { color: 0x9a9a9a, state: "solid",    density: 2.5 },
  wood:  { color: 0x5a3e22, state: "solid",    density: 0.6 },
};

// Iterable pole jmen surovin (= insertion order RESOURCE_REGISTRY klíčů).
// Konzument: `main.js` per-resource batch setup, `RESOURCE_NAMES.includes(x)` validace.
export const RESOURCE_NAMES = Object.keys(RESOURCE_REGISTRY);

/**
 * V = voxel grid edge per cube edge. `V = 4` = sub-cube má 1/4 hrany cubu
 * (= 0.25 jednotky), V³ = 64 voxelů per cube (DD-56 klíčový koncept 1 + 5).
 *
 * Hard-coded const ne UI slider — celá geometrie + render pipeline + sub-grid
 * dispatch předpokládá konkrétní hodnotu (V²=16 voxelů per layer = max 16
 * unikátních resource přesné rozložení Y vrstvy). User signal pro změnu V
 * = velký refactor (V=8 → 512 voxels/cube = 4× memory + per-cell maintenance).
 */
export const VOXEL_GRID = 4;

// V³ = max počet voxelů per cell. Konstanta pro guard `addVoxel` overflow check.
export const VOXEL_PER_CELL = VOXEL_GRID * VOXEL_GRID * VOXEL_GRID;  // 64

/**
 * Edge délka jednoho voxelu v world jednotkách. `BoxGeometry(VOXEL_EDGE)` v main.js.
 * = 1 / V = 0.25 pro V=4.
 */
export const VOXEL_EDGE = 1 / VOXEL_GRID;

/**
 * expandVoxelLayers — rozloží `Map<resource, count>` na pole voxelových pozic
 * s **render-side seeded shuffle** (DD-57 sez. 51 patch).
 *
 * Vrací plain data array `[{ resource, sx, sy, sz }, ...]`, kde:
 *  - `sx, sy, sz ∈ [0, V)` jsou indexy v sub-gridu cubu.
 *  - Resource-to-position mapping je **náhodná permutace** (seeded Fisher-Yates),
 *    deterministická per `seed` (= reload scény dá stejný shuffle pattern).
 *
 * **DD-57 (sez. 51 patch) — drop DD-56 koncept 4 autosort render-side:**
 *  Předchozí semantika (= layer-by-layer vrstvy) odmítnuta user feedback
 *  („rubik je ze čtyř jednobarevných vrstev"). Nový default = **render shuffle**.
 *  Insertion order Map zůstává zachován **data-side** — LIFO mechanika
 *  (DD-56 koncept 9, sez. 53 vzducholoď pick) bere `[...voxels.keys()].at(-1)`
 *  = poslední insertion key, takže LIFO data-side správný i pro shuffled render.
 *  Vizuální „inverted rainbow emergent" (DD-56 acceptance bod 5) se mění — po
 *  LIFO odebrání 16 voxelů last-inserted typu se cube vizuálně **proředí**,
 *  ne odhalí vrstva. Acceptance bod 5 sez. 53 přepíšeme.
 *
 * **Shuffle algoritmus:** Fisher-Yates seeded RNG (mulberry32 z terrain.js):
 *   1. Postav lineární pole `resources[i]` per slot dle insertion order Map.
 *   2. Postav lineární pole `positions[i]` v deterministic raster order
 *      (slot=sy*V²+sz*V+sx — sy major, sz mid, sx minor).
 *   3. Fisher-Yates shuffle `positions[]` přes `mulberry32(seed)`.
 *   4. Mapuj `resource[i] → position[i]` (= shuffled assignment).
 *
 * Stop condition: `resources.length >= VOXEL_PER_CELL` (overflow ořez,
 * `addVoxel` je primární guard).
 *
 * @param {Map<string, number> | null} voxels — VOXELS atribut z CUBES instance.
 * @param {number} seed — seed pro Fisher-Yates RNG. Default 1 (nenulová sentinel).
 * @returns {Array<{resource: string, sx: number, sy: number, sz: number}>}
 */
export function expandVoxelLayers(voxels, seed = 1) {
  if (!voxels) return [];
  const V = VOXEL_GRID;
  const slotsPerLayer = V * V;  // 16 pro V=4
  // 1) Lineární pole resource-per-slot (insertion order Map).
  const resources = [];
  for (const [resource, count] of voxels) {
    for (let i = 0; i < count; i++) {
      if (resources.length >= VOXEL_PER_CELL) break;
      resources.push(resource);
    }
    if (resources.length >= VOXEL_PER_CELL) break;
  }
  const n = resources.length;
  // 2) Lineární pole sub-grid pozic v raster order.
  const positions = new Array(n);
  for (let slot = 0; slot < n; slot++) {
    const sy = Math.floor(slot / slotsPerLayer);
    const within = slot % slotsPerLayer;
    const sx = within % V;
    const sz = Math.floor(within / V);
    positions[slot] = { sx, sy, sz };
  }
  // 3) Fisher-Yates shuffle positions (seeded RNG, deterministic per seed).
  //    Iteration backward: pro každé i ∈ [n-1..1] vyber random j ∈ [0..i]
  //    a swap positions[i] ↔ positions[j]. Klasický unbiased shuffle.
  const rng = mulberry32(seed || 1);  // seed=0 fallback na 1 (mulberry32 by se zachovala)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = positions[i];
    positions[i] = positions[j];
    positions[j] = tmp;
  }
  // 4) Map resource[i] → position[i] (= shuffled assignment).
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { resource: resources[i], sx: positions[i].sx, sy: positions[i].sy, sz: positions[i].sz };
  }
  return out;
}

/**
 * voxelTotal — součet všech voxelových counts v Map. Pure helper pro guard.
 * Sez. 51 konzument: CUBES.addVoxel overflow check (`if (voxelTotal + count > 64)`).
 */
export function voxelTotal(voxels) {
  if (!voxels) return 0;
  let t = 0;
  for (const c of voxels.values()) t += c;
  return t;
}
