# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

## M1 — Statický svět s hodinami

- [x] Založit strukturu projektu (README, CLAUDE.md, docs/, src/)
- [x] `index.html` shell s import mapou pro Three.js
- [x] `src/model.js` — třídy `OBJECTS` a `CUBES`
- [x] `src/time.js` — globální `TIME` + `advanceTime()`
- [x] `src/main.js` — Three.js scéna, kamera, render loop, jedna kostka v (0,0,0)
- [x] HUD: `TIME: <tick>` v rohu
- [x] Ovládání kamery (OrbitControls)
- [x] Šachovnicová textura pro mateřskou CUBES (DD-07)
- [x] Infotip panel na hover (DD-08)
- [x] Ověřit v prohlížeči — kostka se zobrazí, kamera funguje, TIME tiká, infotip funguje
- [x] Osvětlení — DD-10 nahrazuje DD-09 (zleva shora)
- [x] `git init` + první commit (sez. 2, `ce50345` na `main`)

## M2 — Orientace + první potomek

- [x] **A)** `GridHelper` + `AxesHelper` ve scéně (orientační pomůcky).
- [x] **B)** První potomek `CUBES` — `TERRAIN` s atributem `COLOR` (JS number 0xRRGGBB). Override default šachovnice plochou barvou.
- [x] **B)** 3×3 grid: centrální `CUBES` (šachovnice), okolo 8 `TERRAIN` s duhovou paletou clockwise.
- [x] Ověřit, že infotip funguje generic i pro `TERRAIN` (ukáže `COLOR` formátované jako `#rrggbb`).
- [x] Zapsat DD-11 (vizualizační dispatch v engine, ne na třídě).

## M3 — COMPOSITES + strom, jednotný souřadný systém

- [x] DD-12: uvolnit DD-03, CUBES má float X/Y/Z, voxel renderer snap-to-grid.
- [x] DD-13: terminologie potomků CUBES (CCUBES, TCUBES, SPRITES, COMPOSITES).
- [x] Refactor `TERRAIN` → `CCUBES` (src + docs; DD-11/DIARY sez. 2 immutable, historická poznámka v GLOSSARY).
- [x] `COMPOSITES extends CUBES` v `src/model.js` — značkovací třída bez atributů.
- [x] `TREE extends COMPOSITES` — konkrétní instance.
- [x] `createMeshFor` rozšířit o COMPOSITES dispatch → `THREE.Group`.
- [x] `buildTree` — kmen + 3 kužely z Three.js primitivů.
- [x] Umístit `tree_0001` na (3, 0, 0) ve scéně.
- [x] Ověřit v prohlížeči: strom se vykreslí, infotip ukazuje třídu `TREE` + atributy, duha a středová kostka stále fungují.

## M4 — BALLOON mimo grid

- [x] `BALLOON extends COMPOSITES` s atributem `COLOR` (vak).
- [x] `buildBalloon` v enginu: vak (SphereGeometry) + koš (BoxGeometry) + 4 lana (CylinderGeometry). Helper `cylinderBetween(a, b, radius, mat)`.
- [x] Dispatch pro `BALLOON` v `createCompositeFor`.
- [x] Instance `balloon_0001` na **float** pozici — přesunuto na `(1, 3, 2)` pro dobrou projekci stínu (mimo grid, demonstrace DD-12).
- [x] Ověřit v prohlížeči: balón visí nad scénou, pozice nesnapovaná na int, infotip ukáže `BALLOON` + `COLOR` jako `#ff6b35`.
- [x] **Stíny** (bonus M4): `renderer.shadowMap` (PCFSoftShadowMap), `sun.castShadow` + ortho frustum + bias, ShadowMaterial ground plane, shadow flagy v `createMeshFor`. Sníženo `AmbientLight` 0.4 → 0.15 kvůli self-shadow kontrastu.

## M5+ — Později

- [ ] **SPRITES** — 2D billboard ke kameře. Dialog bubble / label.
- [ ] **TCUBES** — per-face textury (TOP/BOTTOM/NORTH/SOUTH/EAST/WEST).
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] Nevizuální potomek OBJECTS (např. `TIMER`, `COUNTER`) — až bude přirozená potřeba.
- [ ] Mechanismus, jak objekty reagují na TIME (až to bude potřeba).
