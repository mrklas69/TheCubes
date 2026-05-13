# CLAUDE.md — TheCubes

Projektový overlay nad `~/.claude/CLAUDE.md`. Globální pravidla (jazyk, feedback Kudos!/Censure!, design principy KISS/DRY/SLAP/izomorfismus/conceptual integrity, workflow, makra `%THINK`/`%AUDIT:CODE`/`%AUDIT:DOCS`/`%DOCS`/`%CALIBRATE`, audit cadence, stale Příště check) platí beze změny. Tady jen projekt-specifické rozšíření.

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
| `src/model.js` | OOP třídy (OBJECTS → CUBES → BLOCKS/COMPOSITES/SPRITES/PATH, TIMER, COUNTER, **WORLD** singleton DD-38) |
| `src/main.js` | Three.js scéna + builders dispatch (`createMeshFor`, BLOCKS geometry cache, `createPathFor`) + TCUBES atlas pipeline (DD-36, fast/slow path) + **InstancedMesh batches pro terrain (DD-37)** + post-process composer (fog + DOF/BokehPass) + sun mesh + **WORLD instance + `updateSun()`/`updateWorldTime(dt)` (DD-38)** + animators + hover + render loop + `buildScene`/`regenerateScene` (volá `generateTerrain` + spawn) + `window.settings` toggle API (DOF/Fog/Sun/Day/DaySpeed) |
| `src/terrain.js` | `generateTerrain({ size, relief, surfaces, seed })` — value-noise heightmap, biome map, sloupcové vyplnění, vodní plane(y), ramp smoothing layer (DD-33/34/35) |
| `src/time.js` | Globální `TIME` singleton, `advanceTime()` |

## Project context — kde najít co

- **Identita, status, hierarchie modelu, scéna, milníky, plán fází** → `README.md`
- **Chronologie sezení (changelog)** → `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md`
- **Schválená rozhodnutí (DD-01..DD-38)** → `docs/DESIGN_DECISIONS.md`
- **Terminologie** → `docs/GLOSSARY.md`
- **Aktivní úkoly / hotové / nápady** → `docs/TODO.md` / `docs/DONE.md` / `docs/IDEAS.md`
