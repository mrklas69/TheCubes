# CLAUDE.md — TheCubes

Projektový overlay nad `~/.claude/CLAUDE.md`. Globální pravidla (jazyk, feedback Kudos!/Censure!, design principy KISS/DRY/SLAP/izomorfismus/conceptual integrity, workflow, makra `%THINK`/`%AUDIT:CODE`/`%AUDIT:DOCS`/`%DOCS`/`%CALIBRATE`, audit cadence, stale Příště check) platí beze změny. Tady jen projekt-specifické rozšíření.

## Code Style — rozšíření
Komentáře česky o trochu **podrobnější** než globální default — user se JS i Three.js učí. Vysvětluj JS/Three-specifické konstrukce (modulový `import`, třída, `requestAnimationFrame`, perspektivní kamera, materiály, BufferGeometry, ShaderMaterial). Triviality stále nevysvětluj.

## %THINK — rozšíření pro TheCubes
Doplň globální body o:

5. **Sandbox/factory mechanika**: dá se vyjádřit stávajícím OOP modelem (objects, relations, rules) nebo data registries (`RESOURCES_DEF`/`RECIPES_DEF`/`FACILITY_DEF`)? Pokud ne, navrhni minimální rozšíření modelu — ne scripted scénář. Preferuj **emergentní chování z jednoduchých pravidel** před hardcoded výsledkem.

## Makra
Projektová `%BEGIN`, `%END` — definice v `docs/PROMPTS.md`. `%BEGIN` vždy končí spuštěním serveru na `localhost:8000`.

## Key Files — mapa pro AI

| Soubor | Obsah |
|--------|-------|
| `index.html` | HTML shell, import map pro Three.js, HUD (resources + event log + simctrl) |
| `src/model.js` | OOP třídy (OBJECTS → CUBES → BLOCKS/COMPOSITES/SPRITES/PATH/FACILITY, TIMER/COUNTER/WORLD) + data registries `RESOURCES_DEF`/`RECIPES_DEF`/`FACILITY_DEF` |
| `src/main.js` | Three.js scéna + builders dispatch (`createMeshFor`, BLOCKS geometry cache, TREE_BUILDERS, voxel COMPOSITES, `createPathFor`, `createFacilityFor`) + **FACTORY TOY ENGINE** (`productionTick`, `pathTick`, material gate, event log, `aggregateResources`) + animators + hover + render loop |
| `src/time.js` | Globální `TIME` singleton, `advanceTime()` |
| `tools/export-*.mjs` | MagicaVoxel reverse pipeline (DD-21+22+24) |

## Project context — kde najít co

- **Identita, status, hierarchie modelu, scéna, milníky, plán fází A–D** → `README.md`
- **Chronologie sezení (changelog)** → `docs/DIARY.md` + `docs/diary/YYYY-MM-DD.md`
- **Schválená rozhodnutí (DD-01..DD-31)** → `docs/DESIGN_DECISIONS.md`
- **Terminologie** → `docs/GLOSSARY.md`
- **Aktivní úkoly / hotové / nápady** → `docs/TODO.md` / `docs/DONE.md` / `docs/IDEAS.md`
