# IDEAS

Raw nápady. Když dozraje, přesuň do `TODO.md`.

## Rozšíření modelu
- **SPRITES** — potomek CUBES s 2D billboard vizualizací (dialog bubble, 2D postava, label). Atribut `ASSET`. → DONE (sez. 4, M5): třída + canvas-generovaná dialogová bublina + instance `dialog_0001` nad stromem. Dynamický 3D ocásek → DONE (sez. 8, DD-16).
- **COMPOSITES** — potomek CUBES s 3D mesh z více částí. → DONE (sez. 3): základní třída + `TREE` (M3). *(Sez. 15 DD-23: COMPOSITES složky jsou nyní výhradně voxely — žádné Cylinder/Cone/Sphere primitivy. Smazány: BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN. CHARACTER/NOODLE/STICKMAN přesunuty sez. 14 do sibling projektu `./source/Stickman`.)* Aktuální COMPOSITES potomci (sez. 17–18): **TREE** (pixel-voxel s 10 KIND sub-buildery), **GRASS_TUFT** (micro/short/fern), **ROCK_PIXEL** (micro/small/medium/mossy), **LOG** (stump/birch/pine), **VOXEL_MODEL** (z MagicaVoxelu, DD-21; aktuálně bez instance v scéně). Plus **PATH** pod CUBES přímo (DD-27, vrstva 3 LINES).
- **TCUBES** — potomek CUBES s per-face texturami. → DONE (sez. 4, M6): třída + dispatch `faceMaterialFor` (DD-14). Aktuální use case: voxelová podlaha diorámy (`SCENE_LAYOUT` ~145 kostek s `:grass-top` / `:dirt` / `:stone`; sez. 17 odstranil `:grass-side` z runtime — pravidlo BLOCKS rodiny „vrch grass, jinak dirt").
- **WCUBES** *(nápad)* — wireframe varianta mateřské CUBES, pokud bude potřeba odlišný „draft" idiom od šachovnice.
- **INVISIBLE** — potomek CUBES bez vizualizace (spawn point, marker). *(možná zbytečné — stačí mateřská CUBES s NAME="marker"?)*
- **CCUBES typizace** *(překryto DD-24)* — historicky navrhováno jako `TERRAIN` rodina (ICE/GRASS/SAND); DD-24 shape × surface řeší surface obecněji jako paletu, takže typizace CCUBES už není potřeba.
- **Nevizualizované OBJECTS** — pravidla, recepty, timery, score. Dědí z OBJECTS přímo, ne z CUBES. → PARTIAL (sez. 9 + 20): **TIMER** (DD-17, `INTERVAL + ACTION`, engine `ACTIONS` dispatch `toggle`/`set`), **COUNTER** (`VALUE + INCREMENT` v HUD), **WORLD** singleton (DD-29, sez. 20 — `WIND_STRENGTH` násobí `tree_sway` amplitudu). *(Po sez. 17 TIMER ani COUNTER nemají aktivní instanci ve scéně — třídy + engine infrastruktura zůstávají. WORLD singleton aktivní od sez. 20.)* **Zbývající:** RULE framework (condition + action), BRAIN (per-entity chování), pravidla/recepty s kombinačními ACTION.

## WORLD rozšíření *(DD-29 gated by konzument)*

Atributy `WORLD` se přidávají jen tehdy, když mají živého konzumenta v engine. Aktuální seznam kandidátů (žádný se nepřidává teď):

- **`SUN_ANGLE`** — den/noc shader. Konzument: aktualizovat `directionalLight.position` v render loopu (azimuth + elevation) + `scene.background` barva.
- **`CLIMATE`** — string (`"northern"`, `"desert"`, `"tropical"`). Konzument: `BIOME_TREES[climate]` lookup v `populateNorthernScene` (rename na `populateBiome`).
- **`SEASON`** — string (`"spring"`, `"summer"`, `"autumn"`, `"winter"`). Konzument: sezónní paleta listů v TREE.KIND sub-builderech (kvazi-konstanta `LEAF_COLOR[season]`).
- **`DAY`** — float [0, 1) cyklus dne. Konzument: kombinovaný driver pro `SUN_ANGLE` (`SUN_ANGLE = f(DAY)`) — pak má smysl `SUN_ANGLE` derivovat, ne držet jako primary.
- **`WIND_DIRECTION`** — float [0, 360) ve stupních. Konzument: direction-aware `tree_sway` (X/Z odděleně podle směru). `tree_sway` je momentálně izotropní (random fáze X+Z), takže direction by byl mrtvý.

Strukturní pozn.: pokud přibudou ≥3 atributy jedné kategorie (`WIND_STRENGTH` + `WIND_DIRECTION` + `WIND_TURBULENCE`), refaktor z ploché na nested (`WIND: { strength, direction, turbulence }`) — DD-29 pro to drží otevřená vrátka.

## Chování v čase
- Až bude „čas něco dělat": jak? Pravidla (PocketStory style), per-object `tick()`, subscription na TIME? → DONE (sez. 5, M7): data-driven atribut `ANIMATE = { kind, ...params }` na `OBJECTS`, dispatch v enginu (DD-15). První dvě `kind`y: `balloon_bob` a `tree_sway`. Sez. 6 + 7 doplnily `rotate`, `orbit_stadium`, `pulse` (s volitelným opacity), `drift` (lineární s wrap-around). Sez. 10 (DD-18) rozšířil ANIMATE na „mode slot" — statické pózy (`sit`, `lie`) i stavové automaty (`wander`) sdílejí dispatch. Diskrétní události: `TIMER` + `ACTION` (DD-17, sez. 9).
- **Sekvenční chování** (zvedání, pokládání, přechody mezi pózy) — nepokryté mode slotem (ten drží jen aktuální stav, ne trajektorii mezi stavy). Kandidáti: (a) transition animátor přebírající interpolaci mezi snapshotem páteře a cílem, (b) keyframe systém po vzoru tradiční animace, (c) skriptovaný ANIMATE.kind s fázemi. Rozhodne se, až bude konkrétní use case.

## AI / automaty *(sez. 14: CHARACTER/NOODLE/STICKMAN přesunuty do sibling projektu `./source/Stickman`. Wander automat, kolizní systém i pose primitives v TheCubes nežijí. Body níž jsou dlouhodobé kandidáty — relevantní až přijde integrace Stickmana zpět nebo nová pohyblivá entita.)*

- **Wander** stavový automat uvnitř animátoru — random transitions bez goal-seeking. Další úrovně:
  - **Utility-based selection** místo plain random — váha stavů podle kontextu.
  - **Perception** — entita vidí okolí, reaguje (jiná postava blízko → stop, interakce).
  - **Need system** (hlad/únava/nuda) — utility váhy driver-ované stavem.
  - **Multi-entity koordinace** — dvě entity se domluví na společné akci.
- **Pathfinding** — pro cílený pohyb přes překážku graf/A* (nový systém, ne drobný refaktor; samostatné DD).

## Mobilita napříč výškami (auta, vlaky, hráč)
Jak se pohyblivá entita dostane z nižší kostky na vyšší? Voxelový svět má diskrétní Y a entity nechtějí „skákat" přes hrany. Kandidáti:
- **Rampy** — speciální kostka se šikmou geometrií (3D iso tile klasika: SimCity, RCT, Minecraft slabs/stairs). Nová třída v rodině CUBES (`RCUBES`?) nebo atribut `SLOPE = { dir, angle }` na CCUBES/TCUBES (data-driven, izomorfní s `ANIMATE`/`TEXTURE_*`).
- **Schodovitý terén** — každý krok = plná kostka, entita hopsá o 1 voxel (Minecraft). KISS, drží voxel identitu, ale auta/vlaky působí nepřirozeně (kodrcání).
- **Heightmap / heightfield** — každý tile má vlastní Y, povrch se interpoluje trojúhelníky (Transport Tycoon hills). Plynulé, ale opouští voxel estetiku — *nepasuje do koncepce TheCubes*.
- **Z-levels / patra** — voxely zůstávají, pohybové vrstvy jsou oddělená patra propojená lokálními přechody (výtah, schody, díra). Dwarf Fortress pattern.
- **Splines / track graf** — silnice/koleje jsou spline-křivky nezávislé na voxelech, entita jezdí po křivce, voxely jen dekorace (TT vlaky po kolejích).
- **Logický pathing graf** — engine neřeší geometrii, ale graf „z tile A do tile B lze", entity animují přejezd mezi uzly. Turn-based (Civilization). **Silný koncept pro sandbox s `TIME.tick` pravidly** — izomorfie s tím, jak `ANIMATE` oddělil chování od modelu.
- **Anti-gravity / wall-climb** — entity nemají gravitaci, jezdí po čemkoli (Sonic, Mario Galaxy). Pro kreativní sandbox zajímavé, pro vlaky ne.

Poznámka: rampy / schody řeší jen *geometrii*, splines / graf oddělí **pohyb od prezentace** — to je hlubší. V TheCubes nejspíš mix: **rampy/schody pro vizuální terén** + **graf pro logiku pohybu** (co z kam lze, pravidla jízdy). Rozhodne se, až přijde první pohyblivá entita (auto/vlak/hráč) a bude jasné, co s tím má dělat.

## Režimy světa
- Minecraft-like voxel terén
- Iso-tile Transport Tycoon
- Factorio-like automatizace
- Desková hra (Board-style)

## UI nad modelem
- Editor modelu přímo v prohlížeči — formulář na vytvoření potomka třídy?
- Nebo zatím jen úprava kódu, editor až později?

## Voidspan inspirace pro factory toy *(DD-30, sez. 21 — Phase 2+ parking)*

TheCubes byl pivotován na 3D analogii projektu Voidspan (sourozenecký projekt `~/source/Voidspan`, 25+ sezení designu). MVP set DD-31 vzal nejnutnější (Resource registry, Recipe matrix, Material gate, Event Log 4-znakové verbs). Tyto Voidspan koncepty jsou *parkované pro Phase 2+*:

### Resource Taxonomy (Voidspan v0.1)
- **Rarity tiers** (5 stupňů, EN/CZ): Common/Obyčejné, Uncommon/Neobvyklé, Rare/Vzácné, Exclusive/Exkluzivní, Epic/Epické. Designový baseline pro budoucí scaling — Common = `logs/stone/water`, Uncommon = `coal/iron`, Rare = budoucí drahé kovy, atd.
- **Implikace:** drop chance v capsule recycling (Voidspan-specific, TheCubes nemá), market cena rarity-weighted, recipe gating (Engine v3 vyžaduje Titan).
- **Logistics matrix:** Solids (dopravní pásy, pytle, sila/bedny, jednotka kg/t) vs. Fluids (potrubí/hadice, nádrže/barely, l/m³). TheCubes MVP používá generický `PATH.KIND ∈ "conveyor"|"pipeline"` jako minimální projekci — Phase 2 doplní storage subtypy (Silo/Tank/Crate).

### Module Specialization Principle (Voidspan S5)
*„Integrované multi-purpose moduly mají minimální výkon, dedikované jednoúčelové jsou řádově výkonnější."*
- TheCubes Phase 2: 1×1×1 pila zpracuje 1 kládu/s, 2×2×2 mega-pila zpracuje 16 klád/s s lepší efektivitou (1 kláda → 0.9 prkna místo 0.8). Atraktivní upgrade curve — hráč začne s malými, později specializuje.

### Multi-input recepty (Phase 2 surovinová vlna)
Soviet Republic-style production chains. Otevírá kombinatorickou složitost:
- `bricks` z `clay + coal` (Phase 2 přidá `clay` raw, kiln transformer)
- `cement` z `gravel + water` (využije existující gravel + water řetězec)
- `steel` z `iron + coal` (Phase 2 přidá `iron` raw, smelter transformer)
- Beton z `gravel + cement + water` (3-input — testuje material gate s víc vstupy).

### formatScalar (Voidspan v0.1 axiom)
Jednotící zobrazení čísel v UI: 2 significant digits + SI prefixy (`µ/m/—/k/M/G/T`). Příklady: `0.15` → `"0.15"`, `1500` → `"1.5k"`. TheCubes MVP používá `Math.floor` → integer ks. Phase 2 polish, až bude víc surovin a vyšší totals.

### Event Log polish (Phase 2)
- Verb catalog rozšíření: `BUILD`/`DEMO` (editor v Phase C), `HAUL` (PATH transport per-tick), `RPRT` (systémové zprávy), `STAT` (Status tree threshold crossing — kdyby TheCubes přidal Status tree).
- Filter chips (Voidspan-derived "Lazy emergence axiom"): chip se objeví až při prvním výskytu verb v sezení. UI roste s realitou.
- Ring buffer kapacita: 500 events (Voidspan default) vs. MVP 100 — drobnost.

### Záměrně **odmítnuto** (designové linie, kde se TheCubes nepodobá Voidspanu)
- **Cosmology / lore** — Voidspan má Teegarden System, kolonisty, Capsule. TheCubes je abstraktní sandbox bez narativu.
- **Status tree + Citizen tiers** — Voidspan se zaměřuje na *přežití kolonie* (HP, hlad, žízeň). TheCubes je *pozorování ukazatelů* bez win/loss.
- **Protocol / QuarterMaster AI** — Voidspan má kolonijní CPU vrstvu (auto-repair, task routing). TheCubes pro MVP nepotřebuje, hráč staví a model počítá. Phase 3+ kdyby kolize.
- **Coin / Credit měna** — TheCubes nepotřebuje monetární vrstvu, suroviny jsou samy o sobě hodnotou.
- **W (Work) jako resource** — Voidspan má pracovníky s `power_w`. TheCubes nemá kolonisty, `productionTick` agreguje per-fasilitu bez nepřímé „work pool" abstrakce.
- **TypeScript / Phaser / pnpm** — Voidspan má hotový stack (`apps/` workspace). TheCubes zůstává vanilla JS + Three.js + Python http.server. KISS = nemíchat technologie, jen koncepty.

## Performance optimalizace

Sezení 26 user feedback: 30×30 terrain vykreslování pomalé (FPS ~15). %THINK sez. 28 strukturoval **4 cesty** + diagnose-first doporučení:

- **A. InstancedMesh per (kind, face)** — Three.js stable feature. 6× draw call per box → 1× per face per kind (24 InstancedMesh total). Hover `raycaster.instanceId → modelInstance` mapa. Per-face texture stále blocker — vyžaduje atlas nebo split.
- **B. BatchedMesh (Three.js r172+)** — heterogenní geometrie v 1 draw call. Verze r160 v projektu, vyžadovala by bump. Modernější API ale méně příkladů, riziko bugů. Hover stejný refactor jako A.
- **C. Mesh merge per cell (greedy meshing)** — Minecraft-style. Drastická redukce vertices (−90 %). Hover degraduje na „celý sloupec". Komplexní algoritmus (geom + UV + atlas) = 2 sezení minimum.
- **D. Web worker pro `generateTerrain`** — off-main-thread CPU work. **Po sez. 28 měření vyloučeno:** generace 2.5 ms @ 30×30 (5 % regen) — bottleneck nikdy nebyl tady.

**Sez. 28 implementoval atlas pattern pro TCUBES (varianta A.1)** — single material per box přes shared geom + 6-tile atlas texture. 6× redukce draw calls bez InstancedMesh refactoru. Výsledek: 30×30 z 15 → 92 FPS. Detail v `docs/diary/2026-05-13.md` (sez. 28) + `docs/DONE.md`.

**Sez. 30 dotáhl atlas pattern na rampy (varianta A.2)** — TRRAMPS/TTRAMPS/TDRAMP single-material atlas, 3 typy × 3 surfaces = 9 lazy-cached atlas materials. Generický `getRampAtlasMaterial(type, surface)` factory DRY. 30×30: FPS 92 → **123** (+34 %), calls ~5050 → 4290 (−14 %). Plus size 100×100 unlock (slider max 30 → 100) + F12 reaktivní shadow frustum. TTUNELS skipnut (0 producentů).

**Sez. 30 100×100 stress test odhalil atlas ceiling** — FPS 7, calls **47 642**, tri 549 698, `geom: 8`, `mat: 7`. Sdílení geom + material konstantní, ale **1 `THREE.Mesh` = 1 draw call** v Three.js — atlas merger materials, ne instances. Pro další skok je nutná abstrakce instances v 1 draw call.

**Otevřené cesty pro budoucnost** (100×100+ scale, predikce):
- **A. InstancedMesh** → **DONE sez. 31 DD-37**. Per atlas material → 1 batch. TCUBES 4 + rampy 9 = ~13 batchů celkem. 47k calls → **~1k calls** (1016 reálně, lehce nad ~13 predikcí — Three.js zřejmě multi-draw per batch pro shadow + DOF pass). Realita FPS 7 → **104** @ 100×100 (predikce 150+ optimistická, GPU bound s 549k tri + shadow + DOF nelze překonat). Hover refactor: `meshByInstance` discriminated union `{batch,idx}|Object3D`, `setColorAt(idx, HOVER_TINT_COLOR)` overbright albedo tint. Pool strategy: **eager preallocate per regen** (3-pass count→allocate→fill, `batch.dispose()` na regen — KISS, regen je 1× per slider dotažení).
- **B. BatchedMesh (Three.js r167+)** — bump Three.js r160 → r167+ a refactor TCUBES + rampy na jediný BatchedMesh. 13 batchů → ~3 calls. **Diminishing returns** po DD-37 (10× redukce draw calls už dosažena), low prio. Sledováno.
- **C. Mesh merge** — pro 200×200+ cells. Drastická redukce vertices, ale ztráta hover granularity (celé sloupce). Zatím over-engineering.

Per-frame draw call hygiene browser: <10k bezpečno, <5k snadno 60 FPS, <2k 120+ FPS. Sez. 28 + 30 atlas dotáhl na 4.3k @ 30×30 (123 FPS). 100×100 = 47k = nad hranicí, InstancedMesh nutný pro playability.

## Inspirace
- PocketStory `Board` view (Three.js diorama + meeples)
- Smalltalk image-based programming
- OOP databáze s živou vizualizací
- **Voidspan v1.4** (sourozenecký projekt, `~/source/Voidspan`) — 25+ sezení designu factory builderu, kvintet zdrojů E/W/S/F/◎, Module Specialization, Protocol/QuarterMaster. Inspirace, ne dogma — viz „Voidspan inspirace" výš.
- **Workers & Resources: Soviet Republic** (Hooded Horse, https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Resources) — referenční resource graph s 50+ surovinami a multi-step production chains. Source-of-truth pro Phase 2 surovinovou vlnu.
