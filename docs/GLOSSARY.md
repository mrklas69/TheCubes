# Glossary

Canonical terminologie projektu TheCubes.

## Model

- **OBJECTS** — kořenová třída všeho v modelu. Atributy: `ID varchar(32)`, `NAME varchar(64)`, `DESCRIPTION varchar(1024)`. Všechny třídy (vizuální i nevizuální) dědí z OBJECTS.
- **CUBES** — potomek OBJECTS pro cokoli s polohou v prostoru. Atributy navíc: `X`, `Y`, `Z` (diskrétní int — voxel grid). Default vizualizace = voxel krychle, potomci override. Pojem "cube" je projektová značka, ne technická klasifikace.
- **TERRAIN** — potomek CUBES s atributem `COLOR` (JS number 0xRRGGBB). Override default šachovnice (DD-07) plochou barvou. První konkrétní potomek CUBES — zaveden v M2 jako demonstrace override vizualizace.
- **SPRITE** *(plánováno)* — potomek CUBES, render jako 2D billboard (hráč, strom, mob).
- **INVISIBLE** *(plánováno)* — potomek CUBES, bez vizualizace (spawn point, marker).

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. V M1 objekty na TIME samy nereagují — je to jen "hodiny na stěně".
- **tick** — jedno zvýšení TIME o 1. V M1 tikne jednou za sekundu.

## UI

- **HUD** (head-up display) — malý překryvný panel v rohu scény pro globální stavy (zatím jen `TIME`).
- **Infotip** — hover panel zobrazený po najetí myší na 3D reprezentaci instance. Obsah: název třídy + všechny vlastní atributy instance. Generický přes `Object.entries` — funguje pro libovolnou třídu dědící z OBJECTS. Viz DD-08.
- **Šachovnicová textura** — vizuální idiom "vizuál není definován" (jako průhledné pozadí v PS/GIMP). Default vizualizace instance mateřské třídy `CUBES`. Potomci override. Viz DD-07.

## Milníky

- **M1** — statická 3D scéna s jednou kostkou, ovládatelná kamera, tikající TIME v HUDu, hover infotip. *(hotovo sez. 1.)*
- **M2** — orientační pomůcky (GridHelper, AxesHelper) + první potomek `CUBES` (`TERRAIN`) + 3×3 grid. *(hotovo sez. 2.)*
- **M3+** — pozdější milníky: `SPRITE`, `INVISIBLE`, chování v čase, nevizuální potomci OBJECTS.
