# TheCubes

Model-first **procedurální terrain sandbox** s OOP modelem jako runtime *(DD-32 pivot sez. 24)*. User nastavuje parametry krajiny (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel; generátor produkuje 3D scénu z hierarchie BLOCKS.

**Historie identitních pivotů:** sez. 1–13 ad-hoc sandbox COMPOSITES → sez. 15 (DD-23) all-voxel → sez. 16–17 pixel-voxel severská dioráma → sez. 21 (DD-30) factory-observer toy → **sez. 24 (DD-32) terrain generator**.

## Status

**Aktuálně:** `main` po merge `feat/terrain` (sez. 27) + `feat/terrain-perf` (sez. 28). DD-32 Fáze 0–3 + atlas refactor (DD-36) + **InstancedMesh refactor (DD-37, sez. 31)** hotové. Sez. 29 audit cleanup (`feat/audit-29-cleanup`) — smazána dormant infrastruktura bez konzumenta (VOXEL_MODEL + WORLD), GLOSSARY catch-up. 100×100 terrain playable @ FPS 104.

Předchozí identitní vrstvy (factory toy DD-30/DD-31, severská dioráma DD-25/DD-27) jsou **zafixované v git historii** (`main`, commity sez. 14–23) jako uzavřené kapitoly — DD-32 je revoke z aktivního vývoje, ne smaz historického záznamu.

**Hierarchie modelu (po sez. 29):**

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z float; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid, Y = grid center, ORIENTATION ∈ [0, 360) — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (TEXTURE × 6; terrain kindy přes atlas — DD-36)
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)
 │    │    ├── TDRAMP (TEXTURE × 5, ORIENTATION — DD-35)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)
 │    ├── COMPOSITES (abstract bez konkrétních potomků po sez. 29)
 │    └── PATH (KIND, POINTS — LINES vrstva 3, DD-27)
 ├── TIMER (INTERVAL, ACTION)
 └── COUNTER (VALUE, INCREMENT)
```

**Smazáno DD-32 z aktivního modelu** (zůstává v git historii sez. 21–23): `FACILITY` rodina + 3 potomci, registry `RESOURCES_DEF`/`RECIPES_DEF`/`FACILITY_DEF`, PATH atributy `SOURCE`/`SINK`/`RESOURCE`/`THROUGHPUT`, `world.RESOURCES` agregát.

**Smazáno DD-32 z dekorace** (zůstává v git historii sez. 14–17): `SCENE_LAYOUT` ploché pole, severská dioráma (tunely + rampy + cesta), `populateNorthernScene`, COMPOSITES `TREE`/`GRASS_TUFT`/`ROCK_PIXEL`/`LOG` + builders, animátor `tree_sway`, procedurální `:grass-top` textura.

**Smazáno sez. 29 audit cleanup** (zůstává v git historii sez. 14, 20): `VOXEL_MODEL` třída + `buildVoxelModel` + OBJLoader/MTLLoader + `tools/` + `assets/` (MagicaVoxel pipeline bez konzumenta po DD-32); `WORLD` singleton + `WIND_STRENGTH` + `TIME_SCALE` (dead state po smaz `tree_sway` a `productionTick`).

**Aktivní `ANIMATE.kind`y:** `rotate`, `orbit_stadium`, `pulse`, `drift` (bez aktivních klientů ve scéně, ale připravené).

**Milníky:**
- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch.
- **M8+** průběžně (sez. 6–31): další `ANIMATE.kind`y, SPRITES.SPEAKER (DD-16), TIMER + COUNTER (DD-17), pevné měřítko (DD-22), all-voxel pivot (DD-23), 4-vrstvá taxonomie + BLOCKS rodina (DD-25), sjednocená ORIENTATION (DD-26), PATH (DD-27), sjednocená Y konvence (DD-28), **terrain generator pivot (DD-32)**, ramp smoothing layer (DD-33 + DD-34), TDRAMP (DD-35), **TCUBES atlas pipeline (DD-36)**, **InstancedMesh batch pipeline (DD-37)** + sun mesh + post-process (fog + DOF/BokehPass) + settings panel.

Detail v `CLAUDE.md` (Status), `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-37).

**Plán (po sez. 31):**
- **Hotovo (DD-32 Fáze 0–3 + atlas + instanced + post-process):** generateTerrain MVP, value-noise heightmap, biome map, ramp smoothing layer, UI panel `#terrainctrl`, `regenerateScene`, TCUBES atlas (DD-36), rampy atlas (sez. 30), InstancedMesh batches (DD-37) — FPS @ 100×100 z 7 na 104, sun mesh + atmospheric fog + DOF, settings panel.
- **Otevřené (sez. 32+):**
  - Audit follow-up F5/F6/F10 (doporučené) + F11/F14 (kosmetické).
  - DAY/SUN_ANGLE animace sun mesh (DD-29 politika, gating konzumentem).
  - LIQUID třída pro vodní plane(y) (DD-33 kandidát).
  - Klastrování spojitých water cells (flood-fill, jeden plane na celé jezero).
  - Roadmap relief 9..10 (valley carving / ridge noise).
  - Procedural paths + tunely v generovaném terénu.
  - BatchedMesh refactor (r167+, 13 → ~3 calls) — diminishing returns, low prio.

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
