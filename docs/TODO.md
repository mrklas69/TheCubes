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

- [ ] **Rampy atlas refactor** (TRRAMPS / TTRAMPS / TDRAMP / TTUNELS) — sez. 28 atlas pattern pro TCUBES dodal 6× redukci draw calls. Rampy mají per-instance `material[N]` array (5/4/5/4 faces) = ~1 200 calls @ 30×30 (24 % celkem). Atlas pro rampy by ušetřil ~17 % incremental. 4× repeat patternu (per-(type, surface) atlas, ~9 unique combos, shared geom s UV remap na 1/N-tice). *(Sez. 30+ follow-up, diminishing return ale přímočaré.)*
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

## Governance

- [!] **PROMPTS.md `%END` aktualizovat o topic-branch workflow** — současný text *„Commit na větev `main`"* je zastaralý od sez. 21 (DD-30 zavedl `feat/factory`, dále `feat/terrain`, `feat/terrain-perf`, `feat/audit-29-cleanup`). Doplnit explicitní krok: rozhodnutí merge teď vs. pokračovat na topic branch + návrh `git merge --no-ff`. Censure ze sez. 27 + 28.

## Audit follow-up (sez. 29 nálezy mimo F1-F4 batch)

Doporučené, neuděláno v sez. 29 audit batch:

- [ ] **F5 — Atlas/slow-path texture-source divergence**: atlas `getTcubesKindMaterial` volá `factory()` přímo, slow path přes `_faceMaterialCache` — pro stejný `:named-texture` vznikají 2 různé textury s různými random patches. Fix: shared registry `texturePerNamedKey`. User sez. 29 pre-flight check *parita OK*, takže low prio.
- [ ] **F6 — `_faceMaterialCache` + `_tcubesAtlasMatCache` paralelní cache**: dvě API, dvě sémantiky, stejná konceptuální věc (material per kind). Refactor na `materialFor(spec)` s discriminated union, nebo komentář dokumentující rozdíl.
- [ ] **F9 — `_perfHud.el.mat` zavádějící metrika**: měří jen `_faceMaterialCache.size`, ne atlas cache + path cache. Po atlas refactoru má prakticky konstantní hodnotu. Fix: součet všech cache.
- [ ] **F10 — Hover-clone material leak při `regenerateScene`**: `setHoverHighlight(true)` klonuje materials, regen nedispose. Při častém regen accumulate. Fix: `mesh.userData.hoverHotMat?.dispose?.()` před `scene.remove`.

Kosmetické:

- [ ] **F11 — Mrtvé importy + scratch vars**: `_b` scratch vector v main.js:455 (0 read-sitů, pozůstatek `balloon_bob` smazaného sez. 15). Komentář `_dir` na :773 zmiňuje smazaný balloon animátor.
- [ ] **F12 — Shadow frustum hardcoded ±8**: `sun.shadow.camera.left = -8` (main.js:76), komentář *„grid 10×10, bezpečný 16×16"*. Po DD-32 generátor podporuje 30×30 → stíny ostříhnou. Buď konstanta `SHADOW_FRUSTUM = 30` nebo dle `TERRAIN_DEFAULTS.size`.
- [ ] **F14 — RELIEF_AMPLITUDE/FREQUENCY indexy 9/10 duplikují 8 + clamp**: `terrain.js:75-76`. Dva mechanismy pro stejnou věc (SSoT). Buď clamp, nebo pole, ne obojí.

## Audit cadence (reset po sez. 29)

- **`%AUDIT:CODE`** — 0/8 sezení (reset po sez. 29 audit). Další doporučený sez. 37+.
- **`%AUDIT:DOCS`** — 0/10 sezení (reset po sez. 29 GLOSSARY rewrite). Další doporučený sez. 39+.
- **IDEAS/TODO pruning** — 10/12.
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" stále resetnut.
