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
  // Žádné další atributy — zatím jen značkovací třída pro dispatch.
  // Konkrétní potomci (Tree, Balloon) mohou přidat vlastní atributy.
}

/**
 * TREE = konkrétní COMPOSITES reprezentující strom.
 *
 * Vizualizace: kmen (válec) + tři kužely koruny v různé výšce.
 * Zatím žádné vlastní atributy — default barvy určuje engine.
 * Pokud budeš chtít paletu (SPRING/AUTUMN) nebo velikost, přidej
 * sem atributy a engine si je přečte v dispatchi.
 */
export class TREE extends COMPOSITES {
  // Prázdná třída — default strom. Atributy lze doplnit později.
  // Podporovaný `ANIMATE.kind`: `tree_sway` (viz dispatch v main.js).
}

/**
 * HOUSE = konkrétní COMPOSITES reprezentující jednoduchý domek.
 *
 * Vizualizace: kvádr stěn + jehlanová střecha (ConeGeometry, 4 segmenty).
 * Atribut `COLOR` (JS number 0xRRGGBB) barví **stěny**; barva střechy je
 * fixní v enginu (rezavá červená — typický idiom střešní tašky).
 *
 * Bez `ANIMATE` je dům statický — typická dekorace scény (M8). Pohyblivá
 * varianta (např. `kind: "rotate"` na Y) by fungovala bez úprav.
 */
export class HOUSE extends COMPOSITES {
  constructor(id, name, x, y, z, color, description = "") {
    super(id, name, x, y, z, description);
    // Barva stěn jako JS number 0xRRGGBB. Střecha má fixní barvu — pokud
    // budeme chtít barevnou střechu, přidá se druhý atribut (např. `ROOF`).
    this.COLOR = color;
  }
}

/**
 * CLOUD = konkrétní COMPOSITES reprezentující mrak.
 *
 * Vizualizace: shluk překrývajících se koulí (SphereGeometry) s bílou barvou.
 * Bez vlastních atributů — barva i tvar jsou v enginu.
 *
 * Typicky se umisťuje vysoko nad scénou (Y > 3) s `ANIMATE.kind = "drift"`
 * (lineární pohyb po vodorovné ose s wrap-around) → „mrak letí po obloze".
 * Statický mrak je legitimní (bez ANIMATE), je to jen méně živá scéna.
 */
export class CLOUD extends COMPOSITES {
  // Prázdná třída — default mrak. Atributy lze doplnit později (size, hustota).
  // Podporovaný `ANIMATE.kind`: `drift` (viz dispatch v main.js).
}

/**
 * BALLOON = konkrétní COMPOSITES reprezentující horkovzdušný balón.
 *
 * Vizualizace: vak (koule) + 4 lana + koš. Vak je barevný podle atributu
 * `COLOR` (JS number 0xRRGGBB, stejně jako u CCUBES) — lana a koš mají
 * fixní barvy definované v enginu.
 *
 * Jednotný souřadný systém (DD-12): balón má float pozici typicky mimo celé
 * buňky gridu (např. Y = 4 — vysoko nad scénou), zatímco CCUBES/TCUBES voxely
 * žijí na intech. Obě třídy sdílejí stejný mateřský CUBES, pouze renderer
 * snapuje voxely a ponechá COMPOSITES na floatu.
 *
 * Podporovaný `ANIMATE.kind`: `balloon_bob` (viz dispatch v main.js).
 */
export class BALLOON extends COMPOSITES {
  constructor(id, name, x, y, z, color, description = "") {
    super(id, name, x, y, z, description);
    // Barva vaku jako JS number 0xRRGGBB. Lana a koš nejsou atribut — fixní.
    this.COLOR = color;
  }
}
