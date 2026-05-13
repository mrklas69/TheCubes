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

- [ ] **G0 Totální předělávka zobrazení bloků a ramp** — od atlas textur k lowpoly barevným objektům (no texture, plné barvy per face nebo per voxel). Důvod: pixel-art atlas má vizuální dluh (tile pattern uvnitř kindu, atlas/slow-path texture-source divergence — F5 sez. 32 fix částečný). Lowpoly + flat shading by simplifikoval pipeline + uvolnil draw call rozpočet (1 material per kind). DD-scale.
- [ ] **G1 Volba max Y** (výška kopců) — UI slider pro `RELIEF_AMPLITUDE` clamp, případně závislý na `MIN(sizeX, sizeZ)` (na 10×10 mapě nemá smysl alpine 6 voxelů — proporce).
- [ ] **G2 Severní šířka / podnební pásmo** — `WORLD.LATITUDE` nebo `world.CLIMATE` atribut (gated po DD-29 politice). Konzument: sun tilt (přidá k DD-38 fixed `SUN_TILT = π/6`), sezónní paleta, surface mix.
- [ ] **G3 SURFACES závislé na G2** — biome map z `generateTerrain` (sand u rovníku, grass mírné pásmo, snow polar). Refactor `surfaces: { grass, stone, sand, water }` z UI prop na driver-derived per `world.CLIMATE`.

### Otevřené body / kandidáti DD

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

- **`%AUDIT:CODE`** — 3/8 sezení od sez. 29. Další doporučený sez. 37+.
- **`%AUDIT:DOCS`** — 3/10 sezení od sez. 29. Další doporučený sez. 39+.
- **IDEAS/TODO pruning** — 0/12 (reset sez. 33).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.
