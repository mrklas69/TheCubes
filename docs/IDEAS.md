# IDEAS

Raw nápady. Když dozraje, přesuň do `TODO.md`.

## Rozšíření modelu
- **SPRITE** — potomek CUBES s 2D billboard vizualizací (hráč, strom, mob).
- **INVISIBLE** — potomek CUBES bez vizualizace (spawn point, marker).
- **TERRAIN** — potomek CUBES s texturou/barvou dle typu (ICE, GRASS, SAND, …). → DONE (sez. 2): základní verze s atributem `COLOR`. Typizace (ICE/GRASS/SAND) zůstává nápad do budoucna.
- **Nevizualizované OBJECTS** — pravidla, recepty, timery, score. Dědí z OBJECTS přímo, ne z CUBES.

## Chování v čase
- Až bude "čas něco dělat": jak? Pravidla (PocketStory style), per-object `tick()`, subscription na TIME? Rozhodneme, až to bude opravdu potřeba.

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
