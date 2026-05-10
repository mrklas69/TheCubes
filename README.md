# TheCubes

Meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance třídy `OBJECTS` a prázdná scéna. Rozšiřováním modelu se svět zaplňuje — z jedné kostky může vzniknout Minecraft-like terén, Transport Tycoon, nebo automatizační továrna.

**Cíl:** ukázat, že tvorba je zábavnější než konzumace.

## Status

**Aktuálně:** jediná scéna — **10×10 dioráma** s **4-vrstvou taxonomií** (sez. 16, DD-25):

1. **Bloky** (1C grid, geologie) — TCUBES krychle, TRRAMPS klín, TTRAMPS jehlan, TTUNELS klenutý tunel; procedurální `BufferGeometry`, sdílená `:named-textures` paleta. Atribut `ORIENTATION` — float ∈ [0, 360) ve stupních (DD-26).
2. **Voxely** (1V = 1/16 C, dotvarba) — TREE.KIND (10 pixel sub-builderů), GRASS_TUFT, ROCK_PIXEL, LOG (sez. 17), plus VOXEL_MODEL (externí MV blob).
3. **Linie** — **PATH** (sez. 17, DD-27): Catmull-Rom spline + plochý strip mesh, `:path-dirt` textura. Plánováno TRACK.
4. **Objekty** *(plánováno)* — postavy, zvířata, stroje.

**Aktuální obsah scény:**
- ~145 TCUBES kostek z `SCENE_LAYOUT` (grass podlaha + hliněná zadní stěna s peaky + stone bloky)
- 2 TTUNELS klenuté tunely na Z=−3 (vstupy pro vlak)
- 1 TRRAMPS travnatá rampa, 1 TTRAMPS trojboký jehlan
- 1 PATH štěrková cesta z `tunnel_0` ven přes východní hranu (Catmull-Rom esíčko, 5 bodů)
- Procedurální severská dekorace — stromy (spruce/birch/dead/bonsai/bush), keře, trsy trávy, kameny, padlé kmeny; cca 60% grass topu, mulberry32(42) deterministická RNG, random ORIENTATION
- 2 SPRITES bubliny s dynamickým 3D ocáskem

**Hierarchie modelu**:

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z float)
 │    ├── BLOCKS (1C grid, ORIENTATION ∈ [0, 360) — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (TEXTURE × 6)
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)
 │    ├── COMPOSITES (voxel kompozice — ORIENTATION sdílena přes DD-26)
 │    │    ├── TREE (KIND — 10 pixel sub-builderů)
 │    │    ├── GRASS_TUFT (KIND — micro/short/fern)
 │    │    ├── ROCK_PIXEL (KIND — micro/small/medium/mossy)
 │    │    ├── LOG (KIND — stump/birch/pine)
 │    │    └── VOXEL_MODEL (ASSET, SCALE)
 │    └── PATH (KIND, POINTS — LINES vrstva 3, DD-27)
 ├── TIMER (INTERVAL, ACTION)
 └── COUNTER (VALUE, INCREMENT)
```

**Aktivní `ANIMATE.kind`y:** `tree_sway`, `rotate`, `orbit_stadium`, `pulse`, `drift`.

**Milníky:**
- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch.
- **M8+** průběžně (sez. 6–18): další `ANIMATE.kind`y, SPRITES.SPEAKER tracking (DD-16), TIMER + COUNTER (DD-17), MagicaVoxel pipeline (DD-21), pevné měřítko (DD-22), all-voxel pivot (DD-23), shape × surface separation (DD-24), 4-vrstvá taxonomie + BLOCKS rodina (DD-25), sjednocená ORIENTATION (DD-26), PATH třída (DD-27), sjednocená Y konvence (DD-28).

Detail v `CLAUDE.md` (Status), `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-28).

**Plán:** WORLD entity (WIND/SUN/CLIMATE/SEASON); BUILDING (vrstva 2); TRACK (vrstva 3 sourozenec PATH); editor fáze 2.

## Stack

- Frontend: HTML + JS modules + Three.js (import map, bez build stepu)
- Backend: zatím žádný

## Running

Potřebuješ lokální HTTP server (CORS blokuje ES modules z `file://`):

```bash
# Varianta A — Python
python -m http.server 8000

# Varianta B — Node (pokud máš npx)
npx serve .
```

Pak otevři `http://localhost:8000/` v prohlížeči.

## Dokumenty

- `CLAUDE.md` — projektové instrukce pro AI
- `docs/TODO.md` — aktivní úkoly
- `docs/IDEAS.md` — raw nápady
- `docs/GLOSSARY.md` — terminologie
- `docs/DESIGN_DECISIONS.md` — schválená rozhodnutí
- `docs/DIARY.md` — log sezení
