# Glossary

Canonical terminologie projektu TheCubes. Stav po sez. 39 (DD-32 terrain sandbox pivot, DD-33 ramp smoothing layer, DD-34 orientation mapping centralizace, DD-35 TDRAMP class, DD-36 TCUBES atlas pipeline *(nahrazeno DD-41)*, DD-37 InstancedMesh batch pipeline, DD-38 WORLD re-introduce s DAY/DAY_SPEED *(sun position math superseded DD-43, atmospheric lerp 2-keypoint superseded DD-48)*, DD-39 atmospheric lerping *(2-keypoint nahrazen 3-keypoint DD-48)*, DD-40 LAMP/SpotLight pattern, DD-41 lowpoly vertex-color pipeline, DD-42 G2 Climate WORLD LATITUDE×HUMIDITY + sun tilt driver, DD-43 DAY mapping standardizace 0.5=poledne, DD-44 G3 SURFACES driver-derived per biome *(BIOME_SURFACES 4-col → 3-col v DD-47 drop water)*, DD-45 fBm+ridge³ heightmap pro high relief, DD-46 smoothstep bimodální heightmap pro r≥6, DD-47 G6 climate-driven surface state *(drop water surface kind, snow distribution per LATITUDE, water LIQUID prototype flood-fill, ice materials)*, DD-48 atmospheric color extensions *(sun color 3-keypoint piecewise + sky 3-keypoint dusk + adaptive fog + ice + water wave anim)*, **DD-49 Asset content pipeline pro krajinné COMPOSITES** *(sez. 39 kotva, bez impl — generická `DECOR` třída + 5 procedurálních builderů spruce/oak/bush/rock/grass_tuft + biome-aware density driver)*). Smazané třídy a koncepty (FACILITY rodina + factory toy, severská dioráma s pixel-voxel COMPOSITES, VOXEL_MODEL infrastruktura) žijí v immutable diary jako historický kontext — zde se neuvádějí.

**Identita projektu po DD-32 (sez. 24) + DD-44 (sez. 36):** model-first **procedurální terrain sandbox** s OOP modelem jako runtime. User nastavuje parametry krajiny (size, relief 0..10, seed) + Climate (LATITUDE × HUMIDITY) přes UI panel; surface mix je driver-derived z Climate (DD-44, `BIOME_SURFACES` lookup); `generateTerrain` v `src/terrain.js` produkuje 3D scénu z hierarchie BLOCKS. Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) zafixované v git historii jako uzavřené kapitoly.

## Model

### Kořenové třídy

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`, `ANIMATE` (default `null`, viz níž). Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
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

- **SPRITES** — potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy otočený ke kameře). Atributy: `ASSET` (`null` → fallback šachovnice; `string` → canvas-generovaná dialogová bublina s textem v zaobleném obdélníku), `SPEAKER` (volitelný cíl dynamického 3D ocásku — instance nebo `{x,y,z}` literál, viz DD-16), `SPEAKER_OFFSET_Y` (vertikální offset nad cílovou instanci, default 0.5). Použití: dialog bubble, label, 2D entita. Pozice float (DD-12), sprite stíny neumí (záměr). *(M5 + M8+ dynamický ocásek.)*
- **COMPOSITES** *(abstract)* — potomek CUBES určený pro 3D mesh ze složek (`Group` s více meshi). Po DD-32 (sez. 24) bez pixel-voxel potomků (TREE/GRASS_TUFT/ROCK_PIXEL/LOG smazány, VOXEL_MODEL infrastruktura smazána sez. 29). První znovu-aktivní potomek je **LAMP** (sez. 33, DD-40). Pozice spojitá (float), bez snap-to-grid; Y = world surface (DD-28).
- **LAMP** *(sez. 33, DD-40)* — pouliční lampa Victorian-style. COMPOSITES potomek bez vlastních atributů (zdědí `ORIENTATION` pro rotaci kolem Y). Builder `buildLamp` vyrobí Group: dark-iron sloup 2 j + horizontální paže 0.6 j + visící emissive stínítko + `THREE.SpotLight` uvnitř stínítka (kuželové oranžové světlo dolů, `castShadow=true`, 512×512 cube shadow map). Pattern *„světelný zdroj uvnitř meshe → mesh `userData.noShadow = true`"* aby mesh okolo nebloval vlastní paprsky. Třída + builder + dispatch v `createMeshFor` zachovány i bez aktivní instance ve scéně (sez. 33 testovala, pak odebrala).
- **DECOR** *(sez. 39 kotva DD-49, sez. 40 implementace, sez. 41 DD-51 seasonal cycle + DD-52 slope-aware Y)* — generická COMPOSITES třída pro krajinné dekorace (stromy/keře/kameny/tráva). Atributy: `KIND` (string lookup do `DECOR_BUILDERS`), `SEED` (number, deterministic varianty per instance), `SCALE` (default 1.0), `SNOWED` (boolean, propagované z `cells[i].snowed` v `decorate()` — builder dle flagu přebarví vegetaci/top rock na `SNOW_WHITE`), `SEASON` *(DD-51 sez. 41, string default `"summer"`)* — propagovaný z `world.SEASON` přes `decorSpec.season` → `decorations[].season` → builder `opts.season`. Builder pattern: `buildSpruce/Oak/Bush/Rock/GrassTuft(group, { seed, scale, snowed, season })` mutuje prázdný `THREE.Group` faceted lowpoly primitivy (CylinderGeom / ConeGeom / IcosahedronGeom(0)) se sdíleným `MeshLambertMaterial({ flatShading: true })` per color. Shared toolkit (`src/composites/toolkit.js`): `lowpolyMat` per-color singleton + `getGeomCache` per-(KIND × part) geometry singleton + 7 paleta konstanty (`BARK_BROWN`/`LEAF_GREEN`/`LEAF_AUTUMN`/`ROCK_GRAY`/`GRASS_GREEN`/`BUSH_GREEN`/`SNOW_WHITE`) + re-export `mulberry32` z terrain.js. **Seasonal foliage cycle (DD-51):** oak/bush (listnaté) spring/summer → LEAF_GREEN/BUSH_GREEN, autumn → LEAF_AUTUMN (oranžová), winter (snowed) → defoliated (oak = kmen-only, bush = skip entity v `decorate()` filter); spruce season-invariant (jehličnan); priorita v builderu `snowed > autumn > default`. Biome-aware spawn: `DECOR_DENSITY[latitude][humidity]` lookup v `terrain.js` (wet 0.80→0.20 lineární škála po lat; sez. 41 oak/spruce × 2 pro hustší prales), `DECOR_BASE_SCALE` per-KIND faktor (vegetace/rock `1/3` sez. 41, grass_tuft `1.0×`), `decorate(cells, ramps, latitude, humidity, season, seed)` Krok 7 v `generateTerrain` → `decorations[]` pole. **Y konvence (DD-52 sez. 41):** non-ramp cell `decY = y_top + 0.5` (top face); ramp cell `decY = y_top + 1.0 + slopeT` kde `slopeT = (jitterX·dx + jitterZ·dz) / (|dx|+|dz|)` z `ramps[].slopeDir`. 5 KIND impl: `spruce`/`oak`/`bush`/`rock`/`grass_tuft`. Sub-prah Fáze 6: `stump`/`log`/`palm`/`cactus`/`flower`/`_dead` postfix/density UI control/InstancedMesh refactor (priorita sez. 42 po perf trigger). *(Vrátí decoration vrstvu COMPOSITES po DD-32 wipe sez. 24 pixel-voxel TREE/GRASS_TUFT/ROCK_PIXEL/LOG.)*

### Tekutiny (LIQUIDS 5. vrstva DD-25 extension, DD-54, sez. 45)

- **LIQUID** — tekutina (jezero, řeka, ...). Potomek CUBES (= `LIQUIDS` abstract base třída zatím nezavedena, čeká na druhého sourozence — paralel PATH/LINES pattern per DD-27 vzoru *„abstract base až s 2. konkrétním potomkem"*). 1 instance = 1 connected basin. **Sez. 45 prototype skeleton:** 1 LIQUID = 1 water cell (single-cell instance), plný BFS connected-components clustering = sub-prah. Atributy:
  - `LEVEL` — Y hladiny (sémanticky čitelnější alias pro `Y`; reálně `Y = LEVEL`). Skeleton drží oba kvůli budoucí extension (mesh Y může mít nudge offset proti z-fightu, `LEVEL` zůstává čistá logická hladina).
  - `TEMPERATURE` — `"frozen"` | `"liquid"` enum. Material decision v `createLiquidPlane` (`_iceMat` vs. `_waterMat`). Budoucí: numerický °C pro permafrost / lávu.
  - `BOUNDING_BOX` — `{ w, d }` axis-aligned XZ extent v 1C jednotkách. Prototype vždy `{ w: 1, d: 1 }`.
  - `CELLS` — `[{ x, z }, ...]` cells obsazené tímto LIQUID. Prototype vždy `[{ x, z }]` (1 prvek). Pro DRY identifikaci / clear-path.

  Spawn: `terrain.water[]` raw records (`{x, y, z, frozen, w, d}` z `generateTerrain` Krok 6 Wang & Liu 2006 priority flood) → `buildScene` spawn loop v `main.js` wrappuje do `new LIQUID(id, "Tekutina", x, level, z, temperature, bbox, cells)` + `createLiquidPlane(liquid)` → scene.add. Per DD-11 model/engine separation: `terrain.js` nezná `model.js`, drží raw records. Internal materiály `_waterMat`/`_iceMat`/`_waterGeom`/`_waterMeshes` zachovány (= implementation locality, rename na `_liquid*` až přibude 2. sourozenec). Budoucí extension hooks („fyzika kapalin"): `FLOW_DIRECTION` (rivers/streams paralel PATH POINTS), `VISCOSITY` (lava/oil/acid), `LEVEL` animace (tide/flood/sezonní tání). *(DD-54 sez. 45.)*

### Linie (LINES vrstva 3, DD-25)

- **PATH** — 1D křivka jako plochý strip mesh. Potomek CUBES (= LINES rodina abstract base třída zatím nezavedena, čeká na druhého sourozence TRACK). Atributy:
  - `KIND` (string, default `"dirt"`) — řídí texturu povrchu. Aktuálně implementován jen `"dirt"` (procedurální štěrková textura `:path-dirt`).
  - `POINTS` (pole `[x, y, z]` kontrolních bodů ve world coords). `instance.X/Y/Z` se nepoužívá (cesta žije v world coords; constructor volá `super(0, 0, 0, ...)`).

  Engine `createPathFor`: `THREE.CatmullRomCurve3` (typ `catmullrom`, tension 0.5), 64 vzorků, generuje strip BufferGeometry s positions/uvs/indices. Šířka 0.5 j, Y offset +0.005 j proti z-fightingu, repeating texture UV scale 8× podél délky. **Rovný směr v krajních bodech** — Three.js v non-closed Catmull-Rom curvě používá v krajních bodech reflexi sousedního, tj. tangenta v `P[0]` = `P[1] − P[0]`; pokud `P[0].Z = P[1].Z`, tangenta je čistě podél X (= rovný vstup/výstup). *(Sez. 17 DD-27.)*

### Nevizuální potomky OBJECTS

- **TIMER** — atributy: `INTERVAL` (počet ticků mezi firem) a `ACTION = { kind, target, attr, value? }`. První skutečná reakce na `TIME.tick` (DD-04 dostal use case). Engine dispatch `ACTIONS[kind]` — aktuálně `toggle` (flip bool) a `set` (nastavit hodnotu). Registrace přes `registerBehavior(instance)` (symetrický sibling `scene.add(createMeshFor(...))` pro vizuální entity). Viz DD-17. *(M8+.)*
- **COUNTER** — atributy `VALUE` (int, default 0) a `INCREMENT` (int, default 1, může být záporné). Engine při `registerBehavior` dynamicky přidá řádek do HUD elementu `#hud` a v tick handleru mutuje `VALUE += INCREMENT`. Demonstruje **HUD observability** — nevizuální ≠ neviditelný, COUNTER je čitelný vedle `TIME`. *(M8+.)*
- **WORLD** — singleton DO (Data Object) pro globální atributy scény. Bez `X/Y/Z` (DD-01 demonstrace separace vizuální/modelová entita). Aktuální atributy:
  - `DAY ∈ [0,1)` (fáze 24h cyklu, **DD-43 mapping**: `0=půlnoc`, `0.25=východ`, `0.5=poledne` *(default)*, `0.75=západ`). Supersede DD-38 původní `0.25=poledne` mapping.
  - `DAY_SPEED ∈ ℝ` (cykly za sekundu; default `0.001` = ~17 min/cyklus, sez. 40 user wish).
  - `LATITUDE ∈ {tropical, subtropical, temperate, polar}` *(DD-42)* — geografické pásmo. Default `temperate` (parita s DD-38 původním fixed 30° tilt). Konzument: `SUN_TILT_BY_LATITUDE` lookup v `updateSun()` (rovník = sun overhead, póly = sun nízko).
  - `HUMIDITY ∈ {wet, mid, dry}` *(DD-42)* — vlhkostní pásmo. Default `mid`. Druhá osa biome matice 4×3 (LATITUDE × HUMIDITY = 12 biomů, viz `BIOME_NAMES` v `terrain.js`). Konzumenti: UI biome readout (`BIOME_NAMES`) + **surface mix driver** (`BIOME_SURFACES`, DD-44 sez. 36).
  - `SEASON ∈ {spring, summer, autumn, winter}` *(DD-50, sez. 40)* — roční období. Default `summer` (bezsezonní stav). Konzumenti: `snowSpecForLatitude(lat, season)` modifikuje temperate `patchThreshold` (zima 60 % snow, summer 0 %); `waterSpecForClimate(lat, hum, season)` modifikuje temperate `freezeRatio` (zima 0.7 ice, summer 0.0). Polar perpetually-winter invariant. Tropical/subtropical season-invariant.

  Engine konzumenti: `updateSun()` derivuje pozici DirectionalLight + intensity + sun mesh z `DAY` × `LATITUDE`; `updateAtmosphere()` lerpuje sky/fog/ambient z `DAY` (DD-39); `updateWorldTime(dt)` inkrementuje `DAY` o `dt * DAY_SPEED`; `buildScene()`/`regenerateScene()` derivují `surfaces` parametr `generateTerrain` z `LATITUDE × HUMIDITY` přes `surfacesForBiome()` (DD-44). Politika *„atribut přibude jen s živým konzumentem"* držena (DD-29 → DD-38 → DD-42 → DD-44). Sez. 20 zavedl s `WIND_STRENGTH`; sez. 29 audit ho odstranil po DD-32 wipe `tree_sway`; sez. 32 vrátil s `DAY`/`DAY_SPEED` (DD-38); sez. 35 přidal `LATITUDE`/`HUMIDITY` (DD-42) + DAY mapping fix (DD-43); sez. 36 přidal `BIOME_SURFACES` druhého konzumenta (DD-44). Dev exposure: `window.world`. *(M8+.)*

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. Určené pro **diskrétní události** — first use case `TIMER` (DD-17, sez. 9).
- **tick** — jedno zvýšení TIME o 1. Tikne jednou za sekundu. Po inkrementu engine volá `updateTickHandlers()` — fire zaregistrovaných `tickHandlers[]` (TIMER instance).
- **ACTION** — recept diskrétní akce `{ kind, target, attr, value? }` vystřelený TIMER-em. Engine dispatch `ACTIONS[kind]` — izomorfně s `ANIMATE` (DD-15). Aktuální `kind`y: `toggle` (flip bool), `set` (přiřadit hodnotu). Viz DD-17.
- **ANIMATE** — atribut `OBJECTS` s receptem plynulého pohybu: `null` (default, statický) nebo objekt `{ kind: "<string>", ...params }`. Engine v render loopu volá `updateAnimations(tSeconds)` s wall-clockem (`performance.now() / 1000`), lookup `ANIMATORS[anim.kind]` dispatchuje na konkrétní per-frame funkci. Viz DD-15. Po DD-32 wipe (sez. 24) zůstávají `kind`y: `rotate`, `orbit_stadium`, `pulse`, `drift` (bez aktivních klientů ve scéně, ale připravené). Tři osy mutace: **díly** (`userData.parts`), **transformace** (`object3d.rotation` / `position`), **materiál** (`material.emissive*`). *(M7.)*
- **base** — `object3d.userData.base = { x, y, z }` — snapshot počáteční polohy instance, pořízený při `registerAnimator`. Transformační animátory (`orbit_stadium`, `drift`) z něj čtou referenční bod (střed dráhy).

### Aktivní `ANIMATE.kind`y

- **rotate** — rovnoměrná rotace celého Object3D kolem zadané osy. Parametry `axis` (`"x"`/`"y"`/`"z"`, default `"y"`) a `period` (doba jednoho otočení v sekundách). Generický — mutuje `object3d.rotation` přímo, funguje napříč třídami.
- **orbit_stadium** — uzavřená oválná dráha (atletický ovál = 2 rovné úseky + 2 půlkruhy) v rovině XZ kolem `userData.base`. Parametry `length` (L, rovná část; dlouhá osa X), `radius` (R, poloměr oblouku; krátká osa 2R), `period` (T, doba oběhu). Heading (`rotation.y`) sleduje tečnu dráhy.
- **drift** — lineární pohyb po jedné ose s **wrap-around** — když objekt opustí pás šířky `range`, vrátí se z opačné strany (skok). Parametry: `axis` (default `"x"`), `speed` (j/s, default 1.0), `range` (default 16). Pozice obíhá v intervalu `[base − range/2, base + range/2]`.
- **pulse** — emisivní pulsace materiálu. Sinusově mění `material.emissiveIntensity` mezi `min` a `max` s danou `period`. Parametry: `period` (s), `min` (default 0), `max` (default 1.0), `color` (optional 0xRRGGBB). Volitelná dvojice `opacityMin`/`opacityMax` — pokud aspoň jeden zadán, engine zapne `transparent = true` a synchronně mění i `material.opacity`. Tiché skip pro materiály bez `emissive` (SpriteMaterial, ShadowMaterial, pole materiálů).

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

TheCubes scéna se buduje ze tří vizuálních zdrojů:

- **Voxelová podlaha / terrain** → procedurální **BLOCKS rodina** (TCUBES + TRRAMPS/TTRAMPS/TDRAMP) s lowpoly vertex-color paletou (DD-41).
- **Dekorativní cesty** → **PATH** strip mesh (Catmull-Rom + procedural texture).
- **Dialog / štítek / UI** → **SPRITES**.

### Lowpoly vertex-color pipeline (DD-41, sez. 34)

**Princip (po DD-41, supersede DD-36 atlas):** per-face barvy zapsané přímo do `geometry.attributes.color` (24/12/18/24 floats per geom dle typu × 3 RGB kanály), shader čte vertex colors přímo z attribute. Jeden sdílený `_lowpolyMat = new THREE.MeshLambertMaterial({ vertexColors: true })` napříč všemi terrain batchi (TCUBES + rampy). Per-kind / per (typ, surface) BoxGeometry / BufferGeometry drží barvy v `color` attribute.

**TCUBES (`getTcubesKindGeom(kind)`):** `BLOCK_COLORS` 3-key paleta (TOP/BOTTOM/SIDE × 4 kindy `grass`/`dirt`/`stone`/`sand`). Per kind sdílená `BoxGeometry(1,1,1)` se color attribute zapsanou v pořadí faces (+X/−X/+Y/−Y/+Z/−Z): SIDE/SIDE/TOP/BOTTOM/SIDE/SIDE. sRGB hex → linear convert per kanál (renderer výstup je sRGB, vertex colors v linear).

**Rampy (`getRampGeom(type, surface)`):** Per (typ, surface) klonuje atlas IIFE raw geom (TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE — zachované jako raw geom source), drop `uv` attribute, inject `color` attribute. `RAMP_FACE_VERT_COUNTS` per typ (`[4,4,4,3,3]` / `[3,3,3,3]` / `[3,3,4,8,6]`), `RAMP_FACE_PALETTE_KEYS` mapuje faceIdx na `BLOCK_COLORS[surface]` klíč (TOP/BOTTOM/SIDE). TDRAMP SLOPE+TOP sdílí `.TOP` (lomený povrch).

**flatShading: false (důležitý fix).** BoxGeometry + ramp BufferGeometries už mají per-face normály v `geometry.attributes.normal` (vertices nesdílené přes faces) → flat look vzniká z geometrie. `flatShading: true` na materiálu by nutilo shader spočítat normálu z `dFdx/dFdy` derivatives → u **InstancedMesh** cross-instance precision drift = tenké šedé/černé seam linky mezi sousedy (DD-41 known fix sez. 34).

**Slow path** (`_faceMaterialCache` Map v `faceMaterialFor`): non-terrain TCUBES (CCUBES default šachovnice DD-07, PATH, water plane, COMPOSITES). Jediná zachovaná cache po DD-41 — terrain TCUBES/rampy jdou batch path (DD-37) s jedním sdíleným `_lowpolyMat`, žádná per-kind cache potřeba. Perf HUD `mat` čítač = `_faceMaterialCache.size` jen.

**Engine-internal maps** (sez. 38 audit dodatek, [[D4]]): kritická infrastruktura, kterou onboard-čtenář potřebuje znát.
- `_terrainBatches` (`main.js`) — `Map<string, InstancedMesh>` klíčované `"tcubes:<kind>"` / `"<typ>:<surface>"` → batch dispatched z `pushInstanceToBatch`. Sez. 31 DD-37 pipeline backbone.
- `meshByInstance` (`main.js`) — `Map<instance.ID, THREE.Object3D | { batch, idx }>`. Single-mesh case mapuje na Object3D, batch case na `{ batch, idx }` tuple. Spotřebovává hover + tooltip + cleanup v `regenerateScene`.
- `_faceMaterialCache` (`main.js`) — slow-path material cache (popsaná výš). Perf HUD `mat` čítač.
- `_lowpolyMat` (`main.js`) — jeden sdílený `MeshLambertMaterial({vertexColors:true})` napříč všemi terrain batchi. Lifecycle = aplikace.
- `_waterMat` / `_iceMat` (`main.js`, DD-47/DD-48 sez. 38) — sdílené `MeshStandardMaterial` pro LIQUID prototype. Water: 0x3a7090, opacity 0.55, metalness 0.20, roughness 0.25. Ice: 0xd9e8ec, opacity 0.85, metalness 0.05, roughness 0.55 (větší zákal + menší reflexe per user spec).
- `_waterMeshes` (`main.js`, DD-48 sez. 38) — `Set<THREE.Mesh>` pro water wave anim. Jen non-frozen water cells. Ice meshes vynechány (rigid surface). Cleared v `regenerateScene`. Per-frame `position.y = baseY + sin(t × ω) × 0.04` (period 9 s).
- `RAMP_FACE_VERT_COUNTS` / `RAMP_FACE_PALETTE_KEYS` (`main.js`) — per-typ tabulky (`trramps`/`ttramps`/`tdramp` → `[face vertex counts]` resp. `[BLOCK_COLORS klíče]`) pro vertex-color injection v `getRampGeom`.

**Historické (DD-36 atlas, supersededDD-41):** Sez. 28 zavedla TCUBES atlas (`_tcubesAtlasMatCache`, 4 atlas materials = 6 facelets × 16 px do CanvasTexture 96×16 per kind), sez. 30 ramp atlas (`_rampsAtlasMatCache`, 9 atlas materials). DD-41 smazala obě cache + atlas builders + texture tabulky (`BLOCK_TEXTURES`, `RAMP_*_TEXTURES`, `RAMP_ATLAS_SPECS`, `RAMP_SURFACE_FROM_KIND`, `ATLAS_*` konstanty, `createTRRampFor`/`createTTRampFor`/`createTDRampFor` slow-path funkce). Důvod: atlas vyřešil draw call count (DD-37 InstancedMesh batche pak srazila na ~13 calls), ale tile pattern uvnitř kindu zůstal jako vizuální dluh. DD-41 lowpoly = solid color flat look, eliminuje dluh + simplifikuje pipeline (~−250 ř.) + připravuje G3 (climate-driven barvy = data, ne textury).

### Procedurální canvas textury (`:named-texture`)

JS-generované pixel-art textury 16×16 px. Sdílené přes `NAMED_TEXTURE_FACTORIES` lookup v `faceMaterialFor` dispatchu (DD-14 prefix `:`). Aktuální:

- `:dirt` — hliněná textura (paleta `DIRT_*`, base + 2–4 patches 1–2 px).
- `:grass-top` — travnatý povrch (paleta `GRASS_*`, patches).
- `:stone` — kamenná textura (paleta `STONE_*`).
- `:sand` — písčitá textura (paleta `SAND_*`).
- `:path-dirt` — štěrková cesta (sez. 17). Kropenatý šum ~240 záplat 1–2 px šedých odstínů + hnědý ton. Použito v PATH.
- `:rail-top` — kolejnice (template, není použitá v aktuální scéně — kandidát pro budoucí TRACK třídu).

Pravidlo BLOCKS rodiny: **vrch `:grass-top`, jinak `:dirt`** napříč grass blok / TRRAMPS / TTRAMPS / TDRAMP (severská konvence sez. 17). Pozn.: po DD-41 (sez. 34) terrain BLOCKS textury nepoužívají — `:named-texture` paleta žije už jen ve slow path (CCUBES default + PATH).

### Canvas SPRITES

2D obrazy generované v JS (CanvasTexture, billboard otočený ke kameře přes `THREE.Sprite`). Volitelně přidružený 3D ocásek (THREE.Mesh jehlan, dynamicky sledující SPEAKER, DD-16). Použití: SPRITES třída — dialogové bubliny s textem (`ASSET = "string"`).

## Měřítko a Y konvence (DD-22 + DD-28)

**Pevné měřítko** — 1 TC voxel = 1 m.

**Y konvence (DD-28 sez. 18) — sjednocená pro BLOCKS:**

| Třída / rodina | `instance.Y` semantics | Pro stojící na grass podlaze (gy=−1) |
|---|---|---|
| **BLOCKS** (CCUBES, TCUBES, TRRAMPS, TTRAMPS, TDRAMP) | grid Y voxelu (= mesh **center**) | `Y = 0` (1C blok nad podlahou) |
| SPRITES, PATH | libovolný Y (free 3D space) | dle obsahu |

**BLOCKS = grid-Y** (1C grid-aligned bloky terénu, snap-to-int v rendereru DD-12 vynucuje konvenci automaticky — uživatel uvažuje „blok je ve sloupci gy=0").

## Pojmy

- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Použití: PATH strip (Catmull-Rom texturovaný proužek), SPRITES billboardy (dialogy/štítky), šachovnice na mateřské CUBES (DD-07 placeholder pro neznámý kind), procedurální `:named-texture` slow path (CCUBES/COMPOSITES). Terrain TCUBES + rampy textury **nepoužívají** od DD-41 (sez. 34, lowpoly vertex-color pipeline).
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Použití: SPRITES třída.
- **Voxel** — krychlová jednotka. 1 TC voxel = 1 m (= 1 instance CCUBES/TCUBES).
- **Pixel-art** — vizuální styl s viditelnými „pixely". Dosahujeme přes `NearestFilter` na `CanvasTexture` (nezablurovaná interpolace) + nízké rozlišení (16×16 typicky). Sdílí se mezi procedurálními texturami (`:dirt`/`:grass-top`/…) a atlas pipeline (DD-36).
- **Biome** — kind terénního povrchu (`grass`/`dirt`/`stone`/`sand` + DD-47 `_snow` postfix varianty per kind) — klastr v biome map noise. Klastruje se nízkofrekvenčním šumem do souvislých oblastí, ne per-cell randomly. *Water dropped po DD-47* — voda nyní entity LIQUID prototype přes priority flood, ne surface kind.
- **Heightmap** — 2D mřížka Y hodnot per (x, z) cell. Value-noise (mulberry32 + bilineární smoothstep + wrap-around) z parametrů `relief` × `seed`.
- **Step** — výškový rozdíl ±1 mezi sousedními cells heightmap → kandidát pro ramp smoothing layer (DD-33).

## UI

- **HUD** (head-up display) — překryvný panel v levém horním rohu pro globální stavy (`TIME` + dynamické řádky pro COUNTER instance).
- **Perf HUD** *(sez. 28)* — diagnostický overlay v pravém horním rohu, throttled report 1×/s: **FPS** (rolling avg přes vteřinu), **calls** (`renderer.info.render.calls` per frame), **tri** (`renderer.info.render.triangles`), **geom** (`renderer.info.memory.geometries`), **mat** (velikost `_faceMaterialCache` Map = počet unikátních sdílených slow-path materiálů). Permanent UI, ne dev-only — observability pro budoucí perf refactory.
- **Terrain control panel** (`#terrainctrl`, sez. 26) — UI panel pravý dolní roh, řídí `generateTerrain` parametry: slidery size sx/sz (3..30), relief (0..10) s názvy stupňů, 4 surface slidery (auto-normalize), seed input. Trigger `change` event → `regenerateScene` (filter `userData.terrain` flag, remove + spawn).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Hover highlight** — zvýraznění objektu pod kurzorem. Dva mechanismy podle reprezentace instance (DD-37 sez. 31):
  - **Batch case** (terrain bloky/rampy v `InstancedMesh`) — `setColorAt(idx, HOVER_TINT_COLOR)` overbright albedo tint `(1.6, 0.8, 0.2)` = sytá oranžová. `Float32Array` v `InstancedBufferAttribute` nemá clamp → values > 1.0 = projasnění.
  - **Single-mesh case** (PATH, SPRITES, slow-path TCUBES, water, budoucí COMPOSITES) — žluté emissive světélkování (`mat.emissive = 0x404020`) přes lazy clone-on-first-hover (materials klonujeme per mesh, originály v `userData.hoverOrigMat`, klony s yellow emissive v `userData.hoverHotMat`).
- **Sun mesh** *(sez. 31)* — drobná bílá koule reprezentující slunce. `SphereGeometry(1.5, 16, 16)` + `MeshBasicMaterial(color: 0xffffff, fog: false)` (unlit = svítí vlastní bílou nezávisle na DirectionalLight; `fog: false` jinak by mlha rozpustila). Pozice `sun.position × SUN_DISTANCE_SCALE` (statická). Toggle přes `#settings`.
- **Atmospheric fog** *(sez. 31)* — `THREE.Fog(_skyDay.getHex(), 30, 120)` lineární mlha matchne `scene.background`. Vzdálené objekty plynule blednou. Drží se reference `sceneFog` pro toggle restore. Barva reactive na `world.DAY` (DD-39 — kopie z `scene.background` per-frame). Toggle přes `#settings`.
- **Atmospheric lerping** *(sez. 33, DD-39)* — `updateAtmosphere()` per-frame lerp 3 cílů podle `daylight = max(0, sin(2π·world.DAY))`: `scene.background.color` (`lerpColors(_skyNight, _skyDay, daylight)`), `sceneFog.color` (`copy(scene.background)`), `ambientLight.intensity` (`AMBIENT_NIGHT..AMBIENT_DAY`). Třetí konzument DD-38 `world.DAY` po `updateSun()`. Konstanty: `_skyDay = 0x1a1a2e`, `_skyNight = 0x000000` (úplná čerň), `AMBIENT_DAY = 0.15`, `AMBIENT_NIGHT = 0.005` (téměř 0). Bez sunset oranžového peaku — 2 keypointy lineární lerp, sunset roadmap.
- **DOF (Depth of Field)** *(sez. 31)* — post-processing efekt rozostření mimo ohnisko. `EffectComposer` pipeline: `RenderPass` (scéna + depth) → `BokehPass` (Gaussian blur dle depth, `focus` / `aperture: 0.0005` / `maxblur: 0.005`) → `OutputPass` (sRGB color-space correction). Focus dynamic v animate(): `bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target)`. Toggle přes `#settings`.
- **Settings panel** (`#settings`, sez. 31) — UI panel levý dolní roh (4. roh: HUD top-left, perfhud top-right, terrainctrl bottom-right). 3 checkbox toggles (DOF, Fog, Slunce, default ON). Wire na `window.settings = { setDOF, setFog, setSun }` API. Izomorfní CSS s ostatními panelu — coral akcent header, tyrkysový accent checkbox.
- **Šachovnicová textura** — vizuální idiom „vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.
- **Klávesové ovládání kamery** *(sez. 14)* — WASD pan v rovině scény, Q/E rotace kolem cíle, Y/X zoom. Per-frame v render loopu, smooth dle `dt`. `heldKeys` Set + window keydown/keyup/blur listener.

## Milníky

- **M1** *(sez. 1)* — statická 3D scéna s jednou kostkou, ovládatelná kamera, tikající TIME v HUDu, hover infotip.
- **M2** *(sez. 2)* — orientační pomůcky (GridHelper, AxesHelper, smazány sez. 14) + první potomek `CUBES` (tehdy `TERRAIN`, dnes `CCUBES`) + 3×3 grid.
- **M3** *(sez. 3)* — COMPOSITES (DD-23 přepsán na pixel-voxel, sez. 24 smazán), float souřadný systém (DD-12), terminologie potomků (DD-13).
- **M4** *(sez. 3)* — stínovací systém (shadow map, PCF soft).
- **M5** *(sez. 4)* — SPRITES (dialog bubble, canvas-generovaný text).
- **M6** *(sez. 4)* — TCUBES (per-face textury). DD-14 zafixoval dispatch podle typu atributu.
- **M7** *(sez. 5)* — Chování v čase: atribut `ANIMATE` na OBJECTS (DD-15), dispatch v enginu.
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
