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
- **HOUSE** — konkrétní COMPOSITES: kvádr stěn (BoxGeometry) + jehlanová střecha (ConeGeometry, 4 segmenty). Atribut `COLOR` barví stěny; barva střechy je fixní v enginu (rezavě červená). *(M8.)*
- **CLOUD** — konkrétní COMPOSITES: shluk 5 překrývajících se koulí (SphereGeometry) s bílou barvou. Bez vlastních atributů. Typicky vysoko nad scénou s `ANIMATE.kind = "drift"`. *(M8.)*
- **TERRAIN** *(obsolete)* — historický název pro CCUBES; přejmenováno v M3 (DD-13). Pojem „terén" se vrátí až jako *typizovaný* potomek CCUBES (ICE/GRASS/SAND) — pokud bude potřeba.

## Čas

- **TIME** — globální čítač tiků. Monotonně rostoucí nezáporné celé číslo. Určené pro **diskrétní události** (pravidla, timery — mechanismus zatím nezaveden).
- **tick** — jedno zvýšení TIME o 1. Tikne jednou za sekundu.
- **ANIMATE** — atribut `OBJECTS` s receptem plynulého pohybu: `null` (default, statický) nebo objekt `{ kind: "<string>", ...params }`. Engine v render loopu volá `updateAnimations(tSeconds)` s wall-clockem (`performance.now() / 1000`), lookup `ANIMATORS[anim.kind]` dispatchuje na konkrétní per-frame funkci. Viz DD-15. Aktuální `kind`y: `balloon_bob`, `tree_sway`, `rotate`, `orbit_stadium`, `pulse`, `drift`. Tři osy mutace: **díly** (`balloon_bob`, `tree_sway` — `group.userData.parts`), **transformace** (`rotate`, `orbit_stadium`, `drift` — `object3d.rotation`/`position`), **materiál** (`pulse` — `material.emissive*`, volitelně `opacity`). *(M7.)*
- **base** — `object3d.userData.base = { x, y, z }` — snapshot počáteční polohy instance, pořízený při `registerAnimator`. Transformační animátory (`orbit_stadium`, budoucí `drift`) z něj čtou referenční bod (střed dráhy). Nezávislý na `userData.parts` (ten drží díly COMPOSITES).
- **balloon_bob** — `ANIMATE.kind`: vak sinusově pohupuje (period/amplitude), koš nezávisle s fázovým posunem, lana přepnuta přes `updateCylinderBetween` → viditelně mění délku. Sahá na vnitřní díly v `group.userData.parts`.
- **tree_sway** — `ANIMATE.kind`: 3 kužely koruny se kývají v XZ rovině jako dvě kolmé sinusoidy s různými periodami (`periodX`, `periodZ`) → eliptický pohyb, ne 1D kyvadlo. Amplituda násobena koeficientem výšky kuželu (špička víc, spodní kužel míň). Kmen statický. Sahá na vnitřní díly v `group.userData.parts`.
- **rotate** — `ANIMATE.kind`: rovnoměrná rotace celého Object3D kolem zadané osy. Parametry `axis` ("x"/"y"/"z", default "y") a `period` (doba jednoho otočení v sekundách). Generický — mutuje `object3d.rotation` přímo, nevyžaduje `userData.parts`. Funguje napříč třídami (TCUBES, COMPOSITES, …).
- **orbit_stadium** — `ANIMATE.kind`: uzavřená oválná dráha (atletický ovál = 2 rovné úseky + 2 půlkruhy) v rovině XZ kolem `userData.base`. Parametry `length` (L, rovná část; dlouhá osa X), `radius` (R, poloměr oblouku; krátká osa 2R), `period` (T, doba oběhu). Heading (`rotation.y`) sleduje tečnu dráhy → NORTH strana vždy ukazuje dopředu jako auto na trati.
- **drift** — `ANIMATE.kind`: lineární pohyb po jedné ose s **wrap-around** — když objekt opustí pás šířky `range`, vrátí se z opačné strany (skok). Parametry: `axis` ("x"/"y"/"z", default "x"), `speed` (j/s, default 1.0), `range` (šířka pásu v jednotkách, default 16). Pozice obíhá v intervalu `[base - range/2, base + range/2]` kolem `userData.base`. Idiom „mrak po obloze"; pro vysoko umístěné objekty je skok na hranici viewportu minimálně rušivý.
- **pulse** — `ANIMATE.kind`: emisivní pulsace — objekt sinusově mění `material.emissiveIntensity` mezi `min` a `max` s danou `period`. Parametry: `period` (doba cyklu v s), `min` (default 0 = zhasnuto), `max` (default 1.0 = plná síla barvy), `color` (optional 0xRRGGBB; default = `material.color`). Volitelně dvojice `opacityMin`/`opacityMax` — pokud je zadán alespoň jeden, engine zapne `transparent = true` a synchronně s emissive mění i `material.opacity` (max záře ⇔ max neprůhlednost, „dýchá"). Lazy init `emissive` barvy přes `userData.pulseInit` flag. Funguje na jakémkoli mesh-u s `MeshStandardMaterial` (CCUBES, BALLOON vak, …); tiché skip pro materiály bez `emissive` (SpriteMaterial, ShadowMaterial, pole materiálů TCUBES).

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
- **M7** — Chování v čase: atribut `ANIMATE` na OBJECTS (DD-15), dispatch `balloon_bob` + `tree_sway` v enginu. Balón se pohupuje, koš pruží, lana se přepočítávají; strom se kývá ve větru. *(hotovo sez. 5.)*
- **M8+** — pozdější milníky: dynamický ocásek SPRITES, ROCK, nevizuální potomci OBJECTS, diskrétní `TIME.tick` reakce (pravidla/timery, otevírá DD-04).
