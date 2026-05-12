// src/terrain.js
// Procedurální generátor krajiny (DD-32, sez. 24).
//
// Veřejné API: `generateTerrain({ size, relief, surfaces, seed })`.
// Vrací `{ blocks, water }` — `blocks` jsou tuply `[kind, x, y, z]`
// kompatibilní s historickým `SCENE_LAYOUT` formátem (sez. 14 export);
// `water` jsou axis-aligned plane(y) nad depression cells.
//
// Engine:
//  1. Value noise (mulberry32 seeded grid sampling + bilineární smoothstep).
//  2. Heightmap dle `relief` 0..10 přes lookup tabulky amplitude × frequency.
//  3. Biome map z druhého (low-freq) noise → seřazení cell přes `biome_value`
//     a rozsek dle `surfaces` procent (exact match napříč ploškou).
//  4. Y modifier per biome (sand −1, water −2, grass/stone netknuté).
//  5. Sloupcové vyplnění: top voxel dle biome, dirt vrstvy, stone na dně.
//  6. Vodní plane(y) — MVP 1×1 per depression cell.

// Mulberry32 — deterministický pseudo-random 32-bit generátor. Stejný idiom
// jako historická `populateNorthernScene` (sez. 17) — DRY napříč projektem,
// žádné externí deps.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Value noise — vrací funkci `(x, z) → [0, 1]` plynulou v world prostoru.
// Vygeneruje hodnoty na celočíselných uzlech `gx × gz` gridu (s wrap-around),
// pak bilineárně interpoluje mezi 4 sousedy s **smoothstep** křivkou pro plynulé
// přechody (na rozdíl od lineární interpolace dává C¹ spojitost).
//
// `freq` = jak hustá je noise — vysoká freq → drobné vlnky pod 1 jednotku,
// nízká freq → velké tvary přes celou plochu.
function makeValueNoise(sizeX, sizeZ, freq, seed) {
  // Grid pokrytí: ceil(size × freq) + 2 okrajové uzly. Min 2 (aby šla interp).
  const gx = Math.max(2, Math.ceil(sizeX * freq) + 2);
  const gz = Math.max(2, Math.ceil(sizeZ * freq) + 2);
  const rng = mulberry32(seed);
  const grid = new Float32Array(gx * gz);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  return function (x, z) {
    const nx = x * freq;
    const nz = z * freq;
    const ix = Math.floor(nx);
    const iz = Math.floor(nz);
    const fx = nx - ix;
    const fz = nz - iz;
    // Wrap-around modulo gx/gz (i pro záporné x/z díky `((m % g) + g) % g`).
    const ix0 = ((ix % gx) + gx) % gx;
    const iz0 = ((iz % gz) + gz) % gz;
    const ix1 = (ix0 + 1) % gx;
    const iz1 = (iz0 + 1) % gz;
    const v00 = grid[iz0 * gx + ix0];
    const v10 = grid[iz0 * gx + ix1];
    const v01 = grid[iz1 * gx + ix0];
    const v11 = grid[iz1 * gx + ix1];
    // Smoothstep: 3x² − 2x³ — hladší než lineární, levnější než cosinus.
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sz;
  };
}

// Relief 0..10 → (amplitude max Y voxel, heightmap frequency).
// 0–2: nízká členitost (roviny, mírné vlny). 3–5: pahorkatiny (rolling/hilly/
// broken). 6–8: vrchoviny (rugged/craggy/mountainous). 9–10: velehory
// (heavily dissected / alpine) — value-noise engine to nezvládne plně (chybí
// valley carving), takže graceful degradation na úroveň 8 + konzolový warn.
const RELIEF_AMPLITUDE = [0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 6];
const RELIEF_FREQUENCY = [0.00, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45, 0.55, 0.65, 0.65, 0.65];

// Surface biome → Y offset (oproti heightmap value h).
// `grass` / `stone` — na povrchu (h beze změny).
// `sand` — pláž / údolí, o 1 voxel níž.
// `water` — depression, o 2 voxely níž; přidá water plane nad surface.
const SURFACE_Y_OFFSET = {
  grass: 0,
  stone: 0,
  sand: -1,
  water: -2,
};

export function generateTerrain({ size, relief, surfaces, seed = 42 }) {
  // === Validace ===
  if (!Array.isArray(size) || size.length !== 2) {
    throw new Error("generateTerrain: size musí být [sx, sz]");
  }
  const [sx, sz] = size;
  if (!Number.isInteger(sx) || !Number.isInteger(sz) || sx <= 0 || sz <= 0) {
    throw new Error(`generateTerrain: size musí být kladné celé čísla, máš [${sx}, ${sz}]`);
  }
  if (typeof relief !== "number" || relief < 0 || relief > 10) {
    throw new Error(`generateTerrain: relief musí být 0..10, máš ${relief}`);
  }
  if (typeof surfaces !== "object" || surfaces === null) {
    throw new Error("generateTerrain: surfaces musí být objekt { kind: pct, ... }");
  }
  const surfaceSum = Object.values(surfaces).reduce((a, b) => a + b, 0);
  if (Math.abs(surfaceSum - 1.0) > 0.001) {
    throw new Error(`generateTerrain: surfaces součet je ${surfaceSum.toFixed(3)}, musí být 1.0`);
  }
  for (const kind of Object.keys(surfaces)) {
    if (!(kind in SURFACE_Y_OFFSET)) {
      throw new Error(`generateTerrain: neznámý surface "${kind}", podporuju: ${Object.keys(SURFACE_Y_OFFSET).join(", ")}`);
    }
  }

  // === Graceful degradation pro relief 9..10 ===
  // Value-noise nezvládne valley carving (heavily dissected) ani ridge noise
  // (alpine). MVP fallback: clamp na 8 + warn. Roadmap = vlastní algoritmus.
  const reliefClamped = Math.min(relief, 8);
  if (relief > 8) {
    console.warn(
      `generateTerrain: relief ${relief} renderován jako 8 ` +
      `(valley carving / ridge noise = roadmap fáze 3, viz DD-32)`,
    );
  }

  const reliefIdx = Math.floor(reliefClamped);
  const amplitude = RELIEF_AMPLITUDE[reliefIdx];
  const frequency = RELIEF_FREQUENCY[reliefIdx];

  // === Krok 1: heightmap + biome noise ===
  // Heightmap noise seed +0, biome noise seed +1 — nezávislé samply.
  // Biome má polovinu frequency = větší klastry biomů (regionální podání).
  const heightNoise = makeValueNoise(sx, sz, frequency, seed);
  const biomeNoise  = makeValueNoise(sx, sz, frequency * 0.5 + 0.1, seed + 1);

  // Centrovaný grid: x ∈ [-floor(sx/2), -floor(sx/2)+sx-1]. Stejná konvence
  // jako historický SCENE_LAYOUT (sez. 14: 10×10 → x ∈ [-5, 4]).
  const x0 = -Math.floor(sx / 2);
  const z0 = -Math.floor(sz / 2);

  const cells = [];
  for (let dz = 0; dz < sz; dz++) {
    for (let dx = 0; dx < sx; dx++) {
      const x = x0 + dx;
      const z = z0 + dz;
      const h = Math.round(heightNoise(x, z) * amplitude);
      cells.push({ x, z, h, biome_value: biomeNoise(x, z) });
    }
  }

  // === Krok 2: biome assignment (exact match dle procent) ===
  // Seřaď cells podle `biome_value`, pak po blocích přiřaď surface dle procent.
  // Výsledek: souvislé klastry biomů (sousední cells mají podobný noise →
  // stejný biome). Procentua jsou přesně dodržena (modulo rounding).
  const sortedSurfaces = Object.entries(surfaces); // [["grass", 0.8], ...]
  const totalCells = cells.length;
  const indexed = cells.map((c, idx) => ({ idx, v: c.biome_value }));
  indexed.sort((a, b) => a.v - b.v);

  let surfaceIdx = 0;
  let cellsLeft = sortedSurfaces[0][1] * totalCells;
  for (let i = 0; i < indexed.length; i++) {
    // Posun na další surface když dojde aktuální kvóta. Poslední surface
    // pojme zbylé cells (rounding residuum).
    while (cellsLeft <= 0 && surfaceIdx + 1 < sortedSurfaces.length) {
      surfaceIdx++;
      cellsLeft = sortedSurfaces[surfaceIdx][1] * totalCells;
    }
    cells[indexed[i].idx].surface = sortedSurfaces[surfaceIdx][0];
    cellsLeft--;
  }

  // === Krok 3: Y modifier dle biome surface ===
  for (const c of cells) {
    c.y_top = c.h + (SURFACE_Y_OFFSET[c.surface] ?? 0);
  }

  // === Krok 4: sloupcové vyplnění (dirt vrstva, stone dno) ===
  // Dno terénu = nejnižší y_top napříč všemi cells minus 1 (= aspoň 1 vrstva
  // stone pod nejhlubší surface). Také aspoň y=-1 (= viditelné dno i pro
  // relief 0 flat scénu).
  const minYTop = cells.reduce((m, c) => Math.min(m, c.y_top), Infinity);
  const yBottom = Math.min(-1, minYTop - 1);

  const blocks = [];
  const water = [];
  for (const c of cells) {
    const { x, z, y_top, surface } = c;
    // Pod vodou je dirt (= dno depression). Ostatní surfaces se renderují
    // jako svůj kind (grass/stone/sand).
    const topKind = surface === "water" ? "dirt" : surface;
    blocks.push([topKind, x, y_top, z]);

    // Sloupec pod top voxelem: vrstvy y ∈ [yBottom, y_top − 1].
    // Dno (y = yBottom) = stone, ostatní = dirt. Pravidlo „překryté =
    // hlína/skála" (sez. 14 builder export).
    for (let y = y_top - 1; y >= yBottom; y--) {
      const layerKind = (y === yBottom) ? "stone" : "dirt";
      blocks.push([layerKind, x, y, z]);
    }

    // Vodní plane(y) — MVP 1×1 cell. Y = y_top + 0.55 = mírně nad dirt
    // surface (proti z-fightingu). Klastrování spojitých water cells do
    // bounding boxů (= jeden plane na celé jezero) je fáze 2.
    if (surface === "water") {
      water.push({ x, z, w: 1, d: 1, y: y_top + 0.55 });
    }
  }

  return { blocks, water };
}
