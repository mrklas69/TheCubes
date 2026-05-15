# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`. Raw nápady: `docs/IDEAS.md`.
>
> **Recent DONE (sez. 34–49):** Terrain G0..G6 cesta (DD-41 lowpoly vertex-color → DD-42 LATITUDE/HUMIDITY → DD-44 BIOME_SURFACES → DD-45 fBm/ridge³ → DD-46 smoothstep bimodal → DD-47 snow + LIQUID prototype). WORLD: DD-38 DAY/DAY_SPEED, DD-48 atmospheric, DECOR_DENSITY_MULT. DECOR: DD-49 procedural composites, DD-50 SEASON, DD-51 LEAF_AUTUMN + winter defoliation, DD-52 slope-aware Y. DD-54 LIQUID class. **Sez. 48 M-Genesis cleanup (DD-55):** K1+D1+D2 YAGNI drop (~580 ř.) + atlas IIFE + UI Sun toggle. Model 13 → 8 tříd. **Sez. 49 M-Genesis CLOSE:** Fáze 5 ceremonie + tag `v1.0-terrain` + post-close K1 face material dispatch drop (~250 ř.). Detail v `DONE.md` (sez. 49 + M-Genesis arc meta-záznam).

## Otevřené M8+

- [ ] **`.glb`/glTF asset import pipeline** — `GLTFLoader` + AssetCache + shadow setup pro načítané meshe. Otevírá: (a) hezčí lampu z user-poskytnutého PBR Street Props balíčku, (b) Stickman integraci, (c) dekorativní obyvatele scény. Vyžaduje nový DD (asset pipeline = strukturální).
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (závislé na asset pipeline výš), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.

## Speculative — wait-for-signal

Kandidáti bez explicit user signal. Drží se jako kotvy s historickým kontextem, neaktivní. Trigger = user signal (problém v praxi, perf need, content apetit) nebo začátek nového arc.

### Terrain v1.1+ (heightmap + ramps + post-process)

- [ ] **Roadmap relief 9..10** — valley carving / ridge noise algoritmus (heavily dissected / alpine plně).
- [ ] **Procedural paths + tunely** v generovaném terénu (pathfinding přes heightmap). Po sez. 38 TTUNELS class drop (audit D2) — třídu vrátit z git historie (`ccb9fe9^` na main), až bude tunely chtěné v procedurálním terénu.
- [ ] **2-voxel stepy + 4-cell jámy** — současný ramp algoritmus pokrývá jen 1-voxel step + 3-cell/L-shape/diag peak. Schodišťové vzory + 4-stěnné jámy zůstávají hranaté. Mimo MVP.
- [ ] **Drop-in animace tiles při `regenerateScene`** *(z `tiny-world-builder` `dropAnims` queue)* — staggered ease-out fade-in nových instancí po spawn (~120 ms per cell). Vizuálně oživuje regen místo „instant pop". Per-batch `instanceMatrix` interpolace nebo `userData.dropTime` čítač v animators.
- [ ] **Tilt-shift post-process** *(z `tiny-world-builder` estetika)* — gradient blur podle screen Y (přední/zadní rozmazání = „miniaturní svět" feel). Rozšíření / replace BokehPass. DD-kandidát po vyladění.
- [ ] **TDRAMP doplňující compatibility check** — aktuálně bez kontroly proti rampám u 2 horních sousedů (může narazit do boku). Empirický feedback ukáže, zda potřeba.
- [ ] **TDRAMP exact step Y** *(DD-52 follow-up)* — DD-52 dnes bilinear aproximace. Exact: `if (jitterX·dx + jitterZ·dz > 0) decY = y_top + 1.5; else decY = y_top + 0.5`. Skok na diagonal line. Sub-prah pokud user nahlásí floating/burying trees na TDRAMPech.
- [ ] **Math.floor experiment pro low relief plateau** *(DD-45/46 follow-up)* — DD-45 `Math.round(blended * amp)` clusteruje fBm distribuci kolem mean (relief 5 amp 3 → 55 % na top voxel). Experiment: nahradit `floor` (lower bias) pro relief ≤ 5. Cena: ztratí 1 voxel max výšky.
- [ ] **Symmetric VALLEY_AMP = −amplitude varianta** *(DD-46 follow-up)* — dnes asymetrický (VALLEY=−1, PEAK=amplitude). Pro skutečně symetrický bimodal by VALLEY=−amplitude dalo range [-amp, +amp]. Wait pro feedback typu „valley moc dominantní" / „peaks rozcucnatý".
- [ ] **Plynulý morph r5↔r6** *(DD-46 follow-up)* — DD-46 hard switch při r=6 (ridge³ → smoothstep bimodal). Pokud user pocítí „přechod rolling → hory trhanej", parametrizovat `bimodalWeight = clamp((relief-5)/3, 0, 1)`.

### WORLD / atmosféra

- [ ] **Per-cluster wave fáze** *(DD-48 follow-up)* — současný water wave je global synchroní (všechny meshe stejná fáze). Pro realistic „každé jezero vlastní vlnka" potřeba per-cluster offset (seed-based). Závislost: BFS clustering (DD-54 sub-prah) — bez clusteringu by per-cluster = per-cell = velké pole náhodných fází bez „lake" sémantiky.
- [ ] **Snow accumulation animace přes DAY_SPEED × SEASON** *(DD-50 follow-up plný scope, velký kus ~150 ř.)* — temporal evolution (sníh roste v zimě, taje na jaře) přes per-cell state `accumulationLevel ∈ [0,1]` + per-frame integrator dle `world.DAY × world.SEASON`. State persistence napříč regen problem.
- [ ] **Snow noise patches calibration** *(DD-47 follow-up)* — temperate snow dnes sort+rank top 30 % s `altBias = 0.3`. Pokud user feedback „moc/málo sněhu v mírném pásmu", tweak: `snowSpec.patchThreshold` (0.7 = 30 %) a/nebo `snowSpec.altBias` (0.3). Možná `freezeRatio` per HUMIDITY (wet temperate = víc sněhu než mid).
- [ ] **Sky tint kalibrace** *(sez. 47 sub-prah)* — pokud user feedback „moc subtle" nebo „moc distinct", tweak `SEASON_SKY_DELTA` / `SUN_SEASON_DELTA` deltas.
- [ ] **Ice texture per-cluster variation** *(sez. 47 sub-prah)* — sdílená texture napříč všechny ice meshes = 100×100 polar = identický pattern napříč cells = tile-grid může být vidět. Pokud rušivé, per-mesh texture nebo per-cluster (závisí na BFS clustering).
- [ ] **Smooth fade sun pod horizontem** *(sez. 47 sub-prah)* — pokud user signal „sun září v zemi" (mesh `fog: false`), alpha fade na intervalu Y [0, SUN_HORIZON_Y_MIN] místo hard cutoff.
- [ ] **`SUN_TILT_BY_LATITUDE.tropical` tweak** *(G2 follow-up)* — dnes 0° = sun přímo overhead = žádné stíny v poledne, objekty ploché. Kandidát `π/24` (~7.5°) zachová stínovou viditelnost.

### LIQUID extensions (DD-54)

- [ ] **BFS connected-components clustering + multi-Y split** *(DD-54 follow-up, sub-prah)* — `terrain.js` Krok 6.5 post-flood-fill: visited Set + queue, split components dle `(water_y, frozen)` key (= unikátní kombinace → samostatná LIQUID instance, drží z-fight invariant). Pro polar mid 100×100 (~500 water cells) by srazil na ~5-20 jezer. **Sez. 42 DD-53 attempt + revert** (visual artifact: bbox over varied water_y → mean Y → boundary z-fight). Pro 20×20 target use case marginal benefit, per-cell render always-correct. Plný refactor čeká na user signal „100×100 jezera blikají" nebo perf need. Sub-prahy: per-bbox ice texture noise (canvas), hybrid threshold ≥5 cells = bbox jinak per-cell. **Three.js gotcha:** PlaneGeometry vertex.Z=0 + mesh.rotation = scale.y → POST-rotation depth, ne scale.z.
- [ ] **Fyzika kapalin extensions** *(DD-54 budoucí hooks, user note sez. 45 „třeba někdy dojde na fyziku kapalin")* — `TEMPERATURE` numeric °C (gradient frozen↔melting, permafrost, sezonní tání), `FLOW_DIRECTION` (rivers/streams paralel PATH POINTS sekvence, spustí 2. sourozenec → abstract `LIQUIDS` base class per DD-27 vzoru), `VISCOSITY` (voda/láva/ropa/kyselina), `LEVEL` animace (tide cyklus, monsoon flood). Bez explicit user signal držet jako kotvy.

### DECOR polish

- [ ] **`BARK_DEAD` darker palette varianta** *(sez. 43 sub-prah)* — `_dead` flag teď použije `BARK_BROWN` (= same jako live trunk), oak/spruce snowed vs. dead vypadá podobně (oba kmen-only). Pro visual differentiation darker hex (e.g. `0x4a3520`) by oddělil „dead skeleton" od „winter bare".
- [ ] **Palm trunk curve** *(sez. 43 sub-prah)* — reálná palma má mírně zakřivený kmen. Současný `buildPalm` rovný Cylinder. Subdivision na 2-3 segmenty s mírným offsetem by dal realističtější profil. Komplikace: per-instance variability vs. shared geom cache.
- [ ] **DECOR rotation z slope normal** *(DD-52 follow-up)* — strom roste vertical, ne kolmo k ramp surface. Realistic OK pro stromy, ale fence/wall future entities by potřebovaly slope normal rotation.

### Perf opts (NE-priorita per target use case 20×20)

> Memory: `[[project_target_use_case]]` — target je 20×20 hezky vykreslený, ne 100×100 stress. Tyto opts smí být zavedeny **jen pokud nekompromitují visual quality 20×20** (memory `[[feedback_shadow_tighten_paradox]]`).

- [ ] **Shadow opt sub-prah** — shadow tighten alone neproduktuje perf win (denser texel paradox). Pokud někdy budeme řešit shadow cost, KOMBINOVAT shadow camera tighten + mapSize reduction. Memory: `[[feedback_shadow_tighten_paradox]]`.
- [ ] **Perf HUD distance LOD pro DECOR** — manual `mesh.visible = false` pro DECOR distanceTo(camera) > 30. Per-frame iteration 5k entries (cheap). Sub-prah pro hypotetický 100×100 stress playability.
- [ ] **InstancedMesh refactor pro DECOR** — per (KIND × varianta) `InstancedMesh` batch. Per 20×20 target nepotřebné; pro 100×100 stress edge case = academic. Komplikace: per-instance random scale/rotation v `instanceMatrix`, flatShading + InstancedMesh seam (`[[feedback_flat_shading_instanced]]`), fixed-count parts s `scale=0` neaktivních.
- [ ] **BatchedMesh refactor** — Three.js r167+ by mohl sloučit TCUBES + rampy do ~3 calls. Projekt na r160 — vyžaduje bump + nové API porozumění. Diminishing returns po DD-37 (13 → 3 = velmi marginální FPS).

### Speculative refactors / docs

- [ ] **`ExtrudeGeometry` pro rampy** *(lazy refactor po G0b)* — `tiny-world-builder` pattern nahrazuje custom BufferGeometry buildery (3 typy ramp) ExtrudeGeometry shape + depth. Diminishing returns po G0 (vertex colors už řeší dluh).
- [ ] **Adjacency-aware re-render pattern** *(z `tiny-world-builder` `setCell`)* — pro budoucí PATH/FENCE/WALL třídy: změna v cellu re-renderuje sousedy (cesty se spojí, ploty zdi). Mimo terrain batched dispatch, samostatný layer.
- [ ] **DIARY.md index retro cleanup** *(sez. 39 audit follow-up)* — od sez. 14 dál (multi-session days) index sazí 5-7 sezení do jednoho mega-řádku (sez. 38 řádek má 28k znaků). Per PROMPTS.md %END *„datum + shrnutí sezení"* — index má být stručný 1-2 věty per sezení, detail patří do `diary/YYYY-MM-DD.md`. Retro cleanup = velký úkol; pro budoucí sezení dodržovat stručný index automaticky.

## Audit cadence

- **`%AUDIT:CODE`** — **0/8** *(sez. 49 user-driven trigger + reset)*. Next: ~sez. 57.
- **`%AUDIT:DOCS`** — **2/10** *(sez. 48 reset; sez. 49 close + K1 follow-up = 2 tiky)*. Next: ~sez. 58.
- **IDEAS/TODO/DONE pruning** — **2/12** *(sez. 48 reset; sez. 49 close + sez. 50 post-close triage = 2 tiky)*. Next: ~sez. 60.
