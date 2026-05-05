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
    // Pro větší COMPOSITES (TREE, BALLOON, HOUSE) uživatel nastaví ručně —
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
 * ROCK = konkrétní COMPOSITES reprezentující kámen / balvan.
 *
 * Vizualizace: shluk 3–4 nízkopolygonových koulí (IcosahedronGeometry,
 * detail = 0 = 20 trojúhelníků) v šedé paletě. Flat shading dává ostré
 * faset — působí jako tesaný balvan, ne hladký kamínek. Atribut `COLOR`
 * (JS number 0xRRGGBB, default šedá v enginu) umožní variaci „bazalt /
 * žula / pískovec" bez nové třídy.
 *
 * Uzavírá základní COMPOSITES čtveřici TREE + BALLOON + HOUSE + CLOUD + ROCK
 * (organický / mechanický / stavební / atmosférický / geologický).
 *
 * Bez `ANIMATE` je kámen statický — přirozený default pro dekorační prvek.
 */
export class ROCK extends COMPOSITES {
  constructor(id, name, x, y, z, color = 0x808080, description = "") {
    super(id, name, x, y, z, description);
    // Barva kamene jako JS number 0xRRGGBB. Default 0x808080 = neutrální šedá.
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

// Humanoidní třídy (CHARACTER, NOODLE, STICKMAN) byly přesunuty do
// samostatného projektu ./source/Stickman (sez. 14 cleanup). DD-18/19/20
// zůstávají v immutable logu jako historický kontext.

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
    // LIT = boolean „zapnutý lampión". `false` (default) → vak tmavý, bez
    // zdroje světla. `true` → engine rozjede emissive záři vaku a aktivuje
    // přidružený `PointLight` (odkaz drží `group.userData.parts.light`).
    // Přechod je per-frame exponenciálně plynulý (fade ~0.5 s), ne instantní.
    // Toggle přes `click` na mesh balónu nebo přes TIMER.ACTION. Viz DD-17.
    this.LIT = false;
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
