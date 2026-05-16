# Glossary

Canonical terminologie projektu TheCubes. Stav po sez. 48 M-Genesis cleanup (DD-32 terrain sandbox pivot, DD-33/34/35 ramp smoothing layer + TDRAMP, DD-36 TCUBES atlas pipeline *(nahrazeno DD-41)*, DD-37 InstancedMesh batch pipeline, DD-38 WORLD re-introduce s DAY/DAY_SPEED *(sun position math superseded DD-43, atmospheric lerp 2-keypoint superseded DD-48)*, DD-39 atmospheric lerping *(2-keypoint nahrazen 3-keypoint DD-48)*, DD-40 LAMP/SpotLight pattern, DD-41 lowpoly vertex-color pipeline, DD-42 G2 Climate WORLD LATITUDE×HUMIDITY + sun tilt driver, DD-43 DAY mapping standardizace 0.5=poledne, DD-44 G3 SURFACES driver-derived per biome, DD-45 fBm+ridge³ heightmap pro high relief, DD-46 smoothstep bimodální heightmap pro r≥6, DD-47 G6 climate-driven surface state *(drop water surface kind, snow distribution per LATITUDE, water flood-fill, ice materials)*, DD-48 atmospheric color extensions, DD-49 krajinné COMPOSITES *(DECOR + 5 builderů + biome-aware density driver)*, DD-50 WORLD.SEASON driver *(4-enum)*, DD-51 seasonal foliage cycle, DD-52 slope-aware DECOR Y, DD-53 *(attempt + revert sez. 42 — water bbox clustering)*, DD-54 LIQUID class *(4. vrstva DD-25 extension: Tekutiny; po sez. 48 PATH dropu posunuto z 5. na 4. vrstvu)*, **DD-55 M-Genesis cleanup scope locked** *(sez. 48, K1+D1+D2 — drop SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE bez živého konzumenta + atlas IIFE compute waste + UI Sun toggle, model 13 → 8 tříd)*). Smazané třídy a koncepty (FACILITY rodina + factory toy, severská dioráma, VOXEL_MODEL infrastruktura, M1-M5 milestone artefakty SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE) žijí v immutable diary + git historii jako historický kontext.

**Identita projektu po DD-32 (sez. 24) + DD-44 (sez. 36):** model-first **procedurální terrain sandbox** s OOP modelem jako runtime. User nastavuje parametry krajiny (size, relief 0..10, seed) + Climate (LATITUDE × HUMIDITY) přes UI panel; surface mix je driver-derived z Climate (DD-44, `BIOME_SURFACES` lookup); `generateTerrain` v `src/terrain.js` produkuje 3D scénu z hierarchie BLOCKS. Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) zafixované v git historii jako uzavřené kapitoly.

## Model

### Kořenové třídy

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`. Všechny třídy (vizuální i nevizuální) dědí z OBJECTS. *(Sez. 48 cleanup: `ANIMATE` atribut dropnut spolu s ANIMATE dispatch — bez konzumenta v terrain scope.)*
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (float, DD-12 — sdílený souřadný systém; voxelové potomky si pozici v rendereru zaokrouhlí). Default vizualizace = voxel krychle se šachovnicí (DD-07), potomci override. Pojem „cube" je projektová značka, ne technická klasifikace.

### Bloky (BLOCKS rodina, DD-25)

- **BLOCKS** *(abstract)* — značkovací parent pro 1C grid-aligned bloky tvořící krajinu/geologii. Sdílí: snap-to-int v rendereru (DD-12), procedurální `BufferGeometry` v engine, `faceMaterialFor` dispatch (DD-14), `:named-textures` paleta, atribut `ORIENTATION`. Konkrétní potomci se liší tvarem a počtem faces. *(Sez. 16, DD-25.)*
- **CCUBES** (color cubes) — potomek BLOCKS s atributem `COLOR` (JS number 0xRRGGBB). Plochá barva všech 6 ploch. Nahrazuje dřívější `TERRAIN` (DD-13). *(M2.)*
- **TCUBES** (texture cubes) — potomek BLOCKS bez vlastních face atributů (od DD-41 sez. 34, předtím `TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST`). Konstruktor: `(id, name, x, y, z, description)`. Vzhled řídí `BLOCK_COLORS` paleta v `main.js` per kind (`grass`/`dirt`/`stone`/`sand` + DD-47 `_snow` varianty), shader čte vertex colors z `geometry.attributes.color`. Mapování faces na světové strany: TOP=+Y, BOTTOM=−Y, EAST=+X, WEST=−X, SOUTH=+Z, NORTH=−Z. **Po DD-37** (sez. 31) terrain TCUBES instance se mergují do `InstancedMesh` batches per kind (1 batch per terrain kind) — `createMeshFor` se pro ně **nevolá**, spawn vede přímo do `pushInstanceToBatch`. **Po DD-41** (sez. 34) atlas pipeline DD-36 nahrazena lowpoly vertex-color, sdílený `_lowpolyMat` napříč batchi (1 materiál). Slow path (`faceMaterialFor`) pro non-terrain demo CCUBES (default šachovnice DD-07). *(M6 + DD-36 → DD-41 + DD-37.)*
- **TRRAMPS** (right-triangular ramps, triangular prism) — potomek BLOCKS = trojboký hranol s pravoúhlým trojúhelníkem v základně (= pravoúhlý klín). Konstruktor: `(id, name, x, y, z, orientation, description)`. 5 faces (SLOPE, BOTTOM, BACK vertikál nad apex sloupcem, LEFT, RIGHT trojúhelníky) řízeno přes `BLOCK_COLORS[surface]` + `RAMP_FACE_PALETTE_KEYS` v main.js (od DD-41). Default svah klesá k +Z (apex sloupec na −Z). *(Sez. 16, DD-25 + DD-41.)*
- **TTRAMPS** (triangular ramps, trirectangular tetrahedron) — potomek BLOCKS = trojboký jehlan se 3 mutually perpendicular pravoúhlými stěnami sdílejícími roh `C`, čtvrtá stěna SLOPE = rovnostranný trojúhelník (hrana √2). 4 faces (SLOPE, BOTTOM, BACK, LEFT) řízeno přes `BLOCK_COLORS` paletu (DD-41). Konstruktor: `(id, name, x, y, z, orientation, description)`. Použití: rohové rampy (corner ramps), stoupání ze 3 sousedních směrů na jeden vyvýšený roh. *(Sez. 16, DD-25 + DD-41.)*
- **TDRAMP** (diagonal ramp) — potomek BLOCKS = 1C blok bez jednoho horního rohu („low corner"). Krychle 1×1×1 mínus tetrahedron odříznutý na 1 z 4 horních rohů → 7-vrcholový polyhedron: čtvercová podstava + trojúhelníková „horní podstava" (TOP_TRI s 3 ze 4 horních rohů) + diagonální SLOPE z low_bot k opačné horní hraně (NW_top−SE_top, „lomená rampa" sdílí hranu s TOP_TRI). 7 faces / 5 material groups (SLOPE, TOP, BOTTOM, WALL_FULL 2 plné quad stěny opačně k low corner, WALL_TRI 2 trojúhelníkové vert. stěny u low corner) řízeno přes `BLOCK_COLORS` paletu (DD-41). Konstruktor: `(id, name, x, y, z, orientation, description)`. **ORIENTATION** (DD-26 + DD-34): default low corner v lokálním (−X, −Z) = terrain.js „SW" → peak v rohu opačně = „EN" (+X, +Z). Použití: vyhlazení **3-cell convex peak** stepu (A má 2 sousední direct vyšší + diag corner vyšší) nebo **L-shape** stepu (2 sousední direct vyšší bez diag peaku). Strict-dominuje 1× TRRAMPS edge — 2 přístupy + 2 zakryté stěny v 1 mesh. *(Sez. 26, DD-35 + DD-41.)*

### Atribut ORIENTATION (DD-26 + DD-34)

`ORIENTATION` — float ∈ [0, 360) ve **stupních**, rotace kolem Y osy. **Sjednoceno** napříč BLOCKS i COMPOSITES rodinou (sez. 17, DD-26). Engine převádí: `mesh.rotation.y = ORIENTATION * (Math.PI / 180)`. Default 0.

V BLOCKS rodině v praxi jen násobky 90° (cardinální orientace svahu / osy tunelu / low cornera): 0, 90, 180, 270. User „+90 CW" = `ORIENTATION −= 90` (mod 360).

**DD-34 (sez. 26)** centralizuje mapování `edge name → ORIENTATION` v `terrain.js` (`EDGE_ORIENT`, `CORNER_ORIENT`, `TDRAMP_PEAK_ORIENT`), kde klíče jsou **sorted alfa** (E před N/S/W) — důsledek: „ES" znamená **SE** (south-east), „EN" znamená **NE** (north-east). Pozor při čtení kódu.

### Ostatní potomky CUBES

- **COMPOSITES** *(abstract)* — potomek CUBES určený pro 3D mesh ze složek (`Group` s více meshi). Po DD-32 (sez. 24) bez pixel-voxel potomků (TREE/GRASS_TUFT/ROCK_PIXEL/LOG smazány, VOXEL_MODEL infrastruktura smazána sez. 29). Aktivní potomci: **LAMP** (sez. 33, DD-40) a **DECOR** (sez. 40, DD-49). Pozice spojitá (float), bez snap-to-grid; Y = world surface (DD-28).
- **LAMP** *(sez. 33, DD-40)* — pouliční lampa Victorian-style. COMPOSITES potomek bez vlastních atributů (zdědí `ORIENTATION` pro rotaci kolem Y). Builder `buildLamp` vyrobí Group: dark-iron sloup 2 j + horizontální paže 0.6 j + visící emissive stínítko + `THREE.SpotLight` uvnitř stínítka (kuželové oranžové světlo dolů, `castShadow=true`, 512×512 cube shadow map). Pattern *„světelný zdroj uvnitř meshe → mesh `userData.noShadow = true`"* aby mesh okolo nebloval vlastní paprsky. Třída + builder + dispatch v `createMeshFor` zachovány i bez aktivní instance ve scéně (sez. 33 testovala, pak odebrala).
- **DECOR** *(sez. 39 kotva DD-49, sez. 40 implementace, sez. 41 DD-51 seasonal cycle + DD-52 slope-aware Y)* — generická COMPOSITES třída pro krajinné dekorace (stromy/keře/kameny/tráva). Atributy: `KIND` (string lookup do `DECOR_BUILDERS`), `SEED` (number, deterministic varianty per instance), `SCALE` (default 1.0), `SNOWED` (boolean, propagované z `cells[i].snowed` v `decorate()` — builder dle flagu přebarví vegetaci/top rock na `SNOW_WHITE`), `SEASON` *(DD-51 sez. 41, string default `"summer"`)* — propagovaný z `world.SEASON` přes `decorSpec.season` → `decorations[].season` → builder `opts.season`. Builder pattern: `buildSpruce/Oak/Bush/Rock/GrassTuft(group, { seed, scale, snowed, season })` mutuje prázdný `THREE.Group` faceted lowpoly primitivy (CylinderGeom / ConeGeom / IcosahedronGeom(0)) se sdíleným `MeshLambertMaterial({ flatShading: true })` per color. Shared toolkit (`src/composites/toolkit.js`): `lowpolyMat` per-color singleton + `getGeomCache` per-(KIND × part) geometry singleton + 7 paleta konstanty (`BARK_BROWN`/`LEAF_GREEN`/`LEAF_AUTUMN`/`ROCK_GRAY`/`GRASS_GREEN`/`BUSH_GREEN`/`SNOW_WHITE`) + re-export `mulberry32` z terrain.js. **Seasonal foliage cycle (DD-51):** oak/bush (listnaté) spring/summer → LEAF_GREEN/BUSH_GREEN, autumn → LEAF_AUTUMN (oranžová), winter (snowed) → defoliated (oak = kmen-only, bush = skip entity v `decorate()` filter); spruce season-invariant (jehličnan); priorita v builderu `snowed > autumn > default`. Biome-aware spawn: `DECOR_DENSITY[latitude][humidity]` lookup v `terrain.js` (wet 0.80→0.20 lineární škála po lat; sez. 41 oak/spruce × 2 pro hustší prales), `DECOR_BASE_SCALE` per-KIND faktor (vegetace/rock `1/3` sez. 41, grass_tuft `1.0×`), `decorate(cells, ramps, latitude, humidity, season, seed)` Krok 7 v `generateTerrain` → `decorations[]` pole. **Y konvence (DD-52 sez. 41):** non-ramp cell `decY = y_top + 0.5` (top face); ramp cell `decY = y_top + 1.0 + slopeT` kde `slopeT = (jitterX·dx + jitterZ·dz) / (|dx|+|dz|)` z `ramps[].slopeDir`. 5 KIND impl: `spruce`/`oak`/`bush`/`rock`/`grass_tuft`. Sub-prah Fáze 6: `stump`/`log`/`palm`/`cactus`/`flower`/`_dead` postfix/density UI control/InstancedMesh refactor (priorita sez. 42 po perf trigger). *(Vrátí decoration vrstvu COMPOSITES po DD-32 wipe sez. 24 pixel-voxel TREE/GRASS_TUFT/ROCK_PIXEL/LOG.)*

### Tekutiny (LIQUIDS 4. vrstva DD-25 extension, DD-54, sez. 45)

> **Sez. 48 cleanup:** PATH třída (DD-27, 3. vrstva LINES) dropla jako M1 artefakt bez konzumenta. LIQUID se z původní 5. vrstvy posouvá na 4. (DD-25 nyní: Bloky / Voxely / Objekty / Tekutiny). DD-54 immutable text zachovává „5. vrstva DD-25 extension" wording — viz DD-55 sez. 48 update poznámku.

- **LIQUID** — tekutina (jezero, řeka, ...). Potomek CUBES (= `LIQUIDS` abstract base třída zatím nezavedena, čeká na druhého sourozence — pattern „abstract base až s 2. konkrétním potomkem" per DD-27 vzoru). 1 instance = 1 connected basin. **Sez. 45 prototype skeleton:** 1 LIQUID = 1 water cell (single-cell instance), plný BFS connected-components clustering = sub-prah. Atributy:
  - `LEVEL` — Y hladiny (sémanticky čitelnější alias pro `Y`; reálně `Y = LEVEL`). Skeleton drží oba kvůli budoucí extension (mesh Y může mít nudge offset proti z-fightu, `LEVEL` zůstává čistá logická hladina).
  - `TEMPERATURE` — `"frozen"` | `"liquid"` enum. Material decision v `createLiquidPlane` (`_iceMat` vs. `_waterMat`). Budoucí: numerický °C pro permafrost / lávu.
  - `BOUNDING_BOX` — `{ w, d }` axis-aligned XZ extent v 1C jednotkách. Prototype vždy `{ w: 1, d: 1 }`.
  - `CELLS` — `[{ x, z }, ...]` cells obsazené tímto LIQUID. Prototype vždy `[{ x, z }]` (1 prvek). Pro DRY identifikaci / clear-path.

  Spawn: `terrain.water[]` raw records (`{x, y, z, frozen, w, d}` z `generateTerrain` Krok 6 Wang & Liu 2006 priority flood) → `buildScene` spawn loop v `main.js` wrappuje do `new LIQUID(id, "Tekutina", x, level, z, temperature, bbox, cells)` + `createLiquidPlane(liquid)` → scene.add. Per DD-11 model/engine separation: `terrain.js` nezná `model.js`, drží raw records. Internal materiály `_waterMat`/`_iceMat`/`_waterGeom`/`_waterMeshes` zachovány (= implementation locality, rename na `_liquid*` až přibude 2. sourozenec). Budoucí extension hooks („fyzika kapalin"): `FLOW_DIRECTION` (rivers/streams paralel PATH POINTS), `VISCOSITY` (lava/oil/acid), `LEVEL` animace (tide/flood/sezonní tání). *(DD-54 sez. 45.)*

### Voxely a suroviny (DD-56 + DD-57, sez. 51, v1.1-voxel-mvp arc)

> DD-56 (sez. 50) zavedl voxel-native surovinový model jako klíčový concept v1.1 arc. DD-57 (sez. 51) modifikoval render-side semantiku (drop autosort) a přidal 5. surovinu `dirt`.

- **VOXEL** — atomární sub-cube `1/V` jedné `CUBES` cell, `V = 4` (hard-coded). 1 cube = `V³` = **64 voxelů**. Edge délka voxelu ve world jednotkách = `VOXEL_EDGE = 0.25`. Renderuje se v 4×4×4 sub-gridu uvnitř 1×1×1 cubu (sub-grid indexy `sx, sy, sz ∈ [0, V)`). Voxely jsou *render-side* entity (= žádná model třída, žádný individuální ID); identita drží přes resource type + parent cube + sub-grid pozici.
- **RESOURCE** — typ suroviny, identifikovaný stringem. MVP 5 typů (DD-57): `water`, `sand`, `dirt`, `stone`, `wood`. Pořadí dle user-spec sez. 51 patch #2. Žádný `grass` (= surface reakce s podnebím, paralel snow). Per-type metadata `{ color, state, density }` v `RESOURCE_REGISTRY` (`src/resources.js`). State = `"solid" | "granular" | "liquid"` (future density-gravity hook). Color = canonical hex sjednocený s prod paletou (BLOCK_COLORS top face + `_waterMat.color` + `BARK_BROWN`).
- **VOXELS** — atribut na `CUBES` (rodičovská třída), `Map<resource, count> | null`. Lazy-init při prvním `addVoxel`. Max součet hodnot = `VOXEL_PER_CELL = 64`. **Insertion order Map** určuje LIFO mechaniku (DD-56 koncept 9, sez. 53 vzducholoď pick `[...VOXELS.keys()].at(-1)` = last-inserted resource = first-picked) — data-side autosort drží i po DD-57 render-side shuffle. Helper metody na CUBES:
  - `addVoxel(resource, count)` — overflow guard 64 (vrátí 0 při překročení), insertion order Map zachová původní key.
  - `removeVoxel(resource, count, lifo=true)` — `lifo=true` (default) bere z poslední insertion key; `lifo=false` bere podle `resource` argument. Po vyprázdnění Map resetuje `VOXELS = null` (memory hygiene).
  - `voxelTotal()` — součet všech voxelů (0 pokud VOXELS null).
  - `voxelLayers(seed=null)` — vrací `[{ resource, sx, sy, sz }, ...]` shuffled per `seed`. Default seed = 3D spatial hash `|⌊X⌋·73856093 ^ ⌊Y⌋·19349663 ^ ⌊Z⌋·83492791| || 1` z cube pozice (deterministic per pozice, reload scény = stejný shuffle pattern). Caller může override seed.
- **Stack mode** vs. **Scatter mode** *(DD-56 koncept 5):*
  - **Stack mode** — `cube.VOXELS` plný (např. rubik 64 voxelů). Pozice voxelů v sub-gridu (shuffled per DD-57). Per-instance rotace identity. Dispatch přes `dispatchVoxelsToBatches(cube)` v `main.js`.
  - **Scatter mode** — single voxel rozhozený po krajině (= terén Krok 8 OnLoad + chop yield). Pozice = surface midpoint + offset podél slope normály, rotace = `setFromUnitVectors(up, slopeNormal)` × random Y rotation. Dispatch přes `scatterRandomVoxels(terrain, sizeX, sizeZ, seed)`. **Slope normály** (default ORIENTATION 0°): TRRAMPS `(0, 1, -1)/√2` (45° svah), TTRAMPS `(1, 1, 1)/√3` (corner peak), TDRAMP fallback identity (sub-prah pro lomenou rampu). Per-instance rotated kolem Y by `surface.orientation`.
- **Voxel batches** — `_voxelBatches: Map<resource, THREE.InstancedMesh>` v `main.js`. 1 batch per resource type, capacity 1024 instances, sdílená `BoxGeometry(VOXEL_EDGE)` + per-resource `MeshLambertMaterial({ color })`. **`MeshLambertMaterial`** sjednocen s `_lowpolyMat` (TCUBES + rampy) — `MeshStandardMaterial` PBR by stejné albedo renderoval cca 12 % tmavší (sez. 51 patch #4 calibration). `userData.terrain = true` (regen cleanup) + `userData.voxel = true` (diskriminátor v `regenerateScene`).
- **Render shuffle (DD-57)** — Fisher-Yates seeded permutation 64 sub-grid pozic. Insertion order Map zachová resource-to-original-slot mapping, shuffle aplikuje resource-to-position. LIFO data-side správný, vizuální „inverted rainbow emergent" (DD-56 acceptance bod 5) zmizel — sez. 53 acceptance přepíšeme (cube se proředí, ne odhalí vrstvy).
- **Chop interakce (sez. 53, DD-49 spec extension + DD-56 koncept 11)** — left-click na chopable DECOR mesh → decor zmizí ze scény + `RESOURCE_YIELD[KIND]` voxely se přidají do chop bucketu nad top TCUBES v té column (přes BFS overflow při full bucket). Implementace v `main.js` `chopDecor` + `addYieldWithBFSOverflow` + `getOrCreateChopBucket`.
- **`RESOURCE_YIELD`** — per-KIND fixed yield tabulka v `src/composites/builders.js`. Object `{ resource: count }` per KIND. **Chopable** (yield > 0): spruce=8/oak=12/palm=6/stump=3/log=5/cactus=2 wood, rock=4 stone. **No-yield**: bush/flower/grass_tuft (= vegetace, hover infotip stačí). Predicate `hasChopYield(kind)` pro UI rozlišení. Fixed per KIND (= deterministic, KISS); random yield per chop je sub-prah (mission-driven extraction → IDEAS).
- **Chop bucket** — lazy-create abstract `CUBES` instance 1 cell **nad** top TCUBES (= rubik-like nad terrain top, ne uvnitř solid = no z-fight). Registr `_chopBucketByColumn: Map<"x,z", CUBES>` v `main.js`. Bucket akumuluje yieldy z opakovaných chopů ve stejné column (max 64 voxelů = V³). Registrován v `_voxelOwners` pro `rebuildAllVoxels()` replay. Cleanup v `regenerateScene`.
- **`_voxelOwners`** — Set `CUBES` instances s `VOXELS` Map pro full re-dispatch při runtime mutaci. Členové: rubik (sez. 51) + chop buckets (sez. 53). Scatter voxely jsou floating bez owner (deterministic per seed → replay z `_lastSpawnArgs` cache).
- **`rebuildAllVoxels()`** — chop interakce trigger. Clear batches count (= 0) + replay každého `_voxelOwners` přes `dispatchVoxelsToBatches` + replay scatter z cache. Full re-dispatch = O(all voxels) per chop, ale 20×20 target <1 ms (per-voxel batch tracking sub-prah).
- **BFS overflow (sez. 53, A11 emise zahodit varianta)** — chop bucket overflow handling. 4-neighbor (N/S/E/W) max 3 hops přes `_topTcubesByColumn` lookup, silent drop přebytek po exhaust (žádný UI feedback = scope creep).
- **Hover diferenciace (sez. 53)** — `HOVER_EMISSIVE_CHOP = 0x802020` (warm red) pro `DECOR + hasChopYield`, `HOVER_EMISSIVE_HEX = 0x404020` (žlutý) jinde. Plus `canvas.style.cursor = "pointer"` cursor cue nad chopable, default jinde. Affordance komplementární s red emissive.
- **Out-of-scope v1.1 (DD-56 → IDEAS):** TRANSFORMER recipes, CONSUMER sinks, dopravník/Factorio belt, Stickman ground transport, mission-driven chop, mining 1 cube → V³ voxels + building V³ voxels → 1 cube (Fáze D = samostatný arc), water LEVEL drain při těžbě (LIQUID extension), multi-balon fleet, density gravity / pile shape.

### Nevizuální potomky OBJECTS

- **WORLD** — singleton DO (Data Object) pro globální atributy scény. Bez `X/Y/Z` (DD-01 demonstrace separace vizuální/modelová entita). Aktuální atributy:
  - `DAY ∈ [0,1)` (fáze 24h cyklu, **DD-43 mapping**: `0=půlnoc`, `0.25=východ`, `0.5=poledne` *(default)*, `0.75=západ`). Supersede DD-38 původní `0.25=poledne` mapping.
  - `DAY_SPEED ∈ ℝ` (cykly za sekundu; default `0.001` = ~17 min/cyklus, sez. 40 user wish).
  - `LATITUDE ∈ {tropical, subtropical, temperate, polar}` *(DD-42)* — geografické pásmo. Default `temperate` (parita s DD-38 původním fixed 30° tilt). Konzument: `SUN_TILT_BY_LATITUDE` lookup v `updateSun()` (rovník = sun overhead, póly = sun nízko).
  - `HUMIDITY ∈ {wet, mid, dry}` *(DD-42)* — vlhkostní pásmo. Default `mid`. Druhá osa biome matice 4×3 (LATITUDE × HUMIDITY = 12 biomů, viz `BIOME_NAMES` v `terrain.js`). Konzumenti: UI biome readout (`BIOME_NAMES`) + **surface mix driver** (`BIOME_SURFACES`, DD-44 sez. 36).
  - `SEASON ∈ {spring, summer, autumn, winter}` *(DD-50, sez. 40; sez. 47 plný scope)* — roční období. Default `summer` (bezsezonní stav). Konzumenti: `snowSpecForLatitude(lat, season)` modifikuje temperate `patchThreshold` (zima 60 % snow, summer 0 %) i polar (winter 100 %, summer 60 % — ablation, sez. 47); `waterSpecForClimate(lat, hum, season)` modifikuje temperate `freezeRatio` (zima 0.7 ice, summer 0.0) i polar (winter 1.0, summer 0.4, sez. 47). Tropical/subtropical season-invariant. Plus sky+sun HSL tint v `updateAtmosphere`/`updateSun` pro temperate LATITUDE (sez. 47).

  Engine konzumenti: `updateSun()` derivuje pozici DirectionalLight + intensity + sun mesh z `DAY` × `LATITUDE`; `updateAtmosphere()` lerpuje sky/fog/ambient z `DAY` (DD-39); `updateWorldTime(dt)` inkrementuje `DAY` o `dt * DAY_SPEED`; `buildScene()`/`regenerateScene()` derivují `surfaces` parametr `generateTerrain` z `LATITUDE × HUMIDITY` přes `surfacesForBiome()` (DD-44). Politika *„atribut přibude jen s živým konzumentem"* držena (DD-29 → DD-38 → DD-42 → DD-44). Sez. 20 zavedl s `WIND_STRENGTH`; sez. 29 audit ho odstranil po DD-32 wipe `tree_sway`; sez. 32 vrátil s `DAY`/`DAY_SPEED` (DD-38); sez. 35 přidal `LATITUDE`/`HUMIDITY` (DD-42) + DAY mapping fix (DD-43); sez. 36 přidal `BIOME_SURFACES` druhého konzumenta (DD-44). Dev exposure: `window.world`. *(M8+.)*

## Terrain generator (DD-32, sez. 25)

`generateTerrain({ size, relief, surfaces, seed })` v `src/terrain.js` produkuje 3D scénu z parametrického popisu místo hardcoded layoutu. Vrací `{ blocks, water, ramps }`.

### Parametry

- **`size`** — `[sx, sz]` rozměr terénu v 1C voxelech (default `[10, 10]`, slider rozsah 3..100 — sez. 30; sez. 31 DD-37 InstancedMesh refactor dosáhl FPS 104 @ 100×100 seed 42, draw calls ~1k).
- **`relief`** — integer 0..10 řídící amplitudu + frekvenci heightmap. **11 pojmenovaných stupňů** (slider label): `0 Flat`, `1 Level`, `2 Gently undulating`, `3 Rolling hills`, `4 Hilly`, `5 Uneven`, `6 Rugged`, `7 Craggy`, `8 Mountainous`, `9 Heavily dissected` *(roadmap valley carving)*, `10 Alpine` *(roadmap ridge noise)*. Aktuálně `9` a `10` clamp na `8` s warningem.
- **`surfaces`** — `{ grass, stone, sand }` mix v rozsahu [0, 1], sum=1 (po DD-47 sez. 38 drop water column). Mapuje biome map noise → kind: low-freq noise → sort + exact-match thresholds = souvislé klastry. Y modifier: `sand−1` (poušť/údolí), ostatní 0.
- **`seed`** — integer pro `mulberry32` RNG (default `42`). Determinismus = stejný seed + parametry → bit-identical scéna.
- **`snowSpec`** *(DD-47 sez. 38, DD-50 sez. 40 SEASON rozšíření)* — `{ mode, altThreshold?, patchThreshold?, altBias? }`. Driver-derived z `world.LATITUDE × SEASON` přes `snowSpecForLatitude(latitude, season)` helper. `mode = "polar"` → vše snowed (season-invariant); `mode = "temperate"` → cells s `y_top ≥ altThreshold` (default 6) vždy + top `(1 - patchThreshold)` % zbylých cells dle altitude-biased noise score (sort+rank pattern), patchThreshold per season (summer 1.0 = 0 %, spring/autumn 0.85 = 15 %, winter 0.4 = 60 %); `mode = "none"` → bez sněhu.
- **`waterSpec`** *(DD-47 sez. 38, DD-50 sez. 40 SEASON rozšíření)* — `{ enabled, freezeRatio? }`. Driver-derived z `world.LATITUDE × HUMIDITY × SEASON` přes `waterSpecForClimate(lat, hum, season)` helper. `dry` → bez vody (poušť), `wet`/`mid` → flood-fill enabled. `freezeRatio` 1.0 (polar, invariant) / per-season (temperate: summer 0.0, spring 0.2, autumn 0.3, winter 0.7) / 0.0 (sub/tropical, invariant).
- **`decorSpec`** *(DD-49 sez. 40, DD-51 sez. 41 SEASON rozšíření)* — `{ mode, latitude, humidity, season }`. Driver-derived přes `decorSpecForClimate(lat, hum, season)` helper. `mode = "biome"` → `decorate()` Krok 7 v `generateTerrain` provede biome-aware scatter (DECOR_DENSITY lookup), `mode = "none"` → bez DECOR. `season` (DD-51) propagovaný do každé `decorations[i].season` → builder volí listovou paletu (oak/bush v autumn = LEAF_AUTUMN; snowed = winter defoliated).

### Engine

Value-noise heightmap (od DD-45 fBm + ridge³ blend, DD-46 smoothstep bimodální pro r ≥ 6) → biome map → sloupcové vyplnění (top voxel dle biome, dirt middle, stone yBottom) → snow distribution per LATITUDE (DD-47 `snowSpecForLatitude` — polar all / temperate sort+rank) → water priority flood (DD-47 `waterSpecForClimate` + MinHeap, viz „Water flood-fill" sekce) → ramp smoothing (viz níže). Validace fail-fast.

### Terrain kindy (biome IDs)

Po DD-41 (sez. 34) vertex-color lowpoly paleta v `BLOCK_COLORS` (main.js), ne procedurální textury. Po DD-47 (sez. 38) **water surface kind dropped** (voda jako entita LIQUID prototype, ne surface biome).

- **`grass`** — TOP zelená, BOTTOM/SIDE earth (= dirt).
- **`dirt`** — všech 6 ploch earth.
- **`stone`** — všech 6 ploch šedá.
- **`sand`** — všech 6 ploch písčitě žlutá. Biome surface s Y modifier −1.

**Snow varianty (DD-47 sez. 38, kind enum 4→8):**
- **`grass_snow`** / **`dirt_snow`** / **`stone_snow`** / **`sand_snow`** — TOP=`0xf5f5f5` (off-white), BOTTOM/SIDE base. Top voxel snowed cell dostane `_snow` postfix. Ramps dědí přes source cell svahu (SLOPE+TOP white, BACK/sides base). Sloupcové vrstvy beze změny (sníh leží shora).

### Ramp smoothing layer (DD-33, sez. 26)

Po heightmap → biome → spawn engine analýzuje 4-cell sousedství a doplňuje rampy nad step (= sousední cell s `Δy = +1`) podle topologie:

- **TRRAMPS edge** (DD-33) — 1 direct vyšší soused → klín. Greedy criticality + compatibility filter (drop pokud target buňka má perpendikulární TRRAMPS = bok).
- **TTRAMPS corner** (DD-33) — isolated diag peak (0 direct vyšších + 1 diag vyšší + oba direct sousedi na úrovni A) → jehlan k diagonálnímu apex. Vyhlazení rohu.
- **TDRAMP diagonal** (DD-35) — 2-stage detekce. **Stage 1:** 3-cell convex peak (2 sousední direct + 1 diag vyšší). **Stage 2:** L-shape (2 sousední direct vyšší bez diag peaku). Strict-dominuje 1× TRRAMPS edge.

Každá `ramps[]` entry (DD-52 sez. 41) má pole `slopeDir: { dx, dz }` — unit vector od low end → high end (edge: axial s norm=1; corner/diagonal: diagonální s norm=2). Konzument `decorate()` pro slope-aware DECOR Y.

### Water flood-fill (DD-47, sez. 38, LIQUID prototype)

Po Krok 5 ramps Krok 6 vyplňuje negativní útvary (basins) vodou. **Priority flood** (Wang & Liu 2006):

1. **Boundary init:** cells na 4 stranách scény dostanou `water_level = y_top` + push do `MinHeap` (binary heap, ~30 ř.).
2. **Flood:** pop min level, propaguj k zatím nevisited sousedům → `nLevel = max(level, neighbor.y_top)`. Vyšší inner cell tlumí stoupání hladiny.
3. **Mark:** cell má vodu pokud `water_level > y_top` (strictly). Boundary jako overflow drain (interpretace „okraj scény = okraj pro vodu").
4. **Frozen flag** per cell: `freezeRatio ≥ 1.0` (polar) → vše ice, `≤ 0.0` (sub/tropical) → vše voda, mezi (0..1, temperate 0.3) → `iceNoise(x, z) > (1 - freezeRatio)` threshold per cell (~30 % ledové ostrůvky).
5. **Hladina Y** plane = `water_level + 0.45` (= 0.05 **pod** top face rim cell → břeh voxel mírně „trčí" jako reálný shore).

Komplexita O(N log N), pro 100×100 = 10k cells trivial.

## Vizuální zdroje

Po sez. 48 cleanup TheCubes scéna se buduje ze dvou vizuálních zdrojů:

- **Voxelová podlaha / terrain** → procedurální **BLOCKS rodina** (TCUBES + TRRAMPS/TTRAMPS/TDRAMP) s lowpoly vertex-color paletou (DD-41).
- **Krajinné dekorace + lampy + tekutiny** → **COMPOSITES** rodina (LAMP, DECOR) a **LIQUID** (PlaneGeometry water/ice).

### Lowpoly vertex-color pipeline (DD-41, sez. 34)

**Princip (po DD-41, supersede DD-36 atlas):** per-face barvy zapsané přímo do `geometry.attributes.color` (24/12/18/24 floats per geom dle typu × 3 RGB kanály), shader čte vertex colors přímo z attribute. Jeden sdílený `_lowpolyMat = new THREE.MeshLambertMaterial({ vertexColors: true })` napříč všemi terrain batchi (TCUBES + rampy). Per-kind / per (typ, surface) BoxGeometry / BufferGeometry drží barvy v `color` attribute.

**TCUBES (`getTcubesKindGeom(kind)`):** `BLOCK_COLORS` 3-key paleta (TOP/BOTTOM/SIDE × 4 kindy `grass`/`dirt`/`stone`/`sand`). Per kind sdílená `BoxGeometry(1,1,1)` se color attribute zapsanou v pořadí faces (+X/−X/+Y/−Y/+Z/−Z): SIDE/SIDE/TOP/BOTTOM/SIDE/SIDE. sRGB hex → linear convert per kanál (renderer výstup je sRGB, vertex colors v linear).

**Rampy (`getRampGeom(type, surface)`):** Per (typ, surface) klonuje atlas IIFE raw geom (TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE — zachované jako raw geom source), drop `uv` attribute, inject `color` attribute. `RAMP_FACE_VERT_COUNTS` per typ (`[4,4,4,3,3]` / `[3,3,3,3]` / `[3,3,4,8,6]`), `RAMP_FACE_PALETTE_KEYS` mapuje faceIdx na `BLOCK_COLORS[surface]` klíč (TOP/BOTTOM/SIDE). TDRAMP SLOPE+TOP sdílí `.TOP` (lomený povrch).

**flatShading: false (důležitý fix).** BoxGeometry + ramp BufferGeometries už mají per-face normály v `geometry.attributes.normal` (vertices nesdílené přes faces) → flat look vzniká z geometrie. `flatShading: true` na materiálu by nutilo shader spočítat normálu z `dFdx/dFdy` derivatives → u **InstancedMesh** cross-instance precision drift = tenké šedé/černé seam linky mezi sousedy (DD-41 known fix sez. 34).

**Fallback path** (`_checkerboardMat` const v `main.js`): jediný non-batch případ — neznámý TCUBES kind (`instance.NAME` mimo `BLOCK_COLORS` mapu). Šachovnice signalizuje „strana nevyplněná" (DD-07). Po sez. 49 K1 cleanup je toto **jediná** konzumace `checkerboardTexture` (slow-path face material dispatch + named texture factories + emoji texture dropnuté jako YAGNI, M6/SPRITES residue po DD-41 + sez. 48 PATH drop).

**Engine-internal maps** (sez. 38 audit dodatek, [[D4]]): kritická infrastruktura, kterou onboard-čtenář potřebuje znát.
- `_terrainBatches` (`main.js`) — `Map<string, InstancedMesh>` klíčované `"tcubes:<kind>"` / `"<typ>:<surface>"` → batch dispatched z `pushInstanceToBatch`. Sez. 31 DD-37 pipeline backbone.
- `meshByInstance` (`main.js`) — `Map<instance.ID, THREE.Object3D | { batch, idx }>`. Single-mesh case mapuje na Object3D, batch case na `{ batch, idx }` tuple. Spotřebovává hover + tooltip + cleanup v `regenerateScene`.
- `_checkerboardMat` (`main.js`) — sdílený `MeshStandardMaterial` s šachovnicovou texturou pro neznámý TCUBES kind (`getTcubesKindGeom` falsy). Atomic singleton po sez. 49 K1 cleanup.
- `_lowpolyMat` (`main.js`) — jeden sdílený `MeshLambertMaterial({vertexColors:true})` napříč všemi terrain batchi. Lifecycle = aplikace.
- `_waterMat` / `_iceMat` (`main.js`, DD-47/DD-48 sez. 38) — sdílené `MeshStandardMaterial` pro LIQUID prototype. Water: 0x3a7090, opacity 0.55, metalness 0.20, roughness 0.25. Ice: 0xd9e8ec, opacity 0.85, metalness 0.05, roughness 0.55 (větší zákal + menší reflexe per user spec).
- `_waterMeshes` (`main.js`, DD-48 sez. 38) — `Set<THREE.Mesh>` pro water wave anim. Jen non-frozen water cells. Ice meshes vynechány (rigid surface). Cleared v `regenerateScene`. Per-frame `position.y = baseY + sin(t × ω) × 0.04` (period 9 s).
- `RAMP_FACE_VERT_COUNTS` / `RAMP_FACE_PALETTE_KEYS` (`main.js`) — per-typ tabulky (`trramps`/`ttramps`/`tdramp` → `[face vertex counts]` resp. `[BLOCK_COLORS klíče]`) pro vertex-color injection v `getRampGeom`.

**Historické (DD-36 atlas, supersededDD-41):** Sez. 28 zavedla TCUBES atlas (`_tcubesAtlasMatCache`, 4 atlas materials = 6 facelets × 16 px do CanvasTexture 96×16 per kind), sez. 30 ramp atlas (`_rampsAtlasMatCache`, 9 atlas materials). DD-41 smazala obě cache + atlas builders + texture tabulky (`BLOCK_TEXTURES`, `RAMP_*_TEXTURES`, `RAMP_ATLAS_SPECS`, `RAMP_SURFACE_FROM_KIND`, `ATLAS_*` konstanty, `createTRRampFor`/`createTTRampFor`/`createTDRampFor` slow-path funkce). Důvod: atlas vyřešil draw call count (DD-37 InstancedMesh batche pak srazila na ~13 calls), ale tile pattern uvnitř kindu zůstal jako vizuální dluh. DD-41 lowpoly = solid color flat look, eliminuje dluh + simplifikuje pipeline (~−250 ř.) + připravuje G3 (climate-driven barvy = data, ne textury).

### Procedurální canvas textury (historie)

Sez. 4 (M6) DD-14 face material dispatch zavedl 6× JS-generované pixel-art textury 16×16 px sdílené přes `NAMED_TEXTURE_FACTORIES` lookup (`:dirt`, `:grass-top`, `:stone`, `:sand`, `:rail-top`, `:path-dirt`) + `makeEmojiTexture` pro arbitrary string fallback. **Po DD-41 (sez. 34) terrain BLOCKS textury nepoužívají** — vertex-color pipeline nahradila atlas + slow-path face material dispatch. **Po sez. 48 cleanup** PATH dropnut → `:rail-top` + `:path-dirt` bez konzumenta. **Po sez. 49 K1 cleanup** celá `:named-texture` paleta + `makeEmojiTexture` + `faceMaterialFor` dispatch dropnuté jako YAGNI residue. Revert z git historie (pre-sez. 49 commits) pokud TCUBES strana = decorative emoji/text label někdy přijde (= Stickman post-close integrace, ID labels).

## Měřítko a Y konvence (DD-22 + DD-28)

**Pevné měřítko** — 1 TC voxel = 1 m.

**Y konvence (DD-28 sez. 18) — sjednocená pro BLOCKS:**

| Třída / rodina | `instance.Y` semantics | Pro stojící na grass podlaze (gy=−1) |
|---|---|---|
| **BLOCKS** (CCUBES, TCUBES, TRRAMPS, TTRAMPS, TDRAMP) | grid Y voxelu (= mesh **center**) | `Y = 0` (1C blok nad podlahou) |
| **COMPOSITES** (LAMP, DECOR), **LIQUID** | spojité Y (float, decY z `decorate()` na top voxelu) | dle scatter / flood-fill |

**BLOCKS = grid-Y** (1C grid-aligned bloky terénu, snap-to-int v rendereru DD-12 vynucuje konvenci automaticky — uživatel uvažuje „blok je ve sloupci gy=0").

## Pojmy

- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Aktuální použití po sez. 49 K1 cleanup: šachovnice (`_checkerboardMat`) na neznámý TCUBES kind (DD-07 placeholder), ice canvas texture (`_iceTexture`, sez. 47). Terrain TCUBES + rampy textury **nepoužívají** od DD-41 (sez. 34, lowpoly vertex-color pipeline); `:named-texture` paleta dropnutá sez. 49 K1.
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Po sez. 48 cleanup SPRITES třída + canvas bubbles dropnuté (bez konzumenta v terrain scope).
- **Voxel** — krychlová jednotka. 1 TC voxel = 1 m (= 1 instance CCUBES/TCUBES).
- **Pixel-art** — vizuální styl s viditelnými „pixely". Dosahujeme přes `NearestFilter` na `CanvasTexture` (nezablurovaná interpolace) + nízké rozlišení (16×16 typicky). Aktuálně přítomné v: `checkerboardTexture` (DD-07 fallback) a `_iceTexture` (sez. 47 ice surface). Procedurální `:named-texture` paleta + atlas pipeline (DD-36) historické, dropnuté sez. 49 K1 / DD-41.
- **Biome** — kind terénního povrchu (`grass`/`dirt`/`stone`/`sand` + DD-47 `_snow` postfix varianty per kind) — klastr v biome map noise. Klastruje se nízkofrekvenčním šumem do souvislých oblastí, ne per-cell randomly. *Water dropped po DD-47* — voda nyní entity LIQUID prototype přes priority flood, ne surface kind.
- **Heightmap** — 2D mřížka Y hodnot per (x, z) cell. Value-noise (mulberry32 + bilineární smoothstep + wrap-around) z parametrů `relief` × `seed`.
- **Step** — výškový rozdíl ±1 mezi sousedními cells heightmap → kandidát pro ramp smoothing layer (DD-33).

## UI

- **Perf HUD** *(sez. 28)* — diagnostický overlay v pravém horním rohu, throttled report 1×/s: **FPS** (rolling avg přes vteřinu), **calls** (`renderer.info.render.calls` per frame), **tri** (`renderer.info.render.triangles`), **geom** (`renderer.info.memory.geometries`). Permanent UI, ne dev-only — observability pro budoucí perf refactory. *(Sez. 48 cleanup: `#hud` panel s `TIME` + COUNTER řádky dropnutý, perf HUD jediný permanentní HUD overlay.)*
- **Terrain control panel** (`#terrainctrl`, sez. 26) — UI panel pravý dolní roh, řídí `generateTerrain` parametry: slidery size sx/sz (3..30), relief (0..10) s názvy stupňů, 4 surface slidery (auto-normalize), seed input. Trigger `change` event → `regenerateScene` (filter `userData.terrain` flag, remove + spawn).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Hover highlight** — zvýraznění objektu pod kurzorem. Dva mechanismy podle reprezentace instance (DD-37 sez. 31):
  - **Batch case** (terrain bloky/rampy v `InstancedMesh`) — `setColorAt(idx, HOVER_TINT_COLOR)` overbright albedo tint `(1.6, 0.8, 0.2)` = sytá oranžová. `Float32Array` v `InstancedBufferAttribute` nemá clamp → values > 1.0 = projasnění.
  - **Single-mesh case** (slow-path TCUBES, water, COMPOSITES jako LAMP/DECOR) — žluté emissive světélkování (`mat.emissive = 0x404020`) přes lazy clone-on-first-hover (materials klonujeme per mesh, originály v `userData.hoverOrigMat`, klony s yellow emissive v `userData.hoverHotMat`).
- **Sun mesh** *(sez. 31)* — drobná bílá koule reprezentující slunce. `SphereGeometry(1.5, 16, 16)` + `MeshBasicMaterial(color: 0xffffff, fog: false)` (unlit = svítí vlastní bílou nezávisle na DirectionalLight; `fog: false` jinak by mlha rozpustila). Pozice `sun.position × SUN_DISTANCE_SCALE`. Auto-hide pod horizontem (`sunMesh.visible = sun.position.y > SUN_HORIZON_Y_MIN`, sez. 47 −15° threshold; sez. 48 drop user toggle = slunce vždy ON s auto-hide).
- **Atmospheric fog** *(sez. 31)* — `THREE.Fog(_skyDay.getHex(), 30, 120)` lineární mlha matchne `scene.background`. Vzdálené objekty plynule blednou. Drží se reference `sceneFog` pro toggle restore. Barva reactive na `world.DAY` (DD-39 — kopie z `scene.background` per-frame). Toggle přes `#settings`.
- **Atmospheric lerping** *(sez. 33, DD-39)* — `updateAtmosphere()` per-frame lerp 3 cílů podle `daylight = max(0, sin(2π·world.DAY))`: `scene.background.color` (`lerpColors(_skyNight, _skyDay, daylight)`), `sceneFog.color` (`copy(scene.background)`), `ambientLight.intensity` (`AMBIENT_NIGHT..AMBIENT_DAY`). Třetí konzument DD-38 `world.DAY` po `updateSun()`. Konstanty: `_skyDay = 0x1a1a2e`, `_skyNight = 0x000000` (úplná čerň), `AMBIENT_DAY = 0.15`, `AMBIENT_NIGHT = 0.005` (téměř 0). Bez sunset oranžového peaku — 2 keypointy lineární lerp, sunset roadmap.
- **DOF (Depth of Field)** *(sez. 31)* — post-processing efekt rozostření mimo ohnisko. `EffectComposer` pipeline: `RenderPass` (scéna + depth) → `BokehPass` (Gaussian blur dle depth, `focus` / `aperture: 0.0005` / `maxblur: 0.005`) → `OutputPass` (sRGB color-space correction). Focus dynamic v animate(): `bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target)`. Toggle přes `#settings`.
- **Settings panel** (`#settings`, sez. 31) — UI panel levý dolní roh. 2 checkbox toggles (DOF, Fog, default ON) + slidery DAY/DAY_SPEED + Climate. Wire na `window.settings = { setDOF, setFog, setDay, setDaySpeed, setLatitude, setHumidity, setSeason }` API. *(Sez. 48 cleanup: `set-sun` checkbox + `setSun` API + `_sunUserVisible` flag dropnuté — slunce vždy ON s auto-hide pod horizontem.)*
- **Šachovnicová textura** — vizuální idiom „vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.
- **Klávesové ovládání kamery** *(sez. 14)* — WASD pan v rovině scény, Q/E rotace kolem cíle, Y/X zoom. Per-frame v render loopu, smooth dle `dt`. `heldKeys` Set + window keydown/keyup/blur listener.

## Milníky

> **M-Genesis arc (sez. 48–~52, in progress)** — terrain generator iterace v1.0. DD-55 sez. 48 cleanup zafixoval scope = 8 tříd (OBJECTS / CUBES → BLOCKS/COMPOSITES/LIQUID / WORLD). M1-M5 milestone artefakty (SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE) dropnuté jako YAGNI bez konzumenta v terrain scope; v git historii (sez. 4-9 commits) dostupné pro pozdější revert (Stickman integrace, gameplay vrstva). M-Genesis close ceremonie + git tag v1.0 = Fáze 5 v probíhajícím arc (`%AUDIT:CODE` → `%AUDIT:DOCS` → pruning → `%CALIBRATE` → ceremonie).

- **M1** *(sez. 1)* — statická 3D scéna s jednou kostkou, ovládatelná kamera, hover infotip. *(TIME/HUD dropnuté sez. 48 cleanup.)*
- **M2** *(sez. 2)* — orientační pomůcky (GridHelper, AxesHelper, smazány sez. 14) + první potomek `CUBES` (tehdy `TERRAIN`, dnes `CCUBES`) + 3×3 grid.
- **M3** *(sez. 3)* — COMPOSITES (DD-23 přepsán na pixel-voxel, sez. 24 smazán), float souřadný systém (DD-12), terminologie potomků (DD-13).
- **M4** *(sez. 3)* — stínovací systém (shadow map, PCF soft).
- **M5** *(sez. 4)* — SPRITES (dialog bubble, canvas-generovaný text). *(Dropnuté sez. 48 cleanup — bez konzumenta po DD-32 terrain pivot.)*
- **M6** *(sez. 4)* — TCUBES (per-face textury → DD-41 lowpoly vertex-color). DD-14 zafixoval dispatch podle typu atributu.
- **M7** *(sez. 5)* — Chování v čase: atribut `ANIMATE` na OBJECTS (DD-15), dispatch v enginu. *(Dropnuté sez. 48 cleanup — 4 kindy rotate/orbit_stadium/pulse/drift bez aktivního klienta po DD-32 pivot. Připravený revert pro Stickman integraci.)*
- **M8+** *(sez. 6–28, průběžně)*:
  - *Sez. 6+7:* `rotate`, `orbit_stadium`, `pulse`, `drift` animátory.
  - *Sez. 8:* dynamický 3D ocásek SPRITES (DD-16 — `SPEAKER` + `SPEAKER_OFFSET_Y`).
  - *Sez. 9:* TIMER + COUNTER (DD-17).
  - *Sez. 10–13:* humanoidní rodina CHARACTER/NOODLE/STICKMAN (DD-18/19/20) — sez. 14 přesunuto do sibling projektu `./source/Stickman`.
  - *Sez. 14:* 10×10 voxelová dioráma, klávesové ovládání kamery, MagicaVoxel pipeline (DD-21).
  - *Sez. 15:* Pevné měřítko (DD-22), all-voxel pivot (DD-23), shape × surface separation (DD-24).
  - *Sez. 16:* 4-vrstvá taxonomie + BLOCKS rodina (DD-25).
  - *Sez. 17:* Sjednocená ORIENTATION (DD-26), PATH třída (DD-27).
  - *Sez. 18:* Sjednocená Y konvence (DD-28).
  - *Sez. 20:* WORLD singleton (DD-29) — smazán sez. 29 (audit cleanup, žádný konzument po DD-32), re-introduce sez. 32 (DD-38).
  - *Sez. 21–23:* factory-observer pivot (DD-30 + DD-31) — smazán DD-32.
  - *Sez. 24–26:* **terrain generator pivot** (DD-32), ramp smoothing layer (DD-33 + DD-34 + DD-35).
  - *Sez. 28:* **TCUBES atlas refactor** (DD-36) — 6× redukce draw calls.
  - *Sez. 29:* Audit cleanup — smazána VOXEL_MODEL + WORLD infrastruktura bez konzumenta.
  - *Sez. 30:* Rampy atlas refactor + size 100×100 unlock — atlas pipeline vyčerpaná (FPS 7 @ 100×100, draw calls 47k).
  - *Sez. 31:* **InstancedMesh refactor** (DD-37) — FPS 7 → **104** @ 100×100 (15×), draw calls 47k → **1k** (47×). Plus sun mesh + post-process (fog + DOF/BokehPass) + settings panel.
  - *Sez. 32:* **WORLD re-introduce** (DD-38) s DAY/DAY_SPEED — sun mesh + DirectionalLight reactive (intensity lerp = noc tmavá, 30° náklon dráhy). UI slidery v `#settings`. Plus audit follow-up F5/F6/F10/F11/F14.
  - *Sez. 33:* **DD-39 atmospheric lerping** (sky/fog/ambient reactive na DAY) + **DD-40 LAMP/SpotLight** (Victorian-style pouliční lampa, pattern `userData.noShadow` na mesh okolo světla).
  - *Sez. 34:* **DD-41 Lowpoly vertex-color pipeline** (supersede DD-36 atlas) — `BLOCK_COLORS` paleta, sdílený `MeshLambertMaterial({ vertexColors: true })`, per-kind / per (typ, surface) geometry s color attribute. Smazána atlas pipeline. Inspirace `jasonkneen/tiny-world-builder`. Plus 4 TODO follow-up (drop-in anim, tilt-shift, ExtrudeGeom, adjacency-aware re-render).
  - *Sez. 35:* **DD-42 G2 Climate** (`WORLD.LATITUDE` × `HUMIDITY` 4×3 matice biomů, `SUN_TILT_BY_LATITUDE` lookup nahrazuje DD-38 fixed tilt, UI Climate sekce v `#terrainctrl`, polar/wet alias polar/mid) + **DD-43 DAY mapping fix** (standardizace 0.5=poledne, supersede DD-38 sun position math). Plus G1 `maxReliefForSize(sx,sz)` clamp slider rozsahu.
  - *Sez. 36:* **DD-44 G3 SURFACES driver-derived** (`BIOME_SURFACES` 4×3 lookup × 4 koef., `surfacesForBiome(lat, hum)` helper, UI surface slidery smazány = hard override z Climate) + **DD-45 fBm + ridge³ blend heightmap** (multi-octave fBm 3 oktávy + ridge cubed pro vrcholy, váhy podle relief).
  - *Sez. 37:* **DD-46 Smoothstep bimodální heightmap** pro `relief ≥ 6` — `t = smoothstep(0.4, 0.6, fbmVal)`, `lerp(VALLEY_AMP=−1, PEAK_AMP=amplitude, t)`. Bimodální distribuce (údolí + peaks, úzký transition). Pro r ≤ 5 DD-45 beze změny.
  - *Sez. 38:* **DD-47 G6 Climate-driven surface state** (drop water surface, `snowSpecForLatitude` polar all / temperate sort+rank top 30 % s altitude bias score, `waterSpecForClimate` priority flood Wang & Liu 2006 přes interní `MinHeap`, `freezeRatio` polar 1.0 / temperate 0.3, `BIOME_SURFACES` 12×3 redistribuce, `BIOME_NAMES.tropical.wet` rename, `BLOCK_COLORS` 4→8 `_snow` varianty) + **DD-48 Atmospheric color extensions** (sun color 3-keypoint piecewise sunrise/mid/noon, sky 3-keypoint piecewise night/dusk/day, adaptive fog distances z size, ice materiál `_iceMat`, water wave anim sinusová `_waterMeshes` Set, dirt color lighten pro hover kontrast). Audit cleanup: TTUNELS class drop (žádný producer po DD-32), BLOCKS+COMPOSITES import drop (unused), GLOSSARY engine-internal maps doplněny.
  - *Sez. 39:* **%AUDIT:DOCS cleanup** (4 K + 9 D + 6 KK + 2 S nálezů) + **DD-49 kotva** pro krajinné COMPOSITES (DECOR plánovací, bez impl).
  - *Sez. 40:* **DD-49 plná implementace** (Fáze 1-5: toolkit + 5 buildery + DECOR třída + DECOR_DENSITY scatter + smoke test) + **DD-50 SEASON driver** minimal scope (4-enum, temperate snow + ice modifier) + 7 user kalibrací (snow caps na zasněžených dekoracích, DECOR scale 0.5×, DAY_SPEED default 0.001, BIOME_SURFACES mid+dry rebalance, bílá tráva snowed, ramp Y fix, bush cluster.y proporční k scale.y, wet DECOR_DENSITY 80%→20% lineární škála po latitudě). 2 nové soubory `src/composites/{toolkit,builders}.js`.
