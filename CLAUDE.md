# CLAUDE.md — TheCubes

## Project
TheCubes je meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance `OBJECTS`, rozšiřováním modelu se scéna zaplňuje. Cíl: demonstrovat současné mládeži, že tvorba je zábavnější než konzumace.

## Status
Milníky **M1–M7 hotové**, **M8+ průběžně**. **Dvě scény** (URL switcher `?scene=N`).

**Scéna 1** (default): středová `CUBES` (šachovnice), 8× `CCUBES` (duhová růžice), `TREE` (kývá se ve větru), `BALLOON` (pohupuje se + **lantern mode** s PointLight/fade), `HOUSE`, `CLOUD` (drift), `ROCK`, dvě `TCUBES` krabice (jedna rotuje, druhá obíhá stadium-dráhu), dvě `SPRITES` bubliny s **dynamickým 3D ocáskem** (SPEAKER tracking).

**Scéna 2** (sez. 14): **10×10 voxelová dioráma** z `SCENE2_LAYOUT` (~145 TCUBES kostek — grass podlaha + hliněná zadní stěna s peaky + jeden stone block) + **2 kamenné kulové oblouky** (TUNNEL_ARCH, half-torus) jako budoucí tunelové vstupy + **2 voxelová auta** (VOXEL_MODEL, MagicaVoxel pipeline). Připraveno (zatím nepoužito): WAREHOUSE, TRAIN.

**Vizuální zdroje** (DD-21 sez. 14): hybrid 4 zdrojů — procedurální COMPOSITES (parametrizované/animované entity), procedurální canvas textury (`:named` pro voxely), canvas SPRITES (dialogy), externí 3D modely VOXEL_MODEL (statická dekorace, MagicaVoxel default). Pipeline: `tools/export-grass-vox.mjs` (TheCubes → `.vox` šablona pro MagicaVoxel) + `assets/` + OBJLoader (MagicaVoxel `.obj` → VOXEL_MODEL).

**Klávesové ovládání kamery** (sez. 14): WASD pan, Q/E rotace kolem cíle, Y/X zoom (per-frame v render loopu).

**Sez. 14 cleanup:** humanoidní postavy (CHARACTER / NOODLE / STICKMAN) se přesunuly do samostatného projektu `./source/Stickman`. DD-18/19/20 zůstávají v immutable logu jako historický kontext.

Plynulé chování: atribut `ANIMATE` (DD-15), aktivní `kind`y `balloon_bob` / `tree_sway` / `rotate` / `orbit_stadium` / `pulse` / `drift`. Diskrétní: `TIMER` (DD-17) → `ACTION = { kind, target, attr, ... }` a `COUNTER` (VALUE + INCREMENT v HUD) — oba nevizuální potomci OBJECTS, registrovaní přes `registerBehavior(instance)`. Engine-derived watchery (bubble tail DD-16, LIT fade DD-17) reagují per-frame na stav v modelu. Interakce: click na vak balónu toggle `LIT`; hover → edge highlight (jen viditelné hrany).

## Dokumenty
- `README.md` — overview
- `CLAUDE.md` — instrukce pro Claude
- `docs/TODO.md` — aktivní úkoly (`[ ]` todo · `[~]` in progress · `[!]` priority)
- `docs/IDEAS.md` — raw nápady
- `docs/GLOSSARY.md` — terminologie
- `docs/DESIGN_DECISIONS.md` — schválená rozhodnutí (DD-XX)
- `docs/DIARY.md` — index sezení (`docs/diary/YYYY-MM-DD.md`)
- `docs/PROMPTS.md` — projektová makra (`@BEGIN`, `@END`)

## Hierarchie modelu

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z — float, voxel renderer snap-to-grid, DD-12)
 │    ├── CCUBES (COLOR)                 ← plochá barva; dřív TERRAIN
 │    ├── TCUBES (TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST) ← per-face textury
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y) ← 2D billboard ke kameře
 │    └── COMPOSITES (3D mesh z primitivů / externí asset)
 │         ├── TREE                       ← kmen + kužely (tree_sway)
 │         ├── BALLOON (COLOR, LIT)       ← vak + lana + koš, mimo grid (balloon_bob, lantern)
 │         ├── HOUSE (COLOR)              ← stěny + jehlanová střecha
 │         ├── CLOUD                      ← shluk koulí (drift)
 │         ├── ROCK (COLOR)               ← nízkopoly balvan
 │         ├── TUNNEL_ARCH (COLOR)        ← kamenný kulový oblouk (half-torus)
 │         ├── WAREHOUSE (COLOR)          ← sklad u koleje (Scéna 2)
 │         ├── TRAIN (COLOR)              ← lokomotiva + vagón (Scéna 2)
 │         └── VOXEL_MODEL (ASSET, SCALE, ROTATION_Y) ← async .obj+.mtl+.png z MagicaVoxelu (DD-21)
 ├── TIMER (INTERVAL, ACTION)             ← nevizuální (DD-17)
 └── COUNTER (VALUE, INCREMENT)           ← nevizuální, řádek v HUD
```

`TIME.tick` = globální čítač pro diskrétní události (zatím nepoužito).
**Plynulé animace** jdou přes atribut `ANIMATE = { kind, ...params }` (DD-15) a wall-clock v render loopu.

## Key Files

| Vrstva | Soubor | Obsah |
|--------|--------|-------|
| Entry | `index.html` | HTML shell, import map pro Three.js, HUD |
| Model | `src/model.js` | `OBJECTS` (+`ANIMATE`), `CUBES`, `CCUBES`, `TCUBES`, `SPRITES`, `COMPOSITES`, `TREE`, `BALLOON` |
| Model | `src/time.js` | Globální `TIME`, `advanceTime()` |
| Boot | `src/main.js` | Three.js scéna, kamera, osvětlení, stíny, `createMeshFor` dispatch, `buildTree` + `buildBalloon`, **animators registry + `updateAnimations`**, infotip, render loop |

## Code Style
- **Komentáře česky.** Uživatel se JS i Three.js učí — komentáře o trochu podrobnější. Vysvětlovat JS/Three-specifické konstrukce (modulový `import`, třída, `requestAnimationFrame`, perspektivní kamera, materiály…).

## Design Principles
- **KISS**: Keep It Simple, Stupid.
- **First things first**: základy před dekorací.
- **Izomorfismus**: podobné věci vypadají a ovládají se podobně.
- **Conceptual Integrity + SLAP**: model, renderer, docs — stejná úroveň detailu.
- **DRY**: jediný zdroj pravdy pro každou hodnotu.
- **Minimize exceptions**: rozšiř vzor, neobcházej ho.

## Macros
- Projektová makra: `@BEGIN`, `@END` — definována v `docs/PROMPTS.md`. `@BEGIN` vždy končí spuštěním serveru na `localhost:8000`.
- Globální makra: `@THINK`, `@AUDIT:CODE`, `@AUDIT:DOCS` (viz `~/.claude/CLAUDE.md`).

## Workflow
1. Diskutovat koncept v chatu
2. Raw nápady → `docs/IDEAS.md`; konkrétní úkoly → `docs/TODO.md`
3. Napsat kód
4. Hotové úkoly přesunout do sekce "Hotovo" v `docs/TODO.md` nebo do `docs/DONE.md`
5. Zalogovat sezení v `docs/diary/YYYY-MM-DD.md`

## Kudos/Censure
Oboustranný systém explicitní zpětné vazby. Zápis v globální paměti projektu (`feedback_kudos_censure.md`).
