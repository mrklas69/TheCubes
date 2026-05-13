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
| `index.html` | HTML shell, import map pro Three.js, HUD (infotip + terrain control panel) |
| `src/model.js` | OOP třídy (OBJECTS → CUBES → BLOCKS/COMPOSITES/SPRITES/PATH, TIMER/COUNTER/WORLD) |
| `src/main.js` | Three.js scéna + builders dispatch (`createMeshFor`, BLOCKS geometry cache, `createPathFor`) + animators + hover + render loop + `buildScene` (volá `generateTerrain` + spawn) |
| `src/terrain.js` | `generateTerrain({ size, relief, surfaces, seed })` — value-noise heightmap, biome map, sloupcové vyplnění, vodní plane(y) |
| `src/time.js` | Globální `TIME` singleton, `advanceTime()` |
| `tools/export-*.mjs` | MagicaVoxel reverse pipeline (DD-21+22+24) |

## Project context — kde najít co

- **Identita, status, hierarchie modelu, scéna, milníky, plán fází** → `README.md`
- **Chronologie sezení (changelog)** → `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md`
- **Schválená rozhodnutí (DD-01..DD-32)** → `docs/DESIGN_DECISIONS.md`
- **Terminologie** → `docs/GLOSSARY.md`
- **Aktivní úkoly / hotové / nápady** → `docs/TODO.md` / `docs/DONE.md` / `docs/IDEAS.md`
