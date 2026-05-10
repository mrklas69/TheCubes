# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [ ] **CCUBES typizace** (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.

## Sez. 19 → 20 Příště

- [x] **WORLD entity** *(sez. 20 Light DO, DD-29)* — singleton `WORLD` s `WIND_STRENGTH` (default 1.0), instance `world` v `main.js`, `tree_sway` násobí amplitudu. Ostatní atributy (`SUN_ANGLE`, `CLIMATE`, `SEASON`, `DAY`, `WIND_DIRECTION`) odloženy do `IDEAS.md` — DD-29 politika „atribut přibude jen s živým konzumentem".
- [ ] **Biome populate** *(přeneseno; čeká na `WORLD.CLIMATE` jako konzumenta — gated by DD-29)* — `BIOME_TREES[climate] = { kind: weight }` + `populateVegetation(world, region, density, variety)`.
- [ ] **BUILDING třída** *(přeneseno)* — pixel-voxel domy/sklady/věže (vrstva 2, DD-25). KIND sub-buildery analogicky s TREE.
- [ ] **TRACK třída** (LINES vrstva 3, sourozenec PATH) — koleje pro vlak. Poté zvážit `LINES` abstract base třídu.
- [ ] **`mtllib` reference fix** *(drobnost)* — pokud existuje, ověřit že `cube-grass.obj` odkazuje na správný `cube-grass.mtl` (ne stará verze `grass-cube.mtl`).
- [ ] **Editor fáze 2** — spawn/move/delete + registry cleanup. Po sez. 15 cleanup ještě jednodušší.
- [ ] **`ACTION.kind: increment`** — relevantní pro TIMER+COUNTER kombinaci.
