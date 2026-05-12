# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

> Hotové úkoly: `docs/DONE.md`. Designová rozhodnutí: `docs/DESIGN_DECISIONS.md`.

## M8+ — Otevřené

- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény** — bez humanoidů je scéna vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [ ] **CCUBES typizace** (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.

## Terrain generator (`generateTerrain`) — separátní téma

**Cíl**: nahradit hardcoded `SCENE_LAYOUT` (10×10 export z builderu sez. 14) procedurálním generátorem, který bere parametrický popis krajiny a vrací scene data při bootu. Factory toy by mohl volat `generateTerrain({ relief: 0, surfaces: { grass: 1.0 } })` pro flat grass plain, severská dioráma `relief: 4..6` pro kopcovitý vzhled.

**Diskuse**: sez. 24 (toto sezení) — diskutováno bez kódu, žádný DD zatím.

### API návrh

```js
generateTerrain({
  size:     [10, 10],          // grid count [sx, sz], centered kolem (0,0)
  relief:   4,                 // integer 0..10, stupnice níž
  surfaces: {                  // top biome proporce, součet = 1.0 (fail-fast jinak)
    grass: 0.80, stone: 0.10, sand: 0.05, water: 0.05
  },
  seed:     42,                // mulberry32 (izomorfie s populateNorthernScene)
})
→ {
  blocks: [["grass", -5, 2, -5], ...],   // drop-in SCENE_LAYOUT formát
  water:  [{ x, z, w, d, y }, ...]       // axis-aligned plane(y) nad depression
}
```

### Stupnice `relief` 0..10

| # | Termín | Charakter |
|---|---|---|
| 0 | **Flat / Dead flat** | Naprostá rovina, žádné rozdíly. Solné pláně, prérie. |
| 1 | **Level / Uniform** | V podstatě rovina, drobné neznatelné odchylky. |
| 2 | **Gently undulating** | Mírně zvlněná krajina, lehké „vlny" na poli. |
| 3 | **Rolling (hills)** | Klasická hospodářská krajina, táhlé oblé kopce (anglický venkov). |
| 4 | **Hilly** | Výraznější a strmější kopce než rolling hills. |
| 5 | **Uneven / Broken ground** | Nepravidelný rozbitý terén, malé hřebeny a prohlubně. |
| 6 | **Rugged** | Drsný terén — skály, prudké svahy. Konec procházky, začátek túry. |
| 7 | **Craggy** | Mnoho skalnatých výstupků (crags) a strmých útesů. |
| 8 | **Mountainous** | Hornatý terén s velkým převýšením, cesty diktovány hřebeny. |
| 9 | **Heavily dissected** | Krajina „rozřezaná" hustou sítí hlubokých údolí a ostrých hřebenů. |
| 10 | **Alpine / Jagged high-relief** | Ostré štíty, kolmé stěny, ledovcové zářezy. |

### Realizovatelnost — MVP vs. roadmap

| Stupně | Engine | Status |
|---|---|---|
| **0–5** | Value-noise heightmap (amplitude × frequency lerp + mulberry32 seeded) | MVP — plně. |
| **6–8** | Heightmap + ROCK_PIXEL overlay (sez. 17 už existuje, dispatchne dle relief intenzity) | MVP rozšíření po 0–5 funguje. |
| **9–10** | Vyžaduje **valley carving** / ridge noise (druhý průchod, eroze) | **Roadmap** — graceful degradation: `relief: 9..10` zatím renderuje jako 8 + konzolový warn. |

### Úkoly

- [ ] **`generateTerrain({ size, relief, surfaces, seed })`** — signature + JSDoc s tabulkou stupnice. Lokace: nový soubor `src/terrain.js` (oddělit od `main.js` — už je 3000+ řádků).
- [ ] **Value-noise engine** — mulberry32 grid samples + bilinear interpolation. `noise(x, z, freq, seed)` → [0, 1]. ~15 řádků.
- [ ] **Heightmap krok 1** — pro každé (x, z) spočítej `h = round(noise × amplitude(relief))`. Amplitude/frequency lookup table pro 11 stupňů.
- [ ] **Biome map krok 2** — druhý low-freq noise → seřazení cells dle noise → rozsek dle `surfaces` procent → exact match (souvislé klastry).
- [ ] **Y modifikace dle biome**: `grass = h`, `stone = h` (stejně), `sand = h − 1` (níž — pláž/údolí), `water = h − 2` (depression + plane flag).
- [ ] **Sloupcové vyplnění** — pravidlo „překryté = dirt/stone" (top voxel dle biome, dirt střed, stone dno).
- [ ] **Vodní plane(y)** — MVP 1×1 plane per water cell na `y = depression_top + 0.55`. Helper `createWaterPlane(w)` v `main.js`. Klastrování spojitých vodních cell přes flood-fill → bounding box až jako fáze 2.
- [ ] **ROCK_PIXEL overlay pro relief 6–8** — multipler na hustotu rock COMPOSITES v `populateNorthernScene`. Volat po heightmap kroku.
- [ ] **`buildScene` integrace** — `SCENE_LAYOUT` přestane být module-level const, stane se `const terrain = generateTerrain(...)`. `populateNorthernScene` a `topVoxelMap` čerpají z `terrain.blocks`.
- [ ] **Validace** — surfaces součet ≠ 1.0 → throw. relief mimo 0..10 → throw. size obsahuje 0 → throw.

### Otevřené body / decisions

- [ ] **Větev** — separátní `feat/terrain` nebo po merge `feat/factory` do main jako nová pracovní větev? (Doporučuje se počkat až factory toy fáze B doběhne.)
- [ ] **Voda jako třída?** — DD-32 kandidát `LIQUID extends CUBES` (vrstva 4 z DD-25, axis-aligned rectangular footprint, transparent material). Pro MVP zatím helper, model rozšíření až po validaci use-case.
- [ ] **Rampy autogenerated** — pokud heightmap dává step `grass(y) → grass(y+1)`, vložit TRRAMPS spojku s detekcí orientation. Stretch goal, fáze 2.
- [ ] **Tunely + paths** — současné `tunnel_0/1` a `path_0` jsou hardcoded v `buildScene` po `populateNorthernScene`. Autogenerace tunelů/cest by byla samostatný topic (procedural pathfinding přes heightmap).
- [ ] **Co s factory toy fasilitami** — flat region uvnitř kopcovitého terénu? Pre-flatten oblasti pro fasility, nebo vyžadovat `relief: 0` pro factory mode?

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

- [x] **`PATH` rozšíření**: `KIND ∈ "conveyor"|"pipeline"`, `SOURCE` / `SINK` instance ref, `RESOURCE` (explicit), `THROUGHPUT`. *(Sez. 22.)*
- [x] **PATH skutečně přemisťuje** items mezi `SOURCE.BUFFER` a `SINK.BUFFER` per tick (`pathTick(dt)`). *(Sez. 22.)*
- [x] **Material gate** — transformer pauzuje při chybějícím inputu (`PAUS chybí <r>`), RSUM při doplnění. *(Už ve fázi A; sez. 22 ověřeno přes real transport.)*
- [x] **`WORLD.TIME_SCALE` slider** v HUD — range 0..3, step 0.1, live update. *(Sez. 22.)*
- [x] **Migrace test scény** na PATH propojení: forest → conveyor → sawmill → conveyor → storage (smazán pre-stocked `BUFFER.logs = 50`). *(Sez. 22.)*
- [ ] **Material gate vizualizace** — emissive boost (červená/amber) na PAUSED fasilitách, lazy material clone à la hover. *(Sez. 22 odloženo do scope, dál sez. 23.)*
- [ ] **Druhý zdrojový řetězec** (parallel verification) — quarry → crusher → storage. Voda + uhlí zatím bez transformeru (jen těží a teče do skladu pipelinem). *(Sez. 23.)*
- [x] **Steady-state polish** — sawmill osciloval PAUS↔RSUM kvůli source-limited supply (forest 0.5/s vs. recipe 1/s spotřeba). **Sez. 23:** forest output 0.5 → 1.0 logs/s, 1:1 matchne sawmill recipe, žádný source-starve. Conveyor THROUGHPUT=2 ks/s zůstává nad rate, není bottleneck.

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
