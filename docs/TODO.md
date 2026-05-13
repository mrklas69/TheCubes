# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [ ] **CCUBES typizace** (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.

## Terrain generator (`generateTerrain`)

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
- **IDEAS/TODO pruning** — 13/12 (po sez. 32 přesun hotových do DONE — *překročen prah, audit ideas/todo v sez. 33+*).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.
