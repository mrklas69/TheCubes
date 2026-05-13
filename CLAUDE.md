# CLAUDE.md — TheCubes

Projektový overlay nad `~/.claude/CLAUDE.md`. Globální pravidla (jazyk, feedback Kudos!/Censure!, design principy KISS/DRY/SLAP/izomorfismus/conceptual integrity, workflow, makra `%THINK`/`%AUDIT:CODE`/`%AUDIT:DOCS`/`%DOCS`, audit cadence, stale Příště check) platí beze změny. Tady jen projekt-specifické rozšíření.

## Code Style — rozšíření
Komentáře česky o trochu **podrobnější** než globální default — user se JS i Three.js učí. Vysvětluj JS/Three-specifické konstrukce (modulový `import`, třída, `requestAnimationFrame`, perspektivní kamera, materiály, BufferGeometry, ShaderMaterial). Triviality stále nevysvětluj.

## %THINK — rozšíření pro TheCubes
Doplň globální body o:

5. **Procedural / sandbox mechanika**: dá se vyjádřit stávajícím OOP modelem (BLOCKS rodina, COMPOSITES, PATH) nebo parametricky řízeným generátorem (`generateTerrain`)? Pokud ne, navrhni minimální rozšíření modelu — ne scripted scénář. Preferuj **emergentní chování z jednoduchých pravidel** (noise + thresholds + seed) před hardcoded výsledkem.

## Makra
Projektová `%BEGIN`, `%END` — definice v `docs/PROMPTS.md`. `%BEGIN` vždy končí spuštěním serveru na `localhost:8000`.

## Key Files — mapa pro AI

| Soubor | Obsah |
|--------|-------|
| `index.html` | HTML shell, import map pro Three.js, HUD (infotip + terrain control panel `#terrainctrl` + perf HUD `#perfhud` + settings panel `#settings`) |
| `src/model.js` | OOP třídy (OBJECTS → CUBES → BLOCKS/COMPOSITES/SPRITES/PATH, TIMER, COUNTER, **WORLD** singleton — DD-38 DAY/DAY_SPEED + DD-42 LATITUDE/HUMIDITY; LAMP COMPOSITES potomek DD-40) |
| `src/main.js` | Three.js scéna + builders dispatch (`createMeshFor`, `getTcubesKindGeom`, `getRampGeom`, `createPathFor`) + **lowpoly vertex-color pipeline (DD-41 nahrazuje DD-36 atlas; DD-47 snow paleta `_snow` postfix 4→8)** + **InstancedMesh batches pro terrain (DD-37)** + post-process composer (adaptive fog + DOF/BokehPass; DD-48 fog distances z size) + sun mesh + **WORLD instance + `updateSun()` (LATITUDE-driven tilt DD-42 + sun color piecewise DD-48)/`updateAtmosphere()` (sky 3-keypoint DD-39+DD-48)/`updateWorldTime(dt)`** + **water/ice meshes (`_waterMat`/`_iceMat`/`_waterMeshes` Set; DD-47 LIQUID prototype + DD-48 wave anim)** + animators + hover + render loop + `buildScene`/`regenerateScene` (volá `generateTerrain` + `surfacesForBiome` G3 DD-44 + `snowSpecForLatitude`/`waterSpecForClimate` DD-47 + spawn) + `window.settings` toggle API |
| `src/terrain.js` | `generateTerrain({ size, relief, surfaces, seed, snowSpec, waterSpec })` — fBm/ridge³ heightmap (DD-45) + smoothstep bimodální pro r ≥ 6 (DD-46), biome map, sloupcové vyplnění, **snow sort+rank distribuce + water priority flood (Wang & Liu 2006) přes interní `MinHeap` class (DD-47)**, ramp smoothing layer (DD-33/34/35); exports `BIOME_NAMES` + `BIOME_SURFACES` + `surfacesForBiome` (DD-42/44), `snowSpecForLatitude` + `waterSpecForClimate` (DD-47), `maxReliefForSize` (G1) |
| `src/time.js` | Globální `TIME` singleton, `advanceTime()` |

## Project context — kde najít co

- **Identita, status, hierarchie modelu, scéna, milníky, plán fází** → `README.md`
- **Chronologie sezení (changelog)** → `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md`
- **Schválená rozhodnutí (DD-01..DD-48)** → `docs/DESIGN_DECISIONS.md`
- **Terminologie** → `docs/GLOSSARY.md`
- **Aktivní úkoly / hotové / nápady** → `docs/TODO.md` / `docs/DONE.md` / `docs/IDEAS.md`
