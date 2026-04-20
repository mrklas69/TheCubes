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
}

/**
 * BALLOON = konkrétní COMPOSITES reprezentující horkovzdušný balón.
 *
 * Vizualizace: vak (koule) + 4 lana + koš. Vak je barevný podle atributu
 * `COLOR` (JS number 0xRRGGBB, stejně jako u CCUBES) — lana a koš mají
 * fixní barvy definované v enginu.
 *
 * M4 demonstruje **jednotný souřadný systém** (DD-12): balón má float
 * pozici typicky mimo celé buňky gridu (např. Y = 4 — vysoko nad scénou),
 * zatímco CCUBES/TCUBES voxely žijí na intech. Obě třídy sdílejí
 * stejný mateřský CUBES, pouze renderer snapuje voxely a ponechá
 * COMPOSITES na floatu.
 *
 * V M4 je balón **statický** — pohyb vyžaduje mechanismus reakce na TIME
 * (DD-04), což je samostatné téma.
 */
export class BALLOON extends COMPOSITES {
  constructor(id, name, x, y, z, color, description = "") {
    super(id, name, x, y, z, description);
    // Barva vaku jako JS number 0xRRGGBB. Lana a koš nejsou atribut — fixní.
    this.COLOR = color;
  }
}
