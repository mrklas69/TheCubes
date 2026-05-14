# TheCubes

Model-first **procedurální terrain sandbox** s OOP modelem jako runtime *(DD-32 pivot sez. 24)*. User nastavuje parametry krajiny (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel; generátor produkuje 3D scénu z hierarchie BLOCKS.

**Historie identitních pivotů:** sez. 1–13 ad-hoc sandbox COMPOSITES → sez. 15 (DD-23) all-voxel → sez. 16–17 pixel-voxel severská dioráma → sez. 21 (DD-30) factory-observer toy → **sez. 24 (DD-32) terrain generator**.

## Status

**Aktuálně:** `main` po sez. 41 (DD-51 seasonal foliage cycle + DD-52 slope-aware decor Y). DD-32 Fáze 0–3 + **InstancedMesh refactor (DD-37, sez. 31)** + **WORLD DAY/DAY_SPEED (DD-38, sez. 32)** + **atmospheric lerp DD-39 + LAMP/SpotLight DD-40 (sez. 33)** + **lowpoly vertex-color pipeline DD-41 (sez. 34, nahrazuje DD-36 atlas)** + **G2 Climate WORLD.LATITUDE × HUMIDITY DD-42 + DAY mapping DD-43 (sez. 35)** + **G3 SURFACES driver-derived per biome DD-44 + fBm/ridge³ heightmap DD-45 (sez. 36)** + **smoothstep bimodální heightmap pro r ≥ 6 DD-46 (sez. 37)** + **G6 climate-driven surface state (drop water surface, snow per LATITUDE, water LIQUID prototype flood-fill, ice) DD-47 + atmospheric color extensions (sun piecewise + sky 3-keypoint dusk + water wave) DD-48 (sez. 38)** + **DD-49 plná impl: procedurální DECOR (5 KIND spruce/oak/bush/rock/grass_tuft + biome-aware density + snow caps + wet 80%→20% škála) + DD-50 SEASON driver (4-enum, temperate snow/ice modifier per season) + 6 kalibrací (sez. 40)** + **DD-51 seasonal foliage cycle (LEAF_AUTUMN paleta oak/bush v autumn + winter defoliation: oak.snowed = kmen-only, bush.snowed = skip entity, spruce season-invariant) + DD-52 slope-aware decor Y (ramps[].slopeDir + lineární `slopeT` interp v `decorate()`) + 2 kalibrace (decor scale 0.5→1/3, oak/spruce density ×2; sez. 41)** hotové. 100×100 terrain playable @ FPS ~104, denní cyklus + klima driver pro biomy + sníh/jezera/led + sezonní variace (vč. listnatého foliage cycle) + procedurální dekorace s slope-aware Y přes UI. **User verdikt sez. 41:** „Generátor scény považuji za dokončený."

Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) jsou **zafixované v git historii** (`main`, commity sez. 14–23) jako uzavřené kapitoly — DD-32 je revoke z aktivního vývoje, ne smaz historického záznamu.

**Hierarchie modelu (po sez. 38, post-DD-47 TTUNELS drop):**

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z float; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid, Y = grid center, ORIENTATION ∈ [0, 360) — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (lowpoly vertex-color paleta — DD-41)
 │    │    ├── TRRAMPS (ORIENTATION; DD-41 lowpoly)
 │    │    ├── TTRAMPS (ORIENTATION; DD-41 lowpoly)
 │    │    └── TDRAMP (ORIENTATION — DD-35; DD-41 lowpoly + DD-47 _snow varianta)
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)
 │    ├── COMPOSITES
 │    │    └── LAMP (Victorian-style, SpotLight uvnitř — DD-40)
 │    └── PATH (KIND, POINTS — LINES vrstva 3, DD-27)
 ├── TIMER (INTERVAL, ACTION)
 ├── COUNTER (VALUE, INCREMENT)
 └── WORLD (DAY, DAY_SPEED, LATITUDE, HUMIDITY — singleton DO, DD-38 + DD-42)
```

**Smazáno DD-32 z aktivního modelu** (zůstává v git historii sez. 21–23): `FACILITY` rodina + 3 potomci, registry `RESOURCES_DEF`/`RECIPES_DEF`/`FACILITY_DEF`, PATH atributy `SOURCE`/`SINK`/`RESOURCE`/`THROUGHPUT`, `world.RESOURCES` agregát.

**Smazáno DD-32 z dekorace** (zůstává v git historii sez. 14–17): `SCENE_LAYOUT` ploché pole, severská dioráma (tunely + rampy + cesta), `populateNorthernScene`, COMPOSITES `TREE`/`GRASS_TUFT`/`ROCK_PIXEL`/`LOG` + builders, animátor `tree_sway`, procedurální `:grass-top` textura.

**Smazáno sez. 29 audit cleanup** (zůstává v git historii sez. 14, 20): `VOXEL_MODEL` třída + `buildVoxelModel` + OBJLoader/MTLLoader + `tools/` + `assets/` (MagicaVoxel pipeline bez konzumenta po DD-32); `WORLD` singleton + `WIND_STRENGTH` + `TIME_SCALE` (dead state po smaz `tree_sway` a `productionTick`). **WORLD vrácen sez. 32 (DD-38)** s 2 novými atributy (`DAY` + `DAY_SPEED`) a 2 živými konzumenty (sun mesh + render tick) — politika *„atribut přibude jen s živým konzumentem"* zachována.

**Aktivní `ANIMATE.kind`y:** `rotate`, `orbit_stadium`, `pulse`, `drift` (bez aktivních klientů ve scéně, ale připravené).

**Milníky:**
- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch.
- **M8+** průběžně (sez. 6–45): další `ANIMATE.kind`y, SPRITES.SPEAKER (DD-16), TIMER + COUNTER (DD-17), pevné měřítko (DD-22), all-voxel pivot (DD-23), 4-vrstvá taxonomie + BLOCKS rodina (DD-25), sjednocená ORIENTATION (DD-26), PATH (DD-27), sjednocená Y konvence (DD-28), **terrain generator pivot (DD-32)**, ramp smoothing layer (DD-33 + DD-34), TDRAMP (DD-35), TCUBES atlas pipeline (DD-36, nahrazen DD-41), **InstancedMesh batch pipeline (DD-37)** + sun mesh + post-process (fog + DOF/BokehPass) + settings panel, **WORLD re-introduce (DD-38)** s DAY/DAY_SPEED + sun denní cyklus, **atmospheric lerping (DD-39, rozšířen DD-48)**, **LAMP/SpotLight (DD-40)**, **lowpoly vertex-color pipeline (DD-41)**, **G2 Climate WORLD.LATITUDE × HUMIDITY (DD-42)** + DAY mapping fix (DD-43), **G3 SURFACES driver-derived (DD-44)** + fBm/ridge³ heightmap (DD-45), **smoothstep bimodální heightmap pro r ≥ 6 (DD-46)**, **G6 climate-driven surface state (snow + LIQUID prototype flood-fill, ice) (DD-47)** + **atmospheric color extensions (sun piecewise + sky 3-keypoint + water wave) (DD-48)**, **DD-49 procedurální DECOR (5 KIND + biome density + snow caps) + DD-50 SEASON driver (4-enum, temperate snow/ice modifier)**, **DD-51 seasonal foliage cycle (LEAF_AUTUMN oak/bush v autumn, winter defoliation) + DD-52 slope-aware DECOR Y**, **Fáze 6 DECOR KIND extension** (palm/cactus/flower/stump/log + `_dead` postfix + AUTUMN_PALETTE 4-color hue + seasonal density modifier + receive shadow opt-out), **DD-54 LIQUID class jako 5. vrstva DD-25 extension: Tekutiny** (sibling BLOCKS/COMPOSITES/PATH pod CUBES, atributy LEVEL/TEMPERATURE/BOUNDING_BOX/CELLS, skeleton prototype single-cell) + HSL hue shift sky/sun (DD-48 follow-up).

Detail v `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-54; DD-53 attempt + revert).

**Plán (po sez. 45):**

> **User verdikt sez. 41:** *„Generátor scény považuji za dokončený."* Sez. 42–45 = post-close polish (perf HUD opt, Fáze 6 DECOR close 9/9, atmospheric extensions, LIQUID class skeleton).

- **Aktivní směry (kandidáti pro sez. 46+):**
  - **WORLD/atmosféra rozšíření** — sky/sun season tint (DD-50 follow-up plný scope), snow accumulation animace přes DAY_SPEED × SEASON, polar season variace (summer ablation), snow patches calibration, ice canvas texture, per-cluster water wave fáze (závisí na BFS clustering).
  - **LIQUID BFS clustering + multi-Y split** *(DD-54 sub-prah)* — split components dle `(water_y, frozen)` key (drží z-fight invariant z DD-53 revert lesson). Pro polar mid 100×100 sráží ~500 water cells na ~5-20 jezer. Trigger: user signal „100×100 jezera blikají" nebo perf need.
  - **Fyzika kapalin extensions** *(DD-54 budoucí hooks)* — TEMPERATURE numeric °C (permafrost/lava), FLOW_DIRECTION (rivers/streams paralel PATH POINTS), VISCOSITY (voda/láva/ropa/kyselina), LEVEL animace (tide/flood/sezonní tání). Wait pro user signal.
  - Slider DAY sync z value při auto-advance (drobnost UX, DD-38 známé omezení).
  - BARK_DEAD darker palette varianta + palm trunk curve (Fáze 6 sub-prahy ze sez. 43).
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
