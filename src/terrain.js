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

// Relief 0..8 → (amplitude max Y voxel, heightmap base frequency).
// 0–2: nízká členitost (roviny, mírné vlny). 3–5: pahorkatiny (rolling/hilly/
// broken). 6–8: vrchoviny (rugged/craggy/mountainous). 9–10 přijímáme na vstupu,
// ale generátor je nezvládne plně (chybí valley carving), níže clamp na 8 + warn.
//
// **DD-45 (sez. 36) — fBm + ridge blend retune:**
// Po přechodu na fBm (3 oktávy, lacunarity 2, persistence 0.5) je *base freq*
// nižší než 1-oktávové value-noise — fBm sám násobí freq lacunarity² pro horní
// oktávy, takže base 0.15 dá efektivní detaily až ~0.6. Plus ridge transformace
// `1 - |2v - 1|` zvyšuje efektivní peak height (peaks reálně dosahují plné amp,
// na rozdíl od bublatého value-noise kde peak ~0.6-0.7×amp). Proto:
//   - **amp** beze změny pro idx ≤ 7 (zachová `maxReliefForSize` UX — 50×50 dál
//     dovolí relief 7). Idx 8 (Alpine) zvýšen 6→8: full-ridge peaks na 100×100
//     mapě snesou vyšší vrcholy bez disproporce (8/100 = 8%).
//   - **freq** dramaticky nižší pro high relief (idx 6-8: 0.45/0.55/0.65 →
//     0.18/0.15/0.12). Velké hřebeny místo drobných štítů. Pro low relief
//     mírně nižší (idx 1-5) protože fBm horní oktávy zmnoží freq automaticky.
const RELIEF_AMPLITUDE = [0, 0, 1, 1, 2, 3, 4, 5, 8];
const RELIEF_FREQUENCY = [0.00, 0.12, 0.14, 0.16, 0.18, 0.20, 0.18, 0.15, 0.12];

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

  // === DD-45 (sez. 36) — fBm + ridge blend pro high relief ===
  // fBm (fractal Brownian motion) sečte 3 oktávy value-noise s decreasing
  // amplitudou — velké útvary (base freq) + střední (2× freq) + jemné detaily
  // (4× freq). Bez fBm by 1 oktáva pro high relief dávala "neprostupný šum"
  // (peaks široké ~2 cely s plnou amp = vrchovinný drobný šum, ne hřebeny).
  //
  // Ridge transformace `1 - |2v - 1|` invertuje bublaté peaks na lineární
  // hřebeny — typický horský look. Ale pro rolling hills (relief ≤ 4) by
  // ridge dal ostré tenké hřbety místo kulatých kopečků (nefyzikální).
  // Proto **ridgeWeight = max(0, (relief - 4) / 4)** — lineární růst ridge
  // podílu mezi relief 4 (0%) a relief 8 (100%):
  //   - relief 0-4 (Flat..Hilly):           pure fBm = organické kulaté kopce
  //   - relief 5 (Uneven):                  25% ridge, 75% fBm = mírná hřebenovitost
  //   - relief 6+ (Rugged+):                přepnuto na DD-46 bimodální režim
  //
  // === DD-46 (sez. 37) — smoothstep bimodální heightmap (G5) ===
  // Po DD-45 user feedback (sez. 37): "lepší, ale ještě posílit hřebeny+údolí".
  // Diagnóza: ridge³ blend je single-peak distribuce (right-skew), ne bimodal.
  // User wish "hřebeny + údolí" je definičně bimodální = dvě hladiny (peaks,
  // valleys) s plynulým přechodem.
  //
  // Algoritmus pro **relief ≥ 6**:
  //   t = smoothstep(SMOOTHSTEP_LO, SMOOTHSTEP_HI, fbmVal)  // [0,1]
  //   blended = lerp(VALLEY_AMP, PEAK_AMP, t)              // konkrétní voxel
  //   h = round(blended)
  //
  // Smoothstep `3x² - 2x³` na range (0.4, 0.6) → 60 % cells skončí v plné
  // extremitě (t=0 nebo t=1), 40 % v přechodu. Bimodální distribuce.
  //
  // VALLEY_AMP=−1 (jeden voxel pod sea level) → reálná depression, voda se
  // při wet biome nalije do údolí (= max kontrast hřebeny vs. údolí).
  // PEAK_AMP = `amplitude` tabulka (RELIEF_AMPLITUDE[idx]) → peaks dosáhnou
  // plné maxim. výšky pro daný relief.
  //
  // Pro relief 0-5 zůstává DD-45 ridge³ blend beze změny (rolling/hilly look).
  // Hard switch při r=6 (= jasná hranice mezi "rolling" a "horský" režimem).
  const FBM_OCTAVES = 3;
  const FBM_LACUNARITY = 2.0;
  const FBM_PERSISTENCE = 0.5;
  const FBM_TOTAL_AMP = 1 + 0.5 + 0.25;  // = 1.75 = sum persistence^i pro i=0..2
  const ridgeWeight = Math.max(0, (reliefClamped - 4) / 4);

  // DD-46 konstanty bimodálního režimu.
  const BIMODAL_RELIEF_THRESHOLD = 6;
  const VALLEY_AMP = -1;
  const SMOOTHSTEP_LO = 0.4;
  const SMOOTHSTEP_HI = 0.6;
  const useBimodal = reliefClamped >= BIMODAL_RELIEF_THRESHOLD;

  // fBm sample. `noiseFn` = volání `makeValueNoise(...)` instance. Cena O(octaves)
  // = 3 noise lookupy per cell. Pro 50×50 = 2500 cells × 3 = 7500 noise lookupů
  // (cell + biome noise = 2500 navíc), zanedbatelné CPU. JS comment: arrow
  // function s closure nad `noiseFn` — engine standard.
  function fbmSample(noiseFn, x, z) {
    let value = 0, amp = 1, freq = 1;
    for (let i = 0; i < FBM_OCTAVES; i++) {
      value += amp * noiseFn(x * freq, z * freq);
      amp *= FBM_PERSISTENCE;
      freq *= FBM_LACUNARITY;
    }
    return value / FBM_TOTAL_AMP;  // normalize na [0, 1]
  }

  // Ridge: 1 - |2v - 1|. v ∈ [0,1] → result ∈ [0,1] s peaks v středu range
  // (v=0.5 → 1.0). Pure ridge má E ≈ 0.5 (triangulární distribuce), ale shifted
  // toward high values → většina cells skončí v plateau na max amp = horská
  // náhorní plošina, ne hřebeny.
  //
  // **Ridge³ (cubed)** zúží peaks ještě ostřeji než ridge² (E ≈ 0.25 vs. 0.33):
  // ridge=1.0 → 1.0, ridge=0.8 → 0.512, ridge=0.5 → 0.125, ridge=0.2 → 0.008.
  // Peaks zůstanou plné amp, ale jsou **vzácné** (jen pro v blízko 0.5) —
  // vzniknou úzké hřebeny obklopené širokými údolími. Test sez. 36 prokázal,
  // že ridge² ještě dominuje plateau (67 % cells na top 2 úrovních), ridge³
  // dá right-skewed distribuci = většina mapy údolí, peaks vzácné.
  function ridge(v) {
    const r = 1 - Math.abs(2 * v - 1);
    return r * r * r;
  }

  // DD-46 smoothstep: `3x² - 2x³` mapuje vstup z range (lo, hi) plynule na
  // [0, 1] s C¹-spojitými okraji (derivace = 0 na 0 i 1). Mimo range klampuje.
  // Stejný idiom jako `makeValueNoise` bilineární interpolace výš (DRY).
  function smoothstep(lo, hi, v) {
    const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    return t * t * (3 - 2 * t);
  }

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
      const fbmVal = fbmSample(heightNoise, x, z);
      let h;
      if (useBimodal) {
        // DD-46: smoothstep bimodální. t ∈ [0,1] mapa fbmVal přes přechod
        // (0.4, 0.6). lerp mezi VALLEY_AMP a peakem dle amplitude tabulky.
        const t = smoothstep(SMOOTHSTEP_LO, SMOOTHSTEP_HI, fbmVal);
        const blended = VALLEY_AMP + (amplitude - VALLEY_AMP) * t;
        h = Math.round(blended);
      } else {
        // DD-45: fBm + ridge³ blend pro low/mid relief (r0-5).
        const ridgeVal = ridge(fbmVal);
        const blended = (1 - ridgeWeight) * fbmVal + ridgeWeight * ridgeVal;
        h = Math.round(blended * amplitude);
      }
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

// === G2 (sez. 35) — biome matice 4×3 (LATITUDE × HUMIDITY). ===
// `world.LATITUDE` enum × `world.HUMIDITY` enum → display jméno biomu pro UI
// readout v `#terrainctrl` Climate sekci. G3 (sez. 36) — konzument
// `BIOME_SURFACES` níž (driver surface mix místo UI sliderů). Polární vlhko
// je geografi vzácné a v reálné Arktidě klima podobné tundře → alias na
// `polar.mid` (jméno "Polární tundra", transparent fallback).
export const BIOME_NAMES = {
  tropical:    { wet: "Tropický deštný prales", mid: "Savana",        dry: "Horká poušť" },
  subtropical: { wet: "Vlhké subtropy",         mid: "Mediteránní",   dry: "Subtropická step" },
  temperate:   { wet: "Listnatý les",           mid: "Step / Prérie", dry: "Chladná poušť" },
  polar:       { wet: "Polární tundra",         mid: "Tundra",        dry: "Ledová poušť" },
};

// === G3 (sez. 36, DD-44) — surface mix driver per biome. ===
// `world.LATITUDE × HUMIDITY` → `surfaces` objekt (4 koef. sum=1.0) předaný
// do `generateTerrain`. Nahrazuje 4 UI surface slidery (DD-44 hard override:
// climate driver = jediný zdroj pravdy). Tabulka je hardcoded — 12 buněk ×
// 4 čísel = 48 hodnot; parametric formula (např. `water = f(humidity)`) by
// ztratila výrazovou volnost (Tropický prales ≠ Vlhké subtropy množstvím
// vody, i když oba "wet"). Per-cell je čitelnější.
//
// Design os:
//   HUMIDITY → water + grass (wet = více vody + zeleně, dry = málo)
//   LATITUDE → stone vs. sand mix (polar = stone-heavy + sand-as-snow proxy;
//                                   tropical = málo stone; ostatní středně)
//
// Známý dluh (G4 kandidát, viz TODO): `sand` v polar bunkách je proxy pro
// sníh. Až přibude `snow` surface (klon grass-top s bílou paletou), polar.*
// se migruje. Vizuálně to do té doby vypadá jako poušť, ne sníh.
//
// `polar.wet` = alias `polar.mid` (geografi vzácné combo → fallback). UI
// uchová `BIOME_NAMES.polar.wet = "Polární tundra"` (transparent fallback).
export const BIOME_SURFACES = {
  tropical: {
    wet: { grass: 0.55, stone: 0.05, sand: 0.05, water: 0.35 },
    mid: { grass: 0.65, stone: 0.10, sand: 0.20, water: 0.05 },
    dry: { grass: 0.00, stone: 0.10, sand: 0.90, water: 0.00 },
  },
  subtropical: {
    wet: { grass: 0.55, stone: 0.10, sand: 0.10, water: 0.25 },
    mid: { grass: 0.55, stone: 0.30, sand: 0.10, water: 0.05 },
    dry: { grass: 0.10, stone: 0.40, sand: 0.45, water: 0.05 },
  },
  temperate: {
    wet: { grass: 0.60, stone: 0.10, sand: 0.05, water: 0.25 },
    mid: { grass: 0.65, stone: 0.20, sand: 0.05, water: 0.10 },
    dry: { grass: 0.15, stone: 0.45, sand: 0.35, water: 0.05 },
  },
  polar: {
    // wet = alias mid (Arktická tundra geografi nejbližší).
    wet: { grass: 0.10, stone: 0.50, sand: 0.30, water: 0.10 },
    mid: { grass: 0.10, stone: 0.50, sand: 0.30, water: 0.10 },
    dry: { grass: 0.00, stone: 0.40, sand: 0.55, water: 0.05 },
  },
};

// Helper: bezpečně dohnat surfaces pro daný climate combo. Fallback na
// `temperate.mid` (= dnešní WORLD default) pro neznámý klíč — defensive,
// `world.LATITUDE/HUMIDITY` jsou controlled enum přes UI.
export function surfacesForBiome(latitude, humidity) {
  return BIOME_SURFACES[latitude]?.[humidity] ?? BIOME_SURFACES.temperate.mid;
}

// === G1 (sez. 35) — UI slider clamp dle MIN(sx, sz). ===
// Mapa 10×10 nedává proporční smysl pro alpine 6 voxelů Y (ostré vertikální
// stěny dominují celé šířce). Helper vrací max relief index (0..10), který má
// smysl pro daný size — UI panel `#terrainctrl` jím dynamicky nastaví
// `<input id="tc-relief">` `max` attribute. Generátor (`generateTerrain`)
// samotný zůstává unconstrained — clamp je čistě UX gate (KISS).
//
// Vzorec: max amplitude = floor(MIN(sx, sz) / 10), tj. 1 voxel max-Y per
// 10 voxelů strany. Reverse lookup do `RELIEF_AMPLITUDE` → poslední `reliefIdx`,
// jehož amplitude se vejde. Index 8 (= cap amplitude 6) povýšíme na 10, protože
// relief 9..10 generátor stejně graceful clampuje na 8 (zachová celé 11-jmenné
// spektrum názvů od Flat po Alpine na velkých mapách).
export function maxReliefForSize(sx, sz) {
  const maxAmp = Math.floor(Math.min(sx, sz) / 10);
  let last = 0;
  for (let i = 0; i < RELIEF_AMPLITUDE.length; i++) {
    if (RELIEF_AMPLITUDE[i] <= maxAmp) last = i;
  }
  return last === 8 ? 10 : last;
}
