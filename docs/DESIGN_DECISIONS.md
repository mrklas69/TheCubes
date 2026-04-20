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

## DD-09 — Výchozí osvětlení: DirectionalLight z (-10, -10, 10) na (0, 0, 0) *(nahrazeno DD-10)*
~~Hlavní směrové světlo (sun) má pozici `(-10, -10, 10)` a cíl v počátku.~~
**Superseded:** Y = -10 znamená v Three.js (Y-up) pozici **pod** scénou, což dávalo osvětlení "zespodu". Viz DD-10.

## DD-10 — Výchozí osvětlení: DirectionalLight z (-10, 10, 10) na (0, 0, 0)
Hlavní směrové světlo (sun) má pozici `(-10, 10, 10)` — zleva, shora, vepředu — a cíl v počátku (`target.position = (0, 0, 0)`, default). Intenzita `0.8`, barva `0xffffff`. Doplňuje ho AmbientLight `0.4` pro změkčení stínů.
**Důvod:** Three.js používá Y-up konvenci (osa Y směřuje nahoru). Pozice z DD-09 měla Y = -10, tj. světlo svítilo zespodu — neintuitivní výchozí stav. Nová pozice `(-10, 10, 10)` dává klasické nasvětlení "zleva shora", které odpovídá očekávání (přirozené slunce).
**Nahrazuje:** DD-09.

## DD-08 — Infotip panel na hover nad instancí
Najetí myší na libovolnou 3D reprezentaci instance zobrazí hover tooltip s atributy. Obsah: název třídy (`instance.constructor.name`) jako nadpis, pak seznam `klíč: hodnota` přes `Object.entries(instance)`. Tooltip sleduje kurzor s offsetem.
**Důvod:** izomorfismus — jeden vzor pro všechny budoucí třídy (TERRAIN, SPRITE, INVISIBLE, …). Generický přístup = nulová práce při přidávání nových tříd; stačí propojit mesh s instancí přes `mesh.userData.instance`. Inspirace: PocketStory entity popover.

## DD-07 — Default vizualizace mateřské CUBES = šachovnicová textura
Instance samotné třídy `CUBES` (bez specializace potomkem) se vykreslí se šachovnicovou texturou — stejným vzorem, jaký používají grafické editory (Photoshop/GIMP/Figma) pro průhledné pozadí.
**Důvod:** Vizuální signál "vizuál není definován / je to placeholder". Izomorfismus s konvencí z grafických editorů — uživatel ten vzor ihned dekóduje. Potomci CUBES (TERRAIN, SPRITE, …) override vlastní vizualizací; pokud override neposkytnou, zdědí šachovnici. To dělá "abstraktnost" mateřské třídy okamžitě čitelnou i ve scéně.

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
