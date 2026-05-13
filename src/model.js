// src/model.js
// Definice základních tříd modelu TheCubes.
// Viz docs/GLOSSARY.md a docs/DESIGN_DECISIONS.md (DD-01, DD-02, DD-12, DD-13).

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
    // ANIMATE = recept na chování v čase. `null` = statický objekt (default).
    // Objekt `{ kind: "<string>", ...params }` = engine dispatch podle `kind`
    // (izomorfně s DD-14 pattern pro vizuální atributy). Konkrétní interpretace
    // žije v `src/main.js` (updateAnimations) — model zůstává datový (DD-11).
    // Viz DD-15.
    this.ANIMATE = null;
  }
}

/**
 * CUBES = OBJECTS s polohou v prostoru. Default vizualizace = voxel krychle
 * se šachovnicovou texturou (DD-07 — idiom "vizuál není definován").
 *
 * Pozor na terminologii: "CUBES" je projektová značka, ne doslovný tvar.
 * Potomci override vizualizaci — CCUBES (plochá barva), TCUBES (per-face
 * textury), SPRITES (2D billboard ke kameře), COMPOSITES (3D mesh z primitivů).
 * Všichni ale sdílejí souřadný systém.
 *
 * DD-12: X, Y, Z jsou JS number (float). Voxelové potomky (CCUBES, TCUBES)
 * si v rendereru pozici zaokrouhlí na celé (snap-to-grid), nevoxelové
 * (SPRITES, COMPOSITES) si spojitou pozici ponechají.
 *
 * `extends OBJECTS` = dědičnost v JS. `super(...)` uvnitř constructoru
 * volá constructor rodičovské třídy (musí být první, než se použije `this`).
 */
export class CUBES extends OBJECTS {
  constructor(id, name, x, y, z, description = "") {
    super(id, name, description);
    // Souřadnice ve sdíleném souřadném systému (float, DD-12).
    // Voxel renderer je snapne na int; SPRITES/COMPOSITES je nechají spojité.
    this.X = x;
    this.Y = y;
    this.Z = z;
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
 * 4-vrstvá taxonomie scény, vrstva 1). Sdílí mezi sebou: snap-to-int v rendereru
 * (DD-12), procedurální geometrie v engine, sdílená paleta `:named-textures`
 * přes `faceMaterialFor` (DD-14). Potomci se liší tvarem: krychle (TCUBES,
 * 6 faces), klín (TRRAMPS, 5 faces), jehlan (TTRAMPS, 4 faces), tunel (TTUNELS).
 *
 * `ORIENTATION` (DD-26 sez. 17) — float ∈ [0, 360) ve **stupních**, rotace
 * kolem Y osy. Default 0. Engine převádí `mesh.rotation.y = ORIENTATION * π/180`.
 * Pro rampy/tunely se v praxi používají násobky 90° (cardinální orientace
 * svahu / osy tunelu), ale typ je float — sdílený s COMPOSITES, kde dekorace
 * mívají náhodnou rotaci pro organický vzhled.
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
 * `TEXTURE_BOTTOM`, …) přes `faceMaterialFor` dispatch — pole `material[6]`.
 * DD-36 atlas pipeline sloučila 6 facelet do 1 CanvasTexture per kind. DD-41
 * (sez. 34) atlas nahradila vertex colors v geometrii → drop `textures` arg
 * + TEXTURE_* atribut z modelu (čistě data, žádné textury).
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
 * TTUNELS = Tunnel Block = 1C blok s klenutým průchozím tunelem v jedné ose.
 * Geometricky: kvádr 1×1×1 minus obdélníkový spodek + půlkruhový oblouk
 * extrudovaný podél osy průchodu (= „od krychle odečtený válec a kvádr").
 * Default orientace (`ORIENTATION=0`): tunel podél osy X, vstupy na +X a −X.
 *
 * Profil tunelu v rovině YZ (kolmé k ose průchodu):
 *  - Spodní obdélníková část: Y=−0.5..0, Z=−0.3..+0.3 (= šířka 0.6, výška 0.5)
 *  - Horní půlkruh: střed v (0, 0), poloměr 0.3 (= klenba sahá k Y=+0.3)
 *  - Nad obloukem zůstává „klenba bloku" Y=+0.3..+0.5 plný materiál
 *
 * 4 faces / nátěry:
 *  - **TEXTURE_TOP** — vrchní vnější stěna (typicky `:grass-top`, jako grass cube
 *    pohled shora).
 *  - **TEXTURE_SIDES** — vnější boční stěny (NORTH + SOUTH) + 2 vstupní stěny
 *    s vyříznutým profilem (typicky `:dirt`).
 *  - **TEXTURE_WALLS** — vnitřní 2 boční stěny tunelu (na Z=±0.3, Y=−0.5..0).
 *  - **TEXTURE_CEILING** — vnitřní klenutý strop (12 segmentů půlkruhu).
 *
 * Důležité: blok nemá vnější bottom ani vnitřní floor. Tunel je „průhledný
 * dolů" — postava uvnitř i pohled odshora vidí přímo top voxelu pod tunelem
 * (typicky grass podlaha diorámy). Vyžaduje, aby blok pod tunelem byl plný.
 *
 * `ORIENTATION` (DD-26, stupně ∈ [0, 360)) — rotace bloku kolem osy Y. 0° =
 * osa tunelu X (default), 90° = osa Z, atd.
 */
export class TTUNELS extends BLOCKS {
  constructor(id, name, x, y, z, textures = {}, orientation = 0, description = "") {
    super(id, name, x, y, z, description);
    this.TEXTURE_TOP     = textures.TOP     ?? null;
    this.TEXTURE_SIDES   = textures.SIDES   ?? null;
    this.TEXTURE_WALLS   = textures.WALLS   ?? null;
    this.TEXTURE_CEILING = textures.CEILING ?? null;
    this.ORIENTATION     = orientation;
  }
}

/**
 * SPRITES = potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy
 * otočený ke kameře). Sourozenec CCUBES/TCUBES/COMPOSITES — liší se
 * vizuálním módem, ne polohou. Viz DD-13.
 *
 * Atribut `ASSET`:
 *  - `null` / nezadáno → fallback šachovnicový billboard (idiom DD-07,
 *    „vizuál není definován").
 *  - `string` → text vykreslený jako dialogová bublina (canvas-generovaný
 *    obrázek, engine si z textu vyrobí CanvasTexture).
 *  - (pozdější rozšíření: URL na PNG, recept pro canvas, …).
 *
 * Pozice spojitá (DD-12) — sprite se nesnapuje na grid; 2D billboard dává
 * smysl i mezi voxely (dialog nad stromem apod.). V M5 stojí na vlastních
 * absolutních souřadnicích; parent-child vazba (follow parent + offset) je
 * samostatné téma na pozdější milník.
 */
export class SPRITES extends CUBES {
  constructor(id, name, x, y, z, asset = null, description = "") {
    super(id, name, x, y, z, description);
    // ASSET = popis obsahu bubliny. `null` → fallback šachovnice.
    // Konkrétní interpretaci (string → text bubble, URL → obrázek, …)
    // řeší engine v `createSpriteFor`. Model zůstává datový (DD-11).
    this.ASSET = asset;
    // SPEAKER = volitelný cíl dynamického ocásku bubliny. `null` (default)
    // → bublina bez ocásku (plochý obdélník). Jinak engine vygeneruje 3D
    // ocásek (tenký jehlan) mířící z bubliny na cíl. Dva formáty (DD-16):
    //  - instance OBJECTS-potomka (má `.X`, `.Y`, `.Z`) → cíl = pozice
    //    instance + `SPEAKER_OFFSET_Y`. Dynamické — když se instance pohne
    //    (např. orbit_stadium mutuje `object3d.position`), ocásek sleduje
    //    aktuální world pozici přes `meshByInstance` lookup.
    //  - `{ x, y, z }` literál → pevný bod v prostoru (offset se ignoruje).
    // Vyplňuje se po konstrukci: `sprite.SPEAKER = tree1;` — stejný pattern
    // jako `ANIMATE`. Model zůstává datový (DD-11), dispatch v enginu.
    this.SPEAKER = null;
    // SPEAKER_OFFSET_Y = vertikální posun nad pozici `SPEAKER` (instance varianta).
    // Default `0.5` cílí na vrch standardního voxelu 1×1×1 centrovaného v Y=0.
    // Pro větší COMPOSITES (budoucí potomci) uživatel nastaví ručně. Pro
    // literální `{x,y,z}` SPEAKER nemá význam (cíl je přesně zadaný bod).
    this.SPEAKER_OFFSET_Y = 0.5;
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
 * PATH = 1D křivka (DD-25 vrstva 3 — Linie). Catmull-Rom spline rendrovaný
 * jako plochý strip mesh šířky ~0.5 j s drobným Y offsetem nad terrain
 * (proti z-fighting).
 *
 * Atributy:
 *  - `KIND` — string, určuje surface texturu (default `"dirt"` = štěrk).
 *  - `POINTS` — pole `[x, y, z]` kontrolních bodů ve **world** souřadnicích
 *    (instance.X/Y/Z se nepoužívá; engine staví strip mesh přímo z POINTS).
 *
 * Pozice: instance.X/Y/Z = (0, 0, 0) — cesta žije v world coords (POINTS).
 */
export class PATH extends CUBES {
  constructor(id, name, points, description = "", kind = "dirt") {
    super(id, name, 0, 0, 0, description);
    this.KIND   = kind;
    this.POINTS = points;
  }
}

/**
 * TIMER = nevizuální potomek OBJECTS — spouští `ACTION` v diskrétních
 * intervalech měřených v `TIME.tick` (sekundy, DD-04). První skutečná
 * reakce na TIME.tick v projektu (do sez. 8 tiky jen tiktaly v HUDu).
 *
 * Atributy:
 *  - `INTERVAL` — počet ticků mezi vystřelením ACTION. Např. 5 = každých 5 s.
 *  - `ACTION` — recept `{ kind, ...params }` stejně strukturovaný jako
 *    `ANIMATE` (DD-15); engine dispatchuje přes `ACTIONS[kind]`. Default
 *    `null` (TIMER bez ACTION je legitimní pro budoucí plánovač, teď no-op).
 *    Aktuální `kind`y (DD-17): `toggle` (flip bool atributu cíle), `set`
 *    (nastaví atribut cíle na hodnotu).
 *
 * Izomorfismus s ANIMATE: obě třídy drží *recept*, ne chování. Rozdíl:
 * `ANIMATE` žije na libovolné instanci a běží per-frame (plynule), TIMER
 * žije jako samostatná entita a firuje diskrétně per-tick. Oba dispatchují
 * engine-side z `kind` → funkce mapy. Model nezná dispatch implementaci (DD-11).
 *
 * Nevizuální = infotip a 3D scéna TIMER neukazují; observable je pouze
 * skrze efekt jeho ACTION (např. balón se rozsvítí). Pozdější milník:
 * HUD list aktivních timerů, nebo vlastní SPRITES reprezentace.
 */
/**
 * COUNTER = nevizuální potomek OBJECTS — stav (integer VALUE) mutovaný
 * automaticky každý `TIME.tick`. Druhý nevizuální potomek po TIMER —
 * demonstruje, že „nevizuální" nemusí znamenat „bez observability":
 * COUNTER je viditelný v **HUD** (ne v 3D scéně), engine při registraci
 * dynamicky přidá řádek do `#hud` elementu.
 *
 * Atributy:
 *  - `VALUE` — aktuální hodnota (integer, libovolná; default 0).
 *  - `INCREMENT` — o kolik se `VALUE` změní každý tick. Může být záporné
 *    (countdown). Default 1.
 *
 * Use case: skóre, odpočet, uplynulé ticky od události, frame counter.
 *
 * Kombinace s TIMER: TIMER.ACTION { kind: "set", target: counter,
 * attr: "VALUE", value: 0 } ho může kdykoli resetovat. Obecně je
 * COUNTER.VALUE **datové pole** jako kterékoli jiné — TIMER.ACTION /
 * ruční mutace / click handler do něj smí sahat paralelně (stejná
 * filozofie jako BALLOON.LIT v DD-17).
 */
export class COUNTER extends OBJECTS {
  constructor(id, name, startValue = 0, increment = 1, description = "") {
    super(id, name, description);
    this.VALUE = startValue;
    this.INCREMENT = increment;
  }
}

export class TIMER extends OBJECTS {
  constructor(id, name, interval, description = "") {
    super(id, name, description);
    // INTERVAL = počet ticků mezi vystřelením ACTION. Musí být ≥ 1.
    this.INTERVAL = interval;
    // ACTION = recept `{ kind, target, attr, value? }`. Vyplnit post-hoc:
    // `timer.ACTION = { kind: "toggle", target: balloon, attr: "LIT" };`
    this.ACTION = null;
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
 *   - `DAY ∈ [0, 1)` — fáze 24h cyklu. 0=východ, 0.25=poledne, 0.5=západ, 0.75=půlnoc.
 *     Default 0.25 (poledne, scéna při bootu plně osvětlená).
 *   - `DAY_SPEED ∈ ℝ⁺` — kolik cyklů za sekundu. 0 = pauza. Default 0 (KISS,
 *     user explicit zapne přes #settings slider nebo `window.world.DAY_SPEED = 0.05`).
 *
 * Politika DD-29 stále platí: nové atributy přibudou jen s živým konzumentem.
 */
export class WORLD extends OBJECTS {
  constructor(id, name, description = "") {
    super(id, name, description);
    // DAY = fáze 24h cyklu, normalizovaná na [0, 1). Default poledne.
    this.DAY = 0.25;
    // DAY_SPEED = cykly/s. 0 = paused (default). Engine v main.js inkrementuje
    // DAY v render loopu (`world.DAY = (world.DAY + dt * world.DAY_SPEED) % 1`).
    this.DAY_SPEED = 0;
  }
}

