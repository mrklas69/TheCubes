# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] **`.glb`/glTF asset import pipeline** — `GLTFLoader` + AssetCache + shadow setup pro načítané meshe. Otevírá: (a) hezčí lampu z user-poskytnutého PBR Street Props balíčku, (b) Stickman integraci (varianta A níže), (c) dekorativní obyvatele scény. Vyžaduje nový DD (asset pipeline = strukturální), sez. 29 F3 smazala stará MagicaVoxel pipeline (OBJ/MTL Loader) — pattern obnovit, ale na glTF stack.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (závislé na asset pipeline výš), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.

## DAY-cycle (WORLD DD-38 follow-up)

- [ ] **Slider DAY sync z value** — periodic update (throttle ~4×/s) z `world.DAY` zpět do DOM `#set-day` inputu, aby při auto-advance (`DAY_SPEED > 0`) slider neztuhl. Známé omezení z DD-38, kosmetické.
- [ ] **Sunset/sunrise barevný peak** (rozšíření DD-39) — momentálně jen 2 keypointy (`_skyDay`/`_skyNight`). Přidat 3. barvu `_skyDusk` (oranžová) s peakem kolem `daylight ≈ 0` (sunrise/sunset). Piecewise lerp místo lineárního.

## Terrain generator (`generateTerrain`)

### Roadmap kapitoly (sez. 34+ kandidáti)

- [x] **G0 Lowpoly vertex-color pipeline** *(sez. 34, DD-41 supersede DD-36 atlas)* — atlas textury → vertex colors per face na sdíleném `MeshLambertMaterial({ vertexColors: true })`. G0a TCUBES + G0b rampy + cleanup atlas builders. Viz DONE.md + DD-41.
- [x] **G1 Volba max Y** *(sez. 35, žádný DD)* — `maxReliefForSize(sx,sz)` export z `terrain.js`, `relief.max` clamp dynamicky dle MIN(sx,sz). KISS quick win. 10×10 → 0..3 (Rolling), 30×30 → 0..5 (Uneven), 60+ → 0..10 (Alpine). Viz DONE.md.
- [x] **G2 Severní šířka / podnební pásmo** *(sez. 35, DD-42 + DD-43)* — `world.LATITUDE` (4 enum) + `world.HUMIDITY` (3 enum) atributy, `SUN_TILT_BY_LATITUDE` lookup nahrazuje DD-38 fixed `SUN_TILT`, `BIOME_NAMES` 4×3 tabulka, UI Climate sekce v `#terrainctrl`. MVP konzument: sun tilt + UI biome readout. Pre-G2 fix: DD-43 DAY mapping 0.5=poledne. Viz DONE.md + DD-42 + DD-43.
- [x] **G3 SURFACES driver-derived per biome** *(sez. 36, DD-44)* — `BIOME_SURFACES` 4×3 lookup v `terrain.js` (12 buněk × 4 koef.), `surfacesForBiome(lat, hum)` helper. Hard override v UI: surface slidery smazány, Climate slidery `change` triggerují regen. `polar.wet` = alias `polar.mid` + rename `BIOME_NAMES.polar.wet` na "Polární tundra". Viz DONE.md + DD-44.

### Otevřené body / kandidáti DD

- [ ] **Drop-in animace tiles při `regenerateScene`** *(z `tiny-world-builder` `dropAnims` queue)* — staggered ease-out fade-in nových instancí po spawn (~120 ms per cell). Vizuálně oživuje regen místo "instant pop". Per-batch `instanceMatrix` interpolace nebo `userData.dropTime` čítač v animators.
- [ ] **Tilt-shift post-process** *(z `tiny-world-builder` estetika)* — gradient blur podle screen Y (přední/zadní rozmazání = "miniaturní svět" feel). Rozšíření / replace BokehPass (sez. 31 dnes distance-based DOF). DD-kandidát po vyladění.
- [ ] **`ExtrudeGeometry` pro rampy** *(lazy refactor po G0b)* — `tiny-world-builder` pattern nahrazuje custom BufferGeometry buildery (3 typy ramp) ExtrudeGeometry shape + depth. Diminishing returns po G0 (vertex colors už řeší dluh), nice-to-have simplifikace.
- [ ] **Adjacency-aware re-render pattern** *(z `tiny-world-builder` `setCell`)* — pro budoucí PATH/FENCE/WALL třídy: změna v cellu re-renderuje sousedy (cesty se spojí, ploty zdi). Mimo terrain batched dispatch, samostatný layer.
- [ ] **BatchedMesh refactor** — sez. 31 InstancedMesh (DD-37) srazila 100×100 na ~13 draw calls. Three.js `BatchedMesh` (r167+) by mohl sloučit TCUBES + rampy do ~3 calls (per-instance geom). Projekt na r160 — vyžaduje bump + nové API porozumění. Diminishing returns (13 → 3 = velmi marginální FPS), low prio.
- [ ] **`LIQUID` třída** (DD-25 vrstva 4) pro vodní plane(y) — momentálně mimo OOP model (DD-33 kandidát).
- [ ] **Klastrování spojitých water cells** do bounding boxů (flood-fill, jeden plane na celé jezero) místo 1×1 per cell.
- [ ] **Roadmap relief 9..10**: valley carving / ridge noise algoritmus (heavily dissected / alpine plně).
- [ ] **Procedural paths + tunely** v generovaném terénu (pathfinding přes heightmap).
- [ ] **2-voxel stepy + 4-cell jámy** — současný ramp algoritmus pokrývá jen 1-voxel step + 3-cell/L-shape/diag peak. Schodišťové vzory + 4-stěnné jámy zůstávají hranaté. Mimo MVP.
- [ ] **TDRAMP doplňující compatibility check** — aktuálně bez kontroly proti rampám u 2 horních sousedů (může narazit do boku). Empirický feedback ukáže, zda potřeba.

## M8+ otevřené (parkováno)

- [ ] **Biome populate** *(IDEAS — částečně překryto biome map v `generateTerrain`, terra-specific dekorace zůstává)*.
- [ ] **BUILDING třída** *(IDEAS — budoucí dekorativní/factory entity nad generovaným terénem)*.
- [ ] **TRACK třída** *(IDEAS — sourozenec PATH, vlaky odloženy)*.

## Audit cadence

- **`%AUDIT:CODE`** — 7/8 sezení od sez. 29. Další doporučený sez. 37 *(prah dosažen)*.
- **`%AUDIT:DOCS`** — 7/10 sezení od sez. 29. Další doporučený sez. 39+.
- **IDEAS/TODO pruning** — 3/12 (sez. 36: close G3, close polar/wet sub-prah, add snow surface G4 sub-prah).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.

## Sub-prah (G3 follow-up, sez. 36)

- [ ] **Snow surface (G4 kandidát)** — dnes `polar.*` v `BIOME_SURFACES` používá `sand` jako proxy pro sníh. Vizuálně to vypadá jako poušť, ne sníh. G4: přidat `snow` surface kind do `SURFACE_Y_OFFSET` v terrain.js + atlas paleta (klon `grass-top` s bílou). Migrate `polar.*` z `sand` na `snow`. Drobný DD scope.

## Sub-prah (G2 follow-up, sez. 35)

- [x] **Polar/wet biome fallback** *(sez. 36, DD-44 alias polar.mid)* — `BIOME_SURFACES.polar.wet` = alias `polar.mid` + `BIOME_NAMES.polar.wet` rename na "Polární tundra". Transparent fallback (Arktická tundra geografi nejbližší). Viz DONE.md.
- [ ] **`SUN_TILT_BY_LATITUDE.tropical` tweak** — dnes 0° = sun přímo overhead = žádné stíny v poledne, objekty ploché (degenerate shadow plane). Kandidát `π/24` (~7.5°) zachová stínovou viditelnost. Wait pro user feedback (ne každý uvidí jako problém).

## Sub-prah (G0 follow-up)

- [ ] **Atlas IIFE raw geom strip UV at source** + rename na `_RAMP_RAW_GEOM_*` — IIFE pořád builduje UV + `remapU` (~50 ř. zbytečný compute), `getRampGeom` to stripuje v clone. KISS dluh.
- [ ] **TTUNELS migrate na lowpoly** — TTUNELS si zachovává `TEXTURE_*` fields + atlas pipeline (mimo G0 scope). Buď migrate na vertex colors nebo drop dead třída (žádný producer ji nespawne).
