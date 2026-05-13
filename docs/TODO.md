# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [ ] **CCUBES typizace** (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.

## Terrain generator (`generateTerrain`) — `feat/terrain` větev

**Cíl**: procedurální terrain sandbox jako náhrada hardcoded `SCENE_LAYOUT` (DD-32 sez. 25). `generateTerrain` v `src/terrain.js` produkuje 3D scénu z parametrického popisu (size + relief + surfaces + seed); UI panel v `index.html` umožní user-driven tuning live.

### Hotovo (sez. 25 + sez. 26)

- [x] **DD-32 kotva** + README/CLAUDE.md identitní update.
- [x] **Wipe** factory toy + severská dioráma + tree_sway + HUD prvků (−1602 ř.).
- [x] **Value-noise engine** (mulberry32 + grid sampling + bilineární smoothstep + wrap-around).
- [x] **`generateTerrain({ size, relief, surfaces, seed })`** v `src/terrain.js` (heightmap + biome map + sloupcové vyplnění + water planes).
- [x] **Fáze 3 — UI panel `#terrainctrl`** (sez. 26): HTML/CSS pravý dolní roh, slidery size sx/sz (3..30), relief (0..10) s názvem stupně, 4 surface slidery (auto-normalize), seed input. Trigger `change` event (rozhodnutí sez. 26 — ne `input`/debounce/button).
- [x] **`regenerateScene(params)`** v `main.js` — filter `userData.terrain` flag, remove + spawn, sdílené geometrie/materials nedispose.
- [x] **Ramp smoothing layer (DD-34 + DD-35 sez. 26)** — 3 ramp typy:
  - TRRAMPS edge greedy criticality (1 direct vyšší → klín).
  - TTRAMPS isolated diag peak (0 direct + 1 diag vyšší → jehlan).
  - TDRAMP 2-stage (3-cell convex peak + L-shape, dvouosa criterion 2 přístupů + zakrytí 2 stěn) — **DD-35** + nová třída `TDRAMP extends BLOCKS`.
- [x] **Compatibility filter** — TRRAMPS A drop pokud B má TRRAMPS s jinou orient (= narazí do boku).

### Otevřené body / kandidáti DD

- [!] **Performance při 30×30** — pomalé vykreslování po regeneraci. Sez. 26 user feedback. Možné cesty: instancing per TCUBES kind, mesh merge per cell, BatchedMesh (Three.js r172+), web worker pro generateTerrain. *(sez. 27 priorita)*
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
- [ ] **`mtllib` reference fix** *(drobnost)*.

## Governance (po sez. 27)

- [!] **PROMPTS.md `%END` aktualizovat o topic-branch workflow** — současný text *„Commit na větev `main`"* je zastaralý od sez. 21 (DD-30 zavedl `feat/factory`, dále `feat/terrain`). Doplnit explicitní krok: rozhodnutí merge teď vs. pokračovat na topic branch + návrh `git merge --no-ff`. Censure ze sez. 27.

## Audit cadence (po sez. 27)

- **`%AUDIT:CODE`** — 9/8 sezení od sez. 18 (**práh překročen o 1**, sez. 28 priorita po performance refactoru).
- **`%AUDIT:DOCS`** — 11/10 sezení od sez. 16 (**práh překročen o 1**, sez. 28).
- **IDEAS/TODO pruning** — 8/12.
- **`%CALIBRATE`** — sub-prah „CLAUDE.md +50 %" resetnut sez. 23 slimem.
