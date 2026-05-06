# CLAUDE.md — TheCubes

## Project
TheCubes je meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance `OBJECTS`, rozšiřováním modelu se scéna zaplňuje. Cíl: demonstrovat současné mládeži, že tvorba je zábavnější než konzumace.

## Status
Milníky **M1–M7 hotové**, **M8+ průběžně**. **Jediná scéna** — dioráma s **4-vrstvou taxonomií** (DD-25 sez. 16: Bloky / Voxely / Linie / Objekty).

**Scéna 2** (jediná): **10×10 dioráma** z `SCENE2_LAYOUT` (~145 TCUBES — grass podlaha + hliněná zadní stěna s peaky + stone bloky). **2 TTUNELS** klenuté tunely na Z=−3 (vstupy pro vlak, osa X). **1 TRRAMPS** travnatá rampa na (-4, 0, 0). **1 TTRAMPS** trojboký jehlan (corner ramp) na (-4, 0, 1). **10 pixel stromů** TREE.KIND (spruce/oak/birch/palm/bush/cypress/willow/bonsai/dead/maple) na Z=4 — kymácení `tree_sway`. **2 SPRITES bubliny** s dynamickým 3D ocáskem (SPEAKER tracking, DD-16).

**4-vrstvá taxonomie** (DD-25):
1. **Bloky** (1C grid) — `BLOCKS` rodina: TCUBES (krychle, 6 faces), TRRAMPS (klín, 5 faces), TTRAMPS (jehlan, 4 faces), TTUNELS (klenutý tunel, 4 faces). Procedurální `BufferGeometry`, sdílí `faceMaterialFor` (DD-14) + `:named-textures`. Atribut `ORIENTATION` (integer 0..3 = počet 90° CCW rotací).
2. **Voxely** (1V = 1/16 C, dotvarba) — TREE.KIND (10 sub-builderů); plánováno BUILDING, ROCK_PIXEL, CLOUD; plus VOXEL_MODEL (externí MV blob).
3. **Linie** *(plánováno)* — PATH, TRACK (1D křivky pro cesty/koleje).
4. **Objekty** *(plánováno, možná)* — postavy, zvířata, stroje (kde voxel jazyk nesedí).

**Vizuální zdroje**: procedurální Bloky (BufferGeometry + per-face `:named-textures`), pixel-voxel COMPOSITES (TREE 0.125 j voxely), externí VOXEL_MODEL (zatím jen `cube-grass.vox` šablona pro DD-24), canvas SPRITES (dialog/UI). **Pixel-art identita** napříč všemi vrstvami: NearestFilter, 16×16 textury, sdílená paleta `:grass-top` / `:grass-side` / `:dirt` / `:stone`.

**Pipeline** (DD-21+22+24): TheCubes ↔ MagicaVoxel přes `tools/export-grass-vox.mjs` + OBJLoader. Pevné měřítko 1 MV voxel = 1/16 TC = 6.25 cm. **Shape × Surface separation** (DD-24, plánovaná pipeline) zůstává pro budoucí komplexní VOXEL_MODELy.

**Klávesové ovládání kamery** (sez. 14): WASD pan, Q/E rotace kolem cíle, Y/X zoom.

**Plynulé chování**: atribut `ANIMATE` (DD-15), aktivní `kind`y `tree_sway` / `rotate` / `orbit_stadium` / `pulse` / `drift`. **Diskrétní**: `TIMER` (DD-17) → `ACTION` a `COUNTER`. Engine-derived watcher: bubble tail (DD-16). **Hover** → emissive yellow highlight celého objektu (sez. 16, lazy clone-on-first-hover materiálu).

**Sez. 14 cleanup:** humanoidi → `./source/Stickman` projekt. DD-18/19/20 historický kontext.
**Sez. 15 cleanup:** smazány non-voxel třídy BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + Scéna 1 + scene switcher + LIT + balloon_bob + classic TREE + cylinderBetween (~720 řádků). DD-17, DD-21 historický kontext.
**Sez. 16:** **DD-25 4-vrstvá taxonomie**, **BLOCKS rodina** (TRRAMPS, TTRAMPS, TTUNELS s procedurální `BufferGeometry`), **hover emissive highlight**, **ORIENTATION enum** (refaktor `ROTATION_Y`). VOXEL_MODEL `tunel-grass` + `ramp-grass` instance smazány a nahrazeny TTUNELS / TRRAMPS, asset soubory `tunel-grass.*` + `ramp-grass.*` smazány. @AUDIT:DOCS opravy F1–F7.

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
 ├── CUBES (X, Y, Z — float, DD-12)
 │    ├── BLOCKS (1C grid-aligned, geologie/terén — DD-25 sez. 16)
 │    │    ├── CCUBES (COLOR)             ← plochá barva
 │    │    ├── TCUBES (TEXTURE × 6)       ← krychle, per-face textury
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)  ← trojboký hranol (klín)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)  ← trojboký jehlan (corner ramp)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)  ← klenutý tunel skrz 1C blok
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y) ← 2D billboard (UI/dialog)
 │    └── COMPOSITES (voxel kompozice, dotvarba — vrstva 2)
 │         ├── TREE (KIND)                ← 10 pixel sub-builderů (spruce/oak/...)
 │         └── VOXEL_MODEL (ASSET, SCALE, ROTATION_Y) ← async .obj+.mtl+.png z MagicaVoxelu
 ├── TIMER (INTERVAL, ACTION)             ← nevizuální (DD-17)
 └── COUNTER (VALUE, INCREMENT)           ← nevizuální, řádek v HUD
```

**Plánované třídy** (DD-25, vrstvy 2–4): BUILDING / ROCK_PIXEL / CLOUD / GRASS_TUFT (Voxely), PATH / TRACK pod LINES (Linie), ASSETS pro postavy/zvířata/stroje (Objekty).
**Smazané třídy** (sez. 15, DD-23): BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN. Pokud bude potřeba pixel-voxel ekvivalent, vznikne nová třída pod COMPOSITES.

`TIME.tick` = globální čítač pro diskrétní události (zatím nepoužito).
**Plynulé animace** jdou přes atribut `ANIMATE = { kind, ...params }` (DD-15) a wall-clock v render loopu.

## Key Files

| Vrstva | Soubor | Obsah |
|--------|--------|-------|
| Entry | `index.html` | HTML shell, import map pro Three.js, HUD |
| Model | `src/model.js` | `OBJECTS` (+`ANIMATE`), `CUBES`, `BLOCKS` (CCUBES/TCUBES/TRRAMPS/TTRAMPS/TTUNELS), `SPRITES`, `COMPOSITES` (TREE/VOXEL_MODEL), `TIMER`, `COUNTER` |
| Model | `src/time.js` | Globální `TIME`, `advanceTime()` |
| Boot | `src/main.js` | Three.js scéna, kamera, osvětlení, stíny, `createMeshFor` dispatch, **BLOCKS buildery** (`TRRAMP_GEOM_CACHE` / `TTRAMP_GEOM_CACHE` / `TTUNEL_GEOM_CACHE` — sdílené BufferGeometry s per-face material groups), **`TREE_BUILDERS`** (10 pixel sub-builderů), `buildVoxelModel` (async OBJ+MTL+PNG), animators registry + `updateAnimations`, hover highlight (lazy clone-on-first-hover), infotip, render loop |

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
