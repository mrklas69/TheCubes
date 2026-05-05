# Glossary

Canonical terminologie projektu TheCubes.

## Model

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`. Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (float, DD-12 — sdílený souřadný systém; voxelové potomky si pozici v rendereru zaokrouhlí). Default vizualizace = voxel krychle se šachovnicí (DD-07), potomci override. Pojem „cube" je projektová značka, ne technická klasifikace.
- **CCUBES** (color cubes) — potomek CUBES s atributem `COLOR` (JS number 0xRRGGBB). Plochá barva všech 6 ploch. Nahrazuje dřívější `TERRAIN` (DD-13). Zaveden v M2, přejmenován v M3.
- **TCUBES** (texture cubes) — potomek CUBES s šesti atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`, `TEXTURE_EAST`, `TEXTURE_WEST`. Hodnota každé strany: `null` → fallback šachovnice (DD-07), `number` 0xRRGGBB → plocha barva, string hex (`"#rrggbb"`) → barva, jiný string (emoji, text) → canvas s textem vycentrovaným. Mapování světových stran na Three.js osy: TOP=+Y, BOTTOM=−Y, EAST=+X, WEST=−X, SOUTH=+Z, NORTH=−Z. Dispatch viz DD-14. *(M6.)*
- **SPRITES** — potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy otočený ke kameře). Atributy: `ASSET` (`null` → fallback šachovnice; `string` → canvas-generovaná dialogová bublina s textem v zaobleném obdélníku), `SPEAKER` (volitelný cíl dynamického 3D ocásku — instance nebo `{x,y,z}` literál, viz DD-16), `SPEAKER_OFFSET_Y` (vertikální offset nad cílovou instanci, default 0.5). Použití: dialog bubble, label, 2D entita. Pozice float (DD-12), sprite stíny neumí (záměr). Dispatch ASSET viz DD-14, SPEAKER viz DD-16. *(M5 + M8+ dynamický ocásek.)*
- **COMPOSITES** — potomek CUBES vizualizovaný jako 3D mesh složený z Three.js primitivů (`Group` s více meshi). Pozice spojitá (float), bez snap-to-grid. Zaveden v M3.
- **TREE** — konkrétní COMPOSITES: kmen (CylinderGeometry) + 3 kužely koruny (ConeGeometry). První ukázka 3D procedurálního tvaru. *(M3.)*
- **BALLOON** — konkrétní COMPOSITES: vak (SphereGeometry) + 4 lana (CylinderGeometry) + koš (BoxGeometry) + **PointLight** uvnitř vaku. Atributy: `COLOR` (barva vaku) a `LIT` (bool, default `false`). Umístěn typicky na **float** pozici mimo grid (demonstrace DD-12). `LIT = true` → vak září emisivně vlastní barvou, PointLight (teplá 0xffb060, intenzita 10, stíny) osvětluje scénu — „lantern mode", druhá shadow mapa vedle slunce. Engine fade watcher (DD-17) přechody plynulé (~0.5 s). Toggle přes click na vak nebo přes TIMER.ACTION. *(M4 + M8+ lantern.)*
- **HOUSE** — konkrétní COMPOSITES: kvádr stěn (BoxGeometry) + jehlanová střecha (ConeGeometry, 4 segmenty). Atribut `COLOR` barví stěny; barva střechy je fixní v enginu (rezavě červená). *(M8.)*
- **CLOUD** — konkrétní COMPOSITES: shluk 5 překrývajících se koulí (SphereGeometry) s bílou barvou. Bez vlastních atributů. Typicky vysoko nad scénou s `ANIMATE.kind = "drift"`. *(M8.)*
- **ROCK** — konkrétní COMPOSITES: shluk 5 nízkopolygonových koulí (IcosahedronGeometry detail=0) s flat shading. Atribut `COLOR` (default `0x808080` šedá) řídí paletu tří odstínů (základ, ×0.75 tmavší, ×1.2 světlejší). Statický dekor; uzavírá pětici COMPOSITES (organický/mechanický/stavební/atmosférický/geologický). *(M8+.)*
- **TUNNEL_ARCH** — konkrétní COMPOSITES: kamenný **kulový** oblouk (half-torus stojící jako duha). Footprint 1×1×1, opening podél X osy (vlak prochází pod ním). Atribut `COLOR` (default `0x8a8278` = stone gray) barví celý oblouk. *(Sez. 14, Scéna 2 — vstupy do tunelu.)*
- **WAREHOUSE** — konkrétní COMPOSITES: sklad u koleje (kvádr stěn + jehlanová střecha à la HOUSE + dveře + osvětlené okno). Footprint ~2×1.4×1.5 j. Atribut `COLOR` barví stěny; střecha/dveře/okno fixní. *(Sez. 14, Scéna 2 fáze 1 — připraveno na nakládku vlaku.)*
- **TRAIN** — konkrétní COMPOSITES: nákladní vlak (lokomotiva + 1 vagón, propojený spojkou, 8 kol). Lokomotiva = hlavní kvádr + kabina + komín. Atribut `COLOR` barví lokomotivu i kabinu; vagón a kola fixní (hnědý / černý). *(Sez. 14, Scéna 2 fáze 1 — statický; pohyb a nakládka v fázi 2/3.)*
- **VOXEL_MODEL** — generický COMPOSITES, který asynchronně načte mesh z `.obj` (s `.mtl` materiálem a `.png` paletou), typicky export z **MagicaVoxelu**. Atributy: `ASSET` (basename v `./assets/`, např. `"cars-0"`), `SCALE` (default 0.5), `ROTATION_Y` (radiány, default 0). Engine po načtení **auto-centruje** XZ + posune Y bottom na `instance.Y` (= surface úroveň), nastaví `NearestFilter` na texturu (zachová pixel-art look). **Opaque** — `COLOR` ani internal parts nelze parametrizovat (model je in-out blob). *(Sez. 14, otevírá MagicaVoxel pipeline pro statickou dekoraci. Viz „Vizuální zdroje" níž.)*
- **CHARACTER**, **NOODLE**, **STICKMAN** *(obsolete v TheCubes, sez. 14)* — humanoidní varianty přesunuty do samostatného projektu `./source/Stickman` (vlastní layered model + IK + gait demos + Inspector). DD-18/19/20 zůstávají v immutable logu jako historický kontext. Až bude integrace, bude reagovat přes externí asset (.glb / sibling ES module — způsob TBD).
- **TERRAIN** *(obsolete)* — historický název pro CCUBES; přejmenováno v M3 (DD-13). Pojem „terén" se vrátí až jako *typizovaný* potomek CCUBES (ICE/GRASS/SAND) — pokud bude potřeba.
- **TIMER** — nevizuální potomek **OBJECTS** (ne CUBES, žádná pozice). Atributy: `INTERVAL` (počet ticků mezi firem) a `ACTION = { kind, target, attr, value? }`. První skutečná reakce na `TIME.tick` (DD-04 dostal use case). Engine dispatch `ACTIONS[kind]` — aktuálně `toggle` (flip bool) a `set` (nastavit hodnotu). Registrace přes `registerBehavior(instance)` (symetrický sibling `scene.add(createMeshFor(...))` pro vizuální entity). Viz DD-17. *(M8+.)*
- **COUNTER** — nevizuální potomek **OBJECTS**. Atributy `VALUE` (int, default 0) a `INCREMENT` (int, default 1, může být záporné). Engine při `registerBehavior` dynamicky přidá řádek do HUD elementu `#hud` a v tick handleru mutuje `VALUE += INCREMENT`. Demonstruje **HUD observability** — nevizuální ≠ neviditelný, COUNTER je čitelný vedle `TIME`. `VALUE` je obyčejné datové pole, TIMER.ACTION `set` ho může kdykoli přepsat (např. reset). *(M8+.)*

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. Určené pro **diskrétní události** — první use case `TIMER` (DD-17, sez. 9).
- **tick** — jedno zvýšení TIME o 1. Tikne jednou za sekundu. Po inkrementu engine volá `updateTickHandlers()` — fire zaregistrovaných `tickHandlers[]` (TIMER instance).
- **ACTION** — recept diskrétní akce `{ kind, target, attr, value? }` vystřelený TIMER-em. Engine dispatch `ACTIONS[kind]` — izomorfně s `ANIMATE` (DD-15). Aktuální `kind`y: `toggle` (flip bool), `set` (přiřadit hodnotu). Viz DD-17.
- **ANIMATE** — atribut `OBJECTS` s receptem plynulého pohybu: `null` (default, statický) nebo objekt `{ kind: "<string>", ...params }`. Engine v render loopu volá `updateAnimations(tSeconds)` s wall-clockem (`performance.now() / 1000`), lookup `ANIMATORS[anim.kind]` dispatchuje na konkrétní per-frame funkci. Viz DD-15. Aktuální `kind`y: `balloon_bob`, `tree_sway`, `rotate`, `orbit_stadium`, `pulse`, `drift`. Tři osy mutace: **díly** (`balloon_bob`, `tree_sway` — `group.userData.parts`), **transformace** (`rotate`, `orbit_stadium`, `drift` — `object3d.rotation`/`position`), **materiál** (`pulse` — `material.emissive*`, volitelně `opacity`). *(M7.)*
- **base** — `object3d.userData.base = { x, y, z }` — snapshot počáteční polohy instance, pořízený při `registerAnimator`. Transformační animátory (`orbit_stadium`, budoucí `drift`) z něj čtou referenční bod (střed dráhy). Nezávislý na `userData.parts` (ten drží díly COMPOSITES).
- **balloon_bob** — `ANIMATE.kind`: vak sinusově pohupuje (period/amplitude), koš nezávisle s fázovým posunem, lana přepnuta přes `updateCylinderBetween` → viditelně mění délku. Sahá na vnitřní díly v `group.userData.parts`.
- **tree_sway** — `ANIMATE.kind`: 3 kužely koruny se kývají v XZ rovině jako dvě kolmé sinusoidy s různými periodami (`periodX`, `periodZ`) → eliptický pohyb, ne 1D kyvadlo. Amplituda násobena koeficientem výšky kuželu (špička víc, spodní kužel míň). Kmen statický. Sahá na vnitřní díly v `group.userData.parts`.
- **rotate** — `ANIMATE.kind`: rovnoměrná rotace celého Object3D kolem zadané osy. Parametry `axis` ("x"/"y"/"z", default "y") a `period` (doba jednoho otočení v sekundách). Generický — mutuje `object3d.rotation` přímo, nevyžaduje `userData.parts`. Funguje napříč třídami (TCUBES, COMPOSITES, …).
- **orbit_stadium** — `ANIMATE.kind`: uzavřená oválná dráha (atletický ovál = 2 rovné úseky + 2 půlkruhy) v rovině XZ kolem `userData.base`. Parametry `length` (L, rovná část; dlouhá osa X), `radius` (R, poloměr oblouku; krátká osa 2R), `period` (T, doba oběhu). Heading (`rotation.y`) sleduje tečnu dráhy → NORTH strana vždy ukazuje dopředu jako auto na trati.
- **drift** — `ANIMATE.kind`: lineární pohyb po jedné ose s **wrap-around** — když objekt opustí pás šířky `range`, vrátí se z opačné strany (skok). Parametry: `axis` ("x"/"y"/"z", default "x"), `speed` (j/s, default 1.0), `range` (šířka pásu v jednotkách, default 16). Pozice obíhá v intervalu `[base - range/2, base + range/2]` kolem `userData.base`. Idiom „mrak po obloze"; pro vysoko umístěné objekty je skok na hranici viewportu minimálně rušivý.
- **pulse** — `ANIMATE.kind`: emisivní pulsace — objekt sinusově mění `material.emissiveIntensity` mezi `min` a `max` s danou `period`. Parametry: `period` (doba cyklu v s), `min` (default 0 = zhasnuto), `max` (default 1.0 = plná síla barvy), `color` (optional 0xRRGGBB; default = `material.color`). Volitelně dvojice `opacityMin`/`opacityMax` — pokud je zadán alespoň jeden, engine zapne `transparent = true` a synchronně s emissive mění i `material.opacity` (max záře ⇔ max neprůhlednost, „dýchá"). Lazy init `emissive` barvy přes `userData.pulseInit` flag. Funguje na jakémkoli mesh-u s `MeshStandardMaterial` (CCUBES, BALLOON vak, …); tiché skip pro materiály bez `emissive` (SpriteMaterial, ShadowMaterial, pole materiálů TCUBES).
- **walk**, **sit**, **lie**, **wander**, **poseFns**, **walk_idle**, **run_idle**, **squat_lift**, **face plane** *(obsolete v TheCubes, sez. 14)* — humanoidní `ANIMATE.kind`y a podpůrné systémy odstraněny společně s CHARACTER/NOODLE/STICKMAN. Termíny budou definovány v projektu `./source/Stickman`.
- **scene switcher** — sez. 13. URL-based reload dispatch: `?scene=N` parametr v query stringu vybírá builder fn (`buildSceneOne`, `buildSceneTwo`). HUD tlačítka v pravém horním rohu, `aria-pressed` flag pro aktivní. Reload (~100 ms) dělá cleanup zdarma. Default = 1. **Sez. 14:** Scéna 2 přepsána na 10×10 voxelovou diorámu z `SCENE2_LAYOUT` (~145 kostek + tunelové oblouky + auta).

## Kolize *(obsolete v TheCubes, sez. 14)*

2D kolizní systém (DD-19) odstraněn společně s humanoidy. **collidable**, **isBlocked**, **stop & transition** žijí už jen v immutable DD logu jako historický kontext.

## Vizuální zdroje *(sez. 14)*

TheCubes scéna se buduje ze **čtyř vizuálních zdrojů**. Pravidlo (sez. 14, kandidát DD):
- **Parametrizované entity** (atributy ovlivňují vzhled — `COLOR`, `LIT`) nebo **dynamické** (animátor mutuje internal parts) → procedurální COMPOSITES.
- **Statická dekorace** → VOXEL_MODEL z MagicaVoxelu (rychlá iterace).
- **VOXEL_MODEL je default** pro novou statickou geometrii; COMPOSITES je fallback pro parametrizovatelné/animované.

### 1. Procedurální Three.js mesh (COMPOSITES + voxely)
Buildery v `src/main.js` (`buildBalloon`, `buildTree`, `buildHouse`, `buildTunnelArch`, `buildWarehouse`, `buildTrain`, …) skládají Three.js primitivy (BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, IcosahedronGeometry) do `Group` struktur. Internal parts uložené v `group.userData.parts` pro animátor přístup.
Voxely **CCUBES** (flat color) a **TCUBES** (per-face textury) jsou speciální případ — single Mesh s BoxGeometry, snap-to-grid v rendereru.
**Pro:** parametrizovatelné (atributy → vzhled), dynamické (animátor přístup k parts), izomorfní s DD-11 (model je data, engine staví mesh).
**Proti:** tedious to author — každý nový tvar = ~30-100 řádků kódu.

### 2. Procedurální canvas textury (`:named-texture`)
JS-generované pixel-art textury 16×16 px (`makePatchTexture`, `makeRailTopTexture`, šachovnice). Sdílené přes `NAMED_TEXTURE_FACTORIES` lookup v `faceMaterialFor` dispatchu (DD-14 prefix `:`). Aktuální: `":dirt"`, `":grass-top"`, `":grass-side"`, `":stone"`, `":rail-top"`.
**Použití:** strany TCUBES (typicky podlaha Scény 2 — grass cubes).
**Pro:** sdílené per textura (úspora paměti i GPU), pixel-art = stylová konzistence se Scénou 2 dioráma.
**Proti:** musí se kódit nový generator pro každý typ.

### 3. Canvas SPRITES
2D obrazy generované v JS (CanvasTexture, billboard otočený ke kameře přes `THREE.Sprite`). Volitelně přidružený 3D ocásek (THREE.Mesh jehlan, dynamicky sledující SPEAKER, DD-16).
**Použití:** SPRITES třída — dialogové bubliny s textem (`ASSET = "string"`).
**Pro:** rychlé generování textu + dynamický pointer na mluvčí.
**Proti:** specifické pro UI / 2D obsah.

### 4. Externí 3D modely (VOXEL_MODEL)
`.obj` + `.mtl` + `.png` soubory, typicky export z **MagicaVoxelu**. Načítány async přes `OBJLoader` + `MTLLoader` z `./assets/`. Třída **VOXEL_MODEL** (potomek COMPOSITES) — viz Model sekce výš.
Engine auto-centruje XZ + posune Y bottom na `instance.Y`; `NearestFilter` zachová pixel-art look palety.
**Pro:** drag-drop voxel modeling v MagicaVoxelu, žádný kód, vizuálně bohaté výsledky.
**Proti:** opaque — model nezná `COLOR` ani internal parts; nelze dynamicky parametrizovat.

### Workflow rozhodnutí

| Účel | Zdroj | Příklad |
|------|-------|---------|
| Voxelová podlaha / terrain | TCUBES + `:named-texture` | grass/dirt/stone cubes ve Scéně 2 |
| Statická dekorace | VOXEL_MODEL z MagicaVoxelu | strom, kámen, auto, oblouk (v plánu) |
| Parametrizovaná entita | COMPOSITES (procedurální) | BALLOON (LIT), HOUSE (COLOR) |
| Animovaná entita | COMPOSITES (animátor sahá na parts) | TREE (sway), CLOUD (drift), BALLOON (bob) |
| Dialog / štítek / UI | SPRITES | bubliny stromu/krabice |

### MagicaVoxel ↔ TheCubes pipeline *(sez. 14)*

**TheCubes → MagicaVoxel** (export šablony): skript `tools/export-grass-vox.mjs` generuje `.vox` 16³ kostku s grass + dirt paletou. Spuštění: `node tools/export-grass-vox.mjs` → `assets/grass-cube.vox`. User otevře v MagicaVoxelu jako šablonu.

**MagicaVoxel → TheCubes** (import): user vyrobí model, exportuje přes File → Export → obj (vznikne `name.obj` + `name.mtl` + `name.png`). Soubory umístí do `assets/`. V kódu: `new VOXEL_MODEL("id", "name", X, Y, Z, "name", scale, rotationY, "...")`.

## Pojmy

- **Asset** — soubor v `./assets/` načítaný za běhu (`.obj` + `.mtl` + `.png`). Synonymum pro „externí 3D model" v kontextu VOXEL_MODEL.
- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Použití: per-face TCUBES, šachovnice na mateřské CUBES, mapovaná textura na importovaném VOXEL_MODELu.
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Použití: SPRITES třída.
- **Pixel-art** — vizuální styl s viditelnými „pixely". Dosahujeme přes `NearestFilter` na `CanvasTexture` (nezablurovaná interpolace) + nízké rozlišení (16×16 typicky). Sdílí se mezi procedurálními texturami (`:dirt`/`:grass-top`/…) a importovanými VOXEL_MODEL paletami.
- **Decal** *(plánováno, možná)* — texture projektovaná na existující povrch. Zatím nepoužíváme.
- **Label** / **Bubble** *(plánováno)* — UI sprite přivázaný k entitě (jméno, dialog). Speciální případ SPRITES.

## UI

- **HUD** (head-up display) — malý překryvný panel v levém horním rohu pro globální stavy (`TIME` + dynamické řádky pro COUNTER instance).
- **Scene switcher panel** — sez. 13. Druhý překryvný panel v pravém horním rohu, tlačítka pro přepnutí mezi scénami. Klik = `location.search = "?scene=N"` → reload. Aktivní scéna má `aria-pressed="true"` (vizuální coral akcent z DD-07 palety). Viz **scene switcher** v sekci „Čas / chování" výš.
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Šachovnicová textura** — vizuální idiom „vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.

## Milníky

- **M1** — statická 3D scéna s jednou kostkou, ovládatelná kamera, tikající TIME v HUDu, hover infotip. *(hotovo sez. 1.)*
- **M2** — orientační pomůcky (GridHelper, AxesHelper) + první potomek `CUBES` (tehdy `TERRAIN`, dnes `CCUBES`) + 3×3 grid. *(hotovo sez. 2.)*
- **M3** — COMPOSITES + TREE (3D strom z primitivů), float souřadný systém (DD-12), terminologie potomků (DD-13). *(hotovo sez. 3.)*
- **M4** — BALLOON (COMPOSITES mimo grid) — demonstruje float pozici v jednotném souřadném systému. *(hotovo sez. 3.)*
- **M5** — SPRITES (dialog bubble nad stromem, canvas-generovaný text + komix ocásek). *(hotovo sez. 4.)*
- **M6** — TCUBES (per-face textury, emoji na krabici + fallback šachovnice). DD-14 zafixoval dispatch podle typu atributu sdílený s SPRITES. *(hotovo sez. 4.)*
- **M7** — Chování v čase: atribut `ANIMATE` na OBJECTS (DD-15), dispatch `balloon_bob` + `tree_sway` v enginu. Balón se pohupuje, koš pruží, lana se přepočítávají; strom se kývá ve větru. *(hotovo sez. 5.)*
- **M8+** — pozdější milníky (průběžné). *Hotovo (sez. 6+7):* HOUSE, CLOUD + `drift`, `rotate`, `orbit_stadium`, `pulse` animátory. *Sez. 8:* ROCK + dynamický 3D ocásek SPRITES (DD-16 — `SPEAKER` + `SPEAKER_OFFSET_Y`, tracking přes `meshByInstance`) + @AUDIT:CODE fixy F1–F6. *Sez. 9:* TIMER + BALLOON lantern (DD-17 — diskrétní `TIME.tick` reakce přes `ACTION`) + COUNTER + edge highlight. *Sez. 10:* CHARACTER + wander stavový automat (DD-18 — ANIMATE jako „mode slot" pro statické + dynamické + agregované pózy) + 2D kolizní systém (DD-19 — kruhy v XZ, dispatch-by-type, stop & transition) + @AUDIT:CODE fixy F1–F4. *Sez. 11:* @AUDIT:CODE po DD-18/19 fixy F1–F6 (CHARACTER docstring clean, magic konstanty pojmenované, `applyLiePose` parametrizace, `isBlocked` FCFS priorita dokumentována) + `PROMPTS.md` @BEGIN git sync fix. *Sez. 12:* Humanoidní varianty **NOODLE** (curve-based, CapsuleGeometry tělo/hlava + TubeGeometry končetiny podél CatmullRomCurve3) a **STICKMAN** (blokový low-poly podle user spec, 3-segmentová kostra s animovaným zápěstím/kotníkem) + **DD-20** (poseFns dispatch — humanoidní varianty sdílejí ANIMATE mode slot přes callback mapu v `userData.poseFns`). *Sez. 13:* STICKMAN polish (WORK_POSE sign fix axe-style chop, hlava −1/5 + víc segmentů, trup sploštění Z o 1/3, **face plane** 3 výrazy s `faceUpdaters[]` 3. engine-derived registry) + **scene switcher** (URL reload `?scene=N`, eliminuje cleanup-debt) + **Scéna 2 louka** (procedurální grass texture) + **GLTF export** (`window.exportStickman`) + **3 gait animátory** `walk_idle`/`run_idle`/`squat_lift` (Gemini reference, idiom `Math.max(0, sin)` jednosměrného kloubu) — odstraněn neúspěšný ranní `pose_cycle` attempt. *Pending:* F-fixy gait animátorů + reparent buildStickman (limbs + head jako children of torso, aby lean propagoval správně), STATE atribut pro wander substate visibility (DD-21 kandidát), sliding kolize (tečná projekce), sekvenční chování (zvedání/pokládání), mobility design (rampy/graf) — **stale horizon překročen (6× v Příště), rozhodnout DO/DROP**, editor fáze 2 (spawn/move/delete + registry cleanup), NOODLE/STICKMAN plnohodnotné sit/lie/work pózy.
