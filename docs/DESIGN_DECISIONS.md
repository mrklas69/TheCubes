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

