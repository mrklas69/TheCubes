// src/model.js
// Definice základních tříd modelu TheCubes.
// Viz docs/GLOSSARY.md a docs/DESIGN_DECISIONS.md (DD-01, DD-02, DD-12, DD-13).

// VOXELS infrastruktura (DD-56, sez. 51) — model-layer helper z resources.js.
// Pure data import (žádná Three.js dependency, paralel terrain.js / resources.js).
import { expandVoxelLayers, voxelTotal as _voxelTotal, VOXEL_PER_CELL, RESOURCE_REGISTRY } from "./resources.js";

/**
 * OBJECTS = kořenová třída všeho v modelu TheCubes.
 *
 * Všechny vizuální i nevizuální entity dědí z OBJECTS — tj. pravidla,
 * recepty, timery (až budou) i kostky v prostoru.
 *
 * Pozn.: V JavaScriptu se třídy definují klíčovým slovem `class`.
 * `constructor` je metoda volaná při `new OBJECTS(...)`. `this` odkazuje
 * na právě vznikající instanci.
 */
export class OBJECTS {
  constructor(id, name, description = "") {
    // ID = unikátní identifikátor (nikdy se nemění po vytvoření)
    this.ID = id;
    // NAME = krátký lidsky čitelný název (pro UI, tooltipy)
    this.NAME = name;
    // DESCRIPTION = volný popis (může být prázdný; default "")
    this.DESCRIPTION = description;
  }
}

/**
 * CUBES = OBJECTS s polohou v prostoru. Default vizualizace = voxel krychle
 * se šachovnicovou texturou (DD-07 — idiom "vizuál není definován").
 *
 * Pozor na terminologii: "CUBES" je projektová značka, ne doslovný tvar.
 * Potomci override vizualizaci — CCUBES (plochá barva), TCUBES (per-face
 * vertex colors, DD-41), BLOCKS rampy (TRRAMPS/TTRAMPS/TDRAMP), COMPOSITES
 * (3D mesh z primitivů — LAMP/DECOR), LIQUID (PlaneGeometry water/ice DD-54).
 * Všichni sdílejí souřadný systém.
 *
 * DD-12: X, Y, Z jsou JS number (float). Voxelové potomky (CCUBES, TCUBES)
 * si v rendereru pozici zaokrouhlí na celé (snap-to-grid), nevoxelové
 * (COMPOSITES, LIQUID) si spojitou pozici ponechají.
 *
 * `extends OBJECTS` = dědičnost v JS. `super(...)` uvnitř constructoru
 * volá constructor rodičovské třídy (musí být první, než se použije `this`).
 */
export class CUBES extends OBJECTS {
  constructor(id, name, x, y, z, description = "") {
    super(id, name, description);
    // Souřadnice ve sdíleném souřadném systému (float, DD-12).
    // Voxel renderer je snapne na int; COMPOSITES/LIQUID je nechají spojité.
    this.X = x;
    this.Y = y;
    this.Z = z;
    // VOXELS (DD-56, sez. 51) — `Map<resource, count> | null` voxel inventář cellu.
    // Lazy-init při prvním `addVoxel` (= memory-efficient, většina CUBES voxely
    // nemá — terrain bloky, decor, lampy, vzducholoď). `null` = sémanticky „nemá voxely".
    //
    // Max součet hodnot = `VOXEL_PER_CELL` (64 pro V=4). Insertion order Map
    // určí Y-pořadí vrstev v rendereru (`voxelLayers()` → `expandVoxelLayers`,
    // viz `resources.js`).
    //
    // Per DD-56 koncept 3 „tile-jako-storage": jakákoli CUBES může mít voxely
    // — terrain blok (chop yield drop), abstract cell (rainbow rubik demo),
    // vzducholoď koš (sez. 53 BALLOON.INVENTORY = stejný Map).
    this.VOXELS = null;
  }

  /**
   * addVoxel — přidá `count` voxelů typu `resource` do VOXELS Map.
   *
   * Lazy-init Map při prvním volání. Insertion order Map = pořadí prvního
   * `addVoxel` per resource (= Y-vrstva při renderu). Existing key += count
   * (= insertion order resource zůstává původní, nepřesouvá se).
   *
   * Guard: `voxelTotal + count > VOXEL_PER_CELL` → vrátí 0 (nepřidá nic, caller
   * řeší overflow per DD-56 koncept 10: cílený přesun zamítnout / náhodná
   * emise BFS okolí).
   *
   * @returns {number} skutečně přidaných voxelů (0 při overflow, jinak `count`).
   */
  addVoxel(resource, count) {
    if (count <= 0) return 0;
    if (!RESOURCE_REGISTRY[resource]) return 0;  // neznámý resource type
    if (!this.VOXELS) this.VOXELS = new Map();
    if (_voxelTotal(this.VOXELS) + count > VOXEL_PER_CELL) return 0;
    this.VOXELS.set(resource, (this.VOXELS.get(resource) ?? 0) + count);
    return count;
  }

  /**
   * removeVoxel — odebere `count` voxelů typu `resource` z VOXELS Map.
   *
   * `lifo = true` (default, DD-56 koncept 9): bere se z **poslední** vrstvy
   * = poslední insertion resource. Per acceptance scénář vzducholoď LIFO pick
   * vrátí top water vrstvu před sand/stone/wood (= inverted rainbow emergent).
   *
   * `lifo = false`: bere se podle `resource` argument (FIFO/by-name semantics,
   * sub-prah pro mission-driven extraction).
   *
   * Když Map zůstane prázdná, resetuje VOXELS na `null` (memory hygiene,
   * tile-as-storage idle stav).
   *
   * @returns {number} skutečně odebraných voxelů (0 pokud žádné nejsou).
   */
  removeVoxel(resource, count, lifo = true) {
    if (!this.VOXELS || count <= 0) return 0;
    let target = resource;
    if (lifo) {
      // Poslední key v insertion order = `Array.from(keys()).at(-1)` (JS pole
      // metoda od ES2022). KISS forma `[...keys()].pop()`.
      const lastKey = [...this.VOXELS.keys()].pop();
      if (!lastKey) return 0;
      target = lastKey;
    }
    const available = this.VOXELS.get(target) ?? 0;
    if (available === 0) return 0;
    const taken = Math.min(available, count);
    const remaining = available - taken;
    if (remaining === 0) this.VOXELS.delete(target);
    else this.VOXELS.set(target, remaining);
    if (this.VOXELS.size === 0) this.VOXELS = null;
    return taken;
  }

  /**
   * voxelTotal — součet všech voxelů v cell. `0` pokud VOXELS null.
   * Konzument: overflow check, full-cell predicate, infotip display.
   */
  voxelTotal() {
    return _voxelTotal(this.VOXELS);
  }

  /**
   * voxelLayers — rozloží VOXELS Map na pole sub-grid pozic per voxel.
   *
   * Vrací `[{ resource, sx, sy, sz }, ...]` (deleguje na `expandVoxelLayers`
   * z resources.js). Per DD-57 (sez. 51 patch) výsledek je **shuffled**
   * (seeded Fisher-Yates) — drop DD-56 koncept 4 autosort render-side.
   *
   * **Seed default** = deterministicky z (X, Y, Z) pozice cubu (= reload scény
   * dá stejný shuffle pattern per cube). Caller může override (sub-prah
   * mission-driven seed pro animace).
   *
   * Hash: 3-prime multiplikace + XOR (klasická 3D spatial hash). Floor pro
   * float coords (CUBES.X může být float dle DD-12). `|| 1` fallback ochrana
   * mulberry32 RNG (= seed=0 by ho zachovala v identity stavu).
   *
   * Per DD-11 model/engine separation: vrací **plain data** (žádný Three.js
   * objekt), engine si nad tím postaví matice. Model zůstává čistě datový.
   */
  voxelLayers(seed = null) {
    const s = seed ?? (Math.abs(
      (Math.floor(this.X) * 73856093) ^
      (Math.floor(this.Y) * 19349663) ^
      (Math.floor(this.Z) * 83492791)
    ) || 1);
    return expandVoxelLayers(this.VOXELS, s);
  }
}

/**
 * CCUBES = Color Cubes. Voxel s pevnou plochou barvou všech 6 ploch.
 *
 * Override default šachovnice (DD-07) jedinou barvou podle atributu `COLOR`.
 * `COLOR` je JS number ve formátu 0xRRGGBB — přirozený pro Three.js
 * (`new Color(0xff0000)`). V infotipu se naformátuje na "#rrggbb".
 *
 * Prefix "C" značí *color* variantu voxelu; sourozenec TCUBES má prefix
 * "T" pro *texture* (6 per-face obrázků). Viz DD-13.
 *
 * Pozn.: Dispatch "jakou třídu jak vykreslit" žije v `main.js`, ne zde —
 * model zůstává čistě datový, nezná Three.js (model/engine separation,
 * DD-11). Historicky se tato třída jmenovala `TERRAIN`.
 */
/**
 * BLOCKS = abstract parent všech 1C grid-aligned bloků geologie/terénu (DD-25:
 * 5-vrstvá taxonomie scény, vrstva 1). Sdílí mezi sebou: snap-to-int v rendereru
 * (DD-12), procedurální geometrie v engine, lowpoly vertex-color paleta
 * (DD-41 nahradila DD-14 face material dispatch). Potomci se liší tvarem:
 * krychle (TCUBES, 6 faces), klín (TRRAMPS, 5 faces), jehlan (TTRAMPS, 4 faces),
 * 7-vrcholový blok (TDRAMP).
 *
 * `ORIENTATION` (DD-26 sez. 17) — float ∈ [0, 360) ve **stupních**, rotace
 * kolem Y osy. Default 0. Engine převádí `mesh.rotation.y = ORIENTATION * π/180`.
 * Pro rampy se v praxi používají násobky 90° (cardinální orientace svahu),
 * ale typ je float — sdílený s COMPOSITES, kde dekorace mívají náhodnou
 * rotaci pro organický vzhled.
 */
export class BLOCKS extends CUBES {
  constructor(id, name, x, y, z, description = "") {
    super(id, name, x, y, z, description);
    this.ORIENTATION = 0;
  }
}

export class CCUBES extends BLOCKS {
  constructor(id, name, x, y, z, color, description = "") {
    super(id, name, x, y, z, description);
    // Barva dlaždice jako JS number 0xRRGGBB
    this.COLOR = color;
  }
}

/**
 * TCUBES = Texture Cubes. Voxel s lowpoly vertex-color paletou (DD-41).
 * Stejně jako CCUBES je to voxel (pozice snap-to-grid v rendereru, DD-12);
 * liší se vizuálním módem — plocha barva (CCUBES) vs. per-face TOP/BOTTOM/SIDE
 * paleta řízená přes `BLOCK_COLORS[kind]` v main.js (DD-13, DD-41).
 *
 * Mapování světových stran na osy (Three.js, Y-up, +Z = k divákovi):
 *  TOP = +Y, BOTTOM = −Y, EAST = +X, WEST = −X, SOUTH = +Z, NORTH = −Z.
 *
 * Per-face barvy zapsané přímo do `color` attribute sdílené per-kind
 * BoxGeometry v `getTcubesKindGeom(kind)` (main.js). Pro neznámý kind
 * fallback šachovnice (DD-07).
 *
 * Historicky (do DD-36 sez. 28) měl TCUBES per-face textury (`TEXTURE_TOP`,
 * `TEXTURE_BOTTOM`, …) přes face material dispatch. DD-36 atlas pipeline
 * sloučila 6 facelet do 1 CanvasTexture per kind. DD-41 (sez. 34) atlas
 * nahradila vertex colors v geometrii → drop `textures` arg + TEXTURE_*
 * atribut z modelu (čistě data, žádné textury). Sez. 49 K1 dropla i poslední
 * residual face material dispatch infrastrukturu (M6 milestone bez konzumenta).
 */
export class TCUBES extends BLOCKS {
  // DD-41 (sez. 34): drop `textures` arg + TEXTURE_* fields. Barvy řídí
  // `BLOCK_COLORS` v main.js, vizuál přes vertex-color BoxGeometry (`getTcubesKindGeom`).
  constructor(id, name, x, y, z, description = "") {
    super(id, name, x, y, z, description);
  }
}

/**
 * TRRAMPS = Triangular Rectangular Ramp = trojboký hranol (= pravoúhlý klín)
 * v 1C bounding boxu. Geologický blok pro stoupání mezi výškovými úrovněmi
 * (Y=0 → Y=1 přes 1C hranu).
 *
 * 5 faces (SLOPE = šikmý obdélník 1×√2, BOTTOM = podstava 1×1, BACK = zadní
 * stěna 1×1 ke které svah dosahuje na vrchu, LEFT/RIGHT = pravoúhlé trojúhelníky
 * na bočních stěnách). Barvy faces řídí `BLOCK_COLORS[surface]` paleta + map
 * `RAMP_FACE_PALETTE_KEYS.trramps` v main.js (DD-41): SLOPE = `.TOP`,
 * BOTTOM = `.BOTTOM`, BACK/LEFT/RIGHT = `.SIDE`. Vertex-color BufferGeometry
 * sdílena přes `getRampGeom("trramps", surface)`.
 *
 * `ORIENTATION` (DD-26) — stupně ∈ [0, 360). 4 cardinální orientace svahu:
 * 0° = svah klesá k +Z (SOUTH), 90° = k −X (WEST), 180° = k −Z (NORTH),
 * 270° = k +X (EAST). User „+90 po směru hod. ručiček" = ORIENTATION −= 90
 * (modulo 360).
 */
export class TRRAMPS extends BLOCKS {
  // DD-41 (sez. 34): drop `textures` arg + TEXTURE_* fields. Barvy řídí
  // `BLOCK_COLORS` + `RAMP_FACE_PALETTE_KEYS` v main.js, vizuál přes lowpoly
  // ramp geom (`getRampGeom("trramps", surface)`).
  constructor(id, name, x, y, z, orientation = 0, description = "") {
    super(id, name, x, y, z, description);
    this.ORIENTATION = orientation;
  }
}

/**
 * TTRAMPS = Triangular Tetrahedron Ramp = trojboký jehlan (trirectangular
 * tetrahedron) v 1C bounding boxu. Geometricky: 3 mutually perpendicular
 * stěny sdílející roh `C`, zbývající stěna SLOPE = rovnostranný trojúhelník.
 * Použití: rohové rampy (corner ramps), stoupání ze 3 sousedních směrů na
 * jeden vyvýšený roh.
 *
 * 4 faces (SLOPE = rovnostranný trojúhelník mezi 3 axiálními body hrana √2,
 * BOTTOM = pravoúhlý trojúhelník na Y=−0.5, BACK = pravoúhlý trojúhelník
 * na Z=−0.5 vertikální, LEFT = pravoúhlý trojúhelník na X=−0.5 vertikální).
 * Barvy faces řídí `BLOCK_COLORS[surface]` + `RAMP_FACE_PALETTE_KEYS.ttramps`
 * (DD-41): SLOPE = `.TOP`, BOTTOM = `.BOTTOM`, BACK/LEFT = `.SIDE`.
 *
 * Default orientace (`ORIENTATION = 0`): roh `C` v lokálním (-0.5, -0.5, -0.5)
 * (= SW-bottom-NORTH), 3 hrany směřují podél +X, +Y, +Z. SLOPE normála míří
 * k SE-top-SOUTH rohu = (1, 1, 1)/√3.
 *
 * `ORIENTATION` (DD-26, stupně ∈ [0, 360)) — rotace celého bloku kolem osy Y.
 * 4 cardinální orientace (násobky 90°) odpovídají 4 rohům, kde může roh `C` ležet.
 */
export class TTRAMPS extends BLOCKS {
  // DD-41 (sez. 34): drop `textures` arg + TEXTURE_* fields. Viz TRRAMPS — same.
  constructor(id, name, x, y, z, orientation = 0, description = "") {
    super(id, name, x, y, z, description);
    this.ORIENTATION = orientation;
  }
}

/**
 * TDRAMP = Diagonal Ramp = 1C blok bez jednoho horního rohu (DD-35 kandidát).
 * Geometricky: krychle 1×1×1 minus tetrahedron odříznutý v jednom horním rohu
 * (= "low corner"). Vznikne 7-vrcholový polyhedron — 4 dolní rohy (čtvercová
 * podstava) + 3 horní rohy (trojúhelníková „horní podstava"). Vyhladí
 * **3-cell convex peak** stepu, kde A má 2 sousední direct vyšší + diagonální
 * peak (corner roh) vyšší. Jeden TDRAMP zakryje obě hrany stepu + roh peaku.
 *
 * 7 faces v 5 color group (SLOPE = diagonální šikmá plocha z low_bot
 * k hraně opačného rohu NE_top–SW_top; TOP = plochý horní trojúhelník na
 * Y=+0.5 sdílí lomenou hranu s SLOPE — „lomená rampa tvořená dvěma
 * trojúhelníky" uživatel sez. 26; BOTTOM = čtvercová podstava na Y=−0.5;
 * WALL_FULL = 2 plné vertikální stěny obsahující peak corner; WALL_TRI =
 * 2 vertikální stěny tvaru pravoúhlého trojúhelníku obsahující low corner).
 * Barvy faces řídí `BLOCK_COLORS[surface]` + `RAMP_FACE_PALETTE_KEYS.tdramp`
 * (DD-41): SLOPE+TOP = `.TOP`, BOTTOM = `.BOTTOM`, WALL_FULL/WALL_TRI = `.SIDE`.
 *
 * Default orientace (`ORIENTATION = 0`): low corner v lokálním (-0.5, ?, -0.5)
 * (= NW-bot v project konvenci kde -Z=N). Peak corner k opačnému rohu
 * (+X, +Z) = SE.
 *
 * `ORIENTATION` (DD-26, stupně, rotace okolo Y CCW shora):
 *  - 0   → low corner NW (default), peak SE
 *  - 90  → low corner SW, peak NE
 *  - 180 → low corner SE, peak NW
 *  - 270 → low corner NE, peak SW
 */
export class TDRAMP extends BLOCKS {
  // DD-41 (sez. 34): drop `textures` arg + TEXTURE_* fields. Viz TRRAMPS — same.
  constructor(id, name, x, y, z, orientation = 0, description = "") {
    super(id, name, x, y, z, description);
    this.ORIENTATION = orientation;
  }
}

/**
 * COMPOSITES = potomek CUBES vizualizovaný jako 3D mesh složený z primitivů
 * (Three.js `Group` obsahující např. válec + kužely pro strom).
 *
 * Nemá vlastní datové atributy — konkrétní tvar určuje engine ve
 * `createMeshFor` podle konkrétní třídy (Tree, Balloon, …). Tyto
 * specializované potomky dědí z `COMPOSITES` a sdílejí „billboardless 3D"
 * vizuální režim. Viz DD-13.
 *
 * Pozice je spojitá (DD-12 — float). Instance nemusí sedět na celé buňce
 * gridu (balón nad scénou, strom mezi kostkami, …).
 */
export class COMPOSITES extends CUBES {
  constructor(id, name, x, y, z, description = "") {
    super(id, name, x, y, z, description);
    // ORIENTATION (DD-26) — float ∈ [0, 360) ve stupních, rotace kolem Y osy.
    // Default 0. Pro pixel-voxel dekorace (TREE, GRASS_TUFT, ROCK_PIXEL, LOG)
    // typicky náhodná pro organický vzhled. Engine převede na radiány.
    this.ORIENTATION = 0;
  }
}

/**
 * LAMP = pouliční lampa, voxelový sloupek + svítící hlava + PointLight.
 * Sourozenec TREE/ROCK_PIXEL/LOG (COMPOSITES potomek). Žádné vlastní atributy
 * — builder hard-coduje voxely; barva světla je oranžová (sodium-vapor lamp).
 *
 * Engine: `buildLamp(instance)` v `main.js` přidá `THREE.PointLight` jako dítě
 * Group (drahá operace per frame kvůli shadow map). Pro budoucí scaling
 * (~10+ lamp ve scéně) bude potřeba shadow budget management.
 */
export class LAMP extends COMPOSITES {}

/**
 * DECOR = procedurální krajinná dekorace (stromy, keře, kameny, tráva) —
 * DD-49 (sez. 39 kotva, sez. 40 implementace).
 *
 * Generická třída pro celou paletu rostlin a kamenů: jeden constructor,
 * konkrétní tvar řídí `KIND` lookup v `DECOR_BUILDERS` (`src/composites/
 * builders.js`). KISS rozhodnutí (DD-49 A5) — místo 5 specializovaných tříd
 * (SPRUCE/OAK/BUSH/ROCK/GRASS_TUFT) jedna DECOR + string discriminator.
 *
 * Atributy:
 *  - `KIND` — string, jeden z `"spruce" | "oak" | "bush" | "rock" |
 *    "grass_tuft"`. Builder lookup v `createDecor` dispatchi.
 *  - `SEED` — integer, deterministický RNG seed pro variace (počet pater,
 *    velikost, rotace, …). Stejný SEED = stejný strom.
 *  - `SCALE` — float multiplikátor pro celkové rozměry (default 1.0).
 *    Builder po dokončení dělá `group.scale.multiplyScalar(SCALE)`.
 *
 * Pozice je spojitá (zděděno z COMPOSITES → CUBES, DD-12). Float scatter
 * v `decorate` (Fáze 4) umístí dekorace mezi voxely.
 */
export class DECOR extends COMPOSITES {
  constructor(id, name, x, y, z, kind, seed = 0, scale = 1.0, snowed = false, season = "summer", dead = false, description = "") {
    super(id, name, x, y, z, description);
    this.KIND   = kind;
    this.SEED   = seed;
    this.SCALE  = scale;
    // SNOWED (sez. 40 follow-up) — boolean, true pokud cell pod dekorací má
    // `_snow` postfix (= scatter v zasněženém biomu). Builder dle flagu přebarví
    // top element na SNOW_WHITE (sníh seshora). Propagovaný z `cells[i].snowed`
    // v `decorate()` (terrain.js) → `decoration.snowed` → DECOR.SNOWED.
    this.SNOWED = snowed;
    // SEASON (sez. 41 DD-50 follow-up) — string, jeden ze `SEASONS` enum.
    // Builder dle hodnoty volí listovou paletu pro listnaté KIND-y: oak/bush
    // v "autumn" → LEAF_AUTUMN (oranžová), jinak LEAF_GREEN/BUSH_GREEN. Spruce
    // (jehličnan) je season-invariant. Propagovaný z `world.SEASON` přes
    // `decorSpec.season` → `decorate()` → `decoration.season` → DECOR.SEASON.
    this.SEASON = season;
    // DEAD (sez. 43 Fáze 6) — boolean, true pro sušený strom v dry biomě.
    // Builder priorita: dead > snowed > autumn > default. Oak/spruce dead =
    // trunk-only (= skeleton bez listí/jehličí). Bush/flower dead = skip
    // (defoliated entity = empty). Palm/cactus dead = trunk-only s BARK_BROWN.
    // Stump/log dead je no-op (už dead wood). Propagace: `DEAD_PROB_BY_HUM`
    // → `decorate()` rng roll → `decoration.dead` → DECOR.DEAD.
    this.DEAD = dead;
  }
}

/**
 * LIQUID = tekutina (jezero, řeka, ...). **4. vrstva DD-25 extension** (sez. 45,
 * DD-54): Bloky / Voxely / Objekty / **Tekutiny** (po sez. 48 cleanup Linie / PATH
 * dropla — bez živého konzumenta v terrain scope). Sibling BLOCKS / COMPOSITES
 * pod CUBES (bez abstract rodiny dokud nepřibude 2. sourozenec, pak `LIQUIDS`
 * base class podle DD-27 vzoru).
 *
 * 1 instance = 1 connected basin (= seznam cells sdílejících hladinu + skupenství).
 * **Sez. 45 prototype:** single-cell instance (1 LIQUID = 1 water cell). Plný
 * BFS connected-components clustering je sub-prah — čeká na user signal
 * „100×100 jezera blikají" nebo perf need. Per target use case 20×20 dioráma
 * (memory `project-target-use-case`) je per-cell render visually correct
 * a bbox clustering by zaváděl z-fight artifakty (DD-53 attempt + revert lesson).
 *
 * Atributy:
 *   - `LEVEL` — Y hladiny (sémanticky čitelnější alias pro `Y` z CUBES). Drží
 *     oba kvůli budoucí extensions (např. mesh Y se může nudgnout proti
 *     z-fightu, `LEVEL` zůstane čistá logická hladina).
 *   - `TEMPERATURE` — `"frozen"` | `"liquid"` enum. Material decision (`_iceMat`
 *     vs. `_waterMat` v main.js). Budoucí extension: numerický °C pro permafrost
 *     gradient / lávu / termální zóny (YAGNI v sez. 45).
 *   - `BOUNDING_BOX` — `{ w, d }` axis-aligned XZ extent v 1C jednotkách. Pro
 *     prototype skeleton vždy `{ w: 1, d: 1 }`. Plný clustering by dal bbox
 *     přes connected cells.
 *   - `CELLS` — `[{ x, z }, ...]` cells obsazené tímto LIQUID. Pro prototype
 *     skeleton vždy `[{ x, z }]` (1 prvek). Pro DRY identifikaci / clear-path.
 *
 * Žádný `FLOW_DIRECTION` ve skeletonu — rivers/streams jsou sub-prah, atribut
 * by byl placeholder bez konzumenta (porušení DD-29 politiky „nové atributy
 * jen s živým konzumentem").
 *
 * Budoucí extension hooks („fyzika kapalin"):
 *   - TEMPERATURE numeric °C → gradient frozen↔melting, permafrost
 *   - FLOW_DIRECTION → rivers, streams (sekvence kontrolních bodů)
 *   - VISCOSITY → různé tekutiny (voda, láva, ropa, kyselina)
 *   - LEVEL animace (tide, monsoon flood, tání ledu na jaře)
 */
export class LIQUID extends CUBES {
  constructor(id, name, x, level, z, temperature, bbox, cells, description = "") {
    super(id, name, x, level, z, description);
    this.LEVEL       = level;
    this.TEMPERATURE = temperature;
    this.BOUNDING_BOX = bbox;
    this.CELLS      = cells;
  }
}

/**
 * WORLD = singleton DO (Data Object) pro globální atributy scény (DD-29 → DD-38).
 *
 * Re-introduce v sez. 32 — sez. 29 ho smazal jako prázdného singletona po DD-32
 * wipe `tree_sway` (jediný konzument `WIND_STRENGTH`). Nyní 2 živí konzumenti:
 *   - `DAY` ↔ sun mesh + directional light pozice/intensity
 *   - `DAY_SPEED` ↔ render loop auto-advance DAY
 *
 * Bez X/Y/Z (DD-01: model entita bez vizuální prostorové pozice). Atributy:
 *   - `DAY ∈ [0, 1)` — fáze 24h cyklu. 0=půlnoc, 0.25=východ, 0.5=poledne, 0.75=západ.
 *     Default 0.5 (poledne, scéna při bootu plně osvětlená). Mapping fix sez. 35
 *     (původní DD-38 měl 0=východ, 0.25=poledne — matematicky úsporné, ale prakticky
 *     matoucí pro user-facing slider).
 *   - `DAY_SPEED ∈ ℝ⁺` — kolik cyklů za sekundu. 0 = pauza. Default 0.001
 *     (sez. 40) — ~17 min/cyklus, pomalá animace slunce při bootu.
 *   - `LATITUDE ∈ {tropical, subtropical, temperate, polar}` — geografické pásmo
 *     (G2, sez. 35). Konzument: `SUN_TILT_BY_LATITUDE` v main.js (úhel slunce
 *     od svislice — rovník = vyšší slunce, póly = nižší). Default `temperate`.
 *   - `HUMIDITY ∈ {wet, mid, dry}` — vlhkostní pásmo (G2). Druhá osa biome matice
 *     4×3 (LATITUDE × HUMIDITY = 12 biomů). G2 MVP konzument: UI biome readout
 *     (display-only). G3 konzument: `surfaces` mix z biome lookup. Default `mid`.
 *   - `SEASON ∈ {spring, summer, autumn, winter}` — roční období (DD-50, sez. 40).
 *     Default `summer`. Konzumenti: `snowSpecForLatitude` + `waterSpecForClimate`
 *     pro temperate i polar biom — temperate (zima víc sněhu/ledu, léto bez),
 *     polar season-aware ablation od sez. 47 (winter max, summer méně sněhu/ledu).
 *     Tropical/subtropical season-invariant. Plus sky/sun tint v `updateAtmosphere`
 *     a `updateSun` pro temperate LATITUDE (sez. 47).
 *
 * Politika DD-29 stále platí: nové atributy přibudou jen s živým konzumentem.
 */
export class WORLD extends OBJECTS {
  constructor(id, name, description = "") {
    super(id, name, description);
    // DAY = fáze 24h cyklu, normalizovaná na [0, 1). Default poledne (sez. 35 fix).
    this.DAY = 0.5;
    // DAY_SPEED = cykly/s. 0 = paused. Engine v main.js inkrementuje
    // DAY v render loopu (`world.DAY = (world.DAY + dt * world.DAY_SPEED) % 1`).
    // Default 0.001 cyklů/s ≈ 1000 s/cyklus ≈ 17 min/cyklus (sez. 40 user wish)
    // — pomalá animace slunce při bootu, ne paused.
    this.DAY_SPEED = 0.001;
    // LATITUDE = geografické pásmo (G2, sez. 35). 4 enum hodnoty. Konzument:
    // `SUN_TILT_BY_LATITUDE` v main.js → výška slunce v poledni.
    this.LATITUDE = "temperate";
    // HUMIDITY = vlhkostní pásmo (G2). 3 enum hodnoty. Spolu s LATITUDE = 4×3
    // matice biomů (12 typů). G2 MVP: UI display-only. G3: driver `surfaces` mix.
    this.HUMIDITY = "mid";
    // SEASON = roční období (DD-50, sez. 40). 4 enum: "spring" | "summer" |
    // "autumn" | "winter". Default summer = "léto" (= dnešní bezsezonní stav).
    // Konzumenti: `snowSpecForLatitude(lat, season)` + `waterSpecForClimate
    // (lat, hum, season)` v terrain.js — temperate i polar season-aware
    // (sez. 47 plný scope; polar summer ablation 60 % snow + 40 % ice, winter
    // max). Tropical/subtropical season-invariant. Plus sky/sun tint v main.js
    // pro temperate LATITUDE (sez. 47). LEAF_AUTUMN paleta + DECOR_DENSITY
    // sezonní modifier (DD-51, sez. 41+43).
    this.SEASON = "summer";
    // DECOR_DENSITY_MULT (sez. 43 Fáze 6) — UI slider multiplikátor 0..2 nad
    // `DECOR_DENSITY` tabulkou (terrain.js). 1.0 = baseline (= tabulka beze
    // změny). 0.0 = bez decor (= holá scéna). 2.0 = max density (= sum > 1.0
    // znamená 100% fill rate jediným decor per cell — multi-decor je sub-prah,
    // viz InstancedMesh refactor v TODO Speculative). Konzument: `decorate()`
    // přes `decorSpec.densityMult` (readParams → buildScene path).
    this.DECOR_DENSITY_MULT = 1.0;
  }
}

