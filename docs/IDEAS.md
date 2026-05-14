# IDEAS

Raw nápady. Když dozraje, přesuň do `TODO.md`.

## Vytunit reliéf generátor *(sez. 38 user nápad, → TODO až bude apetit na dev panel)*

Po DD-44/45/46 sequence (BIOME_SURFACES driver + fBm/ridge³ + smoothstep bimodal) má heightmap pipeline stálé chování, ale je hodně knobů k tunit:
- **RELIEF_AMPLITUDE / RELIEF_FREQUENCY tabulky** — empiricky vyladěné, ale nejsou per-LATITUDE/BIOME. Tropical/temperate mají stejné amplitudy → polární scéna může vypadat jak alpine.
- **BIMODAL_RELIEF_THRESHOLD = 6** hard switch — sub-prah z DD-46 (plynulý morph r5↔r6). Pokud user pocítí "trhanej přechod".
- **VALLEY_AMP = −1 asymetrický** vůči PEAK_AMP=amplitude — sub-prah DD-46 (symmetric varianta = bimodální symetrický tvar).
- **SMOOTHSTEP_LO/HI = 0.4/0.6** — bimodal cliff width. Užší (0.45, 0.55) = ostřejší, širší (0.3, 0.7) = víc gradient.
- **Ridge³ vs. ridge² vs. plain ridge** pro r ≤ 5 — single-peak distribuce shape.
- **fBm OCTAVES / LACUNARITY / PERSISTENCE** — 3/2.0/0.5 dnes. Více oktáv (4-5) = víc detailů, méně (2) = hladší. Lacunarity 2.5+ = větší freq skok.

Návrh: tunable parameters expose přes hidden dev panel (`#devctrl`?) — debug live tweak bez recompile. Default values držet jako DD-46 baseline, panel ovládá pro experimentování. Tvorba `params.tuning = { thresholdR6, valleyAmp, smoothLo, smoothHi, ... }` na `generateTerrain` API.

## Mraky / srážky *(sez. 38 user nápad, → blokováno particle/sprite engine infrastrukturou)*

Atmosferický overlay nad terénem. Vizuální vrstva (= nemodifikuje terén, jen scénu).

- **Mraky** — bílé/šedé sprite particle systém na obloze. Možnosti:
  - (a) `THREE.Sprite` instances rozesílané v pásu nad terénem, drift animátor pomalu posouvá. KISS.
  - (b) Volumetric clouds — geometry shader nebo billboard cascade. Drahé.
  - (c) Procedural sky shader (e.g., Hosek-Wilkie) — fyzikální atmosféra. Over-engineering pro voxel sandbox.
- **Déšť** — partikle ze sponzorujícího mraku. `THREE.Points` s gravitační velocity. Kolize s top voxelem = particle smaže. Per-cell wetness modifier? Drobnost.
- **Sníh** — partikle s pomalou velocity. Akumulace na top voxelech = mění surface na `_snow` (= viz Skupenství vody sez. 38 plán). Cyklus s temperate noise patches → snow patches rostou/mizí dle DAY×TEMPERATURE driveru.

**Driver:** `WORLD.WEATHER` enum (`clear`/`overcast`/`rain`/`snow`) nebo derivovat z `WORLD.HUMIDITY × LATITUDE × DAY` (sezónně). UI: dropdown nebo manual override v `#settings`.

**Závislost:** vyžaduje particle system base infrastrukturu (Three.js `Points`/`Sprite` instance manager). Nebo deferovat až bude víc dynamic entit. Sub-prah pro pozdější sezení.

## Voda ve všech skupenstvích *(sez. 37 user nápad, → DONE částečně sez. 38 DD-47/48)*

User nápad: **systematická voda jako entita s skupenstvími**. Rozšíření modelu:

- **LIQUID** *(DD-25 **5. vrstva extension: Tekutiny**, DD-54 sez. 45)* — voda jako 1. třída entity, ne surface. Atributy: `LEVEL` (hladina), `TEMPERATURE`, `BOUNDING_BOX`, `CELLS`. → **DONE skeleton (DD-54 sez. 45):** `class LIQUID extends CUBES` (sibling BLOCKS/COMPOSITES/PATH pod CUBES, paralel PATH pattern). Sez. 45 prototype: 1 LIQUID = 1 water cell (single-cell skeleton; spawn loop v `main.js` wrapuje `terrain.water[]` raw records). DD-47 sez. 38 původní flood-fill priority (Wang & Liu) zachován jako data source. Sub-prahy: BFS connected-components clustering + multi-Y split (1 LIQUID = N connected cells sdílejících `water_y` + `frozen`), fyzika kapalin extensions (TEMPERATURE numeric °C, FLOW_DIRECTION rivers/streams paralel PATH POINTS, VISCOSITY lava/oil/acid, LEVEL animace tide/flood).
- **ICE** — pevné skupenství. Možnosti:
  - (a) Surface kind v `SURFACE_Y_OFFSET` — vizuálně led, mechanicky shodné s grass/stone.
  - (b) Vlastní třída pod BLOCKS (`ICUBES`?) s reflective material + slip mechanika (až přijde pohyblivá entita).
  - (c) State `LIQUID.STATE = "frozen"` — jeden objekt, několik vizualizací. **Izomorfní s `ANIMATE` mode slot DD-18.** → **DONE (DD-47 sez. 38) varianta (c):** `frozen` flag per cell (boolean) přepíná `_waterMat` na `_iceMat`. `freezeRatio` per LATITUDE driver (polar 1.0, temperate 0.3, sub/tropical 0.0).
- **STEAM / FOG** — plynné skupenství. Volumetrický efekt? Sprite particle? Three.js `Fog` / `FogExp2` má vlastní globální fog (sez. 31 BokehPass), ale to je atmosféra, ne lokální entita. Lokální steam by mohl být CCUBES s `OPACITY` + `ANIMATE = drift` (sez. 7 helper). Cheap. **Zůstává otevřené.**
- **SNOW** — pevné krystalické. → **DONE (DD-47 sez. 38):** `BLOCK_COLORS` 4→8 `_snow` postfix varianty (TOP=`0xf5f5f5`), `snowSpecForLatitude` driver (polar all / temperate sort+rank top 30 % s altitude bias). Ramps dědí `_snow` ze source cell.

**Driver: `WORLD.TEMPERATURE` nebo `WORLD.SEASON`?** → **DONE částečně (DD-50 sez. 40):** `WORLD.SEASON ∈ {spring, summer, autumn, winter}` driver. Konzument: `snowSpecForLatitude(lat, season)` + `waterSpecForClimate(lat, hum, season)` — temperate `patchThreshold` + `freezeRatio` per season; polar/tropical/subtropical invariant. Plný scope (sky tint, snow accumulation animace, polar season variace) zůstává sub-prah.

**Cyklus skupenství v čase:** pokud `WORLD.TEMPERATURE`/`SEASON` osciluje s `DAY` (DD-38/DD-43 noc chladnější → ráno mlha, poledne taje sníh), vznikne **emergentní dynamika** = preferovaný vzorec (CLAUDE.md `%THINK` 5. bod). Kandidát na samostatný DD po terénu.

## Rozšíření modelu
- **SPRITES** — potomek CUBES s 2D billboard vizualizací (dialog bubble, 2D postava, label). Atribut `ASSET`. → DONE (sez. 4, M5): třída + canvas-generovaná dialogová bublina + instance `dialog_0001` nad stromem. Dynamický 3D ocásek → DONE (sez. 8, DD-16).
- **COMPOSITES** — potomek CUBES s 3D mesh z více částí. → DONE (sez. 3): základní třída + `TREE` (M3). *(Sez. 15 DD-23: COMPOSITES složky jsou nyní výhradně voxely — žádné Cylinder/Cone/Sphere primitivy. Smazány: BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN. CHARACTER/NOODLE/STICKMAN přesunuty sez. 14 do sibling projektu `./source/Stickman`.)* Aktuální COMPOSITES potomci (sez. 17–18): **TREE** (pixel-voxel s 10 KIND sub-buildery), **GRASS_TUFT** (micro/short/fern), **ROCK_PIXEL** (micro/small/medium/mossy), **LOG** (stump/birch/pine), **VOXEL_MODEL** (z MagicaVoxelu, DD-21; aktuálně bez instance v scéně). Plus **PATH** pod CUBES přímo (DD-27, vrstva 3 LINES).
- **TCUBES** — potomek CUBES s per-face texturami. → DONE (sez. 4, M6): třída + dispatch `faceMaterialFor` (DD-14). Aktuální use case: voxelová podlaha diorámy (`SCENE_LAYOUT` ~145 kostek s `:grass-top` / `:dirt` / `:stone`; sez. 17 odstranil `:grass-side` z runtime — pravidlo BLOCKS rodiny „vrch grass, jinak dirt").
- **WCUBES / INVISIBLE / CCUBES typizace** *(parkováno — M3 nápady, žádný signal že přijdou)*. WCUBES = wireframe „draft" varianta. INVISIBLE = spawn point/marker (možná stačí mateřská CUBES s NAME="marker"). CCUBES typizace překryta DD-24 (shape × surface paleta).
- **Nevizualizované OBJECTS** — pravidla, recepty, timery, score. Dědí z OBJECTS přímo, ne z CUBES. → PARTIAL (sez. 9 + 20): **TIMER** (DD-17, `INTERVAL + ACTION`, engine `ACTIONS` dispatch `toggle`/`set`), **COUNTER** (`VALUE + INCREMENT` v HUD), **WORLD** singleton (DD-29, sez. 20 — `WIND_STRENGTH` násobí `tree_sway` amplitudu). *(Po sez. 17 TIMER ani COUNTER nemají aktivní instanci ve scéně — třídy + engine infrastruktura zůstávají. WORLD singleton aktivní od sez. 20.)* **Zbývající:** RULE framework (condition + action), BRAIN (per-entity chování), pravidla/recepty s kombinačními ACTION.

## WORLD rozšíření *(DD-29 → DD-38 gated by konzument)*

Atributy `WORLD` se přidávají jen tehdy, když mají živého konzumenta v engine. Po sez. 32 re-introduce (DD-38) WORLD má 2 aktivní atributy: **`DAY`** + **`DAY_SPEED`**. Další kandidáti:

- **`DAY`** — float [0, 1) cyklus dne. → **DONE** (sez. 32, DD-38). Konzument: `updateSun()` derivuje `sun.position` (plane EAST-UP s 30° náklonem `SUN_TILT`), `sun.intensity` (lerp `0.8 * max(0, sin α)`), `sunMesh.position`/`visible`. Default 0.25 (poledne).
- **`DAY_SPEED`** — float ℝ, cykly za sekundu. → **DONE** (sez. 32, DD-38). Konzument: `updateWorldTime(dt)` inkrementuje `DAY` v render loopu. Default 0 (paused).
- **`SUN_ANGLE`** *(původní návrh)* — překryto `DAY`. Engine derivuje úhel z DAY, není potřeba držet jako primary atribut. ~~Odložen~~.
- **`SEASON`** — string (`"spring"`, `"summer"`, `"autumn"`, `"winter"`). → **DONE (sez. 40, DD-50)** — driver pro `snowSpec` + `waterSpec` (temperate freezeRatio + snow patchThreshold per season). Sez. 41 DD-51 navázal: LEAF_AUTUMN paleta + winter defoliation pro listnaté. Plný scope (sky tint, snow accumulation animace, polar season variace) sub-prah.
- **`CLIMATE`** → **DONE (sez. 35, DD-42)** — split na `LATITUDE` (4 enum: tropical/subtropical/temperate/polar) + `HUMIDITY` (3 enum: dry/mid/wet). Konzument: `SUN_TILT_BY_LATITUDE` (DD-42) + `BIOME_SURFACES` per biome (DD-44) + `snowSpec/waterSpec/decorSpec` per climate (DD-47/49).
- **`WIND_DIRECTION`** — float [0, 360) ve stupních. Konzument: direction-aware sway, pokud kdy vrátíme animátor stromů / dekorací.

Strukturní pozn.: pokud přibudou ≥3 atributy jedné kategorie (např. `SUN_TILT` + `SUN_DISTANCE` + `SUN_COLOR`), refaktor z ploché na nested (`SUN: { tilt, distance, color }`) — DD-29 / DD-38 pro to drží otevřená vrátka.

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

## Voidspan inspirace *(historický kontext, DD-31 → DD-32 wipe)*

TheCubes prošel v sez. 21 (DD-30/DD-31) krátkou factory-toy fází inspirovanou sourozeneckým Voidspanem (`~/source/Voidspan`) — Resource registry, Recipe matrix, Material gate, Event Log. Sez. 25 (DD-32) celou factory vrstvu smazal a pivotoval projekt na procedural terrain. Detaily designových axiomů (rarity tiers, Module Specialization, formatScalar, odmítnuté linie jako Status tree / Coin / TypeScript) drží git history kolem `feat/factory` merge a `docs/DESIGN_DECISIONS.md` DD-30/DD-31. Pokud někdy factory toy obživne, zde je kotva.

## Performance optimalizace

**Historický changelog** (detaily v `docs/DIARY.md` + `docs/DONE.md` + DD-36/DD-37):
Sez. 26 user feedback FPS ~15 @ 30×30. Sez. 28 atlas TCUBES (varianta A.1) → 92 FPS. Sez. 30 atlas rampy (A.2) + size 100×100 unlock + F12 reaktivní shadow → 30×30 na 123 FPS, ale 100×100 narazil na atlas ceiling (FPS 7, 47k draw calls). Sez. 31 DD-37 InstancedMesh batches (per atlas material) → 100×100 z 7 → **104 FPS** (1016 calls). Web worker pro `generateTerrain` měřením vyloučen (2.5 ms regen = ne-bottleneck).

**Otevřené cesty pro budoucí scale (>100×100)**:
- **BatchedMesh (Three.js r167+)** — bump r160 → r167+ a sjednotit ~13 batchů na ~3 calls. **Sez. 32 oponován** — diminishing returns po DD-37 (10× redukce už dosažena), version bump = wide risk (ColorManagement, post-process API). Low prio, sledováno.
- **Mesh merge / greedy meshing** — pro 200×200+. Drastická redukce vertices, ale ztráta hover granularity (celé sloupce). Zatím over-engineering.

Per-frame draw call hygiene: <10k bezpečno, <5k snadno 60 FPS, <2k 120+ FPS.

## Inspirace
- PocketStory `Board` view (Three.js diorama + meeples)
- Smalltalk image-based programming
- OOP databáze s živou vizualizací
- **Voidspan v1.4** (sourozenecký projekt, `~/source/Voidspan`) — 25+ sezení designu factory builderu, kvintet zdrojů E/W/S/F/◎, Module Specialization, Protocol/QuarterMaster. Inspirace, ne dogma — viz „Voidspan inspirace" výš.
- **Workers & Resources: Soviet Republic** (Hooded Horse, https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Resources) — referenční resource graph s 50+ surovinami a multi-step production chains. Source-of-truth pro Phase 2 surovinovou vlnu.
