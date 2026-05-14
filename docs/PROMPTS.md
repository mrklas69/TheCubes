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

## %CALIBRATE — Kalibrace AI spolupracovníka

> **Sez. 48 port z PocketStory** (`~/source/PocketStory/docs/PROMPTS.md`) + adaptace pro TheCubes scope (solo dev, JS+Three.js sandbox, single-machine, žádné `.claude/skills/`, žádné `CONTEXT.md`). Sez. 39 audit `%CALIBRATE` droplo jako *„PocketStory-specific"*; sez. 48 ho user explicit vrátil pro M-Genesis arc Fáze 4. Memory `[[feedback_memory_drift_cross_check]]` zachytil drift pattern.

Proveď meta-audit vlastní efektivity jako AI spolupracovník a optimalizuj řídící dokumenty. **Přečti vše potřebné sám** — globální + projektový `CLAUDE.md`/`PROMPTS.md`, posledních 5-10 diary záznamů, `MEMORY.md` (auto-memory index), `IDEAS.md`, `TODO.md`, `docs/DESIGN_DECISIONS.md` (jen recent DD), `docs/GLOSSARY.md` header.

### A) Řídící docs hygiene

- **`~/.claude/CLAUDE.md`** (globální): aktuální? Chybí konvence, které se opakovaně řeší ad-hoc v TheCubes (např. sed range delete risks, browser smoke test po cleanup)? Tone & Feedback ratio 80/20 aplikováno bilaterálně?
- **`CLAUDE.md`** (projektový overlay): Key Files mapa sync se src/ (po sez. 48 = 8 tříd model)? %THINK rozšíření (5. bod procedural/sandbox) stále relevantní?
- **`~/.claude/PROMPTS.md`** (globální maker): jsou makra `%BEGIN`/`%END`/`%THINK`/`%AUDIT:CODE`/`%AUDIT:DOCS`/`%DOCS` aktuální? Mělo by být přidáno makro pro pattern, který se opakovaně řeší ad-hoc?
- **`docs/PROMPTS.md`** (projektový override): `%BEGIN` server spawn detail, target use case check (sez. 42 addendum), `%END` commit+push (TheCubes-specific override). `%CALIBRATE` definice (toto makro) aktuální?
- **`.claude/settings*.json`** (pokud existují): permissions, hooks, env vars. Žádné automation gaps po `%END`?
- **`MEMORY.md` index** (`~/.claude/projects/.../memory/`): drift po sez. 48 cleanup (memory zmínky SPRITES/PATH/TIMER/COUNTER/ANIMATE — aktivní vs. dropnuté), broken `[[link]]` references, duplicity, zastaralé date references.

### B) Process review

- **Posledních 5-10 diary záznamů**: opakující se vzory, bottlenecks, false starts, regrese po cleanup, sed range delete incidents.
- **`%BEGIN`/`%END` sekvence**: target use case check (sez. 42 addendum), git sync first step (sez. 39 mandatory), server spawn last step. Funguje stále optimal po sez. 48 4-commit flow?
- **Audit cadence prahy správné?** `%AUDIT:CODE` 8 sezení (sez. 38, 46, 48), `%AUDIT:DOCS` 10 sezení (sez. 39, 48), IDEAS/TODO/DONE pruning 12 sezení (sez. 43, 48). User-driven override (sez. 48) vs. cadence trigger pattern. Threshold čísla ještě dávají smysl?
- **Multi-session days pattern** (sez. 41-48 = 8 sezení dne 2026-05-14): vysoká kadence solo dev. PROMPTS.md `%BEGIN` *„rychlejší re-entry"* sub-prah? DIARY.md index mega-řádky (TODO sub-prah ř. 78, sez. 39 audit follow-up).
- **Token efektivita** — `~/.claude/CLAUDE.md` (~70 ř.), projektový `CLAUDE.md` (~33 ř.), `MEMORY.md` index (~25 ř.), `README.md` (~85 ř.), `GLOSSARY.md` (~190 ř.). Load size na sezení. Balast načítaný nezbytně?

### C) Collaboration retrospective

- **Kudos!/Censure! ratio** — aktivní oboustranně. Sez. 42 / 46 / 48 Censure! patterns: target use case check before perf, memory drift cross-check, sed range delete verification, browser smoke test po cleanup. Sub-prah pro novou globální feedback memory?
- **Plán+Q → Go pattern** (`feedback_plan_then_go`) — používán bilaterálně, sez. 35-48 ~15+ aplikací. Funguje rychle nebo má frikce?
- **Default-oponovat 80/20** — TheCubes-specific aplikace. Příklady kdy AI oponovala (DD-32 pivot, target use case sez. 42, BatchedMesh oponován sez. 32). Pattern aktivně držený nebo drift k pochlebování?
- **5-entitní pattern aplikace** (pre-DD-32 PocketStory pattern) — TheCubes po sez. 48 cleanup = 8 tříd (OBJECTS/CUBES → BLOCKS/COMPOSITES/LIQUID + WORLD). Konsistent s „minimální set entit per koncept" princip nebo over/under-engineered?
- **Sed range delete risks** — sez. 15 `buildVoxelModel` accidental delete, sez. 48 TAU regrese (Animator section sed delete smazal i konstantu used mimo scope). Sub-prah pre-`sed Nd` grep symbol uses v range proti rest of file?
- **Browser smoke test po cleanup** — sez. 48 naivní HTTP 200 check ≠ runtime OK. F12 console error scan nutný pro frontend cleanup commits. Sub-prah `%END` enhancement?

### Výstup

Seřazený seznam nálezů s prioritou (kritické / doporučené / kosmetické) + konkrétními návrhy (úpravy souborů, změny workflow, nová memory, nová pravidla v CLAUDE.md/PROMPTS.md). **Neopravuj nic bez odsouhlasení uživatele** — `%CALIBRATE` je read-only meta-audit + návrh fáze, implementace samostatným commitem.

### Cadence

`%CALIBRATE` nemá automatickou cadence (na rozdíl od `%AUDIT:CODE`/`%AUDIT:DOCS`). Spouští se **user-driven trigger** nebo jako součást ceremonii (např. M-Genesis arc Fáze 4).

---

## Audit cadence policy (TheCubes adaptation)

Globální `~/.claude/PROMPTS.md` definuje `%AUDIT:CODE` / `%AUDIT:DOCS` s implicit cadence threshold trackingem (každých N sezení). V TheCubes solo dev kadenci (sez. 41-48 = 8 sezení v jeden den) jsou tyto thresholdy **secondary** — primární trigger je vždy **user-driven**:

- **Primary trigger:** user explicit *„spusť `%AUDIT:CODE`"* nebo součást ceremonii (M-Genesis arc Fáze 1/2/4).
- **Secondary trigger** *(rainy-day hint)*: cadence threshold (`%AUDIT:CODE` 8 sezení, `%AUDIT:DOCS` 10 sezení, IDEAS/TODO/DONE pruning 12 sezení). Pokud žádný user-driven trigger nepřišel a threshold přetekl, AI při `%BEGIN` flagne *„cadence overflow N/M sezení — kandidát pro %AUDIT:* spuštění"*.

**Why:** Sez. 38 byl `%AUDIT:CODE` na cadence (8/8), sez. 46 byl user-driven trigger (7/8), sez. 48 byl user-driven (1/8). Reálná data = user-driven dominuje. Cadence jako *„kdyby AI ne-flagnula, user by někdy zapomněl auditovat"* zachycuje 1/3 případů.

**Track:** Cadence counter v `docs/TODO.md` `## Audit cadence` sekci, reset při každém run (user-driven nebo cadence trigger).

---

## `%BEGIN-FAST` — Rychlé re-entry pro multi-session days (sub-prah)

> **Sub-prah, neaktivní default.** Spustit jen pokud user explicit napíše `%BEGIN-FAST` nebo *„rychlý start"*. Pro multi-session days (sez. 41-48 = 8 sezení/den) plný `%BEGIN` ritual opakován 8× zbytečně.

Zkrácená `%BEGIN` sekvence:

1. **Git sync** *(zachovat, vždy povinné)* — `git fetch && git status`.
2. **Last diary tail** — `tail -30 docs/diary/$(date +%F).md` (= tail dnešního sezení).
3. **Server check** — `netstat -ano | grep ':8000'` (skip pokud listening).
4. *(Skip:)* read TODO/IDEAS/GLOSSARY/DESIGN_DECISIONS, target use case check, Kudos!/Censure! reminder, summary z Příště.

**Trigger podmínka pro AI návrh** v normálním `%BEGIN`: pokud `git log -1 --format=%cr` říká *„X hours ago"* a X < 6, AI po kroku (1) Git sync navrhne *„poslední commit X h zpět — chceš `%BEGIN-FAST` nebo plný `%BEGIN`?"*.

---

*(Soubor průběžně rozšiřován o další makra, až budou potřeba.)*
