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

- [!] **InstancedMesh refactor** — sez. 30 100×100 stress test odhalil draw-call ceiling: 47k calls @ FPS 7 (CPU bound, GPU vyhrává 549k tri easily). Atlas pipeline (DD-36) už vyčerpaná, dál sníží jen instancing. Per atlas material → 1 InstancedMesh batch (TCUBES 4 kindy × 1 + rampy 3 typy × 3 surface = ~13 batchů celkem). Hover refactor: `raycaster.intersectObject().instanceId` → `modelInstance` map místo per-mesh. Odhad zisk: 47k → ~13 calls → FPS 7 → ~150+ @ 100×100. Velký refactor, vlastní DD-37 kandidát.
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

## Audit follow-up (sez. 29 nálezy)

Doporučené, neuděláno v sez. 29 audit batch:

- [ ] **F5 — Atlas/slow-path texture-source divergence**: atlas `getTcubesKindMaterial` volá `factory()` přímo, slow path přes `_faceMaterialCache` — pro stejný `:named-texture` vznikají 2 různé textury s různými random patches. Fix: shared registry `texturePerNamedKey`. User sez. 29 pre-flight check *parita OK*, takže low prio.
- [ ] **F6 — `_faceMaterialCache` + `_tcubesAtlasMatCache` + `_rampsAtlasMatCache` paralelní cache**: tři API, tři sémantiky, stejná konceptuální věc (material per spec). Refactor na `materialFor(spec)` s discriminated union, nebo komentář dokumentující rozdíl. *(Sez. 30 doplnil `_rampsAtlasMatCache` jako třetí variantu — argument pro sjednocení sílí.)*
- [ ] **F10 — Hover-clone material leak při `regenerateScene`**: `setHoverHighlight(true)` klonuje materials, regen nedispose. Při častém regen accumulate. Fix: `mesh.userData.hoverHotMat?.dispose?.()` před `scene.remove`.

Kosmetické:

- [ ] **F11 — Mrtvé importy + scratch vars**: `_b` scratch vector v main.js:455 (0 read-sitů, pozůstatek `balloon_bob` smazaného sez. 15). Komentář `_dir` na :773 zmiňuje smazaný balloon animátor.
- [ ] **F14 — RELIEF_AMPLITUDE/FREQUENCY indexy 9/10 duplikují 8 + clamp**: `terrain.js:75-76`. Dva mechanismy pro stejnou věc (SSoT). Buď clamp, nebo pole, ne obojí.

## Audit cadence

- **`%AUDIT:CODE`** — 1/8 sezení od sez. 29. Další doporučený sez. 37+.
- **`%AUDIT:DOCS`** — 1/10 sezení od sez. 29. Další doporučený sez. 39+.
- **IDEAS/TODO pruning** — 11/12 (po sez. 30 přesun hotových do DONE).
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.
