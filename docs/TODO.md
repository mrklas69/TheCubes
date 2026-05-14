# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] **`.glb`/glTF asset import pipeline** — `GLTFLoader` + AssetCache + shadow setup pro načítané meshe. Otevírá: (a) hezčí lampu z user-poskytnutého PBR Street Props balíčku, (b) Stickman integraci (varianta A níže), (c) dekorativní obyvatele scény. Vyžaduje nový DD (asset pipeline = strukturální), sez. 29 F3 smazala stará MagicaVoxel pipeline (OBJ/MTL Loader) — pattern obnovit, ale na glTF stack.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (závislé na asset pipeline výš), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [x] **Náhradní obyvatel scény** *(sez. 40, DD-49 impl + DD-50 SEASON driver)*. Procedurální COMPOSITES landscape decoration (spruce/oak/bush/rock/grass_tuft) přes generickou `DECOR` třídu, biome-aware `DECOR_DENSITY[lat][hum]`, snow caps + scale 0.5×, ramp Y fix, bush Y proporční. DD-50 SEASON minimal scope (snow + ice modifier pro temperate). Viz DONE.md + DD-49 + DD-50.

## DAY-cycle (WORLD DD-38 follow-up)

- [ ] **Slider DAY sync z value** — periodic update (throttle ~4×/s) z `world.DAY` zpět do DOM `#set-day` inputu, aby při auto-advance (`DAY_SPEED > 0`) slider neztuhl. Známé omezení z DD-38, kosmetické.
- [x] **Sunset/sunrise barevný peak** *(sez. 38, DD-48)* — 3-keypoint piecewise (`_skyNight` → `_skyDusk` → `_skyDay`) v `updateAtmosphere()`. Driver: raw `negCosA` ∈ [-1, 1]. Plus sun color piecewise (`_sunColorSunrise` → `_sunColorMid` → `_sunColorNoon`). Viz DONE.md + DD-48.

## Terrain generator (`generateTerrain`)

### Roadmap kapitoly (sez. 34+ kandidáti)

- [x] **G0 Lowpoly vertex-color pipeline** *(sez. 34, DD-41 supersede DD-36 atlas)* — atlas textury → vertex colors per face na sdíleném `MeshLambertMaterial({ vertexColors: true })`. G0a TCUBES + G0b rampy + cleanup atlas builders. Viz DONE.md + DD-41.
- [x] **G1 Volba max Y** *(sez. 35, žádný DD)* — `maxReliefForSize(sx,sz)` export z `terrain.js`, `relief.max` clamp dynamicky dle MIN(sx,sz). KISS quick win. 10×10 → 0..3 (Rolling), 30×30 → 0..5 (Uneven), 60+ → 0..10 (Alpine). Viz DONE.md.
- [x] **G2 Severní šířka / podnební pásmo** *(sez. 35, DD-42 + DD-43)* — `world.LATITUDE` (4 enum) + `world.HUMIDITY` (3 enum) atributy, `SUN_TILT_BY_LATITUDE` lookup nahrazuje DD-38 fixed `SUN_TILT`, `BIOME_NAMES` 4×3 tabulka, UI Climate sekce v `#terrainctrl`. MVP konzument: sun tilt + UI biome readout. Pre-G2 fix: DD-43 DAY mapping 0.5=poledne. Viz DONE.md + DD-42 + DD-43.
- [x] **G3 SURFACES driver-derived per biome** *(sez. 36, DD-44)* — `BIOME_SURFACES` 4×3 lookup v `terrain.js` (12 buněk × 4 koef.), `surfacesForBiome(lat, hum)` helper. Hard override v UI: surface slidery smazány, Climate slidery `change` triggerují regen. `polar.wet` = alias `polar.mid` + rename `BIOME_NAMES.polar.wet` na "Polární tundra". Viz DONE.md + DD-44.
- [x] **G5 Smoothstep bimodální heightmap pro high relief** *(sez. 37, DD-46)* — pro `relief ≥ 6` přepne na `t = smoothstep(0.4, 0.6, fbmVal); blended = lerp(VALLEY_AMP=-1, PEAK_AMP=amplitude, t)`. Bimodální distribuce (dva mody: údolí + peaks, úzký transition). Pro r ≤ 5 DD-45 ridge³ beze změny. USER case 46×47 r6 verdikt „Super!". Viz DONE.md + DD-46.
- [x] **G6 Climate-driven surface state: snow + LIQUID prototype** *(sez. 38, DD-47)* — drop `water` surface kind (BIOME_SURFACES 4→3 col, % přerozděleno), `snowSpecForLatitude` (polar all, temperate sort+rank top 30 % s altitude bias), `waterSpecForClimate` (dry no water, flood-fill basins, ice dle latitude). BLOCK_COLORS 4→8 (`_snow` varianty). Priority flood (Wang & Liu) pro water level. Viz DONE.md + DD-47.

### Otevřené body / kandidáti DD

- [ ] **Drop-in animace tiles při `regenerateScene`** *(z `tiny-world-builder` `dropAnims` queue)* — staggered ease-out fade-in nových instancí po spawn (~120 ms per cell). Vizuálně oživuje regen místo "instant pop". Per-batch `instanceMatrix` interpolace nebo `userData.dropTime` čítač v animators.
- [ ] **Tilt-shift post-process** *(z `tiny-world-builder` estetika)* — gradient blur podle screen Y (přední/zadní rozmazání = "miniaturní svět" feel). Rozšíření / replace BokehPass (sez. 31 dnes distance-based DOF). DD-kandidát po vyladění.
- [ ] **`ExtrudeGeometry` pro rampy** *(lazy refactor po G0b)* — `tiny-world-builder` pattern nahrazuje custom BufferGeometry buildery (3 typy ramp) ExtrudeGeometry shape + depth. Diminishing returns po G0 (vertex colors už řeší dluh), nice-to-have simplifikace.
- [ ] **Adjacency-aware re-render pattern** *(z `tiny-world-builder` `setCell`)* — pro budoucí PATH/FENCE/WALL třídy: změna v cellu re-renderuje sousedy (cesty se spojí, ploty zdi). Mimo terrain batched dispatch, samostatný layer.
- [ ] **BatchedMesh refactor** — sez. 31 InstancedMesh (DD-37) srazila 100×100 na ~13 draw calls. Three.js `BatchedMesh` (r167+) by mohl sloučit TCUBES + rampy do ~3 calls (per-instance geom). Projekt na r160 — vyžaduje bump + nové API porozumění. Diminishing returns (13 → 3 = velmi marginální FPS), low prio.
- [ ] **`LIQUID` třída** (DD-25 vrstva 4) pro vodní plane(y) — DD-47 prototype dnes single-mesh per cell (= "prototype LIQUID"). Plná 1. třída entita = OOP třída pod CUBES, atribut LEVEL/TEMPERATURE/FLOW_DIRECTION, klastry s vlastními ANIMATE. Sub-prah po DD-47.
- [ ] **Klastrování spojitých water cells** do bounding boxů (flood-fill connected components, jeden plane na celé jezero) místo 1×1 per cell. Pro polar mid 100×100 (~500 water cells) je dnes ~500 meshes. Bbox clustering by srazil na ~5-20 jezer = 5-20 meshes. Sub-prah DD-47 follow-up.
- [ ] **Roadmap relief 9..10**: valley carving / ridge noise algoritmus (heavily dissected / alpine plně).
- [ ] **Procedural paths + tunely** v generovaném terénu (pathfinding přes heightmap). Po sez. 38 TTUNELS class drop (audit D2) — třídu vrátit z git historie (`ccb9fe9^` na main), až bude tunely chtěné v procedurálním terénu.
- [ ] **2-voxel stepy + 4-cell jámy** — současný ramp algoritmus pokrývá jen 1-voxel step + 3-cell/L-shape/diag peak. Schodišťové vzory + 4-stěnné jámy zůstávají hranaté. Mimo MVP.
- [ ] **TDRAMP doplňující compatibility check** — aktuálně bez kontroly proti rampám u 2 horních sousedů (může narazit do boku). Empirický feedback ukáže, zda potřeba.

## M8+ otevřené (parkováno)

- [ ] **Biome populate** *(IDEAS — částečně překryto biome map v `generateTerrain`, terra-specific dekorace nyní řeší DD-49)*.
- [ ] **BUILDING třída** *(IDEAS — budoucí dekorativní/factory entity nad generovaným terénem)*.
- [ ] **TRACK třída** *(IDEAS — sourozenec PATH, vlaky odloženy)*.

## Krajinné COMPOSITES (DD-49) + SEASON (DD-50/DD-51) + slope-aware Y (DD-52) sub-prahy

DD-49 + DD-50 implementovány sez. 40. DD-51 (LEAF_AUTUMN cycle + winter defoliation) + DD-52 (slope-aware decor Y) implementovány sez. 41. Otevřené sub-prahy:

### Priorita pro sez. 42 — perf trigger

- [!] **InstancedMesh refactor pro DECOR** *(DD-kandidát, trigger byl perf regrese sez. 41)*. Per (KIND × varianta) `InstancedMesh` batch. Sez. 41 multi-decor `MAX_ATTEMPTS=2` zkusil → ~20k DECOR Object3D × ~5 child meshes per Group = ~100k scenetree, rAF 123ms (~8 FPS). Rolled back na 1 attempt; pro hustší prales potřebuje InstancedMesh. Komplikace: per-instance random scale/rotation v `instanceMatrix`, flatShading + InstancedMesh seam (memory [[feedback_flat_shading_instanced]] — switch na vertex-color pipeline pro DECOR). Otevírá cestu k MAX_ATTEMPTS=2-3 bez perf hit.

### Fáze 6 — follow-up DECOR (KIND extension)

- [ ] **`palm` KIND** — `tropical.wet` palmy (CylinderGeom kmen + 5-7 long ConeGeom listy z apex).
- [ ] **`cactus` KIND** — `subtropical.dry` (CylinderGeom svislé sloupce, 1-3 paže).
- [ ] **`flower` KIND** — `temperate.wet` louka kvítky (small SphereGeom + thin stem).
- [ ] **Pařezy + kmeny** — `stump`, `log`. Nízké válce / hranol s anuli.
- [ ] **`_dead` postfix** — no leaves, dark bark (sušené stromy v dry biomech). Builder priorita rozšíření: `dead > snowed > autumn > default`.
- [ ] **Density UI control** — slider v `#terrainctrl` „Decoration density" (multiplikátor 0..2× nad DECOR_DENSITY).
- [ ] **Receive shadow opt-out flag** — `userData.noReceiveShadow` analogicky k `noShadow`. DD-49 spec původně receiveShadow=false pro decor (marginal perf save). Aktuálně default traversal nastaví na true.
- [ ] **LEAF_AUTUMN HSL variace per instance** — currently single hex `0xc8722a`. Reálný podzimní les má spektrum oranžová/žlutá/červená/hnědá per individuální strom. Per-instance hue shift přes `DECOR.SEED`-derived noise.

### DD-50 SEASON follow-up (mid + plný scope)

- [x] **LEAF_AUTUMN paleta v autumn** *(sez. 41, DD-51)* — listnaté seasonal cycle: spring/summer LEAF_GREEN, autumn LEAF_AUTUMN, winter (snowed) defoliated (oak = kmen-only, bush = skip). Spruce season-invariant. Viz DONE.md + DD-51.
- [ ] **DECOR_DENSITY sezonní modifier** — autumn -20 % leaves, winter -50 % leaves + 20 % rock visibility. `decorate()` rozšíření o season-weighted multiplier.
- [ ] **Polar season variace** — polar summer ablation (méně led, méně sníh), polar winter pernamentní 1.0 napříč. Vyžaduje rozdvojit polar branch v `snowSpecForLatitude` / `waterSpecForClimate`.
- [ ] **Sky/sun color season modifier** — DD-48 `_skyDay` / `_skyDusk` keypoints jsou season-invariant. Sezonní subtle tint (winter colder modřejší, summer warmer žlutější).
- [ ] **Snow accumulation animace přes DAY_SPEED** — temporal evolution (sníh roste v zimě, taje na jaře) přes WORLD.DAY × SEASON interpolation.

### DD-52 slope-aware Y follow-up

- [ ] **TDRAMP exact step Y** — DD-52 dnes bilinear aproximace. Exact: `if (jitterX·dx + jitterZ·dz > 0) decY = y_top + 1.5; else decY = y_top + 0.5`. Skok na diagonal line. Sub-prah pokud user nahlásí floating/burying trees na TDRAMPech.
- [ ] **DECOR rotation z slope normal** — strom roste vertical, ne kolmo k ramp surface. Realistic OK pro stromy, ale fence/wall future entities by potřebovaly slope normal rotation.

## Audit cadence

- **`%AUDIT:CODE`** — **3/8** *(sez. 40+41 jen impl, žádný audit)*. Next: ~sez. 46.
- **`%AUDIT:DOCS`** — **2/10** *(sez. 40+41 jen impl, žádný audit)*. Next: ~sez. 49.
- **IDEAS/TODO pruning** — **10/12** *(sez. 41 prune: close LEAF_AUTUMN sub-prah; add InstancedMesh DECOR priority + DD-52 follow-up + DD-51 LEAF_AUTUMN HSL sub-prah)*. **Velmi blízko prahu** — další sezení vyhodnotit jako pruning trigger.

- [ ] **Symmetric VALLEY_AMP = −amplitude varianta** — DD-46 dnes asymetrický (VALLEY=−1, PEAK=amplitude). Peak side rozprostřená přes víc úrovní (Y=2,3,4) než valley side (Y=−1 dominantní). Pro skutečně symetrický bimodal (= stejné peaks i valleys distribuce) by VALLEY=−amplitude dalo range [-amp, +amp]. Pro r6 by to znamenalo -4..4. Wait pro user feedback typu „valley je moc dominantní" / „peaks rozcucnatý".
- [ ] **Plynulý morph r5↔r6** — DD-46 hard switch při r=6 (ridge³ → smoothstep bimodal). Pokud user pocítí „přechod mezi rolling a horami je trhanej", parametrizovat `bimodalWeight = clamp((relief-5)/3, 0, 1)` a lerp mezi ridge³ output a smoothstep output. Wait pro user feedback.

## Sub-prah (DD-47 follow-up, sez. 38)

- [ ] **Snow noise patches calibration** — temperate snow dnes sort+rank top 30 % s `altBias = 0.3`. Pokud user feedback bude „moc/málo sněhu v mírném pásmu", tweak: `snowSpec.patchThreshold` (0.7 = 30 %) a/nebo `snowSpec.altBias` (0.3). Možná `freezeRatio` per HUMIDITY (wet temperate = víc sněhu než mid).
- [ ] **Water cluster connected components** — viz Otevřené body výš (bbox clustering, ~500 cells → 5-20 jezer pro polar mid 100×100).
- [x] **WORLD.SEASON driver pro freezeRatio** *(sez. 40, DD-50 minimal scope)* — `SEASON ∈ {spring, summer, autumn, winter}` atribut WORLD. `snowSpecForLatitude(lat, season)` + `waterSpecForClimate(lat, hum, season)` rozšířeny — temperate `patchThreshold` + `freezeRatio` per season. Polar invariant (perpetually-winter), tropical/subtropical invariant. UI 4-step slider v Climate sekci. Viz DONE.md + DD-50. Plný scope (LEAF_AUTUMN, DECOR_DENSITY sezonní, polar season variace, sky color sezonní, snow accumulation animace) zůstává sub-prah — viz DD-50 follow-up sekce výše.
- [ ] **Ice canvas texture** — `_iceMat.color = 0xd9e8ec` je solid. Reálný „zasněžený led" by měl noise patches (= partially zasněžený, partially čistý led). Canvas texture s bílo-modrými skvrnami nebo vertex colors per plane corner.

## Sub-prah (DD-48 follow-up, sez. 38)

- [ ] **HSL hue shift pro sky/sun** — current lerp RGB-linear. Mezi `_skyDusk` (teplá) a `_skyDay` (tmavě modrá) RGB prochází přes desaturovanou hnědou. HSL lerp by dal hue rotation (orange → blue přes purple — fyzikálně realističtější Rayleigh).
- [ ] **Per-cluster wave fáze** — současný water wave je global synchroní (všechny meshe stejná fáze). Pro realistic „každé jezero vlastní vlnka" by potřeboval per-cluster offset (seed-based).

## Sub-prah (sez. 39 %AUDIT:DOCS follow-up)

- [ ] **DIARY.md index retro cleanup** — od sez. 14 dál (multi-session days) index sazí 5-7 sezení do jednoho mega-řádku (sez. 38 řádek má 28k znaků). Per PROMPTS.md %END *„datum + shrnutí sezení"* — index má být stručný 1-2 věty per sezení, detail patří do `diary/YYYY-MM-DD.md`. Retro cleanup = velký úkol, pro budoucí sezení dodržovat stručný index automaticky.

## Sub-prah (DD-46 follow-up, sez. 37, zachovat)
- [x] **Bimodální heightmap (G5 kandidát)** *(sez. 37, DD-46)* — vyřešeno smoothstep bimodální variantou pro relief ≥ 6. Viz DONE.md.
- [x] **Snow surface (G4 kandidát)** *(sez. 38, DD-47)* — vyřešeno climate-driven snow distribution (`snowSpecForLatitude` polar all / temperate sort+rank). Drop sand-proxy v polar (DD-44 → DD-47 BIOME_SURFACES drop water, polar % redistribuce na stone+sand). Viz DONE.md + DD-47.
- [ ] **Math.floor experiment pro low relief plateau** — DD-45 `Math.round(blended * amp)` clusteruje fBm distribuci kolem mean (relief 5 amp 3 → 55 % na top voxel). Experiment: nahradit `floor` (lower bias) pro relief ≤ 5. Cena: ztratí 1 voxel max výšky pro pure fBm. Wait pro user feedback ze sez. 37 testu DD-46 (relevantní jen pro r ≤ 5, DD-46 řeší r ≥ 6 ortogonálně).

## Sub-prah (G2 follow-up, sez. 35)

- [x] **Polar/wet biome fallback** *(sez. 36, DD-44 alias polar.mid)* — `BIOME_SURFACES.polar.wet` = alias `polar.mid` + `BIOME_NAMES.polar.wet` rename na "Polární tundra". Transparent fallback (Arktická tundra geografi nejbližší). Viz DONE.md.
- [ ] **`SUN_TILT_BY_LATITUDE.tropical` tweak** — dnes 0° = sun přímo overhead = žádné stíny v poledne, objekty ploché (degenerate shadow plane). Kandidát `π/24` (~7.5°) zachová stínovou viditelnost. Wait pro user feedback (ne každý uvidí jako problém).

## Sub-prah (G0 follow-up)

- [ ] **Atlas IIFE raw geom strip UV at source** + rename na `_RAMP_RAW_GEOM_*` — IIFE pořád builduje UV + `remapU` (~50 ř. zbytečný compute), `getRampGeom` to stripuje v clone. KISS dluh.
- [x] **TTUNELS drop** *(sez. 38, audit cleanup)* — DROP varianta (vs. migrate na lowpoly nebo wait). Smazána třída (`model.js`) + dispatch + builder + atlas geom IIFE (`main.js`) + GLOSSARY entry + zmínky napříč docs. Vrátit lze z git historie, až budou tunely chtěné (procedurální paths + tunely v terénu).
- [ ] **GLOSSARY BLOCKS rodina atributy sync s DD-41** *(sez. 38 audit follow-up)* — `**TCUBES**` doc na ř. 18 stále popisuje `TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST` atributy (po DD-41 drop z `model.js` constructor). Stejně TRRAMPS/TTRAMPS/TDRAMP popisy stále vypisují `TEXTURE_*` face atributy. Po DD-41 (sez. 34) tyto atributy v modelu neexistují — vertex-color paleta je řízena z `BLOCK_COLORS` v main.js, ne z instance atributů. Synchro: drop `TEXTURE_*` z atribut sekce, zachovat **face geometrie popis** (faces vs. BLOCK_COLORS klíče = informativní mapping pro vývojáře). Sub-prah K-pattern (jako K1/K2 docs drift sez. 38).
