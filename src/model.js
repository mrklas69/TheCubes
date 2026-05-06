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
export class CCUBES extends CUBES {
  constructor(id, name, x, y, z, color, description = "") {
    super(id, name, x, y, z, description);
    // Barva dlaždice jako JS number 0xRRGGBB
    this.COLOR = color;
  }
}

/**
 * TCUBES = Texture Cubes. Voxel s **per-face texturami** — každá ze 6 stran
 * může mít vlastní obsah. Stejně jako CCUBES je to voxel (pozice snap-to-grid
 * v rendereru, DD-12); liší se vizuálním módem — plocha barva vs. 6 ploch
 * s různou texturou. Viz DD-13.
 *
 * Atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`,
 * `TEXTURE_EAST`, `TEXTURE_WEST` — jeden per světovou stranu.
 *
 * Formát jednotlivé strany (dispatch v enginu podle typu):
 *  - `null` / nezadáno → fallback šachovnice (DD-07). Nevyplněná strana
 *    se zobrazí stejně jako mateřská CUBES.
 *  - `number` 0xRRGGBB → plocha barva celé strany.
 *  - `string` začínající `#` (`"#ff0000"`) → plocha barva z hex řetězce.
 *  - jiný `string` (emoji, text `"🌳"`, `"N"`) → canvas s textem vycentrovaným.
 *  - (pozdější rozšíření: URL na PNG, recept generátoru, …).
 *
 * Mapování světových stran na osy (Three.js, Y-up, +Z = k divákovi):
 *  TOP = +Y, BOTTOM = −Y, EAST = +X, WEST = −X, SOUTH = +Z, NORTH = −Z.
 *
 * Constructor přijímá objekt `{ TOP, BOTTOM, NORTH, SOUTH, EAST, WEST }`.
 * Chybějící klíče zůstanou `null` → fallback šachovnice. Nullish koalescent
 * `??` vrátí pravý operand jen pro `null`/`undefined` (ne pro 0 nebo ""),
 * což je důležité — číslo 0 (černá 0x000000) je validní barva.
 */
export class TCUBES extends CUBES {
  constructor(id, name, x, y, z, textures = {}, description = "") {
    super(id, name, x, y, z, description);
    this.TEXTURE_TOP    = textures.TOP    ?? null;
    this.TEXTURE_BOTTOM = textures.BOTTOM ?? null;
    this.TEXTURE_NORTH  = textures.NORTH  ?? null;
    this.TEXTURE_SOUTH  = textures.SOUTH  ?? null;
    this.TEXTURE_EAST   = textures.EAST   ?? null;
    this.TEXTURE_WEST   = textures.WEST   ?? null;
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
    // Pro větší COMPOSITES (TREE pixel varianty, VOXEL_MODEL) uživatel nastaví ručně —
    // např. `dialog.SPEAKER_OFFSET_Y = 1.8` cílí do koruny stromu. Pro
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
  // Žádné další atributy — značkovací třída pro dispatch.
  // Konkrétní potomci (TREE, VOXEL_MODEL) přidávají vlastní atributy.
}

/**
 * TREE = konkrétní COMPOSITES reprezentující strom.
 *
 * Atribut `KIND` (string) řídí dispatch v enginu na konkrétní sub-builder.
 * Pixelové varianty (BoxGeometry voxely 0.125 j): `"spruce"` (default),
 * `"oak"`, `"birch"`, `"palm"`, `"bush"`, `"cypress"`, `"willow"`,
 * `"bonsai"`, `"dead"`, `"maple"`. Podporují `ANIMATE.kind: "tree_sway"`
 * (kymácení ve větru, height-weighted per-voxel mutace).
 *
 * Pattern dispatchu KIND je izomorfní s `ANIMATE.kind` (DD-15) —
 * model drží recept (string klíč), engine staví mesh.
 */
export class TREE extends COMPOSITES {
  constructor(id, name, x, y, z, description = "", kind = "spruce") {
    super(id, name, x, y, z, description);
    this.KIND = kind;
  }
}

// Non-voxel třídy odstraněny v sez. 15 (DD-23 — „all voxel" pivot):
// HOUSE, ROCK, CLOUD, BALLOON, TUNNEL_ARCH, WAREHOUSE, TRAIN. Jejich buildery
// používaly Cylinder/Cone/Sphere/Torus/Icosahedron primitivy, což je v rozporu
// s identitou projektu „Kostičky". Až bude potřeba pixel-voxel ekvivalent,
// vznikne nová třída se subloaderem v TREE_BUILDERS-style dispatchu.
//
// Humanoidní třídy (CHARACTER, NOODLE, STICKMAN) byly přesunuty do
// samostatného projektu ./source/Stickman (sez. 14). DD-17/18/19/20 zůstávají
// v immutable logu jako historický kontext.

/**
 * VOXEL_MODEL = obecný COMPOSITES, který načte mesh ze souboru `.obj` (s
 * `.mtl` materiálem a `.png` paletou) — typicky export z MagicaVoxelu.
 * Engine asynchronně dotáhne soubor a vyplní `Group` o načtený `Object3D`.
 *
 * Atributy:
 *  - `ASSET` — basename souboru v `./assets/` (např. `"tunel"` → `tunel.obj`
 *    + `tunel.mtl` + `tunel.png`).
 *  - `SCALE` — uniformní scale faktor (DD-22 konvence: **0.625**, tj. 1 MV
 *    voxel = 1/16 TC voxelu = 6.25 cm. Velikost objektu řídí MV grid; tunel
 *    48³ MV se vyrenderuje jako 3×3×3 TC).
 *  - `ROTATION_Y` — natočení kolem Y osy v radiánech (default 0).
 *
 * Engine po načtení **auto-centruje** model v XZ a posune Y tak, aby spodek
 * mesh seděl na `instance.Y` → instance.Y = world Y land surface.
 *
 * Use case: importovat hotové 3D modely z externích nástrojů bez nutnosti
 * ručně kódit COMPOSITES dispatch.
 */
export class VOXEL_MODEL extends COMPOSITES {
  constructor(id, name, x, y, z, asset, scale = 0.625, rotationY = 0, description = "") {
    super(id, name, x, y, z, description);
    this.ASSET = asset;
    this.SCALE = scale;
    this.ROTATION_Y = rotationY;
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
