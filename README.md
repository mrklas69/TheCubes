# TheCubes

<p align="center">
  <img src="https://github.com/mrklas69/TheCubes/releases/download/v1.0-terrain/the_cubes.gif" alt="Východ slunce nad krajinou TheCubes" width="720" />
</p>

<p align="center"><em>Východ slunce nad krajinou TheCubes</em></p>

Model-first **procedurální terrain sandbox** s OOP modelem jako runtime *(DD-32 pivot sez. 24)*. User nastavuje parametry krajiny (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel; generátor produkuje 3D scénu z hierarchie BLOCKS.

**Historie identitních pivotů:** sez. 1–13 ad-hoc sandbox COMPOSITES → sez. 15 (DD-23) all-voxel → sez. 16–17 pixel-voxel severská dioráma → sez. 21 (DD-30) factory-observer toy → **sez. 24 (DD-32) terrain generator**.

## Status

**v1.0 — terrain generator iterace dokončena** *(2026-05-15, M-Genesis close, git tag `v1.0-terrain`)*.

100×100 terrain playable @ FPS ~104. Denní cyklus + climate driver pro biomy + sníh / jezera / led + sezonní variace (foliage cycle + sky/sun tint) + procedurální dekorace s slope-aware Y. Model **8 tříd**: `OBJECTS → CUBES → BLOCKS / COMPOSITES / LIQUID + WORLD` (singleton).

**Cesta k v1.0:** sez. 24 (DD-32) terrain pivot → sez. 25–47 arc DD-33..DD-54 (ramp smoothing, atlas → lowpoly vertex-color, WORLD + atmospheric, climate driver, fBm/ridge³ heightmap, snow/water/ice, procedural DECOR + SEASON, LIQUID class) → **sez. 48 M-Genesis cleanup (DD-55)**: drop M1–M5 milestone artefaktů bez živého konzumenta v terrain scope (SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE) + atlas IIFE compute waste + UI Sun toggle. Model 13 → 8 tříd, `src/main.js` −1047 ř. → **sez. 49 close ceremonie**.

**Detail:**

| Téma | Soubor |
|------|--------|
| Hierarchie modelu + atributy + smazané vrstvy | `docs/GLOSSARY.md` + `docs/DESIGN_DECISIONS.md` (DD-01..DD-55) |
| Chronologie sezení 1–49 | `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md` |
| Aktivní úkoly + sub-prahy + post-close kandidáti | `docs/TODO.md` |
| Raw nápady + post-close arc brain-dump | `docs/IDEAS.md` (sekce „Post-close arc: FindPath + supply chain") |
| Archiv hotových úkolů | `docs/DONE.md` |

**Historie identitních pivotů** *(zafixované v git historii, ne v aktivním kódu)*: sez. 1–13 ad-hoc sandbox COMPOSITES → sez. 15 (DD-23) all-voxel → sez. 16–17 pixel-voxel severská dioráma → sez. 21 (DD-30) factory-observer toy → sez. 24 (DD-32) terrain generator.

**Post-close direction** *(kandidáti sez. 50+, viz `docs/TODO.md` + `docs/IDEAS.md`)*:
- **FindPath multi-modal** — A* nad heightmap grid, `mode = ground | air | water` (DD-57 kandidát).
- **Generátor / transformátor / konzument** — Anno/Factorio supply chain nad terrain (DD-56 kandidát). Pre-requisite: revert ANIMATE/TIMER/COUNTER/PATH z git historie.
- **Stickman integrace** + **glTF asset pipeline** + **LIQUID BFS clustering** + sub-prahy atmosféry (snow accumulation animace, sky tint kalibrace, ice texture per-cluster).

## Stack

- Frontend: HTML + JS modules + Three.js (import map, bez build stepu)
- Backend: zatím žádný

## Running

Potřebuješ lokální HTTP server (CORS blokuje ES modules z `file://`):

```bash
# Varianta A — Python
python -m http.server 8000

# Varianta B — Node (pokud máš npx)
npx serve .
```

Pak otevři `http://localhost:8000/` v prohlížeči.

## Dokumenty

- `CLAUDE.md` — projektové instrukce pro AI
- `docs/TODO.md` — aktivní úkoly
- `docs/DONE.md` — archiv hotových úkolů
- `docs/IDEAS.md` — raw nápady
- `docs/GLOSSARY.md` — terminologie
- `docs/DESIGN_DECISIONS.md` — schválená rozhodnutí
- `docs/DIARY.md` — log sezení
