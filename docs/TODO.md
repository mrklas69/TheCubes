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
- [ ] Dynamický 3D ocásek SPRITES (mířit na mluvčího i když bublina není přímo nad).
- [ ] Další COMPOSITES: HOUSE, ROCK, CLOUD (CLOUD by mohl dostat `ANIMATE: { kind: "drift" }`).
- [ ] Další `kind`y animací: `pulse` (CCUBES světla emisivně bliká), `drift` (CLOUD letí po ose).
- [ ] `WCUBES` wireframe varianta *(nápad, možná)*.
- [ ] `INVISIBLE` potomek CUBES *(možná zbytečné)*.
- [ ] Nevizuální potomek OBJECTS (např. `TIMER`, `COUNTER`) — až bude přirozená potřeba.
- [ ] CCUBES typizace (ICE/GRASS/SAND) *(možná)*.
