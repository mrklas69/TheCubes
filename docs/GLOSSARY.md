# Glossary

Canonical terminologie projektu TheCubes. Stav po sez. 17–22 (DD-26 sjednocená `ORIENTATION`, DD-27 `PATH` + LINES vrstva 3, DD-28 sjednocená Y konvence, DD-29 `WORLD` singleton, **DD-30 pivot na 3D factory-observer toy** s Voidspan inspirací, **DD-31 Resource model & FACILITY** + PATH transport fáze B sez. 22). Smazané třídy a koncepty žijí v immutable diary jako historický kontext — zde se neuvádějí.

**Identita projektu po DD-30 (sez. 21):** model-first factory-observer toy s OOP modelem jako runtime. Cíl = **pozorování ukazatelů** (observer game, Voidspan-derived Perpetual Observer Simulation axiom), ne win/loss. Sandbox/free-building aspekt zůstává (editor MVP plánovaný v Phase C). Pixel-voxel apartmá (TREE 10 KIND, GRASS_TUFT, ROCK_PIXEL, LOG, `populateNorthernScene`, `tree_sway`, `:grass-top`) je v Phase D cleanup queue — TheCubes nadále nevyžaduje organickou dekoraci, identita kostek = mřížkové fasility.

## Model

### Kořenové třídy

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`, `ANIMATE` (default `null`, viz níž). Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (float, DD-12 — sdílený souřadný systém; voxelové potomky si pozici v rendereru zaokrouhlí). Default vizualizace = voxel krychle se šachovnicí (DD-07), potomci override. Pojem „cube" je projektová značka, ne technická klasifikace.

### Bloky (BLOCKS rodina, DD-25)

- **BLOCKS** *(abstract)* — značkovací parent pro 1C grid-aligned bloky tvořící krajinu/geologii. Sdílí: snap-to-int v rendereru (DD-12), procedurální `BufferGeometry` v engine, `faceMaterialFor` dispatch (DD-14), `:named-textures` paleta, atribut `ORIENTATION`. Konkrétní potomci se liší tvarem a počtem faces. *(Sez. 16, DD-25.)*
- **CCUBES** (color cubes) — potomek BLOCKS s atributem `COLOR` (JS number 0xRRGGBB). Plochá barva všech 6 ploch. Nahrazuje dřívější `TERRAIN` (DD-13). *(M2.)*
- **TCUBES** (texture cubes) — potomek BLOCKS s šesti atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`, `TEXTURE_EAST`, `TEXTURE_WEST`. Hodnota každé strany: `null` → fallback šachovnice (DD-07), `number` 0xRRGGBB → plocha barva, string hex (`"#rrggbb"`) → barva, string s prefixem `:` → pojmenovaná procedurální textura (`":grass-top"`, viz níž), jiný string → canvas s textem/emoji vycentrovaným. Mapování světových stran na Three.js osy: TOP=+Y, BOTTOM=−Y, EAST=+X, WEST=−X, SOUTH=+Z, NORTH=−Z. Dispatch viz DD-14. *(M6.)*
- **TRRAMPS** (triangular rectangular ramps) — potomek BLOCKS = trojboký hranol (= pravoúhlý klín). 5 face atributů: `TEXTURE_SLOPE` (svah), `TEXTURE_BOTTOM`, `TEXTURE_BACK` (vertikál nad apex sloupcem), `TEXTURE_LEFT`, `TEXTURE_RIGHT` (2 boční trojúhelníky). Plus `ORIENTATION`. Default svah klesá k +Z (apex sloupec na −Z). *(Sez. 16, DD-25.)*
- **TTRAMPS** (triangular triangular ramps = trirectangular tetrahedron) — potomek BLOCKS = trojboký jehlan se 3 mutually perpendicular pravoúhlými stěnami sdílejícími roh `C`, čtvrtá stěna SLOPE = rovnostranný trojúhelník (hrana √2). 4 face atributy: `TEXTURE_SLOPE`, `TEXTURE_BOTTOM`, `TEXTURE_BACK`, `TEXTURE_LEFT`. Plus `ORIENTATION`. Použití: rohové rampy (corner ramps), stoupání ze 3 sousedních směrů na jeden vyvýšený roh. *(Sez. 16, DD-25.)*
- **TDRAMP** (diagonal ramp) — potomek BLOCKS = 1C blok bez jednoho horního rohu („low corner"). Krychle 1×1×1 mínus tetrahedron odříznutý na 1 z 4 horních rohů → 7-vrcholový polyhedron: čtvercová podstava + trojúhelníková „horní podstava" (TOP_TRI s 3 ze 4 horních rohů) + diagonální SLOPE z low_bot k opačné horní hraně (NW_top−SE_top, „lomená rampa" sdílí hranu s TOP_TRI). 7 faces se 5 material groups: `TEXTURE_SLOPE`, `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_WALL_FULL` (2 plné quad stěny opačně k low corner), `TEXTURE_WALL_TRI` (2 trojúhelníkové vert. stěny u low corner). Plus `ORIENTATION` (DD-26 + DD-34): default low corner v lokálním (−X, −Z) = terrain.js „SW" → peak v rohu opačně = „EN" (+X, +Z). Použití: vyhlazení **3-cell convex peak** stepu (A má 2 sousední direct vyšší + diag corner vyšší) nebo **L-shape** stepu (2 sousední direct vyšší bez diag peaku). Strict-dominuje 1× TRRAMPS edge — 2 přístupy + 2 zakryté stěny v 1 mesh. *(Sez. 26, DD-35.)*
- **TTUNELS** (tunnel blocks) — potomek BLOCKS = 1C blok s klenutým průchozím tunelem v jedné ose. Geometricky: kvádr 1×1×1 mínus „obdélník + půlkruh extrudovaný v ose průchodu" („od krychle odečtený válec a kvádr"). 4 face atributy: `TEXTURE_TOP` (vrchní vnější stěna, typicky `:grass-top`), `TEXTURE_SIDES` (boční vnější stěny + 2 entry walls s vyříznutým profilem), `TEXTURE_WALLS` (vnitřní 2 boční stěny), `TEXTURE_CEILING` (vnitřní klenutý strop, 12 segmentů). **Bez dna** — tunel je „průhledný dolů" na top voxelu pod ním. Plus `ORIENTATION`. *(Sez. 16, DD-25.)*

### Atribut ORIENTATION (DD-26)

`ORIENTATION` — float ∈ [0, 360) ve **stupních**, rotace kolem Y osy. **Sjednoceno** napříč BLOCKS i COMPOSITES rodinou (sez. 17, DD-26). Engine převádí: `mesh.rotation.y = ORIENTATION * (Math.PI / 180)`. Default 0.

- **BLOCKS rodina** (TRRAMPS, TTRAMPS, TTUNELS) — v praxi jen násobky 90° (cardinální orientace svahu / osy tunelu): 0, 90, 180, 270. User „+90 CW" = `ORIENTATION −= 90` (mod 360).
- **COMPOSITES rodina** (TREE, GRASS_TUFT, ROCK_PIXEL, LOG, VOXEL_MODEL) — typicky náhodná pro organický vzhled (`populateNorthernScene` přiřadí `rng() * 360` každé dekoraci).

Historicky (před DD-26, sez. 16) byla `BLOCKS.ORIENTATION` integer enum 0..3 a `LOG/VOXEL_MODEL.ROTATION_Y` v radiánech. DD-26 sjednotil. Migrace `ramp_0` z 1 → 90.

### Ostatní potomky CUBES

- **SPRITES** — potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy otočený ke kameře). Atributy: `ASSET` (`null` → fallback šachovnice; `string` → canvas-generovaná dialogová bublina s textem v zaobleném obdélníku), `SPEAKER` (volitelný cíl dynamického 3D ocásku — instance nebo `{x,y,z}` literál, viz DD-16), `SPEAKER_OFFSET_Y` (vertikální offset nad cílovou instanci, default 0.5). Použití: dialog bubble, label, 2D entita. Pozice float (DD-12), sprite stíny neumí (záměr). *(M5 + M8+ dynamický ocásek.)*
- **COMPOSITES** — potomek CUBES vizualizovaný jako 3D mesh ze složek (`Group` s více meshi). Po DD-23 (sez. 15) jsou složky výhradně **voxely** (BoxGeometry); žádné Cylinder/Cone/Sphere/Torus/Icosahedron. Pozice spojitá (float), bez snap-to-grid; Y = world surface (DD-28). Aktivní potomci (sez. 17–18): TREE (10 KIND-ů), GRASS_TUFT, ROCK_PIXEL, LOG, VOXEL_MODEL.

### Konkrétní COMPOSITES

- **TREE** — pixel-voxel strom složený z BoxGeometry voxelů velikosti `0.125 j` (= 1/8 TC voxelu = 12.5 cm). Atribut `KIND` (string, default `"spruce"`) řídí dispatch přes `TREE_BUILDERS` lookup tabulku v engine — izomorfně s `ANIMATORS[kind]` (DD-15). 10 KIND-ů: `spruce`, `oak`, `birch`, `palm`, `bush`, `cypress`, `willow`, `bonsai`, `dead`, `maple`. Sdílená cache `_treeBoxGeom` + `_treeMatCache` (paleta `TREE_C`). Kymácení ve větru přes `tree_sway` animátor (height-weighted, DD-15 a níž). *(M3, sez. 15 přepis na pixel-voxel.)*
- **GRASS_TUFT** — pixel-voxel chomáč trávy / kapradiny na zemi (vrstva 2 DD-25). KIND-y: `micro` (1×1×1 voxel), `short` (3-4 voxely trsu), `fern` (5-listá kapradina). *(Sez. 17.)*
- **ROCK_PIXEL** — pixel-voxel kámen / balvan. Náhrada za sez. 15 smazanou ROCK třídu (icosahedron, DD-23). KIND-y: `micro` (1 voxel oblázek), `small` (5 voxelů shluk), `medium` (10 voxelů cluster), `mossy` (medium s mechovou záplatou). *(Sez. 17.)*
- **LOG** — pixel-voxel padlý kmen / pařez. KIND-y: `stump` (1 voxel pařízek), `birch` (bílá kůra s černými skvrnami, 6 voxelů), `pine` (hnědý kmen s tmavšími prstenci, 5 voxelů). Natočení v ploše XZ řídí ORIENTATION (DD-26). *(Sez. 17.)*
- **VOXEL_MODEL** — generický COMPOSITES, který asynchronně načte mesh z `.obj` (s `.mtl` materiálem a `.png` paletou), typicky export z **MagicaVoxelu**. Atributy: `ASSET` (basename v `./assets/`, např. `"tunel-grass"`), `SCALE` (default **`0.625`** — DD-22). Rotaci kolem Y řídí zděděný `ORIENTATION` (DD-26, stupně). Engine po načtení **auto-centruje** XZ + posune Y bottom na `instance.Y` (= surface úroveň, viz DD-22 Y konvence), nastaví `NearestFilter` na texturu (zachová pixel-art look). **Opaque** — `COLOR` ani internal parts nelze parametrizovat (model je in-out blob). *(Sez. 14, otevírá MagicaVoxel pipeline. Viz „Vizuální zdroje" níž.)*

### Linie (LINES vrstva 3, DD-25)

- **PATH** — 1D křivka jako plochý strip mesh. Potomek CUBES (= LINES rodina abstract base třída zatím nezavedena, čeká na druhého sourozence TRACK). **Dvojí role** (sez. 22 fáze B): dekorativní (`KIND="dirt"`) nebo factory transport (`KIND ∈ "conveyor"|"pipeline"`). Atributy:
  - `KIND` (string, default `"dirt"`) — řídí texturu povrchu i transport sémantiku. `"conveyor"` pro solid resources, `"pipeline"` pro fluid. Engine boot-time validuje `RESOURCES_DEF[RESOURCE].category` proti `KIND` (warn na neshodu).
  - `POINTS` (pole `[x, y, z]` kontrolních bodů ve world coords). `instance.X/Y/Z` se nepoužívá (cesta žije v world coords; constructor volá `super(0, 0, 0, ...)`).
  - `SOURCE`, `SINK` (instance ref na `FACILITY`, default null) — endpointy transportu. Dekorativní `"dirt"` cesty nechávají null.
  - `RESOURCE` (string klíč do `RESOURCES_DEF`, default null) — **explicit** resource ID. Derived ze SOURCE by byl nejednoznačný u STORAGE (drží libovolné suroviny).
  - `THROUGHPUT` (float ks/s, default null) — rychlost transportu. Doporučené: conveyor 2 ks/s, pipeline 5 L/s.

  Engine `createPathFor`: `THREE.CatmullRomCurve3` (typ `catmullrom`, tension 0.5), 64 vzorků, generuje strip BufferGeometry s positions/uvs/indices. Šířka 0.5 j, Y offset +0.005 j proti z-fightingu, repeating texture UV scale 8× podél délky. **Rovný směr v krajních bodech** — Three.js v non-closed Catmull-Rom curvě používá v krajních bodech reflexi sousedního, tj. tangenta v `P[0]` = `P[1] − P[0]`; pokud `P[0].Z = P[1].Z`, tangenta je čistě podél X (= rovný vstup/výstup). `pathOccupiedCells(points)` vzorkuje curve 128× a vrátí Set grid buněk → `populateNorthernScene` skipne dekorace v koridoru cesty.

  Transport tick (`pathTick(dt)` sez. 22): per cesta s validním transportem (`SOURCE+SINK+RESOURCE+THROUGHPUT` all set) přesune `min(THROUGHPUT*dt, source_have, sink_free_capacity)` ze source BUFFER do sink BUFFER. Loguje `DRN` na source, `PROD` na sink přes existující floor-crossing helpery (stejná 1-event-per-whole-unit granularita jako productionTick). Volá se **po** `productionTick` v render loopu — tick = nejprve produkce, pak distribuce. *(Sez. 17 DD-27 dekorativní + sez. 22 DD-31 fáze B transport.)*

### Fasility (FACILITY rodina, DD-31 sez. 21)

Vrstva nad CUBES pro tick-based ekonomický loop. Sourozenec BLOCKS (oba 1C grid-aligned, snap-to-int, DD-28 grid-center Y). Engine logika v `productionTick()` v `src/main.js`.

- **FACILITY** *(abstract)* — base třída factory-toy entit. Atributy: `KIND` (string, klíč do `FACILITY_DEF`), `BUFFER` (`{resource_id: amount}` lokální zásoby), `PAUSED` (bool), `PAUSE_REASON` (string | null, lidsky čitelný důvod material gate spadnutí). DD-31 *„fixed-KIND"* pravidlo: třída-jako-recipe (izomorfie s `TREE.KIND` / `PATH.KIND` / `ANIMATE.kind`), ne data atribut.
- **GENERATOR** — FACILITY produkující 1+ surovinu bez vstupu (les → klády, lom → kámen, studna → voda, důl → uhlí). Engine v `productionTick`: `BUFFER[r] += outputs[r] * dt * TIME_SCALE`, pauza na backpressure (`buffer plný`).
- **TRANSFORMER** — FACILITY zpracovávající `inputs` na `outputs` dle `RECIPES_DEF[KIND]` (pila: logs → planks, drtič: stone → gravel). Material gate (Voidspan-derived): pauza s reasonem `chybí <input>` nebo `buffer <output> plný`. 3-fázový tick: input check → output capacity check → apply.
- **STORAGE** — FACILITY držící zásoby bez produkce/transformace. „Pufr sítě" mezi generátory a transformery. Atribut `HOLDS` (volitelný whitelist `resource_id`; null = drží cokoli, MVP default). V Phase A pasivní (transport přijde v Phase B přes PATH).

#### Data registries (DD-31)

- **`RESOURCES_DEF`** — registry surovin (data, ne třídy). MVP set 6 surovin: `logs/planks/stone/gravel/water/coal`. Pole per surovinu: `name_cs`, `name_en`, `category ∈ {"solid", "fluid"}`, `unit` (MVP = `"ks"` napříč). Voidspan-derived **Logistics matrix** (DD-30): solidy → `PATH.KIND="conveyor"`, fluidy → `"pipeline"`. Phase 2 vlna: `bricks/cement/steel` + multi-input recepty (Soviet Republic inspirace).
- **`RECIPES_DEF`** — registry transformerových receptů. Klíč = `recipe_id = FACILITY.KIND` (fixed-KIND mapping). Aktuální 2 recepty: `sawmill {logs:1 → planks:0.8, 1.0 cyklus/s}`, `crusher {stone:1 → gravel:1.2, 0.8/s}`. Pole: `inputs {r: ks_per_cycle}`, `outputs {r: ks_per_cycle}`, `rate_per_tick` (cykly/s při TIME_SCALE=1). Multi-recipe transformer (jedna fasilita, switchable recept) = pozdější rozšíření, kdyby vůbec.
- **`FACILITY_DEF`** — registry KINDů fasilit s mesh hinty + ekonomickými parametry. 7 KINDů: 4 generátory (`forest/quarry/well/coal_mine`), 2 transformery (`sawmill/crusher`), 1 storage. Pole: `type`, `outputs` (generator) nebo `recipe` (transformer), `buffer_capacity` (per slot — generator 50, transformer 20, sklad 200), `color` (0xRRGGBB placeholder mesh), `name_cs`. Editor v Phase C bude číst pro paletu KINDů.

#### Tick model (DD-31)

- **1 wall sekunda = 1 tick.** `TIME.tick` (DD-04, dosud nepoužitý) konečně získává konzumenta — `productionTick(dt)` v render loopu (continuous, ne 1 wall-s setInterval). `dt = wall second elapsed × world.TIME_SCALE` s clamping `dt ≤ 0.1 s` (proti tab-sleep spikes).
- **Generator tick**: `produced = rate * dt`, oříznuto na `buffer_capacity - have`. Pauza na all-blocked.
- **Transformer tick**: `cycles = recipe.rate_per_tick * dt`. 3 fáze: (1) input check (any `have < cycles * need` → pauza `chybí <r>`), (2) output capacity check (any `have + cycles * out > capacity` → pauza `buffer <r> plný`), (3) apply (drén inputs, plnění outputs).
- **`world.RESOURCES`** (DD-29 nový konzument) — globální agregát `Σ facility.BUFFER[r]`. Derived (engine `aggregateResources()` recompute každý frame), ne SSoT. Konzument: HUD top bar 6 čítačů (`#res-<resource_id>` DOM elementy).
- **`world.TIME_SCALE`** (DD-29 nový konzument) — multiplikátor rychlosti simulace. `0` = pauza, `2` = 2× rychleji. Test v konzoli: `world.TIME_SCALE = 0/1/2`.

#### Event Log (DD-31, Voidspan-derived)

Ring buffer 100 events v paměti (`events[]`), viditelných posledních 5 v `#eventlog` (left bottom, monospace, severity-colored). **4-znakové verbs** (Voidspan v0.1 inspirace):

- **`PROD`** (zelená) — produkce dokončila celou jednotku resource (floor crossing per `(facility, resource)`). Tedy emit jen jednou za sekundu při 1 ks/s rate, ne per-frame.
- **`DRN`** (neutrální šedá) — transformer čerpá input, celé jednotka spotřebována.
- **`PAUS`** (amber) — material gate spadla. State change false→true. Důvod v textu: `chybí logs`, `buffer planks plný`, `buffer plný` (generator).
- **`RSUM`** (cyan) — gate uvolněna. State change true→false.

Per-frame produkce 60× by zahltila log — proto **emit jen na state change** (PAUS/RSUM) a **floor crossing** (PROD/DRN). Verb catalog Phase 2 rozšíření: `BUILD`/`DEMO` (editor v Phase C), `HAUL` (PATH transport v Phase B).

### Nevizuální potomky OBJECTS

- **TIMER** — atributy: `INTERVAL` (počet ticků mezi firem) a `ACTION = { kind, target, attr, value? }`. První skutečná reakce na `TIME.tick` (DD-04 dostal use case). Engine dispatch `ACTIONS[kind]` — aktuálně `toggle` (flip bool) a `set` (nastavit hodnotu). Registrace přes `registerBehavior(instance)` (symetrický sibling `scene.add(createMeshFor(...))` pro vizuální entity). Viz DD-17. *(M8+.)*
- **COUNTER** — atributy `VALUE` (int, default 0) a `INCREMENT` (int, default 1, může být záporné). Engine při `registerBehavior` dynamicky přidá řádek do HUD elementu `#hud` a v tick handleru mutuje `VALUE += INCREMENT`. Demonstruje **HUD observability** — nevizuální ≠ neviditelný, COUNTER je čitelný vedle `TIME`. `VALUE` je obyčejné datové pole, TIMER.ACTION `set` ho může kdykoli přepsat (např. reset). *(M8+.)*
- **WORLD** — singleton globálního stavu scény (DD-29 sez. 20; rozšířeno DD-31 sez. 21). Bez `X/Y/Z` (žije v modelu, ne v prostoru) — demonstruje DD-01 separation. Atributy:
  - **`WIND_STRENGTH`** (float, default `1.0`) — multiplikátor amplitudy `tree_sway` animátoru. Konzument zmizí po Phase D cleanup (DD-30), pak migrace do `IDEAS.md`.
  - **`TIME_SCALE`** (float, default `1.0`) — multiplikátor rychlosti `productionTick`. `0` = pauza simulace, `2` = 2× rychleji. Konzument: render loop `productionTick(dt × world.TIME_SCALE)`. *(DD-31 sez. 21.)*
  - **`RESOURCES`** (objekt `{resource_id: amount}`, default vše 0) — globální agregát napříč `BUFFER` všech FACILITY instancí. Derived (engine `aggregateResources()` recompute každý frame), ne SSoT. Konzument: HUD top bar 6 čítačů. *(DD-31 sez. 21.)*
  
  Instance `world` v `src/main.js`, dev exposure přes `window.world`. Žádná `registerBehavior` registrace (žije čistě jako data). Další atributy (`SUN_ANGLE`, `CLIMATE`, `SEASON`, `DAY`, `WIND_DIRECTION`) přibudou jen s živým konzumentem (politika DD-29) — viz `IDEAS.md`. *(M8+, sez. 20+21.)*

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. Určené pro **diskrétní události** — first use case `TIMER` (DD-17, sez. 9).
- **tick** — jedno zvýšení TIME o 1. Tikne jednou za sekundu. Po inkrementu engine volá `updateTickHandlers()` — fire zaregistrovaných `tickHandlers[]` (TIMER instance).
- **ACTION** — recept diskrétní akce `{ kind, target, attr, value? }` vystřelený TIMER-em. Engine dispatch `ACTIONS[kind]` — izomorfně s `ANIMATE` (DD-15). Aktuální `kind`y: `toggle` (flip bool), `set` (přiřadit hodnotu). Viz DD-17.
- **ANIMATE** — atribut `OBJECTS` s receptem plynulého pohybu: `null` (default, statický) nebo objekt `{ kind: "<string>", ...params }`. Engine v render loopu volá `updateAnimations(tSeconds)` s wall-clockem (`performance.now() / 1000`), lookup `ANIMATORS[anim.kind]` dispatchuje na konkrétní per-frame funkci. Viz DD-15. Aktuální `kind`y po sez. 15: `tree_sway`, `rotate`, `orbit_stadium`, `pulse`, `drift`. Tři osy mutace: **díly** (`tree_sway` — `group.userData.parts` nebo přímo `group.children` u pixel stromů), **transformace** (`rotate`, `orbit_stadium`, `drift` — `object3d.rotation` / `position`), **materiál** (`pulse` — `material.emissive*`, volitelně `opacity`). *(M7.)*
- **base** — `object3d.userData.base = { x, y, z }` — snapshot počáteční polohy instance, pořízený při `registerAnimator`. Transformační animátory (`orbit_stadium`, `drift`) z něj čtou referenční bod (střed dráhy). Nezávislý na `userData.parts` (ten drží díly COMPOSITES).

### Aktivní `ANIMATE.kind`y

- **tree_sway** — pixel-voxel strom se kymácí ve větru. Per-children mutace na `group.children` s **height-weighted amplitudou** (`heightFactor = max(0, base.y + 0.5)` → kmen statický u země, špička maximální výchylka). Random fáze per strom (`phaseX`, `phaseZ`) + nesoudělné periody (3.5–5 s × 2.7–3.7 s) → desync mezi instancemi. Lazy snapshot v `userData.swayBase` (per-children pozice). Globální amplituda škálována `world.WIND_STRENGTH` (DD-29, sez. 20).
- **rotate** — rovnoměrná rotace celého Object3D kolem zadané osy. Parametry `axis` (`"x"`/`"y"`/`"z"`, default `"y"`) a `period` (doba jednoho otočení v sekundách). Generický — mutuje `object3d.rotation` přímo, nevyžaduje `userData.parts`. Funguje napříč třídami (TCUBES, COMPOSITES, …).
- **orbit_stadium** — uzavřená oválná dráha (atletický ovál = 2 rovné úseky + 2 půlkruhy) v rovině XZ kolem `userData.base`. Parametry `length` (L, rovná část; dlouhá osa X), `radius` (R, poloměr oblouku; krátká osa 2R), `period` (T, doba oběhu). Heading (`rotation.y`) sleduje tečnu dráhy → NORTH strana vždy ukazuje dopředu jako auto na trati.
- **drift** — lineární pohyb po jedné ose s **wrap-around** — když objekt opustí pás šířky `range`, vrátí se z opačné strany (skok). Parametry: `axis` (`"x"`/`"y"`/`"z"`, default `"x"`), `speed` (j/s, default 1.0), `range` (šířka pásu v jednotkách, default 16). Pozice obíhá v intervalu `[base − range/2, base + range/2]` kolem `userData.base`.
- **pulse** — emisivní pulsace materiálu. Objekt sinusově mění `material.emissiveIntensity` mezi `min` a `max` s danou `period`. Parametry: `period` (s), `min` (default 0), `max` (default 1.0), `color` (optional 0xRRGGBB; default = `material.color`). Volitelně dvojice `opacityMin`/`opacityMax` — pokud je zadán alespoň jeden, engine zapne `transparent = true` a synchronně mění i `material.opacity` („dýchá"). Lazy init `emissive` přes `userData.pulseInit`. Tiché skip pro materiály bez `emissive` (SpriteMaterial, ShadowMaterial, pole materiálů TCUBES).

## Vizuální zdroje *(DD-21 + revize DD-23)*

TheCubes scéna se buduje ze čtyř vizuálních zdrojů. **Pravidlo dispatche po DD-23** (sez. 15):

- **Vegetace, kameny, mraky, prostředí** → procedurální **pixel-voxel COMPOSITES** (BoxGeometry voxely 0.125 j, sub-buildery dispatchované přes `KIND` string).
- **Komplexní specifické entity** (vozidla, stroje, charakteristické landmarky) → externí **VOXEL_MODEL** z MagicaVoxelu.
- **Voxelová podlaha / terrain** → **TCUBES + `:named-texture`**.
- **Dialog / štítek / UI** → **SPRITES**.

**Žádné Cylinder/Cone/Sphere/Torus/Icosahedron primitivy** v gameplay entitách (DD-23).

### 1. Procedurální Three.js mesh (COMPOSITES + voxely)

Buildery v `src/main.js` (`buildTree`, `buildVoxelModel`, …) skládají `Group` struktury z BoxGeometry voxelů. Internal parts uložené v `group.userData.parts` pro animátor přístup (TREE pixel buildery místo `parts` plní přímo `group.children`).

Voxely **CCUBES** (flat color) a **TCUBES** (per-face textury) jsou speciální případ — single Mesh s BoxGeometry, snap-to-grid v rendereru.

**Pro:** parametrizovatelné (atributy → vzhled), dynamické (animátor přístup k parts), izomorfní s DD-11 (model je data, engine staví mesh).
**Proti:** tedious to author — každý nový tvar = ~30–100 řádků kódu.

### 2. Procedurální canvas textury (`:named-texture`)

JS-generované pixel-art textury 16×16 px. Sdílené přes `NAMED_TEXTURE_FACTORIES` lookup v `faceMaterialFor` dispatchu (DD-14 prefix `:`). Aktuální:

- `:dirt` — hliněná textura (paleta DIRT_*, patches base + 1–2 px záplaty).
- `:grass-top` — travnatý povrch (paleta GRASS_*, patches).
- `:stone` — kamenná textura (paleta STONE_*).
- `:rail-top` — kolejnice. Template, není použitá v aktuální scéně (sez. 14 vznikla, sez. 15 železnice odebrána, generator zachován jako reference).
- `:path-dirt` — štěrková cesta (sez. 17). Kropenatý šum 240 záplat 1-2 px šedých odstínů + jeden hnědý ton. Použito v `pathTexture()` dispatchu.

Pravidlo BLOCKS rodiny po sez. 17: **vrch `:grass-top`, jinak `:dirt`** napříč grass blok / TRRAMPS / TTRAMPS / TTUNELS. Sez. 17 smazán `:grass-side` (kompozit dirt+grass strip) — pixel-art look hutnější bez tenkého grass stripu na bocích.

**Použití:** strany TCUBES (typicky podlaha diorámy — grass voxely v `SCENE_LAYOUT`).
**Pro:** sdílené per textura (úspora paměti i GPU), pixel-art = stylová konzistence s VOXEL_MODELy.
**Proti:** musí se kódit nový generator pro každý typ.

### 3. Canvas SPRITES

2D obrazy generované v JS (CanvasTexture, billboard otočený ke kameře přes `THREE.Sprite`). Volitelně přidružený 3D ocásek (THREE.Mesh jehlan, dynamicky sledující SPEAKER, DD-16).

**Použití:** SPRITES třída — dialogové bubliny s textem (`ASSET = "string"`).
**Pro:** rychlé generování textu + dynamický pointer na mluvčí.
**Proti:** specifické pro UI / 2D obsah.

### 4. Externí 3D modely (VOXEL_MODEL)

`.obj` + `.mtl` + `.png` soubory, typicky export z **MagicaVoxelu**. Načítány async přes `OBJLoader` + `MTLLoader` z `./assets/`. Třída **VOXEL_MODEL** (potomek COMPOSITES) — viz Model sekce výš.

Engine auto-centruje XZ + posune Y bottom na `instance.Y` (DD-22 Y konvence); `NearestFilter` zachová pixel-art look palety.

**Pro:** drag-drop voxel modeling v MagicaVoxelu, žádný kód, vizuálně bohaté výsledky.
**Proti:** opaque — model nezná `COLOR` ani internal parts; nelze dynamicky parametrizovat.

### Workflow rozhodnutí

| Účel | Zdroj | Příklad v aktuální scéně |
|------|-------|---------|
| Voxelová podlaha / terrain | TCUBES + `:named-texture` | `SCENE_LAYOUT` (~145 grass/dirt/stone voxelů) |
| Statická dekorace s jednolitým povrchem | VOXEL_MODEL (DD-24 shape × surface) | `tunel-grass` (3×3×3 TC), `ramp-grass` (1×1×1 TC) |
| Komplexní specifická entita | VOXEL_MODEL (multi-color paleta) | (zatím žádná — bagr/jelen plánováno) |
| Vegetace / kameny / mraky | pixel-voxel COMPOSITES | TREE 10 KIND-ů na předním řádku |
| Dialog / štítek / UI | SPRITES | bubliny s dynamickým ocáskem |

### MagicaVoxel ↔ TheCubes pipeline *(sez. 14)*

**TheCubes → MagicaVoxel** (export šablony): skript `tools/export-grass-vox.mjs` generuje 16³ kostku s povrchovými voxely odpovídajícími TheCubes texturám (TOP `:grass-top`, jinak `:dirt`). Output: `assets/cube-grass.vox`. Spuštění: `node tools/export-grass-vox.mjs`. **Pozn.** skript stále generuje 14+2 px grass-strip na bočních stěnách (zachován historický pattern); aktuální runtime již používá jednolitý `:dirt` (sez. 17).

**MagicaVoxel → TheCubes** (import): user vyrobí model, exportuje přes File → Export → obj (vznikne `name.obj` + `name.mtl` + `name.png`). Soubory umístí do `assets/`. V kódu: `new VOXEL_MODEL("id", "name", X, Y, Z, "name", scale, rotationY, "...")`.

### Asset templates *(sez. 18)*

V `assets/` zůstávají jen MV authoring šablony, nejsou aktuálně konzumovány runtime kódem:

- **`cube-grass.vox`** — 16³ MV kostka s povrchovými voxely odpovídajícími TheCubes texturám. Výchozí bod pro budoucí komplexní MV modely (přebrat paletu, modelovat detail). Generuje `tools/export-grass-vox.mjs`.
- **`scene-palette.vox`** — 12 swatch barev (1×1×1 voxel each) z TheCubes palety pro MV authoring. Generuje `tools/export-scene-palette-vox.mjs`.

Po sez. 16 (DD-25) byly všechny VOXEL_MODEL instance nahrazeny procedurálními BLOCKS (TTUNELS, TRRAMPS), takže `buildVoxelModel` infrastruktura je momentálně bez konzumenta — zachovaná pro budoucí komplexní entity (vozidla, postavy, charakteristické landmarky), kde voxel jazyk vyžaduje multi-color paletu mimo `:named-textures` rámec.

### Měřítko a Y konvence *(DD-22 + DD-28)*

**Pevné měřítko** — 1 TC voxel = 1 m, 1 MV voxel = 1/16 TC voxelu = **6.25 cm**, `VOXEL_MODEL.SCALE` default `0.625`. Pixel-voxel COMPOSITES (TREE/GRASS_TUFT/ROCK_PIXEL/LOG) používají voxel velikosti **0.125 j** (`TREE_PX = 0.125 = 1/8 TC = 12.5 cm`). Velikost objektu řídí počet voxelů v jeho gridu, ne scale parametr. Tunel 48³ MV → 3×3×3 TC; postava 8×5×28 MV → 0.5×0.31×1.75 m.

**Y konvence — dvě sémantiky** *(DD-28 sez. 18)*:

| Třída / rodina | `instance.Y` semantics | Pro stojící na grass podlaze (gy=−1) |
|---|---|---|
| **BLOCKS** (CCUBES, TCUBES, TRRAMPS, TTRAMPS, TTUNELS) | grid Y voxelu (= mesh **center**) | `Y = 0` (1C blok nad podlahou) |
| **VOXEL_MODEL** | world Y surface (= mesh **bottom**) | `Y = −0.5` |
| **Pixel-voxel COMPOSITES** (TREE, GRASS_TUFT, ROCK_PIXEL, LOG) | world Y surface (= group origin) | `Y = −0.5` |
| SPRITES, PATH | libovolný Y (free 3D space) | dle obsahu |

**BLOCKS = grid-Y** (= 1C grid-aligned bloky terénu, snap-to-int v rendereru DD-12 vynucuje konvenci automaticky — uživatel uvažuje „blok je ve sloupci gy=0").

**Surface konvence = mesh bottom** (= „postav strom / model na povrch"):
- Engine VOXEL_MODELu auto-snap (`buildVoxelModel` posune mesh bottom na lokální Y=0 → `group.position.y = instance.Y` zarovná na world surface).
- Pixel-voxel `treeVoxel` použije lokální Y `(gy + 0.5) * TREE_PX` → první voxel bottom na lokální Y=0 → group origin = surface.

| Kde entita stojí | Grid `gy` | `instance.Y` (surface třídy) |
|---|---|---|
| Standardní podlaha diorámy (grass top na world Y=−0.5) | −1 | **−0.5** |
| Vyvýšená úroveň o 1 voxel (grass top na world Y=0.5) | 0 | **0.5** |
| Vyvýšená úroveň o 2 voxely | 1 | **1.5** |

**Pravidlo pro surface třídy:** `instance.Y = gy + 0.5`, kde `gy` je grid souřadnice voxelu, na kterém entita leží.

**Důsledek pro vícevrstvé entity** (rampy, schody, MV modely): MV grid / pixel-voxel grid musí výškou přesně odpovídat výškovému rozdílu, který má model spojovat. Rampa 1 m vysoká = 16 MV voxelů (nebo 8 pixel-voxelů à 0.125 j) → spojuje sousední TC úrovně.

### Shape × Surface separation *(DD-24)*

VOXEL_MODELy s **jednolitým povrchem** se rozdělují na ortogonální dimenze:
- **Shape** (tvar) — 1 MV soubor s **abstract paletou** (4 indexy: BASE, ACCENT1, ACCENT2, HIGHLIGHT). Příklady: `cube`, `ramp`, `tunel`, `wall`, `stairs`.
- **Surface** (povrch) — paleta 4 RGBA barev v JSON (`assets/surfaces/<name>.json`). Příklady: `grass`, `dirt`, `stone`, `sand`, `ice`, `water`, `brick`, `wood`.

**Pre-build skript** *(plánovaný v sez. 16)* generuje per kombinaci `assets/built/<shape>-<surface>.{obj,mtl,png}` — engine spotřebovává pre-built soubory beze změny.

**Pojmenování** — `<shape>-<surface>` (kebab-case lowercase). Příklady: `cube-grass`, `ramp-stone`, `tunel-grass`, `cube-brick`. Izomorfní s `:named-texture` patternem (`:grass-top`, `:rail-top`).

**Nekvalifikuje pro shape × surface:**
- Vozidla a stroje (multi-color detaily — kola, sklo, světlomety)
- Postavy (multi-color — hlava, tělo, oblečení)
- Stromy (kmen + listy = 2 palety, řešeno přes TREE.KIND sub-buildery)

→ Tyto entity zůstávají **monolitní VOXEL_MODELy** (multi-color) nebo **pixel-voxel COMPOSITES** (TREE.KIND).

## Pojmy

- **Asset** — soubor v `./assets/` načítaný za běhu (`.obj` + `.mtl` + `.png`, nebo `.vox` zdroj pro MagicaVoxel). Synonymum pro „externí 3D model" v kontextu VOXEL_MODEL.
- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Použití: per-face TCUBES, šachovnice na mateřské CUBES, mapovaná textura na importovaném VOXEL_MODELu.
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Použití: SPRITES třída.
- **Voxel** — krychlová jednotka. Dvě úrovně:
  - **TC voxel** = 1 m (= 1 instance CCUBES/TCUBES, nebo 16 MV voxelů).
  - **MV voxel** = 6.25 cm (= 1/16 TC voxelu, jednotka v MagicaVoxelu).
- **Pixel-voxel** — voxel velikosti **0.125 j** (= 1/8 TC voxelu = 12.5 cm). Procedurální voxely v COMPOSITES (TREE pixel sub-buildery). Drobnější než MV voxel — TREE detaily (jehličky, listí) jsou hrubší než povrch importovaného MV modelu, ale stylově konzistentní s NearestFilter pixel-art linkou.
- **Pixel-art** — vizuální styl s viditelnými „pixely". Dosahujeme přes `NearestFilter` na `CanvasTexture` (nezablurovaná interpolace) + nízké rozlišení (16×16 typicky). Sdílí se mezi procedurálními texturami (`:dirt`/`:grass-top`/…) a importovanými VOXEL_MODEL paletami.
- **Shape** — geometrický tvar VOXEL_MODELu (DD-24). Modeluje se v MV s 4 indexy abstract palety.
- **Surface** — vzhled povrchu (DD-24). JSON paleta 4 RGBA (BASE/ACCENT1/ACCENT2/HIGHLIGHT).
- **TREE.KIND** — string dispatch klíč pro pixel-voxel sub-buildery TREE třídy. 10 hodnot: `spruce`, `oak`, `birch`, `palm`, `bush`, `cypress`, `willow`, `bonsai`, `dead`, `maple`. Default `"spruce"` (DD-23 cleanup). Lookup tabulka `TREE_BUILDERS` v `src/main.js`, izomorfně s `ANIMATORS[kind]`.

## UI

- **HUD** (head-up display) — překryvný panel v levém horním rohu pro globální stavy (`TIME` + dynamické řádky pro COUNTER instance).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Hover highlight** — žluté světélkování celého objektu pod kurzorem (sez. 16). Emissive boost na materiálu (`mat.emissive = 0x404020`). Lazy clone-on-first-hover — při prvním hoveru engine klonuje materials per mesh, originály v `userData.hoverOrigMat`, klony s yellow emissive v `userData.hoverHotMat`. Při on/off přepneme `child.material` mezi originálem a klonem. Sdílené materials (TREE `_treeMatCache`) zůstávají nedotčené — sourozenci se nezvýrazní. Nahrazuje dřívější edge highlight (žluté hrany).
- **Šachovnicová textura** — vizuální idiom „vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.
- **Klávesové ovládání kamery** *(sez. 14)* — WASD pan v rovině scény, Q/E rotace kolem cíle, Y/X zoom. Per-frame v render loopu, smooth dle `dt`. `heldKeys` Set + window keydown/keyup/blur listener.

## Milníky

- **M1** *(sez. 1)* — statická 3D scéna s jednou kostkou, ovládatelná kamera, tikající TIME v HUDu, hover infotip.
- **M2** *(sez. 2)* — orientační pomůcky (GridHelper, AxesHelper) + první potomek `CUBES` (tehdy `TERRAIN`, dnes `CCUBES`) + 3×3 grid. Helpery odstraněny v sez. 14.
- **M3** *(sez. 3)* — COMPOSITES + TREE (3D strom z primitivů — později DD-23 přepsán na pixel-voxel), float souřadný systém (DD-12), terminologie potomků (DD-13).
- **M4** *(sez. 3)* — BALLOON (smazán DD-23) + stínovací systém (shadow map, PCF soft).
- **M5** *(sez. 4)* — SPRITES (dialog bubble nad stromem, canvas-generovaný text).
- **M6** *(sez. 4)* — TCUBES (per-face textury, emoji na krabici + fallback šachovnice). DD-14 zafixoval dispatch podle typu atributu.
- **M7** *(sez. 5)* — Chování v čase: atribut `ANIMATE` na OBJECTS (DD-15), dispatch v enginu.
- **M8+** *(sez. 6–15, průběžně)*:
  - *Sez. 6+7:* `rotate`, `orbit_stadium`, `pulse`, `drift` animátory.
  - *Sez. 8:* dynamický 3D ocásek SPRITES (DD-16 — `SPEAKER` + `SPEAKER_OFFSET_Y`, tracking přes `meshByInstance`).
  - *Sez. 9:* TIMER + COUNTER (DD-17 — diskrétní `TIME.tick` reakce přes `ACTION`) + edge highlight.
  - *Sez. 10–13:* humanoidní rodina CHARACTER/NOODLE/STICKMAN s wander/poseFns/gait animátory (DD-18/19/20) — **přesunuto sez. 14 do sibling projektu `./source/Stickman`**. DD-18/19/20 zůstávají v immutable logu jako historický kontext.
  - *Sez. 14:* 10×10 voxelová dioráma (`SCENE_LAYOUT`), klávesové ovládání kamery, **MagicaVoxel pipeline** (DD-21 — VOXEL_MODEL třída + async OBJ+MTL+PNG loader).
  - *Sez. 15:* **Pevné měřítko** (DD-22), **all-voxel pivot** (DD-23 — smazáno 7 non-voxel tříd + Scéna 1 + scene switcher + LIT + balloon_bob + classic TREE, ~720 řádků), **shape × surface separation** (DD-24 — pre-build skript plánovaný), **pixel-voxel TREE.KIND** dispatch (10 sub-builderů).
