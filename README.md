# TheCubes

Model-first **3D factory-observer toy** s OOP modelem jako runtime *(DD-30 pivot sez. 21 — 3D analogie sourozeneckého projektu Voidspan)*. Hráč staví fasility (les, pila, sklad, …), suroviny tečou mezi nimi, model počítá throughput, hráč pozoruje ukazatele. Cíl = **pozorování**, ne win/loss.

**Identita projektu po DD-30:** sandbox/free-building aspekt zůstává (editor MVP plánovaný v Phase C), ale s konkrétní herní smyčkou. Historie: sez. 1–13 model-first sandbox s ad-hoc COMPOSITES, sez. 15 (DD-23) all-voxel pivot, sez. 16–17 pixel-voxel apartmá, **sez. 21 (DD-30) factory pivot**.

## Status

**Aktuálně:** boční větev `feat/factory` v rozvoji — fáze A hotová (sez. 21). Stará scéna (severská dioráma sez. 16–17) zůstává jako pozadí beze změny do Phase D cleanup.

**Factory toy vrstva (DD-31 sez. 21):**

- **FACILITY rodina** — `GENERATOR` (les/lom/studna/důl uhlí), `TRANSFORMER` (pila: logs→planks, drtič: stone→gravel), `STORAGE`. Lokální buffery per fasilita, fixed-KIND transformery (izomorfie s TREE.KIND).
- **6 surovin** — `logs/planks/stone/gravel/water/coal`. Phase 2 vlna doplní `bricks/cement/steel` + multi-input recepty (Soviet Republic inspirace).
- **PATH dvojí kind** — `"conveyor"` (solids) / `"pipeline"` (fluids), s `SOURCE`/`SINK`/`THROUGHPUT` (Phase B).
- **Tick model** — 1 wall s = 1 tick. `productionTick(dt × world.TIME_SCALE)` v render loopu. Material gate pauzuje fasility na deficitu inputu / plném outputu.
- **HUD top bar** — 6 čítačů `world.RESOURCES` (Σ napříč fasilitami).
- **Event Log bottom bar** — ring buffer 100 events, severity-colored verbs `PROD/DRN/PAUS/RSUM`.

**Stará scéna (sez. 16–17, Phase D cleanup queue) — 4-vrstvá taxonomie (DD-25):**

1. **Bloky** (1C grid, geologie) — TCUBES krychle, TRRAMPS klín, TTRAMPS jehlan, TTUNELS klenutý tunel; procedurální `BufferGeometry`, sdílená `:named-textures` paleta. Atribut `ORIENTATION` — float ∈ [0, 360) ve stupních (DD-26). **Zůstává po Phase D** (factory toy je staví jako podlaha/terén).
2. **Voxely** (1V = 1/16 C, dotvarba) — TREE.KIND (10 pixel sub-builderů), GRASS_TUFT, ROCK_PIXEL, LOG (sez. 17), plus VOXEL_MODEL (externí MV blob). **Pixel-voxel apartmá v Phase D cleanup queue**, VOXEL_MODEL zůstává jako kapability pro pixel-art fasility.
3. **Linie** — **PATH** (sez. 17, DD-27): Catmull-Rom spline + plochý strip mesh. Rozšířeno DD-31 o `KIND="conveyor"|"pipeline"` + `SOURCE`/`SINK`/`THROUGHPUT` (Phase B).
4. **Fasility** *(DD-31 sez. 21)* — GENERATOR/TRANSFORMER/STORAGE. Nahrazuje původní „Objekty" plán (postavy/zvířata) — TheCubes je teď factory toy.

**Aktuální obsah scény:**
- ~145 TCUBES kostek z `SCENE_LAYOUT` (grass podlaha + hliněná zadní stěna s peaky + stone bloky)
- 2 TTUNELS klenuté tunely na Z=−3 (vstupy pro vlak)
- 1 TRRAMPS travnatá rampa, 1 TTRAMPS trojboký jehlan
- 1 PATH štěrková cesta z `tunnel_0` ven přes východní hranu (Catmull-Rom esíčko, 5 bodů)
- Procedurální severská dekorace — stromy (spruce/birch/dead/bonsai/bush), keře, trsy trávy, kameny, padlé kmeny; cca 60% grass topu, mulberry32(42) deterministická RNG, random ORIENTATION
- 2 SPRITES bubliny s dynamickým 3D ocáskem

**Hierarchie modelu (po DD-31 sez. 21):**

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z float; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid, Y = grid center, ORIENTATION ∈ [0, 360) — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (TEXTURE × 6)
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)
 │    ├── COMPOSITES (voxel kompozice — Phase D cleanup queue)
 │    │    ├── TREE (KIND — 10 pixel sub-builderů)
 │    │    ├── GRASS_TUFT, ROCK_PIXEL, LOG
 │    │    └── VOXEL_MODEL (ASSET, SCALE) — zůstává po Phase D
 │    ├── PATH (KIND, POINTS — LINES vrstva 3, DD-27; rozšířeno DD-31 o SOURCE/SINK/THROUGHPUT v Phase B)
 │    └── FACILITY (KIND, BUFFER, PAUSED, PAUSE_REASON — DD-31 sez. 21)
 │         ├── GENERATOR  (KIND ∈ forest/quarry/well/coal_mine)
 │         ├── TRANSFORMER (KIND ∈ sawmill/crusher)
 │         └── STORAGE    (HOLDS)
 ├── TIMER (INTERVAL, ACTION)
 ├── COUNTER (VALUE, INCREMENT)
 └── WORLD (WIND_STRENGTH, TIME_SCALE, RESOURCES) — singleton, DD-29 + DD-31
```

Plus mimo OOP model (data registries, DD-31): `RESOURCES_DEF` (6 surovin), `RECIPES_DEF` (sawmill/crusher), `FACILITY_DEF` (7 KINDů).

**Aktivní `ANIMATE.kind`y:** `tree_sway` (Phase D cleanup queue — bez `WIND_STRENGTH` konzumenta po cleanupu), `rotate`, `orbit_stadium`, `pulse`, `drift`.

**Milníky:**
- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch.
- **M8+** průběžně (sez. 6–21): další `ANIMATE.kind`y, SPRITES.SPEAKER tracking (DD-16), TIMER + COUNTER (DD-17), MagicaVoxel pipeline (DD-21), pevné měřítko (DD-22), all-voxel pivot (DD-23), shape × surface separation (DD-24), 4-vrstvá taxonomie + BLOCKS rodina (DD-25), sjednocená ORIENTATION (DD-26), PATH třída (DD-27), sjednocená Y konvence (DD-28), WORLD singleton (DD-29), **factory-observer pivot (DD-30) + Resource model & FACILITY (DD-31)**.

Detail v `CLAUDE.md` (Status), `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-31).

**Plán (sez. 21+, `feat/factory` větev):**
- **Phase A** *(hotovo sez. 21)* — model + tick + HUD + event log + hardcoded test scéna.
- **Phase B** *(sez. 22+)* — PATH transport (`conveyor`/`pipeline`, `THROUGHPUT`), material gate vizualizace.
- **Phase C** *(sez. 24+)* — editor MVP (klik = paleta KIND, place, PATH draw, R-klik delete).
- **Phase D** *(sez. ~25)* — cleanup pixel-voxel apartmá (TREE/GRASS_TUFT/ROCK_PIXEL/LOG/populateNorthernScene/tree_sway), merge `feat/factory` → `main`.

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
