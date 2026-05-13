# Glossary

Canonical terminologie projektu TheCubes. Stav po sez. 28 (DD-32 terrain sandbox pivot, DD-33 ramp smoothing layer, DD-34 orientation mapping centralizace, DD-35 TDRAMP class, DD-36 TCUBES atlas pipeline). Smazané třídy a koncepty (FACILITY rodina + factory toy, severská dioráma s pixel-voxel COMPOSITES, WORLD singleton, VOXEL_MODEL infrastruktura) žijí v immutable diary jako historický kontext — zde se neuvádějí.

**Identita projektu po DD-32 (sez. 24):** model-first **procedurální terrain sandbox** s OOP modelem jako runtime. User nastavuje parametry krajiny (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel; `generateTerrain` v `src/terrain.js` produkuje 3D scénu z hierarchie BLOCKS. Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) zafixované v git historii jako uzavřené kapitoly.

## Model

### Kořenové třídy

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`, `ANIMATE` (default `null`, viz níž). Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (float, DD-12 — sdílený souřadný systém; voxelové potomky si pozici v rendereru zaokrouhlí). Default vizualizace = voxel krychle se šachovnicí (DD-07), potomci override. Pojem „cube" je projektová značka, ne technická klasifikace.

### Bloky (BLOCKS rodina, DD-25)

- **BLOCKS** *(abstract)* — značkovací parent pro 1C grid-aligned bloky tvořící krajinu/geologii. Sdílí: snap-to-int v rendereru (DD-12), procedurální `BufferGeometry` v engine, `faceMaterialFor` dispatch (DD-14), `:named-textures` paleta, atribut `ORIENTATION`. Konkrétní potomci se liší tvarem a počtem faces. *(Sez. 16, DD-25.)*
- **CCUBES** (color cubes) — potomek BLOCKS s atributem `COLOR` (JS number 0xRRGGBB). Plochá barva všech 6 ploch. Nahrazuje dřívější `TERRAIN` (DD-13). *(M2.)*
- **TCUBES** (texture cubes) — potomek BLOCKS s šesti atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`, `TEXTURE_EAST`, `TEXTURE_WEST`. Hodnota každé strany: `null` → fallback šachovnice (DD-07), `number` 0xRRGGBB → plocha barva, string hex (`"#rrggbb"`) → barva, string s prefixem `:` → pojmenovaná procedurální textura (`":grass-top"`, viz níž), jiný string → canvas s textem/emoji vycentrovaným. Mapování světových stran na Three.js osy: TOP=+Y, BOTTOM=−Y, EAST=+X, WEST=−X, SOUTH=+Z, NORTH=−Z. Dispatch viz DD-14. **Po DD-36** (sez. 28) terrain kindy (`BLOCK_TEXTURES`) renderují přes atlas fast path (shared geom + 1 material), non-terrain (emoji demo) přes slow path s `material[6]` array. *(M6 + DD-36.)*
- **TRRAMPS** (triangular rectangular ramps) — potomek BLOCKS = trojboký hranol (= pravoúhlý klín). 5 face atributů: `TEXTURE_SLOPE` (svah), `TEXTURE_BOTTOM`, `TEXTURE_BACK` (vertikál nad apex sloupcem), `TEXTURE_LEFT`, `TEXTURE_RIGHT` (2 boční trojúhelníky). Plus `ORIENTATION`. Default svah klesá k +Z (apex sloupec na −Z). *(Sez. 16, DD-25.)*
- **TTRAMPS** (triangular triangular ramps = trirectangular tetrahedron) — potomek BLOCKS = trojboký jehlan se 3 mutually perpendicular pravoúhlými stěnami sdílejícími roh `C`, čtvrtá stěna SLOPE = rovnostranný trojúhelník (hrana √2). 4 face atributy: `TEXTURE_SLOPE`, `TEXTURE_BOTTOM`, `TEXTURE_BACK`, `TEXTURE_LEFT`. Plus `ORIENTATION`. Použití: rohové rampy (corner ramps), stoupání ze 3 sousedních směrů na jeden vyvýšený roh. *(Sez. 16, DD-25.)*
- **TDRAMP** (diagonal ramp) — potomek BLOCKS = 1C blok bez jednoho horního rohu („low corner"). Krychle 1×1×1 mínus tetrahedron odříznutý na 1 z 4 horních rohů → 7-vrcholový polyhedron: čtvercová podstava + trojúhelníková „horní podstava" (TOP_TRI s 3 ze 4 horních rohů) + diagonální SLOPE z low_bot k opačné horní hraně (NW_top−SE_top, „lomená rampa" sdílí hranu s TOP_TRI). 7 faces se 5 material groups: `TEXTURE_SLOPE`, `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_WALL_FULL` (2 plné quad stěny opačně k low corner), `TEXTURE_WALL_TRI` (2 trojúhelníkové vert. stěny u low corner). Plus `ORIENTATION` (DD-26 + DD-34): default low corner v lokálním (−X, −Z) = terrain.js „SW" → peak v rohu opačně = „EN" (+X, +Z). Použití: vyhlazení **3-cell convex peak** stepu (A má 2 sousední direct vyšší + diag corner vyšší) nebo **L-shape** stepu (2 sousední direct vyšší bez diag peaku). Strict-dominuje 1× TRRAMPS edge — 2 přístupy + 2 zakryté stěny v 1 mesh. *(Sez. 26, DD-35.)*
- **TTUNELS** (tunnel blocks) — potomek BLOCKS = 1C blok s klenutým průchozím tunelem v jedné ose. Geometricky: kvádr 1×1×1 mínus „obdélník + půlkruh extrudovaný v ose průchodu" („od krychle odečtený válec a kvádr"). 4 face atributy: `TEXTURE_TOP` (vrchní vnější stěna, typicky `:grass-top`), `TEXTURE_SIDES` (boční vnější stěny + 2 entry walls s vyříznutým profilem), `TEXTURE_WALLS` (vnitřní 2 boční stěny), `TEXTURE_CEILING` (vnitřní klenutý strop, 12 segmentů). **Bez dna** — tunel je „průhledný dolů" na top voxelu pod ním. Plus `ORIENTATION`. *(Sez. 16, DD-25.)*

### Atribut ORIENTATION (DD-26 + DD-34)

`ORIENTATION` — float ∈ [0, 360) ve **stupních**, rotace kolem Y osy. **Sjednoceno** napříč BLOCKS i COMPOSITES rodinou (sez. 17, DD-26). Engine převádí: `mesh.rotation.y = ORIENTATION * (Math.PI / 180)`. Default 0.

V BLOCKS rodině v praxi jen násobky 90° (cardinální orientace svahu / osy tunelu / low cornera): 0, 90, 180, 270. User „+90 CW" = `ORIENTATION −= 90` (mod 360).

**DD-34 (sez. 26)** centralizuje mapování `edge name → ORIENTATION` v `terrain.js` (`EDGE_ORIENT`, `CORNER_ORIENT`, `TDRAMP_PEAK_ORIENT`), kde klíče jsou **sorted alfa** (E před N/S/W) — důsledek: „ES" znamená **SE** (south-east), „EN" znamená **NE** (north-east). Pozor při čtení kódu.

### Ostatní potomky CUBES

- **SPRITES** — potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy otočený ke kameře). Atributy: `ASSET` (`null` → fallback šachovnice; `string` → canvas-generovaná dialogová bublina s textem v zaobleném obdélníku), `SPEAKER` (volitelný cíl dynamického 3D ocásku — instance nebo `{x,y,z}` literál, viz DD-16), `SPEAKER_OFFSET_Y` (vertikální offset nad cílovou instanci, default 0.5). Použití: dialog bubble, label, 2D entita. Pozice float (DD-12), sprite stíny neumí (záměr). *(M5 + M8+ dynamický ocásek.)*
- **COMPOSITES** *(abstract, bez aktivních potomků)* — potomek CUBES určený pro 3D mesh ze složek (`Group` s více meshi). Po DD-32 (sez. 24) bez konkrétních potomků — pixel-voxel TREE/GRASS_TUFT/ROCK_PIXEL/LOG smazány s severskou diorámou, VOXEL_MODEL infrastruktura smazána sez. 29 (audit). Vrstva v hierarchii zůstává jako abstract slot pro budoucí ne-BLOCKS 3D entity. Pozice spojitá (float), bez snap-to-grid; Y = world surface (DD-28).

### Linie (LINES vrstva 3, DD-25)

- **PATH** — 1D křivka jako plochý strip mesh. Potomek CUBES (= LINES rodina abstract base třída zatím nezavedena, čeká na druhého sourozence TRACK). Atributy:
  - `KIND` (string, default `"dirt"`) — řídí texturu povrchu. Aktuálně implementován jen `"dirt"` (procedurální štěrková textura `:path-dirt`).
  - `POINTS` (pole `[x, y, z]` kontrolních bodů ve world coords). `instance.X/Y/Z` se nepoužívá (cesta žije v world coords; constructor volá `super(0, 0, 0, ...)`).

  Engine `createPathFor`: `THREE.CatmullRomCurve3` (typ `catmullrom`, tension 0.5), 64 vzorků, generuje strip BufferGeometry s positions/uvs/indices. Šířka 0.5 j, Y offset +0.005 j proti z-fightingu, repeating texture UV scale 8× podél délky. **Rovný směr v krajních bodech** — Three.js v non-closed Catmull-Rom curvě používá v krajních bodech reflexi sousedního, tj. tangenta v `P[0]` = `P[1] − P[0]`; pokud `P[0].Z = P[1].Z`, tangenta je čistě podél X (= rovný vstup/výstup). *(Sez. 17 DD-27.)*

### Nevizuální potomky OBJECTS

- **TIMER** — atributy: `INTERVAL` (počet ticků mezi firem) a `ACTION = { kind, target, attr, value? }`. První skutečná reakce na `TIME.tick` (DD-04 dostal use case). Engine dispatch `ACTIONS[kind]` — aktuálně `toggle` (flip bool) a `set` (nastavit hodnotu). Registrace přes `registerBehavior(instance)` (symetrický sibling `scene.add(createMeshFor(...))` pro vizuální entity). Viz DD-17. *(M8+.)*
- **COUNTER** — atributy `VALUE` (int, default 0) a `INCREMENT` (int, default 1, může být záporné). Engine při `registerBehavior` dynamicky přidá řádek do HUD elementu `#hud` a v tick handleru mutuje `VALUE += INCREMENT`. Demonstruje **HUD observability** — nevizuální ≠ neviditelný, COUNTER je čitelný vedle `TIME`. *(M8+.)*

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

- **`size`** — `[sx, sz]` rozměr terénu v 1C voxelech (default `[10, 10]`, slider rozsah 3..30).
- **`relief`** — integer 0..10 řídící amplitudu + frekvenci heightmap. **11 pojmenovaných stupňů** (slider label): `0 Flat`, `1 Level`, `2 Gently undulating`, `3 Rolling hills`, `4 Hilly`, `5 Uneven`, `6 Rugged`, `7 Craggy`, `8 Mountainous`, `9 Heavily dissected` *(roadmap valley carving)*, `10 Alpine` *(roadmap ridge noise)*. Aktuálně `9` a `10` clamp na `8` s warningem.
- **`surfaces`** — `{ grass, stone, sand, water }` mix v rozsahu [0, 1], auto-normalizovaný na sumu 1 (UI panel programmatic). Mapuje biome map noise → kind: low-freq noise → sort + exact-match thresholds = souvislé klastry. Y modifier: `sand−1`, `water−2` (eroze/depresse).
- **`seed`** — integer pro `mulberry32` RNG (default `42`). Determinismus = stejný seed + parametry → bit-identical scéna.

### Engine

Value-noise heightmap (mulberry32 + grid sampling + bilineární smoothstep + wrap-around) → biome map → sloupcové vyplnění (top voxel dle biome, dirt middle, stone yBottom) → vodní plane(y) na water cellech (1×1 per cell, Y = top + 0.55). Validace fail-fast.

### Terrain kindy (biome IDs)

- **`grass`** — top voxel `:grass-top`, sides/bottom `:dirt` (severská konvence sez. 17 „vrch grass, jinak dirt").
- **`dirt`** — všech 6 ploch `:dirt`. Middle/bottom vrstvy sloupců.
- **`stone`** — všech 6 ploch `:stone`. Bottom vrstvy + biome.
- **`sand`** — všech 6 ploch `:sand`. Biome surface s Y modifier −1.
- **`water`** — biome marker (ne TCUBES kind). Generuje vodní plane mesh místo sloupce; Y modifier −2.

### Ramp smoothing layer (DD-33, sez. 26)

Po heightmap → biome → spawn engine analýzuje 4-cell sousedství a doplňuje rampy nad step (= sousední cell s `Δy = +1`) podle topologie:

- **TRRAMPS edge** (DD-33) — 1 direct vyšší soused → klín. Greedy criticality + compatibility filter (drop pokud target buňka má perpendikulární TRRAMPS = bok).
- **TTRAMPS corner** (DD-33) — isolated diag peak (0 direct vyšších + 1 diag vyšší + oba direct sousedi na úrovni A) → jehlan k diagonálnímu apex. Vyhlazení rohu.
- **TDRAMP diagonal** (DD-35) — 2-stage detekce. **Stage 1:** 3-cell convex peak (2 sousední direct + 1 diag vyšší). **Stage 2:** L-shape (2 sousední direct vyšší bez diag peaku). Strict-dominuje 1× TRRAMPS edge.

## Vizuální zdroje

TheCubes scéna se buduje ze tří vizuálních zdrojů:

- **Voxelová podlaha / terrain** → procedurální **BLOCKS rodina** (TCUBES + TRRAMPS/TTRAMPS/TDRAMP/TTUNELS) s `:named-texture` paletou.
- **Dekorativní cesty** → **PATH** strip mesh (Catmull-Rom + procedural texture).
- **Dialog / štítek / UI** → **SPRITES**.

### TCUBES atlas pipeline (DD-36, sez. 28)

Terrain TCUBES (kind ∈ `BLOCK_TEXTURES` = `grass`/`dirt`/`stone`/`sand`) používají **shared `BoxGeometry` + per-kind atlas material** místo `material[6]` pole. Atlas = 6 facelets slepené horizontálně do CanvasTexture 96×16 px (16 px per dlaždice, shoda s `:named-texture` rozlišením); BoxGeometry UVs přepsané na 1/6-tice (face N → u ∈ [N/6, (N+1)/6]); 1 `MeshStandardMaterial` per kind místo 6 per blok. **Důsledek:** 1 draw call per box místo 6 → 30×30 terrain z 25k calls @ 15 FPS na ~5k calls @ 92 FPS (6× zrychlení).

Non-terrain TCUBES (emoji demo boxy) padají na slow path s původním `material[6]` array. Cache materiálů v `faceMaterialFor` (`_faceMaterialCache` Map) šetří GPU state changes mezi calls. Hover sez. 16 pattern (`Array.isArray(orig) ? orig.map(...) : orig.clone()`) přepíná pole↔single dispatch automaticky.

### Procedurální canvas textury (`:named-texture`)

JS-generované pixel-art textury 16×16 px. Sdílené přes `NAMED_TEXTURE_FACTORIES` lookup v `faceMaterialFor` dispatchu (DD-14 prefix `:`). Aktuální:

- `:dirt` — hliněná textura (paleta `DIRT_*`, base + 2–4 patches 1–2 px).
- `:grass-top` — travnatý povrch (paleta `GRASS_*`, patches).
- `:stone` — kamenná textura (paleta `STONE_*`).
- `:sand` — písčitá textura (paleta `SAND_*`).
- `:path-dirt` — štěrková cesta (sez. 17). Kropenatý šum ~240 záplat 1–2 px šedých odstínů + hnědý ton. Použito v PATH.
- `:rail-top` — kolejnice (template, není použitá v aktuální scéně — kandidát pro budoucí TRACK třídu).

Pravidlo BLOCKS rodiny: **vrch `:grass-top`, jinak `:dirt`** napříč grass blok / TRRAMPS / TTRAMPS / TDRAMP / TTUNELS (severská konvence sez. 17).

### Canvas SPRITES

2D obrazy generované v JS (CanvasTexture, billboard otočený ke kameře přes `THREE.Sprite`). Volitelně přidružený 3D ocásek (THREE.Mesh jehlan, dynamicky sledující SPEAKER, DD-16). Použití: SPRITES třída — dialogové bubliny s textem (`ASSET = "string"`).

## Měřítko a Y konvence (DD-22 + DD-28)

**Pevné měřítko** — 1 TC voxel = 1 m.

**Y konvence (DD-28 sez. 18) — sjednocená pro BLOCKS:**

| Třída / rodina | `instance.Y` semantics | Pro stojící na grass podlaze (gy=−1) |
|---|---|---|
| **BLOCKS** (CCUBES, TCUBES, TRRAMPS, TTRAMPS, TDRAMP, TTUNELS) | grid Y voxelu (= mesh **center**) | `Y = 0` (1C blok nad podlahou) |
| SPRITES, PATH | libovolný Y (free 3D space) | dle obsahu |

**BLOCKS = grid-Y** (1C grid-aligned bloky terénu, snap-to-int v rendereru DD-12 vynucuje konvenci automaticky — uživatel uvažuje „blok je ve sloupci gy=0").

## Pojmy

- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Použití: per-face TCUBES, atlas TCUBES (DD-36), šachovnice na mateřské CUBES.
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Použití: SPRITES třída.
- **Voxel** — krychlová jednotka. 1 TC voxel = 1 m (= 1 instance CCUBES/TCUBES).
- **Pixel-art** — vizuální styl s viditelnými „pixely". Dosahujeme přes `NearestFilter` na `CanvasTexture` (nezablurovaná interpolace) + nízké rozlišení (16×16 typicky). Sdílí se mezi procedurálními texturami (`:dirt`/`:grass-top`/…) a atlas pipeline (DD-36).
- **Biome** — kind terénního povrchu (`grass`/`dirt`/`stone`/`sand`/`water`) — klastr v biome map noise. Klastruje se nízkofrekvenčním šumem do souvislých oblastí, ne per-cell randomly.
- **Heightmap** — 2D mřížka Y hodnot per (x, z) cell. Value-noise (mulberry32 + bilineární smoothstep + wrap-around) z parametrů `relief` × `seed`.
- **Step** — výškový rozdíl ±1 mezi sousedními cells heightmap → kandidát pro ramp smoothing layer (DD-33).

## UI

- **HUD** (head-up display) — překryvný panel v levém horním rohu pro globální stavy (`TIME` + dynamické řádky pro COUNTER instance).
- **Perf HUD** *(sez. 28)* — diagnostický overlay v pravém horním rohu, throttled report 1×/s: **FPS** (rolling avg přes vteřinu), **calls** (`renderer.info.render.calls` per frame), **tri** (`renderer.info.render.triangles`), **geom** (`renderer.info.memory.geometries`), **mat** (velikost `_faceMaterialCache` Map = počet unikátních sdílených slow-path materiálů). Permanent UI, ne dev-only — observability pro budoucí perf refactory.
- **Terrain control panel** (`#terrainctrl`, sez. 26) — UI panel pravý dolní roh, řídí `generateTerrain` parametry: slidery size sx/sz (3..30), relief (0..10) s názvy stupňů, 4 surface slidery (auto-normalize), seed input. Trigger `change` event → `regenerateScene` (filter `userData.terrain` flag, remove + spawn).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Hover highlight** — žluté světélkování celého objektu pod kurzorem (sez. 16). Emissive boost na materiálu (`mat.emissive = 0x404020`). Lazy clone-on-first-hover — při prvním hoveru engine klonuje materials per mesh, originály v `userData.hoverOrigMat`, klony s yellow emissive v `userData.hoverHotMat`. Při on/off přepneme `child.material` mezi originálem a klonem.
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
  - *Sez. 20:* WORLD singleton (DD-29) — smazán sez. 29 (audit cleanup, žádný konzument po DD-32).
  - *Sez. 21–23:* factory-observer pivot (DD-30 + DD-31) — smazán DD-32.
  - *Sez. 24–26:* **terrain generator pivot** (DD-32), ramp smoothing layer (DD-33 + DD-34 + DD-35).
  - *Sez. 28:* **TCUBES atlas refactor** (DD-36) — 6× redukce draw calls.
  - *Sez. 29:* Audit cleanup — smazána VOXEL_MODEL + WORLD infrastruktura bez konzumenta.
