# TheCubes

Meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance třídy `OBJECTS` a prázdná scéna. Rozšiřováním modelu se svět zaplňuje — z jedné kostky může vzniknout Minecraft-like terén, Transport Tycoon, nebo automatizační továrna.

**Cíl:** ukázat, že tvorba je zábavnější než konzumace.

## Status

**Aktuálně:** jediná scéna — **10×10 dioráma** s **4-vrstvou taxonomií** (sez. 16, DD-25):

1. **Bloky** (1C grid, geologie) — TCUBES krychle, TRRAMPS klín, TTRAMPS jehlan, TTUNELS klenutý tunel; procedurální `BufferGeometry`, sdílená `:named-textures` paleta.
2. **Voxely** (1V = 1/16 C, dotvarba) — TREE.KIND (10 pixel sub-builderů), plus VOXEL_MODEL (externí MV blob).
3. **Linie** *(plánováno)* — PATH, TRACK pro cesty/koleje.
4. **Objekty** *(plánováno)* — postavy, zvířata, stroje.

**Aktuální obsah scény:**
- ~145 TCUBES kostek z `SCENE2_LAYOUT` (grass podlaha + hliněná zadní stěna s peaky + stone bloky)
- 2 TTUNELS klenuté tunely na Z=−3 (vstupy pro vlak)
- 1 TRRAMPS travnatá rampa, 1 TTRAMPS trojboký jehlan
- 10 pixel stromů (`spruce`/`oak`/`birch`/`palm`/`bush`/`cypress`/`willow`/`bonsai`/`dead`/`maple`) s kymácením ve větru
- 2 SPRITES bubliny s dynamickým 3D ocáskem

**Hierarchie modelu**:

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 ├── CUBES (X, Y, Z float)
 │    ├── BLOCKS (1C grid)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (TEXTURE × 6)
 │    │    ├── TRRAMPS (TEXTURE × 5, ORIENTATION)
 │    │    ├── TTRAMPS (TEXTURE × 4, ORIENTATION)
 │    │    └── TTUNELS (TEXTURE × 4, ORIENTATION)
 │    ├── SPRITES (ASSET, SPEAKER, SPEAKER_OFFSET_Y)
 │    └── COMPOSITES (voxel kompozice)
 │         ├── TREE (KIND — 10 pixel sub-builderů)
 │         └── VOXEL_MODEL (ASSET, SCALE, ROTATION_Y)
 ├── TIMER (INTERVAL, ACTION)
 └── COUNTER (VALUE, INCREMENT)
```

**Aktivní `ANIMATE.kind`y:** `tree_sway`, `rotate`, `orbit_stadium`, `pulse`, `drift`.

**Milníky:**
- **M1–M7** hotové (sez. 1–5): statický svět, voxelové potomky, COMPOSITES, SPRITES, TCUBES, ANIMATE dispatch.
- **M8+** průběžně (sez. 6–16): další `ANIMATE.kind`y, SPRITES.SPEAKER tracking (DD-16), TIMER + COUNTER (DD-17), MagicaVoxel pipeline (DD-21), pevné měřítko (DD-22), all-voxel pivot (DD-23), shape × surface separation (DD-24), 4-vrstvá taxonomie + BLOCKS rodina (DD-25).

Detail v `docs/CLAUDE.md` (Status), `docs/DIARY.md` (chronologie sezení), `docs/DESIGN_DECISIONS.md` (DD-01 až DD-25).

**Plán:** vrstva 2 — pixel-voxel BUILDING / ROCK_PIXEL / CLOUD; vrstva 3 — LINES (PATH, TRACK); editor fáze 2; WORLD entity (WIND/SUN/CLIMATE).

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
