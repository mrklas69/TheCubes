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
// žádné externí deps. Exportován i pro `src/composites/toolkit.js` (DD-49) —
// procedurální buildery COMPOSITES sdílí stejný seed-based RNG jako terrain.
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// MinHeap (binary heap) — priority queue pro Krok 6 water flood fill (sez. 38).
// Items: `{ level, cell }`, sort by `level` ascending. ~30 ř., interní, ne export.
// Pro 100×100 = 10k cells je O(N log N) sort vůči O(N²) sorted array kritický.
class MinHeap {
  constructor() { this.heap = []; }
  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }
  pop() {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._siftDown(0);
    }
    return top;
  }
  get size() { return this.heap.length; }
  _siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].level <= this.heap[i].level) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let m = i;
      if (l < n && this.heap[l].level < this.heap[m].level) m = l;
      if (r < n && this.heap[r].level < this.heap[m].level) m = r;
      if (m === i) break;
      [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
      i = m;
    }
  }
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

// Relief 0..10 → (amplitude max Y voxel, heightmap base frequency).
// 0–2: nízká členitost (roviny, mírné vlny). 3–5: pahorkatiny (rolling/hilly/
// broken). 6–8: vrchoviny (rugged/craggy/mountainous). 9–10 přijímáme na vstupu,
// ale generátor je nezvládne plně (chybí valley carving), níže clamp na 8 + warn.
// Tabulka má jen 9 prvků (indexy 0..8) — relief 9/10 fall-through na idx 8 po clampu.
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
// `sand` — depression, o 1 voxel níž (poušť / údolí).
// **Sez. 38 (DD-47):** `water` surface dropped — voda jako surface kind smazán.
// Voda se vrátí později jako LIQUID 1. třída entita (DD-25 vrstva 4), ne surface.
const SURFACE_Y_OFFSET = {
  grass: 0,
  stone: 0,
  sand: -1,
};

export function generateTerrain({ size, relief, surfaces, seed = 42, snowSpec = { mode: "none" }, waterSpec = { enabled: false }, decorSpec = { mode: "none" } }) {
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

  // === Krok 3.5: Snow flag per cell (sez. 38, DD-47) ===
  // `snowSpec.mode`:
  //   "polar"     → všechny cells snowed (= jednotně bílá scéna).
  //   "temperate" → cells s `y_top >= altThreshold` vždy (= vrcholky hor)
  //                 + **top N % zbylých cells dle altitude-biased noise score**,
  //                 kde N% = `1 − patchThreshold` (default 30 %). Score per cell
  //                 = `snowNoise(x,z) + altNorm × altBias`; sort descending, vyber
  //                 prvních N %. Izomorfie s biome assignment v Kroku 2 (sort+rank).
  //                 Důvod (sez. 38 user feedback): předchozí lerp-threshold
  //                 přístup zvyšoval celkovou plochu sněhu (= sníh všude), tento
  //                 sort+rank **zachová stochastickou 30 % plochu**, jen ji
  //                 přesune k vyšším cells. Vrcholy stále nemusí být zasněžené
  //                 (noise drift), nížiny příležitostně sníh dostanou (= mikro-
  //                 klimatický noise).
  //   "none"      → žádný sníh (tropical / subtropical).
  // Sníh modifikuje **jen top voxel surface** (= `_snow` postfix na kindu);
  // sloupcové vrstvy (dirt/stone) zůstávají bez snow (= "sníh leží shora").
  // Pro rampy se sníh propaguje z dest cell (= ramp surface dědí snowed flag
  // ze source cell svahu, viz Pass 2).
  const snowNoise = (snowSpec.mode === "temperate")
    ? makeValueNoise(sx, sz, 0.08, seed + 2)  // seed +2 = nezávislý sample (height +0, biome +1)
    : null;
  const snowAltThreshold   = snowSpec.altThreshold   ?? 6;
  const snowPatchThreshold = snowSpec.patchThreshold ?? 0.7;
  const snowAltBias        = snowSpec.altBias        ?? 0.3;
  if (snowSpec.mode === "polar") {
    for (const c of cells) c.snowed = true;
  } else if (snowSpec.mode === "temperate") {
    // Pre-compute min/max y_top pro altitude normalize.
    let _snowMinY = Infinity, _snowMaxY = -Infinity;
    for (const c of cells) {
      if (c.y_top < _snowMinY) _snowMinY = c.y_top;
      if (c.y_top > _snowMaxY) _snowMaxY = c.y_top;
    }
    const _snowYRange = _snowMaxY - _snowMinY;
    // Pass 1: mountain cells (y >= altThreshold) → vždy snowed.
    // Pass 2: zbylé cells → sort by score, top (1-patchThreshold) %.
    const remaining = [];
    for (const c of cells) {
      if (c.y_top >= snowAltThreshold) {
        c.snowed = true;
      } else {
        const altNorm = _snowYRange > 0 ? (c.y_top - _snowMinY) / _snowYRange : 0;
        const score = snowNoise(c.x, c.z) + altNorm * snowAltBias;
        remaining.push({ c, score });
      }
    }
    remaining.sort((a, b) => b.score - a.score);
    const snowCount = Math.floor(remaining.length * (1 - snowPatchThreshold));
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].c.snowed = i < snowCount;
    }
  } else {
    for (const c of cells) c.snowed = false;
  }

  // === Krok 4: sloupcové vyplnění (dirt vrstva, stone dno) ===
  // Dno terénu = nejnižší y_top napříč všemi cells minus 1 (= aspoň 1 vrstva
  // stone pod nejhlubší surface). Také aspoň y=-1 (= viditelné dno i pro
  // relief 0 flat scénu).
  const minYTop = cells.reduce((m, c) => Math.min(m, c.y_top), Infinity);
  const yBottom = Math.min(-1, minYTop - 1);

  const blocks = [];
  for (const c of cells) {
    const { x, z, y_top, surface, snowed } = c;
    // Top voxel: pokud cell je snowed, postfix `_snow` na kindu (= white TOP
    // face, base BOTTOM/SIDE z `BLOCK_COLORS`).
    const topKind = snowed ? `${surface}_snow` : surface;
    blocks.push([topKind, x, y_top, z]);

    // Sloupec pod top voxelem: vrstvy y ∈ [yBottom, y_top − 1].
    // Dno (y = yBottom) = stone, ostatní = dirt. Pravidlo „překryté =
    // hlína/skála" (sez. 14 builder export). Snow se nepropaguje do sloupce
    // (sníh leží shora, ne uvnitř).
    for (let y = y_top - 1; y >= yBottom; y--) {
      const layerKind = (y === yBottom) ? "stone" : "dirt";
      blocks.push([layerKind, x, y, z]);
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
          // slopeDir → unit vector low→high po diagonále k peak corneru. (sez. 41
          // DD-50 follow-up — decor Y na rampě.) `|dx|+|dz| = 2` (diagonální).
          slopeDir: { dx: tdrampCorner.ddx, dz: tdrampCorner.ddz },
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
        // slopeDir → unit vector low→high (toward high neighbor). Edge ramp
        // je čistě axiálně (|dx|+|dz|=1). Pro decor Y interpolaci v decorate().
        slopeDir: { dx: pick.dir.dx, dz: pick.dir.dz },
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
        // slopeDir → unit vector low→high po diagonále k tip corneru. Corner
        // (TTRAMPS) je apex/tent ramp; bilinear aproximace v decorate() Y.
        slopeDir: { dx: c.ddx, dz: c.ddz },
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
    // Snow propagate (sez. 38, DD-47): ramp dědí snowed status ze source
    // cell svahu. Edge ramp → `cand.b` (= dest cell, vyšší soused). Corner/
    // diagonal → `cand.bDiag` (= diag peak cell). Pokud source cell snowed,
    // ramp surface dostane `_snow` postfix (SLOPE+TOP white, BACK/sides base).
    const srcCell = cand.type === "edge" ? cand.b : cand.bDiag;
    const finalSurface = srcCell?.snowed ? `${cand.surface}_snow` : cand.surface;
    ramps.push({
      kind: cand.type,
      x: cand.a.x, y: cand.a.y_top + 1, z: cand.a.z,
      surface: finalSurface,
      orientation: cand.orientation,
      // slopeDir (sez. 41 DD-50 follow-up) — unit vector low→high po horizontále.
      // Konzument: `decorate()` v Krok 7 pro lineární Y interpolaci paty stromu
      // na svahu (jinak by tree visel ve vzduchu při jitter pozici jiné než
      // střed cellu).
      slopeDir: cand.slopeDir,
    });
  }

  // === Krok 6: Water flood fill (sez. 38, post-DD-47 LIQUID prototype) ===
  // **Priority flood** (Wang & Liu, 2006): voda zaplňuje negativní útvary až
  // po nejnižší cestu k okraji scény. Algoritmus:
  //   1. Boundary cells iniciate `water_level = y_top` (= voda uteče přes
  //      nejnižší boundary cell ven; "okraj scény = drain", interpretace
  //      sez. 38 Q2 (a) overflow). Push do min-heap.
  //   2. Min-heap propaguje od nejnižší úrovně dovnitř: každý zatím nevizit.
  //      soused dostane `water_level = max(current_level, neighbor.y_top)`.
  //      Vyšší inner cell tlumí stoupání hladiny (= "natural rim"); nižší
  //      inner cell dědí současný level (= basin floor pod hladinou).
  //   3. Cell má vodu pokud `water_level > y_top` (strictly).
  // Komplexita O(N log N) — kritická pro 100×100 (10k cells). MinHeap class
  // definovaná na začátku souboru.
  //
  // **Frozen (ice) decision:** per-cell dle `waterSpec.freezeRatio`:
  //   1.0 → vše frozen (polar all-ice).
  //   0.0 → nic frozen (tropical/subtropical voda všechna).
  //   0..1 → noise threshold per cell (`iceNoise(x,z) > (1 - freezeRatio)`).
  //          Pro freezeRatio = 0.3 (temperate) ~30% ledových ostrůvků.
  //
  // Snow conflict: water cells mají `snowed = false` (cell pod hladinou nemá
  // sníh shora). Override snow flag z Krok 3.5.
  const water = [];
  if (waterSpec.enabled) {
    const waterLevel = new Map();
    const visited = new Set();
    const heap = new MinHeap();
    // Boundary init: cells na 4 hranách scény (x = x0 / x0+sx-1, z analog).
    const xMin = x0, xMax = x0 + sx - 1;
    const zMin = z0, zMax = z0 + sz - 1;
    for (const c of cells) {
      const isBoundary = (c.x === xMin || c.x === xMax || c.z === zMin || c.z === zMax);
      if (isBoundary) {
        const key = `${c.x},${c.z}`;
        waterLevel.set(key, c.y_top);
        visited.add(key);
        heap.push({ level: c.y_top, cell: c });
      }
    }
    // Flood: pop min level, propagate do nevisited sousedů.
    while (heap.size > 0) {
      const { level, cell: cur } = heap.pop();
      for (const dir of NEIGHBORS) {
        const nx = cur.x + dir.dx;
        const nz = cur.z + dir.dz;
        const nKey = `${nx},${nz}`;
        if (visited.has(nKey)) continue;
        const n = cellAt.get(nKey);
        if (!n) continue;
        visited.add(nKey);
        const nLevel = Math.max(level, n.y_top);
        waterLevel.set(nKey, nLevel);
        heap.push({ level: nLevel, cell: n });
      }
    }
    // Mark water cells + frozen decision.
    const freezeRatio  = waterSpec.freezeRatio  ?? 0;
    const iceNoise = (freezeRatio > 0 && freezeRatio < 1)
      ? makeValueNoise(sx, sz, 0.08, seed + 3)  // seed +3 = nezávislý (height +0, biome +1, snow +2)
      : null;
    const iceThreshold = 1 - freezeRatio;
    for (const c of cells) {
      const key = `${c.x},${c.z}`;
      const wl = waterLevel.get(key);
      if (wl > c.y_top) {
        c.water   = true;
        c.water_y = wl;
        c.snowed  = false;  // pod vodou není sníh shora
        let frozen;
        if (freezeRatio >= 1.0)      frozen = true;
        else if (freezeRatio <= 0.0) frozen = false;
        else                          frozen = iceNoise(c.x, c.z) > iceThreshold;
        // Plane Y: cell `Y` je grid-center, top face na `Y + 0.5`. Rim cell
        // má y_top = water_level, takže jeho top face je na `wl + 0.5`. Hladina
        // **pod okrajem** (user feedback sez. 38) = `wl + 0.45` (0.05 pod top
        // face rim → rim voxel mírně "trčí" nad vodu jako reálný břeh).
        water.push({ x: c.x, z: c.z, y: wl + 0.45, frozen, w: 1, d: 1 });
      } else {
        c.water = false;
      }
    }
  }

  // === Krok 7: krajinné dekorace (sez. 40, DD-49) =============================
  // Procedurální scatter COMPOSITES (stromy, keře, kameny, tráva) přes
  // `DECOR_DENSITY[lat][hum]` lookup tabulku. Per top-voxel cell rozhodne RNG
  // o spawnu a vážený výběr KIND-u. Voda → skip; stone surface → jen rock;
  // snowed cells → density × 0.5. Vrací `decorations[]` = array objektů
  // `{ kind, x, y, z, seed }` v world coords (caller v `main.js` z toho vytvoří
  // DECOR instance).
  //
  // `decorSpec.mode`:
  //   "biome" → použij `DECOR_DENSITY[decorSpec.latitude][decorSpec.humidity]`.
  //   "none"  → vrátí prázdné pole (= žádné decor).
  const decorations = (decorSpec.mode === "biome")
    ? decorate(cells, ramps, decorSpec.latitude, decorSpec.humidity, decorSpec.season ?? "summer", seed, decorSpec.densityMult ?? 1.0)
    : [];

  return { blocks, ramps, water, decorations };
}

// === DECOR_DENSITY (sez. 40, DD-49) =========================================
// Per (LATITUDE × HUMIDITY) → `{ kind: weight }`. `weight` = nezávislá
// pravděpodobnost spawnu té KIND v cell (suma weights = celková spawn prob).
// Hodnoty kalibrované tak, aby suma per cell zůstala ≤ 0.3 (= max 30 % buněk
// dostane decor) — jinak by scéna byla zarostlá a perf trpěl.
//
// Vzory:
//   - **wet biome** = hodně zeleně (oak/bush dominantní)
//   - **mid biome** = vyváženo (oak + spruce + bush + rock)
//   - **dry biome** = sparse, jen tuft + rock
//   - **polar** = spruce (taiga edge) + rock; dry polar = jen rock
//   - **tropical** = oak (listnaté), žádný spruce
//   - **temperate** = mix (spruce + oak)
export const DECOR_DENSITY = {
  // Sez. 40 rebalance — wet sloupec škálovaný 80% (tropical) → 20% (polar),
  // s posunem od dominantních stromů (tropical/subtropical) přes mix
  // (temperate) k jen-trávy-a-keře (polar). User wish: „od tropického
  // pralesa 80% pokrytí → polární tundra 20% pokrytí spíše trávami/keři".
  //
  // Sez. 41 follow-up — stromové KIND-y (oak + spruce) × 2 napříč všemi biomy.
  // Důvod: DECOR_BASE_SCALE snížen z 0.5× na 1/3× (=33% menší stromy), takže
  // víc decor per cell je vizuálně OK + uživatel chce "hustší prales".
  // Pozn.: `decorate()` má max 1 decor per cell (= sum > 1.0 znamená jen
  // 100% fill rate, ne víc stromů per buňku). Tropical.wet sum 1.15 = každá
  // non-skip cell dostane decor. Multi-decor per cell je sub-prah pro
  // skutečně zdvojnásobenou hustotu.
  // Sez. 43 Fáze 6 add: palm v tropical.wet/mid (primary v wet, sub-dominant v
  // savana), cactus v subtropical.dry (primary dry feature, bush sekundární).
  tropical: {
    wet: { palm: 0.40, oak: 0.30, bush: 0.25, grass_tuft: 0.15, rock: 0.05 },    // sum 1.15 — hustý prales (palm primary, oak fallback; cap 100% fill)
    mid: { palm: 0.05, oak: 0.08, bush: 0.04, grass_tuft: 0.06, rock: 0.02 },    // sum 0.25 — savana (palm ojediněle)
    dry: { grass_tuft: 0.03, rock: 0.05 },                                       // sum 0.08 — poušť (bez stromů, palm nepatří do pouště)
  },
  subtropical: {
    wet: { oak: 0.50, bush: 0.20, grass_tuft: 0.10, rock: 0.05, stump: 0.02, log: 0.02 },  // sum 0.89 — vlhký les s padlými kmeny
    mid: { oak: 0.06, bush: 0.04, grass_tuft: 0.05, rock: 0.03 },                          // sum 0.18 — mediteránní
    dry: { cactus: 0.04, bush: 0.02, grass_tuft: 0.03, rock: 0.05 },                       // sum 0.14 — step s kakty
  },
  // Sez. 43 Fáze 6 add: flower (temperate.wet/mid louka), stump + log (temperate
  // woodland clearings, subtropical.wet detail).
  temperate: {
    wet: { oak: 0.30, spruce: 0.20, bush: 0.08, grass_tuft: 0.05, rock: 0.02, flower: 0.10, stump: 0.02, log: 0.02 },  // sum 0.79 — listnatý les + louka
    mid: { oak: 0.08, spruce: 0.12, bush: 0.04, grass_tuft: 0.06, rock: 0.02, flower: 0.04, stump: 0.02 },             // sum 0.38 — smíšený s loukami
    dry: { spruce: 0.02, bush: 0.02, grass_tuft: 0.04, rock: 0.05, stump: 0.02, log: 0.02 },                           // sum 0.17 — chladná step + sušené dřevo
  },
  polar: {
    wet: { bush: 0.08, grass_tuft: 0.08, rock: 0.04 },                           // sum 0.20 — polární tundra (bez stromů)
    mid: { spruce: 0.08, bush: 0.02, grass_tuft: 0.02, rock: 0.04 },             // sum 0.16 — tundra (spruce ×2)
    dry: { rock: 0.04 },                                                         // sum 0.04 — ledová poušť
  },
};

// `decorSpecForClimate(latitude, humidity, season, densityMult)` — helper pro
// caller. Symetrický s `snowSpecForLatitude` / `waterSpecForClimate`. `season`
// (sez. 41 DD-50 follow-up) se propaguje skrz `decorations[]` až do builderu
// (LEAF_AUTUMN paleta pro oak/bush v autumn). Default "summer" pokud caller
// nepředá. `densityMult` (sez. 43 Fáze 6) — UI slider multiplikátor 0..2 nad
// DECOR_DENSITY (default 1.0 = baseline z tabulky).
export function decorSpecForClimate(latitude, humidity, season = "summer", densityMult = 1.0) {
  return { mode: "biome", latitude, humidity, season, densityMult };
}

// `DECOR_BASE_SCALE[kind]` — globální size factor per KIND, passnutý do
// `DECOR.SCALE` (= `group.scale.multiplyScalar(scale)` v buildery). User
// feedback sez. 40: stromy/keře/kameny v 1.0× působily jako "lese-bonsaje
// nad voxely" (~1.5 m výška vs. 1 m hrana voxelu = OK, ale user chtěl
// "krajinné dekorace" = subtle, ne dominantní). Sez. 40 první step 0.5×.
// Sez. 41 follow-up: ještě o 1/3 menší (= 0.333 ≈ 1/3 původní 1.0×) — user
// chce nahustit stromy víc na sebe, prales pak vypadá hustší (kompenzace
// přes density × 2 níže). Grass_tuft 1.0× (= ~30 cm shards, malé i tak,
// nemá smysl dál zmenšovat).
const DECOR_BASE_SCALE = {
  spruce:     1 / 3,
  oak:        1 / 3,
  bush:       1 / 3,
  rock:       1 / 3,
  grass_tuft: 1.0,
  // Sez. 43 Fáze 6 add. Palm má natively trunk 1.8-2.6 (vs. oak 0.9-1.3 = 2× vyšší),
  // takže palm × 1/3 = final ~0.6-0.86 j výšky, oak × 1/3 = ~0.3-0.43 j. Palm
  // bude přibližně 2× nad oak — odpovídá reálnému měřítku v tropickém lese.
  // Cactus má natively trunk 1.0-1.5, scale × 1/3 = ~0.33-0.50 j (= drobný kaktus
  // mezi bush + grass_tuft, dry biome detail).
  palm:       1 / 3,
  cactus:     1 / 3,
  // Sez. 43 Fáze 6 add. Flower native = 0.20-0.30 j stem + 0.05-0.08 bloom,
  // scale 0.5× → ~0.13-0.19 j final = drobné kvítky v trávě (user kalibrace
  // sez. 43: 1.0× působilo jako tulipány nad voxely, 0.5× = sedmikrásky).
  // Stump native 0.30-0.50 height, × 1/3 = ~0.10-0.17 j final (= 10-17 cm pařez).
  // Log native 0.5-0.8 length × 1/3 = ~0.17-0.27 j (= short fallen tree section).
  flower:     0.5,
  stump:      1 / 3,
  log:        1 / 3,
};

// `DEAD_PROB_BY_HUM[humidity]` — pravděpodobnost, že spawn dostane `dead = true`
// flag. Dry biome = nejvíc sušených stromů (drought stress); wet = zdravé stromy.
// Sez. 43 Fáze 6 add. Konzument: `decorate()` RNG roll → propagace přes
// `decoration.dead` → DECOR.DEAD → builder `opts.dead`. Builder priorita:
// dead > snowed > autumn > default (oak/spruce trunk-only, bush/flower skip,
// palm/cactus trunk-only s darker bark).
const DEAD_PROB_BY_HUM = {
  wet: 0.00,
  mid: 0.05,
  dry: 0.30,
};

// `decorate(cells, ramps, latitude, humidity, season, seed)` — scatter implementace.
//   - **Skip cells with water** (decor neroste pod hladinou).
//   - **Stone surface** → jen "rock" povolen (kamenitý terén — stromy/keře
//     nemají kořeny ve skále, sub-prah pokud bude vzdorovat user vkusu).
//   - **Snowed cells** → density × 0.5 (DD-49 spec: sníh tlumí scatter).
//   - **Ramp cells** → Y posunutý nahoru o 0.5 (sez. 40 bod 2 fix). Bez tohoto
//     by decor byl zapuštěn do ramp diagonal a vyčníval by jen špička.
//     Ramp surface stoupá z `y_top + 0.5` do `y_top + 1.5`; decor `y = y_top + 1.0`
//     je střední úroveň, strom roste z rampového středu (kompromis mezi base
//     rampy a top end).
//   - Weighted random pick KIND-u podle filtered weights.
//   - Jitter ±0.3 v X/Z uvnitř cell — decor sedí mezi voxely, ne přesně
//     na intersection. Y = top voxel top face (= `y_top + 0.5`).
//   - `season` se ukládá do každého `decorations[i].season` a propaguje se
//     až do builderu (LEAF_AUTUMN paleta pro oak/bush v autumn — sez. 41
//     DD-50 follow-up). Globální per regen (= všechny DECOR ve scéně sdílejí
//     stejný SEASON), ale per-instance fan-out drží engine separation.
//
// Vrací `decorations[]` array objektů `{ kind, x, y, z, seed, scale, snowed, season, dead }`.
//
// Sez. 43 Fáze 6 add — `densityMult` (default 1.0) multiplikuje `totalWeight`
// per cell (UI density slider `world.DECOR_DENSITY_MULT`). 0 = bez decor, 2 =
// max density. Konzument: `generateTerrain` passne `decorSpec.densityMult`.
function decorate(cells, ramps, latitude, humidity, season, seed, densityMult = 1.0) {
  const baseWeights = DECOR_DENSITY[latitude]?.[humidity] ?? {};
  if (Object.keys(baseWeights).length === 0) return [];

  // Nezávislý RNG namespace (seed +3 oproti height +0, biome +1, snow +2).
  const rng = mulberry32(seed + 3);
  const decorations = [];

  // Map ramp cell koordinát → ramp record pro O(1) lookup + Y interpolaci.
  // Sez. 40 měl jen `rampCells` Set s konstantním Y = y_top + 1.0 (= střed
  // ramp diagonal), ale jitter pozice tree mimo střed cellu visela ve vzduchu
  // na low end nebo byla zapuštěna na high end. Sez. 41 DD-52 follow-up:
  // `slopeDir` z ramp entry umožní lineární interp Y dle (jitterX, jitterZ).
  // Sez. 43 Fáze 6: ukládáme celý ramp record (= slopeDir + kind) místo jen
  // slopeDir, aby šlo rozlišit TTRAMPS (kind="corner") a skipnout decor —
  // TTRAMPS je jehlan se slope jen v ~1/4 cellu (projected NW triangle), takže
  // bilinear formula by dala palm floating 0.2-0.5 j nad povrchem.
  const rampInfoMap = new Map();
  for (const r of ramps ?? []) rampInfoMap.set(`${r.x},${r.z}`, r);

  for (const c of cells) {
    if (c.water === true) continue;

    // TTRAMPS skip (sez. 43 Fáze 6 fix — user report „palmy visí ve vzduchu").
    // TTRAMPS = trojboký jehlan (corner ramp pro isolated peak). Slope povrch
    // pokrývá jen projected NW triangle (~1/4 cellu), zbytek cellu nemá horní
    // povrch nad bottom face. Bilinear Y formula by dala decor floating 0.2-0.5 j
    // nad povrchem. KISS: skip celý cell, TTRAMPS jsou minorita ramp typů.
    // TRRAMPS (edge wedge) má plný slope = exact formula. TDRAMP (diagonal) má
    // slope+top: formula sunken o 0.2-0.5 j (méně viditelné, sub-prah „TDRAMP
    // exact step Y" v TODO).
    const rampInfo = rampInfoMap.get(`${c.x},${c.z}`);
    if (rampInfo?.kind === "corner") continue;

    // Filter dle surface constraints. Allowed = baseWeights bez nepovolených KIND-ů.
    // `Object.entries(obj)` vrací `[[key, val], ...]` array, `.filter` standardní.
    //
    // **Sez. 41 DD-50 follow-up: bush v snowed cell skip.** Listnatý keř v zimě
    // = defoliated, nemá co vykreslit (oak udělá holý kmen, bush kmen nemá =
    // entity by byla prázdná Group). Lepší instanci nespawnnout — KISS, žádný
    // empty mesh ve scéně. Spruce + rock + grass_tuft snowed zachovají vlastní
    // snow-aware render (jehličí + sníh / top chunk bílý / bílé shards).
    const allowedEntries = Object.entries(baseWeights).filter(([kind]) => {
      if (c.surface === "stone" && kind !== "rock") return false;
      if (c.snowed === true && kind === "bush") return false;
      return true;
    });
    if (allowedEntries.length === 0) continue;

    // Total weight per cell. Snowed = ×0.5 (DD-49 density damping). Sez. 43
    // Fáze 6 add — `densityMult` (UI slider) × global multiplier.
    let totalWeight = allowedEntries.reduce((sum, [, w]) => sum + w, 0);
    if (c.snowed) totalWeight *= 0.5;
    totalWeight *= densityMult;

    // Spawn roll. Pokud rng() vyhodí pod totalWeight, spawne; jinak skip.
    if (rng() >= totalWeight) continue;

    // Weighted pick KIND-u (linear search — pole 1-5 položek, O(n) OK).
    const sumAllowed = allowedEntries.reduce((sum, [, w]) => sum + w, 0);
    let r = rng() * sumAllowed;
    let pickedKind = allowedEntries[allowedEntries.length - 1][0];  // fallback poslední
    for (const [kind, w] of allowedEntries) {
      r -= w;
      if (r < 0) { pickedKind = kind; break; }
    }

    // Jitter ±0.3 (uvnitř cell ~ 60 % šíře, nejde nikdy přes hranu).
    const jitterX = (rng() - 0.5) * 0.6;
    const jitterZ = (rng() - 0.5) * 0.6;
    // Y výpočet (sez. 41 DD-50 follow-up):
    //  - non-ramp cell: top face voxelu = y_top + 0.5.
    //  - ramp cell: lineární interp po slopeDir. Ramp range je y_top + 0.5
    //    (low edge) až y_top + 1.5 (high edge); střed cellu = y_top + 1.0.
    //    `slopeT = (jx·dx + jz·dz) / norm` mapuje (jitterX, jitterZ) na ±0.5
    //    při cell edge (norm = |dx|+|dz|, edge=1, corner/diagonal=2).
    //    decY = y_top + 1.0 + slopeT.
    //  Edge ramp (axial): jitter podél slope axisu = ±0.3 vrátí Y = y_top + 0.7..1.3.
    //  Corner/diagonal (diagonální): jitter v rohu daleko od peaku = ±0.6
    //    raw dot / norm 2 = ±0.3 → stejný rozsah jako edge.
    let decY;
    if (rampInfo) {
      const slopeDir = rampInfo.slopeDir;
      const norm = Math.abs(slopeDir.dx) + Math.abs(slopeDir.dz);
      const slopeT = (jitterX * slopeDir.dx + jitterZ * slopeDir.dz) / norm;
      decY = c.y_top + 1.0 + slopeT;
    } else {
      decY = c.y_top + 0.5;
    }

    // Per-instance seed pro builder variace — derivované z scatter RNG, takže
    // stejný global `seed` dá deterministicky stejnou scénu.
    // `Math.floor(rng() * 2^32)` — 32-bit integer rozsah pro mulberry32.
    const decSeed = Math.floor(rng() * 0xffffffff);

    // Sez. 43 Fáze 6 add — `dead` flag roll per spawn. Probability per humidity:
    // wet 0% / mid 5% / dry 30%. Sušené stromy v dry biomech = realistická drought
    // visualizace. Builder priorita dead > snowed > autumn > default.
    const deadProb = DEAD_PROB_BY_HUM[humidity] ?? 0;
    const isDead = rng() < deadProb;

    // Sez. 41 multi-decor attempt rolled back — 100×100 tropical.wet × 2 attempts
    // = ~20k DECOR Object3D × ~5 child meshes = ~100k scenetree, FPS klesl
    // na ~8 (rAF 123ms). Single attempt zachová playable FPS; pro skutečnou
    // hustotu pralesu čekáme na InstancedMesh refactor DECOR (TODO sub-prah).
    decorations.push({
      kind: pickedKind,
      x: c.x + jitterX,
      y: decY,
      z: c.z + jitterZ,
      seed: decSeed,
      // Globální size factor per KIND (sez. 40 follow-up). Propagovaný do
      // DECOR.SCALE → builder `group.scale.multiplyScalar(scale)`.
      scale: DECOR_BASE_SCALE[pickedKind] ?? 1.0,
      // Propagace `c.snowed` (sez. 40 follow-up) — builder v `main.js` z toho
      // určí snow cap (top element bílý) pro zasněžený biome. `bool` (default
      // `false` pokud cell.snowed undefined při snowSpec.mode="none").
      snowed: c.snowed === true,
      // Propagace `season` (sez. 41 DD-50 follow-up) — builder z toho určí
      // listovou paletu (oak/bush v autumn = LEAF_AUTUMN oranžová, jinak
      // LEAF_GREEN/BUSH_GREEN). Spruce season-invariant (jehličnan).
      season: season,
      // Sez. 43 Fáze 6 — `dead` flag (sušený strom v dry biomě). Builder
      // priorita dead > snowed > autumn > default.
      dead: isDead,
    });
  }

  return decorations;
}

// === G2 (sez. 35) — biome matice 4×3 (LATITUDE × HUMIDITY). ===
// `world.LATITUDE` enum × `world.HUMIDITY` enum → display jméno biomu pro UI
// readout v `#terrainctrl` Climate sekci. G3 (sez. 36) — konzument
// `BIOME_SURFACES` níž (driver surface mix místo UI sliderů). Polární vlhko
// je geografi vzácné a v reálné Arktidě klima podobné tundře → alias na
// `polar.mid` (jméno "Polární tundra", transparent fallback).
export const BIOME_NAMES = {
  tropical:    { wet: "Tropický prales",        mid: "Savana",        dry: "Horká poušť" },
  subtropical: { wet: "Vlhké subtropy",         mid: "Mediteránní",   dry: "Subtropická step" },
  temperate:   { wet: "Listnatý les",           mid: "Step / Prérie", dry: "Chladná poušť" },
  polar:       { wet: "Polární tundra",         mid: "Tundra",        dry: "Ledová poušť" },
};

// === G3 (sez. 36, DD-44; sez. 38 DD-47 drop water) — surface mix driver per biome. ===
// `world.LATITUDE × HUMIDITY` → `surfaces` objekt (3 koef. sum=1.0) předaný
// do `generateTerrain`. Nahrazuje UI surface slidery (DD-44 hard override:
// climate driver = jediný zdroj pravdy). Tabulka je hardcoded — 12 buněk ×
// 3 čísel = 36 hodnot; parametric formula by ztratila výrazovou volnost
// (Tropický prales ≠ Vlhké subtropy množstvím zeleně, i když oba "wet").
//
// Design os:
//   HUMIDITY → grass podíl (wet = více zeleně, dry = méně, kompenzace stone/sand)
//   LATITUDE → stone vs. sand mix (polar = stone-heavy; tropical = málo stone)
//
// **Sez. 38 (DD-47):** `water` sloupec smazán — drop water surface kind
// (viz `SURFACE_Y_OFFSET` výš). Voda se vrátí jako LIQUID 1. třída entity.
// Původní `water` % přerozděleny: fertile biomy (tropical/subtropical/temperate
// wet/mid) → grass (více vegetace bez "water sinks"); polar wet/mid → stone/sand
// (skály + ledové pouště v Arktidě běžnější než jezera).
//
// `polar.wet` = alias `polar.mid` (geografi vzácné combo → fallback). UI
// uchová `BIOME_NAMES.polar.wet = "Polární tundra"` (transparent fallback).
export const BIOME_SURFACES = {
  // Sez. 40 rebalance (user wish):
  //   - **mid** sloupec: stone × 0.5, sand × 1.75, grass picks residual.
  //     („mid biomy mají víc písku, méně skal" — savana/medit/step vypadají
  //     pouštnatěji.)
  //   - **dry** sloupec: stone × 0.25, sand picks residual.
  //     („v poušti je o 3/4 méně skal, vše ostatní písek".)
  //   - **wet** sloupec beze změny.
  tropical: {
    wet: { grass: 0.90, stone: 0.05,   sand: 0.05 },
    mid: { grass: 0.60, stone: 0.05,   sand: 0.35 },
    dry: { grass: 0.00, stone: 0.025,  sand: 0.975 },
  },
  subtropical: {
    wet: { grass: 0.80, stone: 0.10,   sand: 0.10 },
    mid: { grass: 0.675, stone: 0.15,  sand: 0.175 },
    dry: { grass: 0.15, stone: 0.10,   sand: 0.75 },
  },
  temperate: {
    wet: { grass: 0.85, stone: 0.10,   sand: 0.05 },
    mid: { grass: 0.8125, stone: 0.10, sand: 0.0875 },
    dry: { grass: 0.20, stone: 0.1125, sand: 0.6875 },
  },
  polar: {
    // wet = stejný surface mix jako mid (Arktická tundra geografi nejbližší).
    // DECOR_DENSITY sez. 40 rebalance ale rozlišuje: polar.wet = 0.20 sum
    // (trávy/keře), polar.mid = 0.12 sum (spruce + bush). Surfaces zachovány
    // (UI shape stejná pro oba), liší se decor scatter.
    wet: { grass: 0.1125, stone: 0.275, sand: 0.6125 },
    mid: { grass: 0.1125, stone: 0.275, sand: 0.6125 },
    dry: { grass: 0.00, stone: 0.10,    sand: 0.90 },
  },
};

// Helper: bezpečně dohnat surfaces pro daný climate combo. Fallback na
// `temperate.mid` (= dnešní WORLD default) pro neznámý klíč — defensive,
// `world.LATITUDE/HUMIDITY` jsou controlled enum přes UI.
export function surfacesForBiome(latitude, humidity) {
  return BIOME_SURFACES[latitude]?.[humidity] ?? BIOME_SURFACES.temperate.mid;
}

// === SEASON driver (DD-50, sez. 40) =========================================
// 4-enum WORLD atribut. Modifikuje temperate biom (jeho snow patches +
// water ice). Polar perpetually-winter (invariant), tropical/subtropical
// season-invariant (bez snow/ice napříč).
//
// Lookup tabulky:
//   `SNOW_PATCH_BY_SEASON[season]` → temperate `snowSpec.patchThreshold`.
//     patchThreshold 1.0 = 0 % cells s sněhem (= summer).
//     patchThreshold 0.85 = 15 % cells (= spring/autumn).
//     patchThreshold 0.40 = 60 % cells (= winter).
//   `WATER_FREEZE_BY_SEASON[season]` → temperate `waterSpec.freezeRatio`.
//     summer 0.0 = no ice; spring 0.2; autumn 0.3; winter 0.7.
//
// Polar `freezeRatio` zůstává 1.0 (vše led) napříč seasony — fix sub-prah.
export const SEASONS = ["spring", "summer", "autumn", "winter"];

const SNOW_PATCH_BY_SEASON = {
  spring: 0.85,
  summer: 1.00,  // patchThreshold ≥ 1 → snowCount=Math.floor(N×0)=0 → 0 % snowed
  autumn: 0.85,
  winter: 0.40,
};

const WATER_FREEZE_BY_SEASON = {
  spring: 0.2,
  summer: 0.0,
  autumn: 0.3,
  winter: 0.7,
};

// Helper: snowSpec dle LATITUDE × SEASON (sez. 38 DD-47, sez. 40 DD-50).
// Polar = jednotně bílo (sezon-invariant). Temperate = vrcholky hor (Y ≥ 6)
// + klastrované patches; **`patchThreshold` per season** (winter více sněhu).
// Jiné latitudy = bez sněhu napříč seasony.
export function snowSpecForLatitude(latitude, season = "summer") {
  if (latitude === "polar")    return { mode: "polar" };
  if (latitude === "temperate") {
    return {
      mode: "temperate",
      altThreshold: 6,
      patchThreshold: SNOW_PATCH_BY_SEASON[season] ?? 1.00,
      altBias: 0.3,
    };
  }
  return { mode: "none" };
}

// Helper: waterSpec dle LATITUDE × HUMIDITY × SEASON (sez. 38 DD-47, sez. 40 DD-50).
// `dry` = bez vody (poušť bez jezer). `wet`/`mid` = water enabled, freezeRatio
// dle latitude. **Temperate `freezeRatio` per season** (winter víc ledu).
// Polar = 1.0 napříč (vše led), sub/tropical = 0.0 napříč.
export function waterSpecForClimate(latitude, humidity, season = "summer") {
  if (humidity === "dry") return { enabled: false };
  let freezeRatio;
  if (latitude === "polar")          freezeRatio = 1.0;
  else if (latitude === "temperate") freezeRatio = WATER_FREEZE_BY_SEASON[season] ?? 0.0;
  else                               freezeRatio = 0.0;
  return { enabled: true, freezeRatio };
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
