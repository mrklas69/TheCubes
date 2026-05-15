# Design Decisions

Log schválených rozhodnutí. Každé DD je immutable — pokud se rozhodnutí změní, přidej nové DD s referencí na staré (neměň staré).

## DD-01 — OBJECTS je kořenová třída, ne CUBES
Všechny entity v modelu dědí z `OBJECTS {ID, NAME, DESCRIPTION}`. `CUBES` je jen jedna větev (prostorové věci). Nevizualizované věci (pravidla, recepty, timery) dědí z OBJECTS přímo, nikoli z CUBES.
**Důvod:** "Svět z kostek" + neviditelné entity rozbíjí pojem "kostka". Čistší separace: OBJECTS = cokoli v modelu, CUBES = cokoli s polohou.

## DD-02 — CUBES = "cokoli s polohou", ne doslova krychle
`CUBES` je projektová značka, ne technická klasifikace tvaru. Default vizualizace potomků = voxel krychle, ale potomek může override (SPRITE = 2D billboard, INVISIBLE = nic).
**Důvod:** potřebujeme i sprites (postavy, stromy, voda) — musejí sdílet souřadný systém s kostkami. Varianta I (reinterpretace CUBES) zvolena před variantou II (samostatná třída SPATIAL) kvůli KISS.

## DD-03 — Souřadnice CUBES jsou diskrétní int (voxel grid) *(nahrazeno DD-12)*
~~`X, Y, Z` jsou celá čísla. Spojité float souřadnice nejsou podporovány.~~
**Superseded:** Hierarchie dostala potomky se **spojitou** polohou (balón = `COMPOSITES` mimo grid). Dvě souřadnicové větve by porušovaly KISS. Viz DD-12.

## DD-04 — TIME je globální čítač, ne per-object tick
Existuje jedna globální proměnná `TIME.tick`. Objekty samy nemají `tick()` metodu a na TIME samy nereagují.
**Důvod:** KISS. V M1 TIME je jen "hodiny na stěně". Mechanismus, jakým objekty reagují na čas (pravidla, brains, subscribe), se navrhne až bude opravdu potřeba — ne preemptivně.

## DD-05 — M1 = statický svět s hodinami
První milník obsahuje: scéna se (alespoň) jednou kostkou, ovládatelná kamera, tikající TIME v HUDu. Žádné chování, žádná pravidla, žádné sprites, žádné INVISIBLE.
**Důvod:** První věc, která musí fungovat. Rozšíření jsou samostatné milníky. (First things first.)

## DD-06 — Stack M1: jen frontend, Three.js, bez build stepu
HTML + JS moduly + Three.js z CDN přes import map. Žádný Node, žádný npm, žádný backend.
**Důvod:** Pro statický svět backend nepotřebujeme. Import map z CDN = nulový build step, minimální tření. Pokud později bude potřeba server (persistence, multi-user), řeší se tehdy.

## DD-07 — Default vizualizace mateřské CUBES = šachovnicová textura
Instance samotné třídy `CUBES` (bez specializace potomkem) se vykreslí se šachovnicovou texturou — stejným vzorem, jaký používají grafické editory (Photoshop/GIMP/Figma) pro průhledné pozadí.
**Důvod:** Vizuální signál "vizuál není definován / je to placeholder". Izomorfismus s konvencí z grafických editorů — uživatel ten vzor ihned dekóduje. Potomci CUBES (TERRAIN, SPRITE, …) override vlastní vizualizací; pokud override neposkytnou, zdědí šachovnici. To dělá "abstraktnost" mateřské třídy okamžitě čitelnou i ve scéně.

## DD-08 — Infotip panel na hover nad instancí
Najetí myší na libovolnou 3D reprezentaci instance zobrazí hover tooltip s atributy. Obsah: název třídy (`instance.constructor.name`) jako nadpis, pak seznam `klíč: hodnota` přes `Object.entries(instance)`. Tooltip sleduje kurzor s offsetem.
**Důvod:** izomorfismus — jeden vzor pro všechny budoucí třídy (TERRAIN, SPRITE, INVISIBLE, …). Generický přístup = nulová práce při přidávání nových tříd; stačí propojit mesh s instancí přes `mesh.userData.instance`. Inspirace: PocketStory entity popover.

## DD-09 — Výchozí osvětlení: DirectionalLight z (-10, -10, 10) na (0, 0, 0) *(nahrazeno DD-10)*
~~Hlavní směrové světlo (sun) má pozici `(-10, -10, 10)` a cíl v počátku.~~
**Superseded:** Y = -10 znamená v Three.js (Y-up) pozici **pod** scénou, což dávalo osvětlení "zespodu". Viz DD-10.

## DD-10 — Výchozí osvětlení: DirectionalLight z (-10, 10, 10) na (0, 0, 0)
Hlavní směrové světlo (sun) má pozici `(-10, 10, 10)` — zleva, shora, vepředu — a cíl v počátku (`target.position = (0, 0, 0)`, default). Intenzita `0.8`, barva `0xffffff`. Doplňuje ho AmbientLight `0.4` pro změkčení stínů.
**Důvod:** Three.js používá Y-up konvenci (osa Y směřuje nahoru). Pozice z DD-09 měla Y = -10, tj. světlo svítilo zespodu — neintuitivní výchozí stav. Nová pozice `(-10, 10, 10)` dává klasické nasvětlení "zleva shora", které odpovídá očekávání (přirozené slunce).
**Nahrazuje:** DD-09.

## DD-11 — Vizualizační dispatch "třída → materiál" žije v engine, ne na třídě
Rozhodnutí "jaký Three.js materiál/mesh odpovídá které modelové třídě" se řeší v `src/main.js` (engine) funkcí `createMeshFor(instance)` přes `instanceof` dispatch. Třídy v `src/model.js` nemají žádnou vizualizační metodu (`render()`, `createMesh()` atp.) a neimportují Three.js.
**Důvod:** Model/engine separation. Model je čistě datový — stejné entity by šly vizualizovat jiným rendererem (2D canvas, ASCII, server-side export) bez úpravy modelu. Varianta "polymorfismus na třídě" je elegantnější OOP-teoreticky, ale sváže model s Three.js (implicitně předpokládá WebGL prostředí). KISS + čistá separace vrstev.
**Důsledek:** Nový potomek CUBES (SPRITE, INVISIBLE, …) = jedna větev v `createMeshFor`. Pokud dispatch nabobtná, refaktor do mapy `ClassName → factory` nebo registračního API, ne návrat k metodám na třídě.
**Historická pozn.:** `TERRAIN` uvedený v tomto DD byl v sez. 3 přejmenován na `CCUBES` (DD-13).

## DD-12 — Souřadnice CUBES jsou float, voxel renderer snap-to-grid
`CUBES.X, Y, Z` jsou JS number (float). Invariant "voxelové potomky na celých číslech" vynucuje **renderer** ve `createMeshFor` — pozici voxelových potomků (`CCUBES`, `TCUBES`) si při tvorbě meshe zaokrouhlí (`Math.round`). Potomci se spojitou polohou (`SPRITES`, `COMPOSITES`) zůstávají na floatu.
**Důvod:** Dvě souřadnicové větve (`CUBES int` + zvlášť `FLOATING float`) by duplikovaly logiku a bránily sdílení vizuálních potomků. Jediný strom + jediný souřadný systém = KISS. Rizikem float (z-fighting, mikromezery) se brání snap-to-grid u voxelových potomků — na úrovni *rendereru*, ne typu.
**Nahrazuje:** DD-03.

## DD-13 — Terminologie potomků CUBES: CCUBES, TCUBES, SPRITES, COMPOSITES
Kanonické pojmy pro konkrétní potomky mateřské `CUBES`:
- **CCUBES** (color cubes) — plochá barva všech 6 ploch; atribut `COLOR` (JS number 0xRRGGBB). Přejmenování dřívějšího `TERRAIN`.
- **TCUBES** (texture cubes) — texture per face; atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`, `TEXTURE_EAST`, `TEXTURE_WEST`. Nevyplněná plocha fallback na šachovnici (DD-07).
- **SPRITES** — 2D **billboard** (obrázek vždy otočený ke kameře). Atribut `ASSET`. Použití: dialog bubble, 2D postava, label.
- **COMPOSITES** — 3D mesh složený z Three.js primitivů (`Group` obsahující box/cone/cylinder/…). Použití: strom, balón, herní entity s vlastním tvarem.

**Důvod:** Prefixy (`C`, `T`) pro voxelové potomky vytvářejí izomorfní rodinu rozlišitelnou podle vizuálního módu (budoucí `WCUBES` wireframe atd.). `SPRITES` a `COMPOSITES` vypouštějí prefix — jejich vizuální mód (billboard vs. 3D mesh) není „druh voxelu". Pojem **Asset** zůstává obecný pro libovolný grafický zdroj (texture, sprite image, …).
**Důsledek:** `TERRAIN` v kódu sez. 2 přejmenován na `CCUBES`. DD-11 a diář sez. 2 zůstávají jako historický záznam.

## DD-14 — Dispatch vizuálních atributů podle JS typu hodnoty
Atributy, které nesou **vizuální obsah** (`SPRITES.ASSET`, `TCUBES.TEXTURE_*` a jejich následovníci), interpretuje engine podle **typu** hodnoty — ne podle schématu ani diskriminátoru. Sdílený pattern:
- `null` / `undefined` → fallback šachovnice (DD-07).
- `number` (0xRRGGBB) → plocha barva přes `Three.Color`.
- `string` matchující `^#[0-9a-f]{3,8}$` (nebo CSS named) → plocha barva.
- jiný `string` → canvas s textem/emoji (`CanvasTexture`).
- (pozdější rozšíření: URL → externí PNG, `{ recept }` → objekt.)

**Důvod:** Izomorfismus mezi třídami (SPRITES a TCUBES dispatch je tentýž) — jeden mentální model. KISS — není potřeba rozlišovat `{ type: "solid", color: … }` vs. raw barva. Minimalizuje povinný boilerplate v modelu (`SPRITES("Ahoj!")` místo `SPRITES({ type: "text", value: "Ahoj!" })`). Model zůstává datový a nezávislý na Three.js (DD-11) — typová diskriminace probíhá výhradně v enginu (`faceMaterialFor`, `createSpriteFor`).

**Důsledek:** Nové atributy vizuálního obsahu (budoucí `TEXTURE_*` na dalších třídách, ikonka HUDu, …) by měly ctít stejný dispatch. Pokud hodnota potřebuje víc flexibility (rotace textury, offset, opacity), objektový recept `{ asset: "...", ... }` je přípustné rozšíření — ale jako nadstavba (přidaná větev dispatchu), ne náhrada plain hodnot.

## DD-15 — Chování v čase: atribut `ANIMATE` na OBJECTS, dispatch v enginu
Každá instance `OBJECTS` má atribut `ANIMATE` (default `null`). Pokud je vyplněný, očekává se **objekt ve tvaru `{ kind: "<string>", ...params }`**. Engine v `src/main.js` registruje v `createMeshFor` pár `{ object3d, instance }` do pole `animators` a render loop volá `updateAnimations(tSeconds)` — `switch` nad `anim.kind` dispatchuje na konkrétní per-frame funkci (`animateBalloonBob`, `animateTreeSway`, …). Parametr `tSeconds = performance.now() / 1000` (wall-clock, plynulý); `TIME.tick` zůstává pro diskrétní události.
**Důvod:** Izomorfismus s DD-14 (dispatch podle typu/diskriminátoru hodnoty). Model zůstává datový (DD-11) — animátorové funkce sáhnou na mesh přes `group.userData.parts`, které uložil příslušný `build*` helper. Polymorfismus na třídě (`BALLOON.tick()`) by porušil separaci model/engine; engine-side registry bez stopy v modelu by zase neumožnil infotipu informovat, že se entita hýbe.
**Důsledek:** Nový druh pohybu = nová větev ve `switch` + nová funkce `animate<Kind>`. Konkrétní tvar pohybu žije v enginu; model drží jen recept. Aktuální `kind`y: `balloon_bob` (sinusové pohupování vaku + koše s rebindingem lan), `tree_sway` (dvě kolmé sinusoidy s různými periodami, amplituda škálovaná výškou kuželu). Parametr `tSeconds` je wall-clock proto, aby byly sinusy plynulé nezávisle na FPS — `TIME.tick` je diskrétní čítač pro jiné účely.

## DD-16 — SPRITES.SPEAKER dispatch: instance ref vs. literál
Atribut `SPRITES.SPEAKER` definuje cíl dynamického 3D ocásku bubliny. Engine interpretuje hodnotu podle **tvaru** (duck-typing, izomorfně s DD-14):
- `null` / `undefined` → bublina bez ocásku (plochý obdélník).
- Objekt s `.X`, `.Y`, `.Z` (UPPER case, DD-12) = **instance OBJECTS-potomka**. Cíl = aktuální **world position** meshe (přes `meshByInstance` lookup) + `sprite.SPEAKER_OFFSET_Y`. Dynamické — sleduje `object3d.position`, kterou mění transformační animátory (`rotate`, `orbit_stadium`, `drift`, …). Fallback na `instance.X/Y/Z` + offset, pokud mesh není registrován.
- Objekt s `.x`, `.y`, `.z` (lower case) = **literální bod** v prostoru. Statický cíl, offset se ignoruje.

`SPRITES.SPEAKER_OFFSET_Y` (default `0.5`) umožňuje nacílit na „vrch" entity s respektem k její velikosti — 0.5 pro voxel 1×1×1, ~1.8 pro TREE, atd. Vertikální offset stačí pro aktuální use case (bubliny nad entitami); X/Z offset by byl přípustné rozšíření, pokud vyvstane potřeba.

**Důvod:** Izomorfismus s DD-14 (dispatch podle typu/tvaru hodnoty) a DD-15 (recept v modelu, interpretace v enginu). Dva tvary (instance + literál) pokrývají „mluvčí v modelu" i „pevný bod v prostoru" bez nového typu. `SPEAKER_OFFSET_Y` jako samostatný atribut místo vnoření do SPEAKER drží jednoduchou hodnotu v SPEAKER slotu (instance nebo literál), offset je nezávislé ladění.

**Důsledek:** Nová per-frame „derived behavior" (engine-interní, ne user-deklarovaná jako `ANIMATE`) = nový registry v enginu (`bubbleTails` precedent). Pokud přibude třetí, refaktor na obecný `updaters[]` s `{ fn, ctx }` kontraktem. `ANIMATE` (DD-15) zůstává rezervovaný pro **uživatelské** recepty chování.

## DD-17 — Diskrétní reakce na `TIME.tick`: TIMER + ACTION dispatch
Nevizuální potomek OBJECTS `TIMER { INTERVAL, ACTION }` firuje `ACTION` každých `INTERVAL` ticků (první skutečná reakce na `TIME.tick` od M1 — otevírá DD-04). `ACTION = { kind, target, attr, value? }` je recept strukturovaný **izomorfně s `ANIMATE`** (DD-15); engine dispatchuje přes `ACTIONS[kind]` lookup (`toggle`, `set`; budoucí `increment`, `spawn`, …). Tick handler registry `tickHandlers[]` volaný z rozšířeného `setInterval` (vedle `advanceTime`). Registrace přes `registerBehavior(instance)` — symetrický sibling `scene.add(createMeshFor(instance))` pro vizuální entity.

Stav entit mění `ACTION` přímou mutací atributu (`target[attr] = ...`). Engine-derived watchery (další kategorie, izomorfní s DD-16 bubble tail) na změny reagují per-frame — pro `BALLOON.LIT` je to `updateLit(dt)` s exponenciálním fade (emissive + PointLight.intensity současně). Interakce `click` na mesh (raycaster) je paralelní cesta k témuž stavu — TIMER i uživatelské kliknutí konvergují na `instance.LIT` bool, watcher vidí jen výsledek.

**Důvod:** `ANIMATE` (DD-15) pokrývá plynulé per-frame chování (wall-clock), nehodí se pro diskrétní události — pokud by TIMER byl `ANIMATE.kind`, register by žil na hostitelské instanci a recept by se vázal k pozici v prostoru. TIMER jako vlastní OBJECTS potomek oddělí „kdo" (nevizuální entita) od „co" (ACTION recept). Izomorfismus dispatchu (`ACTIONS[kind]` zrcadlí `ANIMATORS[kind]` a `faceMaterialFor` — DD-14) drží jeden mentální model. Click-to-toggle jako paralelní cesta k LIT stavu (ne přes TIMER) ukazuje, že stav žije v modelu, ne v dispatch mechanismu — více „ovladačů" jednoho atributu.

**Důsledek:** Nová nevizuální třída OBJECTS = větev v `registerBehavior`. Nový `ACTION.kind` = záznam v `ACTIONS` tabulce (+ dokumentace). Watchery engine-derived behaviorů (DD-16 bubble tail, DD-17 LIT fade) by měly následovat stejný pattern — registry polí + per-frame update call v render loopu. Pokud přibude třetí, refaktor na obecný `updaters[]` (viz DD-16). `TIME.tick` zůstává rezervovaný pro diskrétní události — `ANIMATE` pro plynulé.

## DD-18 — CHARACTER: dvoudílné končetiny + ANIMATE jako „mode slot"
`CHARACTER extends COMPOSITES` je humanoidní postava s hierarchickou kostrou: torzo (válec s konicitou 0.19→0.15), hlava (koule), 4 končetiny. Každá končetina je `Three.Group` s **pivotem v rameni/kyčli** (horní díl visí v −Y od pivotu), uprostřed kulový kloub (loket/koleno), spodní díl je sub-`Group` na kloubu (pivot pro budoucí hinge ohyb). Všechny díly reference uložené v `group.userData.parts`.

**`ANIMATE` slot se rozšiřuje z „plynulé animace" na obecný „mode slot"** — statické pózy (`sit`, `lie`) jsou animátory, které ignorují `t` a jen jednou za frame nastavují rotace; dynamické (`walk`, `run`) čtou `t` přes `oscPhase`. Jeden dispatch (`ANIMATORS[kind]`) pro oba druhy, žádná nová kategorie „POSE". Default `ANIMATE = null` = loutka ve standing pose.

Pro agregované chování (střídání módů) existuje `wander` kind — **stavový automat uvnitř animátoru**. Drží vlastní state v `group.userData.wander` (`current, timer, targetX/Z, subject, substate`), dispatchuje na **sdílené pose primitives** (`applyWalkCycle`, `applySitPose`, `applyLiePose`, `applyWorkPose`, `resetCharBase`, `moveTowards`) — stejné funkce používají i samostatné animátory (`walk`, `sit`). 6 stavů: walk, run, stand, sit, lie, work; work má substate `approach → perform` pro interakci s objekty (`subjects: [rock, tree, ...]`).

**Důvod:** Mode slot přes existující ANIMATE (ne nový POSE atribut) drží jeden mentální model + jeden dispatch. Statická vs. dynamická je rozdíl v implementaci animátoru, ne v API modelu — statický prostě nepoužije `t`. KISS.

Stavový automat **uvnitř animátoru** (místo samostatný BEHAVIOR registry) zamezuje duplikaci infrastruktury (per-frame iterace, dt tracking už řeší animators). Cena: `userData.wander` state je uvnitř engine, ne v modelu — acceptable (engine-derived jako bubble tail DD-16 nebo LIT fade DD-17), plus state automatu je efektivní detail, ne user-deklarovaný recept.

**Důsledek:** Další statický mód (stand explicitní, dřep, úklona) = nový `kind` na 5 řádků, sdílí pose helpers. Dynamické (plížení, tanec) = nový `kind` s vlastní per-frame logikou. Přechody mezi módy se zatím nerespektují (skok v `resetCharBase`) — pokud bude potřeba plynulý interpolovaný přechod (sed → stoj), přidá se transition animátor nebo keyframe systém (nová DD). „Zvedání / pokládání" jsou **sekvence** (pre-pose → mid-pose → post-pose + interakce s objektem) — vyžadují samostatný návrh (DD až vyvstane).

## DD-19 — Kolizní systém: 2D kruhy v XZ, dispatch-by-type, stop & transition
Kolize entit se počítá v 2D rovině **XZ** jako kruhy; Y se ignoruje (scéna je prakticky plochá — voxely všechny na Y=0, COMPOSITES na feet level). Každá entita má kolizní radius určený typem v `collisionRadiusFor(instance)` (CHARACTER 0.2, TREE 0.35, HOUSE 0.85, ROCK/voxel 0.5, BALLOON/CLOUD/SPRITES žádný). Registrace v `createMeshFor` vedle `meshByInstance.set` — engine-derived, automatické pro všechny instance, žádný explicit opt-in v modelu.

`isBlocked(moving, nx, nz)` iteruje `collidables[]` (lineárně, N×M overlap check; pro N ~15 entit triviální perf). Při kolizi `moveTowards` vrátí `true` (arrived-like) — **stop & transition**: wander automat interpretuje „blokováno" stejně jako „dosáhl jsem cíle" a přepne do dalšího stavu. Žádný sliding ani pathfinding.

Pohyblivé entity (wander characters, `orbit_stadium` TCUBES) čtou aktuální pozici přes `object3d.position` — collider je live, ne snapshot z instance.

**Důvod:** KISS — 2D kruhy pokrývají 95 % scén (plochý voxel svět + stojící COMPOSITES). Sliding vyžaduje tečnu projekce (ne-triviální u kruhů), pathfinding vyžaduje graf + algoritmus (A*, Dijkstra). Pro „poflakovacího" AI stačí stop & transition — charakter to obejde tím, že se prostě rozhodne jít jinam. Y ignorování je volba KISS; balón/mrak visí, SPRITES jsou labels — nic z toho nechceme jako překážku.

Dispatch-by-type radii v enginu (ne atributem na třídě) izomorfní s DD-11 vizuálním dispatchem: model zůstává datový, engine ví, co znamená „TREE = radius 0.35". Pokud by nějaká instance potřebovala vlastní override (obří TREE, mini ROCK), přidá se `COLLIDE_RADIUS` atribut dispatchovaný stejnou cestou jako `COLOR` (DD-14 precedent).

**Důsledek:** Nová třída se smysluplnou kolizí = nová větev v `collisionRadiusFor` (radius konstanty žijí v enginu). Nová kinematika (sliding, tečna, rampa) = úprava `moveTowards` + možná nový kontrakt s stavem. Pathfinding = nový systém (ne refaktor), dost velký na vlastní DD.

## DD-20 — Humanoidní varianty sdílejí `ANIMATE` mode slot přes `poseFns` dispatch
Humanoidní třídy (aktuálně CHARACTER, NOODLE, STICKMAN; budoucí ROBOT, …) všechny podporují stejné `ANIMATE.kind`y (`walk`, `sit`, `lie`, `wander`) — každá ale s **vlastní interpretací** pose primitives. Engine drží mapování v `group.userData.poseFns = { walkCycle, sitPose, liePose, workPose, reset }`, naplněné build fn příslušné třídy. Animátory `walk`/`sit`/`wander` a `enterWanderState` dispatchují přes tuto mapu (např. `group.userData.poseFns.walkCycle(parts, t, period, amp)`) místo přímého volání `applyWalkCycle(...)`.

Pose primitives mohou být:
- **Sdílené mezi třídami** — CHARACTER a STICKMAN mají stejnou hinge topologii (kloubové rotace Groupů), STICKMAN jen přidává 3. segment (zápěstí/kotník). `applyWalkCycle` je rozšířený o volitelné terminal klouby přes `if (p.leftWrist)` backward-compat check — jeden kód obsluhuje oba.
- **Vlastní pro třídu** — NOODLE má úplně jinou topologii (TubeGeometry podél CatmullRomCurve3). `applyNoodleWalkCycle` per-frame mutuje Z-souřadnici kontrolních bodů křivky a regeneruje TubeGeometry (dispose + new). CHARACTER primitives by nedávaly smysl.

**Důvod:** Izomorfismus s DD-14 (dispatch podle typu hodnoty) a DD-11 (engine-side dispatch, model zůstává datový). Model ve třídě NOODLE/STICKMAN jen říká *„jsem humanoid, podporuju walk/sit/…"* přes sdílené `ANIMATE.kind` jméno — konkrétní mechaniku pohybu řeší engine. Uživatel píše `char4.ANIMATE = { kind: "wander", bounds: 3, subjects: [rock1, tree1] }` stejně pro všechny tři tvary — kontrakt se nerozbil.

**Důsledek:** Nová humanoidní varianta = nová třída v modelu + nová `build<Kind>` fn v enginu, která naplní `group.userData.parts` a `group.userData.poseFns`. Animátory se nemění. Pokud nová varianta má stejnou topologii jako existující (např. ROBOT s kvádrovými hinge klouby = jako STICKMAN), sdílí její pose primitives. Jinak implementuje vlastní — izomorfně s NOODLE.

Pose primitive z jiné třídy lze re-usnout i částečně: `applyLiePose(group, groundY)` je whole-body transform (rotace celé Grupy), funguje pro všechny humanoidní varianty beze změny. NOODLE a STICKMAN ho používají doslova přes `poseFns.liePose = applyLiePose`.

## DD-21 — Vizuální zdroje: hybrid (procedurální COMPOSITES + externí VOXEL_MODEL)
TheCubes scéna se buduje ze čtyř vizuálních zdrojů (viz GLOSSARY „Vizuální zdroje"):
1. **Procedurální Three.js mesh** (COMPOSITES + voxely TCUBES/CCUBES) — kódované buildery v `src/main.js`.
2. **Procedurální canvas textury** (`:dirt`, `:grass-top`, `:stone`, `:rail-top`, …) — sdílené přes `NAMED_TEXTURE_FACTORIES` v `faceMaterialFor` dispatchu (DD-14 prefix `:`).
3. **Canvas SPRITES** — 2D billboards pro dialog/UI (CanvasTexture + volitelný 3D ocásek, DD-16).
4. **Externí 3D modely** (VOXEL_MODEL třída) — `.obj`+`.mtl`+`.png` z MagicaVoxelu, načítané async přes OBJLoader+MTLLoader z `./assets/`.

**Pravidlo dispatche:**
- **Parametrizované entity** (atributy ovlivňují vzhled — `COLOR`, `LIT`) nebo **dynamické** (animátor mutuje internal parts) → **procedurální COMPOSITES**. Příklad: BALLOON (LIT toggle, vak emissive), TREE (sway anim sahá na kužely), HOUSE (COLOR barva stěn).
- **Statická dekorace** bez parametrizace → **VOXEL_MODEL** (default pro novou statickou geometrii).
- **Voxelová podlaha / terrain** → **TCUBES + `:named-texture`** (sdílená paleta, izomorfní s DD-14).
- **Dialog / štítek / UI** → **SPRITES** (DD-16 SPEAKER tracking).

**Důvod:** Žádný jednotný vizuální zdroj nepokrývá všechny use cases bez kompromisu. Procedurální COMPOSITES jsou parametrizovatelné a animovatelné, ale tedious to author (~30–100 řádků per třída). VOXEL_MODEL z MagicaVoxelu je opaque blob (model nezná `COLOR` ani internal parts), ale autoring je drag-drop voxelů v editoru → rychlá iterace. Hybrid maximalizuje silné stránky každého zdroje.

Pixel-art styl (NearestFilter na všech texturách + 16×16 rozlišení v `:named-texture` + nízké palety v MagicaVoxelu) zaručuje vizuální konzistenci napříč zdroji — voxelová podlaha (procedurální tex) a importované VOXEL_MODELy vypadají stylově identicky.

**Důsledek:** Nová **statická dekorace** = vyrobit v MagicaVoxelu, exportovat `.obj` do `assets/`, instance `new VOXEL_MODEL("id", ..., "asset", scale, rotY)`. Žádný nový kód v enginu (sdílený `buildVoxelModel`). Nová **parametrizovaná entita** = nová COMPOSITES třída v model.js + `build<Kind>` v main.js + dispatch větev v `createMeshFor` (~30–100 řádek). Nový **typ voxelové podlahy** = nový generator + řádek v `NAMED_TEXTURE_FACTORIES` (~10 řádek).

**Zpětná migrace** existujících COMPOSITES (TREE, ROCK, HOUSE, …) na VOXEL_MODEL je možná, ale **ne automatická** — přechod by ztratil parametrizaci (atribut `COLOR` přestane fungovat) a animátory by neměly internal parts k mutaci. Migruje se per entita podle skutečné potřeby, ne en bloc.

**Pipeline TheCubes ↔ MagicaVoxel** (sez. 14):
- TheCubes → MagicaVoxel: skript `tools/export-grass-vox.mjs` generuje `.vox` šablonu (16³ kostka s naší paletou).
- MagicaVoxel → TheCubes: File → Export → obj → drop do `assets/` → instance VOXEL_MODEL.

## DD-22 — Pevné měřítko voxelových modelů + Y konvence

Měřítko VOXEL_MODEL je **pevně zafixované** napříč projektem, aby všechny entity sdílely stejnou pixelizaci a vešly se navzájem realisticky:

- **1 TC voxel = 1 m** (Minecraft konvence; grass/dirt/stone podlaha = metrový blok).
- **1 MV voxel = 1 pixel textury = 1/16 TC voxelu = 6.25 cm**.
- **`VOXEL_MODEL.SCALE` default = `0.625`** — kombinuje s MagicaVoxel default exportem (0.1 per voxel) na výsledný 16 MV → 1 TC. Scale parametr používat **jen výjimečně** pro úmyslnou re-škálu (mini-mode, hero-mode).
- **Velikost objektu řídí počet voxelů v MV gridu**, ne scale. Tunel 48³ MV → 3×3×3 TC. Postava 8×5×28 MV → 0.5×0.31×1.75 m.

**Y konvence (auto-snap loaderu):**
- `instance.Y` = **world Y spodní hrany mesh** (po auto-centeru a bottom-snap v `buildVoxelModel`). Ne grid souřadnice voxelu, ne mesh center.
- Aby voxel model **stál na grass voxelu** s grid souřadnicí `(gx, gy, gz)`, použij `instance.Y = gy + 0.5` (= top toho voxelu, world Y).
- Standardní podlaha diorámy je grass voxely na `gy = -1` (top na world Y = -0.5) → `instance.Y = -0.5`.
- Stojí-li model na vyvýšené úrovni (např. grass na `gy = 0`, top world Y = 0.5) → `instance.Y = 0.5`.

**Důvod:** Konzistentní pixelizace napříč entitami zaručuje, že auto vedle postavy nejsou nesourodých velikostí (jako v sez. 14 cars scale 0.5 vs tunel scale 0.625) a že modely stojí na podlaze, ne se vznášejí ani se nezarývají do ní.

**Důsledek:**
- Aktuální MV exporty bez explicitního scale parametru se vyrenderují přesně tak velké, jak byly modelovány (`16³ MV` = `1 m³ = 1 TC voxel`).
- Při umisťování se pamatuje na `Y = grid_Y + 0.5` (top voxelu, ne center).
- Validace ramp/přechodů: aby model spojoval výškové úrovně, MV grid musí přesně odpovídat výškovému rozdílu (rampa 1 m vysoká = 16 MV voxelů na výšku → spojuje sousední TC úrovně).

## DD-23 — Procedurální pixel-voxel default („Kostičky = jen voxely")

Identita projektu „TheCubes" / „Kostičky" → **vizuální jazyk je výhradně voxelový**. Žádné Cylinder, Cone, Sphere, Torus, Icosahedron pro core gameplay entity. Tato izomorfie zaručuje, že každý objekt sdílí stejnou pixelizaci a stylový jazyk s podlahou diorámy.

**Pravidlo dispatche** (revize DD-21):
- **Vegetace, kameny, mraky, prostředí** → **procedurální pixel-voxel COMPOSITES** (BoxGeometry voxely 0.125 j velikosti, sub-buildery dispatchované přes `KIND` string).
- **Komplexní specifické entity** (vozidla, stroje, charakteristické landmarky, postavy s detaily) → **externí VOXEL_MODEL** z MagicaVoxelu.
- **Voxelová podlaha** → **TCUBES + `:named-texture`** (DD-14, beze změny).
- **Dialog / UI** → **SPRITES** (DD-16, beze změny — 2D billboard je legitimní spec-case pro UI overlay, ne gameplay entitu).

**Důvod:** Procedurální drtí asset-based tam, kde je entita rodinná šablona (10 stromů z parametrizovaného generátoru) nebo kde variabilita je hodnotná (les ze 100 stromů ze 4 KIND-ů × random). Externí MV vyhrává, kde je tvar specifický a komplex (bagr, vlak, postava s obličejem). Hybrid ze sez. 14 (DD-21) byl správný směr; sez. 15 ho **zúžil** na pixel-voxel-only — žádné Cylinder/Cone/Torus primitivy.

**Důsledek:**
- Sez. 15 cleanup: smazány třídy BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN + jejich primitivové buildery + Scéna 1 + LIT system + scene switcher (~720 řádků).
- TREE.KIND default = `"spruce"` (pixel jehličnatý). Classic varianta s kuželi smazána.
- Až bude potřeba pixel-voxel ekvivalent některé smazané třídy (lampion, dům, kámen, mrak) — vznikne nová třída se sub-builderem v `TREE_BUILDERS`-style dispatchu.
- DD-17 (BALLOON.LIT) zachován v immutable logu, ale není aktivní — vrátí se až s pixel-voxel lampion ekvivalentem.

## DD-24 — Shape × Surface separation pro VOXEL_MODELy

VOXEL_MODELy s **jednolitým povrchem** (cube, ramp, tunel, schody, zeď, sloup, …) se rozdělují na ortogonální dimenze:
- **Shape** = geometrický tvar (1 MV soubor s **abstract paletou**)
- **Surface** = vzhled povrchu (paleta 4 RGBA + drobná textura: grass, dirt, stone, sand, ice, water, brick, wood)

Každá kombinace `shape × surface` vznikne **pre-build skriptem** — generuje `assets/built/<shape>-<surface>.{obj,mtl,png}` per kombinaci. Engine spotřebovává pre-built soubory beze změny (`VOXEL_MODEL.ASSET = "ramp-grass"`).

**MV abstract paleta konvence** (4 indexy):
- `1` = BASE (dominantní barva povrchu, ~85 % voxelů)
- `2` = ACCENT1 (drobné variace, ~7 %)
- `3` = ACCENT2 (drobné variace, ~5 %)
- `4` = HIGHLIGHT (ojedinělé akcenty, ~3 %)

Shape se modeluje v MV s 4 paletovými indexy (barvy mohou být v MV libovolné — slouží jen pro autora, pre-build skript je swapne).

**Surface paleta** = JSON v `assets/surfaces/<name>.json`:
```json
{
  "BASE":     "#5d9446",
  "ACCENT1":  "#4e823c",
  "ACCENT2":  "#3e6a32",
  "HIGHLIGHT": "#6ea054"
}
```

**Pojmenování** — sjednoceno na **`<shape>-<surface>`** (kebab-case lowercase, izomorfně s `:grass-top` / `:rail-top` v NAMED_TEXTURE_FACTORIES). Příklady: `cube-grass`, `ramp-stone`, `tunel-grass`, `cube-brick`, `wall-wood`. Sez. 15 rename: `grass-cube` → `cube-grass`, `grass-ramp` → `ramp-grass`.

**Co kvalifikuje pro shape × surface:**
- ✓ Terénní prvky a stavební bloky (jednolitý povrch)
- ✗ Vozidla a stroje (multi-color: kola, sklo, světlomety)
- ✗ Postavy (multi-color: hlava, tělo, oblečení)
- ✗ Stromy (řešeno přes TREE.KIND sub-buildery, kmen+listy = 2 palety)

**Důvod:** Bez separace = N×M MV souborů per kombinace (8 shapes × 8 surfaces = 64 souborů). Se separací = N+M assetů (8 shapes + 8 surface JSONů + 1 generator). Plus **konzistentní paleta napříč shapes** (grass cube + grass ramp + grass tunel mají stejné odstíny).

**Důsledek:**
- Při tvorbě nového shape: modeluje se jen jednou (s abstract paletou) → automaticky 8 variant po pre-buildu.
- Při tvorbě nového surface: jeden JSON → automaticky N variant existujících shapes.
- Aktuální 5–10 plánovaných shapes × 8 surfaces (`grass`, `dirt`, `stone`, `sand`, `ice`, `water`, `brick`, `wood`) = 40–80 pre-built kombinací.
- Multi-color entity (vozidla, postavy) zůstávají **monolitní VOXEL_MODELy** s vlastní paletou per soubor.

## DD-25 — 4-vrstvá taxonomie scény: Bloky, Voxely, Linie, Objekty

Scéna se skládá ze čtyř vrstev s ortogonálními úkoly a různým rozlišením. Každá vrstva má vlastní rodinu tříd, vlastní jazyk geometrie a sdílenou paletu pixel-art textur:

1. **Bloky** (1C grid, geologie/terén) — 1×1×1 TC bloky tvořící krajinu. Rodina **`BLOCKS`** pod `CUBES`:
   - **TCUBES** (krychle, 6 faces / nátěrů)
   - **TRRAMPS** (trojboký hranol = pravoúhlý klín, 5 faces; svah + bottom + back vertikál + 2 boční trojúhelníky)
   - **TTRAMPS** (trojboký jehlan = trirectangular tetrahedron, 4 faces; rovnostranný svah + 3 pravoúhlé trojúhelníky)
   - **TTUNELS** (1C blok s klenutým průchodem v jedné ose, 4 faces; top + sides + inside walls + inside ceiling, bez dna)
   - Sdílí: snap-to-int (DD-12), procedurální `BufferGeometry` v engine, `faceMaterialFor` dispatch (DD-14), `:named-textures` paleta, atribut `ORIENTATION` (DD-26 — float ve stupních [0, 360)).

2. **Voxely** (1V = 1/16 C, dotvarba krajiny) — pixel-voxel kompozice z BoxGeometry voxelů velikosti 0.125 j (= 1/8 TC). Pod **`COMPOSITES`**:
   - **TREE** (KIND sub-buildery: spruce/oak/birch/palm/...)
   - **BUILDING** *(plánováno)* — domy, sklady, věže (KIND-style sub-buildery)
   - **ROCK_PIXEL**, **CLOUD**, **GRASS_TUFT** *(plánováno)*
   - Plus **VOXEL_MODEL** (= externí MV blob, opaque, multi-color)
   - Charakter: organické tvary, variabilita per instance, animace (`tree_sway`).

3. **Linie** *(plánováno)* — 1D křivky pro síťě. Pod **`LINES`**:
   - **PATH** (cesty, chodníky)
   - **TRACK** (železnice)
   - Implementace: polyline / spline, render jako tube nebo extrudovaný 2D shape.

4. **Objekty** *(plánováno, možná)* — entity, kde voxel jazyk nesedí (postavy, zvířata, stroje). Pod **`ASSETS`** nebo nová třída — TBD podle integrace sibling Stickman projektu.

**Důvod:** Aktuální DD-23 („Kostičky = jen voxely") fungoval dobře pro statické dekorace, ale zúžil identitu projektu na jednu vizuální vrstvu. Realita scény (Minecraft, Transport Tycoon, Factorio) má **více vrstev** s různými prioritami: terén je modulární a grid-aligned (Bloky), vegetace je organická (Voxely), cesty jsou 1D (Linie), entity jsou jedinečné (Objekty). Sjednocení do jedné vrstvy by porušilo SLAP — různé úkoly vyžadují různé jazyky.

Pixel-art identita zachována napříč všemi vrstvami: NearestFilter, 16×16 textury, voxely 0.125 j, sdílená paleta `:grass-top`/`:grass-side`/`:dirt`/`:stone`. To drží vizuální koherenci. *(Pozn. sez. 17: `:grass-side` smazán — pravidlo BLOCKS rodiny zjednodušeno na „vrch grass, jinak dirt".)*

**Důsledek:**
- Sez. 16 cleanup: VOXEL_MODEL `tunel-grass` (3×3×3 TC) nahrazen 2× `TTUNELS` (1×1×1 TC) na pozicích tunel_left a tunel_right; `ramp-grass` VOXEL_MODEL nahrazen `TRRAMPS` na rampě (-4, 0, 0). Asset soubory `tunel-grass.*` a `ramp-grass.*` smazány. Z VOXEL_MODEL použití zbývá jen `cube-grass.vox` šablona pro DD-24.
- DD-23 zůstává v immutable logu jako historický kontext; **revizováno** DD-25 v tom smyslu, že voxelová identita platí pro Voxely (vrstva 2), ne pro celou scénu.
- DD-24 (shape × surface) zůstává platný, ale **omezený rozsah**: pre-build skript se týkal VOXEL_MODELů s jednolitým povrchem. Po DD-25 jsou tyto bloky procedurální (TCUBES/TRRAMPS/TTRAMPS/TTUNELS), takže shape × surface jako asset pipeline je redundantní pro standardní bloky. DD-24 se může uplatnit pro budoucí komplexní VOXEL_MODELy (vrstva 4).
- Nová `BLOCKS` abstract třída v `model.js` — značkovací parent CCUBES/TCUBES/TRRAMPS/TTRAMPS/TTUNELS.
- Hover highlight (sez. 16) — emissive boost na celém objektu, lazy clone-on-first-hover materiálu (zachovává sdílení v TREE `_treeMatCache`).

## DD-26 — Sjednocená `ORIENTATION` napříč BLOCKS i COMPOSITES, float [0, 360) ve stupních

Jediný atribut `ORIENTATION` pro rotaci kolem Y osy napříč celou hierarchií CUBES potomků. Float ∈ [0, 360) ve **stupních**. Engine převádí: `mesh.rotation.y = ORIENTATION * (Math.PI / 180)`. Default 0 (= žádná rotace).

**Sjednocení:**
- `BLOCKS` base třída (TRRAMPS, TTRAMPS, TTUNELS) — dříve `ORIENTATION` integer enum 0..3 (= počet 90° CCW rotací). Migrace: stávající instance `ramp_0` z `1` → `90`.
- `COMPOSITES` base třída (TREE, GRASS_TUFT, ROCK_PIXEL, LOG, VOXEL_MODEL) — dříve `ROTATION_Y` (radiány) na LOG a VOXEL_MODEL, jinak žádná rotace na TREE/GRASS_TUFT/ROCK_PIXEL. Atribut `ROTATION_Y` smazán.
- Engine — `createTRRampFor` / `createTTRampFor` / `createTTunnelFor` z `* (π/2)` → `* (π/180)`. `createCompositeFor` aplikuje `group.rotation.y` uniformně z ORIENTATION pro všechny COMPOSITES potomky.

**Důvod:** Tři různé konvence (BLOCKS enum, LOG/VOXEL_MODEL radiány, plánovaná COMPOSITES float-stupně) by porušily izomorfismus (CLAUDE.md design principle: „podobné věci vypadají, ovládají se a působí podobně"). Stupně zvoleny před radiány kvůli **lidské čitelnosti** (90, 180, 270 vs. `Math.PI / 2`, `Math.PI`, atd.); model drží lidsky orientované hodnoty, engine převádí (DD-11 model/engine separation).

**Důsledek:**
- Constructor `BLOCKS` a `COMPOSITES` nově inicializují `this.ORIENTATION = 0` jako shared default.
- Konkrétní BLOCKS potomky (TRRAMPS/TTRAMPS/TTUNELS) přijímají `orientation` parametr v constructoru a přepisují default.
- Konkrétní COMPOSITES potomky bez `orientation` parametru — atribut se nastaví post-construction (idiomatic s `ANIMATE`, `SPEAKER`).
- `populateNorthernScene` přiřazuje každé dekoraci `instance.ORIENTATION = rng() * 360` → organičtější vzhled (žádné mřížkově stejně otočené stromy).

## DD-27 — PATH = první potomek vrstvy 3 LINES; Catmull-Rom spline + plochý strip mesh

Nová třída `PATH extends CUBES` (DD-25 vrstva 3) pro 1D křivky v krajině. Atributy `KIND` (string, default `"dirt"`) + `POINTS` (pole `[x, y, z]` kontrolních bodů ve world coords). Engine vytvoří **Catmull-Rom curve** (Three.js `CatmullRomCurve3`, type `catmullrom`, tension 0.5), navzorkuje 64×, a postaví plochý strip mesh: dva vertices na vzorek (levý/pravý okraj kolmé k tangentě v XZ rovině), trojúhelníky mezi sousedními vzorky. Šířka strip 0.5 j, Y offset +0.005 j nad terrain (proti z-fightingu).

Materiál: `MeshStandardMaterial` s repeating texturou (`:path-dirt` 8× podél délky). První KIND = `dirt` (kropenatý šum šedých kamínků 240 záplat 1-2 px). Plánováno: `stone`, `wood`.

**Catmull-Rom volba před Bezier:** křivka prochází všemi kontrolními body (= bod v `POINTS` je opravdu bod, kterým cesta vede), tangenty se odvozují automaticky z okolí. Bezier by vyžadoval explicitní tangent handles = 2× víc bodů na definici.

**Rovný směr v krajních bodech:** Three.js v non-closed Catmull-Rom curvách používá v krajních bodech reflexi sousedního, tj. tangenta v `P[0]` = `P[1] - P[0]`. Pokud první dva body mají stejné Z, tangenta je čistě podél X. Stejně tak na konci. Tj. **rovný vstup/výstup** se dosáhne mít prvních/posledních dvou bodů na stejné Z hodnotě (= rovný úsek cesty), ne přidávat virtuální anchor mimo trasu.

**Layout authoring:** PATH instance nemá smysluplnou X/Y/Z polohu (cesta žije v world coords); `super(...)` se volá s `(0, 0, 0)`. POINTS jsou jediný zdroj geometrie.

**Populate respektuje koridor cesty:** `pathOccupiedCells(points)` vzorkuje curve 128× a vrátí grid buňky (X, Z), které cesta protíná. `populateNorthernScene` přidá tyto buňky k `blocked` set → žádné stromy/kameny v cestě.

**Infotip POINTS:** speciální formátování ve `formatValue` — `(-3.5, -0.5, -3) → (0.5, -0.5, -1) → (4.5, -0.5, 1)` (uzávorkováno + šipky).

**Důsledek:** vrstva LINES (DD-25 vrstva 3) má první konkrétní implementaci. Až přijde druhý sourozenec (TRACK pro koleje), zvážit zavedení `LINES` abstract base třídy (analogicky s BLOCKS / COMPOSITES base).

## DD-28 — Sjednocená Y konvence per typ vizualizace (surface vs. grid-center)

`instance.Y` má **dvě sémantiky** podle typu vizualizace, sjednocené napříč hierarchií CUBES potomků:

- **Surface konvence** (= world Y top voxelu, na kterém entita stojí): platí pro **VOXEL_MODEL** a **pixel-voxel COMPOSITES** (TREE, GRASS_TUFT, ROCK_PIXEL, LOG). Engine zarovná spodek mesh-u přesně na `instance.Y`. Pro grass podlahu na grid `gy=-1` → `instance.Y = -0.5` (= world Y top of grass voxelu).
- **Grid-center konvence** (= world Y středu voxelu = grid souřadnice): platí pro **BLOCKS** (TCUBES, TRRAMPS, TTRAMPS, TTUNELS) — snap-to-int v rendereru posadí mesh center přesně na grid pozici. Pro 1C blok na grid `gy=0` → `instance.Y = 0`, mesh center na world Y=0, bottom na -0.5, top na +0.5.

**Pravidlo dispatche** podle typu:
| Třída / rodina | `instance.Y` semantics | Pro stojící na grass podlaze (gy=-1) |
|---|---|---|
| BLOCKS (CCUBES, TCUBES, TRRAMPS, TTRAMPS, TTUNELS) | grid Y voxelu (= mesh center) | `Y = 0` (1C blok nad podlahou) |
| VOXEL_MODEL | world Y surface (= mesh bottom) | `Y = -0.5` |
| Pixel-voxel COMPOSITES (TREE, GRASS_TUFT, ROCK_PIXEL, LOG) | world Y surface (= group origin) | `Y = -0.5` |
| SPRITES, PATH | world Y libovolný (free 3D space) | dle obsahu |

**Důvod:** BLOCKS jsou 1C grid-aligned bloky tvořící krajinu — mesh-center semantics odpovídá tomu, jak uživatel uvažuje („tento blok je ve sloupci gy=0"). Snap-to-int v rendereru (DD-12) tu konvenci automaticky vynucuje. Pro **dotvarbu** (vrstva 2 voxely + externí MV modely) je naopak přirozené říct „postav strom na surface" — mesh bottom = `instance.Y`.

Sez. 17 měl tři konvence (BLOCKS = grid, VOXEL_MODEL = surface, pixel-voxel = surface + 0.5) — pixel-voxel měl group origin posunutý o 0.5 nad surface kvůli `treeVoxel` lokálnímu offsetu `-0.5 + (gy + 0.5) * TREE_PX`. Sez. 18 cleanup: `treeVoxel` lokální Y zjednodušen na `(gy + 0.5) * TREE_PX` → group origin = surface, sjednoceno s VOXEL_MODEL. Populate `instY = t.y + 0.5` (ne `+1`).

**Důsledek:**
- DD-22 sekce o Y konvenci VOXEL_MODELu zůstává v platnosti, ale je teď **sub-konvencí** širšího pravidla DD-28 (surface platí pro celou vrstvu 2 + komplexní VOXEL_MODELy).
- Migrace pixel-voxel COMPOSITES instance.Y: každá instance posunutá o `-0.5` (`instY = t.y + 0.5` místo `+1`).
- Aktualizace `treeVoxel` (`src/main.js`): `-0.5 + (gy + 0.5) * TREE_PX` → `(gy + 0.5) * TREE_PX`. První voxel (gy=0) má bottom přesně na lokální Y=0.
- Komentáře v `treeVoxel` + `populateNorthernScene` aktualizovány.

## DD-29 — WORLD singleton: nevizuální OBJECTS-derived globální stav, atributy gated by konzument

`WORLD` je nevizuální OBJECTS-derived singleton pro globální stav scény — bez `X/Y/Z` (žije v modelu, ne v prostoru). První instance: `world` v `src/main.js`. Sez. 20.

**Atributy přibývají jen tehdy, když mají živého konzumenta** v engine. YAGNI sloty „pro budoucnost" nejsou povolené.

| Atribut | Default | Konzument | Stav |
|---|---|---|---|
| `WIND_STRENGTH` | `1.0` | `animateTreeSway` (násobí amplitudu) | aktivní (sez. 20) |
| `SUN_ANGLE` | — | (den/noc shader) | odložen (IDEAS) |
| `CLIMATE` | — | (biome populate) | odložen (IDEAS) |
| `SEASON` | — | (sezónní textury / vegetace) | odložen (IDEAS) |
| `DAY` | — | (časová animace) | odložen (IDEAS) |
| `WIND_DIRECTION` | — | (direction-aware sway) | odložen (`tree_sway` je izotropní) |

**Plochá struktura** (`WIND_STRENGTH`, ne nested `WIND.strength`) — generický infotip (DD-08) přes `Object.entries` zobrazí číslo přímo. Když se v budoucnu objeví druhý wind atribut (`WIND_DIRECTION`), pohlídá se konzistence (taky ploše: `WIND_DIRECTION`); refaktor na nested se vyplatí až při ≥3 atributech jedné kategorie.

**Důvod (DO/DROP rozhodnutí v sez. 20):** `tree_sway` má hardcoded amplitudu — globální regulátor je první přirozený „světový stav" a uvolní pattern pro další (až bude konzument). „Foundations before curtains" princip: model nezaplňovat dopředu. WORLD bez X/Y/Z **demonstruje hodnotu DD-01** (OBJECTS = cokoli v modelu, CUBES = cokoli s polohou) — singleton tu separaci ospravedlní.

**Důsledek:** nový `instanceof WORLD` dispatch v `registerBehavior` se zatím **nezavádí** — singleton žije jako modul-level konstanta. Pokud přibude druhá podobná entita (např. `CLIMATE_ZONES` registry), zvážit obecnější „registry singletons" pattern. Dev exposure přes `window.world` = jednorázová pragma pro test v konzoli.

## DD-30 — TheCubes pivot: 3D factory-observer toy, Voidspan jako inspirační referent

TheCubes přebírá identitu **3D analogie projektu Voidspan** (sourozenecký projekt v `~/source/Voidspan`): minimalistický model-first factory toy, jehož **cílem je pozorování** (sledování ukazatelů, účinnosti strojů, toku surovin), ne dosažení win-condition. Žádný narativ, žádné kolonisty, žádné HP. Sez. 21.

**Změna identity vůči předchozím sezením:**
- **Sez. 1–13** — model-first sandbox s ad-hoc COMPOSITES (BALLOON, TREE classic, CHARACTER).
- **Sez. 15 (DD-23)** — „Kostičky = jen voxely", smazány non-voxel třídy.
- **Sez. 16–17** — pixel-voxel apartmá (TREE 10 KIND, GRASS_TUFT, ROCK_PIXEL, LOG, populateNorthernScene, PATH).
- **Sez. 21 (toto DD)** — vizuální regrese na holé BLOCKS + nová **FACILITY** vrstva pro tick-based ekonomický loop. Pixel-voxel apartmá ze sez. 16–17 určen k cleanupu po stabilizaci nového modelu (fáze D, viz TODO).

**Vztah k Voidspanu (selektivní inspirace, ne dogma):**

Voidspan má ~25 sezení odsezených na herním a resource modelu — řadu konceptů má smysl převzít. **Filter je přísný** — TheCubes není sci-fi vesmírná kolonie:

| Z Voidspanu převzato (DD-31 nebo Phase 2) | Z Voidspanu odmítnuto |
|---|---|
| Resource jako data registry, ne třídy | 2D Belt/Segment topologie (3D vlastní svět) |
| Recipe matrix (inputs/outputs per tick) | Cosmology / lore / Colony Goal / kolonisté |
| Material gate (pauza při deficitu, čitelný důvod) | Protocol / QuarterMaster AI vrstva |
| Event Log s 4-znakovými verbs (PROD/HAUL/DRN/PAUS) | Status tree, Citizen tiers, Capsule |
| Module Specialization (malé multi = slabé, velké dedikované = silné) — Phase 2 | Coin / Credit měna |
| Resource Taxonomy (rarity 5 stupňů, logistics matrix S/F) — designový baseline | W (Work) jako resource (TIMER+tick stačí) |
| `formatScalar` pro UI čísla — Phase 2 | TypeScript / Phaser / pnpm stack (TheCubes zůstává vanilla JS + Three.js) |

**Důvod:** Po sez. 16–17 (pixel-voxel apartmá) projekt postrádá funkční smyčku — je to jen statická dioráma. „Hezky vypadá" je méně důležité než „je čitelný" (Factorio vs. Satisfactory). Convergence s Voidspanem dává TheCubes konečně účel (factory loop) a sourozeneckým projektům **sdílenou designovou DNA**, kterou lze stavět vzájemně.

**Důsledek:** Identita projektu se mění z „meta-sandbox s živým OOP modelem" na **„model-first factory-observer toy s OOP modelem jako runtime"**. Sandbox aspekt zůstává (editor MVP, free building), ale s konkrétní herní smyčkou. Pixel-voxel COMPOSITES (TREE 10 KIND, GRASS_TUFT, ROCK_PIXEL, LOG, populateNorthernScene, tree_sway) jsou v cleanup queue. `VOXEL_MODEL` zůstává jako kapability pro pozdější asset pipeline (pixel-art fasility z MagicaVoxelu).

## DD-31 — Resource model & FACILITY: 6 surovin, lokální buffery, fixed-KIND transformers

Nová vrstva v `OBJECTS → CUBES` hierarchii: **`FACILITY` rodina** (`GENERATOR`, `STORAGE`, `TRANSFORMER`) jako protějšek BLOCKS pro produkční ekonomiku. Sez. 21.

**MVP surovinový set (6, kategoricky pokrývá solid + fluid):**

| ID | CZ | EN | Kategorie | Zdroj (GENERATOR KIND) | Spotřebitel |
|---|---|---|---|---|---|
| `logs` | Klády | Logs | solid | `forest` | `sawmill` → `planks` |
| `planks` | Prkna | Planks | solid | (transformer output) | (sklad / budoucí stavba) |
| `stone` | Kámen | Stone | solid | `quarry` | `crusher` → `gravel` |
| `gravel` | Štěrk | Gravel | solid | (transformer output) | (sklad / budoucí beton) |
| `water` | Voda | Water | fluid | `well` | (sklad / budoucí recepty) |
| `coal` | Uhlí | Coal | solid | `coal_mine` | (sklad / budoucí recepty) |

Soviet Republic surovinový graph je referenční inspirace (https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Resources) — Phase 2 vlna doplní bricks/cement/steel a multi-input recepty.

**Resource jako data, ne třídy.** Modul-level registry `RESOURCES_DEF[id] = { name_cs, name_en, category, unit }`. Žádné `LOGS extends RESOURCE`.

**Lokální buffery per fasilita (model B, ne globální pool):**

Každá `FACILITY` instance má vlastní `BUFFER = { resource_id: amount }`. PATH skutečně přemisťuje units mezi buffery (ne dekoračně). Bottlenecks emergují přirozeně — plný output buffer pauzuje generátor („Les pauza — buffer plný"), prázdný input buffer pauzuje transformer („Pila pauza — chybí klády"). HUD agreguje globální totals přes `Σ buffer.contents napříč fasilitami`.

**Kapacity buffer per KIND** (konstanta v `FACILITY_DEF`, žádný per-instance UI tuning):
- Generátor output buffer: 50 ks (default)
- Transformer input/output buffery: 20 ks per slot
- Storage capacity: 200 ks (větší než ostatní = role „pufru sítě")

**Fixed-KIND transformers, ne data-driven recept atribut:**

Recept je odvozený od `KIND` (izomorfie s TREE.KIND / PATH.KIND / GRASS_TUFT.KIND). Editor vybírá `KIND`, ne recept:
- `sawmill` → `RECIPES_DEF["sawmill"]` = `{ inputs: {logs: 1}, outputs: {planks: 0.8}, rate_per_tick: 1.0 }`
- `crusher` → `RECIPES_DEF["crusher"]` = `{ inputs: {stone: 1}, outputs: {gravel: 1.2}, rate_per_tick: 0.8 }`

Multi-recipe transformer (jedna fasilita, switchable recept) = pozdější rozšíření, **kdyby vůbec**.

**PATH rozšíření (kanonizováno pro factory pipeline):**

Nový atribut `KIND` na `PATH`:
- `"conveyor"` — pevné suroviny (logs/planks/stone/gravel/coal), `THROUGHPUT = 2 ks/s` default
- `"pipeline"` — tekutiny (water), `THROUGHPUT = 5 L/s` default

Atributy `SOURCE`, `SINK` (instance ID references) — engine drén/dopis mezi buffery. PATH je teleport-per-tick (žádná animace cargo balíčků v MVP).

**Globální tick rate:** 1 wall sekunda = 1 tick. Existující `TIME.tick` (DD-04, dosud nepoužitý) konečně získá konzumenta. `productionTick()` v render loopu agreguje generators/transformers/paths. `WORLD.TIME_SCALE` (nový DD-29 konzument) škáluje rychlost simulace.

**Globální resources agregát** v `world.RESOURCES = { logs: 0, planks: 0, ... }` — derived z buffer sumy přes všechny fasility. Druhý živý konzument DD-29 (vedle `TIME_SCALE`). `WIND_STRENGTH` zůstává v DD-29, ale po smazání `tree_sway` (fáze D cleanup) ztratí konzumenta a migruje do IDEAS — sez. 20 práce se neanuluje, jen se její konzument retired.

**Hierarchie po DD-31:**

```
OBJECTS
 ├── CUBES (X, Y, Z)
 │    ├── BLOCKS (TCUBES, TRRAMPS, TTRAMPS, TTUNELS)
 │    ├── SPRITES
 │    ├── COMPOSITES (VOXEL_MODEL — TREE/GRASS_TUFT/ROCK_PIXEL/LOG v cleanup queue, DD-30 fáze D)
 │    ├── PATH (KIND, POINTS, SOURCE?, SINK?, THROUGHPUT)
 │    └── FACILITY (KIND, BUFFER)
 │         ├── GENERATOR  (vstup KIND ∈ "forest" | "quarry" | "well" | "coal_mine")
 │         ├── STORAGE    (vstup KIND ∈ "storage", HOLDS = filter resource_id whitelist)
 │         └── TRANSFORMER (vstup KIND ∈ "sawmill" | "crusher")
 ├── TIMER, COUNTER
 └── WORLD (WIND_STRENGTH, TIME_SCALE, RESOURCES)
```

**Důvod (zhuštěně):**
- Konkrétní suroviny dají TheCubes charakter, který kvintet (E/W/S/F/◎) postrádá.
- Lokální buffery dělají PATH herně relevantní (vs. globální pool, kde PATH je dekorativní).
- Fixed-KIND transformers udržují izomorfii s existujícím `KIND` paradigmatem.
- Material gate + Event Log = čitelný debugging a tamagotchi-feel.
- Tick = 1 wall s je dostatečně rychlý pro pozorování bez kavárenských čekání.

**Důsledek:**
- `model.js` přibude třída `FACILITY` + 3 potomci.
- `main.js` nový `productionTick()` v render loopu + `createMeshFor` dispatch.
- HUD: top bar 6 čítačů (Σ napříč fasilitami) + bottom bar event log ticker (5 posledních).
- Editor MVP (fáze C) = klik = paleta KIND + place, R-klik = delete, drag = PATH.
- `world.RESOURCES` + `world.TIME_SCALE` = silní konzumenti DD-29 (politika splněna).

**Otevřená rozhodnutí (do Phase 2):**
- Multi-input recepty (cement = gravel + water).
- Module Specialization Principle (1×1×1 pila slabá vs. 2×2×2 mega-pila silná).
- VOXEL_MODEL asset per fasilita (pixel-art „PILA" model místo placeholder TCUBES).
- Smazat TRRAMPS/TTRAMPS/TTUNELS, pokud factory toy nepotřebuje rampy a tunely (sentimentální vs. KISS, diskuse v sez. 24+ při fázi D).

## DD-32 — Identitní pivot: factory toy → terrain generator (sez. 24)

**Stav:** Sez. 21 nastartoval factory toy identity (DD-30), sez. 22–23 implementovaly fázi A + fázi B (model + tick + HUD + PATH transport). Sez. 24 (toto rozhodnutí) — user volí **„odstranit vše ze scény + vytvořit procedurální terrain generator s UI panelem parametrů"**. Pivot je vědomý.

**Rozhodnutí:**
1. **Factory toy se ruší v aktivním vývoji.** DD-30 + DD-31 zůstávají immutable jako historický záznam (Voidspan inspirace přijata a vyzkoušena, factory toy MVP doběhl sezení 21–23). `feat/factory` větev byla mergována do `main` (sez. 24 první akce, before this DD).
2. **Smaže se:**
   - Třídy `FACILITY` / `GENERATOR` / `TRANSFORMER` / `STORAGE` v `model.js`
   - Registry `RESOURCES_DEF` / `RECIPES_DEF` / `FACILITY_DEF` v `model.js`
   - PATH atributy `SOURCE` / `SINK` / `RESOURCE` / `THROUGHPUT` (PATH třída sama zůstává jako dekorativní spline)
   - Factory engine v `main.js`: `productionTick`, `pathTick`, `transferOnPath`, `aggregateResources`, `logEvent`, `renderEventLog`, `setPaused`
   - HUD elementy `#resources`, `#eventlog`, `#simctrl`
   - `world.RESOURCES` agregát; `world.TIME_SCALE` přežívá pro animátory (DD-29 konzument).
3. **Smaže se zároveň severská dioráma** (logicky následuje — terrain generator nahradí celý scene content):
   - `SCENE_LAYOUT` ploché pole (sez. 14 export z builderu)
   - `populateNorthernScene` + `topVoxelMap` + `mulberry32`
   - Tunely (`TTUNELS` instance), rampy (`TRRAMPS`, `TTRAMPS` instance), dekorativní cesta (`path_0`)
   - COMPOSITES TREE všechny KIND, GRASS_TUFT, ROCK_PIXEL, LOG (třídy + builders + materiál cache)
   - `tree_sway` animátor + `WIND_STRENGTH` (přesun do IDEAS jako budoucí konzument DD-29)
   - Procedurální `:grass-top` textura → plochá barva nebo MagicaVoxel asset (DD-24 surfaces)
4. **Co zůstává jako infrastruktura:**
   - `OBJECTS → CUBES` hierarchie, `BLOCKS` rodina (TCUBES, TRRAMPS, TTRAMPS, TTUNELS jako třídy — bez instancí ve scéně)
   - `WORLD` singleton (DD-29), `TIME` (DD-04), `TIMER` (DD-17), `COUNTER`
   - `ANIMATE` system (DD-15) + animátory `rotate` / `orbit_stadium` / `pulse` / `drift` (bez aktuálních klientů, ale připravené)
   - `PATH` třída sama (LINES vrstva, DD-25) — pro budoucí cesty mezi biomy
   - `VOXEL_MODEL` (DD-21) — MagicaVoxel pipeline pro budoucí dekoraci
   - Engine: `createMeshFor` dispatch, materiály, kamera, lights, shadows, hover infotip (DD-08), edge highlight, GridHelper / AxesHelper
5. **Nová identita projektu:** **procedurální terrain sandbox** — user nastavuje parametry (size, relief 0..10, surface mix grass/stone/sand/water, seed) přes UI panel, generátor produkuje 3D scénu z hierarchie modelu.

**Důvod:**
- Factory toy se ukázal jako pasivní pozorovatelské zařízení (DD-30 axiom „Perpetual Observer Simulation"), které nesplnilo psychologický cíl „čumět na vlaky" — user pivotal zpět k aktivní tvorbě (panel + parametry).
- Terrain generator je **bližší původní identitě „sandbox z kostek"** a využije plně existující infrastrukturu (BLOCKS rodina, materiály, engine).
- KISS + foundations before curtains: prázdná scéna + procedurální plnění je primárnější věc než materialgate visualizace na pile.

**Důsledek:**
- Sez. 24+ pracuje na větvi `feat/terrain` (vytvořena z `main` po merge `feat/factory`).
- `src/main.js` projde výraznou redukcí (~600–800 řádků méně po smazání factory + dioráma + dekorace).
- `src/model.js` projde redukcí (~150 řádků: FACILITY hierarchie, registry, PATH atributy).
- `src/terrain.js` (nový soubor) — `generateTerrain({ size, relief, surfaces, seed })` + value-noise engine.
- `index.html` — nový panel `#terrainctrl` (relief slider, size sliders, surface sliders, seed input, Generate button); odstranění factory HUD.
- README + CLAUDE.md aktualizace identity.
- Sezení dříve plánovaná pro fázi C (editor MVP) a fázi D (cleanup pixel-voxel apartmá) z DD-30 jsou zrušena nebo absorbována do terrain workflow.

**Otevřená rozhodnutí (do dalších DD):**
- `LIQUID` třída pro vodní plane(y)? (kandidát DD-33)
- Autogenerated TRRAMPS na step grass(y) → grass(y+1)? (kandidát DD-34)
- Procedural paths/tunely v generátoru (path finding přes heightmap)?

**Reference:**
- DD-30 (factory toy pivot, sez. 21) — superseded jen v *aktivním vývoji*, immutable jako historický záznam.
- DD-31 (resource model & FACILITY, sez. 21) — totéž.
- TODO sekce „Terrain generator" (sez. 24, zápis před tímto DD) — implementační plán.

## DD-33 — Ramp smoothing layer: TRRAMPS edge + TTRAMPS isolated diag peak

**Stav:** Sez. 26. Terrain generator vyrábí čtvercovou heightmapu — vznikají 1-voxel stepy mezi sousedními cells. Bez vyhlazení vypadá scéna „schodovitě". User: *„Bloky jsou hotové, nyní přibude vrstva vyhlazování pomocí korekce nerovností. Kde to jde, vyhladit!"*

**Rozhodnutí:** Krok 5 v `generateTerrain` produkuje **`ramps[]`** array — list ramp instancí, které vyhladí stepy. Per cell A spawn maximálně 1 ramp ve voxelu `(A.x, A.y_top + 1, A.z)`. Pravidla:

1. **TRRAMPS edge ramp** (klín, 1 přístupová hrana):
   - Předpoklad: A má **alespoň 1 direct vyšší souseda** (= step na té hraně).
   - Volba směru: **greedy criticality score** = počet alternativních nižších sousedů cílového B (mimo A). Nižší score → critical → vyšší priorita (= A je B's only access; jinde k B nelze vystoupit).
   - Tie-break preferenčního pořadí: N > E > S > W.
   - Skip: `highDirs.length === 2 protilehlé` (= úzký rokle N+S / E+W → ramp nepokrývá obě strany).

2. **TTRAMPS isolated diag peak** (jehlan, vyplňuje rohový voxel):
   - Předpoklad: A má **0 direct vyšších** + alespoň 1 diag corner +1 vyšší + oba direct sousedi rohu jsou na úrovni A.
   - **Není accessibility**: TTRAMPS apex je bodový vrchol — postava nedosáhne na vyšší top povrch (přechod přes bod nemá souvislou plochu).
   - Užitek: **estetické vyplnění rohového peakového voxelu** (1/6 voxelu vyplněn malým jehlanem místo holé hrany). Současně **0 nových odhalených svislých stěn** (3 vertikální faces jsou triangly, podloženy aktualním terénem).
   - Preferenční pořadí rohů: NE > NW > SE > SW.

3. **Compatibility filter** (2-pass): Ramp A→B s direct ramp na cellu B s **jinou orientací** → drop A (postava narazí do BACK/LEFT/RIGHT face ramp B). Multi-level stairway (A k W → B k W = stejná orient) je validní pokračování.

4. **Pravidlo Y modifier**: Vyšší souseda je `y_top === A.y_top + 1` (přesně 1 voxel). Větší rozdíly = cliff, zachované (feature pro relief 6+).

5. **Surface dědičnost**: SLOPE textura ramp dědí z vyššího cellu (B nebo B_diag), aby vrchol slope navazoval barvou na top povrch.

**Důvod:**
- Bez ramp smoothing jsou stepy ostře viditelné jako vertikální stěny. Vyhlazení redukuje plochu odhalených svislých stěn (= „kolaps vlnové funkce" zadání user sez. 26: minimalize svislé stěny + maximalize přístupy).
- TRRAMPS striktně dominuje pro 1-direct přístup (1 přístup + 1 zakrytá stěna). Greedy criticality = sub-optimální ale rozumný kompromis (globální optimum je NP-hard bipartite matching).
- TTRAMPS apex je sice nepřístupný, ale jeho přidání nevytvoří NOVÉ svislé stěny (= cleaner než alternativy pro isolated diag peak).

**Důsledek:**
- `src/terrain.js` krok 5 detekce + spawn (~80 řádků).
- `src/main.js` `createRampEdge` (TRRAMPS) + `createRampCorner` (TTRAMPS) builders + texture sety per surface (`RAMP_EDGE_TEXTURES`, `RAMP_CORNER_TEXTURES`).
- `spawnTerrain` smyčka přidá ramp instances do scény s `userData.terrain = true`.
- Sez. 26 smoke test default 10×10 relief 3 seed 42: **20 TRRAMPS + 7 TTRAMPS** (= ~27 ramp meshes nad existující heightmap).

**Otevřené body (kandidáty pro budoucí DD):**
- 2-voxel a větší stepy zůstávají hranaté (schodišťové vzory mimo MVP).
- 4-cell jámy (4 stěny vyšší) zůstávají hranaté.

**Reference:**
- DD-32 (terrain generator identity, sez. 24) — kontext.
- DD-26 (sjednocená ORIENTATION) — TRRAMPS/TTRAMPS rotace ve stupních.
- DD-35 (TDRAMP class, sez. 26) — třetí ramp typ pro 3-cell convex peak + L-shape.

## DD-34 — TRRAMPS/TTRAMPS empirické ORIENTATION mapování (sez. 26)

**Stav:** Sez. 26. Při implementaci DD-33 ramp algoritmu padly **3 oddělené orientation bugy**, které user empiricky chytil v 3D scéně. Tento DD zaznamenává finální korrespondenci mezi peak/edge direction a ORIENTATION hodnotou jako referenci.

**Pozadí:**
- TRRAMPS / TTRAMPS / TDRAMP geometrie v `src/main.js` používá **autorskou konvenci kde N = −Z** (TRRAMPS default high edge na `z = −0.5` = autorské „NORTH").
- `terrain.js` `NEIGHBORS` používá **opačnou konvenci kde N = +Z** (`{ dx: 0, dz: +1, name: "N" }`).
- Konvence se prokříží: terrain.js „N" = autorské „S" (+Z). ORIENTATION mapy musí kompenzovat.

**Finální mapování** (terrain.js konvence kde +Z = N):

```javascript
// TRRAMPS edge — high end (apex hrana) ve směru B (vyššího cellu):
const EDGE_ORIENT = { S: 0, W: 90, N: 180, E: 270 };

// TTRAMPS corner — apex (bod) ve směru peak rohu (sorted alfa klíč):
const CORNER_ORIENT = { SW: 0, NW: 90, EN: 180, ES: 270 };

// TDRAMP peak — peak roh (sorted alfa klíč, low corner opačně):
const TDRAMP_PEAK_ORIENT = { EN: 0, ES: 90, SW: 180, NW: 270 };
```

**Postup ověření:**
1. Default geometrie TRRAMPS má high edge na lokální `z = −0.5`. Pokud cíl B je terrain.js „N" (= +Z), high edge musí být na +Z → rotace +180° → ORIENTATION 180. ✓
2. Default TTRAMPS apex je lokálně `(-X, +Y, -Z)` = (-X, -Z) v terrain.js = sorted „SW" → ORIENTATION 0.
3. Default TDRAMP peak v5 je lokálně `(+X, +Y, +Z)` = (+X, +Z) v terrain.js = sorted „EN" → ORIENTATION 0. Low corner opačný = (-X, -Z) = „SW".

**Důvod (proč explicit DD):**
- Při sez. 26 padl 1 bug u EDGE_ORIENT (prohozené hodnoty o 180°, user „obdélníkové rampy otočené 0 180 st."), 1 bug u CORNER_ORIENT klíče („NE" → správně „EN" sorted alfa), 1 bug u TDRAMP_PEAK_ORIENT (rotováno o 90° navíc, user „TDRAMP otočit o 90 st. CCW").
- Empirická verifikace přes user feedback je pomalá (1 commit per bug). Centralizace mapování v 1 DD = zabraňuje opakování v dalších sezeních.

**Klíčový princip pro budoucí třídy:**
- Default geometrie v `main.js` používá autorskou konvenci N=-Z.
- `terrain.js` NEIGHBORS používá N=+Z.
- ORIENTATION mapování v `terrain.js` musí kompenzovat (typicky +180° proti naivní mapování).

**Reference:**
- DD-26 (sjednocená ORIENTATION, stupně, rotace okolo Y CCW shora).
- DD-33 (ramp smoothing layer) — konzument.
- DD-35 (TDRAMP class) — konzument.

## DD-35 — TDRAMP: diagonální rampa (klín bez 1 horního rohu, sez. 26)

**Stav:** Sez. 26. Pro **3-cell convex peak** (cell A má 2 sousední direct vyšší + diag corner mezi nimi vyšší) je TRRAMPS edge nedostatečný (pokryje 1 hranu, druhou nechá schod). Pro **L-shape** (2 sousední direct vyšší bez diag peaku) totéž. User návrh sez. 26: *„dá se přidat jediný nový druh TDRAMP (DoubleTriangle) rampy — čtvercová podstava, trojúhelníková horní podstava, lomená rampa tvořená dvěma trojúhelníky"*.

**Rozhodnutí:** Nová třída **`TDRAMP extends BLOCKS`** (sourozenec TRRAMPS / TTRAMPS / TTUNELS) — 1C blok s odříznutým 1 horním rohem.

**Geometrie:**
- 7 vrcholů: 4 dolní rohy (čtvercová podstava na Y=−0.5) + 3 horní rohy (jeden „low corner" je na Y=−0.5 místo Y=+0.5).
- 7 stěn:
  - **BOTTOM** — čtverec 1×1.
  - **TOP** — trojúhelník 3 corners na Y=+0.5 („horní podstava").
  - **SLOPE** — trojúhelník šikmý od low corner k diagonální hraně horního trojúhelníku („lomená rampa" sdílí lomenou hranu s TOP).
  - **WALL_FULL × 2** — 2 plné svislé stěny (peak side, opačně k low corner).
  - **WALL_TRI × 2** — 2 vertikální trojúhelníkové stěny (low corner side, chybí horní hrana).

**Texture atributy** (5 material groups):
- `TEXTURE_SLOPE`, `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_WALL_FULL`, `TEXTURE_WALL_TRI`.
- Severská konvence pro grass: SLOPE + TOP = `:grass-top`, ostatní = `:dirt`.
- Stone/sand: vše jednolitě.

**ORIENTATION** (DD-26 + DD-34): default 0 má **low corner v rohu (−X, −Z)** = terrain.js „SW" → peak v opačném rohu (+X, +Z) = „EN". Rotace přesune low corner:
- 0 → low SW, peak EN
- 90 → low NW, peak ES
- 180 → low EN, peak SW
- 270 → low ES, peak NW

**Use case detekce v algoritmu DD-33:**

**Stage 1: 3-cell convex peak** — A má 2 sousední direct vyšší + diag corner mezi nimi vyšší. TDRAMP s peakem v tom rohu pokryje:
- 2 přístupové hrany top tri (sdílené s top povrchy 2 vyšších direct sousedů).
- Diagonální peak corner (sdílený s top povrchu B_diag — apex BOD, kontinuální plocha).
- 2 svislé plochy (WALL_FULL × 2) zakryjí stepy E + S.

**Stage 2: L-shape** — A má 2 sousední direct vyšší bez diag peaku. TDRAMP s peakem v L-corner pokryje 2 přístupy a 2 stepy (apex je bod v „air" nad flat diag cell — vizuální koncentrátor, ne accessibility).

**Surface dědičnost**: prefer diag cell (pokud vyšší = 3-cell peak); jinak prvního vyššího direct souseda rohu.

**Důvod:**
- TDRAMP **strict-dominuje 1× TRRAMPS edge** pro 3-cell peak: 2 přístupy místo 1, 2 zakryté stěny místo 1.
- L-shape: 2 přístupy přes 1 mesh.
- Compromise: může vzniknout „double-tent" apex pár (2 TDRAMPs sdílí peak bod) — user sez. 26 akceptuje (vizuálně OK).

**Důsledek:**
- `src/model.js` nová třída TDRAMP (10 řádků).
- `src/main.js` `TDRAMP_GEOM_CACHE` (geometry s 7 faces, 5 material groups), `createTDRampFor`, dispatch v `createMeshFor`, `createRampDiagonal` + `RAMP_DIAGONAL_TEXTURES`.
- `src/terrain.js` 2-stage detekce v krok 5 (3-cell peak prio 1, L-shape prio 2). Edge case: shared apex dvojice obě dostanou TDRAMP (no dedup, user-confirmed).
- Sez. 26 smoke test default 10×10 relief 3 seed 42: **7 TDRAMPs** (1 3-cell peak ES `(-2,-2)`, 1 3-cell peak NW `(0,3)`, 5 L-shape: `(2,-2) (1,-1) (1,1) (2,2) (1,4)`).

**Otevřené body:**
- TDRAMP nemá compatibility check proti rampám sousedů (B_E, B_S). Pokud B_E má perpendikulární ramp, postava může narazit. Empirická validace ukáže potřebu.
- Performance při 30×30 pomalý — user feedback sez. 26 (TODO priority pro sez. 27).

**Reference:**
- DD-33 (ramp smoothing layer) — kontext, ramp detection algoritmus.
- DD-34 (orientation mapping) — TDRAMP_PEAK_ORIENT empirické hodnoty.
- DD-25 (4-vrstvá taxonomie scény) — TDRAMP přibyl do BLOCKS rodiny.

## DD-36 — TCUBES atlas pipeline: shared geometry + per-kind atlas material (sez. 28)

**Stav:** Sez. 28. Performance refactor na `feat/terrain-perf` větvi po user feedbacku sez. 26 *„30×30 vykreslování pomalé"* (FPS ~15). %THINK ze sez. 28 doporučil **diagnose first** přes performance HUD + `console.time` instrumenty — baseline 30×30 odhalil `tri/call ≈ 2` = `THREE.Mesh` s `material = [m0..m5]` rozsekal každý box na 6 material groups → **6× draw calls per box** (25k calls celkem). Refactor nahrazuje per-blok `material[6]` pole **shared `BoxGeometry` + per-kind atlas material** pro terrain TCUBES.

**Rozhodnutí:**

1. **`BLOCK_TEXTURES` (whitelist).** Per-kind mapa textur 4 terrain kindů (`grass`/`dirt`/`stone`/`sand`) z `src/main.js`. Kind v BLOCK_TEXTURES → fast path (atlas), jinak → slow path (původní material array).

2. **`getSharedAtlasBoxGeom()` lazy singleton.** Sdílená `BoxGeometry(1,1,1)` pro všechny terrain TCUBES s UVs přepsanými na 1/6-tice atlasu (face N → u ∈ [N/6, (N+1)/6]). 30×30 z ~5500 geometrií → 8.

3. **`getTcubesKindMaterial(kind)` cache.** Per-kind `_tcubesAtlasMatCache` Map. Atlas = 6 facelets (E/W/T/B/S/N) slepené horizontálně do `CanvasTexture` 96×16 px (`ATLAS_TILE_PX = 16`, shoda s `:named-texture` rozlišením). `NearestFilter` + `SRGBColorSpace` (parita s factory texturami).

4. **`createTCubeFor` fast/slow path dispatch.**
   - **Fast path** — `instance.NAME ∈ BLOCK_TEXTURES`: `new THREE.Mesh(sharedGeom, atlasMat)` = **1 draw call per box**.
   - **Slow path** — non-terrain (emoji demo boxy sez. 4): původní `material[6]` array zachován pro per-face emoji.

5. **`_faceMaterialCache` memoizace** (komplementární optimalizace). `Map<key, Material>` pro slow path + rampy — `:dirt` etc. faces sdílejí 1 material napříč všemi instancemi (~16k allocs → 4 unique materials).

6. **Perf HUD** (`#perf-hud`, permanent observability). Pravý horní roh, throttled 1×/s: FPS / calls / triangles / geometries / mat cache size. Není dev-only — projektová observability pro budoucí refactory.

**Důsledek (30×30 baseline → atlas):**

| metrika | před | po | změna |
|---|---|---|---|
| FPS | 15 | 92 | **6.1×** |
| draw calls | 25 106 | ~5 050 | 0.20× |
| geometries | ~5 500 | 8 | sdílená |
| spawnTerrain.blocks | 38.6 ms | 6.5 ms | 5.9× |
| regen total | 43 ms | 9 ms | 4.8× |

**Důvod (proč DD a ne jen perf tweak):**
- Změna architektonického kontraktu: TCUBES nadále **nedrží per-face material array per instance**, místo toho **sdílí material per kind**. Hover sez. 16 pattern (`Array.isArray(orig) ? orig.map(...) : orig.clone()`) automaticky přepíná pole↔single dispatch.
- Conceptual Integrity (CLAUDE.md): když se změní koncept (TCUBES rendering pipeline), aktualizuj všechny vrstvy. DD je vrstva.
- Sez. 28 původně `Žádný DD` — sez. 29 audit (Agent A nález #4) doporučil zápis. Akceptováno.

**Známá omezení (kandidáti future refactor):**
- **Atlas/slow-path texture-source divergence**: atlas builder volá `factory()` přímo (řádek 1975 main.js), slow path přes `_faceMaterialCache` — dvě různé textury pro stejný `:named-texture` (různé random patches). Vizuálně subtle, user pre-flight check sez. 29 *parita OK*. Fix trivial (shared registry texture-per-key), odložen.
- **Tile pattern uvnitř kindu**: všechny `:dirt` faces sdílejí 1 atlas/texturu → identicky vypadají. Trade-off za 6× FPS (pre-existing od `_faceMaterialCache` memoizace, ne specifický atlasu).
- **Rampy stále na slow path** s `material[N]` per instance (TRRAMPS 5 / TTRAMPS 4 / TDRAMP 5 / TTUNELS 4 faces) = ~1 200 calls @ 30×30 = 24 % celkem. Atlas pattern repeatovatelný — TODO sez. 29+ (`Příště` sez. 28).

**Reference:**
- DD-32 (terrain sandbox pivot) — kontext, scéna potřebuje 30×30 plynule.
- DD-25 (4-vrstvá taxonomie) — BLOCKS rodina, kde TCUBES žije.
- DD-14 (face material dispatch) — `faceMaterialFor` původní dispatch.
- Sez. 26 user feedback *„30×30 pomalé"* — trigger.

## DD-37 — InstancedMesh batch pipeline pro terrain (sez. 31)

**Stav:** Sez. 31. Pokračování DD-36 atlas pipeline po stress testu 100×100 (sez. 30): FPS **7**, 47 642 draw calls. Atlas (shared geom + per-kind material) eliminovala material-array fragmentaci na 1 draw call per Mesh, ale **1 `THREE.Mesh` = 1 draw call** zůstává neprůstřelnou hranicí. Refactor mergeuje N `Mesh` instancí stejného (geom, atlas material) páru do **1 `InstancedMesh`** = 1 draw call per batch. Pre-flight `%THINK` (sez. 31) zvážil 4 alternativy (InstancedMesh / BatchedMesh r167+ / web worker generace / mesh merge per cell) — InstancedMesh stable A.

**Rozhodnutí:**

1. **Batch klíč** `(geom_typ, surface)`:
   - `tcubes:<kind>` — TCUBES terrain (`grass`/`dirt`/`stone`/`sand`) × shared box geom.
   - `<ramp_type>:<surface>` — `trramps:grass`, `ttramps:stone`, `tdramp:sand`, ... × ramp geom cache.
   - Celkem ~13 batchů (4 TCUBES + 9 ramp = 3 typy × 3 surfaces). `mat: 7` v perf HUD = 4+3 active při default 30×30; 100×100 odhalí všech 13.
   - Water plane(y) zůstávají single-mesh (low count typically <10, regen levný).

2. **`_terrainBatches: Map<key, InstancedMesh>`.** Helpery:
   - `createTerrainBatch(key, geom, mat, capacity)` — alokuje `new THREE.InstancedMesh(geom, mat, capacity)` s `castShadow = receiveShadow = true`, `count = 0`, `userData.terrain = true`, `userData.instancesByIdx = []` (instanceId → modelInstance reverse map).
   - `pushInstanceToBatch(batch, instance, x, y, z, rotY)` — `setMatrixAt(idx, M4)` přes scratch `Matrix4.compose(pos, quat, scale)` (žádné per-instance allocations) + `setColorAt(idx, white)` (lazy alloc `instanceColor` při prvním zápisu).

3. **Spawn 3-pass.** `spawnTerrain(params)`:
   - **Pass 1** pre-count instancí per batch klíč.
   - **Pass 2** alokuj batchy s přesnou kapacitou.
   - **Pass 3** fill — pro každou cell v `terrain.blocks`/`ramps` push do správného batche.
   - **Flush** `instanceMatrix.needsUpdate = true` + `instanceColor.needsUpdate = true` per batch.

4. **`meshByInstance` discriminated union.** Mapa drží 2 tvary hodnot:
   - `{ batch, idx }` pro terrain (InstancedMesh).
   - `Object3D` pro non-terrain (PATH, SPRITES, slow-path TCUBES, water plane).
   - Polymorfní lookup: `if (ref.batch) { ... }` diskriminuje case bez explicit typeof.

5. **Hover přes `instanceColor` overbright.** Albedo multiplikace `setColorAt(idx, tint)` — emissive boost (DD-25 sez. 16 pattern) nepřenositelný do batche bez custom shader. **Trik:** `Float32Array` v `InstancedBufferAttribute` nemá clamp → values > 1.0 = overbright (`HOVER_TINT_COLOR = (1.6, 0.8, 0.2)`, sytá oranžová). Single-mesh hover (legacy lazy clone-on-first-hover) zachován pro non-terrain entity.

6. **Tooltip raycast.** `resolveInstanceFromHit(hit)` discriminated union:
   - `hit.object.isInstancedMesh` → `hit.object.userData.instancesByIdx[hit.instanceId]`.
   - Single Mesh → `hit.object.userData.instance`.

7. **Regen flow.** `regenerateScene(params)`:
   - Vyčisti `meshByInstance` z `batch.userData.instancesByIdx`.
   - `scene.remove(batch)` + `batch.dispose()` (uvolní `instanceMatrix` + `instanceColor` buffery; geom/mat sdílené singletony NEdisposovat).
   - `_terrainBatches.clear()`.
   - Water single-meshe filter `userData.terrain` (NE InstancedMesh) + `scene.remove`.
   - `spawnTerrain(params)`.

**Důsledek (seed 42):**

| metrika | 30×30 sez. 30 (atlas) | 30×30 sez. 31 (instanced) | 100×100 sez. 30 | 100×100 sez. 31 |
|---|---|---|---|---|
| FPS | 123 | ~140 (head-room) | **7** | **104** |
| draw calls | 4 290 | ~13 | 47 642 | **1 016** |
| triangles | ~49k | ~49k | 549 698 | 549 698 |
| geometries (`info.memory`) | 8 | 8 | 8 | 8 |
| `mat` (atlas cache size) | 7 | 7 | 7 | 13 |

**Důvod (proč DD a ne jen perf tweak):**
- Změna architektonického kontraktu: `createMeshFor` se pro terrain **nevolá** (spawn vede přímo do `pushInstanceToBatch`). Hover lookup, regen flow a tooltip raycast používají batch-aware codepath. Discriminated union v `meshByInstance` je trvalý structural shift, ne lokální optimalizace.
- Hover albedo overbright (1.6, 0.8, 0.2) je estetická regrese oproti emissive boost (DD-25 light-up look) — kompenzace **47k→1k draw call redukcí** byla user-accepted, ale je to vědomá změna feel.
- Conceptual Integrity (CLAUDE.md): když se změní rendering pipeline napříč všemi BLOCKS potomky, DD je vrstva, která to zachytí.

**Známá omezení:**
- **Frustum culling** — InstancedMesh má 1 bounding box pro celý batch → 100×100 vše vidí, 10×10 trochu plýtvání. Žádné per-instance culling bez custom shader.
- **Bez animátorů per-instance** — terrain blocks nemají `ANIMATE`, takže žádný driver per-frame mutuje instance matrix. Pokud někdy přibyde (e.g. floating ramp), bude třeba batch-aware animátor.
- **Slow-path TCUBES** (emoji demo `tbox_0001/0002` ze sez. 4) zůstávají single-mesh. `createMeshFor` + `_faceMaterialCache` zachován.
- **BatchedMesh r167+** by mohlo sloučit TCUBES + rampy do ~3 calls (per-instance geom). Three.js v projektu r160. Sledováno v IDEAS jako budoucí option.

**Reference:**
- DD-36 (TCUBES atlas pipeline) — kontext, sdílená geom + per-kind material.
- DD-25 (BLOCKS rodina) — pokrytí ramp typů.
- DD-26 (ORIENTATION) — rampy rotace v batchi přes `setMatrixAt(idx, M4)` s `Euler(0, rotY, 0)`.
- Sez. 30 stress test 100×100 — trigger (FPS 7, calls 47k).

## DD-38 — WORLD re-introduce: DAY + DAY_SPEED atributy se sun mesh / DirectionalLight konzumenty (sez. 32)

**Kontext:** Sez. 31 přidalo statický sun mesh a popisný komentář předjímal *„Až WORLD dostane TIME/SUN_ANGLE atribut..."*. DD-29 (sez. 20) zavedl WORLD jako *Light DO* s atributem `WIND_STRENGTH` (konzument `tree_sway`). DD-32 wipe v sez. 25 smazal `tree_sway`, čímž WORLD ztratil konzumenta; sez. 29 audit (F4) WORLD třídu úplně odebral jako prázdného singletona ("singleton bez konzumenta po DD-32 wipe"). DD-29 politika *"atribut přibude jen s živým konzumentem"* tedy donutila celé DO zaniknout, ne jen jeden atribut.

**Rozhodnutí sez. 32:**

1. **Re-introduce `WORLD extends OBJECTS`** v `model.js` se dvěma novými atributy:
   - `DAY ∈ [0, 1)` — fáze 24h cyklu (0 = východ, 0.25 = poledne, 0.5 = západ, 0.75 = půlnoc). Default 0.25 (poledne, scéna při bootu plně osvětlená).
   - `DAY_SPEED ∈ ℝ` — kolik cyklů za sekundu. Default **0** (paused). Engine v render loopu inkrementuje DAY o `dt * DAY_SPEED` s `% 1` modulo.

2. **Bez X/Y/Z** (zachování DD-01 separace vizuální/modelová entita — WORLD je čistě data, nemá pozici).

3. **Dva živí konzumenti:**
   - `DAY` → `sun.position` (DirectionalLight, dráha v rovině nakloněné `SUN_TILT = π/6` od svislice), `sun.intensity` (lerp `SUN_BASE_INTENSITY * max(0, sin α)` = noc tmavá), `sunMesh.position` (5× scale), `sunMesh.visible` (skryt pod horizontem).
   - `DAY_SPEED` → render loop auto-advance (`updateWorldTime(dt)`).

4. **Math pozice slunce** — plane EAST-UP s 30° náklonem k +Z (severní polokoule v létě):
   ```js
   const angle = world.DAY * TAU;  // 0..2π
   sun.position.set(
     SUN_DISTANCE * cos(angle),                       // X (východ-západ)
     SUN_DISTANCE * sin(angle) * cos(SUN_TILT),       // Y (výška)
     SUN_DISTANCE * sin(angle) * sin(SUN_TILT),       // Z (sezonní offset)
   );
   ```
   Důvod sklonu: bez něj je v poledne slunce v zenitu = stíny svislé = nevizuální. Sklon 30° drží stín i v poledne. Realistická sférická dráha s SEASON atributem = roadmap.

5. **`window.world` dev exposure** — settings panel API i console test čtou/mutují přes `window.world`.

6. **UI v `#settings` panelu** — 2 slidery (DAY 0..0.999 step 0.01, DAY_SPEED 0..0.1 step 0.001) + numerické labely. Wire skrz `window.settings.setDay(v) / setDaySpeed(v)`. `setSun(on)` z sez. 31 přepracován na `_sunUserVisible` flag, finální `sunMesh.visible = _sunUserVisible && sun.position.y > 0`.

**Důvod (proč DD a ne jen feature):**
- Re-introduce WORLD po cleanup je strukturální (DD-29 doktrína "minimum life") — politika zůstává platná, jen jí přibyly dva noví konzumenti.
- DAY je první časový atribut v projektu mimo `TIME` singleton (`src/time.js`). DD definuje, kde se "čas dne" žije (WORLD), oproti diskrétnímu tikání (TIME).
- Sun direction se přesune ze statického `sun.position.set(-10, 8, 10)` na render-loop derivaci — všechny ostatní efekty závislé na světle (stíny, post-process) přijdou na nový kontrakt "světlo se mění každý frame".

**Známá omezení:**
- **Sklon `SUN_TILT` fixed** — nelze měnit přes WORLD (žádný `SEASON` atribut). Realistická sférická dráha s ročními obdobími = roadmap (`SEASON` atribut s konzumentem `updateSun`).
- **Sky/ambient barva konstantní** — `SKY_COLOR` + `sceneFog` se nemění s DAY. Sunset/úsvit nuance out of scope sez. 32.
- **Slider DAY v UI vs. auto-advance** — když `DAY_SPEED > 0`, slider drží user-input value, ale `world.DAY` se hned přepíše. UX dělba: pauzuj (speed = 0) pro ladění DAY, pusť (speed > 0) pro auto. Bez sync sliderem z value (drahé per-frame DOM write).
- **Shadow frustum reactive jen na size** (sez. 30) — při pohybu slunce může stín "uskočit" na okraji frustumu. Risk marginální, frustum je dostatečně široký.

**Reference:**
- DD-29 (sez. 20) — původní zavedení WORLD jako *Light DO*; politika "atribut přibude jen s živým konzumentem" zachována.
- DD-01 (sez. 1) — separace vizuální/modelová entita; WORLD bez X/Y/Z je její demonstrace.
- Sez. 29 (`feat/audit-29-cleanup` F4) — odstranění WORLD jako prázdného singletona. Tato DD ho vrací s 2 atributy + 2 konzumenty.
- Sez. 31 — sun mesh + post-process (DOF/fog) — kontext, který tuto DD motivoval.

## DD-39 — Atmospheric lerping: scene.background + fog.color + ambientLight.intensity reactive na world.DAY (sez. 33)

**Kontext:** DD-38 (sez. 32) zavedl `world.DAY` a stmíval `DirectionalLight.intensity` (sun) podle daylight curve. Ale `AmbientLight 0.15` zůstával konstantní, `scene.background` = `SKY_COLOR` konstantní, `scene.fog.color` = `SKY_COLOR` konstantní. Důsledek: i v noci (`sin(2π·DAY) ≤ 0`, sun off) **scéna stále vidět** přes ambient fill light + viditelné modré nebe + fog blend. User: *„Co svítí v noci za světlo? Proč je stále vidět?"* — DD-38 follow-up TODO bod `Sky/ambient color lerping` (sez. 33 pruning) se stal aktuální.

**Rozhodnutí sez. 33:**

1. **`updateAtmosphere()`** nová funkce v `main.js` po `updateSun()`, volaná v render loopu hned po něm. Per-frame lerp **3 cílů** podle stejné `daylight` curve jako `updateSun()` (DRY):
   ```js
   const daylight = Math.max(0, Math.sin(world.DAY * TAU));
   scene.background.lerpColors(_skyNight, _skyDay, daylight);
   sceneFog.color.copy(scene.background);
   ambientLight.intensity = AMBIENT_NIGHT + (AMBIENT_DAY - AMBIENT_NIGHT) * daylight;
   ```

2. **2 keypointy** — KISS (sunset oranžový peak roadmap):
   - `_skyDay = THREE.Color(0x1a1a2e)` — tmavě modrofialová (poledne, beze změny od sez. 31).
   - `_skyNight = THREE.Color(0x000000)` — úplná čerň (po user iteraci 0x05080f → 0x010207 → 0x000000).
   - `AMBIENT_DAY = 0.15`, `AMBIENT_NIGHT = 0.005` — téměř 0 (po user iteraci 0.04 → 0.015 → 0.005).

3. **Lineární lerp `lerpColors(c1, c2, alpha)`** — Three.js zapisuje do `this` instance, žádná alokace per-frame. `scene.background.lerpColors(...)` mutuje existující Color objekt, fog.color.copy() reuse pattern.

4. **Driver = `max(0, sin(2π·DAY))`** — symetrický s `updateSun()` intensity. Půlnoc (DAY=0.75, sin=−1) → daylight=0. Poledne (DAY=0.25, sin=1) → daylight=1. Sunrise/sunset (DAY=0/0.5, sin=0) → daylight=0. Sun-tilt curve (`sin α * cos(SUN_TILT)`) zvažována, zamítnuta — symetrie se sun.intensity je důležitější než match na sun-mesh visibility.

5. **`ambientLight` reference** — z inline `scene.add(new THREE.AmbientLight(0xffffff, 0.15))` převedena na proměnnou `const ambientLight = ...; scene.add(ambientLight)` pro per-frame mutaci. Initial `AMBIENT_DAY` (placeholder, `updateAtmosphere()` přepíše první frame).

6. **`scene.background` z `SKY_COLOR` konstanty na `THREE.Color()` instance** — placeholder `scene.background = new THREE.Color().copy(_skyDay)`, `updateAtmosphere()` přepisuje per-frame.

**Důvod (proč DD a ne jen feature):**
- Třetí konzument DD-38 `world.DAY` — politika "atribut s živým konzumentem" zachována, ale **rozšiřuje** kontrakt: DAY teď řídí 1 sun position + 1 sun intensity + 3 atmospheric values.
- Definuje pattern *„atmospheric helper po `updateSun()`"* — pokud kdy přibude další atmospheric efekt (cloud cover, weather, …), patří sem.
- `lerpColors`/`copy` per-frame bez alokace — performance kontrakt (žádný GC tlak na atmospheric layer).

**Známá omezení:**
- **Jen 2 keypointy** — sunset/sunrise oranžová není peakována, jen lineární lerp mezi den a noc. Realistická obloha má `_skyDusk` peak kolem `daylight ≈ 0`, piecewise lerp. Roadmap TODO.
- **AMBIENT_NIGHT = 0.005** — noc téměř úplně černá. Bez lampy (DD-40) je scéna nevizuální. Cílem je *„noc tmavá, lampy svítí"* — dramatický kontrast. Pokud kdy vznikne potřeba "noc viditelná bez lamp" (Měsíc), zvedne se ambient nebo přibude `MoonLight` jako 2. DirectionalLight.
- **Žádný sezónní offset** — sklon `SUN_TILT` fixed v DD-38, tj. ambient curve symetrická kolem poledne i v zimě. SEASON atribut na WORLD = roadmap.

**Reference:**
- DD-38 (sez. 32) — zavedení `world.DAY` + `world.DAY_SPEED`, sun.intensity konzument. Tato DD doplňuje atmospheric layer.
- DD-29 (sez. 20) — politika "atribut s živým konzumentem". `DAY` zde rozšiřuje rozsah konzumentů (sun + atmosphere).
- Sez. 33 — TODO bod `Sky/ambient color lerping` (přidaný v dnešním pruningu) → DONE.

## DD-40 — LAMP třída + SpotLight pattern: první lokální dynamický light (sez. 33)

**Kontext:** DD-39 zavedl noc skoro úplně černou (`AMBIENT_NIGHT = 0.005`). Pro vizuální dramatický kontrast user požádal lampu na `(-3, 0, 0)`, *„ať to vynikne"*. Doposud projekt měl jen 2 globální lights — `DirectionalLight` sun (DD-29/38) + `AmbientLight` fill. **Lokální** dynamický light (PointLight / SpotLight) je nový precedent.

**Rozhodnutí sez. 33:**

1. **`LAMP extends COMPOSITES`** v `model.js` — značkovací třída bez vlastních atributů (zdědí `ORIENTATION` z DD-26 pro rotaci kolem Y). Builder hard-coduje voxely a SpotLight.

2. **`buildLamp(instance)`** v `main.js` — Victorian-style pouliční lampa:
   - **Sloup** 0.15×2×0.15 dark iron (`0x1a1a1a`, roughness 0.7).
   - **Horizontální paže** 0.6×0.08×0.08 z vrcholu sloupu (X=+0.3 střed, Y=1.95).
   - **Visící stínítko** 0.35×0.3×0.35 z konce paže (X=0.6, Y=1.7), tmavé venku + emissive `0xffaa00 emissiveIntensity 0.8` (svítí vlastním jasem i ve dne).
   - **`SpotLight(0xffaa00, intensity=5, distance=12, angle=π/5, penumbra=0.4, decay=2)`** pozice (0.6, 1.7, 0), `castShadow=true`, shadow 512×512 cube map, near 0.1, far 14, `bias=-0.002`.
   - **`SpotLight.target = Object3D`** v Group s position `(0.6, -3, 0)` → vertikální dolů. Target je v Group → rotuje s `ORIENTATION` ale vertikalita zachována (Y rotace nemění Y offset).
   - Group position + rotation set z `instance.X/Y/Z` + `THREE.MathUtils.degToRad(instance.ORIENTATION)`.

3. **Dispatch v `createMeshFor`** — `else if (instance instanceof LAMP) { object3d = buildLamp(instance); }` před SPRITES větev.

4. **`noShadow` pattern pro mesh okolo světla** — stínítko obsahuje SpotLight uvnitř. Kdyby `shade.castShadow = true`, stínítko by blokovalo vlastní paprsky (světelný bod uvnitř shadow casteru → tma na všechny strany). Fix: `shade.userData.noShadow = true` — opt-out z `createMeshFor` traverze. **Generalizovatelný pattern:** každý mesh, který obsahuje (nebo se ho doteká) lokální light, musí `noShadow`. Sloup ne (stojí pod světlem, ne uvnitř něj — stín od sloupku směrem dolů je žádoucí).

5. **SpotLight místo PointLight** — první iterace měla PointLight (360°). User: *„Pod lampou je stín, udělej ji směrovou."* PointLight + sloup = sloup blokuje paprsky dolů → tma pod lampou. SpotLight (kuželové) míří jen dolů; sloup je nahoru/strana z origin = mimo kužel. Plus pouliční lampa realistická.

6. **Lampa instancována pro test, pak odebrána ze scény** — třída + builder + dispatch zachovány v kódu pro budoucí spawn (z TODO/script/editor). Sez. 33 nesplnila *„lampa permanentní"*, ale demonstrovala pattern.

**Důvod (proč DD a ne jen feature):**
- První **lokální dynamický light** v projektu — předtím jen globální `DirectionalLight` sun + `AmbientLight`. Vznik nového kontraktu "light jako součást COMPOSITES" otevírá pole pro budoucí lampy / signální světla / projektory.
- Pattern *„světelný zdroj uvnitř meshe → mesh `noShadow`"* je generalizovatelný a stojí za zapsání. Bez něj by každá další lampa měla bug *„světlo nedosvítí ven"*.
- `SpotLight.target` v Group → rotace s ORIENTATION → pattern reusable pro budoucí směrová světla (reflektory, projektory, neonové nápisy).
- Shadow setup pro lokální light (512×512 cube map, near/far, bias) = baseline parametry pro budoucí lokální lights. Pro ~10+ lamp ve scéně bude potřeba shadow budget management (selektivně castShadow off).

**Známá omezení:**
- **Shadow per PointLight/SpotLight je drahý** — cube shadow map render každý frame. 1 lampa OK, 10+ lamp ve scéně už hit. Mitigation: `castShadow = false` na sekundárních lampách (jen primární jednu).
- **`emissive` materiál stínítka neemittuje skutečné světlo** — je to jen "self-glow" textura. Skutečný zdroj je `SpotLight` uvnitř. Pokud uživatel chce lampu *„aniž by svítila na okolí, jen se sama leskla"*, vyhodit `SpotLight` a nechat jen emissive (cheap).
- **`SpotLight.target` v Group musí být `scene.add(target)` ekvivalent** — Three.js používá `target.matrixWorld`. V Group s `add(target)` Three.js auto-updateuje child matrices, takže funguje. Pokud někdy hledáme target s `scene.getObjectById()`, dohledat ve specifické Group.
- **`.glb`/glTF asset import není** — DD-40 zůstává voxelový. PBR Street Props pack ze sez. 33 user inspirace zachycena v TODO M8+ `.glb import pipeline` jako kandidát budoucího DD.

**Reference:**
- DD-26 (sez. 17) — `ORIENTATION` na COMPOSITES, LAMP zdědí. SpotLight.target v Group rotuje s ORIENTATION.
- DD-29 (sez. 20) — politika "minimum life". LAMP třída má builder a dispatch i bez aktivní instance ve scéně, protože je generalizovatelný typ.
- DD-39 (sez. 33) — atmospheric noc maxed (AMBIENT_NIGHT 0.005). Motivuje LAMP jako vizuální payoff v noci.
- Sez. 33 — first iteration PointLight, user feedback → SpotLight upgrade. Kontext v `docs/diary/2026-05-13.md` (B) Bod 1 a (G) SpotLight upgrade.

## DD-41 — Lowpoly vertex-color pipeline (supersede DD-36 atlas, sez. 34)

**Stav:** Sez. 34. Roadmap kapitoly Terrain generator G0 "Totální předělávka zobrazení bloků a ramp". Inspirace `jasonkneen/tiny-world-builder` (Three.js r128, `MeshLambertMaterial`, sdílený material registry, tilt-shift). %THINK ze sez. 34 zvážil 3 alternativy (A vertex colors + 1 global mat / B per-kind solid material / C atlas s 1×1 solid color textures), A jednoznačně vyhrál (KISS + řeší tile pattern dluh + připravuje G3 climate-driven barvy).

**Rozhodnutí:**

1. **`BLOCK_COLORS` paleta.** Per-kind 3-key mapa (TOP / BOTTOM / SIDE) v `src/main.js`. Severská konvence (sez. 17) zachována: grass má jen vrch zelený, ostatní homogenní s mírně tmavšími sides/bottom (mikroshade rozdíl mezi sousedy). 4 kindy (grass/dirt/stone/sand). Hodnoty jako data, ne textury → snadno ladit za běhu (bez CanvasTexture rebuildu).

2. **Sdílený `_lowpolyMat`.** Jeden `THREE.MeshLambertMaterial({ vertexColors: true })` napříč **všemi** terrain batchi (4 TCUBES + 9 ramp = 13 batch klíčů). Lambert = diffuse-only, bez PBR specular highlight (lepší fit pro neotexturované voxely než Standard). `flatShading: false` (default) — záměrně NE flat shading, viz pozn. 5 níže.

3. **`getTcubesKindGeom(kind)` — per-kind BoxGeometry s vertex colors.** Cache `_lowpolyBoxGeomCache: Map<kind, BoxGeometry>`. BoxGeometry má 24 vertices (4 per face × 6 faces), pořadí faces +X/−X/+Y/−Y/+Z/−Z (Three.js default). Per-face všechny 4 vertices dostanou stejnou barvu (solid face). Vertex colors v linear space (renderer výstup SRGB → `convertSRGBToLinear()` per kanál).

4. **`getRampGeom(type, surface)` — per (typ, surface) ramp geom s vertex colors.** Klonuje atlas IIFE (TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE) jako raw geom source, stripuje UV attribute, inject color attribute z `BLOCK_COLORS[surface]` + `RAMP_FACE_PALETTE_KEYS[type]` mapy (TOP/BOTTOM/SIDE per face index). 3 typy × 3 surfaces = max 9 cached geomů. TDRAMP SLOPE+TOP sdílí `.TOP` (lomený povrch).

5. **`flatShading: false` (pozn. ke G0 user fix).** Atlas BoxGeometry i ramp BufferGeometries už mají per-face normály v `geometry.attributes.normal` (vertices nesdílené přes faces) → flat look vzniká z geometrie samotné. `flatShading: true` na materiálu nutí shader spočítat normálu z `dFdx/dFdy` derivatives v fragment shaderu — u **InstancedMesh** na hraně mezi 2 sousedními instancemi normála drifuje (cross-instance precision artifact), vznikají tenké šedé/černé seam linky mezi sousedními voxely. Při nižší intenzitě světla (DD-39 night) kontrast roste, artifact je výrazněji vidět. Drop `flatShading: true` → shader používá pre-baked normály z geom, bez derivative computation, bez seam.

6. **Cleanup — smazáno:** `BLOCK_TEXTURES`, `ATLAS_TILE_PX`, `ATLAS_FACE_KEYS`, `_sharedAtlasBoxGeom`, `getSharedAtlasBoxGeom`, `_tcubesAtlasMatCache`, `getTcubesKindMaterial`, `RAMP_EDGE_TEXTURES`, `RAMP_CORNER_TEXTURES`, `RAMP_DIAGONAL_TEXTURES`, `RAMP_SURFACE_FROM_KIND`, `RAMP_ATLAS_SPECS`, `_rampsAtlasMatCache`, `getRampAtlasMaterial`, `createTRRampFor`, `createTTRampFor`, `createTDRampFor`, `createMeshFor` dispatch case pro `TRRAMPS`/`TTRAMPS`/`TDRAMP`. **`createTCubeFor` slow-path** (per-face material array) **smazán** — TCUBES po G0 jen lowpoly fast-path nebo šachovnice fallback (DD-07 unknown kind). `TEXTURE_*` fields + `textures` constructor arg smazány z TCUBES/TRRAMPS/TTRAMPS/TDRAMP v `src/model.js` (TTUNELS si je zachovává — mimo G0 scope).

7. **DD-37 InstancedMesh batche zachovány.** Batch klíč `tcubes:<kind>` / `<ramp_type>:<surface>` beze změny, jen `mat` je teď shared singleton místo per-batch atlas mat. Hover overbright přes `instanceColor` (DD-37 trik s overbright tint > 1.0) funguje **multiplikativně přes vertex colors** v shaderu.

**Důsledek:**

| metrika | DD-36 atlas (sez. 33) | DD-41 lowpoly (sez. 34) | změna |
|---|---|---|---|
| 100×100 FPS | 104 | 101 | parita (statisticky stejné) |
| draw calls | ~13 | ~13 | identické (DD-37 batche stable) |
| materials | 4 TCUBES + 9 ramp atlas = 13 | 1 sdílený | −12 |
| geometries | 1 BoxGeom shared + 3 ramp typy = 4 | 4 TCUBES BoxGeoms + 9 ramp BufferGeoms = 13 | +9 (cena za vertex colors data v geomu) |
| LOC | atlas builders + texture tabulky ~ 250 ř. | BLOCK_COLORS + lowpoly funkce ~ 130 ř. | −120 ř. |
| visual | pixel-art tile pattern uvnitř kindu | solid color flat shading, žádný tile | DD-36 known limitation resolved |

**Důvod (proč DD a ne jen refactor):**

- Změna architektonického kontraktu: terrain TCUBES + rampy už **nedrží texture data** (žádné `BLOCK_TEXTURES` ani `RAMP_*_TEXTURES`), místo toho mají **per-face barvy v geomu**. Constructor signature 4 BLOCKS tříd změněn (drop `textures` arg).
- Conceptual Integrity (CLAUDE.md): když se změní koncept (terrain rendering pipeline), aktualizuj všechny vrstvy — model.js, main.js, dokumentace. DD je vrstva.
- Připravuje G3 (climate-driven biome barvy): barvy v `BLOCK_COLORS` mapě = data, drivable per `world.CLIMATE` (refactor v G2/G3 výhodný).
- Eliminuje DD-36 známá omezení: tile pattern uvnitř kindu (F5 sez. 32 jen částečný fix), atlas/slow-path texture-source divergence (smazány obě cesty).

**Známá omezení (kandidáti future refactor):**

- Atlas IIFE `TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE` zachovány jako raw geom source pro `getRampGeom` clone (drop UV + add color). IIFE pořád builduje `uv` attribute + `remapU` UV transformace — zbytečný compute (~50 ř.), KISS keep. Cleanup nice-to-have: strip UV at source + rename IIFE na `_RAMP_RAW_GEOM_*`. Sub-prah.
- TTUNELS si zachovává starou atlas pipeline (per-face `TEXTURE_*` + `faceMaterialFor` array) — TTUNELS instance dnes nikdo nespawne. Cleanup follow-up: bud migrate na vertex colors, nebo úplně smazat (dead code). Sub-prah.

**Reference:**

- DD-36 (sez. 28) — TCUBES atlas pipeline. **Supersedes** by DD-41 (atlas → lowpoly).
- DD-37 (sez. 31) — InstancedMesh batche. Zachovány, batch klíč beze změny.
- DD-25 (sez. 16) — 4-vrstvá taxonomie. Hover pattern `instanceColor` overbright (DD-37 ext.) funguje s vertex colors multiplikativně.
- DD-07 (sez. 3) — CCUBES default šachovnice. Po DD-41 fallback pro unknown TCUBES kind (jinak lowpoly geom).
- Sez. 34 user feedback `tiny-world-builder` GitHub inspirace + flat-shading seam fix. Kontext v `docs/diary/2026-05-13.md` Sez. 34 (B) %THINK G0 + (F) seam fix.

## DD-42 — WORLD Climate atributy (LATITUDE × HUMIDITY) + sun tilt driver (sez. 35)

**Stav:** Sez. 35. Roadmap kapitoly Terrain generator G2 "Severní šířka / podnební pásmo". Aktivuje DD-29 odložený `CLIMATE` atribut, ale rozšiřuje na **2 atributy** (matice 4×3 = 12 biomů, inspirace skutečnou geografií Země: pásmo × vlhkost). User návrh sez. 35 `A1` matice biomů (Tropický deštný prales / Savana / Sahara / ... / Tundra / Ledová poušť).

**Rozhodnutí:**

1. **`world.LATITUDE` enum string** — 4 hodnoty: `tropical`, `subtropical`, `temperate`, `polar`. Default `temperate` (parita s DD-38 původním fixed `SUN_TILT = π/6` = 30° = mírné pásmo). Atribut na `WORLD` instanci, ploché pojmenování (DD-29 izomorfismus s `WIND_STRENGTH`/`DAY`).

2. **`world.HUMIDITY` enum string** — 3 hodnoty: `wet`, `mid`, `dry`. Default `mid`. Druhá osa biome matice. G2 MVP konzument: jen UI biome readout (display-only). G3 plánovaný konzument: `surfaces` mix lookup (driver-derived místo UI prop).

3. **`SUN_TILT_BY_LATITUDE` lookup map v `src/main.js`.** Replace DD-38 fixed `SUN_TILT = π/6`:
   - `tropical: 0` (sun přímo overhead v poledne; trade-off — žádné stíny v poledne)
   - `subtropical: π/12` (15°)
   - `temperate: π/6` (30°, parita DD-38)
   - `polar: π/3` (60°, sun nízko nad horizontem celý den)
   `updateSun()` per-frame čte `SUN_TILT_BY_LATITUDE[world.LATITUDE]` (fallback temperate při neznámém klíči — defensive proti console mutaci).

4. **`BIOME_NAMES` tabulka 4×3 v `src/terrain.js`.** Display jména biomů pro UI readout (12 buněk, plus polar/wet = "—" placeholder, geo edge case bez downstream selhání). Export přes `window.BIOME_NAMES` pro inline UI controller v `index.html`. Refactor pro G3: přidat surface mix vrstvu nad biome jména.

5. **UI Climate sekce v `#terrainctrl`** — 2 slidery diskrétní (LATITUDE 0..3, HUMIDITY 0..2, step 1) + biome readout (tyrkysový akcent — derivovaný atribut, read-only). Mutuje WORLD atributy přes `window.settings.setLatitude/setHumidity` na `input` event (live, no regen — sun tilt změny viditelné per-frame v `updateSun()`). G3 přidá `change` event regen pro surface mix.

**Důvod (proč DD a ne jen feature):**

- Aktivuje DD-29 odložený slot `CLIMATE` (politika: atribut s živým konzumentem). G2 splňuje 2 konzumenty: sun tilt (LATITUDE) + UI biome readout (LATITUDE×HUMIDITY).
- Mění semantic kontrakt `SUN_TILT` z fixed konstanty na driver-derived lookup (DD-38 supersede pro tilt math, DAY math zachován až do DD-43).
- Připravuje G3 surface mix refactor — `BIOME_NAMES` tabulka je SSoT pro biomy, G3 přidá `BIOME_SURFACES` paralelní tabulku (driver `surfaces` z biomu místo UI prop).
- Conceptual Integrity (CLAUDE.md): WORLD atributy gated by konzument (DD-29) — G2 dodržuje politiku, žádné YAGNI sloty.

**Známá omezení:**

- Polar/Wet biome je geograficky vzácný (málo srážek na pólech) — UI zobrazí `"—"`. G3 musí rozhodnout fallback (Tundra? Validation error?). Sub-prah TODO.
- `tropical: 0` tilt = žádné stíny v poledne. Vizuálně 3D objekty vypadají ploše (light from above, plane shadow degenerate). User-driven kompromis (fyzikálně OK pro rovník, vizuálně suboptimal).
- HUMIDITY zatím bez konzumenta nad UI readout (G2 MVP). Reálný terraineffect (vlhkost = více vodních cell, sucho = více sand) přijde až v G3.
- Climate slidery v `#terrainctrl` panelu — **nereagují na `change` event regen** (G2 jen mutuje WORLD). Architectural choice: Climate je WORLD atribut (jako DAY/DAY_SPEED), patří semantically spíš do `#settings` panelu, ale geographic význam (terrain config) ho přitahuje k terrainctrl. G3 z toho udělá terrain regen prop, takže umístění retroaktivně dává smysl.

**Reference:**

- DD-29 (sez. 20) — WORLD singleton politika "atribut s živým konzumentem". G2 aktivuje `CLIMATE` slot (rozšířeno na 2 atributy LATITUDE+HUMIDITY).
- DD-38 (sez. 32) — WORLD DAY/DAY_SPEED + fixed `SUN_TILT = π/6`. G2 supersede tilt math (DAY math řeší DD-43).
- DD-41 (sez. 34) — Lowpoly vertex-color pipeline. G3 plánovaný refactor `BLOCK_COLORS` na driver-derived per biome.
- Roadmap kapitoly Terrain generator (sez. 30+ TODO) — G1 (sez. 35 quick win), G2 (sez. 35 tato DD), G3 (driver-derived `surfaces` per biome, future).

## DD-43 — DAY mapping standardizace 0.5 = poledne (supersede DD-38 sun position math, sez. 35)

**Stav:** Sez. 35. User feedback při G2 návrhu: *„Výška Slunce bude závislá na A1. Jinak DAY=0.5 by mělo být poledne, ne?"* — DD-38 původní mapping `0=východ, 0.25=poledne, 0.5=západ, 0.75=půlnoc` (matematicky úsporné — `sin(2π·DAY)` přímo dává intensity křivku) byl prakticky matoucí pro user-facing slider (intuice 24h cyklu = 0:00 půlnoc, 12:00 = poledne = uprostřed cyklu).

**Rozhodnutí:**

1. **Nové DAY mapping konvence:** `0=půlnoc, 0.25=východ, 0.5=poledne, 0.75=západ`. Default `world.DAY = 0.5` (poledne, scéna při bootu plně osvětlená — parita s DD-38 use case).

2. **`updateSun()` math fix.** Sun position parametrizace:
   - X (horizont E-W): `SUN_DISTANCE * sin(α)` *(původně `cos(α)`)*
   - Y (výška): `SUN_DISTANCE * (-cos(α)) * cos(tilt)` *(původně `sin(α) * cos(tilt)`)*
   - Z (hloubka N-S, polar tilt): `SUN_DISTANCE * (-cos(α)) * sin(tilt)` *(původně `sin(α) * sin(tilt)`)*

   Mapping verifikace:
   - DAY=0.0 (půlnoc): `sin=0, -cos=-1` → sun pod horizontem, intensity=0 ✓
   - DAY=0.25 (východ): `sin=+1, -cos=0` → sun na +X horizontu (Y=0) ✓
   - DAY=0.5 (poledne): `sin=0, -cos=+1` → sun v zenithu (Y=cos(tilt)·dist) ✓
   - DAY=0.75 (západ): `sin=-1, -cos=0` → sun na −X horizontu (Y=0) ✓

3. **`updateAtmosphere()` daylight křivka.** `Math.max(0, Math.sin(world.DAY * TAU))` → `Math.max(0, -Math.cos(world.DAY * TAU))`. Stejný posun jako `updateSun()` (DRY — sun intensity i daylight sdílejí křivku).

4. **HTML default sync.** `<input id="set-day" value="0.25">` → `value="0.5"`. Span readout `0.25` → `0.50`.

5. **WORLD constructor default sync.** `this.DAY = 0.25` → `this.DAY = 0.5`. JSDoc updated s novou konvencí.

**Důvod (proč DD a ne jen bug fix):**

- Mění **user-facing semantiku** WORLD atributu. DD-38 explicitně dokumentoval `0=východ, 0.25=poledne, ...` — DD-43 to mění. Immutable log politika: nové DD pro change, staré DD-38 zachováno jako historický kontext.
- DD-38 mělo "matematicky úsporné" mapping (`sin(2π·DAY)` přímo bez fázového posunu) — KISS sice, ale **proti intuici** uživatele. KISS pro engine ≠ KISS pro user-facing slider. DD-43 prioritizuje user-facing intuici nad code economy (1 minus znaménko = trivial cena).
- Připravuje konzistentní bázi pro G2 LATITUDE-driven sun tilt (DD-42) — sun math by se měla měnit jen kvůli LATITUDE, ne kvůli phase mapping.

**Známá omezení:**

- Drift z DD-38 base: pokud někdo měl bookmarknutý URL parameter / save state s `DAY=0.25` (sez. 32-34), po DD-43 to znamená "východ" místo "poledne" (4× tmavší). Žádný persistence layer aktuálně neexistuje (settings panel default sync = pouze HTML inline `value`).
- Historický kontext DD-38 sun position math (původní `sin/cos` parametrizace) zachován jen v immutable diary (sez. 32) + DD-38 textu — kód v `updateSun()` ho už neukazuje.

**Reference:**

- DD-38 (sez. 32) — WORLD DAY/DAY_SPEED + sun position math `sin(2π·DAY)`. **Supersedes** by DD-43 sun position math (atributy DAY/DAY_SPEED + driver pattern zachovány).
- DD-39 (sez. 33) — atmospheric lerping. `daylight` křivka v `updateAtmosphere()` updated stejnou změnou (DRY s `updateSun()`).
- DD-42 (sez. 35) — G2 Climate. DAY-mapping fix vznikl při G2 návrhu jako pre-G2 micro-fix (sun-related koherence před LATITUDE → sun tilt).
- Sez. 35 user feedback A2. Kontext v `docs/diary/2026-05-13.md` Sez. 35.

## DD-44 — G3 SURFACES driver-derived per biome (hard override, sez. 36)

**Stav:** Sez. 36. Pokračování G2 (DD-42): `BIOME_NAMES` 4×3 tabulka byla nakreslená v UI readoutu, ale **bez druhého konzumenta** — surface mix v `generateTerrain` byl pořád určen 4 UI slidery (z DD-32 sez. 25–26), které neznají biome. UI legálně dovolil "Sahara s 0.8 grass" = nesoulad mezi popiskem biome a vygenerovaným terénem.

**Rozhodnutí:**

1. **`BIOME_SURFACES[LATITUDE][HUMIDITY]` lookup** v `src/terrain.js` — 4×3 tabulka 12 buněk × 4 koef. (`grass`/`stone`/`sand`/`water`, sum=1.0). Hardcoded čísla (ne parametric formula), 12 řádků kódu. Per-cell ladění zachovává výrazovou volnost (Tropický prales ≠ Vlhké subtropy množstvím vody).

2. **Helper `surfacesForBiome(lat, hum)`** — bezpečný lookup s fallback na `temperate.mid` při neznámém klíči (defensive, `world.LATITUDE/HUMIDITY` jsou controlled enum přes UI).

3. **Hard override v UI** (varianta A z `%THINK`):
   - Surface DOM sekce v `#terrainctrl` **smazána** (4 slidery + auto-normalize). Žádný "Manual surfaces" toggle.
   - Climate slidery (`tc-latitude`, `tc-humidity`): `change` event triggeruje `regenerateScene(readParams())`. `input` event nadále mutuje WORLD atributy per-frame (sun tilt + biome readout = G2 chování).
   - `readParams()` dohnají surfaces z aktuálních Climate sliderů přes `window.surfacesForBiome(latKey, humKey)`.
   - Debug surface mix přes konzoli: `window.regenerateScene({ size:[...], relief:..., seed:..., surfaces: {...} })`.

4. **Polar/wet fallback** (varianta A z `%THINK`): `BIOME_SURFACES.polar.wet = polar.mid` alias (Arktická tundra geografi nejbližší). `BIOME_NAMES.polar.wet` rename z `"—"` na `"Polární tundra"` — transparent fallback, ne mystery placeholder.

5. **`TERRAIN_DEFAULTS` cleanup** v `main.js`: hardcoded `surfaces: {...}` odstraněn. `buildScene()` derivuje surfaces z `world.LATITUDE/HUMIDITY` při bootu (`surfacesForBiome(world.LATITUDE, world.HUMIDITY)`).

**Důvod (proč DD a ne jen feature):**

- Mění **user-facing UI flow** — surface slidery zmizely, jediný způsob volby surface mixu je přes Climate. Změna kontraktu mezi UI a generátorem.
- **Izomorfismus s G2 sun tilt** — Climate driver je teď *vždy* zdroj pravdy pro climate-derived atributy (sun tilt i surfaces), bez "manual mode" výjimek. KISS + conceptual integrity.
- **Aktivuje DD-29 odložený `CLIMATE` slot** plně — DD-42 popsalo G3 jako "budoucí konzument", DD-44 ho realizuje.
- Předjímá hierarchii budoucích driver-derived atributů (G4 vegetation density per biome, G5 weather, …) — pattern "WORLD enum → lookup table → generator input" se ukáže opakovaně.

**Známá omezení:**

- `sand` v `polar.*` buňkách (zejména "Polární tundra", "Tundra", "Ledová poušť") je **proxy pro sníh** — vizuálně to vypadá jako poušť. G4 kandidát: přidat `snow` surface kind (klon `grass-top` s bílou paletou) + migrate `polar.*` z `sand` na `snow`. Sub-prah TODO. Mezitím akceptováno.
- Surface stav uložený v UI mezi sezeními (browser autofill `value` na surface sliderech) **ztracený** — surface slidery v DOM už neexistují. Per-session UI state se stejně neukládá (žádný persistence layer).
- 12 hodnot tabulky je ladění-citlivé — pokud user řekne "Tropický prales by měl mít víc vody", změna je per-cell v `BIOME_SURFACES` (žádná formula k tweaknutí globálně). To je záměr (per-cell volnost > parametric DRY).

**Reference:**

- DD-29 (sez. 19) — odložený WORLD `CLIMATE` slot. DD-42 zavedl atributy, DD-44 přidává druhého konzumenta (vedle sun tilt).
- DD-42 (sez. 35) — G2 WORLD Climate atributy + `BIOME_NAMES` tabulka. DD-44 přidává `BIOME_SURFACES` paralelní strukturu.
- DD-32 (sez. 25) — `generateTerrain` API. DD-44 ne-mění API (surfaces parametr zachován), jen *kdo* ho vyplňuje (driver místo UI sliderů).
- Sez. 26 — surface sliders + `normalizeSurfaces()` zavedení v `#terrainctrl`. DD-44 je odstraňuje (immutable historie zachována v DIARY).
- Sez. 36 user volby: Q1=A (hard override), Q2=A (Tundra alias), Q3=A (schválená tabulka), Q4=A (snow sub-prah TODO). Kontext v `docs/diary/2026-05-13.md` Sez. 36.

## DD-45 — fBm + ridge³ blend heightmap (D varianta, sez. 36)

**Stav:** Sez. 36 (topic branch `feat/terrain-noise`). User feedback po G3 dokončení: *„50×50 relief 7 → je to náhodný, neprostupný šum. Nešlo by vytvořit vysoké štíty / úseky horských hřebenů s údolími?"* Diagnóza: dnešní `generateTerrain` (DD-32) má **1 oktávu** value-noise s `RELIEF_FREQUENCY[7] = 0.55` → 28 noise uzlů přes 50 cells = ~1.8 cell per uzel × full amp 5 = "high-freq high-amp noise" = vrchovinný šum, ne hory.

**Rozhodnutí:**

1. **fBm (fractal Brownian motion) — 3 oktávy** v `heightNoise` sample path. `fbmSample(noiseFn, x, z)` sečte 3 oktávy s decreasing amp (persistence 0.5) a increasing freq (lacunarity 2.0), pak normalize děli `1 + 0.5 + 0.25 = 1.75`. Multi-scale: velké útvary (base freq) + střední (2× freq) + jemné detaily (4× freq).

2. **Ridge transformace `1 - |2v - 1|` + cubed** (= ridge³). Invertuje bublaté peaks na ostré hřebeny. Cubed verze (`r³`) zúží peaks ještě ostřeji než `r²` (E ≈ 0.25 vs. 0.33) — peaks vzácné, údolí dominantní. Sez. 36 měření: ridge² mělo 58 % cells na top 2 úrovních (plateau), ridge³ snížilo na 53 % a roztáhlo range na 5 úrovní (vs. 4).

3. **Blend dle reliefu — `ridgeWeight = max(0, (relief - 4) / 4)`:**
   - relief 0-4 (Flat..Hilly): ridgeWeight = 0 → pure fBm, organické kulaté kopce.
   - relief 5 (Uneven): 25 % ridge.
   - relief 6 (Rugged): 50 % blend.
   - relief 7-8 (Craggy/Mountainous): 75-100 % ridge = horské hřebeny.
   Formula: `blended = (1 - rw) * fbmVal + rw * ridge³(fbmVal)`.

4. **`RELIEF_AMPLITUDE` + `RELIEF_FREQUENCY` retune:**
   - **Amp** beze změny pro idx 0-7 (zachová `maxReliefForSize` UX — 50×50 dál dovolí relief 7). Idx 8 (Alpine) zvýšen 6→8 (full-ridge peaks na 100×100 mapě snesou vyšší vrcholy bez disproporce, 8/100 = 8 %).
   - **Freq** dramaticky nižší pro high relief (idx 6-8: 0.45/0.55/0.65 → 0.18/0.15/0.12) — velké hřebeny místo drobných štítů. Pro low relief mírně nižší (idx 1-5) protože fBm horní oktávy zmnoží freq automaticky (base 0.16 → efektivní detaily 0.64 přes lacunarity²).

5. **`generateTerrain` API nezměněno** — `{ size, relief, surfaces, seed }` zůstává. Změna je čistě interní (algoritmus heightmap sample). Backward compatibility pro existující seed × relief × size kombinace **se mění** (různý výstup), ale tohle je očekávaný side effect kvality upgradu (žádný persistence layer ovlivněn).

**Důvod (proč DD a ne jen feature):**

- **Algoritmická změna heightmap generátoru** — mění chování všech existujících seedů + reliefů. Reprodukovatelnost přes seed je broken cross-version (sez. 35 seed 42 ≠ sez. 36 seed 42 vizuálně).
- Immutable log důležitý — pokud někdy budeme srovnávat sez. 35 (1-okt value noise) vs. sez. 36 (fBm + ridge³) referenční scény, DD-45 dává sémantiku.
- fBm je **standard pattern** v procedural terrain (Perlin, Ken Musgrave atd.) — DD-44 je benchmark, ne novelty.
- Otevírá ridge-friendly RELIEF tuning prostor pro budoucí iterace (G5 candidate: threshold-based "hřebeny + údolí" generator pro skutečně bimodální dist).

**Známá omezení:**

- **Single-peak distribuce, ne bimodální.** Ridge³ snížil plateau dominanci, ale výstup je pořád roughly Gaussian kolem mean. Pro skutečně bimodální "hřebeny + údolí" (mass na extremes, málo uprostřed) by bylo nutné **threshold step** generátor (`fbm < 0.5 ? -1 : amp`) nebo **dual noise** (continent mask + ridge detail) — G5 kandidát po user feedback. Sub-prah TODO zapsán.
- **50×50 + relief 7 vyžaduje vizuální test** — histogram (range -1..4, peak Y=3 30 %) je *lepší než dnes* (range 0..4, plateau Y=4 58 %), ale ne sloužící "ostré horské hřebeny" feel. Pokud user feedback bude "lepší ale ne ideální", G5 step approach je další iterace.
- **Cena CPU:** 3 noise lookupy per cell (fBm) + 1 (biome) = 4× lookups. Pro 100×100 = 40k lookupů, zanedbatelné vůči ridge smoothing pass (Pass 1+2 = ~10k cell ops). Generace 50×50 zůstává <10 ms.
- **`Math.round` clustering kolem mean** je inherentní pro low-amp relief (relief 5 amp 3 = jen 4 unique Y úrovně). Pro relief 0-4 to není problém (rolling hills nemají benefit od mnoha úrovní); pro relief 5+ je fBm distribuce rozšířena ale **round** ji binuje. Sub-prah: experiment s `Math.floor` (lower bias) pokud relief 5-6 vypadají jako plateau.

**Reference:**

- DD-32 (sez. 25) — `generateTerrain` MVP s 1-okt value-noise. DD-45 mění **interní algoritmus** (krok 1 heightmap), `generateTerrain` API beze změny.
- DD-33 / DD-34 / DD-35 (sez. 26) — ramp smoothing layer reaguje na heightmap (`y_top` distribuci). Vyšší variabilita heightu = víc step-edges = víc ramp kandidátů. Test 100×100 r10 ukázal **5238 ramps** (vs. sez. 35 cca 3500 odhad) — ramp smoothing škáluje lineárně.
- DD-44 (sez. 36) — G3 SURFACES driver. DD-45 ne-koliduje (driver pro `surfaces`, fBm pro `height`).
- Sez. 36 user feedback po G3: konkrétní case 50×50 r7. Q1=D (fBm + ridge blend), Q2=A (G3 commit + nová branch), Q3=A (DD-45). Kontext v `docs/diary/2026-05-13.md` Sez. 36 pokračování.

## DD-46 — Smoothstep bimodální heightmap pro high relief (G5, sez. 37)

**Stav:** Sez. 37 (topic branch `feat/terrain-bimodal`). User feedback po DD-45 vizuálním testu (46×47 r6 seed 42 polar/wet): *„Je to mnohem lepší. Šum ustoupil. Vznik hřebenů a údolí! Ale ještě bych to posílil."* Diagnóza: DD-45 ridge³ blend dává **single-peak distribuci** (right-skewed kolem mean), ne bimodální. User wish „hřebeny + údolí" je definičně bimodální = dvě hladiny (peaks, valleys) s plynulým přechodem mezi nimi.

**Rozhodnutí:**

1. **Smoothstep mapping pro high relief** — pro `relief ≥ 6` se DD-45 ridge³ blend nahrazuje:
   ```js
   t = smoothstep(0.4, 0.6, fbmVal)         // [0, 1] s C¹ okraji
   blended = VALLEY_AMP + (amplitude - VALLEY_AMP) * t
   h = round(blended)
   ```
   Smoothstep formula `3t² - 2t³` mimo range klampuje (v ≤ 0.4 → t=0, v ≥ 0.6 → t=1). Bimodální tvar: 60 % cells skončí v plné extrémitě (valley nebo peak), 40 % v transition.

2. **VALLEY_AMP = −1** — jeden voxel pod sea level. Při wet biome (HUMIDITY=wet) se voda nalije do údolí (water surface offset −2 = jámy dole). Maximalizuje kontrast hřebeny vs. údolí.

3. **Smoothstep range (0.4, 0.6)** — úzký interval pro výrazný bimodal efekt. Širší range (0.3, 0.7) by dal smoother transition, ale uživatel požadoval *posílit*. Úzký range = jasné dvě hladiny.

4. **Hard switch při relief ≥ 6** — pod prahem (r0-5) DD-45 ridge³ blend zůstává beze změny. Důvod: r0-4 (Flat..Hilly) je doména „rolling hills" kde bimodal nemá smysl (organické kulaté tvary žádané). R5 (Uneven) je tranzitorní (25 % ridge), zachování ridge³ tam dává jemnou hřebenovitost. Od r6 (Rugged) se přepne na *fundamentálně jiný režim* = horský landscape.

5. **PEAK_AMP = `RELIEF_AMPLITUDE[idx]`** — peaks dosáhnou plné max výšky pro daný relief (r6=4, r7=5, r8=8). Beze změny vs. DD-45 (zachová UX `maxReliefForSize` clamp).

6. **API beze změny** — `generateTerrain({size, relief, surfaces, seed})` zůstává. Změna je interní (heightmap loop body). Backward compatibility pro existující seed × relief × size se **mění** pro r ≥ 6 (různý výstup); r0-5 zůstává byte-identický s DD-45.

**Důvod (proč DD a ne jen feature):**

- **Fundamentální změna distribuce** pro high relief — single-peak (DD-45) → bimodal (DD-46). Sémantika hřebenů a údolí jiná.
- Immutable log: pokud budeme srovnávat referenční scény „DD-45 ridge³" vs. „DD-46 smoothstep bimodal" (test scény, regression), DD-46 dává sémantiku.
- Smoothstep + threshold je **standard pattern** pro biomial generative dist (Inigo Quilez articles, Ken Musgrave terrain). DD-46 implementuje branch literatury.
- DD-46 supersede sub-prah TODO „bimodální heightmap (G5)" zapsaný v DD-45 Známá omezení. Sub-prah uzavřen.

**Smoke test (sez. 37):**

| Case | r | size | dist (top peaks) |
|------|---|------|-------------------|
| User case polar/wet seed 42 | 6 | 46×47 | Y=−1: 34 % (valley) \| Y=4: 18 % (peak) \| Y=1: 6 % (min) — bimodal ✓ |
| Polar/wet 50×50 | 7 | 50×50 | Y=−1: 29 % (valley) \| Y=5: 19 % (peak) \| Y=1: 7 % (min) — bimodal ✓ |
| Alpine temperate/mid 100×100 | 10 | 100×100 | Y=−1: 39 % (valley) \| Y=8: 24 % (peak) — bimodal ✓ |
| **Regrese** r3 10×10 | 3 | 10×10 | Y=−1: 67 %, Y=1: 32 % — beze změny vs. DD-45 ✓ |
| **Regrese** r5 30×30 | 5 | 30×30 | Y=−1: 14 %, Y=1: 38 %, Y=2: 47 % — beze změny vs. DD-45 ✓ |

**Známá omezení:**

- **Y=0 typicky chybí** v bimodal výstupu — smoothstep klampuje hodnoty fbm < 0.4 a fbm > 0.6 na extrémy (Y=VALLEY_AMP nebo Y=PEAK_AMP), takže Y=0 dostane jen úzký interval t ∈ ~[0.1, 0.3]. Vizuálně to ale není problém — bimodal characteristics = „chybějící střed" je definice. Pro user wish „posílit hřebeny+údolí" žádaná featura, ne bug.
- **Hard switch r5→r6** může být vizuálně skokový — r5 ridge³ blend (rolling+hřebeny) vs. r6 bimodal (jámy+vrcholy). Plynulý morph (alternativa B v %THINK) by zmírnil, ale za cenu navíc parametru. KISS: hard switch + dokumentace.
- **Smoothstep range hard-coded** (0.4, 0.6) — pro fine-tuning by bylo nutné parametrizovat. Aktuálně out-of-scope (KISS). Pokud user feedback bude „moc agresivní" nebo „málo agresivní", lze rozšířit RELIEF tabulky o per-relief smoothstep range.
- **Bimodal je „symmetric"** — VALLEY_AMP=−1 a PEAK_AMP=amplitude nesymetrické (rozsah `[-1, amp]`, větší amp → větší side). Pro r6 (amp 4) rozsah 5 jednotek = peak side 4× větší než valley side. To posune *mean* k peak; histogram USER case to ukazuje (Y=4: 18 %, Y=3: 13 %, Y=2: 11 %) — peak side se rozprostře přes víc úrovní než valley side (Y=−1: 34 %, Y=−2: 14 %, Y=−3: 4 %).

**Reference:**

- DD-45 (sez. 36) — fBm + ridge³ blend. DD-46 **přepíše** heightmap loop pro relief ≥ 6, ale **nezmění** fBm sample path (`fbmSample` helper použitý oba režimy). DD-45 sub-prah „bimodální heightmap (G5)" uzavřen.
- DD-32 (sez. 25) — `generateTerrain` MVP. DD-46 mění interní algoritmus krok 1 heightmap; API i ostatní kroky (biome, ramp smoothing) nezměněny.
- DD-44 (sez. 36) — G3 SURFACES driver. DD-46 ne-koliduje. Polar/wet biome (sand-heavy + voda) dostane v DD-46 výrazná údolí s vodou + skalnaté hřebeny = tundra/horská tundra look.
- Sez. 37 user volba: Q1=D (G5 smoothstep bimodální), Q2=A (hard switch r≥6), Q3=A (VALLEY_AMP=−1), Q4=A (range 0.4-0.6). Kontext v `docs/diary/2026-05-13.md` Sezení 37.

## DD-47 — Climate-driven surface state: snow + drop water + LIQUID prototype (G6, sez. 38)

**Stav:** Sez. 38 (single-instance, postupně 4 commit-worthy bloky bez topic branch). User feedback po DD-46: *„Voda ve všech skupenstvích…"* IDEAS sez. 37 raw nápad → konkrétní plán sez. 38 (snow + jezera/řeky + led, mraky/srážky odloženy). Plus sez. 38 `%AUDIT:CODE` (9/8 prah, 3 sezení bez auditu) zachytil docs drift K1/K2/D1/D3/D4 (audit cleanup pre-feature).

**Rozhodnutí:**

1. **Drop `water` surface kind.** `SURFACE_Y_OFFSET` 4 → 3 (drop `water: -2`). `BIOME_SURFACES` 12 řádků: water sloupec smazán, % přerozděleno (fertile biomy → grass, polar → stone+sand). `generateTerrain` drop topKind dirt-pod-water trick + water plane spawn. Důvod: surface kind je vrstvenost (na zemi leží), voda je vyplňující entita (vyplňuje topologii) — sémantický mismatch (DD-44 surfaces × DD-32 water plane patternu).

2. **Snow distribution per LATITUDE** (`snowSpecForLatitude(latitude)` helper):
   - `polar` → všechny cells snowed.
   - `temperate` → cells s `y_top >= 6` vždy + **sort+rank top 30 %** zbylých cells dle `score = snowNoise(x,z) + altNorm × 0.3`. Izomorfie s biome assignment v Kroku 2 (sort+threshold) — zachová stochastickou 30 % plochu, jen ji shift k vyšším cells.
   - `tropical` / `subtropical` → žádný sníh.
3. **Snow implementace.** `BLOCK_COLORS` rozšířen 4 → 8 (`_snow` varianta na TOP=`0xf5f5f5` off-white, BOTTOM/SIDE base). Top voxel kindu dostane `_snow` postfix při `c.snowed`. Sloupcové vrstvy beze změny (sníh leží shora). Ramps dědí `_snow` z source cell svahu (Pass 2 v `generateTerrain`). Water cells override snow flag na false (cell pod hladinou nemá sníh).

4. **Water LIQUID prototype** (`waterSpecForClimate(latitude, humidity)` helper):
   - `humidity = dry` → bez vody (poušť).
   - `humidity ∈ {wet, mid}` → flood-fill enabled.
   - `freezeRatio`: `polar` 1.0, `temperate` 0.3, jiné 0.0.

5. **Water priority flood-fill algorithm** (Wang & Liu 2006):
   - Boundary cells iniciate `water_level = y_top` + push do MinHeap. Interpretace „okraj scény = drain" (overflow): voda uteče přes nejnižší boundary cell.
   - Min-heap propaguje od nejnižší úrovně dovnitř: `nLevel = max(level, neighbor.y_top)`. Vyšší inner cells tlumí stoupání hladiny.
   - Cell má vodu pokud `water_level > y_top`. Plane Y = `wl + 0.45` (hladina mírně pod rim cell top face → břeh voxel „trčí" jako reálný shore).
   - Frozen flag per cell: `polar` všechny ice, `temperate` `iceNoise > (1 - freezeRatio)` (~30 % cluster), `sub/tropical` nikdy.
   - MinHeap class (~30 ř., interní): O(N log N) pro 100×100 = trivial.

6. **BIOME_NAMES rename:** `tropical.wet` „Tropický deštný prales" → „Tropický prales" (drop přímý voda reference, ostatní názvy zachovány).

**Důvod:**

- **Konceptuální izomorfie** s DD-44 surface driver — `waterSpecForClimate` a `snowSpecForLatitude` paralelně s `surfacesForBiome` (climate parametry → state). User explicitně řekl *„stejně jako distribujeme sníh… distribujme vodu"* = sdílený pattern.
- **Sníh sort+rank** vs. původní noise-only threshold (sez. 38 iter. 1): zachová target area 30 %, jen shift distribuce. User feedback: noise-only přístup nedával dost sněhu na pohořích, threshold-lerp přístup pak dal sněhu moc.
- **Water LIQUID prototype** vrací vodu jako entitu (= flood-fill basin = reálná geografie), ne biome surface (DD-44 pattern). Krok směr k LIQUID 1. třída entitě (DD-25 vrstva 4 kandidát z IDEAS).
- **Ice materiál** (větší zákal opacity 0.85, menší reflexe roughness 0.55) vs. water (opacity 0.55, roughness 0.25) — user spec sez. 38.

**Známá omezení:**

- **Water plane per cell** = N meshes (pro 100×100 polar mid: cca 200-500 water cells → 200-500 meshes). Performance OK pro current scope (≤1k extra calls), ale clustering connected components do bounding boxů (1 plane / jezero) je sub-prah pro velké scény.
- **Snow + ramp boundary edge case** (sez. 38 D2 sub-prah): ramp z non-snowed do snowed cell má snowed SLOPE (= „cesta nahoru je zasněžená"), opačně non-snowed. Acceptable.
- **Y konvence vs. plane Y `wl + 0.45`** = mírně **pod** rim top face. Z-fight možný pokud rim cell má top face na přesně `wl + 0.5` (rare). Nebyl pozorován v sez. 38.
- **freezeRatio = 0.3 hard-coded** pro temperate — sub-prah pro sezonalitu (WORLD.SEASON driver = více led v zimě, méně v létě).
- **Wave anim per-frame compute** je `Math.sin` × 1 + Y update × N — trivial CPU, ale teoreticky by mohlo být sub-prah pro shader-based vertex displacement (dramatičtější vlny) u větších scén.

**Reference:**

- DD-32 (sez. 25) — `generateTerrain` MVP s water surface kind. DD-47 nahrazuje vodu jako surface (drop).
- DD-44 (sez. 36) — G3 surface driver. DD-47 follow-up: voda z BIOME_SURFACES odebrána, % přerozděleno.
- DD-42 (sez. 35) — WORLD.LATITUDE × HUMIDITY climate matrix. DD-47 přidá `snowSpecForLatitude` + `waterSpecForClimate` konzumenty.
- DD-25 (sez. 16) — 4-vrstvá taxonomie. DD-47 LIQUID prototype připravuje 4. vrstvu (= jezera jako entity, ne plane meshes — sub-prah).
- IDEAS.md „Voda ve všech skupenstvích" sez. 37 raw nápad → DD-47 částečné řešení (snow + ice + water entity, STEAM/FOG/cyklus skupenství zůstává v IDEAS).
- TODO.md G4 (snow kandidát) sub-prah uzavřen (snow nyní first-class přes `_snow` postfix paletu).
- Sez. 38 user volby: snow=A1A (kind enum 4→8) / A2=Ano (water % redistribuce dle plánu) / A3=Ano (noise+altitude bias) / A4=ok (BIOME_NAMES rename) / A5=ok (ramp snow propagace). Water=A1=ano (dry no water) / A2=a (boundary overflow). Sun/sky=A1=A (status quo doba slunce). Kontext v `docs/diary/2026-05-13.md` Sezení 38.

## DD-48 — Atmospheric color extensions: sun piecewise + sky 3-keypoint + ice + water wave (sez. 38)

**Stav:** Sez. 38 user feedback: *„měnit barvu slunečního světla: východ červánková → žluté → poledne bílá → zpět"*. Rozšiřuje DD-39 (2-keypoint atmospheric lerp) na 3-keypoint piecewise + nový DirectionalLight color animace + ice materiály + water wave anim.

**Rozhodnutí:**

1. **Sun color 3-keypoint piecewise** v `updateSun()`:
   - daylight=0 (sunrise/sunset) → `_sunColorSunrise` (0xffd4c6, oranžovo-bílá; 30 % lerp k `0xff7040` z bílé).
   - daylight=0.5 (mid) → `_sunColorMid` (0xfff3d4, teplá bílá; 30 % lerp k `0xffd870`).
   - daylight=1 (poledne) → `_sunColorNoon` (0xffffff, neutrální bílá).
   - Driver: `daylight = max(0, -cos α)` (= sun.intensity křivka, DRY).
   - Sez. 38 user calibration: 1/10 původního ohně bylo neviditelné, 3/10 přijatelné (= 30 % blend ratio).

2. **Sky background 3-keypoint piecewise** v `updateAtmosphere()`:
   - negCosA=−1 (půlnoc) → `_skyNight` (0x000000).
   - negCosA=0 (sunrise/sunset) → `_skyDusk` (0x5f3433, 30 % lerp k `0xff7040` z `_skyDay`).
   - negCosA=+1 (poledne) → `_skyDay` (0x1a1a2e).
   - Driver: raw `negCosA ∈ [-1, 1]` (NE clamped daylight) — rozliší „deep night" od „moment sunset".
   - `sceneFog.color.copy(scene.background)` per-frame propaguje barvu do fog.

3. **Adaptive fog distances** (sez. 38 bug fix): `updateFogForSize(sx, sz)` v spawnTerrain:
   ```
   near = max(sx, sz) * 0.3
   far  = max(sx, sz) * 1.2 + 10
   ```
   Aditivní +10 offset oslabuje fog pro malé scény (10×10 far: 12→22, +83 %) víc než pro velké (100×100 far: 120→130, +8 %). Důvod: původní fixed `near=30, far=120` byl pro 100×100 perf test (sez. 31), pro 10×10 default leželo celé dioráma v <near zóně → toggle FOG on/off nebyl viditelný.

4. **Ice materiál** (`_iceMat`): `MeshStandardMaterial({ color: 0xd9e8ec, opacity: 0.85, metalness: 0.05, roughness: 0.55, side: DoubleSide })`. Vs. water (`color: 0x3a7090, opacity: 0.55, metalness: 0.2, roughness: 0.25`): větší zákal + menší reflexe (user spec). Color shift k bílé (`_iceMat.color` 0xc0d8e0 → 0xd9e8ec, ~40 % k bílé) symboluje „led jemně zasněžený".

5. **Water wave anim** (KISS): sinusová vertikální oscilace `position.y = baseY + sin(t × ω) × 0.04` per non-frozen water mesh. `WATER_WAVE_AMP=0.04`, `WATER_WAVE_PERIOD=9.0` s (= klidný swell). Ice meshes **neanimují** (rigid surface, vynechány ze `_waterMeshes` Set). Per-frame: 1 `Math.sin` + N `position.y =` — trivial.

6. **Dirt color lighten** (sez. 38 hover support): `0x6b4423` → `0x8a5e36` v `BLOCK_COLORS.dirt.*` + `grass.{BOTTOM,SIDE}`. Důvod: tmavá dirt × multiplikativní hover (1.6, 0.8, 0.2) = tmavě hnědá s oranžovým nádechem (R=0.67); světlejší dirt × hover = sytá oranžová (R=0.86). Plus terén čitelnější i bez hover (= dirt vrstvy mezi top a stone byly téměř černé).

**Důvod:**

- **DD-39 sub-prah uzavření** — sez. 33 DD-39 zavedl atmospheric lerping s 2 keypoints + TODO sub-prah „přidat 3. barvu `_skyDusk` (oranžová) s peakem kolem daylight ≈ 0". DD-48 to řeší + rozšiřuje na sun color.
- **Konzistence atmosphere ↔ sun** — sky a slunce sdílí dusk/dawn peak. Před DD-48: sky lerp 2-keypoint (čerň ↔ modrá), sun pevně bílá. Po DD-48: sky 3-keypoint (čerň → oranžová → modrá), sun 3-keypoint (oranžovo-bílá → teplá bílá → bílá). Konceptuálně izomorfní = atmospheric scattering layer.
- **User-tunable amplitude** — 30 % calibration (1/10 málo, 10/10 přepálené). Komentář v kódu: změna blend ratio = jediný knob pro budoucí tweak.
- **Water wave KISS** — vertikální oscilace celé hladiny synchroně místo per-vertex displacement / shader. Pro voxel-art look „klidná hladina" dostačující. Šero animovaná hladina dobré odlišení od pevného ledu.

**Známá omezení:**

- **Sky/sun přechod bez hue shift** — current lerp je RGB-linear, ne HSL/HSV. Mezi `_skyDusk` (0x5f3433, teplá) a `_skyDay` (0x1a1a2e, tmavě modrá) RGB lerp prochází přes desaturovanou tmavě hnědou. HSL lerp by dal hue rotation (orange → blue přes purple). KISS: RGB stačí, sub-prah pro pozdější.
- **Wave anim global** — všechna voda synchroně. Realistic by bylo per-cluster wave (každé jezero vlastní fáze). Sub-prah.
- **Sun color shift 30 %** může být moc subtilní pro některé prefer. Tweakable via konstanty komentáře (`0.1 = subtle`, `0.3 = current`, `0.5 = halfway`, `1.0 = full žhne`).
- **Ice color shift bez snow texture** — `_iceMat.color` 0xd9e8ec je solid. Reálný „zasněžený led" by měl noise patches (= partially zasněžený, partially čistý led). Sub-prah pro canvas texture / vertex colors.

**Reference:**

- DD-39 (sez. 33) — atmospheric lerp 2-keypoint. DD-48 rozšiřuje na 3-keypoint + přidává DirectionalLight color konzument.
- DD-38 (sez. 32) — WORLD.DAY driver. DD-48 přidá další konzumenty (sun.color + sky 3-keypoint).
- DD-47 (sez. 38) — LIQUID prototype. DD-48 doplňuje ice materiál + water wave anim (= DD-47 functional, DD-48 cosmetic).
- Sez. 38 user calibration: 1/10 málo, 3/10 přijatelné, period 3s → 9s pro klidný swell. Hover dirt feedback: zesvětlit dirt místo posílit oranžovou (= multiplikativní hover problém pro tmavá albeda).
- Sez. 38 audit (`%AUDIT:CODE`): K1/K2 docs drift fix, D1 BLOCKS+COMPOSITES drop, D2 TTUNELS drop (~287 ř.), D3 terrain.js komentář, D4 GLOSSARY engine-internal maps. Kontext v `docs/diary/2026-05-13.md` Sezení 38.

## DD-49 — Asset content pipeline pro krajinné COMPOSITES (procedurální builders, sez. 39)

**Stav:** Sez. 39 user request: *„Je na čase dodat COMPOSITES stromy, kmeny, pařezy, kameny, trávu, keře."* Po DD-32 wipe sez. 24 byla decoration vrstva COMPOSITES (TREE/GRASS_TUFT/ROCK_PIXEL/LOG sez. 15-17 pixel-voxel buildery) smazána; DD-40 sez. 33 vrátil pouze LAMP (urban prop, ne krajinný). Inspirace: Quaternius Ultimate Nature Pack (`.blend` zdroj, hand-modeled faceted lowpoly, ~100 modelů). DD-49 je **kotva před implementací** (analogie DD-32 Fáze 0), žádný kód v sez. 39.

**Aréna:** AI workflow odložen (sez. 39 user A3=c → Claude přímo). arena.ai zvážíme až pro variant generation MVP+.

**Rozhodnutí:**

1. **1 generická třída `DECOR`** (potomek COMPOSITES). Atributy:
   - `KIND` (string, default `null`, lookup do `DECOR_BUILDERS`).
   - `SEED` (number, default `0`, deterministic varianty per instance).
   - `SCALE` (number, default `1.0`, opcionální zoom).
   KISS volba (A5=a) — místo 5 separátních tříd (`TREE`/`BUSH`/`ROCK`/`GRASS_TUFT`/`LOG`) jediný shell s lookup tabulkou builderů (per DD-41 pattern: paleta řízena z main.js, ne z modelu).

2. **Procedurální JS buildery, faceted lowpoly estetika** (A1=a). Signature:
   ```
   function build<Kind>(group: THREE.Group, opts: { seed: number, scale: number }): void
   ```
   Primitives: `BoxGeometry` / `CylinderGeometry` / `ConeGeometry` / `IcosahedronGeometry(detail=0)` / `SphereGeometry(low-segs)`. Materiál: sdílený `MeshLambertMaterial({ flatShading: true })` per color. Žádné textury, žádné voxely (= DD-23 pixel-voxel pivot **neplatí pro decoration vrstvu** — voxel identita je vrstva 1 BLOCKS, decoration vrstva 2 COMPOSITES jde faceted).

3. **First-pass 5 KIND-y** (A2=a + A9=ok):
   - **`spruce`** — jehličnatý strom: `CylinderGeometry` kmen + 3-5 `ConeGeometry` jehlicovitých korunních pater (top tapering).
   - **`oak`** — listnatý strom: `CylinderGeometry` kmen + 2-4 `IcosahedronGeometry(0)` listových clusterů (kulatá koruna).
   - **`bush`** — keř: 3-5 `IcosahedronGeometry(0)` / `SphereGeometry(low)` clusterů nízko nad zemí.
   - **`rock`** — kámen: 1-3 `IcosahedronGeometry(0)` chunks s random scale/rotation.
   - **`grass_tuft`** — trsová tráva: 3-5 tenkých `ConeGeometry` nebo `BoxGeometry` shards rozkládajících se z bodu.
   Pařezy + kmeny + sezónní varianty + cacti v second pass (sub-prah).

4. **Shared toolkit** v novém `src/composites/toolkit.js` (A7=b):
   - **Material cache** — `lowpolyMat(color)` → per-color singleton `Map<number, MeshLambertMaterial>`. Sní 1 materiál per barva napříč všemi instances.
   - **Geometry cache** — `getGeomCache(kind, partKey)` → per-(KIND × part) singleton `BoxGeometry`/`ConeGeometry`/`IcosahedronGeometry`/etc. Sní GPU memory.
   - **`mulberry32(seed)`** — DRY z `terrain.js` (kandidát: nový `src/random.js` re-export pro oba konzumenty).
   - **Paleta konstanty (6 spectra):** `BARK_BROWN` (0x6b4226), `LEAF_GREEN` (0x4a7a32), `LEAF_AUTUMN` (0xc77a30), `ROCK_GRAY` (0x707878), `GRASS_GREEN` (0x5fa040), `BUSH_GREEN` (0x386830).
   - **`DECOR_BUILDERS` lookup** — `{ spruce: buildSpruce, oak: buildOak, bush: buildBush, rock: buildRock, grass_tuft: buildGrassTuft }`.

5. **Biome-aware density driver `DECOR_DENSITY`** (A6=b) — per (LATITUDE × HUMIDITY) → `{ kind: weight, ... }` mapa. Příklady (kalibrace v implementaci):
   - `tropical.wet` → `oak: 0.06, bush: 0.08, grass_tuft: 0.04` (subtotal ~18 %; palm jako future KIND).
   - `temperate.mid` → `spruce: 0.05, oak: 0.04, bush: 0.03, rock: 0.02, grass_tuft: 0.05` (subtotal ~19 %, mixed).
   - `temperate.wet` → `oak: 0.06, bush: 0.05, grass_tuft: 0.06, rock: 0.01` (~18 %, vlhký smíšený les).
   - `polar.*` → `rock: 0.02, grass_tuft: 0.01` (~3 %, sparse).
   - `subtropical.dry` → `rock: 0.04, grass_tuft: 0.02, bush: 0.02` (~8 %, kaktus jako future KIND).
   Per-cell rozhodnutí: `rng() < sum_density → vybrat KIND vážen weight` (izomorfie s DD-47 sort+rank). Spawn jen na **top voxel grass nebo sand** (živý povrch); `stone` → jen rock; `_snow` varianty → density × 0.5 (zima méně vegetace). Voda nikdy.

6. **Auto-scatter v `generateTerrain` Krok 7** (po water flood-fill DD-47):
   ```
   decorate(blocks, biome, latitude, humidity, seed) → decorations[]
   ```
   Iteruje top voxely, per cell rozhodne dle `DECOR_DENSITY[latitude][humidity]`. Návratový typ `generateTerrain` rozšířen na `{ blocks, ramps, water, decorations }`. `decorations[]` = `[{ kind, x, y, z, seed }, ...]`. `spawnTerrain` v `main.js` na to navazuje: `decorations.forEach(d => scene.add(createMeshFor(new DECOR(...))))`.

7. **Performance baseline** (A7=b ramifikace):
   - Per-instance vlastní `THREE.Group` (varianty pose/scale per seed = ne InstancedMesh-friendly).
   - Sdílené geometry per (KIND, part) cache v toolkit (= MVP klíčový perf knob).
   - Materials = per-color singleton.
   - Pro 100×100 × ~10 % density → ~1k DECOR instances × ~5 mesh children = 5k Object3D. Three.js scenetree overhead OK do ~10k. Mez test: 30×30 baseline + 100×100 stress test.
   - Pokud FPS pokles, sub-prah na mesh merge per KIND (= 1 BufferGeometry per KIND s `mergeBufferGeometries`, **ztrácí hover granularitu na úroveň KIND-u**, ne per-instance).

8. **Dispatch v `createMeshFor`:**
   ```
   if (instance instanceof DECOR) return createDecor(instance);
   // createDecor → DECOR_BUILDERS[KIND](group, { seed, scale }) → return group
   ```
   `userData.{terrain: true, instanceId, hoverable}` flagy (cleanup v `regenerateScene`, hover detection). `castShadow = true`, `receiveShadow = false`. Per-color material singleton (sdílený s toolkit cache).

9. **Y konvence DD-28** (= surface mesh-bottom pro non-BLOCKS). Builder produkuje `Group` s **origin v y=0**, mesh dílů od y=0 nahoru. Spawn pozice: `x = cell.x + 0.5, y = cell.y_top + 1, z = cell.z + 0.5` (= mesh bottom na top face cellu).

**Důvod:**

- **Strukturní obnova vrstvy modelu.** Po DD-32 wipe COMPOSITES decoration vrstva má jen LAMP. Krajinné kompozity jsou důležitější než kosmetické sub-prahy (HSL hue shift / water bbox / SEASON). Per README ř. 11 *„Náhradní obyvatel scény"* otevřený TODO bod.
- **Procedurální místo asset import.** AI mesh generation 2026 (Hunyuan/Meshy/Tripo) produkuje smooth subdivision meshes, ne faceted Quaternius styl. Procedurální JS = exact stylistic control + seed varianty zdarma + konzistence s DD-21 *„parametrizované entity → procedurální COMPOSITES"* politikou.
- **Generická `DECOR` třída** = SLAP-konzistentní s DD-41 (1 nový potomek + lookup tabulka, ne 5 nových tříd). Plus user-facing infotip uvidí `KIND = "spruce"` místo třídního dispatch detailu.
- **Biome-aware density driver** = 3. osa climate-driven systému (po DD-44 surface mix + DD-47 snow/water state). Vrátí emergentní vrstvu krajiny per `WORLD.LATITUDE × HUMIDITY` (per CLAUDE.md `%THINK` 5: emergentní z jednoduchých pravidel).
- **Shared toolkit** = DRY (1 paleta, 1 geom cache, 1 RNG napříč 5+ buildery).
- **Faceted lowpoly** = vizuálně konzistentní s LAMP (DD-40, sez. 33) a budoucími urban props. Pixel-voxel sez. 15-17 buildery zaznamenány v git historii (`b6e3...` sez. 17 commit) jako reference, pokud bychom někdy chtěli pixel-voxel decoration varianty.

**Známá omezení:**

- **Performance neověřeno.** 100×100 × ~10 % density = ~1k Groups × ~5 dílů = 5k Object3D. Mez Three.js scenetree pro 60 FPS ~10k. Sub-prah test až po implementaci.
- **Aesthetic quality risk** — seed-driven buildery mohou vypadat algoritmicky (proporce, větvení). Mitigace: explicit pravidla v builderu (jehlice top-tapering, listy klastrované) + ruční tuning konstant po user feedback.
- **First pass 5 KIND.** Pařezy / kmeny / cacti / sezónní varianty / `_snow` post-fix varianty = sub-prah DD-49 follow-up.
- **Bez InstancedMesh** = scenetree overhead bottleneck pro 200×200+ scény (zatím out of scope).
- **`tropical.wet` palm KIND chybí v MVP.** Náhrada `oak` v MVP (= ne stylové, sub-prah follow-up).
- **`subtropical.dry` cactus KIND chybí.** Náhrada `rock`-dominantní MVP (sub-prah).

**Reference:**

- DD-21 (sez. 14) — hybrid politika: parametrizované entity → procedurální COMPOSITES, statická → VOXEL_MODEL. DD-49 obsazuje parametrickou polovinu (VOXEL_MODEL infrastruktura smazána sez. 29 audit).
- DD-32 (sez. 24) — wipe COMPOSITES decoration vrstvu (TREE/GRASS_TUFT/ROCK_PIXEL/LOG). DD-49 vrací vrstvu v lowpoly faceted estetice (ne pixel-voxel).
- DD-25 (sez. 16) — 4-vrstvá taxonomie. DD-49 obnovuje vrstvu 2 (COMPOSITES decoration), vedle vrstvy 1 (BLOCKS terrain), 3 (LINES PATH), 4 (LIQUID prototype DD-47).
- DD-40 (sez. 33) — LAMP první COMPOSITES potomek po DD-32. DD-49 sleduje builder pattern (procedural JS, pure THREE.Group, flatShading).
- DD-41 (sez. 34) — lookup-table paleta v main.js (`BLOCK_COLORS`). DD-49 paleta = per-color material singleton (similar pattern, jiný target — vertex colors vs. material color).
- DD-42 (sez. 35) + DD-44 (sez. 36) + DD-47 (sez. 38) — climate-driven driver pattern. DD-49 přidá `DECOR_DENSITY[latitude][humidity]` = třetí osa.
- README *„Náhradní obyvatel scény"* (M8+ TODO) — DD-49 řeší.
- Quaternius Ultimate Nature Pack (`.blend` zdroj, hand-modeled faceted lowpoly) — vizuální reference, ne přímý asset import.
- Sez. 39 user volby: A1=a (faceted lowpoly) / A2=a (5 KIND minimum) / A3=c (Claude přímo, ne aréna) / A4=jen DD kotva / A5=a (generická DECOR) / A6=b (biome-aware) / A7=b (shared geom cache) / A8=a (DD-49 kotva před impl) / A9=ok (spruce/oak/bush/rock/grass_tuft). Kontext v `docs/diary/2026-05-13.md` Sezení 39.

## DD-50 — WORLD.SEASON driver (4-enum roční období, sez. 40)

**Rozhodnutí:**

1. **`world.SEASON ∈ {spring, summer, autumn, winter}`** — 4-enum WORLD atribut. Default `"summer"` (= dnešní bezsezonní stav, zachová stávající boot vizuál). Pořadí kalendářní (jaro → léto → podzim → zima).
2. **Minimal scope (first-pass) — 2 konzumenti:**
   - **`snowSpecForLatitude(latitude, season)`** — temperate `patchThreshold` modifikátor. Lookup `SNOW_PATCH_BY_SEASON[season]`: spring/autumn 0.85 (~15 % cells), summer 1.00 (0 %), winter 0.40 (60 %). Polar `mode: "polar"` invariant. Tropical/subtropical `mode: "none"` invariant.
   - **`waterSpecForClimate(latitude, humidity, season)`** — temperate `freezeRatio` modifikátor. Lookup `WATER_FREEZE_BY_SEASON[season]`: spring 0.2, summer 0.0, autumn 0.3, winter 0.7. Polar `freezeRatio: 1.0` invariant.
3. **UI** — 4-step slider `tc-season` v Climate sekci `#terrainctrl` (vedle LATITUDE + HUMIDITY). Display: jaro/léto/podzim/zima. `input` event mutuje `world.SEASON` (přes `window.settings.setSeason`), `change` triggeruje regen. Default slider value=1 (léto).
4. **Polar perpetually-winter (sub-prah)** — polar season-invariant napříč `snowSpec` i `waterSpec`. Reálná Arktida má sezonní svit (polar day/night) + místní ablation, ale to je layer #2 (DAY × SEASON × LATITUDE composite), sub-prah.
5. **Tropical/subtropical season-invariant** — bez snow/ice napříč seasony. „Tropický podzim" znamená jen že list padá, ale to je sub-prah Fáze 6 (LEAF_AUTUMN paleta).
6. **`SEASONS` export array** — `["spring", "summer", "autumn", "winter"]` z `terrain.js`. Lookup pro UI controller (slider idx → key).
7. **`settings.setSeason(v)` mutator** — validace `SEASONS.includes(v)` (silent skip neznámých). Symetricky s `setLatitude` / `setHumidity`.

**Omezení (sub-prah pro budoucí sezení):**

- **LEAF_AUTUMN paleta** — DECOR oak/bush v autumn dostane LEAF_AUTUMN (oranžová) místo LEAF_GREEN. Spruce jehličnan zachová. Builder úprava `opts.season` propagace přes DECOR.SEASON atribut nebo `decorate` propagace per cell.
- **DECOR_DENSITY sezonní modifier** — autumn -20 % leaves, winter -50 % leaves + 20 % rock visibility. Vyžaduje `decorate()` rozšíření o season-weighted DECOR_DENSITY tabulku.
- **Polar season variace** — polar summer ablation (méně led, méně sníh), polar winter pernamentní 1.0 napříč. Sub-prah po prvnich vizuálních testech (může se ukázat zbytečné — polar je dnes "perpetually-Arctic" simplifikace).
- **Sky/sun color season modifier** — DD-48 `_skyDay`/`_skyDusk` keypoints jsou season-invariant. Sezonní subtle tint (winter colder modřejší, summer warmer žlutější) je layer #3 (DAY × SEASON × LATITUDE), sub-prah.
- **Snow accumulation animace přes DAY_SPEED** — temporal evolution (sníh roste v zimě, taje na jaře) by vyžadovala WORLD.DAY × SEASON interpolation. Mimo first-pass.

**References:**

- DD-29 (sez. 19) — politika *„nové atributy přibudou jen s živým konzumentem"*. DD-50 splňuje (2 konzumenti v `terrain.js`).
- DD-38 (sez. 27) — WORLD třída + DAY/DAY_SPEED. DD-50 přidává 4. atribut WORLD (po DAY/LATITUDE/HUMIDITY).
- DD-42 (sez. 35) — LATITUDE driver (4-enum). DD-50 izomorfní pattern (4-enum, lookup tabulky, UI slider).
- DD-47 (sez. 38) — snow/water driver helpers (`snowSpecForLatitude`, `waterSpecForClimate`). DD-50 přidá 2.-3. arg `season` k oběma signaturám.
- TODO „WORLD.SEASON driver pro freezeRatio" (sez. 38 DD-47 follow-up) — DD-50 realizuje.
- Sez. 40 user volby: scope=minimální (jen snow modifier) / default=summer / DD-50=kotva. Kontext v `docs/diary/2026-05-13.md` Sezení 40.

## DD-51 — Seasonal foliage cycle (LEAF_AUTUMN + winter defoliation, sez. 41)

**Rozhodnutí:**

1. **DECOR seasonal foliage cycle pro listnaté KIND-y (oak, bush)** — barva listí závisí na `DECOR.SEASON` atributu:
   - **spring / summer** → `LEAF_GREEN` (oak) / `BUSH_GREEN` (bush) — default.
   - **autumn** → `LEAF_AUTUMN` (`0xc8722a` oranžová, paleta připravená sez. 40 jako DD-50 kotva).
   - **winter (= snowed cell)** → defoliated, holé větve:
     - `oak.snowed`: builder skipne `for` loop nad Icosahedron clusters, vykreslí jen kmen (BARK_BROWN Cylinder).
     - `bush.snowed`: `decorate()` filtruje `bush` z `allowedEntries` (entity vůbec nespawnne, žádný empty mesh ve scéně). KISS — bush nemá kmen, defoliated by byl prázdný Group.
2. **Spruce season-invariant** — jehličnan drží `LEAF_GREEN` napříč seasony; snowed → SNOW_WHITE patra (zachováno ze sez. 40 DD-49). Důvod: smrk neoplývá list, sníh leží na jehličí.
3. **Priorita v builderu listnatých**: `snowed > autumn > default`. Snowed (winter) přebije autumn (= sníh leží na koruně bez ohledu na sezónu, takže autumn-snowed cell = winter-style holé větve).
4. **`DECOR.SEASON` 9. konstruktor atribut** (string, default `"summer"`). Propagace: `world.SEASON` → `decorSpec.season` → `decorate(...)` → `decoration.season` → `new DECOR(..., d.season)` → `DECOR.SEASON` → `createDecor` builder `opts.season`. Per-instance attribute drží model+engine separation (= entity nečte `world.SEASON` v render path, jen vlastní `SEASON` slot).
5. **`decorSpecForClimate(latitude, humidity, season)`** — rozšířená signatura (DD-49 sez. 40 byla 2-arg). Default `season = "summer"` při missing 3. argu (boot bez SEASON).
6. **Builder `opts.season` 4. param** — analogicky `opts.snowed` (sez. 40 DD-49 follow-up). Nepřidává state, jen routing color path.
7. **Botanická correctness** — listnáče (oak/bush) opadávají na podzim/zimu, jehličnany (spruce) drží. Tropical/subtropical biomy mají season-invariant decor (DD-50 polar/tropical perpetually-* invariant), ale pokud cell tam bude `snowed` (rare edge — temperate snow noise spillover), defoliation se aplikuje.

**Omezení (sub-prah pro budoucí sezení):**

- **`_dead` postfix** (Fáze 6 DECOR, sez. 40 sub-prah) — dry biomy mají suché bezlisté listnáče celoročně, na rozdíl od season defoliation (per-cell snow-driven). Když `_dead` přibude, builder logika rozšíří priorita: `dead > snowed > autumn > default`.
- **DECOR_DENSITY sezonní modifier** — autumn -20 % leaves, winter -50 % leaves (DD-50 omezení sez. 40). Mimo DD-51 first-pass (žádný density change, jen color).
- **Polar season variace** — polar `_snow` invariant, takže polar oak/bush by byl trvale defoliated, ale polar biomy `decorSpec.density` nemají oak/spruce (TODO `DECOR_DENSITY.polar.wet/mid/dry`). Edge case bez impactu.
- **`LEAF_AUTUMN` HSL variace per instance** — currently single hex `0xc8722a`. Reálný podzimní les má spektrum oranžová/žlutá/červená/hnědá per individuální strom. Per-instance hue shift přes `DECOR.SEED`-derived noise = sub-prah.
- **Bush cluster regen při season změně** — bush v snowed cell skip = při winter regen scéna ztratí bush instance celé, při návratu na summer/spring je entity zpět. UI side effect: F12 entity counter neaktualizuje (každý regen je „fresh"). Akceptovatelné.

**References:**

- DD-50 (sez. 40) — SEASON enum + `world.SEASON` atribut. DD-51 realizuje sub-prah „LEAF_AUTUMN paleta" + přidává winter defoliation (mimo původní DD-50 scope).
- DD-49 (sez. 40) — DECOR class + builder pattern. DD-51 přidává `SEASON` atribut + 4. builder opts + winter defoliation logiku do oak/bush.
- DD-47 (sez. 38) — `cells[i].snowed` flag (source defoliation triggeru, propagovaný do `decoration.snowed`).
- DD-29 (sez. 19) — politika *„nové atributy přibudou jen s živým konzumentem"*. `DECOR.SEASON` splňuje (3 konzumenti: `buildOak`, `buildBush`, `decorate()` filter).
- Sez. 41 user pointy: „Listnaté zelené, oranžovou nevidím" (regen path caller bug) + „A co listnaté v zimě?" (logická chyba snowed = white pro listnáče). Kontext v `docs/diary/2026-05-14.md` Sezení 41.

## DD-52 — Slope-aware DECOR Y na rampách (`ramps[].slopeDir`, sez. 41)

**Rozhodnutí:**

1. **`ramps[]` entry rozšířena o `slopeDir: { dx, dz }`** — unit vector z low end → high end ramp (horizontal direction). Computed při candidate creation v `terrain.js` Krok 5:
   - **edge ramp** (TRRAMPS): `slopeDir = { dx: pick.dir.dx, dz: pick.dir.dz }` (toward high neighbor; norm `|dx|+|dz| = 1`, axiální).
   - **corner ramp** (TTRAMPS, isolated diag peak): `slopeDir = { dx: c.ddx, dz: c.ddz }` (toward diagonal peak corner; norm = 2, diagonální).
   - **diagonal ramp** (TDRAMP): `slopeDir = { dx: tdrampCorner.ddx, dz: tdrampCorner.ddz }` (toward peak corner; norm = 2).
2. **`decorate()` Y výpočet rozšířen** z konstantního `c.y_top + 1.0` (sez. 40 ramp Y fix) na lineární interpolaci dle jitter pozice:
   - **non-ramp cell**: `decY = c.y_top + 0.5` (top face top voxelu).
   - **ramp cell**: `slopeT = (jitterX·dx + jitterZ·dz) / (|dx|+|dz|)`; `decY = c.y_top + 1.0 + slopeT`.
3. **Normalizace `(|dx|+|dz|)`** unifikuje edge (norm=1, axial) a corner/diagonal (norm=2, diagonal):
   - Edge: jitter ±0.3 podél slope axis → `slopeT ∈ [-0.3, +0.3]`, `decY ∈ [y_top + 0.7, y_top + 1.3]`.
   - Corner/diagonal: jitter dot product ±0.6 raw / norm 2 → `slopeT ∈ [-0.3, +0.3]`, stejný rozsah jako edge.
4. **`rampDirMap: Map<"x,z", slopeDir>`** v `decorate()` — O(1) lookup per cell. Slope lookup mimo attempt loop (per-cell konstanta).
5. **TDRAMP step shape aproximace** — diagonal ramp není smooth slope ale step (peak side filled na `y_top + 1.5`, low side na `y_top + 0.5`, diskontinuita na diagonálu). Bilinear formula je mild aproximace — strom blízko diagonal line může být mírně zapuštěn nebo viset. Akceptováno pro KISS, sub-prah pro exact step model.

**Omezení (sub-prah):**

- **TDRAMP exact step Y** — `if (jitterX·dx + jitterZ·dz > 0) decY = y_top + 1.5; else decY = y_top + 0.5`. Skok na diagonal line místo lineární interp. Drobně viditelný jen u trees umístěných do 1-2 voxel range diagonal split, sub-prah.
- **Per-cell single ramp** — `rampDirMap` ukládá 1 entry per (x,z), pokud cell má více ramp orientací (rare edge), používá se první z `ramps[]` iteration order. Acceptable pro current ramp generation (nemělo by být duplicit per cell).
- **Jitter clampovaný ±0.3** — pokud někdy zvedneme jitter range (např. ±0.45 = decor až na hranu cellu), Y formula stále dá výsledek v `[y_top + 0.55, y_top + 1.45]`. Mezní hodnoty `[y_top + 0.5, y_top + 1.5]` jsou jen pro jitter dosahující ±0.5 (= corner cellu).
- **DECOR rotation nezohledňuje slope normal** — strom roste „pole-style" vertical, ne kolmo k ramp surface (= mírně nakloněn proti slope). Realistické stromy rostou vertikálně, takže tohle není bug; ale fence/wall future entities by potřebovaly slope normal rotation.

**References:**

- DD-33 (sez. 26) — TRRAMPS edge ramp + ORIENTATION konvence. DD-52 reuse `pick.dir.dx/dz` z candidate creation pro slope direction (=  axial slope vector).
- DD-35 (sez. 27) — TDRAMP diagonal half-cube. DD-52 aproximuje diagonal slope bilinear (step shape sub-prah).
- DD-49 (sez. 40) — `decorate()` Krok 7 + ramp Y constant `y_top + 1.0` (sez. 40 bod 2 ramp fix). DD-52 nahrazuje konstantní Y lineární interp.
- Sez. 41 user pointy: „Stromy na rampách (oak) visí ve vzduchu, přepočítej výšku paty stromu na svahu." Kontext v `docs/diary/2026-05-14.md` Sezení 41.

## DD-54 — LIQUID class jako **5. vrstva DD-25 extension** (Tekutiny, sez. 45)

**Rozhodnutí:** DD-25 4-vrstvá taxonomie (Bloky / Voxely / Linie / Objekty) se rozšiřuje o **5. vrstvu: Tekutiny**. První konkrétní implementace `class LIQUID extends CUBES` v `src/model.js`. Sibling BLOCKS / COMPOSITES / PATH pod CUBES (paralel PATH pattern dle DD-27 — bez abstract `LIQUIDS` base třídy dokud nepřibude 2. sourozenec, např. lava / oil / acid).

**Kontext:** DD-47 (sez. 38) zavedl water flood-fill (Wang & Liu 2006 priority queue) a vrátil voda do scény po DD-25 wipe. Implementace ale držela vodu jako **raw data records** v `terrain.water[]` array (`{x, y, z, frozen, w, d}`), bez OOP class. Memory `project-model-hierarchy` zaznamenala „DD-25 vrstva 4 LIQUID class" jako sub-prah — to je chybné čtení DD-25 (vrstva 4 = Objekty / postavy / zvířata, ne tekutiny). DD-54 to opravuje: LIQUID je **nová 5. vrstva** v rozšířené DD-25 taxonomii.

**Class signature:**

```js
new LIQUID(id, name, x, level, z, temperature, bbox, cells, description)
```

**Atributy:**

- `LEVEL` — Y hladiny (sémanticky čitelnější alias pro `Y` z CUBES). Skeleton drží oba kvůli budoucí extension (mesh Y může mít nudge offset proti z-fightu, `LEVEL` zůstává čistá logická hladina).
- `TEMPERATURE` — `"frozen"` | `"liquid"` enum. Material decision v `createLiquidPlane` (`_iceMat` vs. `_waterMat`).
- `BOUNDING_BOX` — `{ w, d }` axis-aligned XZ extent v 1C jednotkách.
- `CELLS` — `[{ x, z }, ...]` cells obsazené tímto LIQUID. Pro DRY identifikaci / clear-path / decorate skip.

**Sez. 45 prototype = single-cell skeleton:**

1 LIQUID instance = 1 water cell. `BOUNDING_BOX = { w: 1, d: 1 }`, `CELLS = [{ x, z }]` (single prvek). Spawn loop v `main.js` (`buildScene`) iteruje `terrain.water[]` raw records a wrapuje je do LIQUID instancí. **`createLiquidPlane(liquid)`** (= renamed `createWaterPlane(w)`) bere LIQUID a čte z něj `X/LEVEL/Z/TEMPERATURE/BOUNDING_BOX`.

**Důvod prototype skeleton, ne plný clustering:**

Plný BFS connected-components clustering (= 1 LIQUID = N connected cells sdílejících `water_y` + `frozen`) byl pokusen v sez. 42 (DD-53 attempt) a **revertován** — viz memory `project-target-use-case`:

- bbox over varied `water_y` → mean Y → boundary cells z-fight (visual artifact).
- per target use case 20×20 dioráma je per-cell render visually correct + zero perf cost.
- 100×100 stress test je academic edge case, ne real workflow.

Skeleton splňuje **DRY** (LIQUID koncept v jednom místě, ne raw records mixed s class), **first-things-first** (class identita > clustering optimization) a **conceptual integrity** (DD-25 5-vrstvá taxonomie je nyní úplná). Plný clustering = sub-prah, čeká na user signal („100×100 jezera blikají" nebo nový perf need).

**Důsledek:**

- `terrain.water[]` zachováno jako raw data records (per DD-11 model/engine separation — `terrain.js` nezná `model.js`).
- `_waterMat` / `_iceMat` / `_waterGeom` / `_waterMeshes` internals zachovány (= implementation detail, rename na `_liquid*` = sub-prah až přibude lava/oil sourozenec a paralelní rename si vynutí 2. material set).
- DD-47 LIQUID prototype označení se v komentářích aktualizuje na „LIQUID class skeleton" (DD-54 nahrazuje raw record pattern).

**Sub-prahy (čekající):**

- **BFS connected-components clustering** — `terrain.js` Krok 6.5 (post-flood-fill): visited Set + queue, split components dle `(water_y, frozen)` key (= unique kombinace → samostatná LIQUID instance, drží z-fight invariant). Spawn loop pak prochází `terrain.liquids[]` namísto `terrain.water[]`.
- **Multi-Y component split** — jezero s ostrovem (= jeden component, různé `water_y` na různých cells) → N LIQUID instancí, jedna per Y level.
- **Per-bbox ice texture noise** — pro frozen LIQUID s bbox > 5 cells dát canvas texture s bílo-modrými skvrnami (= „partially zasněžený led").

**Budoucí extension hooks („fyzika kapalin", user note sez. 45):**

- `TEMPERATURE` numeric °C → gradient frozen↔melting, permafrost, sezonní tání.
- `FLOW_DIRECTION` → rivers, streams (paralel `PATH.POINTS` sekvence). Spustí 2. sourozenec → abstract `LIQUIDS` base class per DD-27 vzoru.
- `VISCOSITY` → různé tekutiny (voda, láva, ropa, kyselina).
- `LEVEL` animace — tide cyklus, monsoon flood, sezonní tání ledu na jaře.

**Žádné rename napříč src/ kromě entry pointu** (`createWaterPlane → createLiquidPlane`). `_waterMat` / `_iceMat` / `_waterMeshes` zachovány = implementation locality.

**References:**

- DD-25 (sez. 16) — Originální 4-vrstvá taxonomie scény. DD-54 ji rozšiřuje o 5. vrstvu.
- DD-27 (sez. 20) — PATH pattern (sibling BLOCKS pod CUBES, bez abstract LINES base dokud nepřibude TRACK). LIQUID kopíruje tento pattern.
- DD-47 (sez. 38) — Water flood-fill prototype. DD-54 odstraňuje raw record přístup a wrapuje do LIQUID class.
- DD-53 (sez. 42, attempt + revert) — Bbox clustering attempt. DD-54 explicit drží single-cell skeleton, plný clustering sub-prah s mitigací (split by `(water_y, frozen)`).
- Memory: [[project-target-use-case]], [[feedback-target-use-case-check]].
- Sez. 45 user note: „Třeba někdy dojde na fyziku kapalin." — schválení LIQUID jako samostatné vrstvy s budoucí extension hooks (TEMPERATURE °C / FLOW / VISCOSITY).

## DD-55 — M-Genesis cleanup scope locked (sez. 48)

**Rozhodnutí:** Po DD-32 (sez. 24) terrain generator pivotu a polish arc (sez. 42–47) je terrain generator iterace v1.0 hotová. Sez. 48 formálně **uzavírá scope aktivního modelu na 8 tříd** drop M1-M5 milestone artefaktů bez živého konzumenta v terrain scope. Per memory `feedback-test-nic-overthinked-nelze-odebrat` (user 2026-05-14): *„Mi naopak máme nějakou základní verzi (iteraci), ve které nic nechybí a nic (zbytečného, přemyšleného (overthinked)) nelze odebrat/zjednodušit."* DD-55 je realizace toho cílu pro M-Genesis arc.

**Kontext:** `%AUDIT:CODE` sez. 48 identifikoval ~580 ř. infrastruktury v `src/main.js` + ~80 ř. v `src/model.js` + 30 ř. `src/time.js` pro M1-M5 patterny (SPRITES/PATH/TIMER/COUNTER/TIME/ANIMATE) bez `new Class(...)` instance napříč src/. Per DD-32 politika *„atribut přibude jen s živým konzumentem"* (sez. 29 prvně aplikovaná pro WORLD wipe + sez. 32 re-introduce s živými konzumenty) by se měla aplikovat symetricky i na třídy/dispatch mechanismy, ne jen atributy.

**Aktivní scope po DD-55 (model.js, 8 tříd):**

```
OBJECTS (ID, NAME, DESCRIPTION)
 ├── CUBES (X, Y, Z float; Y konvence per typ — DD-28)
 │    ├── BLOCKS (1C grid, Y = grid center, ORIENTATION — DD-26)
 │    │    ├── CCUBES (COLOR)
 │    │    ├── TCUBES (lowpoly vertex-color — DD-41)
 │    │    ├── TRRAMPS
 │    │    ├── TTRAMPS
 │    │    └── TDRAMP
 │    ├── COMPOSITES
 │    │    ├── LAMP (DD-40)
 │    │    └── DECOR (DD-49+DD-51 Fáze 6)
 │    └── LIQUID (DD-54, **4. vrstva DD-25 extension po PATH dropu**)
 └── WORLD (singleton — DD-38/DD-42/DD-50)
```

**Smazáno sez. 48 (K1+D1+D2 + Sun toggle drop):**

- **K1a `ANIMATE` dispatch (~80 ř.)** — `ANIMATE` atribut z OBJECTS, `ANIMATORS` registry, 4 kindy `rotate`/`orbit_stadium`/`pulse`/`drift` + `animate*` funkce, `registerAnimator`, `updateAnimations`, `animators[]`, scratch vektory `TAU`/`_up`/`_dir`/`_a`, `oscPhase`, `ANIMATE` infotip case + filter. DD-15 reference v immutable logu.
- **K1b `SPRITES` třída + bubble tail (~250 ř.)** — `class SPRITES extends CUBES` + atributy `ASSET`/`SPEAKER`/`SPEAKER_OFFSET_Y`, `createSpriteFor`, `makeBubbleTexture` (canvas dialog bubble), `resolveSpeakerTarget` + `buildBubbleTail` + `updateBubbleTail` + `updateBubbleTails` + `bubbleTails[]` registry, SPRITES branch v `createMeshFor` + hover skip. DD-13/DD-16 reference v immutable logu.
- **K1c `PATH` třída + Catmull-Rom strip (~70 ř.)** — `class PATH extends CUBES` + `POINTS`/`KIND`, `createPathFor` (Catmull-Rom curve3 + strip BufferGeometry), PATH constants (PATH_WIDTH/SEGMENTS/Y_OFFSET/UV_REPEAT), `pathTexture(kind)` cache, PATH branch v `createMeshFor` + POINTS infotip case. DD-27 reference v immutable logu.
- **K1d `TIMER` + `COUNTER` + `ACTIONS` (~150 ř.)** — třídy `class TIMER extends OBJECTS` + `class COUNTER extends OBJECTS`, `registerTimer`, `registerCounter`, `tickHandlers[]` registry, `ACTIONS` dispatch table (`toggle`/`set`), `dispatchAction`, `registerBehavior` (TIMER/COUNTER branches), HUD `#hud` + `#time` DOM element + CSS. DD-17 reference v immutable logu.
- **K1e `TIME` singleton (~30 ř.)** — `src/time.js` soubor smazán (export `TIME` + `advanceTime()`), import z main.js, `setInterval(advanceTime + updateTickHandlers, 1000)` block. DD-04/DD-05 reference v immutable logu.
- **D1 atlas IIFE compute waste (~50 ř.)** — 3× ramp `*_GEOM_CACHE` IIFE smaž `remapU(uv, faceIdx)` helper + UV array + UV params z `addQuad`/`addTri` signatures + UV args z call sites + `setAttribute("uv", ...)` na finálním geom + `deleteAttribute("uv")` v `getRampGeom`. Rename `TRRAMP_GEOM_CACHE`/`TTRAMP_GEOM_CACHE`/`TDRAMP_GEOM_CACHE` → `_TRRAMP_RAW_GEOM`/`_TTRAMP_RAW_GEOM`/`_TDRAMP_RAW_GEOM`. DD-41 follow-up (TODO ř. 70 known dluh).
- **D2 atlas komentář drift (3 fixy)** — main.js 3 komentáře *„single-material atlas mapováním (DD-36)"*, *„1 atlas material"*, *„(geom, atlas mat)"*, *„patří atlasu / sdílené factory"* → DD-41 lowpoly vertex-color wording.
- **UI Sun toggle drop** *(user follow-up v sez. 48)* — `set-sun` checkbox v index.html, `addEventListener("change", setSun)`, `_sunUserVisible` flag v main.js, `setSun(on)` z `window.settings` API. Slunce nyní vždy ON s auto-hide pod horizontem (`sun.position.y > SUN_HORIZON_Y_MIN`, sez. 47 −15° threshold). KISS: toggle pro „eye candy on/off" měl mizivou hodnotu, sun auto-hide v noci stačí.

**Velikosti:**

| Soubor | Před | Po | Δ |
|---|---|---|---|
| `src/main.js` | 2968 ř. | 2091 ř. | **−877 ř. (−29.5 %)** |
| `src/model.js` | 532 ř. | 404 ř. | −128 ř. |
| `src/time.js` | 30 ř. | (smazán) | −30 ř. |
| `index.html` | 521 ř. | 516 ř. | −5 ř. |
| **Celkem JS+HTML** | 4051 ř. | 3011 ř. | **−1040 ř. (−25.7 %)** |

**Důvody (KISS argumentace):**

1. **„Atribut s živým konzumentem" politika** (DD-29 → DD-32 sez. 29 + DD-38 sez. 32 reintro): původně aplikovaná na atributy WORLD. Sez. 48 rozšiřuje na celé třídy/dispatch mechanismy. Argumentace symmetric: třída + builder + register + dispatch je „infrastruktura"; pokud nemá konzumenta, je to *infrastruktura ve službě hypotetické budoucnosti* = porušení DD-29 ducha.
2. **DD-32 terrain pivot scope** (sez. 24): M1-M5 patterny vznikly **pro sandbox cube playground** (statický svět s hodinami, dialog bubbles, animated balloons). Po DD-32 je projekt **procedural terrain sandbox**, kde scéna se generuje proceduralně z `generateTerrain` (DD-32) + parametrického klima driver (DD-42/44). Žádný spawn loop nepoužívá SPRITES (dialog) / PATH (cesta) / TIMER (event) / COUNTER (HUD) / ANIMATE (per-frame). Posledních 24 sezení (24–47) všechny patterny obcházejí.
3. **`%AUDIT:CODE` cadence trigger** (sez. 48 user-driven, ne cadence threshold): user explicit vize *„základní iterace, ve které nic nechybí a nic overthinked nelze odebrat"*. Polish arc sez. 42–47 byl content-add; sez. 48 je první subtractive sezení v M-Genesis arc.
4. **Git history zachování** (precedent TTUNELS class drop sez. 38, audit D2): smazané patterny **dostupné v git historii** (sez. 4–9 commits + sez. 48 commit `46f686d` jako audit trail). Revert je legitimní future pattern když přibude konzument (např. Stickman integrace → `ANIMATE` mode slot dle DD-18; gameplay vrstva → TIMER + COUNTER + ACTIONS pro discrete events).
5. **Conceptual integrity** (CLAUDE.md princip): po cleanup model = *„all about terrain"*. 8 tříd v jednotném scope (OBJECTS/CUBES → BLOCKS/COMPOSITES/LIQUID/WORLD), žádné dispatch mechanismy bez konzumenta, žádné atributy bez konzumenta.

**Důsledky:**

- **DD-25 4-vrstvá taxonomie** se aktualizuje (immutable text DD-25 zachován, ale wording „4. vrstva = Objekty, 5. vrstva = Tekutiny" se po PATH dropu zjednodušuje na *„Bloky / Voxely / Objekty / Tekutiny"* = 4 vrstvy. DD-54 immutable text *„5. vrstva DD-25 extension"* zachován, ale fakticky jde nyní o 4. vrstvu — viz update poznámka v GLOSSARY).
- **DD-16 SPEAKER pattern** + **DD-15 ANIMATE pattern** + **DD-17 TIMER+ACTION pattern** = immutable lessons v DD logu. Pokud někdy přibude konzument, pattern je čitelný z DD entries, ne nutně z aktivního kódu.
- **Stickman integrace** (sibling project `./source/Stickman`, memory `reference-stickman-project`) bude potřebovat ANIMATE dispatch zpět — revert z git history (sez. 4-9 commits) nebo nový impl per use case.
- **Asset import pipeline** (TODO M8+) — pokud budoucí glTF Loader entity bude potřebovat ANIMATE pro skeletal anim, revert z git history.
- `src/composites/{toolkit,builders}.js` zachovány = aktivní DECOR pipeline (DD-49).

**References:**

- DD-04 / DD-05 / DD-13 / DD-15 / DD-16 / DD-17 / DD-27 — immutable patterny pro smazané M1-M5 artefakty.
- DD-25 (sez. 16) — 4-vrstvá taxonomie. Po sez. 48 PATH drop se LIQUID (DD-54 5. vrstva extension) fakticky stává 4. vrstvou. Immutable text DD-25 zachován.
- DD-29 → DD-32 sez. 29 + DD-38 sez. 32 — politika „atribut/třída s živým konzumentem". DD-55 rozšiřuje politiku ze samotných atributů na celé dispatch mechanismy.
- TODO ř. 70 *„Atlas IIFE raw geom strip UV at source"* — D1 cleanup realized.
- `%AUDIT:CODE` sez. 48 (cadence threshold 1/8, ale user-driven trigger): 7 audit kategorií, 8 KEEP/DROP nálezů.
- Git commit `46f686d` (sez. 48 M-Genesis cleanup commit) — audit trail pro `git log` traceability.
- Memory: [[feedback-test-nic-overthinked-nelze-odebrat]], [[feedback-end-implies-push]].
- Sez. 48 user verdikt na cleanup decision: *„PLNÝ K1 cut (K1a-K1e)" + „Teď hned"* + *„Slunce vždy ON"*.

## DD-56 — Voxel-native surovinový model (v1.1-voxel-mvp arc start, sez. 50)

**Schválené rozhodnutí (sez. 50, 2026-05-15):**

Post-`v1.0-terrain` close (sez. 49) zahajujeme nový arc **v1.1-voxel-mvp** s cílem *„prezentace surovin a test manipulace s nimi"* (user A12 scope statement). Suroviny ve scéně jsou viditelné, sbíratelné, přenositelné — žádné recepty, žádný consumer, žádný permanent terrain mutation.

### Klíčové koncepty (immutable)

1. **VOXEL = atomární sub-cube.** 1/64 cube. Má `RESOURCE` typ + leží v sub-grid jedné cell. `V = 4` (hard-coded const), V³ = 64 voxelů/cube.
2. **RESOURCE_REGISTRY** = nový namespace (`src/resources.js`), paralel `BIOME_NAMES` pattern. MVP 4 typy: `wood` / `stone` / `sand` / `water`. Žádný `grass` (= surface reakce s podnebím, paralel snow). Per-type metadata `{ color, state: solid|liquid|granular, density }`.
3. **Žádná `STORAGE` třída.** Voxely sedí v atributu `VOXELS` (`Map<resource, count>`) **na kterémkoli tile** (CCUBES + air cells). Tile-jako-storage = izomorfismus s ostatními cell state slots (surface, snowed, ramps).
4. **Layer-by-layer autosort.** Voxely v cellu se renderují po vrstvách V²=16, ordered dle insertion (= first 16 voxelů = bottom layer). Max 4 typy per tile (V vrstev).
5. **Dvě reprezentace voxel renderingu:**
   - **Stack mode** (cell.VOXELS) — fixed orientation, layer-by-layer, autosort barvou.
   - **Scatter mode** (decor placement v terrain Krok 8) — **random rotation** per instance (A13 user spec, vizuální decor).
6. **InstancedMesh per resource_type batch.** 4 batches MVP (jeden per resource), per-instance matrix určuje sub-grid pozici + rotaci.
7. **BALLOON revert** (z M4 sez. 4 commit) = první „živá" transport entita. Rozšířen o `INVENTORY` (Map, hard cap 4 voxely) + `MISSION` state machine (`idle` / `goingToPickup` / `picking` / `goingToDropoff` / `dropping`). Visual: koš = **plošina 4×1×1**, 4 voxel slots viditelné vedle sebe (A16 user spec).
8. **AIR pathfind = direct vector** (no A*). Lerp k target XZ + adjust Y. Speed ~3 cells/sec.
9. **LIFO pick prioritization** — vzducholoď bere voxely z top-layer (= last-in-first-out). Izomorfní s real-world stack, emergent produkuje „inverted rainbow" v acceptance scénář.
10. **Overflow handling — dual policy:**
    - **Cílený přesun** (vzducholoď drop target plný) → **zamítnout drop**, MISSION → idle, inventář zůstává (A11 user spec).
    - **Náhodná emise** (chop tree → voxely spawn, cell už full) → **hledat volné okolní místo**, BFS max 3 hops (A11 user spec).
11. **Chop interakce = instant break** (MVP per A12 (i)). Left-click decor mesh → decor mizí, `RESOURCE_YIELD` voxely se přidají do decor cellu `VOXELS`. Mission-driven chop = post-MVP IDEAS.
12. **Decor → resource yield** = rozšíření DD-49 DECOR_SPEC o `RESOURCE_YIELD` per KIND. Spruce/oak/palm yield wood, rock yield stone, stump/log/cactus yield wood (small). Bush/flower/grass_tuft yield 0.
13. **OnLoad scatter** = `terrain.js` Krok 8 (post-decorate), per-biome density tabulka (`temperate.wet → wood`, `polar → stone`, `tropical.dry → sand`). Scatter mode (random rotation), není nutný pro mechaniku (A13).
14. **Voxely v jezerech & sypké** = voxelizovány stejně (A7 user spec). Čirá nádoba (= transparent containment intuice). Liquid voxel state metadata pre-`density gravity` future polish.

### Out of scope — post-v1.1 IDEAS kotvy

Velmi explicitně NEPATŘÍ do v1.1-voxel-mvp:

- **TRANSFORMER recipes** (crafting) — vlastní DD-57 kandidát.
- **CONSUMER sinks** — bez consumeru MVP udržitelný.
- **Dopravník/Factorio belt** — post-vzducholoď arc, PATH revert + flow simulace.
- **Stickman ground transport** — glTF pipeline dep.
- **Mission-driven chop** (A12 (ii)) — vyžaduje recipe UI.
- **Mining 1 cube → V³ voxels** + **building V³ voxels → 1 cube** — Fáze D, terrain mutable pivot, vlastní velký arc.
- **Water LEVEL drain při těžbě** (A9) — LIQUID extension, DD-54 sub-prah promote.
- **Multi-balon fleet management** — post-MVP scaling.
- **Density gravity / pile shape** — RESOURCE.density polish, sub-prah.

### Implementační fáze (odhad 4 sezení 51-54)

| Sezení | Scope | Odhad |
|---|---|---|
| 51 | RESOURCE_REGISTRY + `VOXELS` atribut + InstancedMesh per resource render (stack mode) + **rainbow rubik init** (A15: náhodná volná cell, 16+16+16+16 mix) | ~250 ř. |
| 52 | OnLoad scatter Krok 8 (scatter mode, random rotation) + decor `RESOURCE_YIELD` + chop interakce (instant break) + overflow random emise (BFS 3 hops) | ~150 ř. |
| 53 | BALLOON revert + INVENTORY/MISSION + AIR lerp + click UI target select + koš plošina 4 slots | ~250 ř. |
| 54 | Rubik test acceptance + perf bash (A14 60 FPS @ 20×20) + docs sync + close ceremonie + annotated tag `v1.1-voxel-mvp` | docs |

Total ~650 ř. produkčního JS + docs/diary.

### Acceptance criteria — rainbow rubik test

1. Sez. 51 spawne rainbow rubik (16 wood + 16 stone + 16 sand + 16 water) v náhodné volné cell A.
2. Left-click A → vzducholoď doletí, pick 4 voxely (LIFO = top water vrstva).
3. Koš ukáže 4 mini water voxely vedle sebe.
4. Left-click cell B (prázdná) → vzducholoď doletí, dropne 4 water voxely (vrstva 1 v B).
5. Opakovat 15× → A se vyprázdní layer-by-layer (water → sand → stone → wood), B se naplní opačně (inverted rainbow).
6. **Pass:** 60 FPS @ 20×20, žádný F12 error, per-instance rotation funguje na scatter voxelech v krajině.

### Reference

- User Q&A sez. 50 (chat log) — A1 voxel směr, A5 V=4, A6 tile-as-storage, A7 voxelize liquid/granular, A8 vzducholoď, A9 water drain → IDEAS, A10 4 resources bez grass, A11 dual overflow, A12 instant break, A13 scatter rotation, A14 perf, A15 rainbow rubik init, A16 koš plošina + LIFO.
- `docs/TODO.md` `## v1.1-voxel-mvp arc` — implementační rozpis.
- `docs/IDEAS.md` — post-v1.1 brain-dump (TRANSFORMER recipes, dopravník, mining/building, multi-balon).
- DD-49 (DECOR builders) — RESOURCE_YIELD je rozšíření existující tabulky, ne nový pattern.
- DD-54 (LIQUID class) — voda v jezerech zůstává LIQUID; voda v storage je voxel (dvě paradigmaty per kontext).
- M4 BALLOON DONE.md ř. 41-47 + sez. 4 commit — revert šablona.
- Memory kotva `project_m_genesis_close.md` (sez. 49) — předchozí arc close pattern pro v1.1 budoucí close.

## DD-57 — Voxel shuffle render mode + 5. surovina dirt (sez. 51, drop DD-56 koncept 4 autosort render-side)

**Schválené rozhodnutí (sez. 51, 2026-05-15):**

DD-56 koncept 4 (layer-by-layer autosort) na render-side **dropnutý**. User feedback po prvním rubik dispatchi *„voxely namíchat, rubik je ze čtyř jednobarevných vrstev"* — vrstvený display vnímán jako „dort", ne „rubik". DD-56 immutable koncept 4 wording („Layer-by-layer autosort. Voxely v cellu se renderují po vrstvách V²=16, ordered dle insertion") **superseded** tímto DD pro render-side.

### Co se mění

1. **Render-side shuffle.** `expandVoxelLayers(voxels, seed)` v `src/resources.js` aplikuje **Fisher-Yates seeded shuffle** sub-grid pozic. Resource-to-position mapping je deterministická permutace per `seed`. Reload scény dá stejný shuffle pattern.

2. **Seed default = 3D spatial hash z cube pozice.** `CUBES.voxelLayers(seed = null)` v `model.js` computuje `|⌊X⌋·73856093 ^ ⌊Y⌋·19349663 ^ ⌊Z⌋·83492791| || 1` pokud caller nedá explicit seed. Cube na pozici (0, 3, 0) má jiný shuffle než (5, 3, 0). Mulberry32 RNG (sdílený z terrain.js).

3. **Insertion order Map zůstává zachován data-side.** `Map<resource, count>` drží original insertion order — DD-56 koncept 9 LIFO mechanika (sez. 53 vzducholoď pick) je **datově nezasažena**, bere `[...VOXELS.keys()].at(-1)` = last inserted resource. Pouze **vizuální** layer separation zmizí.

4. **Pátá surovina `dirt` (hlína).** RESOURCE_REGISTRY rozšířen ze 4 na **5 typů**. Pořadí dle user-spec: `water → sand → dirt → stone → wood`. Insertion order Object.keys určí UI display sekvenci + LIFO pop order (data-side).

5. **Barvy sjednoceny s prod terrain/decor paletou.** Voxel material `MeshLambertMaterial` (= match `_lowpolyMat` shading path; Standard PBR má cca 12 % tmavší diffuse response). Hex kopírují canonical zdroje:
   - water = `0x3a7090` (`_waterMat.color`)
   - sand  = `0xe8d97a` (`BLOCK_COLORS.sand.TOP`)
   - dirt  = `0x8a5e36` (`BLOCK_COLORS.dirt.TOP`)
   - stone = `0x9a9a9a` (`BLOCK_COLORS.stone.TOP`)
   - wood  = `0x5a3e22` (`BARK_BROWN` z `composites/toolkit.js`)

6. **Scatter mode prototype (sez. 51 patch #4).** `scatterRandomVoxels(terrain, sizeX, sizeZ, seed)` v `main.js` rozhází `floor(sizeX * sizeZ / 10)` voxelů na náhodné surface cells (TCUBES top + rampy). Per voxel: random resource z `RESOURCE_NAMES`, tilt quaternion z slope normály:
   - **TCUBES** → identity + random Y rotation (A13 scatter spec)
   - **TRRAMPS** (edge) → slope normála `(0, 1, -1)/√2` rotated by ORIENTATION (45° tilt podél svahu)
   - **TTRAMPS** (corner) → slope normála `(1, 1, 1)/√3` rotated by ORIENTATION
   - **TDRAMP** (diagonal) → fallback identity + random Y (geometricky komplexní lomená rampa, sub-prah)
   - Voxel center = surface midpoint + `VOXEL_EDGE/2` podél slope normály
   
   Per-biome density tabulka (DD-56 koncept 13) je sez. 52 scope — sez. 51 patch je uniform random na valid surface cells.

7. **Rubik posazení** = nejbližší volná TCUBES (= y+1 cell free of TCUBES i ramp) k rohu `(0, 0)` v Euclidean distance. Distribuce 13+13+13+13+12 = 64 voxelů (= V³).

### Acceptance criteria sez. 51 (post-DD-57)

1. Rubik vidět usazený v rohu, žádný z-fight s rampami.
2. 5 barev **zamíchaných** v sub-gridu (žádné horizontální vrstvy).
3. Scatter voxely (~10 @ 10×10) viditelně rozhozené po krajině, ty na rampách viditelně nakloněné podél svahu.
4. Žlutá sand voxel matchuje žlutou sand TCUBES TOP face (= material + hex sjednoceny).
5. F12 console clean, 60 FPS @ 10×10 a 20×20.
6. Reload scény dá identický shuffle pattern (= deterministic per seed).

DD-56 acceptance bod 5 sez. 53 (= „A se vyprázdní layer-by-layer water → sand → stone → wood") **přepíšeme** v sez. 53 — vizuální „vrstvy odhalují" zmizí, místo toho cube se proředí (LIFO data-side správný = postupně mizí wood → stone → dirt → sand → water).

### Sub-prahy z patche

- **Wood/dirt vizuálně blízké hnědé** — `0x5a3e22` vs. `0x8a5e36` rozdíl ~20 % luminance. User akceptováno *„můžeme to nechat být"*, ale pokud signal *„k nepoznání"* přijde, wood za tmavší/červenější tón.
- **TDRAMP slope tilt** — diagonal ramp slope normála vyžaduje per-orientation geometric computation; voxel na cell.Y+0.5 placement (no tilt) pro MVP.
- **Per-voxel hover infotip** — voxel batches jsou shared per resource (žádný 1:1 mesh-instance map), per-voxel raycast přes `hit.instanceId` patří do sez. 52+ (chop interakce).
- **Inline hex duplikace** — 5 voxel barev duplikovaných ze 3 zdrojů (main.js × 2, toolkit.js). Extract `src/palette.js` (pure data) je sub-prah refactor mimo voxel arc scope.

### Reference

- User feedback sez. 51 (chat log) — *„voxely namíchat, rubik je ze čtyř jednobarevných vrstev"* (drop autosort), *„B přidej pátou surovinu"* (5. surovina dirt), *„posaď na nejbližší TCUBES z nejbližšího rohu"* (corner posazení), *„Zkontroluj tu písečnou žlutou"* (material + hex calibration), *„při pozicování na rampy bude třeba voxel sklonit na úhel rampy"* (scatter slope tilt).
- DD-56 koncept 4 (= **superseded** render-side, **drží** data-side jako LIFO mechanika).
- DD-56 koncept 9 (= LIFO data-side správný i pro shuffled render).
- Memory `[[feedback_browser_smoke_test_after_cleanup]]` — F12 console scan po smoke test odhalil `sizeX is not defined` regrese po patch #2 (paralel sez. 48 TAU lesson).
- `src/resources.js` (nový, 142 ř.), `src/model.js` (+95 ř.), `src/main.js` (+~270 ř.).

