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

## Inspirace
- PocketStory `Board` view (Three.js diorama + meeples)
- Smalltalk image-based programming
- OOP databáze s živou vizualizací
