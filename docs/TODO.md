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
- [ ] **G1 Volba max Y** (výška kopců) — UI slider pro `RELIEF_AMPLITUDE` clamp, případně závislý na `MIN(sizeX, sizeZ)` (na 10×10 mapě nemá smysl alpine 6 voxelů — proporce).
- [ ] **G2 Severní šířka / podnební pásmo** — `WORLD.LATITUDE` nebo `world.CLIMATE` atribut (gated po DD-29 politice). Konzument: sun tilt (přidá k DD-38 fixed `SUN_TILT = π/6`), sezónní paleta, surface mix.
- [ ] **G3 SURFACES závislé na G2** — biome map z `generateTerrain` (sand u rovníku, grass mírné pásmo, snow polar). Refactor `surfaces: { grass, stone, sand, water }` z UI prop na driver-derived per `world.CLIMATE`.

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

- **`%AUDIT:CODE`** — 5/8 sezení od sez. 29. Další doporučený sez. 37+.
- **`%AUDIT:DOCS`** — 5/10 sezení od sez. 29. Další doporučený sez. 39+.
- **IDEAS/TODO pruning** — 1/12 (sez. 34: close G0, add 4 follow-up tiny-world-builder + 2 G0 sub-prah).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.

## Sub-prah (G0 follow-up)

- [ ] **Atlas IIFE raw geom strip UV at source** + rename na `_RAMP_RAW_GEOM_*` — IIFE pořád builduje UV + `remapU` (~50 ř. zbytečný compute), `getRampGeom` to stripuje v clone. KISS dluh.
- [ ] **TTUNELS migrate na lowpoly** — TTUNELS si zachovává `TEXTURE_*` fields + atlas pipeline (mimo G0 scope). Buď migrate na vertex colors nebo drop dead třída (žádný producer ji nespawne).
