# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [ ] **CCUBES typizace** (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.

## Sez. 21 — Factory toy MVP (boční větev `feat/factory`)

**Pivot k DD-30 + DD-31.** Stará scéna (severská dioráma, pixel-voxel apartmá) zůstává jako pozadí beze změny. Nový kód žije na `feat/factory` větvi, merge do `main` po stabilizaci fáze B.

### Fáze A — Model + tick (sez. 21–22)

- [!] **DD-30 + DD-31 zápis** *(sez. 21, jako kotva před kódem)*.
- [ ] **`RESOURCES_DEF` registry** v `model.js` — 6 surovin (logs/planks/stone/gravel/water/coal) s `{ name_cs, name_en, category, unit }`.
- [ ] **`RECIPES_DEF` registry** — `sawmill`, `crusher`.
- [ ] **`FACILITY_DEF` registry** — `forest`, `quarry`, `well`, `coal_mine`, `sawmill`, `crusher`, `storage` (defaultní buffer kapacity, mesh hints).
- [ ] **Třída `FACILITY` + `GENERATOR` / `TRANSFORMER` / `STORAGE`** v `model.js` (atributy `KIND`, `BUFFER`).
- [ ] **`productionTick()`** v `main.js` render loopu (1 wall s = 1 tick, žádné per-frame poll).
- [ ] **`world.RESOURCES`** agregát + `world.TIME_SCALE` (default 1.0) — DD-29 noví konzumenti.
- [ ] **Hardcoded test scéna**: 1× les → 1× pila → 1× sklad (žádný editor, žádné PATH propojení zatím — transformer čerpá z arbitrárně přiděleného source bufferu).
- [ ] **HUD**: top bar 6 čítačů (Σ napříč fasilitami) + bottom bar event log ticker (5 posledních řádků). Verbs `PROD`, `DRN`, `PAUS`.

### Fáze B — PATH transport (sez. 22–23)

- [ ] **`PATH` rozšíření**: `KIND ∈ "conveyor"|"pipeline"`, `SOURCE` / `SINK` instance ID refs, `THROUGHPUT`.
- [ ] **PATH skutečně přemisťuje** items mezi `SOURCE.BUFFER` a `SINK.BUFFER` per tick.
- [ ] **Material gate** — transformer se pauzuje při chybějícím inputu, event log verb `PAUS` s důvodem (`Pila pauza — chybí klády`). Resume při doplnění.
- [ ] **`WORLD.TIME_SCALE` slider** v HUD — škáluje globální tick rate.
- [ ] **Migrace test scény** na PATH propojení (forest → conveyor → sawmill → conveyor → storage).

### Fáze C — Editor MVP (sez. 24+)

- [ ] **Klik na voxel** → paleta KIND fasilit (modal/dropdown), place na pozici.
- [ ] **R-klik** → delete fasility.
- [ ] **PATH draw mode** — klik na fasilitu A, klik na fasilitu B → vytvoří PATH (auto KIND podle kompatibility resource category).
- [ ] **Hover infotip rozšíření** o `BUFFER` state a `PAUSED` reason.
- [ ] **Save/load** scény do localStorage *(volitelné, pokud se hodí pro testing)*.

### Fáze D — Cleanup pixel-voxel apartmá (sez. ~25, po stabilizaci)

- [ ] **Merge `feat/factory` → `main`** (squash nebo merge commit, dle čistoty historie).
- [ ] **Smazat** TREE všechny KIND, GRASS_TUFT, ROCK_PIXEL, LOG, `populateNorthernScene`, mulberry32 RNG.
- [ ] **Smazat** `tree_sway` animátor + `WIND_STRENGTH` z `WORLD` (migrace do IDEAS, DD-29 záznam aktualizovat).
- [ ] **Smazat** procedurální `:grass-top` texturu, použít plochou barvu nebo jednoduchý jednobarevný stripe.
- [ ] **Rozhodnout**: TRRAMPS / TTRAMPS / TTUNELS — smazat (factory toy je flat grid), nebo nechat (sentimentální argument vs. KISS). Diskuse v sez. 24+.
- [ ] **VOXEL_MODEL** — ponechat jako kapability pro budoucí pixel-art fasility (DD-30).
- [ ] **Update `CLAUDE.md` + `README.md`** o novou identitu projektu.

## M8+ otevřené (parkováno během factory pivotu)

- [ ] **Biome populate** *(IDEAS — vyžaduje `WORLD.CLIMATE`, gated by DD-29; nesouvisí s factory toy)*.
- [ ] **BUILDING třída** *(IDEAS — pixel-voxel domy v cleanupu fáze D ztrácí kontext, parkováno)*.
- [ ] **TRACK třída** *(IDEAS — sourozenec PATH, ale factory toy `PATH KIND=conveyor` jí překryl; vlaky odloženy)*.
- [ ] **`mtllib` reference fix** *(drobnost, nesouvisí s factory pivotem)*.
- [ ] **`ACTION.kind: increment`** *(TIMER+COUNTER — překryto `productionTick`)*.
