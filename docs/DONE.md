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

## Sezení 36 (2026-05-13) — G3 SURFACES driver-derived per biome (DD-44)

- [x] **`BIOME_SURFACES` 4×3 lookup** v `src/terrain.js` (12 buněk × 4 koef. `grass`/`stone`/`sand`/`water`, sum=1.0). Tabulka hardcoded — 12 řádků, per-cell volnost (Tropický prales 0.55/0.05/0.05/0.35; Sahara 0.00/0.10/0.90/0.00; Tundra 0.10/0.50/0.30/0.10). HUMIDITY → water+grass, LATITUDE → stone vs. sand.
- [x] **`surfacesForBiome(lat, hum)` helper** + `BIOME_SURFACES` export. Fallback na `temperate.mid` při neznámém klíči (defensive).
- [x] **`BIOME_NAMES.polar.wet` rename** z `"—"` na `"Polární tundra"`. `BIOME_SURFACES.polar.wet = polar.mid` alias (Arktická tundra geografi nejbližší).
- [x] **`src/main.js` driver wire** — import `BIOME_SURFACES`/`surfacesForBiome`, expose `window.BIOME_SURFACES`/`window.surfacesForBiome`. `TERRAIN_DEFAULTS` zbavené hardcoded `surfaces`. `buildScene()` dohnají z `world.LATITUDE/HUMIDITY` při bootu.
- [x] **UI hard override** v `index.html`: Surface DOM sekce (4 slidery + auto-normalize) **smazána**. IIFE refactor — `SURFACE_KINDS`/`surfInputs`/`surfVals`/`normalizeSurfaces` pryč. `LATITUDE_KEYS/NAMES`/`HUMIDITY_KEYS/NAMES` + Climate DOM refs přesunuty nahoru (sloučeno do jedné deklarace, `readParams()` je potřebuje pro `surfacesForBiome` lookup). Climate slidery `change` event triggeruje regen (kromě dnešního `input` per-frame sun tilt).
- [x] **Sub-prah TODO snow surface** (G4 kandidát) zapsán — `polar.*` v `BIOME_SURFACES` aktuálně používá `sand` jako sníh proxy.
- [x] **DD-44 zápis** (immutable log, aktivace DD-29 odložený `CLIMATE` slot full — 2 živí konzumenti: sun tilt G2 + surface mix G3).

### Smoke test

Node ESM test `src/terrain.js` — sum check 12/12 buněk OK (sum=1.0 ±0.001), `polar.wet === polar.mid` alias OK, `surfacesForBiome(tropical, dry) = sand 0.90` OK, fallback `(garbage, garbage) = temperate.mid` OK, `generateTerrain({surfaces: surfacesForBiome(lat, hum)})` všech 12 combiny bez chyby. Browser test (user): verify Tropický+Sucho = Sahara look, Polár+Vlhko = "Polární tundra" readout, surface slidery zmizely.

### Diff celkem

`src/terrain.js` +60/−1 ř. (BIOME_SURFACES + surfacesForBiome + polar.wet rename), `src/main.js` ~+15/−5 ř. (import + expose + TERRAIN_DEFAULTS bez surfaces + buildScene driver wire), `index.html` ~+35/−95 ř. (DOM Surfaces sekce delete, IIFE refactor — SURFACE_KINDS/surfInputs/normalizeSurfaces pryč, Climate KEYS/NAMES/DOM nahoru, readParams přes surfacesForBiome, climate change → regen), `docs/DESIGN_DECISIONS.md` ~+50 ř. (DD-44), `docs/*` ~+80 ř. (TODO close G3 + close polar/wet sub-prah + add snow surface sub-prah; DONE sez. 36; DIARY index + sez. 36 sekce; GLOSSARY DD-44 termíny).

### Sezení 36 pokračování — DD-45 fBm + ridge³ heightmap

User feedback po G3 commit + merge: *„50×50 relief 7 = neprostupný šum, nešlo by hřebenovité hory s údolími?"* Diagnóza: 1-okt value-noise + freq 0.55 = ~1.8 cells per noise uzel × full amp 5 = vrchovinný šum, ne hory. Topic branch `feat/terrain-noise` checkout z main po G3 merge.

- [x] **`fbmSample(noiseFn, x, z)` helper** v `terrain.js` — 3 oktávy s persistence 0.5, lacunarity 2.0, normalize děli `1 + 0.5 + 0.25 = 1.75`. Multi-scale: velké útvary (base freq) + střední (2× freq) + jemné detaily (4× freq).
- [x] **`ridge(v)` helper s `r³`** — `1 - |2v - 1|`, pak cubed. 3 iterace pure → ² → ³ (plateau efekt snížen 58% → 33% → 23%). Cubed verze: E ≈ 0.25, peaks vzácné, údolí dominantní.
- [x] **Blend formula `(1 - rw) * fbm + rw * ridge³`** + `ridgeWeight = max(0, (relief - 4) / 4)`. Relief 0-4: pure fBm (rolling hills); relief 5-8: ridge increasing weight (horské hřebeny).
- [x] **`RELIEF_AMPLITUDE` retune**: idx 8: 6 → 8 (Alpine full ridge snese vyšší peaks na 100×100). Idx 0-7 beze změny — `maxReliefForSize` UX zachován (50×50 dál relief 7 dostupný).
- [x] **`RELIEF_FREQUENCY` retune**: idx 6-8: 0.45/0.55/0.65 → 0.18/0.15/0.12 (dramaticky nižší pro velké hřebeny). Idx 1-5 mírně nižší (0.12-0.20) — fBm horní oktávy zmnoží automaticky přes lacunarity².
- [x] **DD-45 zápis** (immutable log, algoritmická změna ovlivňuje všechny existující seed × relief × size kombinace).
- [x] **Sub-prah TODO** G5 bimodální heightmap (threshold step / dual noise) + Math.floor experiment pro low relief plateau — wait pro user vizuální feedback.

### DD-45 Diff

`src/terrain.js` ~+45/−5 ř. (fbmSample + ridge helpers + RELIEF tabulek retune + heightmap loop refactor 1 → 3 noise lookups), `docs/DESIGN_DECISIONS.md` ~+60 ř. (DD-45 sekce), `docs/TODO.md` ~+5 ř. (G5 + Math.floor sub-prahy), `docs/GLOSSARY.md` 1 ř. (header DD-45), `docs/DIARY.md` index + diary sez. 36 pokr.

### Sez. 36 Smoke testy

**G3:** ESM Node — 12/12 buněk sum=1.0 ±0.001 OK, `polar.wet === polar.mid` alias OK, `surfacesForBiome(tropical, dry)` = sand 0.90 OK, fallback `(garbage, garbage)` = temperate.mid OK, `generateTerrain` projde všemi 12 climate combiny bez chyby.

**DD-45:** ESM Node histogram check pro 50×50 r3/r5/r7:
- 50×50 r3 (pure fBm): range -2..1, 47%/46% bimodální = stejné jako dnes (no regrese).
- 50×50 r5 (25% ridge): range -2..2, 55% na Y=2 (clustering kvůli low amp + round, sub-prah TODO).
- 50×50 r7 (75% ridge): range -1..4, distribuce Y=1(16%)/Y=2(27%)/Y=3(30%)/Y=4(23%) = single-peak kolem Y=3.
- 100×100 r10 (Alpine 100% ridge): range -2..8 (11 úrovní), široká distribuce mean Y=3 peak 16 %, 5238 ramps.

Browser test (user, sez. 37): visual confirm pro 50×50 r7 — pokud "lepší ale stále plateau" → G5 implementace.

## Sezení 37 (2026-05-13) — DD-46 Smoothstep bimodální heightmap (G5)

User feedback po DD-45 vizuálním testu (46×47 r6 seed 42 polar/wet): *„Je to mnohem lepší. Šum ustoupil. Vznik hřebenů a údolí! Ale ještě bych to posílil."* Diagnóza: DD-45 ridge³ blend dává single-peak right-skew distribuci, ne bimodální. User wish = definičně bimodal. Topic branch `feat/terrain-bimodal` z main.

- [x] **`smoothstep(lo, hi, v)` helper** v `terrain.js` — `3t² - 2t³` mapping z range na [0,1] s C¹ okraji. Klamp mimo range.
- [x] **4 DD-46 konstanty** (`BIMODAL_RELIEF_THRESHOLD=6`, `VALLEY_AMP=-1`, `SMOOTHSTEP_LO=0.4`, `SMOOTHSTEP_HI=0.6`, `useBimodal=reliefClamped>=6`).
- [x] **Heightmap loop body větvení** — pro `useBimodal`: `t = smoothstep(0.4, 0.6, fbmVal); blended = VALLEY_AMP + (amplitude - VALLEY_AMP) * t; h = round(blended)`. Else DD-45 ridge³ blend beze změny (r ≤ 5).
- [x] **Hard switch při r=6** — r0-5 zůstává DD-45 ridge³ (rolling hills), r6-8 přepne na smoothstep bimodal (horský landscape). KISS volba (alternativa: plynulý morph r5-8 → sub-prah pro budoucí feedback).
- [x] **VALLEY_AMP=−1** — jeden voxel pod sea level. Při wet biome voda zatopí údolí (max kontrast). PEAK_AMP=`amplitude` tabulka (4 pro r6, 5 pro r7, 8 pro r8) beze změny.
- [x] **Smoothstep range (0.4, 0.6)** — úzký interval = výrazný bimodal (60 % cells na extrémech, 40 % v transition).
- [x] **DD-46 zápis** (immutable log) — algoritmická změna pro relief ≥ 6 (r ≤ 5 byte-identický s DD-45).
- [x] **Sub-prah TODO** symmetric VALLEY_AMP=−amplitude varianta + plynulý morph r5↔r6 — wait pro user feedback.

### DD-46 Diff

`src/terrain.js` +35/−6 ř. (smoothstep helper + 4 konstanty + heightmap loop body větvení; DD-45 sekce komentář rozšířená o DD-46 popis), `docs/DESIGN_DECISIONS.md` +62 ř. (DD-46 sekce: Stav, Rozhodnutí 6 bodů, Důvod, Smoke test tabulka, Známá omezení 4 body, Reference), `docs/TODO.md` ~+10 ř. (close G5 sub-prah, add 2 DD-46 follow-up sub-prahy, cadence update na 8/8), `docs/GLOSSARY.md` ~1 ř. (header DD-46), `docs/IDEAS.md` ~+15 ř. („voda ve všech skupenstvích" raw nápad), `docs/DIARY.md` index + diary sez. 37 sekce.

### Sez. 37 Smoke test

ESM Node histogram check pro 5 cases (USER case + 2 high-relief bimodal + 2 regrese):

| Case | Relief | Size | Top peaks |
|------|--------|------|-----------|
| **USER case** polar/wet seed 42 | 6 | 46×47 | Y=−1: 34 % (valley) \| Y=4: 18 % (peak) \| Y=1: 6 % (transition min) — bimodal ✓ |
| Polar/wet 50×50 | 7 | 50×50 | Y=−1: 29 %, Y=5: 19 %, Y=1: 7 % min — bimodal ✓ |
| Alpine temperate/mid 100×100 | 10 | 100×100 | Y=−1: 39 %, Y=8: 24 % — bimodal ✓ |
| **Regrese** r3 10×10 | 3 | 10×10 | Y=−1: 67 %, Y=1: 32 % — beze změny vs. DD-45 ✓ |
| **Regrese** r5 30×30 | 5 | 30×30 | Y=−1: 14 %, Y=1: 38 %, Y=2: 47 % — single-peak ridge³, beze změny ✓ |

**Y=0 chybí** v bimodal výstupu (smoothstep cliff = žádaná vlastnost bimodal distribuce, ne bug). Disclosure proaktivní.

Browser test (user): verdikt *„Super!"* → DD-46 close. User raw nápad pro příště: *„voda ve všech skupenstvích..."* → IDEAS.md.

## Sezení 38 (2026-05-13) — DD-47 G6 climate-driven surface state + DD-48 atmospheric color extensions + %AUDIT:CODE cleanup

Multi-feature single-instance sezení na main bez topic branche. Audit cleanup K1/K2/D1/D2/D3/D4 + 2 nové DD + řada bug fixů.

### Audit cleanup (sez. 38 `%AUDIT:CODE`)

- [x] **K1 README.md docs drift sync** — Status sekce (DD-37→DD-46 milníky chyběly, 8 sezení drift), Hierarchie modelu (drop `TEXTURE × N` po DD-41, add LAMP COMPOSITES potomek, WORLD doplnit LATITUDE/HUMIDITY), Plán otevřených bodů (drop dořešené SEASON-driver+sky lerp, add „voda ve všech skupenstvích" + Snow surface G4 + glTF asset pipeline). ~20 ř. diff.
- [x] **K2 CLAUDE.md docs drift sync** — Key Files tabulka (model.js + main.js + terrain.js sync s DD-39/40/41/42/43/44/45/46/47/48), pointer DD-01..DD-46 (po sez. 38 update). 4 řádky diff.
- [x] **D1 `BLOCKS` + `COMPOSITES` import drop** — main.js:13 import expression. Verifikováno gepem (žádný `instanceof BLOCKS`/`COMPOSITES`, `new BLOCKS()`/`new COMPOSITES()` runtime). Trivial 2-jmen drop.
- [x] **D2 TTUNELS DROP** — User volba DROP varianty (vs. migrate na lowpoly nebo wait). Smazána třída TTUNELS (`model.js` −37 ř.) + dispatch case + builder section (`main.js` ~−287 ř., section header + TTUNEL_GEOM_CACHE IIFE + createTTunnelFor) + import + GLOSSARY entry + zmínky napříč docs (5+ outdated). Vrátit z git historie pre-sez. 38, až budou tunely chtěné (procedurální paths + tunely jako součást terrain generátoru).
- [x] **D3 terrain.js komentář ř. 70** — „Relief 0..8" → „Relief 0..10 (clamp 8 internal)". Drobná dezinformace API contract.
- [x] **D4 GLOSSARY engine-internal maps odstavec** — `_terrainBatches`, `meshByInstance`, `_faceMaterialCache`, `_lowpolyMat`, `RAMP_FACE_VERT_COUNTS`/`RAMP_FACE_PALETTE_KEYS` — kritická infrastruktura, kterou onboard čtenář potřebuje znát. +6 ř. v sekci "Lowpoly vertex-color pipeline".

### Adaptive fog (sez. 38 bug fix, žádný DD)

- [x] **Adaptive fog distances dle scene size** — `updateFogForSize(sx, sz)` v `spawnTerrain`: `near = max(sx, sz) * 0.3, far = max(sx, sz) * 1.2 + 10`. Aditivní +10 oslabuje pro malé scény víc (10×10: 12→22, +83 %) než velké (100×100: 120→130, +8 %). Důvod: fixed `near=30, far=120` ze sez. 31 byl pro 100×100 perf test, default 10×10 měl celou scénu v <near zóně → toggle FOG byl vizuálně bez efektu.

### Hover dirt fix (sez. 38, žádný DD)

- [x] **Dirt color lighten** — `0x6b4423 → 0x8a5e36` v `BLOCK_COLORS.dirt.*` + `grass.{BOTTOM,SIDE}`. Důvod: tmavá dirt × multiplikativní hover `(1.6, 0.8, 0.2)` = tmavě hnědá s oranžovým nádechem, ne sytá oranžová. Po lighten: hover (0.86, 0.30, 0.042) = sytá oranžová. Bonus: terén čitelnější i bez hover.

### Biome readout onload bug fix (sez. 38, žádný DD)

- [x] **`updateBiomeReadout` + `updateReliefSliderMax` defer na DOMContentLoaded** — Inline classic `<script>` IIFE v `index.html` běží sync při parsování, PŘED `<script type="module" src="src/main.js">` (defer-like). V tom okamžiku `window.BIOME_NAMES` undefined → fallback "—". DOMContentLoaded firuje po všech defer/module scriptech. Plus drop falešný komentář o "`defer` na module garantuje". Bonus: relief slider `max` při onLoad teď správně 3 pro default 10×10 (= Rolling).

### DD-47 Climate-driven surface state (G6 sez. 38)

- [x] **Drop water surface kind.** `SURFACE_Y_OFFSET` 4 → 3 (drop `water: -2`). `BIOME_SURFACES` 12 řádků: water sloupec smazán, % přerozděleno (fertile biomy → grass, polar → stone+sand). `generateTerrain` drop topKind dirt-pod-water trick + water plane spawn. `main.js` drop `_waterMat`/`_waterGeom`/`createWaterPlane` *(vrácené ve DD-48 LIQUID prototype níž s ice variantou)*. `regenerateScene` drop staleWater filter. **BIOME_NAMES rename:** `tropical.wet` „Tropický deštný prales" → „Tropický prales" (drop voda reference).
- [x] **Snow distribution per LATITUDE** — `snowSpecForLatitude(latitude)` helper: polar → all snowed, temperate → `y_top ≥ 6` vždy + **sort+rank top 30 %** zbylých cells dle `score = snowNoise + altNorm × 0.3`, jiné → bez sněhu. Sort+rank izomorfní s biome assignment Kroku 2 (sort+threshold) — zachová target 30 % area shifted distribuce k vyšším cells. Iterace v sez. 38: (1) uniform noise → user "vrcholy bez sněhu", (2) altitude-biased threshold → user "moc sněhu", (3) sort+rank → user "Super!".
- [x] **Snow implementace.** `BLOCK_COLORS` 4 → 8 (`_snow` varianta TOP=`0xf5f5f5` off-white, BOTTOM/SIDE base). Top voxel kindu dostane `_snow` postfix při `c.snowed`. Sloupcové vrstvy beze změny (sníh leží shora). Ramps dědí `_snow` z source cell svahu (Pass 2). Water cells override `snowed = false`.
- [x] **Water LIQUID prototype + priority flood** — `waterSpecForClimate(latitude, humidity)` helper: dry no water, wet/mid enabled, freezeRatio polar 1.0 / temperate 0.3 / sub-tropical 0.0. **MinHeap class** (binary heap, ~30 ř.) pro priority flood (Wang & Liu 2006). Boundary cells iniciate `water_level = y_top` → push do heap. Min-heap propaguje od nejnižší úrovně dovnitř: `nLevel = max(level, neighbor.y_top)`. Cell má vodu pokud `water_level > y_top`. Boundary jako overflow (Q2=a) — voda uteče přes nejnižší boundary cell ven.
- [x] **Water materials vrácené po DD-47 drop** — `_waterMat` (0x3a7090, opacity 0.55, metalness 0.20, roughness 0.25), `_iceMat` (0xd9e8ec po DD-48 ice color lighten, opacity 0.85, metalness 0.05, roughness 0.55 = větší zákal + menší reflexe per user spec). Per-cell THREE.Mesh (= LIQUID prototype), clustering connected components do bbox sub-prah pro perf na velkých scénách. Hladina `wl + 0.45` (= 0.05 pod top face rim cell → břeh voxel mírně „trčí" jako reálný shore).
- [x] **DD-47 zápis** — climate-driven surface state. Konceptuální izomorfie s DD-44 surface driver. Krok směr k LIQUID 1. třída entitě (DD-25 vrstva 4 sub-prah).
- [x] **Sub-prah TODO** (3) — water cluster do bbox, SEASON driver pro freezeRatio, ice canvas texture noise patches.

### DD-48 Atmospheric color extensions (sez. 38)

- [x] **Sun color 3-keypoint piecewise** v `updateSun()` — `_sunColorSunrise` (0xffd4c6, 30 % lerp k 0xff7040), `_sunColorMid` (0xfff3d4, 30 % k 0xffd870), `_sunColorNoon` (0xffffff). Driver: `daylight = max(0, -cos α)` (DRY se sun.intensity). Calibration: 1/10 málo viditelné, 10/10 přepálené, 3/10 OK.
- [x] **Sky background 3-keypoint piecewise** v `updateAtmosphere()` — `_skyNight` (0x000000), `_skyDusk` (0x5f3433, 30 % lerp k 0xff7040 z `_skyDay`), `_skyDay` (0x1a1a2e). Driver: raw `negCosA ∈ [-1, 1]` (NE clamped daylight) — rozliší „deep night" od „moment sunset". `sceneFog.color.copy(scene.background)` per-frame propaguje barvu do fog. Rozšiřuje DD-39 (2-keypoint → 3-keypoint).
- [x] **Adaptive fog distances** — viz nad (sez. 38 bug fix). Začleněno do DD-48 sekce v immutable log.
- [x] **Ice materiál** — `_iceMat` (0xd9e8ec, opacity 0.85, metalness 0.05, roughness 0.55). Vs. water (opacity 0.55, metalness 0.20, roughness 0.25): větší zákal + menší reflexe per user spec. Color shift k bílé (`_iceMat.color` původní 0xc0d8e0 → 0xd9e8ec, ~40 % k bílé) symboluje „led jemně zasněžený".
- [x] **Water wave anim (KISS)** — sinusová vertikální oscilace `position.y = baseY + sin(t × ω) × 0.04` per non-frozen water mesh. `WATER_WAVE_AMP=0.04`, `WATER_WAVE_PERIOD=9.0` s (= klidný swell, sez. 38 user iter 3 s → 9 s). Ice meshes neanimují. Per-frame: 1 `Math.sin` + N `position.y =`.
- [x] **DD-48 zápis** — atmospheric color extensions, rozšiřuje DD-39.
- [x] **Sub-prah TODO** (2) — HSL hue shift pro sky/sun lerp, per-cluster water wave fáze.

### Sez. 38 Diff

- `src/terrain.js` +~180 / −~45 ř. (MinHeap class, Krok 6 water flood fill, snowSpec parameter + Krok 3.5 sort+rank snow, waterSpec parameter, `snowSpecForLatitude` + `waterSpecForClimate` exports, BIOME_SURFACES drop water column, BIOME_NAMES rename, drop water spawn paths).
- `src/main.js` +~120 / −~330 ř. (snow paleta BLOCK_COLORS 4→8, vrácení water/ice materiálů, water wave anim Set + animate() loop, adaptive fog helper, sun color piecewise, sky 3-keypoint, dirt color lighten, drop TTUNELS section ~287 ř., drop BLOCKS+COMPOSITES import).
- `src/model.js` −37 ř. (drop TTUNELS class + JSDoc + zmínka v BLOCKS doc).
- `index.html` ~+10 / −~10 ř. (readParams pass snowSpec+waterSpec, DOMContentLoaded init).
- `docs/DESIGN_DECISIONS.md` +~120 ř. (DD-47 + DD-48 sekce).
- `docs/TODO.md`, `docs/DONE.md` (tento záznam), `docs/GLOSSARY.md`, `docs/IDEAS.md`, `docs/DIARY.md` + diary sez. 38 sekce.
- `README.md`, `CLAUDE.md` (audit K1/K2 sync).

### Sez. 38 Smoke test

Browser test 5 scénářů (user):
1. Default temperate.mid 10×10 r3 → biome readout "Step / Prérie" ✓, žádný sníh (Y ≤ 1), drobné jezírka v depresích.
2. Polar mid → uniform bílá scéna ✓, ledové plane ne-animuje ✓.
3. Tropical wet r5 → velké modrá jezera v údolích bez ledu, bez sněhu ✓.
4. Temperate wet r5 → mix sníh patches (preferují vyšší cells) + voda v údolích + drobné ledové ostrůvky (~30 %).
5. Humidity=Sucho → žádná voda nikde ✓ (poušť).

Sez. 38 audit cadence reset 0/8. Žádné regression.

## Sez. 40 — DD-49 implementace + DD-50 SEASON driver + 6 kalibrací

### DD-49 plná implementace (Fáze 1-5)

- [x] **Fáze 1 — `src/composites/toolkit.js`** *(~95 ř., nový modul)*. 6 paleta konstant (`BARK_BROWN` 0x5a3e22 / `LEAF_GREEN` 0x3d7a2a / `LEAF_AUTUMN` 0xc8722a / `ROCK_GRAY` 0x6e6e72 / `GRASS_GREEN` 0x6aaa3a / `BUSH_GREEN` 0x4d8a30 / `SNOW_WHITE` 0xf5f5f5 — last přidaná pro snow caps follow-up). `lowpolyMat(color)` per-color singleton cache (`Map<number, MeshLambertMaterial>` s `flatShading: true`). `getGeomCache(kind, partKey, factory)` per-(KIND × part) singleton geometry cache s lazy factory closure. Re-export `mulberry32` z `terrain.js` (exportován z `function mulberry32` → `export function mulberry32`). `window.toolkit` dev exposure.
- [x] **Fáze 2 — `src/composites/builders.js`** *(~300 ř., nový modul)*. 5 procedurálních builderů: `buildSpruce` (kmen Cylinder + 3-5 ConeGeometry pater, hexagonal 6 segmentů, top tier nejužší), `buildOak` (silnější Cylinder + 2-4 IcosahedronGeometry(0) clusters kolem apex), `buildBush` (3-5 Icosahedron clusters nízko bez kmene), `buildRock` (1-3 anisotropic Icosahedron chunks, 60 % zapuštěno), `buildGrassTuft` (3-5 thin ConeGeometry(4 seg) shards fan-out z origin). `DECOR_BUILDERS` lookup export. Per-instance variace přes transform (position/rotation/scale), geom cache zachována.
- [x] **Fáze 3 — DECOR třída + dispatch**. `class DECOR extends COMPOSITES` v `model.js` s atributy `KIND` / `SEED` / `SCALE` / `SNOWED` (last přidán pro snow caps follow-up). `createDecor(instance)` v `main.js` — volá `DECOR_BUILDERS[KIND](group, { seed, scale, snowed })`. Dispatch `if (instance instanceof DECOR) return createDecor(instance)` v `createMeshFor` (před SPRITES).
- [x] **Fáze 4 — `DECOR_DENSITY[lat][hum]` + `decorate()` Krok 7**. Per-biome 4×3 tabulka KIND → weight. `decorate(cells, ramps, latitude, humidity, seed)` iteruje top voxely, skip vodní cells, stone surface → jen rock, snowed × 0.5 density, weighted KIND pick, jitter ±0.3 v X/Z. `generateTerrain` rozšířen o `decorSpec` arg, vrací `decorations[]`. `spawnTerrain` v `main.js` iteruje a vytváří DECOR instance přes `createMeshFor`. `decorSpecForClimate(lat, hum)` helper. `regenerateScene` cleanup rozšířen o `meshByInstance.delete` pro single-mesh entries.
- [x] **Fáze 5 — Smoke test v prohlížeči**. User vizuální test 12 biomů potvrdil — hustý prales v `tropical.wet`, sparse tundra v `polar.mid`, atd.

### Sez. 40 kalibrace (follow-up Fáze 5)

- [x] **Snow caps na DECOR top elementu** *(user feedback)*. Spruce: poslední (nejvyšší) tier dostal SNOW_WHITE → následně user wish „celý strom kromě kmene bílý" → všechny patra spruce/clusters oak+bush SNOW_WHITE pokud snowed. Rock: jen top chunk (max Y) bílý. Grass_tuft později (bod 1 níže) plně bílý.
- [x] **Decor base scale 0.5×** *(user wish)*. `DECOR_BASE_SCALE` lookup v terrain.js: spruce/oak/bush/rock 0.5, grass_tuft 1.0 (= zachovat ~30 cm shards). `decorate()` propaguje do `decoration.scale`, spawn loop do `DECOR.SCALE`, builder `group.scale.multiplyScalar(scale)` aplikuje.
- [x] **Bílá tráva na snowed cells (Bod 1 sez. 40)**. `buildGrassTuft` přijímá `opts.snowed` — shards barvy `SNOW_WHITE` místo `GRASS_GREEN`.
- [x] **Ramp Y přepočet pro DECOR (Bod 2 sez. 40)**. `decorate()` přijímá `ramps[]`, sestaví Set ramp cell coords, pro ramp cells `decor.y = c.y_top + 1.0` (= střed ramp diagonal) místo `+ 0.5` (= zapuštěno pod ramp surface).
- [x] **Bush cluster Y proporční k scale.y (Bod 3 sez. 40)**. Před: `cluster.position.y = randRange(0.15, 0.40)` hard-coded → mohlo dát bottom > 0 pokud `scale.y` bylo malé (decor_0003 plaval na sand y=0). Po: `cluster.position.y = scale.y * randRange(0.5, 0.9)` → bottom guaranteed pod 0 (50-90 % radius nad ground = 10-50 % zapuštěno).
- [x] **Wet DECOR_DENSITY navýšit (80%→20% škála)**. Tropical.wet 0.30→0.80 sum (hustý prales, oak/bush dominantní), subtropical.wet 0.24→0.60, temperate.wet 0.30→0.40, polar.wet 0.12→0.20 (drop spruce, jen bush+tuft+rock).

### Sez. 40 další kalibrace (mimo DECOR)

- [x] **DAY_SPEED default 0 → 0.001** *(WORLD)*. ~17 min/cyklus, pomalá animace slunce při bootu místo paused. Sync HTML slider `value="0.001"` + readout.
- [x] **BIOME_SURFACES mid + dry rebalance** *(user wish)*. Mid sloupec: stone × 0.5, sand × 1.75, grass picks residual (= mid biomy „pouštnatější"). Dry sloupec: stone × 0.25, sand picks residual (= „v poušti o 3/4 méně skal"). Wet sloupec beze změny. Všech 12 buněk validováno (sum = 1.0 ± 0.0001).

### DD-50 — WORLD.SEASON driver (minimal scope)

- [x] **`world.SEASON ∈ {spring, summer, autumn, winter}`** atribut WORLD, default `summer` (= dnešní bezsezonní stav).
- [x] **`snowSpecForLatitude(latitude, season)`** rozšíření — temperate `patchThreshold` per season via `SNOW_PATCH_BY_SEASON` lookup. Summer 1.00 (0 % snow), spring/autumn 0.85 (15 %), winter 0.40 (60 %). Polar `mode: "polar"` invariant.
- [x] **`waterSpecForClimate(latitude, humidity, season)`** rozšíření — temperate `freezeRatio` per season via `WATER_FREEZE_BY_SEASON` lookup. Summer 0.0, spring 0.2, autumn 0.3, winter 0.7. Polar 1.0 invariant.
- [x] **`SEASONS` export array** + `settings.setSeason(v)` mutator (validace `SEASONS.includes`).
- [x] **UI 4-step slider `tc-season`** v Climate sekci `#terrainctrl`. Display: Jaro/Léto/Podzim/Zima. Default value=1 (Léto). `input` mutuje, `change` triggeruje regen.
- [x] **DD-50 zápis** — kotva v DESIGN_DECISIONS.md (7 rozhodnutí + 5 omezení + 6 references).

### Sez. 40 Diff

- `src/composites/toolkit.js` nový +95 ř.
- `src/composites/builders.js` nový +320 ř.
- `src/terrain.js` +~150 / −~25 ř. (mulberry32 export, DECOR_DENSITY tabulka, DECOR_BASE_SCALE, decorate() + Krok 7 v generateTerrain, decorSpecForClimate, SEASONS + SNOW_PATCH_BY_SEASON + WATER_FREEZE_BY_SEASON, snowSpec/waterSpec rozšířené signatury, BIOME_SURFACES mid+dry rebalance, polar.wet alias komentář sync).
- `src/model.js` +~25 / −~5 ř. (DECOR class, WORLD.SEASON + DAY_SPEED default).
- `src/main.js` +~30 / −~3 ř. (DECOR import + dispatch + createDecor, decorSpecForClimate + SEASONS import + window expose, settings.setSeason, buildScene passne season, spawn loop pro decorations, regenerateScene cleanup meshByInstance fix).
- `index.html` +~25 / −~5 ř. (SEASON slider HTML + IIFE wire, DAY_SPEED slider default 0.001).
- `docs/DESIGN_DECISIONS.md` +~60 ř. (DD-50 sekce).
- `docs/TODO.md` ~+30 / −~50 ř. (close DD-49 Fáze 1-5 + DD-50 minimal, replace fáze 1-5 sekce s Fáze 6 + DD-50 follow-up).
- `docs/DONE.md` (tento záznam).

### Sez. 40 Smoke test (user)

- decor_0003 přistál ✓ (po bush Y fix).
- Tropical.wet hustý prales ✓.
- Polar.wet sparse tundra bez stromů ✓.
- Snow caps na temperate (winter) ✓.
- Ramp decor stojí na rampě ✓.
- SEASON slider temperate winter: 60 % snow + 70 % ice ✓.

Sez. 40 audit cadence 2/8 (`%AUDIT:CODE`) / 1/10 (`%AUDIT:DOCS`) / 9/12 (IDEAS/TODO pruning). Žádné regression.

## M8+ — Seasonal foliage cycle (DD-51) + slope-aware decor Y (DD-52) (sez. 41)

User volba z Příště sez. 40 → 41: **(1) DD-50 follow-up LEAF_AUTUMN paleta** — uzavřít sezonní visual loop. Plán-then-Go pattern × 3 iterace (LEAF_AUTUMN → winter defoliation → multi-decor rollback).

### DD-51 — Seasonal foliage cycle pro listnaté

**Per-instance season propagace** přes `DECOR.SEASON` atribut (9. konstruktor param, default `"summer"`):

```
world.SEASON → decorSpec.season → decorate(...) → decoration.season → DECOR.SEASON → builder opts.season
```

**Listnaté KIND-y (oak, bush) seasonal cycle:**
- spring/summer → LEAF_GREEN (oak) / BUSH_GREEN (bush)
- autumn → LEAF_AUTUMN (oranžová `0xc8722a`, paleta připravená sez. 40 jako DD-50 kotva)
- winter (snowed cell) → defoliated:
  - **oak.snowed** → builder skipne `for` loop nad clusters, vykreslí jen kmen (BARK_BROWN Cylinder)
  - **bush.snowed** → `decorate()` filter v `allowedEntries` (entity vůbec nespawnne, žádný empty Group)

**Spruce season-invariant** — jehličnan drží LEAF_GREEN; snowed → SNOW_WHITE patra (zachováno ze sez. 40 DD-49).

**Priorita v builderu listnatých**: `snowed > autumn > default`.

### DD-52 — Slope-aware DECOR Y na rampách

User: „Stromy na rampách (oak) visí ve vzduchu." Sez. 40 měl konstantní `y_top + 1.0` (= střed ramp diagonal); jitter pozice mimo střed = floating nebo zapuštěná.

**`ramps[]` entry rozšířena o `slopeDir: { dx, dz }`** — unit vector low→high:
- edge ramp: `pick.dir.dx/dz` (toward high neighbor, norm = 1)
- corner ramp: `c.ddx/ddz` (toward diagonal peak, norm = 2)
- diagonal ramp: `tdrampCorner.ddx/ddz` (toward peak corner, norm = 2)

**`decorate()` Y výpočet:**
- non-ramp cell: `decY = c.y_top + 0.5`
- ramp cell: `slopeT = (jitterX·dx + jitterZ·dz) / (|dx|+|dz|)`; `decY = c.y_top + 1.0 + slopeT`

Normalizace unifikuje edge/corner/diagonal (jitter ±0.3 podél slope axis → `slopeT ∈ [-0.3, +0.3]` napříč všemi ramp kindy).

TDRAMP step shape je bilinear aproximace (mild zapuštění/floating near diagonal split line) — sub-prah pro exact step model.

### Kalibrace sez. 41

- **`DECOR_BASE_SCALE.spruce/oak/bush/rock`** `0.5` → `1/3` (= 0.333; o 1/3 menší). User: „Velikost dekorací kromě trávy zmenšit o 1/3, nahustit víc na sebe."
- **`DECOR_DENSITY` oak/spruce × 2** napříč 12 biomy. User: „Zdvojnásob počty stromů ve výpočtech." Tradeoff flag: `decorate()` má max 1 decor per cell, sum > 1.0 znamená 100 % fill rate (ne víc stromů per cell). Tropical.wet sum 0.80 → 1.15.

### Multi-decor per cell (rolled back)

User: „Byl by problém vygenerovat na jednom tile více stromů? Prales je řídký." AI plán: `MAX_ATTEMPTS_PER_CELL = 2` smyčka v `decorate()`, per-attempt jitter + pick + seed. Tropical.wet 100×100 = ~20k DECOR Object3D × ~5 child meshes per Group = ~100k scenetree. **Perf regrese:** rAF handler 123-131ms (~8 FPS, regrese ze sez. 31/40 FPS 104). User volba: A (rollback `MAX_ATTEMPTS=1`). Hustota wet biomu zachována přes density × 2 (sum > 1 = 100 % fill).

**InstancedMesh DECOR refactor** = priorita pro sez. 42 (TODO priority `[!]`, perf trigger).

### Bug fix — `decorSpecForClimate` caller sweep

**Censure! (AI → AI):** při edit API signature `decorSpecForClimate(lat, hum)` → `(lat, hum, season)` AI updatoval jen 1/2 callers (main.js `buildScene` = boot path). Regen path (`readParams()` v index.html) zapomněn → `decorSpec.season` padal zpět na default `"summer"`, slider Season neměl efekt na decor listí. User: „Listnaté zelené, oranžovou nevidím — zkontroluj!" Fix: 1 řádek v index.html. Memory [[feedback_subagent_verify]] v praxi.

### Soubory dotčeny

- `src/composites/builders.js` +~25 / −~10 ř. (LEAF_AUTUMN import, oak/bush seasonal cycle, oak.snowed kmen-only, bush.snowed early return).
- `src/terrain.js` +~50 / −~15 ř. (3-arg `decorSpecForClimate`, 6-arg `decorate`, ramps[] `slopeDir`, decorate Y interp, DECOR_BASE_SCALE 1/3, oak/spruce density × 2, bush snowed skip, season propagace).
- `src/model.js` +~10 / −~1 ř. (`DECOR.SEASON` 9. param + docstring).
- `src/main.js` +~5 / −~3 ř. (createDecor opts.season, spawn loop d.season, buildScene world.SEASON).
- `index.html` +~5 / −~1 ř. (readParams decorSpec season arg fix).
- `docs/DESIGN_DECISIONS.md` +~110 ř. (DD-51 + DD-52 sekce).
- `docs/TODO.md` +~25 / −~15 ř.
- `docs/DIARY.md` +1 ř. index.
- `docs/diary/2026-05-14.md` nový ~140 ř.
- `docs/GLOSSARY.md` +~5 / −~2 ř.
- `README.md` +~3 / −~3 ř.

### Vizuální verifikace (user)

- LEAF_AUTUMN viditelná v autumn ✓ (po regen path fix).
- Winter defoliation: oak holý kmen, bush invisible ✓ („Vypadá to dobře").
- Ramp decor sedí na svahu bez floating ✓ („Opraveno OK").
- Decor scale 1/3, oak/spruce density × 2 ✓.
- Multi-decor 100×100 tropical.wet → FPS 8 (rollback) ✓.

Sez. 41 audit cadence 3/8 (`%AUDIT:CODE`) / 2/10 (`%AUDIT:DOCS`) / 10/12 (IDEAS/TODO pruning, **velmi blízko prahu**). Žádné regression mimo úmyslný multi-decor rollback. User verdikt: **„Generátor scény považuji za dokončený."**

## M8+ — Fáze 6 DECOR KIND extension (sez. 43)

User volba z Příště sez. 42 → 43: 4 kroky.
1. **IDEAS/TODO pruning** *(mandatory cadence trigger 11/12)* — full 4 passes.
2. **Skupina A** — palm + cactus (hot biomy detail).
3. **Skupina B** — flower + stump + log (temperate/subtropical detail).
4. **Skupina C** — `_dead` postfix + Density UI control (meta features).
5. **TTRAMPS skip fix** *(sub-fix po Skupina A user report „palmy visí ve vzduchu")*.

### IDEAS/TODO pruning (cadence trigger)

11/12 cadence threshold — sez. 43 mandatory pruning. Full 4-pass restructure:

**Pass 1 — IDEAS markery refresh:** SEASON `→ TODO` → `→ DONE (DD-50)`, CLIMATE → DONE (DD-42), "Voda" driver komentář update na DD-50, WCUBES/INVISIBLE/CCUBES typizace sloučeno pod "parkováno".

**Pass 2 — Ledger drop z TODO do hlavičky:** 12 `[x]` řádků (G0..G6 6, DD-48/49/50/51, bimodal+snow, polar/wet alias, TTUNELS) odstraněny. Nahrazeno kompaktním "Recent DONE (sez. 34-43)" hlavičkou.

**Pass 3 — Speculative konsolidace:** 14 položek z 6 starých "Sub-prah (DD-XX follow-up)" sekcí sloučeno do jedné "Speculative / wait-for-signal" sekce. Kotvy zachovány, nezahlcují aktivní list.

**Pass 4 — Section restructure 14 → 6 area-based:** Otevřené M8+ / Terrain aktivní / Krajinné DECOR (Fáze 6 + LIQUID) / WORLD-atmosféra / Sez. 42 sub-prahy / Speculative + Audit cadence.

**Side effect (3 merge duplicit):** `LIQUID třída` + `DD-25 LIQUID class` sloučeno, `Klastrování spojitých water cells` + `Water cluster connected components` sloučeno, `DD-53 follow-up sub-prah` folded do `Klastrování`.

**Net:** TODO.md 128 → 84 ř (−34 %), IDEAS.md 125 → 123 ř (surgical), 49 → 46 open items.

### Skupina A — palm + cactus

**`palm` KIND** (tropical.wet primary, tropical.mid sub-dominant). Anatomie:
- Tenký vysoký kmen (radius 0.05/0.08, height 1.8-2.6, 6 segmentů hexagonal). 2× vyšší než oak.
- 5-7 radiálních listů z apex (ConeGeom 0.08 × 0.9, 4 segmenty = čtyřboký jehlan). Tilt 45-80° od vertikály. Orientace přes `quaternion.setFromUnitVectors(Y_AXIS, dir)` (KISS, žádné Object3D wrappery).

**`cactus` KIND** (subtropical.dry primary feature). Anatomie:
- Sloupec 1.0-1.5 × 0.15-0.20 radius (CylinderGeom 8 segmentů, unit scaled per instance).
- 0-2 boční paže pod úhlem 30-60° od vertikály, length 0.5-0.8, radius 60-80 % trunk.
- `CACTUS_GREEN` paleta (0x4a7a4a sage-green saguaro odstín, nový hex).
- `dead` flag → kmen-only `BARK_BROWN` (sušený kaktus, sub-prah Fáze 6 priorita).

**DECOR_DENSITY:**
- `tropical.wet { palm: 0.40, oak: 0.30, bush: 0.25, grass_tuft: 0.15, rock: 0.05 }` sum 1.15 cap 100% fill (palm primary, oak fallback).
- `tropical.mid { palm: 0.05, oak: 0.08, ... }` sum 0.25 savana detail.
- `subtropical.dry { cactus: 0.04, bush: 0.02, grass_tuft: 0.03, rock: 0.05 }` sum 0.14 cactus primary.

### TTRAMPS skip fix (anchor for decor on corner ramps)

**User report po Skupina A:** „palmy na rampách visí ve vzduchu". Diagnóza math analýza:
- TRRAMPS (edge wedge): SLOPE quad pokrývá plný cell top, bilinear formula EXACT (žádný floating).
- TDRAMP (diagonal 1C minus tetrahedron): slope+top kombinace, formula SUNKEN 0.2-0.5 j (palm trunk procházela slope, méně viditelné).
- TTRAMPS (trojboký jehlan = corner ramp): slope JEN v ~1/4 cellu (projected NW triangle), zbytek empty above bottom face. Bilinear formula by dala FLOATING 0.2-0.5 j nad povrchem.

**KISS fix:** `decorate()` skip cell pokud `rampInfo.kind === "corner"`. TTRAMPS jsou minorita ramp typů (isolated corner peaks), loss density malá. Refactor: `rampDirMap` → `rampInfoMap` (uloží celý ramp record místo jen slopeDir). Side effect: fix platí pro všechen decor (oak/spruce/bush/rock/grass_tuft/cactus/palm/flower/stump/log), ne jen palmu.

**TDRAMP sunken** zůstává sub-prah „TDRAMP exact step Y" v TODO Speculative (sunken < floating viditelnost).

### Skupina B — flower + stump + log

**`flower` KIND** (temperate.wet/mid louka). Anatomie:
- Tenký stem (CylinderGeom 0.015 radius × 0.20-0.30 height, GRASS_GREEN).
- Bloom (IcosahedronGeom unit, scaled 0.05-0.08, per-instance color picked z 3-color palety: red/yellow/white).
- Slight tilt z vertikály (10-15° rotace celé group kolem origin = base stem).
- Snowed/dead → skip entire (drobná květina, no withered visual KISS).

**`stump` KIND** (temperate woodland clearings + subtropical.wet detail). Anatomie:
- Krátký Cylinder (radius 0.18-0.28 × height 0.30-0.50, 8 segmenty octagonal, BARK_BROWN).
- Snowed → thin SNOW_WHITE disc na top face (~4 cm sníh).
- `dead` flag no-op (už dead wood by koncept).

**`log` KIND** (same biomy jako stump). Anatomie:
- Cylinder (radius 0.10-0.15 × length 0.5-0.8) rotated 90° kolem X → osa vodorovná.
- Y pozice mesh = logRadius (= log sedí na zemi).
- Random Y rotace group → log v libovolném směru.

**Paleta add (toolkit.js):** FLOWER_PETAL_RED (0xd84d3a vlčí mák) + FLOWER_PETAL_YELLOW (0xf0c040 pampeliška) + FLOWER_PETAL_WHITE (0xf5f0e0 sedmikráska).

**DECOR_DENSITY:**
- `temperate.wet { ..., flower: 0.10, stump: 0.02, log: 0.02 }` sum 0.79 listnatý les + louka.
- `temperate.mid { ..., flower: 0.04, stump: 0.02 }` sum 0.38 smíšený s loukami.
- `temperate.dry { ..., stump: 0.02, log: 0.02 }` sum 0.17 chladná step + sušené dřevo.
- `subtropical.wet { ..., stump: 0.02, log: 0.02 }` sum 0.89 vlhký les s padlými kmeny.

**DECOR_BASE_SCALE:** flower 0.5 (user kalibrace sez. 43 — 1.0× působilo jako tulipány nad voxely, 0.5× = sedmikrásky), stump + log 1/3.

### Skupina C — `_dead` postfix + Density UI control

**`_dead` flag** — boolean atribut na `DECOR` instance, propagated builder `opts.dead`. Priorita `dead > snowed > autumn > default`:
- spruce/oak/palm: trunk-only (skeleton, sušený strom).
- bush/flower: skip entire (defoliated empty entity).
- cactus: trunk-only s BARK_BROWN.
- stump/log/rock/grass_tuft: no-op (no concept of "dead").

**DEAD_PROB_BY_HUM driver** v `terrain.js`:
- wet: 0% (zdravé stromy)
- mid: 5% (moderate stress)
- dry: 30% (drought stress = sušené stromy v poušti)

RNG roll per spawn v `decorate()`, propagace přes `decoration.dead` → `DECOR.DEAD` → builder `opts.dead`.

**Density UI control** — slider 0..2× v `#terrainctrl` Climate sekce. `WORLD.DECOR_DENSITY_MULT` atribut (default 1.0). `decorate()` násobí `totalWeight *= densityMult`:
- 0.0 → bez decor (holá scéna).
- 1.0 → baseline (DECOR_DENSITY tabulka beze změny).
- 2.0 → max density (= sum > 1.0 znamená 100 % fill rate jediným decor per cell; multi-decor je sub-prah InstancedMesh refactor).

`decorSpec` rozšířen o 4. arg `densityMult`. `readParams` v index.html čte slider, passuje. `buildScene` v main.js passuje `world.DECOR_DENSITY_MULT`.

### Soubory dotčeny

- `src/composites/toolkit.js` +~9 / −~1 ř. (CACTUS_GREEN + FLOWER_PETAL_RED/YELLOW/WHITE paleta + dev exposure).
- `src/composites/builders.js` +~200 / −~15 ř. (Y_AXIS const + `buildPalm` / `buildCactus` / `buildFlower` / `buildStump` / `buildLog` + `dead` branch v `buildSpruce` / `buildOak` / `buildBush` + DECOR_BUILDERS registry 5 → 10 entries).
- `src/terrain.js` +~40 / −~10 ř. (DECOR_DENSITY update 5 cells + DECOR_BASE_SCALE 5 → 10 + DEAD_PROB_BY_HUM table + decorate `densityMult` param + `rampInfoMap` rename + TTRAMPS skip + dead roll + decoration.dead push + decorSpecForClimate 4-arg + generateTerrain decorSpec.densityMult propagation).
- `src/model.js` +~10 / −~2 ř. (DECOR.DEAD attribut + WORLD.DECOR_DENSITY_MULT atribut).
- `src/main.js` +~3 / −~3 ř. (createDecor opts.dead, spawn loop d.dead, buildScene world.DECOR_DENSITY_MULT).
- `index.html` +~15 / −~2 ř. (tc-decor-density slider HTML + DOM ref + readParams densityMult + handler input/change).
- `docs/IDEAS.md` −2 ř. (Pass 1 markery refresh).
- `docs/TODO.md` ~−45 ř. (Pass 2+3+4 restructure 14 → 6 sekcí, 49 → 46 open items, Fáze 6 close 6/9).
- `docs/DIARY.md` +1 ř. index.
- `docs/diary/2026-05-14.md` +~120 ř. (Sezení 43 section).
- `docs/DONE.md` +~140 ř. (tato sekce).

### Vizuální verifikace (user)

- Palm v tropical.wet, cactus v subtropical.dry ✓ („Vypadá to dobře").
- TTRAMPS palm anchor fix ✓ („Test OK, stromy nelétají").
- Skupina B+C visual ✓ („Test OK, stromy nelétají, květiny zmenšit na polovinu") + flower kalibrace 1.0 → 0.5.

Sez. 43 audit cadence 4/8 (`%AUDIT:CODE`) / 3/10 (`%AUDIT:DOCS`) / 0/12 (IDEAS/TODO pruning — full pass done). Žádné regression. Sezení = pruning + content (5 nových KINDs + 1 meta feature + 1 sub-fix), bez nového DD (Fáze 6 implementace pre-approved TODO).

---

## Sezení 44 — Fáze 6 close (3/3 final položek, 9/9 total)

Pokračování bezprostředně po sez. 43 ve stejný den (2026-05-14). User invoked `%BEGIN` → AI navrhla pokračovat Fází 6 close → user „Fáze 6 batch, všechny tři" → 79 ř. impl batch + docs. Žádný nový DD.

### (A) Receive shadow opt-out flag

`userData.noReceiveShadow` paralelní opt-out k `noShadow` (sez. 33 LAMP pattern). V `createMeshFor` traverze (`main.js` ř. 1224) cast zachováno, jen receive flagované:
```js
if (!child.userData.noShadow) {
  child.castShadow = true;
  child.receiveShadow = !child.userData.noReceiveShadow;
}
```

V `createDecor` po builder dispatch jeden traverse přidá flag na všechny meshes:
```js
group.traverse((child) => {
  if (child.isMesh) child.userData.noReceiveShadow = true;
});
```

Aplikace BEFORE globální traverze (volaného z `spawn → createMeshFor`). Decor vrhá stín na zem (cast=true), ale sám nestíní okolními objekty (receive=false). Marginal perf save: facetovaný lowpoly decor by stejně neviděl smooth shadow gradient. DD-49 spec původně tento default.

### (B) LEAF_AUTUMN 4-color paleta + per-strom RNG pick

`toolkit.js` rozšířen o 3 nové paleta entries:
- `LEAF_AUTUMN_YELLOW = 0xd8a830` (hue ~45°, bříza/lípa)
- `LEAF_AUTUMN_RED    = 0xb84020` (~10°, sumach/javor červený)
- `LEAF_AUTUMN_BROWN  = 0x8a5028` (desaturated ~30°, buk po opadu)

Plus `AUTUMN_PALETTE` array obsahující [ORANGE, YELLOW, RED, BROWN] — pořadí dle frekvence v reálném lese (ORANGE modální).

`buildOak` a `buildBush` v autumn větvi:
```js
const clusterColor = opts.season === "autumn"
  ? AUTUMN_PALETTE[randInt(rng, 0, AUTUMN_PALETTE.length - 1)]
  : LEAF_GREEN;  // (resp. BUSH_GREEN pro bush)
```

RNG roll PŘED cluster loop = celý jeden strom monochromatický (= „1 druh listí"). Sousedi (jiný `seed`) dostanou jinou barvu = spektrum jako reálný podzimní les. Per cluster by dal pestrý vánoční stromek (odmítnuto).

Palm zachoval single `LEAF_AUTUMN` hex — botanicky reálná palma listy neopadává, autumn modifier v palm = dummy konzistence s globálním UI (sub-prah „tropical season cycle invariant" v komentáři builderu, sez. 43 add).

### (C) Sezonní DECOR_DENSITY modifier

`seasonalDensityMult(kind, season)` helper v `terrain.js`:
- **autumn:** oak/bush/flower × 0.8 (−20 %, listí na zemi, neopadané víc viditelné).
- **winter:** oak/bush/flower × 0.5 (−50 %, defoliated bush úplně skipne v decorate filteru); rock × 1.2 (+20 % visibility, bez listí/sněhu se odhalí víc kamenů na povrchu).
- **spring/summer:** invariant (mult 1.0).
- Spruce (jehličnan), palm/cactus (tropical/dry), grass_tuft/stump/log (stale/dead wood) — všechny season-invariant.

V `decorate()` clone přes `Object.fromEntries(...Object.entries(baseWeights).map(...))`:
```js
const seasonalWeights = Object.fromEntries(
  Object.entries(baseWeights).map(([kind, w]) =>
    [kind, w * seasonalDensityMult(kind, season)])
);
```

Pak `allowedEntries = Object.entries(seasonalWeights).filter(...)` (rename source). Surface constraint filter + snowed bush filter beze změny.

### Soubory dotčeny

- `src/main.js` +13 / −3 ř. (`noReceiveShadow` traverse respect + `createDecor` post-build traverze).
- `src/composites/toolkit.js` +16 / −2 ř. (AUTUMN_PALETTE 4 hex + array + komentáře + dev exposure).
- `src/composites/builders.js` +12 / −4 ř. (AUTUMN_PALETTE import + 2× clusterColor `randInt` pick).
- `src/terrain.js` +28 / −1 ř. (`seasonalDensityMult` helper + `seasonalWeights` clone + rename allowedEntries source).
- `docs/TODO.md` ~−5 ř. (close 3 položky Fáze 6 + summary 6 → 9/9 + cadence ticky AUDIT:CODE 5→6 / AUDIT:DOCS 4→5 / pruning 0→1).
- `docs/DIARY.md` +1 ř. (sez. 44 append k 2026-05-14 multi-session line).
- `docs/diary/2026-05-14.md` +Sezení 44 sekce.
- `docs/DONE.md` +tato sekce.

`node --check` na 4 src souborech: OK.

### Vizuální verifikace (user)

- „Krása! Kudos!" out of the box, žádná kalibrace třeba (na rozdíl od sez. 43 flower scale 1.0 → 0.5 follow-up).
- AUTUMN_PALETTE × oak/bush: sousední stromy/keře různé odstíny ORANGE/YELLOW/RED/BROWN.
- Sezonní density modifier: autumn mírně řidší listnaté, winter dramaticky řidší + víc rock.
- Receive shadow opt-out: stromy stále vrhají stín na zem (cast zachováno), uvnitř koruny už nestíní (lowpoly + facetovaný = neviditelné). Per regression test bez issue.

Sez. 44 audit cadence 6/8 (`%AUDIT:CODE`) / 5/10 (`%AUDIT:DOCS`) / 1/12 (IDEAS/TODO pruning). AUDIT:CODE due ~sez. 46.

**Fáze 6 close 9/9** — DECOR cyklus DD-49→DD-52 + Fáze 6 KIND extension (10 KIND-ů, dead flag, autumn paletka, density UI, sezonní modifier, shadow opt-out) konzistentní. Sub-prahy zachovány (`BARK_DEAD` darker, palm trunk curve).

## Sezení 45 — Triple batch A+B+C (DD-54 LIQUID class + HSL + %BEGIN addendum)

### A. `%BEGIN` projektový addendum — Target use case check

Krok **(2.5)** vložen do `docs/PROMPTS.md` projektový `%BEGIN` mezi (2) Kontext a (3) Shrnutí. Conditional: pokud sezení směřuje k **perf / stress test directionu** (FPS optimalizace, draw call reduction, shadow opt, InstancedMesh refactor, frustum culling), AI se PŘED nabídnutím směru zeptá *„Jaká velikost gridu a climate priority je reálný workflow?"*. Skip pokud content / feature / refactor / audit / docs direction.

Memory links: `[[project-target-use-case]]` (20×20 dioráma je real workflow, 100×100 = academic stress) + `[[feedback-target-use-case-check]]` (sez. 42 Censure: AI musí ptát se před perf benchmarkem).

Sez. 42 Censure carryover (2 sezení dluh) splacen. Žádný DD (= dokumentační pravidlo).

### B. HSL hue shift sky/sun — `_lerpHsl` helper

DD-48 follow-up, žádný nový DD. RGB lerp pro orange↔blue prochází přes desaturovanou hnědou (purplish RGB midpoint má low S+L). HSL lerp drží S+L lineární, hue rotuje po shorter circular path → orange→blue ide přes purple = Rayleigh-correct dusk.

Implementace v `src/main.js` po sun colors konstantách:

```js
const _hslA = { h: 0, s: 0, l: 0 };
const _hslB = { h: 0, s: 0, l: 0 };
function _lerpHsl(target, a, b, t) {
  a.getHSL(_hslA);
  b.getHSL(_hslB);
  let dh = _hslB.h - _hslA.h;
  if (dh > 0.5) dh -= 1;
  else if (dh < -0.5) dh += 1;
  const h = (_hslA.h + dh * t + 1) % 1;
  const s = _hslA.s + (_hslB.s - _hslA.s) * t;
  const l = _hslA.l + (_hslB.l - _hslA.l) * t;
  target.setHSL(h, s, l);
}
```

Scratch HSL objekty (`_hslA`/`_hslB` ploché objekty) pro zero per-frame alokaci (volá se 4× per frame: 2× sun + 2× sky). Shorter-path algoritmus: pokud `|h2 - h1| > 0.5`, wrap přes 0/1 hranici.

Pro `_skyDusk` (hue ~0.003 orange, 0x5f3433) → `_skyDay` (hue ~0.667 blue, 0x1a1a2e): diff = 0.664 > 0.5 → wrap dh = -0.336 = jde přes magenta/purple = ✓ Rayleigh.

Sun colors (warm peach 0xffd4c6 → cream 0xfff3d4 → white 0xffffff) jsou white-dominated, HSL≈RGB v praxi, ale uniform pipeline = DRY (4× `lerpColors → _lerpHsl`).

User test: „HSL test OK".

### C. DD-54 LIQUID class — 5. vrstva DD-25 extension: Tekutiny

#### Memory drift detection (Censure! AI → AI?)

Před implementací AI cross-checknula user Q2=B („vrstva 4 pod CUBES per memory") proti `docs/DESIGN_DECISIONS.md` DD-25 4-vrstvá taxonomie:

1. **Bloky** = BLOCKS family
2. **Voxely** = COMPOSITES family
3. **Linie** = LINES family (deklarováno, PATH dnes přímo pod CUBES)
4. **Objekty** = ASSETS family (postavy/zvířata/stroje)

**Vrstva 4 = Objekty, ne tekutiny.** Memory `project_model_hierarchy` description měla „DD-25 vrstva 4 LIQUID class" napříč ~3 sezení = drift. Pokud by AI Q2=B vzala literálně, DD-54 by zavedlo chybnou taxonomii do immutable DD logu.

Re-Q1 user: A=LIQUID je nová **5. vrstva** (paralel BLOCKS/COMPOSITES/LINES/ASSETS), B=trust memory P2 (vrstva 4 = Objekt, konceptuálně questionable), C=jiný. **User: A1A „Třeba někdy dojde na fyziku kapalin."** = schválení 5. vrstva + signal pro budoucí extension hooks.

#### Class signature

`class LIQUID extends CUBES` v `src/model.js` (sibling BLOCKS/COMPOSITES/PATH pod CUBES, paralel PATH pattern bez abstract `LIQUIDS` base dokud nepřibude 2. sourozenec — DD-27 vzor *„abstract base až s 2. konkrétním potomkem"*).

```js
new LIQUID(id, name, x, level, z, temperature, bbox, cells, description)
```

Atributy (sez. 45 prototype skeleton, single-cell):

- **`LEVEL`** — Y hladiny (sémanticky čitelnější alias pro `Y` z CUBES). Skeleton drží oba (`Y = LEVEL` zrcadlení) kvůli budoucí extension — mesh Y může mít nudge offset proti z-fightu, `LEVEL` zůstane čistá logická hladina.
- **`TEMPERATURE`** — `"frozen"` | `"liquid"` enum. Material decision v `createLiquidPlane` (`_iceMat` vs. `_waterMat`). Budoucí extension: numerický °C pro permafrost gradient / lávu (YAGNI v sez. 45 per DD-29 *„atributy jen s živým konzumentem"*).
- **`BOUNDING_BOX`** — `{ w, d }` axis-aligned XZ extent v 1C jednotkách. Pro prototype vždy `{ w: 1, d: 1 }`.
- **`CELLS`** — `[{ x, z }, ...]` cells obsazené tímto LIQUID. Pro prototype vždy `[{ x, z }]` (1 prvek). Pro DRY identifikaci / clear-path.

**Žádný `FLOW_DIRECTION` ve skeletonu** — rivers/streams sub-prah, atribut by byl placeholder bez konzumenta (porušení DD-29 politiky).

#### Spawn integrace

`src/main.js`:
- Import `LIQUID` z `model.js`.
- `createWaterPlane(w)` **renamed** `createLiquidPlane(liquid)`. Čte `liquid.X/Y/Z` (z CUBES base), `liquid.TEMPERATURE` (dispatch `_iceMat` vs. `_waterMat`), `liquid.BOUNDING_BOX.w/d` (scale).
- `buildScene` spawn loop: `terrain.water[]` raw records → `new LIQUID(...)` per record → `createLiquidPlane(liquid)` → scene.add. ID `liquid_NNNN` zero-pad (paralel `decor_NNNN`).

Per DD-11 model/engine separation: `terrain.js` nezná `model.js`, drží raw records (`{x, y, z, frozen, w, d}`). LIQUID construction žije v engine spawn loopu.

#### Internal materiály zachovány

`_waterMat` / `_iceMat` / `_waterGeom` / `_waterMeshes` Set zachovány (= implementation locality, KISS). Rename na `_liquid*` = sub-prah až přibude lava/oil 2. sourozenec a paralelní rename si vynutí 2. material set.

#### Plný clustering = sub-prah

BFS connected-components clustering (= 1 LIQUID = N connected cells sdílejících `water_y` + `frozen`) ne v skeletonu. Důvod:

- DD-53 attempt sez. 42 + **revert** — bbox over varied water_y → mean Y → boundary cells z-fight (visual artifact). Memory `[[project-target-use-case]]`.
- Per target use case 20×20 dioráma per-cell rendering je visually correct + zero perf cost. 100×100 stress test je academic edge case.
- Plný refactor = sub-prah, čeká na user signal („100×100 jezera blikají" nebo nový perf need). Mitigace pro budoucnost: split components dle `(water_y, frozen)` key (drží z-fight invariant).

#### Soubory dotčeny

- `src/model.js` +~55 / −~1 ř. (LIQUID class + docstring 30+ ř s budoucími extension hooks).
- `src/main.js` +~25 / −~12 ř. (import + createLiquidPlane signature change + spawn loop wrap + _lerpHsl helper + 4× lerpColors→_lerpHsl).
- `docs/PROMPTS.md` +~14 ř. (A. krok 2.5).
- `docs/DESIGN_DECISIONS.md` +~55 ř. (DD-54 entry — rozhodnutí, kontext, class signature, atributy, prototype scope, důvod skeleton ne clustering, důsledek, sub-prahy, extension hooks, references DD-25/27/47/53, memory links, user note „fyzika kapalin").
- `docs/TODO.md` ~−6 / +~5 ř. (drop hotové LIQUID/HSL/%BEGIN sub-prahy + Recent DONE 34-44→34-45 + LIQUID sekce DD-25 vrstva 4 → DD-25 5. vrstva DD-54 + add BFS clustering + fyzika kapalin extensions follow-up + audit cadence ticky 6→7/5→6/1→2).
- `docs/DIARY.md` +~1 ř. (sez. 45 append k 2026-05-14 multi-session line).
- `docs/diary/2026-05-14.md` +~140 ř. (Sezení 45 sekce).
- `docs/DONE.md` +tato sekce.
- Memory `project_model_hierarchy.md` description sync + tree LIQUID node pod CUBES + DD-54 entry v Klíčových rozhodnutích.
- Memory `MEMORY.md` index description sync (LIQUID + DD-54 + sub-prahy update).

`node --check` na `src/model.js` + `src/main.js`: OK (visual test user-side post HSL + post LIQUID).

### Vizuální verifikace (user)

- **HSL test:** „HSL test OK, voda i led vypadají v pořádku." Dusk transition přes purple-magenta viditelný v poledne → východ slunce (DAY slider). Sky hue rotation Rayleigh-correct, sun colors invariant (warm-to-warm).
- **LIQUID skeleton test:** „Test OK, voda i led vypadají v pořádku." Vizuálně identický s DD-47 prototype (same materiály per-cell), jen pod LIQUID class wrapper. Conceptual debt repaid bez visual regrese.

### Audit cadence po sez. 45

- `%AUDIT:CODE` — **7/8** (sez. 40-45 jen impl/skeleton). **MUSÍ AUDIT v sez. 46 (threshold trigger)**.
- `%AUDIT:DOCS` — **6/10**.
- IDEAS/TODO pruning — **2/12**. Next: ~sez. 55.

DD-54 = **5. DD ze sez. 41-45 sady** (DD-51 sez. 41, DD-52 sez. 41, [DD-53 attempt + revert sez. 42], DD-54 sez. 45). Sez. 42-44 bez nových DD (perf diagnostic + Fáze 6 pre-approved TODO impl).

---

## Sez. 46 — `%AUDIT:CODE` threshold trigger (10 fixů LIQUID/DD-54 drift + README/GLOSSARY sync)

Audit cadence sub-prah `%AUDIT:CODE` 7/8 (sez. 40-45 jen impl/skeleton) — **mandatory threshold trigger v sez. 46**. Fokus z Příště sez. 45: LIQUID terminologie po DD-54, dead code (post-DD-41 atlas residue, pre-DD-54 `createWaterPlane`), DD-25 5. vrstva extension dokumentace, conceptual integrity, memory drift cross-check (sez. 45 Censure carryover).

### Nálezy — 4 K + 4 D + 2 S

**Kritické (drift):**
- K1 `src/terrain.js:138` komentář DD-25 vrstva 4 → 5. vrstva DD-25 extension (DD-54), "vrátí se" → "žije".
- K2 `src/terrain.js:1049` "vrátí se" → "žije jako LIQUID 1. třída entity (DD-54)".
- K3 `README.md:53` LIQUID entry — drift vrstva 4 → 5. vrstva + status (sub-prah → DD-54 skeleton hotové).
- K4 `docs/IDEAS.md:36` LIQUID entry — vrstva 4 → 5. vrstva + DD-47 částečně → DD-54 skeleton DONE + sub-prahy.

**Doporučené (sync):**
- D1 `docs/GLOSSARY.md:3` hlavička sez. 39 → sez. 45 timeline doplnit DD-50/51/52/53/54.
- D2 `README.md:43` M8+ řádek doplnit DD-49..54 + Fáze 6 + HSL.
- D3 `README.md:45` „DD-01 až DD-52" → „DD-01 až DD-54 (DD-53 attempt + revert)".
- D4 `README.md:47-60` Plán sekce přepis post-sez. 45 + user verdikt close.

**Kosmetické:**
- S1 `src/main.js:2114` + `src/main.js:2485` komentáře refresh phrasingu (Sez. 38 LIQUID prototype → DD-54).
- S2 `src/model.js:82-83` ORIENTATION drop „/tunelů" reference (TTUNELS smazaná sez. 38).

### Batch fix přes 6 src/docs souborů

User: **„Oprav vše!"** = volba A (K1-K4 + D1-D4 + S1-S2). 10 paralelních Edits, post-fix `Grep "vrstva 4"` napříč src/ + README + IDEAS = **No matches found** ✓.

### Pozitivní (Kudos!)

- Žádný `console.log` v src/ (6× `console.warn` defensive zachovány).
- Žádný `createWaterPlane` v src/ (DD-54 rename clean, jen v immutable docs historie).
- Žádné dead files (`.bak`/`.tmp`/`.old`/`.DS_Store`) ani empty dirs.
- Atlas residue v src/ = jen 2ř. historický komentář (záměrné navigation).
- LIQUID sibling order v `model.js` ř. 397 (mezi BLOCKS 86 / SPRITES 235 / COMPOSITES 273 / PATH 353) = **conceptual integrity DD-54 v kódu** držena.
- Memory drift cross-check: 5 memory entries s DD-49+ reference, všechny clean (project_model_hierarchy + MEMORY.md fixed sez. 45, ostatní 3 nezasažené). 15/20 entries DD-49+ nezmiňují = bez rizika.

### Cadence reset

- `%AUDIT:CODE` — **7/8 → 0/8** (threshold trigger satisfied). Next: ~sez. 54.
- `%AUDIT:DOCS` — 6/10 → 7/10 (sez. 46 audit-code tick, ne plný DOCS audit).
- IDEAS/TODO pruning — 2/12 → 3/12 (sez. 46 přiměřený pruning v rámci AUDIT:CODE = IDEAS LIQUID rewrite + Plán sekce wipe).

### Soubory dotčeny

- `src/terrain.js` ~6 / −5 ř. (K1+K2).
- `src/main.js` ~4 / −3 ř. (S1×2).
- `src/model.js` ~3 / −3 ř. (S2).
- `docs/IDEAS.md` ~1 / −1 ř. (K4 rewrite).
- `docs/GLOSSARY.md` ~1 / −1 ř. (D1 hlavička).
- `README.md` ~18 / −16 ř. (D2 + D3 + K3 + D4).
- `docs/TODO.md` ~3 / −3 ř. (Recent DONE 34-45 → 34-46 + cadence reset).
- `docs/DIARY.md` +1 ř. (nový samostatný řádek sez. 46 — pivot od mega-řádku 41-45 patternu).
- `docs/diary/2026-05-14.md` + Sezení 46 sekce.
- `docs/DONE.md` + tato sekce.
- Memory `MEMORY.md` index description sync.

Žádný nový DD (audit pass = procedural maintenance).

---

## Sez. 47 — SEASON expansion 6-pack (DD-50 plný scope: sky + sun tint, polar variace, slider sync, ice texture)

Sezení Příště sez. 46 (po threshold-reset audit) — 4 volitelné směry (WORLD/atmosféra zbytek, LIQUID BFS clustering, fyzika kapalin, deeper audit). User vybral atmosféru zbytek → expansion DD-50 SEASON impact do dalších layers. 6 kusů + 1 bug fix + 1 refactor v jednom sezení.

### A. Sky season tint (B1)

`src/main.js`: `SEASON_SKY_DELTA` tabulka (spring/summer/autumn/winter) s HSL deltas {dh ±0.005-0.025, ms ×0.80-1.10, ml ×0.95-1.03). `_applyHslShift(color, delta)` helper season-agnostic — reuse `_hslA` scratch (zero alok). Volání v `updateAtmosphere()` post-lerp, scope `world.LATITUDE === "temperate"` (per A2=A — polar/tropical mají season-invariant snow/water, drží konzistenci). `sceneFog.color.copy()` propaguje tint na fog automaticky. Subtle (Q1=A) — viditelné v summer↔winter porovnání, sotva v isolaci. Summer = baseline {0,1,1} no-op (zero regression).

Pattern „base × season modifier" izomorfní s DECOR_DENSITY sezonním modifikátorem (sez. 43, autumn ×0.8 leaves / winter ×0.5).

### B. Sun season tint (B1 sub-prah A3=A NO → user wave 2)

`SUN_SEASON_DELTA` tabulka vedle SKY (mírnější deltas — sun = eye attracter, menší plocha visual punch větší + na poledni white maskuje saturaci). Refactor `_seasonTint(color, season)` na nižší abstrakci `_applyHslShift(color, delta)` (helper season-agnostic, caller dodá delta z příslušné DELTA tabulky). Volání v `updateSun()` po piecewise color lerp (`_sunColorSunrise → _sunColorMid → _sunColorNoon`), scope temperate. Visual delta primárně v dusk/sunrise fázi (sun colored hue) — na poledni sun=white → tint mizí (správné).

### C. Sun horizon extend do −15° (sez. 47 user request bonus)

`SUN_HORIZON_Y_MIN = SUN_DISTANCE * Math.sin(THREE.MathUtils.degToRad(-15))` ≈ −4.21 j. `sunMesh.visible` check posunut z `sun.position.y > 0` (matematický horizon) na `> SUN_HORIZON_Y_MIN` — sun se vyhne „skokovému zmizení" na sunset/sunrise. DirectionalLight intensity zůstává `Math.max(0, negCosA)` (sun pod horizontem nesvítí, jen vizuální cue).

### D. Polar season variace (B3) — DD-50 plný scope

Polar je dnes jediná LATITUDE, která SEASON ignoruje (model.js:491 explicit „polar perpetually-winter"). Glaciologicky reálná polar summer ablation (Arctic sea-ice ~70 % ablation extent, Greenland surface melt 30-70 % area). `src/terrain.js`:
- **`POLAR_SNOW_BY_SEASON`** {spring:0.15, summer:0.40, autumn:0.15, winter:0.00} — `patchThreshold` inverse (winter=100 % snow, summer=60 %).
- **`POLAR_FREEZE_BY_SEASON`** {spring:0.7, summer:0.4, autumn:0.7, winter:1.0}.
- **`snowSpecForLatitude` polar branch** → `mode: "patches"` s `altThreshold: Infinity` + `altBias: 0.1` + season-aware `patchThreshold`.
- **`waterSpecForClimate` polar branch** → `freezeRatio = POLAR_FREEZE_BY_SEASON[season] ?? 1.0`.

### D-refactor. Mode `"temperate"` → `"patches"` (DRY/KISS)

Mode jméno `"temperate"` popisuje *biome*, ne *algoritmus*. Rename na `"patches"` (= sort+rank sémantika). Polar+temperate sloučeny na jeden code path v `terrain.js` Krok 3.5 — polar `if` branch odstraněn (~12 ř.), reuse sort+rank s odlišnými parametry. Volba A z user Q1.

### D-bug. Polar `altThreshold = 0` → `Infinity`

Bug v polar logice review: `altThreshold = 0` znamená Pass 1 chytá všechny cells s `y_top >= 0` jako always-snowed → `patchThreshold` nemá vliv. Fix: `altThreshold = Infinity` (= žádné Pass 1 cells, vše do Pass 2 sort+rank, patchThreshold řídí procento snowed cells přesně).

### E. Slider DAY sync z value (D2 — DD-38 kotva)

`index.html` DOMContentLoaded: `setInterval(250ms)` (= 4 Hz throttle) update `dayInput.value` + readout text z `world.DAY`. Skip pokud `world.DAY_SPEED === 0` (paused) nebo `document.activeElement === dayInput` (user actively dragging — bez activeElement check by slider mid-drag rewrite user input). Drží slider live při auto-advance.

### F. Ice canvas texture (D3 — DD-47 follow-up)

`src/main.js`: `makeIceCanvasTexture()` generator — 128×128 Canvas2D, base `#d9e8ec` (= dnešní _iceMat solid color, teď v textuře) + 30 bílých radial blobs (r=4..12 px, center alpha 0.7) = „zasněžený led" patches. `_iceTexture` shared napříč scénou (jedna v paměti). `_iceMat.color` 0xd9e8ec → 0xffffff (unbiased, texture barva dominuje) + `map: _iceTexture`. `wrapS/wrapT = RepeatWrapping` (default repeat 1×1 — single-cell LIQUID po DD-54 prototype).

### User verdikty (testů v browseru)

- **Sky tint:** „Je to skvělé." (po A1+A2+A3+A4=A defaults)
- **Sun tint + horizon:** „Test OK."
- **Polar variace:** „Test OK."
- **Slider sync + ice texture:** „Parádní finalizace, zlepšení, dotažení. Já už byl s výsledkem spokojený před 5 sezeními, ale stálo to za to!"

### Audit cadence po sez. 47

- `%AUDIT:CODE` — **1/8** (sez. 46 reset → sez. 47 tick). Next: ~sez. 54.
- `%AUDIT:DOCS` — **8/10**. Next: ~sez. 49.
- IDEAS/TODO pruning — **4/12**. Next: ~sez. 55.

### Soubory dotčeny

- `src/main.js` ~75 / −10 ř. (SEASON_SKY_DELTA + SUN_SEASON_DELTA + _applyHslShift + SUN_HORIZON_Y_MIN + makeIceCanvasTexture + _iceTexture + _iceMat color/map swap + volání v updateAtmosphere/updateSun + sunMesh.visible threshold).
- `src/terrain.js` ~25 / −15 ř. (POLAR_SNOW_BY_SEASON + POLAR_FREEZE_BY_SEASON tabulky, snowSpecForLatitude polar branch + temperate rename na patches, waterSpecForClimate polar branch, Krok 3.5 polar if odstranění + komentáře refresh).
- `src/model.js` ~10 / −7 ř. (JSDoc + inline komentář SEASON konzumentů rozšířit o polar season-aware + sky/sun tint).
- `index.html` ~13 / 0 ř. (setInterval DAY sync 4 Hz).
- `docs/GLOSSARY.md` ~1 / −1 ř. (SEASON entry sync — polar season-aware + sky/sun tint).
- `docs/TODO.md` (% END update).
- `docs/DIARY.md` +1 ř.
- `docs/diary/2026-05-14.md` + Sezení 47 sekce.
- `docs/DONE.md` + tato sekce.
- Memory `MEMORY.md` description sync.

Žádný nový DD (A4=A — sky tint a polar variace = DD-50 plný scope follow-up implementation; sub-prah byl explicit v DD-50 entry, dnes plněn).

## Sezení 48 (2026-05-14) — M-Genesis cleanup K1+D1+D2 + UI Sun toggle drop

**Kontext:** Po sez. 47 SEASON expansion close user verdikt: *„Generátor považuji za dokončený před 5 sezeními, ale stálo to za to."* Sez. 48 start M-Genesis arc s otázkou *„dosažení prvního klíčového milníku — základní iterace, ve které nic nechybí a nic overthinked nelze odebrat"*. AI návrh `%THINK` + 3-fázový plán (audit code → audit docs → ceremonie). User volby: Q1 = label „v1.0 M-Genesis", Q2 = ano k AUDIT:CODE/DOCS/pruning/CALIBRATE/README, Q3 = direction (FindPath multi-modal + generátor/transformátor/konzument supply chain, late post-close arc), Q4 = ceremonii. Fáze 1 start: `%AUDIT:CODE` trigger (cadence 1/8, ale user-driven override legitimní).

### Fáze 1: `%AUDIT:CODE` + cleanup

- [x] **K1 cut: drop M1-M5 milestone artefakty bez živého konzumenta v terrain scope.** User volba: PLNÝ K1 cut (K1a-K1e) + commit teď.
  - [x] **K1a ANIMATE dispatch** *(~80 ř.)* — `ANIMATORS` registry, 4 kindy `rotate`/`orbit_stadium`/`pulse`/`drift` + `animateRotate`/`animateOrbitStadium`/`animatePulse`/`animateDrift` funkce, `registerAnimator`, `updateAnimations`, `animators[]` registry, scratch vektory (`TAU`/`_up`/`_dir`/`_a`), `oscPhase` helper, `ANIMATE` atribut z OBJECTS constructor + JSDoc, `ANIMATE` infotip case + filter v `formatValue`/`renderTooltip`. DD-15 reference v immutable logu.
  - [x] **K1b SPRITES + bubble tail (SPEAKER pattern)** *(~250 ř.)* — `class SPRITES extends CUBES` z model.js + `ASSET`/`SPEAKER`/`SPEAKER_OFFSET_Y` atributy, `createSpriteFor`, `makeBubbleTexture` (canvas dialog bubble 512×150 + zaoblený obdélník + text), `resolveSpeakerTarget` + `buildBubbleTail` (ConeGeometry 0.06×1×4) + `updateBubbleTail` + `updateBubbleTails` + `bubbleTails[]` registry, `_speakerTarget` scratch, SPRITES branch v `createMeshFor` + hover skip. DD-13/DD-16 reference v immutable logu.
  - [x] **K1c PATH + Catmull-Rom strip** *(~70 ř.)* — `class PATH extends CUBES` z model.js + `KIND`/`POINTS` atributy, `createPathFor` (CatmullRomCurve3 + 64 sample strip BufferGeometry + UV scale 8×), `PATH_WIDTH`/`PATH_SEGMENTS`/`PATH_Y_OFFSET`/`PATH_UV_REPEAT` constants, `PATH_TEX_NAMES` + `_pathTexCache` + `pathTexture(kind)`, PATH branch v `createMeshFor` + POINTS infotip case. DD-27 reference v immutable logu.
  - [x] **K1d TIMER + COUNTER + ACTIONS** *(~150 ř.)* — `class TIMER extends OBJECTS` + `class COUNTER extends OBJECTS` z model.js, `registerTimer`, `registerCounter` (dynamický HUD řádek), `tickHandlers[]` registry, `ACTIONS` dispatch table (`toggle`/`set`) + `dispatchAction`, `registerBehavior` (TIMER/COUNTER branches), `updateTickHandlers`. HUD `#hud` `<div>` + `#time` `<span>` z index.html + CSS (`#hud { ... }`, `#hud .label`, `#hud > div`). DD-17 reference v immutable logu.
  - [x] **K1e TIME singleton** *(~30 ř.)* — `src/time.js` soubor smazán (export `TIME` + `advanceTime()` funkce), import `import { TIME, advanceTime } from "./time.js";` z main.js, `setInterval(() => { advanceTime(); updateTickHandlers(); }, 1000)` block. DD-04/DD-05 reference v immutable logu.
- [x] **D1 atlas IIFE compute waste** *(~50 ř., TODO ř. 70 known dluh)* — 3× ramp `*_GEOM_CACHE` IIFE refactor: drop `remapU(uv, faceIdx)` helper, drop `uvs = []` array, drop UV params z `addQuad(p0..p3, n)` / `addTri(p0..p2, n)` signatures, drop `uv0..uv3` args z 5× call sites per IIFE, drop `setAttribute("uv", ...)` na finálním BufferGeometry. Rename `TRRAMP_GEOM_CACHE` / `TTRAMP_GEOM_CACHE` / `TDRAMP_GEOM_CACHE` → `_TRRAMP_RAW_GEOM` / `_TTRAMP_RAW_GEOM` / `_TDRAMP_RAW_GEOM`. Update v `getRampGeom` (drop `geom.deleteAttribute("uv")`). DD-41 follow-up.
- [x] **D2 atlas komentář drift** *(3 fixy)* — main.js komentáře *„single-material atlas mapováním (DD-36)"*, *„1 atlas material"*, *„(geom, atlas mat) páru"*, *„patří atlasu / sdílené factory"* → DD-41 lowpoly vertex-color wording.
- [x] **UI Sun toggle drop** *(user follow-up)* — User: *„Ještě raději dodám: Slunce vždy ON."* `<input type="checkbox" id="set-sun">` z index.html settings panelu, `addEventListener("change", setSun)` z `<script>`, `let _sunUserVisible = true;` flag v main.js, `setSun(on)` z `window.settings` API. `sunMesh.visible = sun.position.y > SUN_HORIZON_Y_MIN` (drop `_sunUserVisible &&`). Auto-hide pod horizontem stačí (sez. 47 −15° threshold).
- [x] **Komentáře cleanup** — drop SPRITES/PATH references z main.js (`faceMaterialFor` komentář, `Pozn. pro SPRITES`, hover sekce, `meshByInstance` discriminated union komentář).
- [x] **Browser smoke test** — terrain renderuje, hover funguje, slidery DAY/Climate/SEASON regenerují, settings DOF/Fog toggles funguje. User ack.

### Velikosti

| Soubor | Před | Po | Δ |
|---|---|---|---|
| `src/main.js` | 2968 ř. | 2091 ř. | **−877 ř. (−29.5 %)** |
| `src/model.js` | 532 ř. | 404 ř. | −128 ř. |
| `src/time.js` | 30 ř. | (smazán) | −30 ř. |
| `index.html` | 521 ř. | 516 ř. | −5 ř. |
| **Celkem JS+HTML aktivní kód** | 4051 ř. | 3011 ř. | **−1040 ř. (−25.7 %)** |

### Hierarchie modelu po cleanup

```
OBJECTS (ID, NAME, DESCRIPTION)
 ├── CUBES (X, Y, Z float)
 │    ├── BLOCKS → CCUBES / TCUBES / TRRAMPS / TTRAMPS / TDRAMP
 │    ├── COMPOSITES → LAMP / DECOR
 │    └── LIQUID (DD-54 4. vrstva po PATH dropu)
 └── WORLD (singleton)
```

13 tříd → **8 tříd**.

### Rozhodnutí

- **DD-55 M-Genesis cleanup scope locked** (immutable) — `docs/DESIGN_DECISIONS.md`.
- **Single commit** `46f686d` na main + push (per memory `feedback-end-implies-push`).

### Reference

- `docs/DESIGN_DECISIONS.md` — DD-55 plný kontext + výčet drop + důvody.
- `docs/diary/2026-05-14.md` — sezení 48 detailní průběh.
- Commit `46f686d` — audit trail pro `git log` traceability.
- Memory: `[[feedback-test-nic-overthinked-nelze-odebrat]]` (nová), `[[feedback-end-implies-push]]`.

### Fáze 2: `%AUDIT:DOCS` (sez. 48, commit `8a88aa7`)

- [x] GLOSSARY drift cleanup — drop SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE sekce, sync UI Settings (2 checkbox), Sun mesh, Vizuální zdroje (3 → 2), LIQUID 5.→4. vrstva, header sez. 45 → sez. 48 + DD-55.
- [x] README Status + Milníky + Hierarchie + Plán — sez. 41 → sez. 48 M-Genesis cleanup, hierarchie diagram update, „Smazáno sez. 48" sekce, M-Genesis arc 5-fázový plán.
- [x] CLAUDE.md Key Files — model.js/main.js popis sync s 8 tříd modelem, time.js row drop, DD range na DD-55, %CALIBRATE projektová zmínka.
- [x] DESIGN_DECISIONS.md DD-55 — plný immutable entry s K1+D1+D2 + Sun toggle drop + 5 KISS důvodů + references.
- [x] TODO Recent DONE + cadence sync — sez. 34-48, M-Genesis arc 5-fázový plán jako aktivní úkoly.
- [x] DONE sez. 48 entry — výš.
- [x] DIARY index + sez. 48 file — řádek v DIARY.md index + `## Sezení 48` sekce v `docs/diary/2026-05-14.md` (Diskuse + Rozhodnutí + Fáze 1+2 + Kudos/Censure + Příště).
- [x] IDEAS sync sez. 48 — ř. 49-53 status sync (SPRITES/TIMER/COUNTER → DROPNUTO sez. 48 cleanup s git history revert pattern, WORLD jediný aktivní nevizuální OBJECTS).

### Regrese fix (sez. 48 follow-up, commit `c88aa4c`)

- [x] **TAU re-introduce** — K1a sed range delete smazal `const TAU = Math.PI * 2` (původně v Animator section pro `oscPhase`), ale TAU konzumuje i `updateSun()` (DD-38 sun position math) + `updateAtmosphere()` (DD-48 sky lerp). Browser ReferenceError → bílé okno. Fix: re-introduce TAU jako standalone konstantu před `updateWorldTime()`. **Censure! AI → AI** za naivní smoke test (HTTP 200 ≠ runtime OK) — sub-prah pre-`sed Nd` grep všech symbolů v range proti rest of file.

### Fáze 3: IDEAS/TODO/DONE pruning (sez. 48)

- [x] **TODO sync** — M-Genesis arc updates: Fáze 2 `[~]` → `[x]`, Fáze 3 `[ ]` → `[~]` (probíhá). Cadence pruning 5/12 → 0/12 reset.
- [x] **TODO MOVE → DONE: Atlas IIFE raw geom strip UV at source** *(G0 follow-up, TODO ř. 78)* — D1 sez. 48 hotové: 3× ramp `*_GEOM_CACHE` IIFE drop UV + remapU compute, rename `*_GEOM_CACHE` → `_*_RAW_GEOM`. ~50 ř. KISS dluh splaceno.
- [x] **TODO MOVE → DONE: GLOSSARY BLOCKS rodina TEXTURE_* sync s DD-41** *(sez. 38 audit follow-up, TODO ř. 79)* — Sez. 39 `%AUDIT:DOCS` + DD-41 wording v GLOSSARY ř. 18 už je *„bez vlastních face atributů (od DD-41 sez. 34, předtím TEXTURE_TOP/BOTTOM/NORTH/SOUTH/EAST/WEST)"*. Retro DONE.
- [x] **TODO DROP: Biome populate** *(M8+, TODO ř. 21)* — obsoletní, plně překryto `BIOME_NAMES` × `BIOME_SURFACES` v `generateTerrain` (DD-44 sez. 36) + biome-aware DECOR_DENSITY (DD-49 sez. 40).
- [x] **TODO TRACK třída anotace update** — doplnit „revert PATH z gitu sez. 4-8 pokud potřeba" (po sez. 48 PATH drop).

