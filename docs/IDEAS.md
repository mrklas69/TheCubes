# IDEAS

Raw nápady. Když dozraje, přesuň do `TODO.md`.

## Rozšíření modelu
- **SPRITES** — potomek CUBES s 2D billboard vizualizací (dialog bubble, 2D postava, label). Atribut `ASSET`. *(přejmenováno z `SPRITE` v sez. 3 kvůli konzistenci s OBJECTS/CUBES plural konvencí.)*
- **COMPOSITES** — potomek CUBES s 3D mesh z primitivů (strom, balón). → DONE (sez. 3): základní třída + `TREE` (M3) + `BALLOON` (M4, float pozice). Další kandidáti: **HOUSE**, **ROCK**, **CLOUD**.
- **TCUBES** — potomek CUBES s per-face texturami (TOP/BOTTOM/NORTH/SOUTH/EAST/WEST). Nevyplněná plocha fallback šachovnice. *(M6.)*
- **WCUBES** *(nápad)* — wireframe varianta mateřské CUBES, pokud bude potřeba odlišný „draft" idiom od šachovnice.
- **INVISIBLE** — potomek CUBES bez vizualizace (spawn point, marker). *(možná zbytečné — stačí mateřská CUBES s NAME="marker"?)*
- **CCUBES typizace** — potomek CCUBES s paletou (ICE, GRASS, SAND, …). Historicky navrhováno jako `TERRAIN`; pojem se může vrátit tady, pokud bude potřeba typizovaná rodina.
- **Nevizualizované OBJECTS** — pravidla, recepty, timery, score. Dědí z OBJECTS přímo, ne z CUBES.

## Chování v čase
- Až bude „čas něco dělat": jak? Pravidla (PocketStory style), per-object `tick()`, subscription na TIME? Rozhodneme, až to bude opravdu potřeba.

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
