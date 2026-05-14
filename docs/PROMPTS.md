# PROMPTS.md — Makra pro Claude (projekt TheCubes)

Projektově specifická makra. Globální makra (`%BEGIN`, `%END`, `%DOCS`, `%THINK`, `%AUDIT:CODE`, `%AUDIT:DOCS`) jsou v `~/.claude/PROMPTS.md` a platí i zde — projektový `%BEGIN`/`%END` níže je override globální kostry (přidává git sync detail + server spawn + audit cadence reporting).

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

**(2.5) Target use case check** *(pokud relevantní):*

Pokud sezení směřuje k **perf/stress test directionu** (FPS optimalizace, draw call reduction, shadow opt, InstancedMesh refactor, frustum culling, …), **PŘED nabídnutím směru se zeptej**: *„Jaká velikost gridu a climate priority je reálný workflow?"*

**Proč:** Per sez. 42 Censure — AI po celý perf diagnostic dive pracovala na 100×100 max stress jako implicit target, dokud user explicitně nezasáhl *„20×20 je real, neořezávat"*. Memory: [[project-target-use-case]] + [[feedback-target-use-case-check]]. Bez target check riskujeme rabbit hole + opts kompromitující visual quality pro irelevantní stress case.

**Skip krok**, pokud sezení směřuje k content/feature/refactor/audit/docs — target use case je relevant pouze pro perf-driven rozhodnutí.

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
  cd C:/Users/mrkla/source/TheCubes && python -m http.server 8000
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

**(3a.) Commit + push** na aktuální větev:
- Navrhni commit message (stručná, výstižná, česky).
- Commit + `git push` (od DD-30 sez. 21+ je default topic branch `feat/<topic>`, ne main).
- Při prvním push topic branch: `git push -u origin feat/<topic>` (Git napoví flag).

**(3b.) Merge rozhodnutí** *(jen pokud jsme na topic branch):*

Zeptej se: **Je úkol topic-branche dokončen?**
- **ANO** → merge do `main`:
  ```bash
  git checkout main && git merge --no-ff feat/<topic> -m "Merge feat/<topic>: <stručný popis>" && git push
  ```
- **NE** → zůstaň na topic branch, merge v dalším sezení.

`--no-ff` drží hranici topic branch viditelnou v `git log` (DD-30, sez. 21+). Bez něj se historie zploští na fast-forward a ztratí se kontext „toto byl topic blok".

Pokud git repo **neexistuje** (začátek projektu): doporuč `git init` + první commit.

**(4.) Paměť (auto memory):**
Zkontroluj, jestli ze sezení vzešly nové trvalé informace (nové preference, změny konceptu, referenční odkazy) — ulož do `~/.claude/projects/C--Users-mrkla-Source-TheCubes/memory/`.

**Co jsme dnes udělali:**
[Stručný výčet z konverzace — 3–6 bodů.]

---

*(Soubor průběžně rozšiřován o další makra, až budou potřeba.)*
