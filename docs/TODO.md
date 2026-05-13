# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] **`.glb`/glTF asset import pipeline** — `GLTFLoader` + AssetCache + shadow setup pro načítané meshe. Otevírá: (a) hezčí lampu z user-poskytnutého PBR Street Props balíčku, (b) Stickman integraci (varianta A níže), (c) dekorativní obyvatele scény. Vyžaduje nový DD (asset pipeline = strukturální), sez. 29 F3 smazala stará MagicaVoxel pipeline (OBJ/MTL Loader) — pattern obnovit, ale na glTF stack.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (závislé na asset pipeline výš), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.

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
- [ ] **Procedural paths + tunely** v generovaném terénu (pathfinding přes heightmap).
- [ ] **2-voxel stepy + 4-cell jámy** — současný ramp algoritmus pokrývá jen 1-voxel step + 3-cell/L-shape/diag peak. Schodišťové vzory + 4-stěnné jámy zůstávají hranaté. Mimo MVP.
- [ ] **TDRAMP doplňující compatibility check** — aktuálně bez kontroly proti rampám u 2 horních sousedů (může narazit do boku). Empirický feedback ukáže, zda potřeba.

## M8+ otevřené (parkováno)

- [ ] **Biome populate** *(IDEAS — částečně překryto biome map v `generateTerrain`, terra-specific dekorace zůstává)*.
- [ ] **BUILDING třída** *(IDEAS — budoucí dekorativní/factory entity nad generovaným terénem)*.
- [ ] **TRACK třída** *(IDEAS — sourozenec PATH, vlaky odloženy)*.

## Audit cadence

- **`%AUDIT:CODE`** — **0/8 reset** *(sez. 38 audit běžel: K1/K2 docs drift fix, D1 BLOCKS+COMPOSITES import drop, D2 TTUNELS drop ~287 ř., D3 terrain.js komentář, D4 GLOSSARY engine-internal maps)*. Next: ~sez. 46.
- **`%AUDIT:DOCS`** — 9/10 sezení od sez. 29. Sez. 39 doporučený.
- **IDEAS/TODO pruning** — 6/12 (sez. 38: close G4 snow + DD-39 dusk sub-prahy, add 3 DD-47 follow-up sub-prahy, add 2 DD-48 follow-up, add „Vytunit reliéf" + „Mraky/srážky" IDEAS entries).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.

- [ ] **Symmetric VALLEY_AMP = −amplitude varianta** — DD-46 dnes asymetrický (VALLEY=−1, PEAK=amplitude). Peak side rozprostřená přes víc úrovní (Y=2,3,4) než valley side (Y=−1 dominantní). Pro skutečně symetrický bimodal (= stejné peaks i valleys distribuce) by VALLEY=−amplitude dalo range [-amp, +amp]. Pro r6 by to znamenalo -4..4. Wait pro user feedback typu „valley je moc dominantní" / „peaks rozcucnatý".
- [ ] **Plynulý morph r5↔r6** — DD-46 hard switch při r=6 (ridge³ → smoothstep bimodal). Pokud user pocítí „přechod mezi rolling a horami je trhanej", parametrizovat `bimodalWeight = clamp((relief-5)/3, 0, 1)` a lerp mezi ridge³ output a smoothstep output. Wait pro user feedback.

## Sub-prah (DD-47 follow-up, sez. 38)

- [ ] **Snow noise patches calibration** — temperate snow dnes sort+rank top 30 % s `altBias = 0.3`. Pokud user feedback bude „moc/málo sněhu v mírném pásmu", tweak: `snowSpec.patchThreshold` (0.7 = 30 %) a/nebo `snowSpec.altBias` (0.3). Možná `freezeRatio` per HUMIDITY (wet temperate = víc sněhu než mid).
- [ ] **Water cluster connected components** — viz Otevřené body výš (bbox clustering, ~500 cells → 5-20 jezer pro polar mid 100×100).
- [ ] **WORLD.SEASON driver pro freezeRatio** — dnes `polar=1.0, temperate=0.3` hard-coded. Reálná Země: zima víc led, léto méně. SEASON ∈ {jaro, léto, podzim, zima} → modifikuje freezeRatio (polar zůstává 1.0 napříč; temperate kolísá 0.0..0.6).
- [ ] **Ice canvas texture** — `_iceMat.color = 0xd9e8ec` je solid. Reálný „zasněžený led" by měl noise patches (= partially zasněžený, partially čistý led). Canvas texture s bílo-modrými skvrnami nebo vertex colors per plane corner.

## Sub-prah (DD-48 follow-up, sez. 38)

- [ ] **HSL hue shift pro sky/sun** — current lerp RGB-linear. Mezi `_skyDusk` (teplá) a `_skyDay` (tmavě modrá) RGB prochází přes desaturovanou hnědou. HSL lerp by dal hue rotation (orange → blue přes purple — fyzikálně realističtější Rayleigh).
- [ ] **Per-cluster wave fáze** — současný water wave je global synchroní (všechny meshe stejná fáze). Pro realistic „každé jezero vlastní vlnka" by potřeboval per-cluster offset (seed-based).

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
