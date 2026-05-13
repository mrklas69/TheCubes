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

// Relief 0..8 → (amplitude max Y voxel, heightmap frequency).
// 0–2: nízká členitost (roviny, mírné vlny). 3–5: pahorkatiny (rolling/hilly/
// broken). 6–8: vrchoviny (rugged/craggy/mountainous). 9–10 přijímáme na vstupu,
// ale value-noise engine je nezvládne plně (chybí valley carving / ridge noise),
// proto níže clamp na 8 + warn — pole tak drží jen *podporované* indexy (SSoT).
const RELIEF_AMPLITUDE = [0, 0, 1, 1, 2, 3, 4, 5, 6];
const RELIEF_FREQUENCY = [0.00, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45, 0.55, 0.65];

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

  // === Krok 5: ramp smoothing (DD-34 kandidát) — 2-pass kolaps vlnové funkce ===
  // Per cell A spawn buď **TRRAMPS edge** (přístupový klín k direct vyššímu
  // sousedovi B) nebo **TTRAMPS isolated peak** (estetické vyplnění rohového
  // peakového voxelu, kde A nemá direct vyšší, ale diag vyšší existuje).
  //
  // Pass 1 — kandidát per cell:
  //   if highDirs.length > 0:
  //     skip pokud úzký rokle (2 protilehlé high bez jiných)
  //     greedy criticality score (= count alt nižších sousedů B):
  //       nižší score ⇒ víc critical ⇒ vyšší priorita
  //       tie-break: N > E > S > W
  //     kandidát = TRRAMPS edge k pick direction.
  //   elif diag isolated peak (0 direct high, 1+ diag high s oběma direct rohu
  //         na úrovni A):
  //     kandidát = TTRAMPS corner k tomu rohu (preferenční pořadí NE>NW>SE>SW).
  //   else: nic (rovinatá cell, jáma, nebo diag peak s asymetrickými direct).
  //
  // Pass 2 — compatibility filter (TRRAMPS jen):
  //   pokud ramp A → dest B a B má taky TRRAMPS s **jinou** orientací než A,
  //   postava narazí do BACK quad nebo LEFT/RIGHT triangle ramp B v sdílené
  //   rovině (= „bok rampy", uživatel sez. 26). Drop ramp A.
  //   Multi-level stairway (A k W → B s ramp k W) je validní pokračování.
  //   TTRAMPS isolated peak nemají compatibility constraint (nepotkávají
  //   se s TRRAMPS — vznikají v cells s flat direct sousedstvem).
  //
  // ORIENTATION (DD-26): default TRRAMPS high end na −Z, default TTRAMPS
  // apex k rohu (−X, −Z). Rotace posune k cíli.
  const cellAt = new Map();
  for (const c of cells) cellAt.set(`${c.x},${c.z}`, c);

  const NEIGHBORS = [
    { dx:  0, dz: +1, name: "N" },  // +Z
    { dx: +1, dz:  0, name: "E" },  // +X
    { dx:  0, dz: -1, name: "S" },  // -Z
    { dx: -1, dz:  0, name: "W" },  // -X
  ];
  const EDGE_ORIENT = { S: 0, W: 90, N: 180, E: 270 };
  const PREF_ORDER  = { N: 0, E: 1, S: 2, W: 3 };

  // Rohy pro TTRAMPS — preferenční pořadí NE>NW>SE>SW (deterministický výběr).
  // Klíč CORNER_ORIENT je sorted alfa: NE=EN, ES=ES, NW=NW, SW=SW.
  const CORNERS = [
    { d1: "N", d2: "E", ddx: +1, ddz: +1, key: "EN" },
    { d1: "N", d2: "W", ddx: -1, ddz: +1, key: "NW" },
    { d1: "S", d2: "E", ddx: +1, ddz: -1, key: "ES" },
    { d1: "S", d2: "W", ddx: -1, ddz: -1, key: "SW" },
  ];
  const CORNER_ORIENT = { SW: 0, NW: 90, EN: 180, ES: 270 };

  // TDRAMP peak → ORIENTATION. Default ORIENTATION=0 má low corner v lokálním
  // (-X, -Z), což v terrain.js naming (N=+Z) odpovídá rohu "SW", a peak v
  // opačném rohu (+X, +Z) = "EN". Rotace +θ° CCW shora přesune low corner.
  // Empirická korekce: uživatel sez. 26 hlásil, že peak ES dostával orient 0
  // místo správného 90 (= +90° CCW).
  //   peak "EN" (+X,+Z): default        → 0
  //   peak "ES" (+X,-Z): rotace +90     → 90
  //   peak "SW" (-X,-Z): rotace +180    → 180
  //   peak "NW" (-X,+Z): rotace +270    → 270
  const TDRAMP_PEAK_ORIENT = { EN: 0, ES: 90, SW: 180, NW: 270 };

  function cellAtXZ(x, z) {
    return cellAt.get(`${x},${z}`) ?? null;
  }
  function isHigher(a, b) {
    return b !== null && b.y_top === a.y_top + 1 && b.surface !== "water";
  }
  function isSameLevel(a, b) {
    return b !== null && b.y_top === a.y_top;
  }
  function countLowDirectNeighbors(b) {
    let n = 0;
    for (const dir of NEIGHBORS) {
      const c = cellAtXZ(b.x + dir.dx, b.z + dir.dz);
      if (c !== null && c.y_top === b.y_top - 1 && c.surface !== "water") n++;
    }
    return n;
  }
  // Direct sousední cell A v daném směru (jméno "N"/"E"/"S"/"W").
  function neighborInDir(a, dirName) {
    const dir = NEIGHBORS.find((d) => d.name === dirName);
    return cellAtXZ(a.x + dir.dx, a.z + dir.dz);
  }

  // Pass 1: kandidát per cell.
  const candidatePerCell = new Map();  // "x,z" → { type, dir|corner, b, ... }
  for (const a of cells) {
    const aKey = `${a.x},${a.z}`;
    const highDirs = [];
    for (const dir of NEIGHBORS) {
      const b = cellAtXZ(a.x + dir.dx, a.z + dir.dz);
      if (isHigher(a, b)) highDirs.push({ dir, b });
    }

    if (highDirs.length > 0) {
      // TRRAMPS edge case. Skip úzký rokle.
      if (highDirs.length === 2) {
        const names = new Set(highDirs.map((h) => h.dir.name));
        if ((names.has("N") && names.has("S")) || (names.has("E") && names.has("W"))) continue;
      }

      // TDRAMP detekce — 2-stage:
      //   Stage 1: 3-cell convex peak (oba direct rohu vyšší + diag vyšší).
      //            Topologicky nejlepší — diag peak je pokryt + 2 přístupy.
      //   Stage 2: plain L-shape (oba direct rohu vyšší, diag nemusí).
      //            Pokrývá 2 přístupy, peak corner je BODEM v "air" nad diag.
      //
      // Strict dominuje 1× TRRAMPS edge (1 přístup) v obou stage. Iteruj
      // CORNERS v pref. pořadí (EN > NW > ES > SW), vyber 1. match.
      // Plain L-shape může vést k double-apex párům (= 2 TDRAMP špičky se
      // dotýkají v 1 bodě) — řeší Pass 1.5 dedup níž.
      let tdrampCorner = CORNERS.find((cc) => {
        const h1 = highDirs.some((h) => h.dir.name === cc.d1);
        const h2 = highDirs.some((h) => h.dir.name === cc.d2);
        if (!h1 || !h2) return false;
        const bd = cellAtXZ(a.x + cc.ddx, a.z + cc.ddz);
        return isHigher(a, bd);  // Stage 1: diag vyšší
      });
      if (!tdrampCorner) {
        tdrampCorner = CORNERS.find((cc) => {
          const h1 = highDirs.some((h) => h.dir.name === cc.d1);
          const h2 = highDirs.some((h) => h.dir.name === cc.d2);
          return h1 && h2;  // Stage 2: L-shape (diag nemusí)
        });
      }
      if (tdrampCorner) {
        const bDiag = cellAtXZ(a.x + tdrampCorner.ddx, a.z + tdrampCorner.ddz);
        const surfaceSrc = (bDiag && bDiag.y_top === a.y_top + 1)
          ? bDiag
          : highDirs.find((h) => h.dir.name === tdrampCorner.d1).b;
        candidatePerCell.set(aKey, {
          type: "diagonal",
          a, bDiag,
          orientation: TDRAMP_PEAK_ORIENT[tdrampCorner.key],
          surface: surfaceSrc.surface,
        });
        continue;
      }

      // Fallback: TRRAMPS edge greedy criticality.
      const scored = highDirs.map((h) => ({
        ...h,
        altLows: Math.max(0, countLowDirectNeighbors(h.b) - 1),
      }));
      scored.sort((x, y) =>
        x.altLows - y.altLows || PREF_ORDER[x.dir.name] - PREF_ORDER[y.dir.name]
      );
      const pick = scored[0];
      candidatePerCell.set(aKey, {
        type: "edge",
        a, dir: pick.dir, b: pick.b,
        orientation: EDGE_ORIENT[pick.dir.name],
        surface: pick.b.surface,
      });
      continue;
    }

    // Isolated diag peak case (TTRAMPS): A nemá direct vyšší, ale aspoň 1 diag
    // vyšší s **oběma direct sousedy rohu na úrovni A** (= peak je geometricky
    // osamělý voxel v rohu cellu A).
    for (const c of CORNERS) {
      const bDiag = cellAtXZ(a.x + c.ddx, a.z + c.ddz);
      if (!isHigher(a, bDiag)) continue;
      const b1 = neighborInDir(a, c.d1);
      const b2 = neighborInDir(a, c.d2);
      // Direct rohu musí být null (mimo grid) nebo same level (= ploskem rohu).
      if (b1 !== null && !isSameLevel(a, b1)) continue;
      if (b2 !== null && !isSameLevel(a, b2)) continue;
      candidatePerCell.set(aKey, {
        type: "corner",
        a, bDiag,
        orientation: CORNER_ORIENT[c.key],
        surface: bDiag.surface,
      });
      break;  // 1. ten, který sedí (preferenční pořadí NE>NW>SE>SW)
    }
  }

  // Pass 1.5 dedup — DROPPED (uživatel sez. 26): L-shape TDRAMP páry sdílející
  // apex (double-tent v 1 bodě) jsou vizuálně OK. TDRAMP vyplňuje 1/2 voxelu
  // (větší masa než TTRAMPS apex), maxim. zakrývá existující exposed walls.
  // Cena: 1.0 new exposed walls per pár — akceptovatelný kompromis.

  // Pass 2: compatibility filter (TRRAMPS jen). Drop ramp A pokud dest cell B
  // má TRRAMPS s jinou orientací (= postava narazí do boku ramp B).
  const ramps = [];
  for (const cand of candidatePerCell.values()) {
    if (cand.type === "edge") {
      const destKey = `${cand.b.x},${cand.b.z}`;
      const destCand = candidatePerCell.get(destKey);
      if (destCand && destCand.type === "edge" && destCand.dir.name !== cand.dir.name) {
        continue;  // konflikt — ramp B blokuje cestu, drop A
      }
    }
    ramps.push({
      kind: cand.type,
      x: cand.a.x, y: cand.a.y_top + 1, z: cand.a.z,
      surface: cand.surface,
      orientation: cand.orientation,
    });
  }

  return { blocks, water, ramps };
}
