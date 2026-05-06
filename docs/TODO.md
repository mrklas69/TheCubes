# TODO

`[ ]` todo · `[~]` in progress · `[!]` priority · `[x]` done

## M1 — Statický svět s hodinami

- [x] Založit strukturu projektu (README, CLAUDE.md, docs/, src/)
- [x] `index.html` shell s import mapou pro Three.js
- [x] `src/model.js` — třídy `OBJECTS` a `CUBES`
- [x] `src/time.js` — globální `TIME` + `advanceTime()`
- [x] `src/main.js` — Three.js scéna, kamera, render loop, jedna kostka v (0,0,0)
- [x] HUD: `TIME: <tick>` v rohu
- [x] Ovládání kamery (OrbitControls)
- [x] Šachovnicová textura pro mateřskou CUBES (DD-07)
- [x] Infotip panel na hover (DD-08)
- [x] Ověřit v prohlížeči — kostka se zobrazí, kamera funguje, TIME tiká, infotip funguje
- [x] Osvětlení — DD-10 nahrazuje DD-09 (zleva shora)
- [x] `git init` + první commit (sez. 2, `ce50345` na `main`)

## M2 — Orientace + první potomek

- [x] **A)** `GridHelper` + `AxesHelper` ve scéně (orientační pomůcky).
- [x] **B)** První potomek `CUBES` — `TERRAIN` s atributem `COLOR` (JS number 0xRRGGBB). Override default šachovnice plochou barvou.
- [x] **B)** 3×3 grid: centrální `CUBES` (šachovnice), okolo 8 `TERRAIN` s duhovou paletou clockwise.
- [x] Ověřit, že infotip funguje generic i pro `TERRAIN` (ukáže `COLOR` formátované jako `#rrggbb`).
- [x] Zapsat DD-11 (vizualizační dispatch v engine, ne na třídě).

## M3 — COMPOSITES + strom, jednotný souřadný systém

- [x] DD-12: uvolnit DD-03, CUBES má float X/Y/Z, voxel renderer snap-to-grid.
- [x] DD-13: terminologie potomků CUBES (CCUBES, TCUBES, SPRITES, COMPOSITES).
- [x] Refactor `TERRAIN` → `CCUBES` (src + docs; DD-11/DIARY sez. 2 immutable, historická poznámka v GLOSSARY).
- [x] `COMPOSITES extends CUBES` v `src/model.js` — značkovací třída bez atributů.
- [x] `TREE extends COMPOSITES` — konkrétní instance.
- [x] `createMeshFor` rozšířit o COMPOSITES dispatch → `THREE.Group`.
- [x] `buildTree` — kmen + 3 kužely z Three.js primitivů.
- [x] Umístit `tree_0001` na (3, 0, 0) ve scéně.
- [x] Ověřit v prohlížeči: strom se vykreslí, infotip ukazuje třídu `TREE` + atributy, duha a středová kostka stále fungují.

## M4 — BALLOON mimo grid

- [x] `BALLOON extends COMPOSITES` s atributem `COLOR` (vak).
- [x] `buildBalloon` v enginu: vak (SphereGeometry) + koš (BoxGeometry) + 4 lana (CylinderGeometry). Helper `cylinderBetween(a, b, radius, mat)`.
- [x] Dispatch pro `BALLOON` v `createCompositeFor`.
- [x] Instance `balloon_0001` na **float** pozici — přesunuto na `(1, 3, 2)` pro dobrou projekci stínu (mimo grid, demonstrace DD-12).
- [x] Ověřit v prohlížeči: balón visí nad scénou, pozice nesnapovaná na int, infotip ukáže `BALLOON` + `COLOR` jako `#ff6b35`.
- [x] **Stíny** (bonus M4): `renderer.shadowMap` (PCFSoftShadowMap), `sun.castShadow` + ortho frustum + bias, ShadowMaterial ground plane, shadow flagy v `createMeshFor`. Sníženo `AmbientLight` 0.4 → 0.15 kvůli self-shadow kontrastu.

## M5 — SPRITES (dialog bubble)

- [x] `SPRITES extends CUBES` s atributem `ASSET` (default null).
- [x] `makeBubbleTexture(text)` — canvas 512×160 s zaobleným bílým rectem + komix ocáskem dolů. Vrací `{ texture, aspect, bubbleFraction }`.
- [x] `createSpriteFor(instance)` — `THREE.Sprite` + `SpriteMaterial`, scale z `bubbleFraction` aby bubble měla vizuální výšku ~0.5.
- [x] Dispatch v `createMeshFor` → SPRITES větev před CCUBES.
- [x] Instance `dialog_0001` nad stromem na (3, 2.2, 0) — text „Ahoj! Jsem mluvící strom."
- [x] DD-14 — dispatch ASSET podle typu (null/string).
- [x] Ověřit v prohlížeči: bublina se otáčí ke kameře, text čitelný, ocásek míří na strom, infotip ukáže `SPRITES` + `ASSET`.

## M6 — TCUBES (per-face textury)

- [x] `TCUBES extends CUBES` s šesti atributy `TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST` (default null).
- [x] `makeEmojiTexture(char)` — canvas 128×128 s emoji/textem vycentrovaným.
- [x] `faceMaterialFor(val)` — dispatch null/number/hex/string → materiál. Izomorfní s SPRITES.
- [x] `createTCubeFor(instance)` — BoxGeometry s 6 materiály v pořadí [+X,-X,+Y,-Y,+Z,-Z] mapované na EAST/WEST/TOP/BOTTOM/SOUTH/NORTH.
- [x] Dispatch v `createMeshFor` → TCUBES větev.
- [x] `formatValue` v infotipu: null → „—", number u COLOR/TEXTURE_* → hex.
- [x] Instance `tbox_0001` „Krabice s obsahem" (-3, 0, 0) — TOP 🌳, BOTTOM 🪵, 4 strany 📦.
- [x] Instance `tbox_0002` „Hvězda na vrchu" (-3, 0, 2) — jen TOP ⭐, ostatní fallback šachovnice.
- [x] DD-14 pokrývá i TCUBES dispatch (sdílený pattern s SPRITES).

## M7 — Chování v čase (ANIMATE dispatch)

- [x] DD-15 — atribut `ANIMATE` na `OBJECTS` (default null), data-driven dispatch v enginu (`{ kind, ...params }`).
- [x] Animators registry v `main.js` (`animators[]`, `registerAnimator`, `updateAnimations`).
- [x] Wall-clock `performance.now() / 1000` jako parametr animací (plynulý, nezávislý na FPS).
- [x] `cylinderBetween` refactor na unit-height + `scale.y`; extrahovat `updateCylinderBetween` pro per-frame mutaci.
- [x] `animateBalloonBob` — vak sinusově pohupuje (amp 0.15, period 4 s), koš nezávisle (amp 0.05, period 1.5 s, fáze π/2), lana přepočítávána každý frame.
- [x] `animateTreeSway` — 3 kužely koruny se pohupují v eliptickém XZ patternu (dvě nesoudělné periody 3.5 s a 2.7 s, amplituda 0.08 × koeficient výšky). Kmen statický.
- [x] `formatValue` v infotipu zobrazí `ANIMATE.kind` místo „[object Object]".
- [x] **Bubble fix:** `makeBubbleTexture` sloučen na jednu cestu (rect + trojúhelník), jediný `fill()` + `stroke()` → žádný černý proužek okraje přes ocásek. Odstraněn helper `roundRectPath`.

## M8+ — Později

- [x] Generický `rotate` animátor (`ANIMATORS.rotate`, přímá mutace `object3d.rotation`) + krabice `tbox_0001` rotující kolem Y (period 6 s). Ověřuje, že `ANIMATE` pattern funguje napříč třídami, ne jen COMPOSITES.
- [x] Generický `orbit_stadium` animátor — uzavřená oválná dráha (stadium pattern). `tbox_0002` „Hvězda na vrchu" obíhá kolem výchozí pozice (L=2, R=0.8, period 10 s), heading sleduje tečnu dráhy. Zavedl snapshot `object3d.userData.base` při `registerAnimator` — sdílený kontrakt pro transformační animátory.
- [x] Generický `pulse` animátor — mutace `material.emissive*` (třetí dimenze `ANIMATE` patternu: díly / transformace / materiál). Červená dlaždice `ccube_0001` pulsuje period 2 s / max 0.9, tyrkysová `ccube_0005` pomaleji (3.5 s / max 0.6, min 0.05) → desynchronizace ukazuje, že animátory běží nezávisle per-instance. Lazy init `emissive` barvy přes `userData.pulseInit`. Tyrkysová navíc sinusově mění `material.opacity` 0.25 → 1.0 (zapíná `transparent=true` lazy v init) → „dýchá".
- [x] **HOUSE** — statický COMPOSITES (kvádr stěn + jehlanová střecha ConeGeometry 4-segment). Atribut `COLOR` na stěny, střecha fixně rezavě červená. Dokončuje základní COMPOSITES trio (TREE + BALLOON + HOUSE). Instance `house_0001` (0, 0, -3) za růžicí.
- [x] **CLOUD + drift** — COMPOSITES shluk 5 koulí + nový `drift` animátor (lineární pohyb po jedné ose s wrap-around). Instance `cloud_0001` (0, 4.5, -2), drift po X, speed 0.6 j/s, range 16 (cyklus ≈ 26.7 s). Pátý `ANIMATE.kind` — první ne-periodický (wrap skok na hranici).
- [x] **Dynamický 3D ocásek SPRITES** (sez. 8, DD-16) — ocásek odstraněn z canvas textury, nahrazen tenkým 4-segmentovým jehlanem mimo sprite. Atributy `SPEAKER` (instance ref nebo `{x,y,z}` literál) + `SPEAKER_OFFSET_Y` (default 0.5). Registry `bubbleTails[]` + `meshByInstance` lookup → ocásek sleduje i pohyblivé cíle (`object3d.position` mutované animátory). `dialog_0001` přesunut mimo osu stromu (diagonální ocásek), nový `dialog_0002` mluví na orbitující `tbox_0002` (live tracking).
- [x] **ROCK** (sez. 8) — COMPOSITES shluk 5 nízkopoly icosahedronů (detail=0) s flat shading. Atribut `COLOR` (default šedá), paleta 3 odstínů (×1, ×0.75, ×1.2) se sdílenými materiály. Instance `rock_0001` (-3, 0, -2). Uzavírá COMPOSITES pětici.
- [x] **Nevizuální potomek OBJECTS** (sez. 9, DD-17) — `TIMER { INTERVAL, ACTION }`. První reakce na `TIME.tick` (otevírá DD-04). Engine registr `tickHandlers[]` + dispatch `ACTIONS[kind]` (`toggle`, `set`). `registerBehavior(instance)` symetrický k `scene.add(createMeshFor(...))`. Demo: `timer_0001` toggle `balloon1.LIT` každých 5 ticků.
- [x] **Lantern mode na BALLOON** (sez. 9) — atribut `LIT` (bool), PointLight uvnitř vaku (teplá 0xffb060, intenzita 10, castShadow = 2. shadow mapa vedle slunce), emissive na vaku. Engine fade watcher (`updateLit(dt)`) lerpuje exp. (~0.5 s). Toggle přes click na vak (raycaster `click` event) nebo přes TIMER.ACTION — oba mechanismy konvergují na stejný stav.
- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [x] **Edge highlight na hover** (sez. 9) — žluté hrany CUBES entity pod kurzorem (editor-like). `EdgesGeometry(geom, 20°)` + `LineSegments` s `depthTest=false` + `renderOrder=999` → X-ray look. Cache v `root.userData.edgeOverlays` (lazy build první hover, reuse). `raycast = () => {}` aby hrany neintrupovaly hover detekci. SPRITES skip (nemají smysluplné 3D hrany). **Sez. 10:** přepnuto na `depthTest=true` + `polygonOffset=-2/-2` → jen viditelné hrany (žádný X-ray).
- [x] **COUNTER v HUD** (sez. 9) — druhý nevizuální potomek OBJECTS, `VALUE + INCREMENT` per-tick. `registerCounter` dynamicky přidá HUD řádek přes `createElement` (ne `innerHTML` — XSS safe). Demo `counter_0001` „Skóre" start=0 inc=1. Demonstruje, že nevizuální entita může být observable přes HUD DOM (ne jen 3D scénu).
- [x] **CHARACTER + mode system** (sez. 10, DD-18) — humanoidní COMPOSITES s dvoudílnými končetinami (torzo válec, hlava koule, 4 končetiny s kulovým kloubem). ANIMATE slot rozšířen na „mode slot" — statické (`sit`, `lie`) i dynamické (`walk`) pózy pod jedním dispatchem. Sdílené pose primitives (`applyWalkCycle`, `applySitPose`, `applyLiePose`, `applyWorkPose`, `resetCharBase`, `moveTowards`).
- [x] **Wander stavový automat** (sez. 10, DD-18) — `ANIMATE.kind = "wander"` jako stavový automat uvnitř animátoru. 6 stavů: walk (random cíl v `bounds`), run (rychleji + větší amp), stand, sit, lie, work (approach k `subject` → perform sekání rukama). Random transitions, timer 2–8 s nebo stop & transition při kolizi/dosažení cíle.
- [x] **2D kolizní systém** (sez. 10, DD-19) — kruhy v XZ rovině. Dispatch-by-type radii (`collisionRadiusFor`): CHARACTER 0.2, TREE 0.35, HOUSE 0.85, ROCK/voxel 0.5, floating null. `isBlocked(moving, nx, nz)` lineární check, stop & transition (bez slidingu/pathfindingu). Pohyblivé colider-y čtou live `object3d.position`.
- [x] **@AUDIT:CODE po DD-17** (sez. 10) — 6 findings (F1–F6), opraveno F1 (registerLit do createMeshFor), F2 (odstraněn komentář tlačící k updaters[] refaktoru), F3 (uniform tickHandler signatura), F4 (konsolidace cleanup komentáře). F5 (LIT konstanty per-instance) a F6 (click handler raycast) ponechány jako INFO.
- [x] **Balloon light boost** (sez. 10) — `LIT_MAX_EMISSIVE` 1.5→2.0, `LIT_MAX_LIGHT` 10→30, PointLight distance 12→20, shadow map 512²→1024². Lampion svítí na celou scénu.
- [x] **@AUDIT:CODE po DD-18/19** (sez. 11) — 7 findings F1–F7, opraveno F1 (CHARACTER docstring v model.js zkrácen — DD-11 čistota), F2 (magic konstanty → pojmenované: `COLLISION_RADII`, `WANDER_TIMERS`, `WALK_PARAMS`/`RUN_PARAMS`, `WORK_POSE`, `LIE_GROUND_Y_DEFAULT`), F3+F4 (applyLiePose: parametrizovaný `groundY`, komentář vysvětlující odlišnou signaturu od parts-based pose primitives), F5 (komentář k `isBlocked` o first-come-first-served collision prioritě a pořadí `animators[]`), F6 (CHARACTER docstring doplněn o sit/lie/wander). F7 (DD-15 vs. DD-18 koncepční dluh — `STATE` atribut pro infotip visibility wander substate) zapsán níž jako kandidát DD.
- [x] **NOODLE** (sez. 12, DD-20) — humanoidní varianta „plastelínová": 2 CapsuleGeometry (tělo + hlava) + 4 TubeGeometry končetiny podél `CatmullRomCurve3`. Walk cycle mutuje kontrolní body křivky per-frame → rebuild TubeGeometry (dispose+new). Paže 4 uzly (rameno-loket-zápěstí-ruka) s forward Z offset v rest pose = mírně pokrčený loket; nohy 3 uzly. `applyNoodleWalkCycle` iteruje přes variabilní délku `currentCtrl` s lineárním shift factorem `i/(n-1)`. `char_0001` přehozen z CHARACTER na NOODLE.
- [x] **STICKMAN** (sez. 12, DD-20) — humanoidní varianta „blokový low-poly" podle user-dodané spec: `BoxGeometry` trup, 8×4 segmentová `SphereGeometry` hlava (~32 trojúhelníků), 6-segmentové `CylinderGeometry` končetiny, kostkové ruce a chodidla. **Plná 3-segmentová kostra** (rameno/loket/zápěstí, kyčel/koleno/kotník) — `applyWalkCycle` rozšířen o volitelné animation zápěstí/kotník (`if (p.leftWrist)`) s menší amplitudou (overlapping action). `applySitPose` kompenzuje ohyb kolena v kotníku (+π/2) → chodidlo horizontálně. `char_0004` „Stickman červený" na `(1, 0, 2.5)`.
- [x] **DD-20 `poseFns` dispatch** (sez. 12) — humanoidní varianty (CHARACTER, NOODLE, STICKMAN) sdílejí `ANIMATE` mode slot přes `group.userData.poseFns = { walkCycle, sitPose, liePose, workPose, reset }`. Animátory `walk`/`sit`/`wander` dispatchují přes poseFns místo přímého volání. NOODLE má vlastní pose implementaci (curve-based), STICKMAN re-usne CHARACTER primitives (hinge-based). Izomorfní s DD-14 a DD-11.
- [x] **STICKMAN polish** (sez. 13) — `WORK_POSE.centerAngle` sign fix (`-3π/4 → +3π/4`, axe-style chop forward), hlava `headR 0.18 → 0.144` (-1/5) + segmenty `(8,4) → (16,12)`, trup `BoxGeometry` Z `0.24 → 0.16` (sploštění o 1/3), **face plane** s 3 výrazy `:)` `:|` `:(` (PlaneGeometry před hlavou jako child, MeshBasicMaterial čitelný i ve stínu), nový `faceUpdaters[]` registry (3. engine-derived vedle bubbleTails a litEntities) přepíná každé 2–5 s na jiný výraz.
- [x] **Scene switcher** (sez. 13) — URL-based reload (`?scene=N`), `buildSceneOne(scene)` wrap kolem stávajícího setupu (řádky ~2310–2609), prázdný `buildSceneTwo(scene)` placeholder, dispatch z `URLSearchParams`. HUD tlačítka v pravém horním rohu s `aria-pressed` aktivním stavem. Reload (~100 ms) dělá cleanup zdarma — eliminuje cleanup-debt z F4 auditů (sez. 8/10/11).
- [x] **Scéna 2: travnatá louka** (sez. 13) — procedurální `makeGrassTexture` (canvas 256×256, 32×32 buněk po 8 px, paleta 5 zelených + žlutá s váženou distribuci, `RepeatWrapping` 3×3, `NearestFilter`). PlaneGeometry 10×10, `MeshStandardMaterial` matný, `receiveShadow`, lehce pod ShadowMaterial bootu (Y=-0.502).
- [x] **GLTF export** (sez. 13) — `window.exportStickman()` v console: dynamic `import("three/addons/exporters/GLTFExporter.js")`, najde první STICKMAN v scéně, stáhne `stickman.glb` do Downloads (vnořené Object3D uzly bez skeletonu — pro Blender pipeline).
- [x] **Gait animátory pro Scénu 2** (sez. 13) — tři standalone animátory inspirované Gemini referenčním demem: `walk_idle` (period 1.6 s, jednosměrné koleno přes `Math.max(0, sin)`, cross-pattern paže, drobný bob), `run_idle` (period 0.8 s, větší amplituda, lokty trvale pokrčené `-1.2`, trup naklon `+0.2`, výrazný bob), `squat_lift` (period 3.1 s, cycle `(sin+1)/2`, kolena vpřed, paže natažené k uchopení s Z osou `±0.2`, descend 0.6 + lean 0.4). Pojmenované konstanty `WALK_IDLE_PARAMS`, `RUN_IDLE_PARAMS`, `SQUAT_PARAMS`. Scéna 2 obsahuje 3 stickmany (Chodec červený, Běžec modrý, Dřepař zelený).
- [x] **`docs/SCENE2.md`** (sez. 13) — self-contained prompt pro fresh AI agenta (kontext projektu, geometrie STICKMANa, anatomická pravidla, acceptance criteria, co odstranit).
- [x] **Sez. 14 cleanup — humanoidi pryč** — STICKMAN, NOODLE, CHARACTER třídy + buildery + pose primitives + gait animátory (`walk_idle`/`run_idle`/`squat_lift`) + wander stavový automat + 2D kolizní systém (DD-19) + face plane registry + `window.exportStickman()` smazány z `src/main.js` a `src/model.js`. Důvod: humanoidi se přesunuli do samostatného projektu `./source/Stickman` (vlastní layered model + IK + Inspector — výrazně pokročilejší než kopie v TheCubes). Scéna 1 zůstala bez postav, Scéna 2 vyprázdněna na grass plane. DD-18/19/20 zůstávají v immutable logu. Smazáno ~1170 řádků z `main.js` (3096 → 1923).
- [ ] **Integrace externího Stickmana** — TBD způsob: `[A]` `.glb` import (Blender pipeline, sez. 13 export ostatně chyběl skeleton), `[B]` sibling ES module `../Stickman/src/...`, `[C]` jiné. Otevře novou DD při rozhodnutí.
- [ ] **Náhradní obyvatel scény 1 / scény 2** — bez humanoidů jsou scény vizuálně chudší. Možnosti: rozšířit COMPOSITES (BIRD na obloze, BUSH/FLOWER na louce), nebo nechat dokud není integrace Stickmana.
- [x] ~~Mobility design~~ — DROP (sez. 15, DD-23: bez humanoidů a po all-voxel pivotu rampy řeší přes VOXEL_MODEL `ramp-grass`).
- [ ] **`ACTION.kind: increment`** — *(přeneseno; relevantní pro TIMER+COUNTER kombinaci)*.
- [ ] **Editor fáze 2** — spawn/move/delete + registry cleanup. Po sez. 15 cleanup ještě jednodušší (žádné humanoidní wander/collision, žádný BALLOON click).
- [ ] CCUBES typizace (ICE/GRASS/SAND) *(možná, ale překryto DD-24 shape × surface — surface je obecnější)*.
- [x] ~~Zaoblené hrany voxelů~~ — DROP (sez. 15, DD-23: pixel-art voxel jazyk, zaoblení by likvidovalo styl).

## Sezení 14 (2026-05-05)

- [x] **Scéna 2 dioráma** — 10×10 voxelová podlaha (`SCENE2_LAYOUT` ~145 kostek: grass podlaha + hliněná zadní stěna s peaky + jeden stone block). Postavena interaktivně přes builder (LMB stavět, RMB bourat, 3 typy: tráva/hlína/skála + Export do clipboardu) — builder pak odstraněn, hotová dioráma hardcoded.
- [x] **Nové procedurální textury** — `:stone`, `:rail-top`, `:grass-side`. Refaktor `makePatchTexture` (jednolitý base + 1-2 px záplaty per cube) + `:grass-side` kompozit (14px dirt + 2px grass strip nahoře). DRY palette (DIRT_*, GRASS_*, STONE_*).
- [x] **Klávesové ovládání kamery** — WASD pan, Q/E rotace kolem cíle, Y/X zoom. Per-frame v render loopu, smooth dle dt. `heldKeys` Set + window keydown/keyup/blur listener.
- [x] **Tunelové oblouky** (sez. 14 v.1, později nahrazeno) — TUNNEL_ARCH třída + builder s half-torus rotated π/2 + scale.y 1.7 (Roman style). Připraveno na vlak. Class zůstává jako fallback, instance nahrazeny VOXEL_MODELem.
- [x] **WAREHOUSE + TRAIN třídy** — připraveny v model.js + buildery v main.js (kvádr stěn + jehlanová střecha à la HOUSE; lokomotiva + vagón se 16 koly). Zatím nepoužity ve scéně, čekají na fáze 2 (railway) + 3 (cargo).
- [x] **GridHelper + AxesHelper** odstraněny — orientační pomůcky M1/M2 už nepotřebujeme.
- [x] **Slunce** úhel 30° nad horizontem (Y=10→8).
- [x] **Shadow fix** — peter-panning na voxel boundaries: `normalBias` 0.02→0, `bias` -0.0005→-0.0001, `PCFSoftShadowMap`→`PCFShadowMap`. Tenké světelné proužky na styku kostek pryč.
- [x] **MagicaVoxel pipeline (DD-21)** — VOXEL_MODEL třída + `buildVoxelModel` (async OBJLoader+MTLLoader, auto-center XZ + bottom snap Y, NearestFilter pro pixel-art). První import: 2 auta (cars-0, cars-1). Pak tunel.
- [x] **Tools/exports** — 4 Node skripty: `dump-png-palette.mjs` (debug palety), `export-grass-vox.mjs` (TheCubes → MagicaVoxel grass cube template), `export-scene-palette-vox.mjs` (12-color palette swatches), `export-cars-vox.mjs` (jednoduchý sedan + truck šablona).
- [x] **DD-21 Vizuální zdroje hybrid** — formálně zafixováno: parametrizované entity → procedurální COMPOSITES, statická dekorace → VOXEL_MODEL default. GLOSSARY rozšířen o sekci „Vizuální zdroje" s tabulkou workflow rozhodnutí. CLAUDE.md Status + hierarchie aktualizovány.
- [x] **Stickman jako sibling projekt** — humanoidní vývoj přesunut do `./source/Stickman` (vlastní layered MVC + IK + Inspector, 13+ vlastních sezení). V TheCubes smazány všechny humanoidi (cleanup commit `7679fef`).
- [x] ~~Tunel re-coloring~~ — hotovo sez. 15 (`tunel-grass.vox` 48³ MV s plnou paletou, vyexportováno).
- [x] ~~2 simplifikovaná auta z .vox~~ — DROP (sez. 15, DD-23: cars smazány, vrátí se jen pokud bude potřeba).
- [x] ~~9 voxel modelů (stromy/kameny/trsy)~~ — pivot (sez. 15, DD-23): stromy řešeny pixel-voxel TREE.KIND-y (10 druhů), kameny + trsy přijdou jako další KIND-y nebo VOXEL_MODELy podle potřeby.
- [x] ~~Železnice mezi tunely~~ — implementováno (6 rail TCUBES) → odebráno (sez. 15, user request). Textura `:rail-top` zůstává v kódu jako template.
- [x] ~~Vlak na koleji + animace~~ — DROP (sez. 15, DD-23: TRAIN třída smazána).
- [x] ~~Cargo loading/unloading~~ — DROP (sez. 15, DD-23: WAREHOUSE+TRAIN smazány).
- [x] ~~VOXEL_MODEL pro Scénu 1~~ — N/A (sez. 15, DD-23: Scéna 1 smazána).

## Sezení 15 (2026-05-06)

- [x] **Železnice mezi tunely** *(implementováno + roll-back)* — 6 rail TCUBES voxelů na Z=−3, X=−3..2. `makeRailBlock` helper + FACTORIES dispatch. User po chvíli požádal o odebrání — vráceno na grass voxely, helper i FACTORIES entry odstraněny. Textura `:rail-top` v `NAMED_TEXTURE_FACTORIES` zachována jako template.
- [x] **`tunel-grass.vox` rename + smazání stale 16³** — z `tunel.vox` (16³ monochrom) → `tunel-grass.vox` (48³ MV s plnou paletou). User vyexportoval `tunel-grass.{obj,mtl,png}` v MagicaVoxelu.
- [x] **`export-grass-vox.mjs` přepis** — generuje 16³ kostku s povrchovými voxely odpovídajícími texturám (TOP `:grass-top`, BOTTOM `:dirt`, 4 boky `:grass-side` 14 px dirt + 2 px grass strip). Paleta 8 barev. Output: `cube-grass.vox`.
- [x] **10 pixel stromů** na předním řádku Z=4 — TREE třída rozšířena o `KIND` parametr; dispatch v `buildTree(group, instance)` přes `TREE_BUILDERS` lookup. KIND-y: `spruce`, `oak`, `birch`, `palm`, `bush`, `cypress`, `willow`, `bonsai`, `dead`, `maple`. Pixel size 0.125 j (= 1/8 TC voxelu = 12.5 cm). Helpery: `treeMat` cache, `treeVoxel`, `treeBlock`, `treeDiamond`. Sdílená BoxGeometry + materiály per barva.
- [x] **Animace větru pro pixel stromy** — `tree_sway` polymorfně rozšířen: classic větev smazána (s buildTreeClassic), pixel větev = per-children mutace s height-weighted amplitudou (`heightFactor = max(0, base.y + 0.5)`). Random fáze (`phaseX/Z`) per strom + nesoudělné periody → desync. Amplituda 0.16 j (= ~16 cm posun špičky, 4× původního návrhu).
- [x] **DD-22 — Pevné měřítko + Y konvence** — 1 TC voxel = 1 m, 1 MV voxel = 1/16 TC = 6.25 cm, default `SCALE: 0.625`. `instance.Y = world Y bottom of mesh = gy + 0.5` (top voxelu). Tabulka `Y vs grid_Y` v GLOSSARY.
- [x] **Grass rampa import** (`ramp-grass.vox/obj/mtl/png`, 16³ MV → 1×1×1 TC). Position (-4, -0.5, 0) — stojí na grass voxelu (-4,-1,0), vrch zarovnaný s top of grass (-5,0,0). Stoupá v -X směru. (Dříve grass-ramp; rename per DD-24.)
- [x] **DD-23 — All-voxel pivot („Kostičky")** — smazány non-voxel třídy: BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + Scéna 1 + scene switcher (URL ?scene=N) + LIT system (registerLit, updateLit, PointLight fade) + balloon_bob animátor + classic TREE varianta + cylinderBetween helpers + click handler. Cca **720 řádků smazáno** (`main.js` 2596 → 1919; `model.js` 7 tříd zmizelo). HTML scene-switcher CSS + DOM odebrán. Auto assets a `tools/export-cars-vox.mjs` smazány. ANIMATORS jen `tree_sway` (pixel) / `rotate` / `orbit_stadium` / `pulse` / `drift`.
- [x] **DD-24 — Shape × Surface separation** — VOXEL_MODELy s jednolitým povrchem rozděleny na shape (1 MV s abstract paletou 4 indexy: BASE/ACCENT1/ACCENT2/HIGHLIGHT) + surface (JSON paleta 4 RGBA). Plánovaný pre-build skript. Pojmenování `<shape>-<surface>` (kebab-case lowercase). Sez. 15 rename: `grass-cube` → `cube-grass`, `grass-ramp.*` → `ramp-grass.*`, `tunel-grass` zůstává. `.mtl` interní reference `map_Kd` taky aktualizován.

### Sez. 15 → sez. 16 Příště

- [ ] **Pre-build skript `tools/build-shapes.mjs`** — vstup: `assets/shapes/<name>.vox` (s abstract paletou 1–4) + `assets/surfaces/<name>.json` → výstup: `assets/built/<shape>-<surface>.{obj,mtl,png}` per kombinace. Engine spotřebovává pre-built (žádný runtime swap).
- [ ] **8 surface JSON palet** v `assets/surfaces/`: `grass`, `dirt`, `stone`, `sand`, `ice`, `water`, `brick`, `wood`. Každá: `{ BASE, ACCENT1, ACCENT2, HIGHLIGHT }` 4 RGBA hex.
- [ ] **Re-modelovat shapes na abstract paletu** — `cube`, `ramp`, `tunel` v MagicaVoxelu znovu, s 4 paletovými indexy (1=BASE, 2=ACCENT1, 3=ACCENT2, 4=HIGHLIGHT). Output: `assets/shapes/<name>.vox/.obj/.mtl/.png`. Surface-specific soubory smazat (až builder skript vyrobí built/).
- [ ] **WORLD entity** — singleton/instance s `WIND { strength, direction }`, `SUN { angle }`, `CLIMATE`, `SEASON`, `DAY { length_ticks, phase }`. `tree_sway` číst `WORLD.WIND.strength * MAX_WIND_AMP` místo per-strom amplitude. Sluneční pozice z WORLD.SUN.angle.
- [ ] **Biome palette + populate** — `BIOME_TREES[climate] = { kind: weight }`, `populateVegetation(world, region, density, variety)`. Místo hardcoded `TREE_KINDS_S2` v `buildSceneTwo`.
- [ ] **Pixel-voxel ekvivalenty smazaných tříd** *(až bude potřeba)* — lampion (BALLOON.LIT), dům, mrak, kámen. Per DD-23: nová třída se sub-builderem v dispatch tabulce (TREE.KIND-style).
- [ ] **GLOSSARY cleanup** — tabulka kategorií („Statická dekorace", „Parametrizovaná entita", „Animovaná entita") obsahuje smazané třídy (BALLOON/HOUSE/CLOUD) — aktualizovat na DD-23 stav.
- [ ] **`docs/IDEAS.md` review** — projít po sez. 15 cleanup, smazat zastaralé nápady (vázané na BALLOON/HOUSE/atd).
