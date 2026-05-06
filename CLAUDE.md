# CLAUDE.md — TheCubes

## Project
TheCubes je meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance `OBJECTS`, rozšiřováním modelu se scéna zaplňuje. Cíl: demonstrovat současné mládeži, že tvorba je zábavnější než konzumace.

## Status
Milníky **M1–M7 hotové**, **M8+ průběžně**. **Jediná scéna** — voxelová dioráma (sez. 15 cleanup, DD-23 „all voxel" pivot).

**Scéna 2** (jediná): **10×10 voxelová dioráma** z `SCENE2_LAYOUT` (~145 TCUBES kostek — grass podlaha + hliněná zadní stěna s peaky + stone bloky). **2 tunelové vstupy** (`tunel-grass` VOXEL_MODEL, 48³ MV → 3×3×3 TC, MagicaVoxel pipeline DD-21+22). **1 grass rampa** (`ramp-grass` VOXEL_MODEL, spojuje úrovně Y=−1 a Y=0). **10 pixel stromů** na předním řádku Z=4 (TREE.KIND-y: spruce, oak, birch, palm, bush, cypress, willow, bonsai, dead, maple) — kymácení ve větru polymorfně přes `tree_sway`. **2 SPRITES bubliny** s dynamickým 3D ocáskem (SPEAKER tracking, DD-16).

**Vizuální zdroje** (DD-21 sez. 14, **revize DD-23 sez. 15**): tři zdroje + UI — pixel-voxel COMPOSITES (TREE.KIND sub-buildery 0.125 j voxely), procedurální canvas textury (`:named` pro TCUBES voxely), externí VOXEL_MODEL z MagicaVoxelu (komplexní entity), canvas SPRITES (dialog/UI). **Žádné Cylinder/Cone/Sphere/Torus primitivy** v gameplay entitách („Kostičky" = jen voxely).

**Pipeline** (DD-21+22+24): TheCubes ↔ MagicaVoxel přes `tools/export-grass-vox.mjs` (`.vox` šablona) + `assets/` + OBJLoader. Pevné měřítko 1 MV voxel = 1/16 TC voxelu = 6.25 cm; default `SCALE: 0.625`. Velikost objektu řídí MV grid. **Shape × Surface separation** (DD-24, plánovaná pre-build pipeline): jeden tvar × N povrchů = N pre-built kombinací (`<shape>-<surface>` pojmenování).

**Klávesové ovládání kamery** (sez. 14): WASD pan, Q/E rotace kolem cíle, Y/X zoom (per-frame v render loopu).

**Plynulé chování**: atribut `ANIMATE` (DD-15), aktivní `kind`y `tree_sway` (pixel + height-weighted) / `rotate` / `orbit_stadium` / `pulse` / `drift`. **Diskrétní**: `TIMER` (DD-17) → `ACTION` a `COUNTER` (VALUE + INCREMENT v HUD) — nevizuální potomci OBJECTS. Engine-derived watcher: bubble tail (DD-16). Hover → edge highlight (jen viditelné hrany).

**Sez. 14 cleanup:** humanoidi → `./source/Stickman` projekt. DD-18/19/20 historický kontext.
**Sez. 15 cleanup:** smazány non-voxel třídy BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + Scéna 1 + scene switcher + LIT system + balloon_bob + classic TREE varianta + cylinderBetween helpers (~720 řádků). DD-17 (BALLOON.LIT), DD-21 (hybrid) historický kontext — nahrazené DD-23 (all-voxel).

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
 │    ├── CCUBES (COLOR)                 ← plochá barva
 │    ├── TCUBES (TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST) ← per-face textury
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y) ← 2D billboard ke kameře (UI/dialog)
 │    └── COMPOSITES (voxel-based 3D mesh)
 │         ├── TREE (KIND)                ← pixel-voxel jehličnany/listnáče/keř/palma/...
 │         │                                10 KIND-ů: spruce, oak, birch, palm, bush,
 │         │                                cypress, willow, bonsai, dead, maple
 │         │                                (kymácení tree_sway height-weighted)
 │         └── VOXEL_MODEL (ASSET, SCALE, ROTATION_Y) ← async .obj+.mtl+.png z MagicaVoxelu
 │                                           (DD-21 + DD-22 měřítko)
 ├── TIMER (INTERVAL, ACTION)             ← nevizuální (DD-17)
 └── COUNTER (VALUE, INCREMENT)           ← nevizuální, řádek v HUD
```

**Smazané třídy** (sez. 15, DD-23): BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN. Až bude potřeba pixel-voxel ekvivalent některé, vznikne nová třída se sub-builderem (TREE.KIND-style dispatch).

`TIME.tick` = globální čítač pro diskrétní události (zatím nepoužito).
**Plynulé animace** jdou přes atribut `ANIMATE = { kind, ...params }` (DD-15) a wall-clock v render loopu.

## Key Files

| Vrstva | Soubor | Obsah |
|--------|--------|-------|
| Entry | `index.html` | HTML shell, import map pro Three.js, HUD |
| Model | `src/model.js` | `OBJECTS` (+`ANIMATE`), `CUBES`, `CCUBES`, `TCUBES`, `SPRITES`, `COMPOSITES`, `TREE` (KIND), `VOXEL_MODEL`, `TIMER`, `COUNTER` |
| Model | `src/time.js` | Globální `TIME`, `advanceTime()` |
| Boot | `src/main.js` | Three.js scéna, kamera, osvětlení, stíny, `createMeshFor` dispatch, **`TREE_BUILDERS`** (10 pixel sub-builderů), `buildVoxelModel` (async OBJ+MTL+PNG), animators registry + `updateAnimations`, infotip, render loop |

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
