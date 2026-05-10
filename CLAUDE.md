# CLAUDE.md — TheCubes

## Project
TheCubes je meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance `OBJECTS`, rozšiřováním modelu se scéna zaplňuje. Cíl: demonstrovat současné mládeži, že tvorba je zábavnější než konzumace.

## Status
Milníky **M1–M7 hotové**, **M8+ průběžně**. **Jediná scéna** — dioráma s **4-vrstvou taxonomií** (DD-25 sez. 16: Bloky / Voxely / Linie / Objekty). Po sez. 17–20 čtyři nové DD: **DD-26 sjednocená `ORIENTATION`** napříč BLOCKS i COMPOSITES (float [0, 360) ve stupních), **DD-27 PATH** (1. potomek vrstvy 3 LINES, Catmull-Rom strip), **DD-28 sjednocená Y konvence** (BLOCKS = grid-center, surface třídy = mesh bottom), **DD-29 WORLD singleton** (nevizuální OBJECTS-derived, `WIND_STRENGTH` násobí `tree_sway` amplitudu; další atributy gated by konzument).

**Scéna** (jediná): **10×10 dioráma** z `SCENE_LAYOUT` (~145 TCUBES — grass podlaha + hliněná zadní stěna s peaky + stone bloky). **2 TTUNELS** klenuté tunely na Z=−3 (vstupy pro vlak, osa X). **1 TRRAMPS** travnatá rampa na (-4, 0, 0). **1 TTRAMPS** trojboký jehlan (corner ramp) na (-4, 0, 1). **1 PATH** štěrková cesta z `tunnel_0` ven přes východní hranu (5 bodů, Catmull-Rom esíčko). **Procedurální severská dekorace** — stromy TREE (spruce/birch/dead/bonsai/bush), keře, trsy trávy GRASS_TUFT (short/fern/micro), kameny ROCK_PIXEL (small/medium/mossy/micro), padlé kmeny LOG (birch/pine/stump). Hustota cca 60% grass topu, mulberry32(42) deterministická RNG, random ORIENTATION každé instance pro organický vzhled.

**4-vrstvá taxonomie** (DD-25):
1. **Bloky** (1C grid) — `BLOCKS` rodina: TCUBES (krychle, 6 faces), TRRAMPS (klín, 5 faces), TTRAMPS (jehlan, 4 faces), TTUNELS (klenutý tunel, 4 faces). Procedurální `BufferGeometry`, sdílí `faceMaterialFor` (DD-14) + `:named-textures`. Atribut `ORIENTATION` (DD-26 — float ve stupních [0, 360)).
2. **Voxely** (1V = 1/16 C, dotvarba) — TREE.KIND (10 sub-builderů), GRASS_TUFT, ROCK_PIXEL, LOG; plánováno BUILDING, CLOUD; plus VOXEL_MODEL (externí MV blob).
3. **Linie** — **PATH** (cesty, sez. 17 DD-27 — Catmull-Rom curve + plochý strip mesh, `:path-dirt` textura). Plánováno TRACK (železnice).
4. **Objekty** *(plánováno, možná)* — postavy, zvířata, stroje (kde voxel jazyk nesedí).

**Vizuální zdroje**: procedurální Bloky (BufferGeometry + per-face `:named-textures`), pixel-voxel COMPOSITES (TREE 0.125 j voxely), externí VOXEL_MODEL (zatím jen `cube-grass.vox` šablona pro DD-24), canvas SPRITES (dialog/UI). **Pixel-art identita** napříč všemi vrstvami: NearestFilter, 16×16 textury, sdílená paleta `:grass-top` / `:dirt` / `:stone` / `:rail-top` / `:path-dirt`.

**Pipeline** (DD-21+22+24): TheCubes ↔ MagicaVoxel přes `tools/export-grass-vox.mjs` + OBJLoader. Pevné měřítko 1 MV voxel = 1/16 TC = 6.25 cm. **Shape × Surface separation** (DD-24, plánovaná pipeline) zůstává pro budoucí komplexní VOXEL_MODELy.

**Klávesové ovládání kamery** (sez. 14): WASD pan, Q/E rotace kolem cíle, Y/X zoom.

**Plynulé chování**: atribut `ANIMATE` (DD-15), aktivní `kind`y `tree_sway` / `rotate` / `orbit_stadium` / `pulse` / `drift`. **Diskrétní**: `TIMER` (DD-17) → `ACTION` a `COUNTER`. Engine-derived watcher: bubble tail (DD-16). **Hover** → emissive yellow highlight celého objektu (sez. 16, lazy clone-on-first-hover materiálu).

**Sez. 14 cleanup:** humanoidi → `./source/Stickman` projekt. DD-18/19/20 historický kontext.
**Sez. 15 cleanup:** smazány non-voxel třídy BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + Scéna 1 + scene switcher + LIT + balloon_bob + classic TREE + cylinderBetween (~720 řádků). DD-17, DD-21 historický kontext.
**Sez. 16:** **DD-25 4-vrstvá taxonomie**, **BLOCKS rodina** (TRRAMPS, TTRAMPS, TTUNELS s procedurální `BufferGeometry`), **hover emissive highlight**, **ORIENTATION enum** (refaktor `ROTATION_Y`). VOXEL_MODEL `tunel-grass` + `ramp-grass` instance smazány a nahrazeny TTUNELS / TRRAMPS, asset soubory `tunel-grass.*` + `ramp-grass.*` smazány. %AUDIT:DOCS opravy F1–F7.
**Sez. 17:** **DD-26 sjednocená `ORIENTATION`** (BLOCKS enum 0..3 → float stupně, `LOG/VOXEL_MODEL.ROTATION_Y` smazán). **DD-27 PATH** (1. potomek vrstvy 3 LINES, Catmull-Rom + strip mesh, `:path-dirt` textura). **3 nové COMPOSITES** (GRASS_TUFT, ROCK_PIXEL, LOG) + procedurální `populateNorthernScene` (mulberry32 deterministic). **Zjednodušení grass blok** (boky `:dirt`, smazán `:grass-side` factory). **Q/E camera fix** (explicit world Y + `lookAt`). **`buildSceneTwo` → `buildScene`** rename + `SCENE2_LAYOUT` → `SCENE_LAYOUT`.
**Sez. 18:** **`%AUDIT:CODE`** — 12 nálezů, vše opraveno. **DD-28 sjednocená Y konvence** (BLOCKS = grid Y voxelu = mesh center; VOXEL_MODEL + pixel-voxel COMPOSITES = surface = mesh bottom). Cleanup: zombie `GRASS_TUFT.tall` smazán (default `"short"`), docstringy GRASS_TUFT/ROCK_PIXEL/VOXEL_MODEL aktualizovány, GLOSSARY hlavička + DD-22 sekce rozšířena tabulkou, `temp/` smazáno + přidáno do `.gitignore`, historické cleanup komentáře zkráceny, `castShadow` duplicita v `treeVoxel` odstraněna.
**Sez. 19:** **Meta-sezení** (žádný kód). `docs/DONE.md` split z `TODO.md` (215 řádků archiv, M1–M7 + M8+ Hotové + Sezení 14–18). Bulk rename **`@` → `%`** napříč 7 projekty (138 souborů z 1770) + globální config + 5 memory adresářů — důvod: `@` v Claude Code otevírá file picker. Token sada: `%BEGIN`, `%END`, `%THINK`, `%DOCS`, `%AUDIT:CODE`, `%AUDIT:DOCS`, `%CALIBRATE`. Žádný projektový DD (operační změna mimo model).
**Sez. 20:** **DD-29 WORLD singleton** (Light DO). User otevřel dvěma KISS návrhy z Glossary (OBJECTS=CUBES, BLOCKS=CCUBES) — AI Censure! odmítla jako demix konceptů, přesměrovala na WORLD (5× v Příště). Z navrhovaných atributů (`WIND { strength, direction }`, `SUN { angle }`, `CLIMATE`, `SEASON`, `DAY`) má aktivního konzumenta jen `WIND.strength`. Light DO: třída `WORLD extends OBJECTS` (bez X/Y/Z — demonstruje DD-01), `WIND_STRENGTH = 1.0`, instance `world` v `main.js`, dev exposure `window.world`, `tree_sway` násobí amplitudu. **DD-29** politika „atribut přibude jen s živým konzumentem" — 5 odložených v `IDEAS.md`. Plochá struktura (`WIND_STRENGTH`, ne nested) — refaktor na nested až při ≥3 atributech kategorie.

## Dokumenty
- `README.md` — overview
- `CLAUDE.md` — instrukce pro Claude
- `docs/TODO.md` — aktivní úkoly (`[ ]` todo · `[~]` in progress · `[!]` priority)
- `docs/IDEAS.md` — raw nápady
- `docs/GLOSSARY.md` — terminologie
- `docs/DESIGN_DECISIONS.md` — schválená rozhodnutí (DD-XX)
- `docs/DIARY.md` — index sezení (`docs/diary/YYYY-MM-DD.md`)
- `docs/PROMPTS.md` — projektová makra (`%BEGIN`, `%END`)

## Hierarchie modelu

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z — float, DD-12; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid-aligned, Y = grid center, ORIENTATION ∈ [0, 360) stupně — DD-25 / DD-26)
 │    │    ├── CCUBES (COLOR)                              ← plochá barva
 │    │    ├── TCUBES (TEXTURE × 6)                        ← krychle, per-face textury
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)          ← trojboký hranol (klín)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)          ← trojboký jehlan (corner ramp)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)          ← klenutý tunel skrz 1C blok
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)       ← 2D billboard (UI/dialog)
 │    ├── COMPOSITES (voxel kompozice, vrstva 2 — ORIENTATION sdílena přes DD-26)
 │    │    ├── TREE (KIND)                                 ← 10 pixel sub-builderů (spruce/oak/...)
 │    │    ├── GRASS_TUFT (KIND)                           ← chomáč trávy / kapradiny (sez. 17)
 │    │    ├── ROCK_PIXEL (KIND)                           ← pixel-voxel kámen (sez. 17)
 │    │    ├── LOG (KIND)                                  ← pixel-voxel padlý kmen / pařez (sez. 17)
 │    │    └── VOXEL_MODEL (ASSET, SCALE)                  ← async .obj+.mtl+.png z MagicaVoxelu
 │    └── PATH (KIND, POINTS)                              ← 1D křivka (LINES vrstva 3, sez. 17 DD-27)
 ├── TIMER (INTERVAL, ACTION)                              ← nevizuální (DD-17)
 ├── COUNTER (VALUE, INCREMENT)                            ← nevizuální, řádek v HUD
 └── WORLD (WIND_STRENGTH)                                 ← nevizuální singleton (DD-29, sez. 20)
```

**Plánované třídy** (DD-25): BUILDING / CLOUD (Voxely), TRACK pod LINES (Linie), ASSETS pro postavy/zvířata/stroje (Objekty).
**Smazané třídy** (sez. 15, DD-23): BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN. Pokud bude potřeba pixel-voxel ekvivalent, vznikne nová třída pod COMPOSITES.

`TIME.tick` = globální čítač pro diskrétní události (zatím nepoužito).
**Plynulé animace** jdou přes atribut `ANIMATE = { kind, ...params }` (DD-15) a wall-clock v render loopu.

## Key Files

| Vrstva | Soubor | Obsah |
|--------|--------|-------|
| Entry | `index.html` | HTML shell, import map pro Three.js, HUD |
| Model | `src/model.js` | `OBJECTS` (+`ANIMATE`), `CUBES`, `BLOCKS` (CCUBES/TCUBES/TRRAMPS/TTRAMPS/TTUNELS), `SPRITES`, `COMPOSITES` (TREE/GRASS_TUFT/ROCK_PIXEL/LOG/VOXEL_MODEL), `PATH`, `TIMER`, `COUNTER`. Base třídy `BLOCKS` + `COMPOSITES` mají explicit constructor s default `ORIENTATION = 0` (DD-26). |
| Model | `src/time.js` | Globální `TIME`, `advanceTime()` |
| Boot | `src/main.js` | Three.js scéna, kamera, osvětlení, stíny, `createMeshFor` dispatch, **BLOCKS buildery** (`TRRAMP_GEOM_CACHE` / `TTRAMP_GEOM_CACHE` / `TTUNEL_GEOM_CACHE` — sdílené BufferGeometry s per-face material groups), **`TREE_BUILDERS`** (10 pixel sub-builderů), **GRASS_TUFT/ROCK_PIXEL/LOG buildery** (sez. 17), `buildVoxelModel` (async OBJ+MTL+PNG), **`createPathFor`** (Catmull-Rom strip mesh, DD-27), `populateNorthernScene` (procedurální dekorace, mulberry32 RNG), animators registry + `updateAnimations`, hover highlight, infotip, render loop |

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
- Projektová makra: `%BEGIN`, `%END` — definována v `docs/PROMPTS.md`. `%BEGIN` vždy končí spuštěním serveru na `localhost:8000`.
- Globální makra: `%THINK`, `%AUDIT:CODE`, `%AUDIT:DOCS` (viz `~/.claude/CLAUDE.md`).

## Workflow
1. Diskutovat koncept v chatu
2. Raw nápady → `docs/IDEAS.md`; konkrétní úkoly → `docs/TODO.md`
3. Napsat kód
4. Hotové úkoly přesunout do sekce "Hotovo" v `docs/TODO.md` nebo do `docs/DONE.md`
5. Zalogovat sezení v `docs/diary/YYYY-MM-DD.md`

## Kudos/Censure
Oboustranný systém explicitní zpětné vazby. Zápis v globální paměti projektu (`feedback_kudos_censure.md`).
