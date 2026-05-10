# PROMPTS.md — Makra pro Claude (projekt TheCubes)

Projektově specifická makra. Globální makra (`%THINK`, `%AUDIT:CODE`, `%AUDIT:DOCS`) jsou v `~/.claude/CLAUDE.md` a platí i zde.

---

## %BEGIN — Zahájení sezení

Zahajujeme nové sezení na projektu TheCubes.

**(1.) Git sync** *(povinný první krok — repo existuje od sez. 2):*

```bash
git add . && git stash save "Auto-stash before pull" && git pull && (git stash pop || true)
```

Pokud pracovní strom je čistý, stash je no-op a `git pull --ff-only` stačí. Konflikty: vyřeš, pak `git stash drop`.

**Proč je to povinné:** paměť i lokální diář mohou být několik commitů pozadu za `origin/main` (práce z jiného stroje / session). Před plánováním dalšího kroku je potřeba čerstvý stav, jinak hrozí, že navrhneme něco, co je už hotové.

**(2.) Kontext** — nastuduj:
- `docs/TODO.md` — co je rozděláno a čeká
- `docs/DIARY.md` + poslední `docs/diary/YYYY-MM-DD.md` — kontext posledního sezení
- `docs/GLOSSARY.md` — aktuální terminologie
- `docs/DESIGN_DECISIONS.md` — schválená rozhodnutí (DD-XX)

**(3.) Shrnutí:**
Vypiš sekci **Příště** z posledního diáře jako první bod programu a navrhni, čím začneme.

**Stale Příště check:** Pokud se položka opakuje v Příště ≥ 5 sezení po sobě, eskaluj: **⚠ Stale Příště (N sezení) — rozhodnout: DO nebo DROP.**

**(4.) Připomenutí:**
- **Kudos!/Censure! feedback je aktivní** (oboustranný — AI smí hodnotit i uživatele).
- Poměr kritika/pochlebování **80/20** — žádné úvodní lichotky.

**(5.) Spusť server** *(povinný poslední krok):*

Nejdřív zkontroluj, jestli na portu 8000 něco poslouchá:

```bash
netstat -ano | grep ':8000'
```

- **Prázdný výstup** → spusť server v background:
  ```bash
  cd C:/Users/mrkla/Source/TheCubes && python -m http.server 8000
  ```
- **Něco poslouchá** → OK, nic nedělej.

V obou případech vypiš: **Server běží: http://localhost:8000/**

Pokud spuštění selže (port obsazený jiným procesem, chybí Python, …), vypiš chybu a vyzvi uživatele, ať server spustí ručně.

---

## %END — Ukončení sezení

Uzavíráme toto sezení na TheCubes.

**(1.) Dokumentace — důsledně všechny dotčené soubory:**
- `docs/TODO.md` — aktualizuj stavy `[x]` / `[~]` / `[ ]`, přidej nové úkoly.
- `docs/DIARY.md` — přidej řádek do indexu (datum + shrnutí sezení).
- `docs/diary/YYYY-MM-DD.md` — vytvoř nebo doplň záznam sezení: **Diskuse**, **Rozhodnutí**, **Kód**, **Kudos/Censure**, **Příště**. Pokud dnes už existuje soubor (více sezení za den), přidej `## Sezení N` sekci — nikdy nevytvářej soubor se suffixem b/c/d.
- `docs/GLOSSARY.md` — doplň nové termíny.
- `docs/DESIGN_DECISIONS.md` — nová `DD-XX`, pokud padlo závazné rozhodnutí (immutable log — staré DD neměnit).
- `docs/IDEAS.md` — raw nápady; značky `→ TODO` / `→ DONE` u dozralých.
- `README.md`, `CLAUDE.md`, `PROMPTS.md` — jen pokud se přímo dotýkají dnešní práce.

**(2.) Kód:**
- Žádné `console.log` / debug výpisy v `src/` (pokud nejsou záměrné).
- Žádné zakomentované bloky kódu.
- **Grep po rename konceptu** — pokud sezení zahrnovalo přejmenování:
  ```bash
  grep -rn "STARÝ_NÁZEV" docs/ src/ *.md *.html
  ```

**(3.) Git:**

Pokud git repo **existuje**:
- Navrhni commit message (stručná, výstižná, česky).
- Commit na větev `main`.
- `git push` (pokud existuje remote).

Pokud git repo **neexistuje** (začátek projektu): doporuč `git init` + první commit.

**(4.) Paměť (auto memory):**
Zkontroluj, jestli ze sezení vzešly nové trvalé informace (nové preference, změny konceptu, referenční odkazy) — ulož do `~/.claude/projects/C--Users-mrkla-Source-TheCubes/memory/`.

**Co jsme dnes udělali:**
[Stručný výčet z konverzace — 3–6 bodů.]

---

*(Soubor průběžně rozšiřován o další makra, až budou potřeba.)*
