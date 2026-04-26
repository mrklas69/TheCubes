# SCENE2.md — Prompt: Animace 3 Stickmanů na louce

> Tento dokument je **brief pro AI agenta**, který se připojí čerstvě (bez
> historie) a má v projektu TheCubes implementovat Scénu 2: tři Stickmany
> na travnaté louce, každý v jiném anatomicky věrohodném pohybu.

---

## 1. Kontext projektu

**TheCubes** je meta-sandbox s živým OOP modelem postaveným na Three.js
(import map, žádný build). Cíl: demonstrovat, že tvorba je zábavnější než
konzumace. Vše procedurální — žádné importy hotových GLTF modelů, žádné
hotové animační knihovny.

**Klíčové soubory:**

| Soubor | Obsah |
|---|---|
| `index.html` | HTML shell, import mapa Three.js, HUD |
| `src/model.js` | Třídy `OBJECTS`, `CUBES`, …, `STICKMAN`, … |
| `src/main.js` | Three.js scéna, kamera, builder funkce, animátory, dispatch scén |
| `docs/CLAUDE.md` | Pravidla projektu (komentáře česky, KISS, DRY, izomorfismus) |
| `docs/DESIGN_DECISIONS.md` | DD-XX schválená rozhodnutí (immutable log) |
| `docs/GLOSSARY.md` | Terminologie |

**Code style — povinné:**

- **Komentáře česky.** Uživatel se učí JS i Three.js — vysvětlovat
  netriviální konstrukce.
- **KISS:** žádné předčasné abstrakce. Tři podobné řádky < jedna abstrakce.
- **DRY:** sdílené helpery pro opakované výpočty.
- **Default = no comments.** Komentář jen tam, kde *proč* není zřejmé.
- **Pojmenované konstanty** místo magic čísel (`WALK_PARAMS`, `WANDER_TIMERS`,
  …). Naming convention: `UPPER_SNAKE_CASE` pro konstanty.

---

## 2. Hierarchie modelu (zkráceně)

```
OBJECTS (ID, NAME, DESCRIPTION, ANIMATE)
 └── CUBES (X, Y, Z)
      ├── CCUBES, TCUBES, SPRITES, …
      └── COMPOSITES (3D mesh z primitivů)
            ├── CHARACTER (humanoid, dvou-segmentové končetiny)
            ├── NOODLE   (plastelínový, curve-based)
            └── STICKMAN (blokový low-poly, tři segmenty per končetina + obličej)
```

`ANIMATE` (DD-15) je atribut na `OBJECTS`: data-driven recept ve tvaru
`{ kind, ...params }`. Engine `ANIMATORS[kind]` dispatchuje na konkrétní
animátor. Animátor dostává `(object3d, anim, t)` kde `t` je
`performance.now() / 1000` (kontinuální wall-clock v sekundách).

---

## 3. STICKMAN — geometrie

V `function buildStickman(group, instance)` v `src/main.js`:

- **Trup:** `BoxGeometry(0.4, 0.5, 0.16)`.
- **Hlava:** `SphereGeometry(0.144, 16, 12)` + face plane (3 výrazy
  `:)` `:|` `:(`, přepínané randomně každé 2–5 s — engine watcher
  `faceUpdaters[]`).
- **Končetiny:** tři Group uzly per končetina (upper / lower / terminal),
  každý hinge se vlastním pivotem.

**`group.userData.parts` slovník (klíče, kterými adresuješ klouby):**

```
leftArm     rightArm     leftLeg      rightLeg
leftForearm rightForearm leftShin     rightShin
leftWrist   rightWrist   leftAnkle    rightAnkle
```

**Konvence rotací:**

- `rotation.x` = sagittal swing (vpřed / vzad). Default Three.js postava
  forward = lokální `−Z`. Limb visí v `−Y`. `rotation.x = +π/2` posune
  tip do `−Z` (vpřed).
- `rotation.z` = lateral abduction (do stran).
- Pivot `lower` Group sedí na konci `upper` (hinge = loket / koleno).
  Pivot `terminal` Group na konci `lower` (zápěstí / kotník).

---

## 4. Existující animátory (`ANIMATORS` mapa v `src/main.js`)

| Kind | Účel |
|---|---|
| `walk`, `sit` | Sdílené pose primitives (`applyWalkCycle`, `applySitPose`, …). |
| `wander` | Stavový automat (DD-18): walk / run / stand / sit / lie / work. |
| `pose_cycle` | **Neuspokojivý** pokus z sez. 13 — odstranit (viz §7). |

Sdílené pose primitives v `src/main.js`:
`applyWalkCycle`, `applySitPose`, `applyLiePose`, `applyWorkPose`,
`resetCharBase`, `moveTowards`. Pracují přímo s `rotation.x` kloubů.

---

## 5. Úkol

V `function buildSceneTwo(scene)` (existuje, momentálně v ní žije
`pose_cycle` demo k odstranění):

### 5.1 Tři Stickmany na louce

- Pozice: `X ∈ {−2.5, 0, +2.5}`, `Y = 0`, `Z = 0`.
- Tři rozlišitelné barvy (stávající: `0xcc3333`, `0x3366cc`, `0x33aa55`).
- Každý má **jiný `ANIMATE.kind`** — tři různé pohyby (níže).

### 5.2 Tři pohyby (každý jako vlastní animátor)

#### A) `stand_idle` — stoj s mikropohybem
- Těžiště se přenáší pomalu zleva doprava (period 4–5 s) — drobný posun
  pánve (`group.position.x` nebo lehký `rotation.z`).
- Paže mírně houpají (amplituda ≈ ±5°, period 2 s, fáze opačná než
  pánev).
- „Dýchání" — drobný `scale.y` na trupu (±2 %, period 3 s).

#### B) `slow_walk` — pomalá chůze na místě
- Klasický cross-pattern: `leftArm` ↔ `rightLeg` synchronně, `rightArm` ↔
  `leftLeg` synchronně.
- **Overlapping action:** `forearm` / `shin` lagují za `arm` / `leg`
  o ~15 % periody, amplituda ~60 % parent.
- `wrist` / `ankle` další lag, amplituda ~30 %.
- Pánev se mírně houpe nahoru-dolů (`group.position.y`, period =
  ½ kroku).
- Period 1.0 s. Amplituda ramene/kyčle ≈ ±25°.

#### C) `arm_wave` — vlna rukou (mexická vlna jednou paží)
- Pravá paže provádí kompletní arc:
  - shoulder.x klesá z +π (paže nahoru-vzad) přes 0 (paže dolů) k −π/2
    (vodorovně vpřed) a zpět.
  - Loket sleduje s lag ≈ 0.15 s, amplituda ≈ 50 % shoulder.
  - Zápěstí lag ≈ 0.30 s, amplituda ≈ 30 %.
- Levá paže klidně podél těla, mírná idle oscilace.
- Period 2.5 s.

### 5.3 Anatomická pravidla (povinná)

1. **Kolena se ohýbají dozadu** — `shin.rotation.x` v záporném směru
   relativně k thigh. (Kolena vpřed = nepřípustné, lidská anatomie.)
2. **Lokty se ohýbají dozadu/dovnitř** — `forearm.rotation.x` opačné
   znaménko než parent `arm` v napřímené fázi (ruka „dolů a dovnitř").
3. **Kotník kompenzuje ohyb kolena** — chodidlo zůstává horizontálně
   na zemi v stoji (`ankle.x = −shin.x`). Při chůzi se kotník dynamicky
   mění (heel-strike + toe-off).
4. **Ramena nepřesahují za záda** — `arm.rotation.x` v rozsahu
   `[−π, +π/2]` (paže od plně nahoře-vzad přes hangs-down až po
   horizontálně-vpřed).
5. **Hlava nezáklon přes 90°** — pokud animátor mění orientaci hlavy,
   držet v rozumném rozsahu.
6. **Žádný teleport** — všechny animace plynule cyklují (ne sekvence
   diskrétních póz).

### 5.4 Plynulost

- Bez jump cutů. Animace = kontinuální matematická funkce času (sin /
  cos s periodou).
- Pokud potřebuješ kombinovat víc cyklů, použij **fázové offsety**, ne
  if/else state machine.

---

## 6. Implementační poznámky

- **Pattern:** každý nový pohyb = nová funkce `animateXxx(object3d, anim, t)`.
  Přidat do `ANIMATORS` mapy. Instance Stickmana dostane
  `instance.ANIMATE = { kind: "stand_idle" }` (nebo s parametry pro lazení).
- **Sdílené helpery:** `oscPhase(t, period, offset)` (existuje),
  scratch vektory pro snížení alokací.
- **Hierarchie kostí — forward kinematic chain:** rameno (root) → loket
  → zápěstí. Lag mezi nimi = fázový offset v sin výpočtu.
- **Žádný keyframe systém / AnimationMixer** — vše procedurálně z `t`.
- **Pojmenované konstanty:** parametry (period, amplituda, lag) jako
  `STAND_IDLE_PARAMS`, `SLOW_WALK_PARAMS`, `ARM_WAVE_PARAMS` na vrcholu
  souboru, ne magic čísla v animátoru.

---

## 7. Co odstranit (sez. 13 attempts)

V `src/main.js` odstranit:

- `STICKMAN_POSES` lookup tabulka.
- `ensureTargetSlots`, `setStickmanPose`, `easeStickmanPose`.
- `animatePoseCycle` funkce.
- Konstanty `POSE_EASE_RATE`, `POSE_HOLD_MIN`, `POSE_HOLD_RANGE`,
  `POSE_INIT_JITTER`, `POSE_NAMES`.
- Klíč `pose_cycle: animatePoseCycle` z `ANIMATORS` mapy.

V `buildSceneTwo` odstranit současnou for-loop, která vytváří 3 stickmany
s `ANIMATE = { kind: "pose_cycle" }`. Nahradit za tři instance se třemi
různými novými `kind`y (stand_idle / slow_walk / arm_wave).

**Důvod odstranění:** generický „cyklus pozic s ease" produkoval
anatomicky neuspokojivé výsledky — pózy byly statické snapshoty s
hrubými přechody, vypadaly jako loutka. Anatomie vyžaduje **kontinuální
gait cycles** s overlapping action a fázovými lagy mezi klouby, ne
sekvenci diskrétních póz.

---

## 8. Acceptance criteria

- `?scene=2` ukáže tři rozlišitelné Stickmany na louce.
- Každý dělá jiný plynule cyklický pohyb (stand_idle / slow_walk /
  arm_wave).
- Vizuální kontrola: kolena vzad, lokty vzad, chodidla na zemi,
  ramena v rozumném rozsahu.
- Žádné jump cuty, žádné statické pózy (vše dýchá).
- Po ≥ 30 s pozorování nesmí být patrný „reset" cyklu (animace cyklí
  čistě v matematice `t`).
- Kód po `pose_cycle` cleanup je menší, ne větší (aditivní helpery
  + odstraněný neudržitelný systém).

---

## 9. Reference

- `docs/CLAUDE.md` — projektová pravidla.
- `docs/DESIGN_DECISIONS.md` — DD-15 (ANIMATE), DD-18 (CHARACTER mode slot),
  DD-20 (poseFns dispatch).
- `docs/diary/2026-04-23.md` sez. 10 — wander automat.
- `docs/diary/2026-04-24.md` sez. 12 — NOODLE/STICKMAN poseFns.
- `src/main.js` — `buildStickman` (geometrie), `applyWalkCycle`
  (existující walk gait — referenční pattern overlapping action).

---

*Vstup hotový. Čti, ptej se na nejasnosti, pak implementuj.*
