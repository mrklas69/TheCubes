# TheCubes

Meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance třídy `OBJECTS` a prázdná scéna. Rozšiřováním modelu se svět zaplňuje — z jedné kostky může vzniknout Minecraft-like terén, Transport Tycoon, nebo automatizační továrna.

**Cíl:** ukázat, že tvorba je zábavnější než konzumace.

## Status

Milníky M1–M7 hotové:
- **M1** — statický svět s hodinami (kostka, kamera, TIME, infotip).
- **M2** — orientační pomůcky + `CCUBES` (dřív `TERRAIN`) + 3×3 duhová růžice.
- **M3** — `COMPOSITES` + `TREE` (3D strom z primitivů); jednotný float souřadný systém (DD-12).
- **M4** — `BALLOON` mimo grid + stínovací systém (shadow map, PCF soft, ShadowMaterial ground plane).
- **M5** — `SPRITES` (dialog bubble nad stromem, canvas-generovaný text s komix ocáskem).
- **M6** — `TCUBES` (per-face textury, emoji krabice + hvězda s fallbackem na šachovnici); DD-14 dispatch podle typu atributu.
- **M7** — chování v čase: atribut `ANIMATE` na `OBJECTS` + data-driven dispatch (DD-15). Balón se pohupuje (vak + koš nezávisle, lana se přepočítávají), strom se kývá ve větru.

Další plán: diskrétní události (pravidla/timery reagující na `TIME.tick`), další `kind`y animací, nevizuální potomci OBJECTS.

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
