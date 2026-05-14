# CLAUDE.md — TheCubes

Projektový overlay nad `~/.claude/CLAUDE.md`. Globální pravidla (jazyk, feedback Kudos!/Censure!, design principy KISS/DRY/SLAP/izomorfismus/conceptual integrity, workflow, makra `%THINK`/`%AUDIT:CODE`/`%AUDIT:DOCS`/`%DOCS`, audit cadence, stale Příště check) platí beze změny. Tady jen projekt-specifické rozšíření.

## Code Style — rozšíření
Komentáře česky o trochu **podrobnější** než globální default — user se JS i Three.js učí. Vysvětluj JS/Three-specifické konstrukce (modulový `import`, třída, `requestAnimationFrame`, perspektivní kamera, materiály, BufferGeometry, ShaderMaterial). Triviality stále nevysvětluj.

## Edit/sed safety (sez. 48 lesson)

Před každým **velkým sed range delete** (`sed -i 'N,Md' src/*.js`):
1. **Pre-sed grep all symbols v range proti rest-of-file** — odhalí symboly definované uvnitř range a used mimo (memory `[[feedback_sed_caution]]` má pattern script). 2× incident (sez. 15 `buildVoxelModel` + sez. 48 `TAU` regrese).
2. **Po sed: node --check + browser F12 console scan**, ne jen HTTP 200. ReferenceError je viditelný jen v F12 console (memory `[[feedback_browser_smoke_test_after_cleanup]]`).
3. Pro velký refactor preferuj **multiple unique `Edit` operations** přes `sed Nd` — má unique anchor, žádné byte offsety, transparent diff.

## %THINK — rozšíření pro TheCubes
Doplň globální body o:

5. **Procedural / sandbox mechanika**: dá se vyjádřit stávajícím OOP modelem (BLOCKS rodina, COMPOSITES, LIQUID) nebo parametricky řízeným generátorem (`generateTerrain`)? Pokud ne, navrhni minimální rozšíření modelu — ne scripted scénář. Preferuj **emergentní chování z jednoduchých pravidel** (noise + thresholds + seed) před hardcoded výsledkem.

## Makra
Projektová `%BEGIN`, `%END` — definice v `docs/PROMPTS.md`. `%BEGIN` vždy končí spuštěním serveru na `localhost:8000`. Projektový **`%CALIBRATE`** = meta-audit AI/řídících docs (sez. 48 port z PocketStory, definice v `docs/PROMPTS.md`).

## Key Files — mapa pro AI

| Soubor | Obsah |
|--------|-------|
| `index.html` | HTML shell, import map pro Three.js, infotip + terrain control panel `#terrainctrl` + perf HUD `#perfhud` + settings panel `#settings` (sez. 48 cleanup: `#hud` + `set-sun` dropnuté) |
| `src/model.js` | OOP třídy (po sez. 48 cleanup: OBJECTS → CUBES → BLOCKS/COMPOSITES/LIQUID + WORLD singleton). Hierarchie: BLOCKS (CCUBES/TCUBES/TRRAMPS/TTRAMPS/TDRAMP), COMPOSITES (LAMP DD-40, DECOR DD-49+DD-51 Fáze 6 s KIND/SEED/SCALE/SNOWED/SEASON/DEAD), LIQUID (DD-54 LEVEL/TEMPERATURE/BOUNDING_BOX/CELLS, 4. vrstva DD-25 extension po PATH dropu), WORLD (DD-38 DAY/DAY_SPEED + DD-42 LATITUDE/HUMIDITY + DD-50 SEASON + DECOR_DENSITY_MULT) |
| `src/main.js` | Three.js scéna + builders dispatch (`createMeshFor`, `getTcubesKindGeom`, `getRampGeom`) + **lowpoly vertex-color pipeline (DD-41 nahrazuje DD-36 atlas; DD-47 snow paleta `_snow` postfix 4→8; sez. 48 D1 atlas IIFE compute drop)** + **InstancedMesh batches pro terrain (DD-37)** + post-process composer (adaptive fog + DOF/BokehPass; DD-48 fog distances z size) + sun mesh (sez. 47 horizon −15° auto-hide, sez. 48 drop user toggle) + **WORLD instance + `updateSun()` (LATITUDE-driven tilt DD-42 + sun color piecewise DD-48 + season HSL tint sez. 47)/`updateAtmosphere()` (sky 3-keypoint DD-39+DD-48 + season HSL tint)/`updateWorldTime(dt)`** + **water/ice meshes (`_waterMat`/`_iceMat`/`_waterMeshes` Set; DD-54 LIQUID class + DD-48 wave anim; ice canvas texture sez. 47)** + hover + render loop + `buildScene`/`regenerateScene` + `window.settings` toggle API (setDOF/setFog/setDay/setDaySpeed/setLatitude/setHumidity/setSeason). |
| `src/terrain.js` | `generateTerrain({ size, relief, surfaces, seed, snowSpec, waterSpec, decorSpec })` — fBm/ridge³ heightmap (DD-45) + smoothstep bimodální pro r ≥ 6 (DD-46), biome map, sloupcové vyplnění, **snow sort+rank distribuce + water priority flood (Wang & Liu 2006) přes interní `MinHeap` class (DD-47); sez. 47 polar season variace mode "patches"**, ramp smoothing layer (DD-33/34/35 + DD-52 slopeDir), `decorate()` Krok 7 (DD-49); exports `BIOME_NAMES` + `BIOME_SURFACES` + `surfacesForBiome` (DD-42/44), `snowSpecForLatitude`/`waterSpecForClimate`/`decorSpecForClimate` (DD-47+DD-50), `maxReliefForSize` (G1) |
| `src/composites/toolkit.js` | Sdílený toolkit pro DECOR buildery (DD-49) — `lowpolyMat(color)` per-color singleton + `getGeomCache(kind, partKey, factory)` + 7 paleta konstant + `mulberry32` re-export |
| `src/composites/builders.js` | `DECOR_BUILDERS` lookup tabulka KIND → builder funkce (spruce/oak/bush/rock/grass_tuft + Fáze 6: palm/cactus/flower/stump/log) — mutuje prázdný THREE.Group procedural primitivy podle seed/scale/snowed/season/dead |

## Project context — kde najít co

- **Identita, status, hierarchie modelu, scéna, milníky, plán fází** → `README.md`
- **Chronologie sezení (changelog)** → `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md`
- **Schválená rozhodnutí (DD-01..DD-55)** → `docs/DESIGN_DECISIONS.md`
- **Terminologie** → `docs/GLOSSARY.md`
- **Aktivní úkoly / hotové / nápady** → `docs/TODO.md` / `docs/DONE.md` / `docs/IDEAS.md`
