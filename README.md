# TheCubes

Model-first **procedurální terrain sandbox** s OOP modelem jako runtime *(DD-32 pivot sez. 24)*. User nastavuje parametry krajiny (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel; generátor produkuje 3D scénu z hierarchie BLOCKS.

**Historie identitních pivotů:** sez. 1–13 ad-hoc sandbox COMPOSITES → sez. 15 (DD-23) all-voxel → sez. 16–17 pixel-voxel severská dioráma → sez. 21 (DD-30) factory-observer toy → **sez. 24 (DD-32) terrain generator**.

## Status

**Aktuálně:** `main` po **sez. 48 M-Genesis cleanup (DD-55)**. Terrain generator iterace v1.0 hotová — DD-32..DD-54 (kompletní mapa v `docs/DESIGN_DECISIONS.md`) + sez. 48 K1+D1+D2 YAGNI cleanup: drop SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE (M1-M5 milestone artefakty bez živého konzumenta v terrain scope) + atlas IIFE compute waste + UI Sun toggle. **Model 13 → 8 tříd** (OBJECTS / CUBES → BLOCKS/COMPOSITES/LIQUID / WORLD). `src/main.js` −1047 ř. (−29.5 %), celkem −1040 ř. JS+HTML aktivního kódu.

100×100 terrain playable @ FPS ~104, denní cyklus + klima driver pro biomy + sníh/jezera/led + sezonní variace (foliage cycle + sky/sun tint) + procedurální dekorace s slope-aware Y přes UI.

**User verdikt sez. 41:** *„Generátor scény považuji za dokončený."* Sez. 42–47 polish arc (perf HUD, Fáze 6 DECOR, atmospheric extensions, LIQUID class skeleton, SEASON 6-pack). Sez. 48+ **M-Genesis arc** = cleanup + audit cycle + close ceremonie + git tag v1.0.

Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) jsou **zafixované v git historii** (`main`, commity sez. 14–23) jako uzavřené kapitoly — DD-32 je revoke z aktivního vývoje, ne smaz historického záznamu.

**Hierarchie modelu (po sez. 48 M-Genesis cleanup):**

```
OBJECTS (ID, NAME, DESCRIPTION)
 ├── CUBES (X, Y, Z float; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid, Y = grid center, ORIENTATION ∈ [0, 360) — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (lowpoly vertex-color paleta — DD-41)
 │    │    ├── TRRAMPS (ORIENTATION; DD-41 lowpoly)
 │    │    ├── TTRAMPS (ORIENTATION; DD-41 lowpoly)
 │    │    └── TDRAMP (ORIENTATION — DD-35; DD-41 lowpoly + DD-47 _snow varianta)
 │    ├── COMPOSITES
 │    │    ├── LAMP (Victorian-style, SpotLight uvnitř — DD-40)
 │    │    └── DECOR (KIND, SEED, SCALE, SNOWED, SEASON, DEAD — DD-49+DD-51 Fáze 6)
 │    └── LIQUID (LEVEL, TEMPERATURE, BOUNDING_BOX, CELLS — DD-54 4. vrstva DD-25)
 └── WORLD (DAY, DAY_SPEED, LATITUDE, HUMIDITY, SEASON, DECOR_DENSITY_MULT — singleton)
```

**Smazáno DD-32 z aktivního modelu** (zůstává v git historii sez. 21–23): `FACILITY` rodina + 3 potomci, registry `RESOURCES_DEF`/`RECIPES_DEF`/`FACILITY_DEF`, `world.RESOURCES` agregát.

**Smazáno DD-32 z dekorace** (zůstává v git historii sez. 14–17): `SCENE_LAYOUT` ploché pole, severská dioráma (tunely + rampy + cesta), `populateNorthernScene`, COMPOSITES `TREE`/`GRASS_TUFT`/`ROCK_PIXEL`/`LOG` + builders, animátor `tree_sway`, procedurální `:grass-top` textura.

**Smazáno sez. 29 audit cleanup** (zůstává v git historii sez. 14, 20): `VOXEL_MODEL` třída + `buildVoxelModel` + OBJLoader/MTLLoader + `tools/` + `assets/` (MagicaVoxel pipeline bez konzumenta po DD-32). **WORLD vrácen sez. 32 (DD-38)** s `DAY` + `DAY_SPEED` (sun mesh + render tick) — politika *„atribut přibude jen s živým konzumentem"* zachována.

**Smazáno sez. 48 M-Genesis cleanup (DD-55)** (zůstává v git historii sez. 4–9 commits): M1-M5 milestone artefakty bez živého konzumenta v terrain scope:
- `SPRITES` třída + `createSpriteFor` + canvas bubble texture + bubble tail (SPEAKER pattern DD-16)
- `PATH` třída + `createPathFor` (Catmull-Rom strip mesh, DD-27 LINES vrstva 3)
- `TIMER` + `COUNTER` třídy + `registerBehavior` + `tickHandlers` + `ACTIONS` dispatch (DD-17)
- `TIME` singleton (`src/time.js` soubor) + `advanceTime()` + setInterval block
- `ANIMATE` atribut + `ANIMATORS` registry + 4 kindy `rotate`/`orbit_stadium`/`pulse`/`drift` + `registerAnimator` + `updateAnimations` (DD-15)
- HUD `#hud` + `#time` element (vč. CSS)
- UI Sun toggle (`set-sun` checkbox + `setSun` API + `_sunUserVisible` flag) — slunce vždy ON s auto-hide

Plus **D1 atlas IIFE compute waste** (3× ramp `_GEOM_CACHE` UV+remapU drop, DD-41 follow-up) a **D2 atlas komentář drift** (DD-36 → DD-41 sync). Reference: DD-55 + commit `46f686d`.

**Milníky:**

- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch. *(SPRITES + ANIMATE dropnuté sez. 48 M-Genesis cleanup, viz „Smazáno sez. 48".)*
- **M8+** průběžně (sez. 6–48): doplňky před terrain pivotem (sez. 6–23) + **terrain generator pivot (DD-32, sez. 24)** + dlouhý arc DD-33..DD-54 (ramp smoothing, atlas → lowpoly, WORLD re-introduce + atmospheric, climate driver, fBm heightmap, snow/water/ice, atmospheric color extensions, procedural DECOR + SEASON driver, LIQUID class skeleton). Kompletní mapa s odkazy na DD v `docs/DESIGN_DECISIONS.md`.
- **M-Genesis arc (sez. 48+, in progress)** — terrain generator iterace v1.0 close. Sez. 48 **K1+D1+D2 YAGNI cleanup (DD-55)** scope locked. Pokračování: `%AUDIT:DOCS` (sez. 48) → IDEAS/TODO/DONE pruning → `%CALIBRATE` → close ceremonie + git tag **v1.0**.

Detail v `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-55; DD-53 attempt + revert).

**Plán (M-Genesis arc, sez. 48+):**

> **User verdikt sez. 41:** *„Generátor scény považuji za dokončený."* Sez. 42–47 polish arc (perf HUD opt, Fáze 6 DECOR close 9/9, atmospheric extensions, LIQUID class skeleton, SEASON 6-pack). Sez. 48 M-Genesis cleanup start (DD-55).

- **Aktivní M-Genesis arc (sez. 48+):**
  - ✅ **Fáze 1: `%AUDIT:CODE` + cleanup** (sez. 48) — K1+D1+D2 + Sun toggle drop. Commit `46f686d`.
  - 🔄 **Fáze 2: `%AUDIT:DOCS`** (sez. 48) — drift sync + DD-55 entry + diary.
  - **Fáze 3: IDEAS/TODO/DONE pruning** — close cut.
  - **Fáze 4: `%CALIBRATE`** — meta-audit AI/řídících docs (port z PocketStory + projektová definice).
  - **Fáze 5: Close ceremonie** — README v1.0 status + git tag `v1.0-terrain` + IDEAS brain-dump pro post-close arc (FindPath multi-modal + generátor/transformátor/konzument supply chain).
- **Post-close kandidáti (open):**
  - **WORLD/atmosféra rozšíření** — snow accumulation animace přes DAY_SPEED × SEASON, sky tint kalibrace, ice texture per-cluster variation, smooth sun fade pod horizontem.
  - **LIQUID BFS clustering + multi-Y split** *(DD-54 sub-prah)* — split components dle `(water_y, frozen)` key. Trigger: user signal nebo perf need.
  - **Fyzika kapalin extensions** *(DD-54 budoucí hooks)* — TEMPERATURE numeric °C, FLOW_DIRECTION (rivers), VISCOSITY (lava/oil/acid), LEVEL animace.
  - **BARK_DEAD darker palette varianta** + **palm trunk curve** (Fáze 6 sub-prahy ze sez. 43).
- **Speculative (wait-for-signal):**
  - **InstancedMesh refactor pro DECOR** — per (KIND × varianta) `InstancedMesh` batch, ~20k Object3D → ~10-15 draw calls. Sez. 42 user pivot na 20×20 dioráma target use case downgrade z `[!]` na speculative.
  - BatchedMesh refactor (r167+ API, ~13 → ~3 calls) — diminishing returns po DD-37.
  - `ExtrudeGeometry` pro rampy — nahrazuje 3 custom BufferGeometry buildery, diminishing returns po DD-41.
  - Roadmap relief 9..10 (valley carving / ridge noise — DD-46 řeší r ≥ 6 bimodal, r > 8 stále clamp na 8).
  - Procedural paths + tunely v generovaném terénu (TTUNELS class drop sez. 38, vrátit z gitu při potřebě).
  - `.glb`/glTF asset import pipeline (otevírá Stickman integraci a hezčí lampu).
  - Mraky/srážky (particle system base infrastruktura, IDEAS sez. 38).

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
