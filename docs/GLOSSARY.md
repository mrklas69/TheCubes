# Glossary

Canonical terminologie projektu TheCubes.

## Model

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`. Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (float, DD-12 — sdílený souřadný systém; voxelové potomky si pozici v rendereru zaokrouhlí). Default vizualizace = voxel krychle se šachovnicí (DD-07), potomci override. Pojem „cube" je projektová značka, ne technická klasifikace.
- **CCUBES** (color cubes) — potomek CUBES s atributem `COLOR` (JS number 0xRRGGBB). Plochá barva všech 6 ploch. Nahrazuje dřívější `TERRAIN` (DD-13). Zaveden v M2, přejmenován v M3.
- **TCUBES** (texture cubes) — potomek CUBES s šesti atributy `TEXTURE_TOP`, `TEXTURE_BOTTOM`, `TEXTURE_NORTH`, `TEXTURE_SOUTH`, `TEXTURE_EAST`, `TEXTURE_WEST`. Hodnota každé strany: `null` → fallback šachovnice (DD-07), `number` 0xRRGGBB → plocha barva, string hex (`"#rrggbb"`) → barva, jiný string (emoji, text) → canvas s textem vycentrovaným. Mapování světových stran na Three.js osy: TOP=+Y, BOTTOM=−Y, EAST=+X, WEST=−X, SOUTH=+Z, NORTH=−Z. Dispatch viz DD-14. *(M6.)*
- **SPRITES** — potomek CUBES vizualizovaný jako 2D billboard (obrázek vždy otočený ke kameře). Atribut `ASSET`: `null` → fallback šachovnicový billboard, `string` → canvas-generovaná dialogová bublina s textem a komix ocáskem dolů. Použití: dialog bubble, label, 2D entita. Pozice float (DD-12), sprite stíny neumí (záměr). Dispatch viz DD-14. *(M5.)*
- **COMPOSITES** — potomek CUBES vizualizovaný jako 3D mesh složený z Three.js primitivů (`Group` s více meshi). Pozice spojitá (float), bez snap-to-grid. Zaveden v M3.
- **TREE** — konkrétní COMPOSITES: kmen (CylinderGeometry) + 3 kužely koruny (ConeGeometry). První ukázka 3D procedurálního tvaru. *(M3.)*
- **BALLOON** — konkrétní COMPOSITES: vak (SphereGeometry) + 4 lana (CylinderGeometry) + koš (BoxGeometry). Atribut `COLOR` barví vak. Umístěn typicky na **float** pozici mimo grid (demonstrace DD-12). *(M4.)*
- **TERRAIN** *(obsolete)* — historický název pro CCUBES; přejmenováno v M3 (DD-13). Pojem „terén" se vrátí až jako *typizovaný* potomek CCUBES (ICE/GRASS/SAND) — pokud bude potřeba.

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. V M1 objekty na TIME samy nereagují — je to jen „hodiny na stěně".
- **tick** — jedno zvýšení TIME o 1. V M1 tikne jednou za sekundu.

## Grafika

- **Asset** — obecný pojem pro libovolný grafický zdroj (texture, sprite image, procedurální mesh, …). Zastřešuje všechny podtypy.
- **Texture** — 2D obraz aplikovaný na **plochu** meshe. Použití: per-face TCUBES, šachovnice na mateřské CUBES.
- **Sprite** — 2D obraz vždy otočený **ke kameře** (billboard). Použití: SPRITES třída.
- **Decal** *(plánováno, možná)* — texture projektovaná na existující povrch. Zatím nepoužíváme.
- **Label** / **Bubble** *(plánováno)* — UI sprite přivázaný k entitě (jméno, dialog). Speciální případ SPRITES.

## UI

- **HUD** (head-up display) — malý překryvný panel v rohu scény pro globální stavy (zatím jen `TIME`).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Šachovnicová textura** — vizuální idiom „vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.

## Milníky

- **M1** — statická 3D scéna s jednou kostkou, ovládatelná kamera, tikající TIME v HUDu, hover infotip. *(hotovo sez. 1.)*
- **M2** — orientační pomůcky (GridHelper, AxesHelper) + první potomek `CUBES` (tehdy `TERRAIN`, dnes `CCUBES`) + 3×3 grid. *(hotovo sez. 2.)*
- **M3** — COMPOSITES + TREE (3D strom z primitivů), float souřadný systém (DD-12), terminologie potomků (DD-13). *(hotovo sez. 3.)*
- **M4** — BALLOON (COMPOSITES mimo grid) — demonstruje float pozici v jednotném souřadném systému. *(hotovo sez. 3.)*
- **M5** — SPRITES (dialog bubble nad stromem, canvas-generovaný text + komix ocásek). *(hotovo sez. 4.)*
- **M6** — TCUBES (per-face textury, emoji na krabici + fallback šachovnice). DD-14 zafixoval dispatch podle typu atributu sdílený s SPRITES. *(hotovo sez. 4.)*
- **M7+** — pozdější milníky: chování v čase, dynamický ocásek SPRITES, další COMPOSITES (HOUSE/ROCK/CLOUD), nevizuální potomci OBJECTS.
