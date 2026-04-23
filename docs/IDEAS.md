# IDEAS

Raw nápady. Když dozraje, přesuň do `TODO.md`.

## Rozšíření modelu
- **SPRITES** — potomek CUBES s 2D billboard vizualizací (dialog bubble, 2D postava, label). Atribut `ASSET`. → DONE (sez. 4, M5): třída + canvas-generovaná dialogová bublina s komix ocáskem + instance `dialog_0001` nad stromem. Dynamický 3D ocásek (mířit na mluvčího z libovolného směru) zatím odložen. → DONE (sez. 8, DD-16).
- **COMPOSITES** — potomek CUBES s 3D mesh z primitivů (strom, balón). → DONE (sez. 3): základní třída + `TREE` (M3) + `BALLOON` (M4, float pozice) + `HOUSE` a `CLOUD` (sez. 7). Zbývající kandidát: **ROCK**. → DONE (sez. 8): ROCK. → DONE (sez. 10): **CHARACTER** (humanoid s kloubovou kostrou, DD-18).
- **TCUBES** — potomek CUBES s per-face texturami (TOP/BOTTOM/NORTH/SOUTH/EAST/WEST). Nevyplněná plocha fallback šachovnice. → DONE (sez. 4, M6): třída + dispatch `faceMaterialFor` (DD-14) + instance `tbox_0001` (emoji krabice) a `tbox_0002` (hvězda + 5× fallback).
- **WCUBES** *(nápad)* — wireframe varianta mateřské CUBES, pokud bude potřeba odlišný „draft" idiom od šachovnice.
- **INVISIBLE** — potomek CUBES bez vizualizace (spawn point, marker). *(možná zbytečné — stačí mateřská CUBES s NAME="marker"?)*
- **CCUBES typizace** — potomek CCUBES s paletou (ICE, GRASS, SAND, …). Historicky navrhováno jako `TERRAIN`; pojem se může vrátit tady, pokud bude potřeba typizovaná rodina.
- **Nevizualizované OBJECTS** — pravidla, recepty, timery, score. Dědí z OBJECTS přímo, ne z CUBES. → PARTIAL (sez. 9): **TIMER** (DD-17, `INTERVAL + ACTION`, engine `ACTIONS` dispatch `toggle`/`set`) a **COUNTER** (`VALUE + INCREMENT` v HUD) hotové. Demo: `timer_0001` toggle `balloon.LIT` každých 5 s, `counter_0001` „Skóre" v HUD. **Zbývající:** RULE framework (condition + action), BRAIN (per-entity chování), pravidla/recepty s kombinačními ACTION.

## Chování v čase
- Až bude „čas něco dělat": jak? Pravidla (PocketStory style), per-object `tick()`, subscription na TIME? → DONE (sez. 5, M7): data-driven atribut `ANIMATE = { kind, ...params }` na `OBJECTS`, dispatch v enginu (DD-15). První dvě `kind`y: `balloon_bob` a `tree_sway`. Sez. 6 + 7 doplnily `rotate`, `orbit_stadium`, `pulse` (s volitelným opacity), `drift` (lineární s wrap-around). Sez. 10 (DD-18) rozšířil ANIMATE na „mode slot" — statické pózy (`sit`, `lie`) i stavové automaty (`wander`) sdílejí dispatch. Diskrétní události: `TIMER` + `ACTION` (DD-17, sez. 9).
- **Sekvenční chování** (zvedání, pokládání, přechody mezi pózy) — nepokryté mode slotem (ten drží jen aktuální stav, ne trajektorii mezi stavy). Kandidáti: (a) transition animátor přebírající interpolaci mezi snapshotem páteře a cílem, (b) keyframe systém po vzoru tradiční animace, (c) skriptovaný ANIMATE.kind s fázemi. Rozhodne se, až bude konkrétní use case.

## AI / automaty
- **Wander** jako první automat (sez. 10) — stavový automat uvnitř animátoru, random transitions bez goal-seeking. Další kroky:
  - **Utility-based selection** místo plain random — váha stavů podle kontextu (poblíž balvanu → preferuj work; večer → preferuj sit/lie).
  - **Perception** — postava vidí okolí, reaguje (jiná postava blízko → stop, interakce; balón svítí → sit a hleď).
  - **Need system** (hlad/únava/nuda) — utility váhy driver-ované stavem, ne jen kontextem.
  - **Multi-char koordinace** — dva characters se domluví na work (jeden z druhé strany kamene).
- **Pathfinding** — aktuálně kolize = stop & transition (DD-19). Pro cílený pohyb (jít k rock i přes překážku) nutný graf/A* (nový systém, ne drobný refaktor).

## Mobilita napříč výškami (auta, vlaky, hráč)
Jak se pohyblivá entita dostane z nižší kostky na vyšší? Voxelový svět má diskrétní Y a entity nechtějí „skákat" přes hrany. Kandidáti:
- **Rampy** — speciální kostka se šikmou geometrií (3D iso tile klasika: SimCity, RCT, Minecraft slabs/stairs). Nová třída v rodině CUBES (`RCUBES`?) nebo atribut `SLOPE = { dir, angle }` na CCUBES/TCUBES (data-driven, izomorfní s `ANIMATE`/`TEXTURE_*`).
- **Schodovitý terén** — každý krok = plná kostka, entita hopsá o 1 voxel (Minecraft). KISS, drží voxel identitu, ale auta/vlaky působí nepřirozeně (kodrcání).
- **Heightmap / heightfield** — každý tile má vlastní Y, povrch se interpoluje trojúhelníky (Transport Tycoon hills). Plynulé, ale opouští voxel estetiku — *nepasuje do koncepce TheCubes*.
- **Z-levels / patra** — voxely zůstávají, pohybové vrstvy jsou oddělená patra propojená lokálními přechody (výtah, schody, díra). Dwarf Fortress pattern.
- **Splines / track graf** — silnice/koleje jsou spline-křivky nezávislé na voxelech, entita jezdí po křivce, voxely jen dekorace (TT vlaky po kolejích).
- **Logický pathing graf** — engine neřeší geometrii, ale graf „z tile A do tile B lze", entity animují přejezd mezi uzly. Turn-based (Civilization). **Silný koncept pro sandbox s `TIME.tick` pravidly** — izomorfie s tím, jak `ANIMATE` oddělil chování od modelu.
- **Anti-gravity / wall-climb** — entity nemají gravitaci, jezdí po čemkoli (Sonic, Mario Galaxy). Pro kreativní sandbox zajímavé, pro vlaky ne.

Poznámka: rampy / schody řeší jen *geometrii*, splines / graf oddělí **pohyb od prezentace** — to je hlubší. V TheCubes nejspíš mix: **rampy/schody pro vizuální terén** + **graf pro logiku pohybu** (co z kam lze, pravidla jízdy). Rozhodne se, až přijde první pohyblivá entita (auto/vlak/hráč) a bude jasné, co s tím má dělat.

## Režimy světa
- Minecraft-like voxel terén
- Iso-tile Transport Tycoon
- Factorio-like automatizace
- Desková hra (Board-style)

## UI nad modelem
- Editor modelu přímo v prohlížeči — formulář na vytvoření potomka třídy?
- Nebo zatím jen úprava kódu, editor až později?

## Inspirace
- PocketStory `Board` view (Three.js diorama + meeples)
- Smalltalk image-based programming
- OOP databáze s živou vizualizací
