# TheCubes

Meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance třídy `OBJECTS` a prázdná scéna. Rozšiřováním modelu se svět zaplňuje — z jedné kostky může vzniknout Minecraft-like terén, Transport Tycoon, nebo automatizační továrna.

**Cíl:** ukázat, že tvorba je zábavnější než konzumace.

## Status

Milníky M1–M7 hotové, M8+ průběžně (sez. 6–12):
- **M1** — statický svět s hodinami (kostka, kamera, TIME, infotip).
- **M2** — orientační pomůcky + `CCUBES` + 3×3 duhová růžice.
- **M3** — `COMPOSITES` + `TREE`; jednotný float souřadný systém (DD-12).
- **M4** — `BALLOON` mimo grid + stínovací systém (shadow map, PCF soft).
- **M5** — `SPRITES` (dialog bubble nad stromem, canvas-generovaný text).
- **M6** — `TCUBES` (per-face textury); DD-14 dispatch podle typu atributu.
- **M7** — chování v čase: atribut `ANIMATE` + data-driven dispatch (DD-15).

M8+ (průběžně): **`HOUSE`**, **`CLOUD`**, **`ROCK`** (pětice COMPOSITES); další `ANIMATE.kind`y (`rotate`, `orbit_stadium`, `pulse` s opacity, `drift` wrap-around). **SPEAKER dynamický 3D ocásek bubliny** (DD-16). **`TIMER`** + **`BALLOON.LIT` lantern** (DD-17 — diskrétní `TIME.tick` reakce přes `ACTION`). **`COUNTER`** v HUD. Edge highlight na hover. **`CHARACTER`** + wander stavový automat (DD-18) + 2D kolizní systém (DD-19).

**Humanoidní varianty (sez. 12, DD-20):** kromě CHARACTER (hinge-based kloubová postavička) jsou k dispozici **`NOODLE`** (plastelínová: CapsuleGeometry tělo + TubeGeometry končetiny podél CatmullRomCurve3 — walk cycle mutuje ctrl body per-frame) a **`STICKMAN`** (blokový low-poly: kvádr trup, 8×4 sphere hlava, 6-seg válce končetin, kostkové ruce/chodidla; plná 3-segmentová kostra s animovaným zápěstím/kotníkem). Všechny tři sdílejí `ANIMATE` mode slot přes `poseFns` callback mapu v `userData`.

Další plán: sekvenční chování (zvedání/pokládání), `STATE` atribut pro wander substate visibility (DD-21 kandidát), mobility design (rampy / graf / splines), editor fáze 2.

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
