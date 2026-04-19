# TheCubes

Meta-sandbox s živým OOP modelem. Na začátku existuje jediná instance třídy `OBJECTS` a prázdná scéna. Rozšiřováním modelu se svět zaplňuje — z jedné kostky může vzniknout Minecraft-like terén, Transport Tycoon, nebo automatizační továrna.

**Cíl:** ukázat, že tvorba je zábavnější než konzumace.

## Status

IDEA fáze dokončena. Pracujeme na milníku **M1 — statický svět s hodinami**:
- 3D scéna s jednou kostkou
- Ovládatelná kamera
- Globální čítač `TIME` tikající v HUDu
- Žádné chování, žádná pravidla — jen základ

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
