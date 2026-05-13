# DONE — Hotové úkoly

Archiv splněných úkolů z `docs/TODO.md`. DROP položky (zrušené nápady) jsou zde s odkazem na rozhodnutí pro budoucí kontext. Detaily sezení v `docs/diary/YYYY-MM-DD.md`, designová rozhodnutí v `docs/DESIGN_DECISIONS.md`.

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

## M8+ — Hotové

- [x] Generický `rotate` animátor (`ANIMATORS.rotate`, přímá mutace `object3d.rotation`) + krabice `tbox_0001` rotující kolem Y (period 6 s). Ověřuje, že `ANIMATE` pattern funguje napříč třídami, ne jen COMPOSITES.
- [x] Generický `orbit_stadium` animátor — uzavřená oválná dráha (stadium pattern). `tbox_0002` „Hvězda na vrchu" obíhá kolem výchozí pozice (L=2, R=0.8, period 10 s), heading sleduje tečnu dráhy. Zavedl snapshot `object3d.userData.base` při `registerAnimator` — sdílený kontrakt pro transformační animátory.
- [x] Generický `pulse` animátor — mutace `material.emissive*` (třetí dimenze `ANIMATE` patternu: díly / transformace / materiál). Červená dlaždice `ccube_0001` pulsuje period 2 s / max 0.9, tyrkysová `ccube_0005` pomaleji (3.5 s / max 0.6, min 0.05) → desynchronizace ukazuje, že animátory běží nezávisle per-instance. Lazy init `emissive` barvy přes `userData.pulseInit`. Tyrkysová navíc sinusově mění `material.opacity` 0.25 → 1.0 (zapíná `transparent=true` lazy v init) → „dýchá".
- [x] **HOUSE** — statický COMPOSITES (kvádr stěn + jehlanová střecha ConeGeometry 4-segment). Atribut `COLOR` na stěny, střecha fixně rezavě červená. Dokončuje základní COMPOSITES trio (TREE + BALLOON + HOUSE). Instance `house_0001` (0, 0, -3) za růžicí.
- [x] **CLOUD + drift** — COMPOSITES shluk 5 koulí + nový `drift` animátor (lineární pohyb po jedné ose s wrap-around). Instance `cloud_0001` (0, 4.5, -2), drift po X, speed 0.6 j/s, range 16 (cyklus ≈ 26.7 s). Pátý `ANIMATE.kind` — první ne-periodický (wrap skok na hranici).
- [x] **Dynamický 3D ocásek SPRITES** (sez. 8, DD-16) — ocásek odstraněn z canvas textury, nahrazen tenkým 4-segmentovým jehlanem mimo sprite. Atributy `SPEAKER` (instance ref nebo `{x,y,z}` literál) + `SPEAKER_OFFSET_Y` (default 0.5). Registry `bubbleTails[]` + `meshByInstance` lookup → ocásek sleduje i pohyblivé cíle (`object3d.position` mutované animátory). `dialog_0001` přesunut mimo osu stromu (diagonální ocásek), nový `dialog_0002` mluví na orbitující `tbox_0002` (live tracking).
- [x] **ROCK** (sez. 8) — COMPOSITES shluk 5 nízkopoly icosahedronů (detail=0) s flat shading. Atribut `COLOR` (default šedá), paleta 3 odstínů (×1, ×0.75, ×1.2) se sdílenými materiály. Instance `rock_0001` (-3, 0, -2). Uzavírá COMPOSITES pětici. *(Smazáno sez. 15, DD-23 — pixel-voxel pivot.)*
- [x] **Nevizuální potomek OBJECTS** (sez. 9, DD-17) — `TIMER { INTERVAL, ACTION }`. První reakce na `TIME.tick` (otevírá DD-04). Engine registr `tickHandlers[]` + dispatch `ACTIONS[kind]` (`toggle`, `set`). `registerBehavior(instance)` symetrický k `scene.add(createMeshFor(...))`. Demo: `timer_0001` toggle `balloon1.LIT` každých 5 ticků.
- [x] **Lantern mode na BALLOON** (sez. 9) — atribut `LIT` (bool), PointLight uvnitř vaku (teplá 0xffb060, intenzita 10, castShadow = 2. shadow mapa vedle slunce), emissive na vaku. Engine fade watcher (`updateLit(dt)`) lerpuje exp. (~0.5 s). Toggle přes click na vak (raycaster `click` event) nebo přes TIMER.ACTION — oba mechanismy konvergují na stejný stav. *(Smazáno sez. 15, DD-23.)*
- [x] **Edge highlight na hover** (sez. 9) — žluté hrany CUBES entity pod kurzorem (editor-like). `EdgesGeometry(geom, 20°)` + `LineSegments` s `depthTest=false` + `renderOrder=999` → X-ray look. Cache v `root.userData.edgeOverlays` (lazy build první hover, reuse). `raycast = () => {}` aby hrany neintrupovaly hover detekci. SPRITES skip (nemají smysluplné 3D hrany). **Sez. 10:** přepnuto na `depthTest=true` + `polygonOffset=-2/-2` → jen viditelné hrany. **Sez. 16:** kompletně přepsáno na emissive boost na celém objektu (DD-25).
- [x] **COUNTER v HUD** (sez. 9) — druhý nevizuální potomek OBJECTS, `VALUE + INCREMENT` per-tick. `registerCounter` dynamicky přidá HUD řádek přes `createElement` (ne `innerHTML` — XSS safe). Demo `counter_0001` „Skóre" start=0 inc=1. Demonstruje, že nevizuální entita může být observable přes HUD DOM (ne jen 3D scénu).
- [x] **CHARACTER + mode system** (sez. 10, DD-18) — humanoidní COMPOSITES s dvoudílnými končetinami. *(Smazáno sez. 14 — humanoidi přesunuti do `./source/Stickman`.)*
- [x] **Wander stavový automat** (sez. 10, DD-18) — `ANIMATE.kind = "wander"` 6 stavů (walk/run/stand/sit/lie/work). *(Smazáno sez. 14.)*
- [x] **2D kolizní systém** (sez. 10, DD-19) — kruhy v XZ rovině, dispatch-by-type radii, stop & transition. *(Smazáno sez. 14.)*
- [x] **%AUDIT:CODE po DD-17** (sez. 10) — 6 findings (F1–F6), opraveno F1–F4. F5+F6 ponechány jako INFO.
- [x] **Balloon light boost** (sez. 10) — `LIT_MAX_EMISSIVE` 1.5→2.0, `LIT_MAX_LIGHT` 10→30, PointLight distance 12→20, shadow map 512²→1024². *(Smazáno sez. 15 s LIT systémem.)*
- [x] **%AUDIT:CODE po DD-18/19** (sez. 11) — 7 findings F1–F7, opraveno F1–F6. F7 (DD-15 vs. DD-18 STATE atribut) zapsán jako kandidát DD.
- [x] **NOODLE** (sez. 12, DD-20) — humanoidní varianta „plastelínová" (CapsuleGeometry + TubeGeometry podél `CatmullRomCurve3`). *(Smazáno sez. 14.)*
- [x] **STICKMAN** (sez. 12, DD-20) — humanoidní varianta „blokový low-poly". *(Smazáno sez. 14, přesun do `./source/Stickman`.)*
- [x] **DD-20 `poseFns` dispatch** (sez. 12) — humanoidní varianty sdílejí `ANIMATE` mode slot přes `group.userData.poseFns`. *(Historický — humanoidi smazáni sez. 14.)*
- [x] **STICKMAN polish** (sez. 13) — `WORK_POSE.centerAngle` sign fix, hlava `headR 0.18 → 0.144`, segments `(8,4) → (16,12)`, trup Z `0.24 → 0.16`, face plane s 3 výrazy, `faceUpdaters[]` registry. *(Smazáno sez. 14.)*
- [x] **Scene switcher** (sez. 13) — URL-based reload (`?scene=N`), `buildSceneOne`/`buildSceneTwo` dispatch, HUD tlačítka. *(Smazáno sez. 15, DD-23 — Scéna 1 i scene switcher.)*
- [x] **Scéna 2: travnatá louka** (sez. 13) — procedurální `makeGrassTexture` (canvas 256×256). *(Nahrazeno sez. 14 voxelovou diorámou `SCENE_LAYOUT`.)*
- [x] **GLTF export** (sez. 13) — `window.exportStickman()` v console: dynamic `import("three/addons/exporters/GLTFExporter.js")`. *(Smazáno sez. 14.)*
- [x] **Gait animátory pro Scénu 2** (sez. 13) — `walk_idle`, `run_idle`, `squat_lift`. *(Smazáno sez. 14.)*
- [x] **`docs/SCENE2.md`** (sez. 13) — self-contained prompt pro fresh AI agenta. *(Smazáno sez. 16 audit F1.)*
- [x] **Sez. 14 cleanup — humanoidi pryč** — STICKMAN, NOODLE, CHARACTER třídy + buildery + pose primitives + gait animátory + wander + kolize + face registry + `window.exportStickman()` smazány. ~1170 řádků (3096 → 1923).
- [x] ~~Mobility design~~ — DROP (sez. 15, DD-23: bez humanoidů a po all-voxel pivotu rampy řeší přes VOXEL_MODEL `ramp-grass`).
- [x] ~~Zaoblené hrany voxelů~~ — DROP (sez. 15, DD-23: pixel-art voxel jazyk, zaoblení by likvidovalo styl).

## Sezení 14 (2026-05-05)

- [x] **Scéna 2 dioráma** — 10×10 voxelová podlaha (`SCENE2_LAYOUT` ~145 kostek). Postavena interaktivně přes builder (LMB stavět, RMB bourat, 3 typy + Export do clipboardu) — builder pak odstraněn, hotová dioráma hardcoded.
- [x] **Nové procedurální textury** — `:stone`, `:rail-top`, `:grass-side`. Refaktor `makePatchTexture` (jednolitý base + 1-2 px záplaty per cube) + `:grass-side` kompozit (14px dirt + 2px grass strip nahoře). DRY palette (DIRT_*, GRASS_*, STONE_*).
- [x] **Klávesové ovládání kamery** — WASD pan, Q/E rotace kolem cíle, Y/X zoom. Per-frame v render loopu, smooth dle dt. `heldKeys` Set + window keydown/keyup/blur listener.
- [x] **Tunelové oblouky** (sez. 14 v.1, později nahrazeno) — TUNNEL_ARCH třída + builder s half-torus rotated π/2 + scale.y 1.7. *(Třída smazána sez. 15, DD-23. Instance nahrazeny VOXEL_MODELem, později TTUNELS sez. 16.)*
- [x] **WAREHOUSE + TRAIN třídy** — připraveny v model.js + buildery v main.js. *(Smazány sez. 15, DD-23.)*
- [x] **GridHelper + AxesHelper** odstraněny — orientační pomůcky M1/M2 už nepotřebujeme.
- [x] **Slunce** úhel 30° nad horizontem (Y=10→8).
- [x] **Shadow fix** — peter-panning na voxel boundaries: `normalBias` 0.02→0, `bias` -0.0005→-0.0001, `PCFSoftShadowMap`→`PCFShadowMap`.
- [x] **MagicaVoxel pipeline (DD-21)** — VOXEL_MODEL třída + `buildVoxelModel` (async OBJLoader+MTLLoader, auto-center XZ + bottom snap Y, NearestFilter pro pixel-art).
- [x] **Tools/exports** — 4 Node skripty: `dump-png-palette.mjs`, `export-grass-vox.mjs`, `export-scene-palette-vox.mjs`, `export-cars-vox.mjs` *(poslední smazán sez. 15, DD-23)*.
- [x] **DD-21 Vizuální zdroje hybrid** — formálně zafixováno: parametrizované entity → procedurální COMPOSITES, statická dekorace → VOXEL_MODEL default. GLOSSARY rozšířen o sekci „Vizuální zdroje".
- [x] **Stickman jako sibling projekt** — humanoidní vývoj přesunut do `./source/Stickman`.
- [x] ~~Tunel re-coloring~~ — hotovo sez. 15 (`tunel-grass.vox` 48³ MV).
- [x] ~~2 simplifikovaná auta z .vox~~ — DROP (sez. 15, DD-23).
- [x] ~~9 voxel modelů (stromy/kameny/trsy)~~ — pivot (sez. 15, DD-23: stromy řešeny pixel-voxel TREE.KIND-y, kameny + trsy další KIND-y).
- [x] ~~Železnice mezi tunely~~ — implementováno → odebráno (sez. 15, user request). Textura `:rail-top` zůstává jako template.
- [x] ~~Vlak na koleji + animace~~ — DROP (sez. 15, DD-23).
- [x] ~~Cargo loading/unloading~~ — DROP (sez. 15, DD-23).
- [x] ~~VOXEL_MODEL pro Scénu 1~~ — N/A (sez. 15, DD-23: Scéna 1 smazána).

## Sezení 15 (2026-05-06)

- [x] **Železnice mezi tunely** *(implementováno + roll-back)* — 6 rail TCUBES voxelů na Z=−3, X=−3..2. `makeRailBlock` helper + FACTORIES dispatch. User požádal o odebrání — vráceno na grass voxely. Textura `:rail-top` v `NAMED_TEXTURE_FACTORIES` zachována jako template.
- [x] **`tunel-grass.vox` rename + smazání stale 16³** — z `tunel.vox` (16³ monochrom) → `tunel-grass.vox` (48³ MV s plnou paletou). User vyexportoval `tunel-grass.{obj,mtl,png}` v MagicaVoxelu.
- [x] **`export-grass-vox.mjs` přepis** — generuje 16³ kostku s povrchovými voxely odpovídajícími texturám (TOP `:grass-top`, BOTTOM `:dirt`, 4 boky `:grass-side` 14 px dirt + 2 px grass strip). Paleta 8 barev. Output: `cube-grass.vox`.
- [x] **10 pixel stromů** na předním řádku Z=4 — TREE třída rozšířena o `KIND` parametr; dispatch v `buildTree(group, instance)` přes `TREE_BUILDERS` lookup. KIND-y: `spruce`, `oak`, `birch`, `palm`, `bush`, `cypress`, `willow`, `bonsai`, `dead`, `maple`. Pixel size 0.125 j (= 1/8 TC voxelu = 12.5 cm). Helpery: `treeMat` cache, `treeVoxel`, `treeBlock`, `treeDiamond`. Sdílená BoxGeometry + materiály per barva.
- [x] **Animace větru pro pixel stromy** — `tree_sway` polymorfně rozšířen: classic větev smazána (s buildTreeClassic), pixel větev = per-children mutace s height-weighted amplitudou. Random fáze (`phaseX/Z`) per strom + nesoudělné periody → desync. Amplituda 0.16 j *(snížena na 0.04 sez. 17)*.
- [x] **DD-22 — Pevné měřítko + Y konvence** — 1 TC voxel = 1 m, 1 MV voxel = 1/16 TC = 6.25 cm, default `SCALE: 0.625`. Tabulka `Y vs grid_Y` v GLOSSARY.
- [x] **Grass rampa import** (`ramp-grass.vox/obj/mtl/png`, 16³ MV → 1×1×1 TC). Position (-4, -0.5, 0). *(Nahrazeno sez. 16 TRRAMPS BLOCKS.)*
- [x] **DD-23 — All-voxel pivot („Kostičky")** — smazány non-voxel třídy: BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + Scéna 1 + scene switcher + LIT system + balloon_bob + classic TREE + cylinderBetween helpers + click handler. **~720 řádků smazáno** (`main.js` 2596 → 1919). HTML scene-switcher CSS + DOM odebrán. Auto assets a `tools/export-cars-vox.mjs` smazány. ANIMATORS jen `tree_sway` (pixel) / `rotate` / `orbit_stadium` / `pulse` / `drift`.
- [x] **DD-24 — Shape × Surface separation** — VOXEL_MODELy s jednolitým povrchem rozděleny na shape (1 MV s abstract paletou 4 indexy: BASE/ACCENT1/ACCENT2/HIGHLIGHT) + surface (JSON paleta 4 RGBA). Plánovaný pre-build skript. Pojmenování `<shape>-<surface>` (kebab-case lowercase). Sez. 15 rename: `grass-cube` → `cube-grass`, `grass-ramp.*` → `ramp-grass.*`. *(Pre-build pipeline DROPnuta sez. 16, DD-25 — pro standardní bloky redundantní.)*

### Sez. 15 → sez. 16 Příště — Hotové

- [x] ~~Pre-build skript `tools/build-shapes.mjs`~~ — DROP (DD-25 sez. 16: bloky teď procedurální, MV pipeline pro standardní bloky redundantní; DD-24 zúžen na budoucí komplexní VOXEL_MODELy).
- [x] ~~8 surface JSON palet~~ — DROP (DD-25, viz výše).
- [x] ~~Re-modelovat shapes na abstract paletu~~ — DROP (DD-25, viz výše).
- [x] **GLOSSARY cleanup** — hotovo v sez. 16 audit (F2: kompletní rewrite).
- [x] **`docs/IDEAS.md` review** — hotovo v sez. 16 audit (F4: anotace u DONE značek).

## Sezení 16 (2026-05-06)

- [x] **%AUDIT:DOCS** — 7 nálezů (F1 SCENE2 smazán, F2 GLOSSARY rewrite, F3 README Status, F4 IDEAS anotace, F5 DD-22 typo „vejmuly→vešly", F6 DD setříděno vzestupně, F7 vyřešeno s F2).
- [x] **Hover highlight refaktor** — `setEdgeHighlight` → `setHoverHighlight`. Žluté světélkování celého objektu (`mat.emissive = 0x404020`). Lazy clone-on-first-hover materiálů per mesh. Sdílené materials (TREE `_treeMatCache`) zůstávají nedotčené. Originály v `userData.hoverOrigMat`, klony v `hoverHotMat`.
- [x] **DD-25 — 4-vrstvá taxonomie scény** (Bloky / Voxely / Linie / Objekty). Reviduje DD-23 v tom smyslu, že voxelová identita platí pro vrstvu 2, ne pro celou scénu. DD-24 zachován ale s omezeným rozsahem.
- [x] **`BLOCKS` abstract parent** — značkovací třída pod CUBES. `CCUBES`, `TCUBES` refaktor: extends BLOCKS.
- [x] **TRRAMPS** (trojboký hranol = pravoúhlý klín). 5 face atributů (`SLOPE`, `BOTTOM`, `BACK`, `LEFT`, `RIGHT`) + `ORIENTATION`. Custom BufferGeometry s 18 vertices, 8 trojúhelníků, 5 material groups. Bug fix: winding order pro BOTTOM/BACK/LEFT/RIGHT face byl nesprávně.
- [x] **TTRAMPS** (trojboký jehlan = trirectangular tetrahedron). 4 face atributy (`SLOPE`, `BOTTOM`, `BACK`, `LEFT`) + `ORIENTATION`. 4 unique vertices, per-face non-shared = 12 vertices, 4 trojúhelníky.
- [x] **TTUNELS** (klenutý tunel skrz 1C blok). 4 face atributy (`TOP`, `SIDES`, `WALLS`, `CEILING`) + `ORIENTATION`. Geometrie: kvádr 1×1×1 mínus „obdélník + půlkruh extrudovaný v ose" (12 segmentů na půlkruhu). Bez dna.
- [x] **`ROTATION_Y` → `ORIENTATION` enum** — refaktor TRRAMPS/TTRAMPS/TTUNELS. Integer 0..3 = počet 90° CCW rotací. *(Sez. 17 sjednoceno na float ve stupních, DD-26.)*
- [x] **Smazány VOXEL_MODEL `tunel-grass` + `ramp-grass` instance** — nahrazeny TTUNELS / TRRAMPS. Asset soubory `assets/tunel-grass.{vox,obj,mtl,png}`, `assets/ramp-grass.{vox,obj,mtl,png}`, `assets/ramp-triangle-grass.{vox,obj,mtl,png}` smazány. Skript `tools/export-ramp-triangle-vox.mjs` smazán. V `assets/` zbývá jen `cube-grass.vox` + `scene-palette.vox`.
- [x] **TTUNELS texture bug** — z bočního pohledu byly viditelné 2 paralelní zelené pásky. Opraveno: TEXTURE_SIDES změněno z `:grass-side` na `:dirt`.

### Sez. 16 → sez. 17 Příště — Hotové

- [x] **PATH (LINES vrstva 3)** — DD-27, sez. 17, Catmull-Rom strip mesh. *(TRACK plánován — viz aktivní TODO.)*

## Sezení 17 (2026-05-06)

- [x] **DD-26 sjednocená `ORIENTATION`** napříč BLOCKS i COMPOSITES — float ∈ [0, 360) ve stupních. Engine `* (Math.PI / 180)`. Refaktor: BLOCKS enum 0..3 → stupně (migrace `ramp_0` z 1 → 90), `LOG/VOXEL_MODEL.ROTATION_Y` (rad) atribut smazán, `BLOCKS` + `COMPOSITES` base třídy explicit constructor s default 0. `populateNorthernScene` přiřadí každé dekoraci `rng() * 360`.
- [x] **DD-27 PATH třída** (1. potomek vrstvy 3 LINES) — `extends CUBES` s `KIND` (default `"dirt"`) + `POINTS`. Engine `createPathFor`: `THREE.CatmullRomCurve3` typ catmullrom tension 0.5, 64 vzorků, plochý strip mesh. Šířka 0.5 j, Y offset +0.005 j proti z-fightingu, repeating texture UV scale 8× podél délky. `pathTexture(kind)` cache. Dispatch v `createMeshFor` (před SPRITES).
- [x] **`:path-dirt` named-texture** — kropenatý šum 240 záplat 1-2 px šedých odstínů (#7a7a78 base + 6 accents).
- [x] **Cesta z tunnel_0**: 5 bodů — `(-3.5, -3) → (-1.5, -3) → (0.5, -1) → (2.5, 1) → (4.5, 1)`. Three.js Catmull-Rom reflection fallback v krajních bodech. Jeden inflexní bod ve středu (esíčko).
- [x] **`pathOccupiedCells(points)`** — vzorkuje curve 128×, vrátí Set grid buněk (X, Z). Předáno do `populateNorthernScene` jako `pathBlocked`.
- [x] **Procedurální severská dekorace** — 3 nové třídy COMPOSITES: `GRASS_TUFT` (KIND-y micro/short/fern), `ROCK_PIXEL` (micro/small/medium/mossy), `LOG` (stump/birch/pine). Sdílí `treeVoxel`/`treeBlock`/`treeMat` helpery. `populateNorthernScene` — mulberry32(42) deterministická RNG, severský mix. Cca 60% grass topu pokryto.
- [x] **Y konvence fix** — pixel-voxel COMPOSITES `instance.Y = t.y + 1`. *(Vyřešeno sez. 18 DD-28 sjednocením na surface = mesh bottom, `t.y + 0.5`.)*
- [x] **Random ORIENTATION na všech dekoracích** — `populateNorthernScene` přiřadí každé instanci `rng() * 360`.
- [x] **Zjednodušení grass blok** — boky/spodek `:dirt` (jednolitá hlína). Aplikováno i na rampy (TRRAMPS/TTRAMPS BACK/LEFT/RIGHT na `:dirt`). Pravidlo BLOCKS rodiny: **vrch `:grass-top`, jinak `:dirt`**. Smazáno: `makeGrassSideTexture`, `:grass-side` v `NAMED_TEXTURE_FACTORIES`, `GRASS_STRIP_PX`.
- [x] **`buildSceneTwo` → `buildScene`** + **`SCENE2_LAYOUT` → `SCENE_LAYOUT`** rename — po sez. 15 cleanup zbyl stale „Two" suffix.
- [x] **Voda — implementace + cleanup** — `:water-top` + `:water-side` + `makeWaterTexture` factory, `faceMaterialFor` special-case (transparent + opacity 0.7), `noShadow` heuristika. 2×2 jezírko v middle scény. Test OK, ale uživatel po chvíli „nejsem si jistý" → kompletní cleanup (~70 řádků).
- [x] **Q/E kamerová rotace fix** — explicitní `_kbWorldY = (0,1,0)` + `camera.lookAt(controls.target)` po mutaci pozice. Žádný shift do strany.
- [x] **Infotip POINTS uzávorkováno** — `formatValue` special-case pro PATH `POINTS` array → `(-3.5, -0.5, -3) → (0.5, -0.5, -1) → (4.5, -0.5, 1)`.
- [x] **Mikro voxely 1×1×1** — nové KIND-y `micro` na ROCK_PIXEL/GRASS_TUFT/LOG.stump. 1 voxel = 0.125 j (≈ 12.5 cm). Vícevoxelové dekorace × 0.75, micro vrstva přidaná.
- [x] **`tree_sway` amplituda × 0.25** — z 0.16 → 0.04 (vítr méně dramatický).

### Sez. 17 → sez. 18 Příště — Hotové

- [x] **DD-22 vs. pixel-voxel Y konvence** — vyřešeno sez. 18 (DD-28 sjednocení: BLOCKS = grid-center, ostatní vizuální třídy = surface).

## Sezení 18 (2026-05-10)

- [x] **`%AUDIT:CODE`** — 12 nálezů (1 kritický, 5 doporučených, 4 kosmetické) napříč `src/` + GLOSSARY + DESIGN_DECISIONS + struktura. Všechny opraveny.
- [x] **F1 (KRITICKÉ) — DD-28 sjednocená Y konvence** napříč CUBES potomky. **Dvě sémantiky:** BLOCKS (TCUBES, TRRAMPS, TTRAMPS, TTUNELS) = grid Y voxelu (mesh center, snap-to-int), ostatní vizuální třídy (VOXEL_MODEL + pixel-voxel COMPOSITES) = world Y surface (mesh bottom). Předtím tři konvence, pixel-voxel měl group origin posunutý o 0.5 nad surface kvůli `treeVoxel` lokálnímu offsetu. Migrace: `treeVoxel` `-0.5 + (gy + 0.5) * TREE_PX` → `(gy + 0.5) * TREE_PX`; populate `instY = t.y + 0.5` (místo `+1`). DD-28 přidáno do DESIGN_DECISIONS, GLOSSARY DD-22 sekce rozšířena o tabulku všech tříd.
- [x] **F2 — zombie `GRASS_TUFT.tall` smazán** — sez. 17 odebrala `tall` z populate, ale zůstal jako default + builder + dispatch + ANIMATE větev. Cleanup: `buildGrassTall` smazán, default `kind = "short"`, ANIMATE větev smazána.
- [x] **F3 — docstringy** v `model.js`: GRASS_TUFT (`micro/short/fern`), ROCK_PIXEL (přidán `micro`), VOXEL_MODEL (příklad `cube-grass`, zmínka „bez aktivní instance v scéně, infrastruktura pro budoucí komplexní MV importy").
- [x] **F4 — GLOSSARY hlavička** — sez. 15 → sez. 17/18.
- [x] **F5 — komentář v `buildScene`** — odstraněna matoucí zmínka o `Y=−0.5 = top of grass cube`.
- [x] **F6 — `temp/` cleanup** — adresář smazán (relikvie `tunel.png`), přidán do `.gitignore`.
- [x] **F7 — historické komentáře zkráceny** — GridHelper komentář smazán, humanoidi+kolize+DD-19 z 14 řádků na 3, LIT z 3 na 1, click handler z 3 na 2.
- [x] **F8/F9 — asset templates dokumentace** — sekce v GLOSSARY o `cube-grass.vox` + `scene-palette.vox` jako MV authoring šablony bez runtime konzumenta.
- [x] **F10 — `castShadow` duplicita v `treeVoxel`** smazána (jednotně řeší traverze v `createMeshFor`).

## Sezení 23 (2026-05-12)

- [x] **Steady-state polish (bod #3 z Příště sez. 22)** — `FACILITY_DEF.forest.outputs.logs` 0.5 → 1.0 ks/s. Matchne sawmill recipe (1 log/cyklus × 1.0/s spotřeba), žádný source-starve, žádná PAUS/RSUM oscilace. Conveyor `THROUGHPUT=2` ks/s zůstává nad rate. Komentář v `FACILITY_DEF` docstringu aktualizován („60 klád za minutu, matchne sawmill, žádná oscilace; sez. 23 polish bod #3").
- [x] **Lokální `CLAUDE.md` slim** — 150 → 32 řádků (78 % redukce). Diagnostika redundancí: Project / Status / scéna / 4-vrstvá taxonomie / hierarchie modelu / Aktuální obsah scény duplicitní s `README.md`; changelog sez. 14–22 duplicitní s `docs/DIARY.md` (a roste lineárně); Dokumenty seznam duplicitní s README; Design Principles / Workflow / Kudos!Censure subset globálního. Zůstává jen skutečný AI overlay: Code Style nuance (user-learner, podrobnější komentáře), `%THINK` bod 5 (sandbox/factory mechanika), Makra odkaz, Key Files mapa, „kde najít co" pointery.
- [x] **Globální `~/.claude/CLAUDE.md` rozšíření — governance pravidla** *(mimo repo TheCubes, ale relevantní záznam):*
  - `%CALIBRATE` sekce A o **„Role discipline řídících dokumentů"**: CLAUDE.md = jen AI overlay, project info patří do README/DIARY/DD. Najdi sekce v CLAUDE.md, které by člověk hledal v README — kandidát na přesun nebo smaz.
  - **Sub-prah nezávislý na sezení-count:** *„nárůst projektového CLAUDE.md o ≥ 50 % od posledního CALIBRATE"* jako mimořádný trigger. Důvod: CLAUDE.md roste lineárně se sezeními (sez. 20+21+22 přidaly po odstavci), prah ≥ 15 sezení je pomalý.
  - **Bariéra v `%DOCS`** — 4 explicitní pravidla, kam se *nikdy* nezapisuje: (1) sezení changelog → jen DIARY, ne CLAUDE.md; (2) status / hierarchie / scéna / milníky → jen README; (3) DD-XX → jen DESIGN_DECISIONS; (4) CLAUDE.md se mění *jen* když přibyla AI pravidla, ne fakta o projektu.
- [x] **Verdict makra:** `%CALIBRATE` (governance) vs. `%AUDIT:DOCS` (content kvalita). Role-confusion mezi řídícím a content dokumentem je process-level → doména CALIBRATE A.

### Sez. 22 → sez. 23 Příště — Hotové

- [x] **Steady-state polish** — viz výše.

## Sezení 24 (2026-05-12, paralelní instance — meta)

Žádný kód. Meta-sezení o multi-instance discipline + diary záznam o paralelní (sez. 25) implementaci. Detail v `docs/diary/2026-05-12.md`. Commit `d2f7c1e docs(session): 2026-05-12 [2] — sez. 24 meta: multi-instance discipline`.

## Sezení 25 (2026-05-12) — DD-32 implementace end-to-end

### DD-32 kotvení (Fáze 0)

- [x] **DD-32 zápis** v `docs/DESIGN_DECISIONS.md` — terrain generator pivot, DD-30/31 immutable jako historie.
- [x] **README.md identitní update** — z „factory-observer toy" na „procedurální terrain sandbox", hierarchie modelu bez FACILITY, plán fází 0–3.
- [x] **CLAUDE.md (projektový) update** — Key Files mapa (terrain.js přibude, factory engine pryč), `%THINK` bod 5 reformulován z factory mechaniky na procedural generování.
- [x] **`feat/factory` merge → `main` (`--no-ff`)** — sez. 21–23 historie zachována.
- [x] **`feat/terrain` větev** vytvořena z main.

### Wipe (Fáze 1)

- [x] **`model.js` 705 → 450 ř.** — smazány TREE/GRASS_TUFT/ROCK_PIXEL/LOG (COMPOSITES potomci), FACILITY/GENERATOR/TRANSFORMER/STORAGE třídy, RESOURCES_DEF/RECIPES_DEF/FACILITY_DEF registry, PATH atributy SOURCE/SINK/RESOURCE/THROUGHPUT, `world.RESOURCES` agregát.
- [x] **`main.js` 3252 → 1981 ř. (−1271 ř.)** — smazán FACTORY TOY ENGINE (productionTick/pathTick/transferOnPath/generatorTick/transformerTick/setPaused/logEvent/renderEventLog/aggregateResources/maybeLog*/_prodFloorCache/facilities/paths/events/EVENT_VERB_CLASS), createFacilityFor/facilityMat/_facilityGeom/_facilityMatCache, TREE_BUILDERS (10 builderů spruce/oak/birch/palm/bush/cypress/willow/bonsai/dead/maple) + treeMat/treeVoxel/treeBlock/treeDiamond + TREE_C + TREE_PX, DECO_C + GRASS_TUFT_BUILDERS + ROCK_PIXEL_BUILDERS + LOG_BUILDERS + buildTree/buildGrassTuft/buildRockPixel/buildLog dispatchery, SCENE_LAYOUT (~145 voxelů), makeStoneBlock/makeDirtBlock/makeGrassBlock factories, buildScene dioráma (tunely + rampy + path_0 + 3 fasility + 2 conveyor PATH), populateNorthernScene + topVoxelMap + mulberry32 + pathOccupiedCells + spawnTree/Grass/Rock/Log, animateTreeSway + ANIMATORS.tree_sway, TIME_SCALE slider listener, render loop volání productionTick/pathTick/aggregateResources.
- [x] **`index.html` 161 → 85 ř.** — smazány #resources panel, #simctrl (TIME_SCALE slider), #eventlog (severity-colored ticker). Zachováno #hud (TIME label), #tooltip, #scene canvas.
- [x] **Celkem −1602 ř. (−39 %)** z 4118 na 2516.

### generateTerrain MVP (Fáze 2)

- [x] **`src/terrain.js` (nový, 173 ř.)** — mulberry32 + makeValueNoise + generateTerrain.
- [x] **Value-noise engine** — grid sampling (Float32Array gx × gz) + bilineární smoothstep (3x²−2x³) + wrap-around modulo pro záporné x/z.
- [x] **Heightmap** — `RELIEF_AMPLITUDE` (0..6) + `RELIEF_FREQUENCY` (0..0.65) lookup pro 11 stupňů relief 0..10.
- [x] **Biome map** — secondary low-freq noise (freq × 0.5 + 0.1, seed +1) → sort cells dle biome_value → exact-match thresholds = souvislé klastry.
- [x] **Y modifier per biome** — grass=0, stone=0, sand=−1, water=−2.
- [x] **Sloupcové vyplnění** — top voxel dle biome (water → dirt), dirt middle, stone yBottom (= min(−1, minYTop−1)).
- [x] **Vodní plane(y)** MVP — 1×1 plane per water cell na `y_top + 0.55` (anti z-fight).
- [x] **Validace fail-fast** — size kladné, relief 0..10, surfaces součet ≈ 1.0, neznámé surface throw.
- [x] **Graceful degradation** relief 9..10 → clamp 8 + console.warn (valley carving roadmap).
- [x] **`:sand` textura** v `main.js` — paletový patch (SAND_BASE `#d4b97c` + 4 akcenty).
- [x] **`BLOCK_TEXTURES` lookup** — per kind set (grass: top `:grass-top` + sides `:dirt`; dirt/stone/sand homogenní).
- [x] **`createBlock(kind, x, y, z)` helper** — TCUBES instance s lookup texturou.
- [x] **`createWaterPlane(w)` helper** — `THREE.Mesh` (PlaneGeometry 1×1, MeshStandardMaterial transparent opacity 0.7, DoubleSide), rotace −π/2 X.
- [x] **`TERRAIN_DEFAULTS`** — `{ size:[10,10], relief:3, surfaces:{grass:0.80,stone:0.10,sand:0.05,water:0.05}, seed:42 }`.
- [x] **`buildScene` integrace** — volá `generateTerrain(TERRAIN_DEFAULTS)` + spawne bloky (createMeshFor → createBlock) + water planes (createWaterPlane).
- [x] **Smoke test (Node ESM)** — 321 bloků (80 grass + 110 stone + 126 dirt + 5 sand) + 5 water planes. `node --check` OK pro main.js i terrain.js.
- [x] **Server `localhost:8000`** vrací 200 pro `/`, `/src/main.js`, `/src/terrain.js`, `/src/model.js`.
- [x] **Browser test (user)** — vykresluje, „rovinatá krajina s jedním kaňonem s vodou na dně" = biome klastrování + water Y−2 depression. Funkce, ne bug.

### Sez. 23 → sez. 24 Příště — Přepsáno DD-32 pivotem

Tři neudělané body („Material gate vizualizace", „Druhý zdrojový řetězec", „Merge fáze B → main", „Fáze C plánování") byly **přepsány DD-32 revokem factory toy identity** — `feat/factory` byl mergován do `main` jako uzavřená kapitola (sez. 21–23 v git historii), pak `feat/terrain` start. Tyto úkoly nejsou ani hotové, ani aktivní — jsou v immutable history. Body C plánování (editor MVP) může v budoucnu vrátit jako editor terrainu, ne fasilit.

## Sezení 28 (2026-05-13) — TCUBES atlas performance refactor

`feat/terrain-perf` větev. %THINK z TODO sez. 27 (performance při 30×30).

### Diagnostika (před refactorem)

- [x] **`faceMaterialFor` memoizace** — `_faceMaterialCache` Map keyed na stringifikovaný `val`. Před cache: ~16 000 alokací `MeshStandardMaterial` per 30×30 regen (drahý GC). Po cache: 4 unikáty (`:grass-top` / `:dirt` / `:stone` / `:sand`).
- [x] **`console.time` v `spawnTerrain`** — 3 fáze: `generateTerrain` / `spawnTerrain.blocks` / `spawnTerrain.water+ramps`. Odhalil ratio (a) generace 5 % / (b) scene mutace 90 % / (c) per-frame render = dominant. **Diagnostika smazána po atlas refactoru** (cleanup před `%END`).
- [x] **Perf HUD `#perfhud`** — pravý horní roh, throttled 1×/s (`renderer.info.render.calls/triangles` + `info.memory.geometries` + `_faceMaterialCache.size` + FPS rolling avg). **Permanent** (projektová observability pro budoucí refactory).
- [x] **Three.js verze check** — r160 (z `index.html` import map). `BatchedMesh` přidán r167+, takže ne použitelný bez bumpu. InstancedMesh OK. Pro sez. 28 atlas refactor nezáleží.

### Refactor (atlas pipeline)

- [x] **`getSharedAtlasBoxGeom()`** — lazy singleton sdílený `BoxGeometry` (1 instance pro všechny terrain TCUBES). UVs přepsané: face N získá u ∈ [N/6, (N+1)/6] (1/6-tice atlasu horizontálně). Three.js BoxGeometry face order (+X, −X, +Y, −Y, +Z, −Z) shodný s našim ATLAS_FACE_KEYS.
- [x] **`getTcubesKindMaterial(kind)`** — per-kind lazy atlas material. Slep 6 facelets do `document.createElement("canvas")` 96×16 px (16 px per dlaždice = shoda s `:named-texture` rozlišením). Každý facelet vytaženo z `NAMED_TEXTURE_FACTORIES[texName]().image`. `NearestFilter` + `SRGBColorSpace` shoda s ostatními pixel-art texturami. Negative cache (`null` pro non-terrain kindy) brání opakovaným pokusům o build.
- [x] **`createTCubeFor` fast/slow path dispatch** — terrain TCUBES (`instance.NAME` match v `BLOCK_TEXTURES`) → shared geom + atlas material (1 draw call per box). Non-terrain (emoji demo boxy) → původní `material[6]` array (cache materiálů v `faceMaterialFor` stačí).
- [x] **Hover sez. 16 pattern** ne dotčen — `Array.isArray(orig) ? orig.map(m => m.clone()) : orig.clone()` přepíná pole↔single dispatch automaticky.

### Výsledky (30×30)

| metrika | před | po | změna |
|---|---|---|---|
| FPS | 15 | **92** | **6.1×** |
| draw calls | 25 106 | ~5 050 | 0.20× |
| triangles | 49 432 | 49 480 | shoda |
| geometries | ~5 500 | **8** | sdílená box geom |
| spawnTerrain.blocks ms | 38.6 | 6.5 | 5.9× rychlejší |
| total regen ms | 43 | 9 | 4.8× rychlejší |
| `[Violation]` rAF | 50-64 ms | žádné | — |

10×10 baseline ne změněno (175 FPS, pod limitem), 20×20 propad z 32 → 142 FPS. Cíl 30×30 playable splněn.

### Cleanup před `%END`

- [x] **`console.time` + `console.log("[terrain]...")` v `spawnTerrain` smazány** — diagnostika byla sez. 28 dev-only, projekt-level pravidlo (CLAUDE.md) zakazuje debug výpisy v produkčním kódu. Pokud sez. 29 rampy refactor je znovu potřebuje, snadno přidat.
- [x] **Perf HUD ZACHOVÁN** — projektová observability, ne dev-only feature. Permanent UI v pravém horním rohu.

## Sezení 30 (2026-05-13) — Rampy atlas + F9/F12 fix + size 100×100

Single-instance na main (bez topic branche per user volba, KISS — atomický refactor s jasným fallback `git revert`).

### Governance fix (z TODO sez. 27)

- [x] **PROMPTS.md `%END` (3.) Git** — topic-branch workflow update. Doplněn `(3a.) Commit + push na aktuální větev` (default `feat/<topic>` od DD-30) + `(3b.) Merge rozhodnutí` (otázka „úkol dokončen?", `git merge --no-ff feat/<topic>` syntax) + zdůvodnění `--no-ff` (hranice topic branch viditelná v `git log`). Sub-prah governance z Příště sez. 27 → 28 → 29 → 30 (4× — pod stale-prahem 5 ale blížil se).

### Ramp atlas refactor (z TODO Otevřené body)

Izomorfně s TCUBES atlas pipeline (DD-36, sez. 28). Před refactorem: 3 ramp typy (TRRAMPS/TTRAMPS/TDRAMP) měly per-instance `materials[N]` array (5/4/5 faces) přes `faceMaterialFor` dispatch — 5/4/5 draw calls per ramp instance.

- [x] **3× IIFE geom cache transformace** — `TRRAMP_GEOM_CACHE` / `TTRAMP_GEOM_CACHE` / `TDRAMP_GEOM_CACHE`. `addQuad`/`addTri` helpery dostaly `remapU(uv, faceIdx)` (`faceIdx/N + uv[0]/N` na U-axis), parametr `materialIndex` přejmenován na `faceIdx` (semantika jen pro UV slot, ne pro material array). `groups.push` + `for (const g of groups) geom.addGroup(...)` smazáno — single-material mesh.
- [x] **Generický `getRampAtlasMaterial(type, surface)` factory** — DRY pro 3 typy. Klíč cache `${type}_${surface}` → MeshStandardMaterial. Specs v `RAMP_ATLAS_SPECS` (per typ klíče faces + texTable). 9 unique kombinací = 9 atlas materials lazy-cached (3 surfaces × 3 typy).
- [x] **`RAMP_SURFACE_FROM_KIND` lookup** — `instance.KIND` má tvar `ramp_<surface>` (z `createRampEdge/Corner/Diagonal`), surface se odvodí konstantním mapingem (`ramp_grass` → `"grass"`, atd.). Žádná změna modelu.
- [x] **3× `createXxxRampFor` přepis** — atlas-only, `new Mesh(GEOM_CACHE, mat)`, žádný `materials[N]` array. ORIENTATION (DD-26) zůstává `mesh.rotation.y` (geom je rotation-invariant).
- [x] **Slow path `faceMaterialFor` pro rampy odstraněn** — user volba: žádný producer non-fixed surfaces (grass/stone/sand fixed). TTUNELS skipnut (žádný producer ve scéně — model existuje od sez. 16, terrain ho negeneruje).

**Výsledky 30×30 seed 42:**

| metrika | sez. 28 (TCUBES atlas) | sez. 30 (rampy atlas) | změna |
|---|---|---|---|
| FPS | 92 | **123** | +34 % |
| draw calls | ~5050 | 4290 | −710 (−14 %) |
| `_rampsAtlasMatCache.size` | n/a | 3 (jen aktivní surfaces) | — |

Odhad TODO byl ~17 % incremental redukce → reálných 14 % matchne dobrým způsobem.

### F9 (sez. 29 follow-up) — perf HUD `mat` součet

- [x] **`_perfHud.el.mat`** = `_faceMaterialCache.size + _tcubesAtlasMatCache.size + _rampsAtlasMatCache.size`. Předtím měřilo jen `_faceMaterialCache.size` — po atlas refactoru TCUBES + rampy hodnota klesla na 0 (slow path se prakticky nevolá, TTUNELS bez producenta). Po fix HUD ukazuje **7** @ 30×30 (4 TCUBES atlas + 3 ramp atlas).

### F12 (sez. 29 follow-up) — shadow frustum reaktivně

- [x] **`updateShadowFrustum(maxDim)` helper** — derivuje `half = ceil(maxDim/2) + 4` (buffer pro vyšší objekty), nastaví `sun.shadow.camera.left/right/top/bottom` + `updateProjectionMatrix()`. Volaný z `spawnTerrain(params)` po každém regen.
- [x] **Module-load default `±8`** zachován jako fallback před prvním `buildScene` (technicky se nikdy nepoužije — `buildScene` volá `spawnTerrain(TERRAIN_DEFAULTS)`). Komentář aktualizován.

### Size 100×100 unlock

User žádost *„Zkus umožnit v generátoru SIZE 100×100"*.

- [x] **HTML slidery `tc-size-x` + `tc-size-z` max 30 → 100**. Žádná `terrain.js` validation úprava (už open-ended bez horního limitu).
- [x] **100×100 stress test (user)** — FPS 7, calls **47642**, tri **549k**, `geom: 8`, `mat: 7`. **Atlas pipeline exhausted** — sdílení geom/material funguje optimálně, ale 1 Mesh = 1 draw call neumí překročit. Bottleneck: CPU draw call validation. **Roadmap:** `InstancedMesh` per atlas material (TCUBES 4 + rampy 9 = ~13 batchů celkem) by smrslo na ~13 calls → FPS predikce **~150+** (GPU bound; 549k tri je easily). TODO follow-up s odhadem.

### Diff celkem (2 commity)

`2f6ac79` (rampy atlas + F9 + PROMPTS.md): `+143/−67`, 2 files.
`<sez. 30 commit>` (size 100 + F12 + docs sez. 30): `~+200/−40`, ~6 files.

## Sezení 31 (2026-05-13) — InstancedMesh refactor + sun + post-process (DOF/fog) + settings panel

Single-instance na main (bez topic branche per user volba Q3=B v plánu, KISS — atomický refactor s `git revert` fallback).

### InstancedMesh refactor — DD-37 (z TODO Otevřené body)

User volby: Q1=A (albedo overbright tint místo emissive boost), Q2=B (vše v 1 rolu).

- [x] **`_terrainBatches: Map<key, InstancedMesh>`** — batch klíče `tcubes:<kind>` (4) + `<ramp_type>:<surface>` (9) = ~13 batchů @ libovolný size.
- [x] **`createTerrainBatch(key, geom, mat, capacity)` + `pushInstanceToBatch(batch, instance, x, y, z, rotY)` helpery** — alokace `InstancedMesh` s `count=0` + lazy fill přes scratch `Matrix4.compose(pos, quat, scale)` (žádné per-instance allocations).
- [x] **`spawnTerrain` 3-pass** (count → allocate → fill) — single sweep `terrain.blocks` + `terrain.ramps`, pre-počítaná kapacita per batch. Water plane(y) zůstávají single-mesh.
- [x] **`regenerateScene` batch-dispose** — `scene.remove(batch) + batch.dispose()` (uvolní instanceMatrix + instanceColor buffery), sdílené geom/mat NEdisposovat. `meshByInstance.clear()` per batch's `instancesByIdx`.
- [x] **`meshByInstance` discriminated union** — terrain instance → `{ batch, idx }`, non-terrain → `Object3D` (legacy). Polymorfní lookup `if (ref.batch)`.
- [x] **`setHoverHighlight` discriminated union** — batch case `setColorAt(idx, HOVER_TINT_COLOR) + instanceColor.needsUpdate = true`; single-mesh case zachová emissive boost (lazy clone-on-first-hover).
- [x] **`HOVER_TINT_COLOR = (1.6, 0.8, 0.2)` overbright trik** — `Float32Array` v `InstancedBufferAttribute` nemá clamp → values > 1.0 = albedo overbright (sytá oranžová). Náhrada emissive boost — vědomá estetická regrese kompenzovaná draw-call redukcí.
- [x] **`resolveInstanceFromHit(hit)` v pointermove** — `hit.object.isInstancedMesh` → `instancesByIdx[hit.instanceId]`; jinak `hit.object.userData.instance`.
- [x] **`showTooltip` skip-check `lastHoveredInstance !== instance`** — předchozí check `lastHoveredMesh.userData.instance` byl bug pro InstancedMesh (userData.instance neexistuje na batchi, per-frame DOM mutate).

**Výsledky (seed 42):**

| metrika | 30×30 sez. 30 | 30×30 sez. 31 | 100×100 sez. 30 | 100×100 sez. 31 |
|---|---|---|---|---|
| FPS | 123 | ~140 | **7** | **104** |
| draw calls | 4 290 | ~13 | 47 642 | **1 016** |
| `mat` (atlas count) | 7 | 7 | 7 | 13 |

100×100 FPS skok 7 → 104 (**14.9×**), draw calls 47k → 1k (**46.9×**). Predikce v `%THINK` byla 150+ FPS — realita 104 (GPU bound s 549k tri + shadow pass nelze překonat).

### Sun mesh — drobná bílá koule jako vzdálené slunce

User dotaz *„Uměl bys přidat slunce jako bílou kouli?"*. Q1=A realistická / Q2=A statická (později reaktivní).

- [x] **`sunMesh = THREE.Mesh(SphereGeometry(1.5, 16, 16), MeshBasicMaterial(color: 0xffffff, fog: false))`** umístěn na `sun.position × SUN_DISTANCE_SCALE` = (-50, 40, 50). `MeshBasicMaterial` je unlit = ignoruje DirectionalLight → "svítí" vlastní bílou.
- [x] **`material.fog = false`** override — bez něj by se bílá koule rozplynula do mlhy na ~80 j.

### Post-processing — atmospheric fog + Depth of Field (BokehPass)

User dotaz *„Uměl bys přidat efekt rozostření pozadí i popředí?"*. Q1=C (fog + DOF + obojí), Q2=A (ohnisko ve středu scény).

- [x] **`scene.fog = new THREE.Fog(SKY_COLOR, 30, 120)`** — lineární mlha matchuje barvu pozadí; vzdálené blocky plynule blednou. `sceneFog` reference držena (pro toggle restore).
- [x] **`EffectComposer` + 3 passy** — `RenderPass` (scéna s depth) → `BokehPass` (Gaussian blur dle depth, focus / aperture / maxblur) → `OutputPass` (sRGB color-space correction).
- [x] **Dynamic focus** — `bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target)` v animate(); ostrá zóna se posouvá s OrbitControls target při zoom in/out.
- [x] **Parametry pixel-art friendly**: `aperture: 0.0005`, `maxblur: 0.005` (jemný DoF, ne dramatický bokeh).
- [x] **`resize` handler** rozšířen o `composer.setSize(...)` (off-screen targets).
- [x] **Render loop** `renderer.render(scene, camera)` → `composer.render()`.

### Settings panel `#settings` — 3 toggles

User feedback po implementaci: *„Bude to toggle volba zobrazení. Nový panel SETTINGS."*. Q1=C (DOF + Fog + Sun), Q2=A (vše ON default).

- [x] **`window.settings = { setDOF, setFog, setSun }` API** v `main.js` — toggle `bokehPass.enabled` / `scene.fog = sceneFog|null` / `sunMesh.visible`.
- [x] **HTML `#settings` panel** levý dolní roh (izomorfní s `#hud` / `#perfhud` / `#terrainctrl` — coral akcent header, tyrkysový accent checkbox).
- [x] **Wire inline script** v `index.html` — 3 checkbox `change` event → `window.settings.setXxx(checked)`.

### Cleanup

- [x] **`lastHoveredMesh` dead code** smazán — variable se psala v pointermove ale po refactoru se nikde nečetla.

### Slepá ulička — Stage 2 TDRAMP → TTRAMP

User feedback *„Na -7,0,9 by se dal přidat TTRAMP"*. Analýza topologie ukázala cell (-7,9) y_top=−1 s highDirs [S, W] + diag SW (-8,8) y_top=1 (+2 nad cell, ne +1) — Stage 2 L-shape spawn TDRAMP. Hypotéza: vrátit Stage 2 zpět na TTRAMP (sez. 26 raná iterace, TTRAMPS 0 new walls vs. TDRAMP 1.0).

Implementace `terrain.js` — Stage 2 přepojeno na TTRAMP corner s direct-soused surface match (b1/b2 fallback, ne diag). Verify: 100×100 seed 42 TDRAMP 848 → 783, TTRAMPS 548 → 613 (+65 L-shape cells přepnutých). Cell (-7,9) sand orient 0 sedl.

User vizuální verdict: *„Tohle je špatně, vrať se k předchozí verzi"* → revert. Žádná změna terrain.js v finální commitu sez. 31. Sez. 26 final volba TDRAMP na L-shape platí dál.

### Diff celkem (1 commit)

Sez. 31 commit (uncommitted): `src/main.js` +~250/−40, `index.html` +~65/−5, `docs/*` ~+200 ř.

## Sezení 32 (2026-05-13) — Audit follow-up F5/F6/F10/F11/F14 + DD-38 WORLD re-introduce (DAY/DAY_SPEED)

Single-instance na main, žádná topic branch (KISS — drobné izolované Edity + 1 strukturální).

### Audit follow-up — 5 nálezů ze sez. 29 doděláno

User volba 1+3: nejdřív audit cleanup (1), pak sun animace (3). User návrh 1+2 (BatchedMesh) odmítnut — diminishing returns po DD-37, r160→r167+ bump rizikový, hover pipeline čerstvá ze sez. 31. Volba F6 = doc komentář (KISS, Q1=A).

- [x] **F11 — `_b` scratch + balloon zmínka** (`main.js`) — Vector3 `_b` (řádek 536 původně) alokovaný ale 0 čtení (grep potvrdil). Pozůstatek `balloon_bob` animátoru smazaného sez. 15. Smazán + uprav komentář na :530. Komentář u `_dir` na :854 zmiňoval "reuse scratch z balloon animátoru" — refrázován.
- [x] **F14 — RELIEF SSoT (clamp+warn)** (`terrain.js`) — `RELIEF_AMPLITUDE = [..., 6, 6, 6]` a `RELIEF_FREQUENCY = [..., 0.65, 0.65, 0.65]` indexy 9/10 duplikovaly hodnotu 8 a navíc existoval `Math.min(relief, 8)` clamp + warn — dva paralelní mechanismy pro stejnou věc. Smazány duplicitní indexy → pole 0..8 (délka 9), clamp+warn drží jako *záměr* "9/10 zatím nepodporujeme".
- [x] **F10 — Hover-clone material leak v `regenerateScene`** (`main.js`) — `setHoverHighlight(true)` v single-mesh path klonuje material na `userData.hoverHotMat`; `regenerateScene` ho nedispose při `scene.remove`. Po sez. 31 InstancedMesh refactoru batch case nepoužívá klon (overbright `setColorAt`), takže leak vznikal jen ve single-mesh path (primárně water plane). Helper `disposeHoverClones(root)` traverse + `mat.dispose?.() + userData.hoverHotMat = null`, volán ve staleWater cyklu před `scene.remove`.
- [x] **F5 — Shared `_namedTextureCache` registry** (`main.js`) — atlas (`getTcubesKindMaterial`, `getRampAtlasMaterial`) i slow path (`faceMaterialFor`) volaly `NAMED_TEXTURE_FACTORIES[name]()` přímo → každé volání = nová `THREE.Texture` instance. Pro random-patch textury (např. `:dirt`, `:stone`) to znamenalo 2 různé visual varianty pro stejný `:name`. Nový helper `getNamedTexture(name)` s `_namedTextureCache` Map memoizací; 4 call-sites (slow path + TCUBES atlas + ramp atlas) přepojeny. PATH (`_pathTexCache` s `wrapS/wrapT = RepeatWrapping`) ponechán — má jiné texture settings.
- [x] **F6 — Doc komentář k 3 paralelním cache** (`main.js`) — `_faceMaterialCache` (slow path, klíč = stringified val) + `_tcubesAtlasMatCache` (TCUBES atlas, klíč = kind) + `_rampsAtlasMatCache` (ramp atlas, klíč = `${type}_${surface}`). Hub komentář u `_faceMaterialCache` vysvětlí 3 sémantiky + důvod proč ne refactor (3 různé fáze pipeline, klíče, KISS); ostatní dva mají 1-řádkový odkaz "Druhá/Třetí ze tří paralelních cache — viz `_faceMaterialCache` výše".

### DD-38 — WORLD re-introduce (DAY + DAY_SPEED)

User volby: Q1=A (DAY + DAY_SPEED), Q2=A (default 0 paused), Q3=A (light intensity lerping = noc tmavá), Q4=A (UI slidery v #settings).

- [x] **`WORLD extends OBJECTS`** v `model.js` (re-introduce po sez. 29 audit cleanup) — atributy `DAY ∈ [0,1)` (default 0.25 poledne) + `DAY_SPEED ∈ ℝ` (default 0 paused). Bez X/Y/Z (DD-01 demonstrace).
- [x] **Instance `world = new WORLD(...)` + `window.world`** dev exposure v `main.js`.
- [x] **Konstanty:** `SUN_BASE_INTENSITY = 0.8`, `SUN_DISTANCE = √(100+64+100) ≈ 16.25`, `SUN_TILT = π/6` (30° náklon dráhy od svislice — bez něj zenith → stíny svislé → nevizuální).
- [x] **`updateWorldTime(dt)`** — `world.DAY = ((world.DAY + dt * world.DAY_SPEED) % 1 + 1) % 1`. Skip při speed=0.
- [x] **`updateSun()`** — math: `angle = world.DAY * TAU`; `sun.position.set(cos·dist, sin·dist·cos(tilt), sin·dist·sin(tilt))`. Intensity `SUN_BASE_INTENSITY * max(0, sin)` = lerp na 0 v noci. `sunMesh.position.copy(...).multiplyScalar(SUN_DISTANCE_SCALE)`. Visibility `_sunUserVisible && sun.position.y > 0`.
- [x] **Render loop** — `updateAnimations(now) → updateWorldTime(dt) → updateSun() → updateBubbleTails() → ...`.
- [x] **Settings API rozšířeno** — `setDay(v)` / `setDaySpeed(v)` mutují `world.*`; `setSun(on)` přepracován na `_sunUserVisible` flag (override AND s `sun.position.y > 0`).
- [x] **`#settings` panel** rozšířen — 2 slidery (DAY 0..0.999 step 0.01, DAY_SPEED 0..0.1 step 0.001) + numerické labely; CSS `.slider-row` izomorfně s `#terrainctrl .tc-row`.
- [x] **Wire script** v `index.html` — `input` event live update + label `toFixed(2/3)`.
- [x] **DD-38 zapsán** do `DESIGN_DECISIONS.md`: kontext (DD-29 zaniknul sez. 29, WORLD bez konzumenta), rozhodnutí (atributy + math + UI), důvody (DAY první časový atribut mimo TIME singleton, sun direction render-derived), známá omezení (sklon fixed bez SEASON, sky/ambient konstantní, slider DAY nesync při auto-advance), reference (DD-29, DD-01, sez. 29 F4, sez. 31).

### Test (user)

Reload `:8000`, manuální testování DAY slideru + DAY_SPEED auto-advance + Sun toggle. **TEST OK** verdikt po implementaci.

### Diff celkem

`model.js` +24 (WORLD třída), `main.js` ~+90/−15 (audit + WORLD + updateSun), `index.html` +35 (slidery + CSS + wire), `docs/DESIGN_DECISIONS.md` +50 (DD-38), `docs/*` ~+150 ř. (TODO/DONE/DIARY/GLOSSARY/IDEAS).

## Sezení 33 — IDEAS/TODO pruning + DD-39 atmospheric lerping + DD-40 LAMP/SpotLight + cleanup

User makro `%BEGIN` → `IDEAS/TODO` jako první bod programu (sez. 32 Příště eskalovala 13/12 prah). 4 mikro-Q pruning plánu zodpovězeny `A1B A2B A3B A4B` (minimal-impact varianty). Pak `Go ahead` na Sky lerping (DD-39), tmavší noc + LAMP/SpotLight (DD-40), `.glb` user inspirace → TODO. Final user feedback `Test OK`, popisek reliefu → tooltip, lampa odebrána ze scény.

### Pruning IDEAS/TODO (prah 13/12 → 0/12)

- [x] **TODO drop `WCUBES`** — self-protiřečící *„nápad, možná"* (není TODO, je IDEA, už v IDEAS sekci Rozšíření modelu).
- [x] **TODO drop `INVISIBLE`** — self-protiřečící *„možná zbytečné — stačí mateřská CUBES s NAME='marker'?"*.
- [x] **TODO drop `CCUBES typizace`** — self-protiřečící *„překryto DD-24 shape × surface"*.
- [x] **TODO add `## DAY-cycle (WORLD DD-38 follow-up)` sekce** se 2 body (Sky/ambient lerping + Slider DAY sync). SEASON ne v TODO per Q3B (zůstal v IDEAS s `→ TODO` značkou).
- [x] **IDEAS Voidspan inspirace** zhuštěno z ~30 ř. na 3 ř. (DD-31 → DD-32 wipe sez. 25 zrušil factory toy, git history `feat/factory` drží detaily).
- [x] **IDEAS Performance optimalizace** zhuštěno z ~25 ř. na ~7 ř. (changelog 1 odstavec: sez. 26 FPS 15 → sez. 28 atlas 92 → sez. 30 rampy atlas 123 → sez. 31 DD-37 InstancedMesh 100×100 z 7→104 + jen otevřené kandidáty BatchedMesh/Mesh merge).
- [x] **IDEAS SEASON** dostal `→ TODO` značku v sekci WORLD rozšíření.
- [x] **Audit cadence IDEAS/TODO pruning čítač** `13/12 → 0/12 (reset sez. 33)`.

Net: TODO 15 → 14 položek (drop 3, add 2). IDEAS −45 ř. obsolete.

### Scene cleanup

- [x] **GridHelper + AxesHelper smazány** z `buildScene()` (3 ř.). Orientační pomůcky z M2/M14 ztratily relevanci po DD-32 terrain pivotu.
- [x] **ShadowMaterial ground plane smazán** (14 ř., `PlaneGeometry(20,20)` + `ShadowMaterial opacity 0.35`, Y=−0.501). Po DD-32 wipe groundplane ztratil smysl — generated terrain má vlastní voxely.

### DD-39 atmospheric lerping (sky + fog + ambient reactive na DAY)

User: *„Co svítí v noci za světlo? Proč je stále vidět?"* — diagnose 3 zdrojů (AmbientLight 0.15 konstantní + scene.background SKY_COLOR konstantní + scene.fog.color SKY_COLOR konstantní). Mapuje na TODO `## DAY-cycle → Sky/ambient color lerping` z dnešního pruningu. User volba `A1A A2A A3A A4A` (2 keypointy, AMBIENT 0.04 noc, current SKY = SKY_DAY, daylight curve `max(0, sin(2π·DAY))`).

- [x] **Konstanty v `main.js`** — `_skyDay = THREE.Color(0x1a1a2e)` (poledne, beze změny), `_skyNight = THREE.Color(0x000000)` (úplná čerň po user iteraci 0x05080f → 0x010207 → 0x000000), `AMBIENT_DAY = 0.15`, `AMBIENT_NIGHT = 0.005` (téměř 0 po user iteraci 0.04 → 0.015 → 0.005). `SKY_COLOR` smazán (placeholder `scene.background = THREE.Color().copy(_skyDay)`).
- [x] **`sceneFog = THREE.Fog(_skyDay.getHex(), 30, 120)`** — placeholder, updateAtmosphere přepisuje per-frame.
- [x] **`ambientLight` proměnná** (z inline `scene.add(new THREE.AmbientLight(...))` → `const ambientLight = ...; scene.add(ambientLight)`).
- [x] **`updateAtmosphere()`** nová funkce po `updateSun()`: `scene.background.lerpColors(_skyNight, _skyDay, daylight)` + `sceneFog.color.copy(scene.background)` + `ambientLight.intensity = AMBIENT_NIGHT + (AMBIENT_DAY - AMBIENT_NIGHT) * daylight`. Bez alokace per-frame.
- [x] **Render loop call** — `updateAnimations → updateWorldTime → updateSun → updateAtmosphere → updateBubbleTails → ...`.
- [x] **Komentář v `updateSun()` aktualizován** — "0.15 ambient" → "AMBIENT_NIGHT 0.005 + tmavé pozadí, vizuálně temná silueta".
- [x] **DD-39 zapsán** do `DESIGN_DECISIONS.md` (~60 ř.): kontext (DD-38 follow-up, 3 zdroje konstantního světla), rozhodnutí (updateAtmosphere + 2 keypointy + lerpColors + driver), důvod (třetí konzument DAY + pattern atmospheric helper + performance bez alokace), známá omezení (jen 2 keypointy bez sunset peaku, AMBIENT_NIGHT 0.005 = noc bez lampy nevizuální, žádný sezónní offset), reference (DD-38, DD-29).

### DD-40 LAMP třída + SpotLight pattern

User: *„Klidně ještě ztmav noc. Přidej na -3,0 kompozit lampy, ať to vynikne."* — první iterace PointLight (360°). User feedback: *„Pozor, lampa musí být three.js zdrojem světla tj. vytvářet stíny. ne?"* + *„Super, ale pod lampou je stín. Udělej ji směrovou. Třeba v tomto balíčku [PBR Street Props .glb/.zip/.usdz] je hezká lampa."* User volba `Q1A` (skip `.glb` import, voxelově) + `Q2A` (Victorian-style sloup + paže + stínítko).

- [x] **`LAMP extends COMPOSITES`** v `model.js` (+11 ř.) — značkovací třída, žádné vlastní atributy (zdědí `ORIENTATION`).
- [x] **`buildLamp(instance)`** v `main.js` (~70 ř.) — Group ze 4 částí:
  - Sloup 0.15×2×0.15 dark iron (`MeshStandardMaterial 0x1a1a1a roughness 0.7`).
  - Horizontální paže 0.6×0.08×0.08 z vrcholu sloupu.
  - Visící stínítko 0.35×0.3×0.35 z konce paže, tmavé venku + emissive `0xffaa00 emissiveIntensity 0.8`. `userData.noShadow = true` (světlo uvnitř → mesh nesmí blokovat).
  - **`SpotLight(0xffaa00, intensity=5, distance=12, angle=π/5, penumbra=0.4, decay=2)`** uvnitř stínítka, `castShadow=true`, shadow 512×512 cube map, near 0.1, far 14, bias -0.002.
  - **`SpotLight.target = Object3D`** v Group s pos `(0.6, -3, 0)` → vertikálně dolů, rotuje s ORIENTATION ale vertikalita zachována.
- [x] **Dispatch v `createMeshFor`** — `else if (instance instanceof LAMP)` před SPRITES.
- [x] **Iterace PointLight → SpotLight** — PointLight 360° měl stín pod lampou (sloup blokoval paprsky dolů). SpotLight kuželové míří jen dolů, sloup mimo kužel. Plus realistická pouliční lampa.
- [x] **Instance `lamp_0001` test + odebrána** — `(-3, 0, 0)` v `buildScene()` přidán, otestován, pak smazán per user *„Odeber lampu ze scény, v objektech ji ponechej."* Třída + builder + dispatch zachovány.
- [x] **DD-40 zapsán** do `DESIGN_DECISIONS.md` (~75 ř.): kontext (DD-39 noc maxed, vizuální payoff), rozhodnutí (LAMP třída + Victorian builder + SpotLight + noShadow pattern + target v Group), důvod (první lokální dynamický light, generalizovatelný `noShadow` pattern, shadow setup baseline), známá omezení (shadow per PointLight/SpotLight drahá, emissive ≠ skutečné světlo, `.glb` import budoucí DD), reference (DD-26, DD-29, DD-39).

### UI cleanup

- [x] **Popisek reliefu → tooltip** — `<div class="tc-relief-name" id="tc-relief-name">Rolling</div>` smazán z `index.html`, CSS `.tc-relief-name` smazán, JS `reliefName.textContent = ...` přesunut na `relief.title = ...` (native browser tooltip). Default `title="Rolling"` matchne `value=3`.

### Test (user)

Reload `:8000`, posun DAY slideru 0.25 → 0.75 (poledne → půlnoc), test lampy + SpotLight v noci. Po každém kroku **TEST OK** verdikt.

### Diff celkem

`src/main.js` ~+90/−50 (atmospheric konstanty + `updateAtmosphere` + LAMP import + `buildLamp` + dispatch + render loop; cleanup GridHelper/AxesHelper/groundPlane/lamp instance), `src/model.js` +11 (LAMP třída), `index.html` ~−10 (CSS + DOM `<div>` + JS reliefName + `title=` add), `docs/DESIGN_DECISIONS.md` ~+135 (DD-39 + DD-40), `docs/*` ~+200 ř. (TODO update G0-G3 + DAY-cycle + audit cadence; DIARY index + sez. 33; GLOSSARY LAMP + atmospheric; IDEAS pruning Voidspan/Performance/SEASON).

## Sezení 34 (2026-05-13) — G0 Lowpoly vertex-color pipeline (DD-41 supersede DD-36)

- [x] **G0a TCUBES → vertex colors.** `BLOCK_COLORS` 3-key paleta (TOP/BOTTOM/SIDE × 4 kindy grass/dirt/stone/sand), sdílený `_lowpolyMat = MeshLambertMaterial({ vertexColors: true })`. `getTcubesKindGeom(kind)` cache `BoxGeometry` s color attribute (24 verts × 3 floats, sRGB→linear convert). `spawnTerrain` Pass 1 whitelist `BLOCK_COLORS` + Pass 2 TCUBES dispatch `geom = getTcubesKindGeom(surface)`, `mat = _lowpolyMat`. DD-37 InstancedMesh batche unchanged.
- [x] **G0b Rampy → vertex colors.** `RAMP_FACE_VERT_COUNTS` per typ (trramps `[4,4,4,3,3]` / ttramps `[3,3,3,3]` / tdramp `[3,3,4,8,6]`), `RAMP_FACE_PALETTE_KEYS` mapuje faceIdx na BLOCK_COLORS klíč. `_lowpolyRampGeomCache: Map<"trramps:grass", BufferGeometry>` + `getRampGeom(type, surface)` klonuje atlas IIFE raw geom (TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE) + drop UV + inject color attribute. `spawnTerrain` Pass 2 ramp dispatch sloučen do 1 větve (3 typů → shared mat).
- [x] **flatShading: true → drop (user nález seam).** Při slabém světle viditelné šedé/černé linky mezi sousedními voxely. Diagnóza: `flatShading: true` nutí shader spočítat normálu z `dFdx/dFdy` derivatives → InstancedMesh cross-instance precision artifact. Fix: drop `flatShading: true` (default false), shader vezme per-face normály z `geometry.attributes.normal` (BoxGeometry už má per-face normály z vertices nesdílené přes faces).
- [x] **Palette tweak (user).** Sand více žlutá (`0xe8d97a` TOP / `0xd9c66a` sides), stone světlejší šedá (`0x9a9a9a` / `0x8a8a8a`).
- [x] **Cleanup atlas garbage.** Smazáno: `BLOCK_TEXTURES`, `ATLAS_TILE_PX`, `ATLAS_FACE_KEYS`, `_sharedAtlasBoxGeom` + `getSharedAtlasBoxGeom()`, `_tcubesAtlasMatCache` + `getTcubesKindMaterial()`, `RAMP_EDGE_TEXTURES`, `RAMP_CORNER_TEXTURES`, `RAMP_DIAGONAL_TEXTURES`, `RAMP_SURFACE_FROM_KIND`, `RAMP_ATLAS_SPECS`, `_rampsAtlasMatCache` + `getRampAtlasMaterial()`, `createTRRampFor`, `createTTRampFor`, `createTDRampFor` slow-path funkce, `createMeshFor` ramp dispatch case, `createTCubeFor` atlas fast-path + slow-path material[6] array (nahrazeno lowpoly + šachovnice fallback DD-07). Perf HUD `mat` čítač: drop atlas cache součty.
- [x] **Model.js drop tex args.** TCUBES/TRRAMPS/TTRAMPS/TDRAMP constructory: drop `textures` arg + `TEXTURE_*` fields. JSDoc updated (face geometry zachována, drop per-face `TEXTURE_*` atribut prefix; nové wording odkazuje na `BLOCK_COLORS` + `RAMP_FACE_PALETTE_KEYS`). TTUNELS si zachovává `TEXTURE_*` (mimo G0 scope, sub-prah TODO).
- [x] **TODO follow-up z `tiny-world-builder` inspirace** (4 body): drop-in animace tiles při `regenerateScene` (z `dropAnims` queue), tilt-shift post-process (gradient blur podle screen Y), `ExtrudeGeometry` pro rampy (lazy refactor), adjacency-aware re-render pattern pro PATH/FENCE/WALL.
- [x] **DD-41 zápis** (immutable log, supersede DD-36 atlas pipeline).

### Test (user)

100×100: FPS **101** (parita sez. 31 baseline 104, statisticky stejné), 15 geomů, 13 batchů zachovaných (DD-37 stable). Hover overbright (DD-37 `instanceColor` × vertex colors multiplikativně) funguje. DD-39 atmospheric lerp (day↔night) funguje. 30×30 seam fix verifikován při slabém světle.

### Diff celkem

`src/main.js` ~+150/−250 (G0a/G0b lowpoly pipeline ~+150 ř., atlas builders/tabulky ~−200 ř., cleanup `createTCubeFor`/`createMeshFor` dispatch ~−50 ř., net ~−120 ř.), `src/model.js` ~−25 ř. (drop `textures` args + `TEXTURE_*` fields z 4 BLOCKS tříd, JSDoc rewrite), `docs/DESIGN_DECISIONS.md` ~+90 (DD-41), `docs/*` ~+200 ř. (TODO close G0 + 4 follow-up + 2 sub-prah; DIARY index + sez. 34 sekce; GLOSSARY DD-41 termíny).

## Sezení 35 (2026-05-13) — G1 Volba max Y + G2 Climate (DD-42 + DD-43)

- [x] **G1 quick win — UI clamp `relief.max` dle `MIN(sx, sz)`.** `src/terrain.js` export `maxReliefForSize(sx, sz)` (vzorec `floor(MIN/10)`, reverse lookup do `RELIEF_AMPLITUDE`, idx 8 cap → 10). `src/main.js` import + `window.maxReliefForSize` expose. `index.html` `updateReliefSliderMax()` v terrainctrl IIFE, wire na `sizeX/sizeZ.input` event (live), init call. Programmatic `relief.value` change neemituje `change` event → no regen feedback loop. Mapping: 3→1 / 10→3 / 30→5 / 50→7 / 60+→10. Žádný DD (UX feature, žádný architectural change).

### G2 Climate (DD-42)

- [x] **WORLD atributy LATITUDE × HUMIDITY.** `src/model.js`: `this.LATITUDE = "temperate"` (4 enum: tropical/subtropical/temperate/polar), `this.HUMIDITY = "mid"` (3 enum: wet/mid/dry). JSDoc rozšířen + DD-29 politika dodržena (2 živí konzumenti).
- [x] **`SUN_TILT_BY_LATITUDE` lookup nahrazuje DD-38 fixed `SUN_TILT`.** `src/main.js`: `tropical=0` / `subtropical=π/12` / `temperate=π/6` (parita) / `polar=π/3`. `updateSun()` per-frame čte z lookup (fallback temperate). DD-37 InstancedMesh batche stable.
- [x] **`BIOME_NAMES` 4×3 export.** `src/terrain.js`: 12 buněk (Tropický deštný prales / Savana / Horká poušť / Vlhké subtropy / Mediteránní / Subtropická step / Listnatý les / Step Prérie / Chladná poušť / "—" / Tundra / Ledová poušť). Polar/wet "—" placeholder (geo edge case). Window expose pro inline UI.
- [x] **`window.settings` extend.** `setLatitude(v)` (validace klíče proti `SUN_TILT_BY_LATITUDE`), `setHumidity(v)`.
- [x] **UI Climate sekce v `#terrainctrl`.** CSS `.climate-row` (88px val column pro slovní enum), `.tc-biome` (tyrkysový akcent — derivovaný read-only). HTML 2 slidery (`tc-latitude` 0..3, `tc-humidity` 0..2, step 1) + biome readout `tc-biome-val`. Wire-up v IIFE: `LATITUDE_KEYS/NAMES`, `HUMIDITY_KEYS/NAMES`, `updateBiomeReadout()`, `input` listenery (mutují WORLD přes `window.settings`, žádný `change` regen). Init readout match WORLD defaults (temperate+mid → "Step / Prérie").
- [x] **DD-42 zápis** (immutable log, aktivace DD-29 odložený `CLIMATE` slot rozšířený na 2 atributy).

### Pre-G2 micro-fix — DD-43 DAY mapping standardizace 0.5 = poledne

- [x] **`updateSun()` math fix.** `sin(α)/cos(α)` → `sin(α)/(-cos(α))` parametrizace (X horizont = sin, Y výška = -cos · cos(tilt), Z polar = -cos · sin(tilt)). Verifikace: 0.0=půlnoc / 0.25=východ / 0.5=poledne / 0.75=západ.
- [x] **`updateAtmosphere()` daylight křivka.** `Math.max(0, Math.sin(...))` → `Math.max(0, -Math.cos(...))`. DRY s sun intensity.
- [x] **HTML default sync.** `<input id="set-day" value="0.25">` → `value="0.5"`, span readout `0.50`.
- [x] **WORLD constructor default sync.** `this.DAY = 0.25` → `this.DAY = 0.5`. JSDoc nový mapping (0=půlnoc, 0.25=východ, 0.5=poledne, 0.75=západ).
- [x] **Komentáře update** v `main.js` (sky/ambient header + `updateSun` doc block).
- [x] **DD-43 zápis** (immutable log, supersede DD-38 sun position math; DAY/DAY_SPEED atributy + driver pattern zachovány).

### Surface drift fix (bug fix, ne DD)

- [x] **Pre-existing rounding drift v `normalizeSurfaces`.** Sez. 26 původ — `toFixed(2)` × 4 sliderů = ±0.02 sum worst-case drift, generátor tolerance ±0.001 → throw → tichá failure. Reproduce: sekvence ≥2 multi-slider pohybů.
- [x] **Fix v `index.html` `readParams()`.** Divide-by-sum normalize (4 řádky). Single-point fix v UI (jediný caller generátoru). Generátor tolerance neměnit (KISS, defensive při unknown caller).
- [x] **Test 3 user (po fix předpokládáno OK z `%END` triggeru).**

### Test (user)

TEST 1 OK (G1 — relief slider clamp na různých size). TEST 2 OK (DD-43 DAY 0.5=poledne / DD-42 Climate sun tilt + biome readout). TEST 3 — bug report → fix → assumed OK.

### Diff celkem

`src/terrain.js` +33/0 ř. (G1 `maxReliefForSize` + G2 `BIOME_NAMES`), `src/main.js` ~+55/−23 ř. (G1 import+expose + G2 SUN_TILT_BY_LATITUDE/updateSun-tilt-lookup/setLatitude+setHumidity/BIOME_NAMES expose, DD-43 updateSun+updateAtmosphere math posun + komentáře), `src/model.js` ~+22/−1 ř. (WORLD JSDoc rozšíření + DAY=0.5 + LATITUDE+HUMIDITY atributy), `index.html` ~+104/0 ř. (G1 updateReliefSliderMax + wire, G2 CSS .climate-row+.tc-biome + Climate sekce DOM + IIFE wire-up + biome readout, surface fix readParams divide-by-sum, set-day default 0.5), `docs/DESIGN_DECISIONS.md` ~+95 ř. (DD-42 + DD-43), `docs/*` ~+150 ř. (TODO close G1+G2 + 2 G2 sub-prah; DIARY index + sez. 35 sekce; GLOSSARY WORLD update).
