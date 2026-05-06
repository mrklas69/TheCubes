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
   - Sdílí: snap-to-int (DD-12), procedurální `BufferGeometry` v engine, `faceMaterialFor` dispatch (DD-14), `:named-textures` paleta, atribut `ORIENTATION` (integer 0..3 = počet 90° CCW rotací).

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

Pixel-art identita zachována napříč všemi vrstvami: NearestFilter, 16×16 textury, voxely 0.125 j, sdílená paleta `:grass-top`/`:grass-side`/`:dirt`/`:stone`. To drží vizuální koherenci.

**Důsledek:**
- Sez. 16 cleanup: VOXEL_MODEL `tunel-grass` (3×3×3 TC) nahrazen 2× `TTUNELS` (1×1×1 TC) na pozicích tunel_left a tunel_right; `ramp-grass` VOXEL_MODEL nahrazen `TRRAMPS` na rampě (-4, 0, 0). Asset soubory `tunel-grass.*` a `ramp-grass.*` smazány. Z VOXEL_MODEL použití zbývá jen `cube-grass.vox` šablona pro DD-24.
- DD-23 zůstává v immutable logu jako historický kontext; **revizováno** DD-25 v tom smyslu, že voxelová identita platí pro Voxely (vrstva 2), ne pro celou scénu.
- DD-24 (shape × surface) zůstává platný, ale **omezený rozsah**: pre-build skript se týkal VOXEL_MODELů s jednolitým povrchem. Po DD-25 jsou tyto bloky procedurální (TCUBES/TRRAMPS/TTRAMPS/TTUNELS), takže shape × surface jako asset pipeline je redundantní pro standardní bloky. DD-24 se může uplatnit pro budoucí komplexní VOXEL_MODELy (vrstva 4).
- Nová `BLOCKS` abstract třída v `model.js` — značkovací parent CCUBES/TCUBES/TRRAMPS/TTRAMPS/TTUNELS.
- Hover highlight (sez. 16) — emissive boost na celém objektu, lazy clone-on-first-hover materiálu (zachovává sdílení v TREE `_treeMatCache`).
