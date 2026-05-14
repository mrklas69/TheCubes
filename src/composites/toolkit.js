// src/composites/toolkit.js
// Sdílený toolkit pro procedurální COMPOSITES buildery (DD-49, sez. 40).
//
// Tři odpovědnosti:
//   1. **Paleta konstant** — 6 spectra pro krajinné dekorace (kmeny, listí,
//      kameny, tráva, keře). Hex hodnoty laděné na soulad s `BLOCK_COLORS`
//      v `main.js` (např. GRASS_GREEN = grass.TOP, BARK_BROWN o pár stupňů
//      tmavší než dirt aby kmen vyčníval nad zem).
//   2. **Material cache** — `lowpolyMat(color)` vrací sdílený
//      `MeshLambertMaterial` per barva (1 mat per spectrum, ne per builder
//      call). `flatShading: true` dává faceted lowpoly look.
//   3. **Geometry cache** — `getGeomCache(kind, partKey, factory)` cachuje
//      `BufferGeometry` per (KIND × part). Lazy factory closure = první call
//      vytvoří, další clony získají sdílenou referenci.
//
// Re-export `mulberry32` z `terrain.js` — DRY napříč projektem (DD-49).

import * as THREE from "three";
import { mulberry32 } from "../terrain.js";

// === Paleta konstant ========================================================
// Hex hodnoty v sRGB (Three.js renderer outputEncoding = sRGB). `lowpolyMat`
// nastavuje `material.color.setHex(hex)` → Three.js automaticky převede
// na linear space pro shader (bez explicit `convertSRGBToLinear`, na rozdíl
// od vertex-color pipeline v main.js).
//
// Soulad s `BLOCK_COLORS` v main.js:
//   - GRASS_GREEN (0x6aaa3a) = grass.TOP — izomorfně, tráva v decor i terénu
//     stejná. Tuft pravděpodobně mírně světlejší při flatShading lit angle.
//   - BARK_BROWN (0x5a3e22) tmavší než dirt (0x8a5e36) — kontrast „kmen vs.
//     zem", strom je rozpoznatelný i z dálky.
//   - LEAF_GREEN (0x3d7a2a) tmavší než GRASS_GREEN — koruna stromu vs. tráva.
//   - LEAF_AUTUMN (0xc8722a) — base orange, dříve single hex pro autumn variant.
//     Sez. 44: rozšířeno na 4-color paletu (ORANGE/YELLOW/RED/BROWN), per-instance
//     RNG pick v `buildOak`/`buildBush`. Reálný podzimní les má spektrum, ne
//     monochrom — sousední stromy různý druh = různý hue. Per strom (ne per
//     cluster) = monochromatická koruna, realistický „1 strom = 1 druh".
//   - ROCK_GRAY (0x6e6e72) tmavší než stone TOP (0x9a9a9a) + mírně modřejší —
//     dekorativní kámen vyčnívá nad stone podlahu, není to „odpadlý voxel".
//   - BUSH_GREEN (0x4d8a30) mezi GRASS a LEAF — středně sytá keřová zeleň.
export const BARK_BROWN  = 0x5a3e22;
export const LEAF_GREEN  = 0x3d7a2a;
export const LEAF_AUTUMN        = 0xc8722a;  // ORANGE — javor, dub (base)
export const LEAF_AUTUMN_YELLOW = 0xd8a830;  // YELLOW — bříza, lípa (hue ~45°)
export const LEAF_AUTUMN_RED    = 0xb84020;  // RED    — sumach, javor červený (hue ~10°)
export const LEAF_AUTUMN_BROWN  = 0x8a5028;  // BROWN  — buk po opadu, desaturated (~30° low sat)
// AUTUMN_PALETTE — array pro `randInt` pick v buildery. Pořadí = váha
// frekvence v reálném podzimním lese (orange dominantní, brown nejméně).
export const AUTUMN_PALETTE = [
  LEAF_AUTUMN,         // 0 — ORANGE (modální barva)
  LEAF_AUTUMN_YELLOW,  // 1 — YELLOW
  LEAF_AUTUMN_RED,     // 2 — RED
  LEAF_AUTUMN_BROWN,   // 3 — BROWN
];
export const ROCK_GRAY   = 0x6e6e72;
export const GRASS_GREEN = 0x6aaa3a;
export const BUSH_GREEN  = 0x4d8a30;
// CACTUS_GREEN — sage-green saguaro odstín (mírně desaturovaný, mezi BUSH a šedo-zelenou).
// Méně sytý než BUSH_GREEN (0x4d8a30) protože reálný kaktus má voskovou cuticle
// + světlejší surface. Hex zvolen po porovnání referenčních saguaro fotek.
// Sez. 43 Fáze 6 add (cactus KIND v subtropical.dry).
export const CACTUS_GREEN = 0x4a7a4a;
// Sez. 43 Fáze 6 add — `buildFlower` (temperate.wet louka kvítky) má per-instance
// hue picked z 3-color paletky. Realistická louka = mix odstínů, RNG-driven.
export const FLOWER_PETAL_RED    = 0xd84d3a;  // warm red (vlčí mák, pelargonie)
export const FLOWER_PETAL_YELLOW = 0xf0c040;  // warm yellow (pampeliška, blatouch)
export const FLOWER_PETAL_WHITE  = 0xf5f0e0;  // off-white slightly warm (sedmikráska)
// SNOW_WHITE = stejný off-white jako `BLOCK_COLORS.*_snow.TOP` v main.js
// (DD-47). Konzistence napříč terénem (`grass_snow.TOP`) a DECOR snow caps
// (sez. 40, snowed scatter response). Pure 0xffffff by oslnilo při bright sun.
export const SNOW_WHITE  = 0xf5f5f5;

// === Material cache =========================================================
// `Map<hex, MeshLambertMaterial>` — singleton per barva. Pokud 100 stromů
// sdílí stejnou LEAF_GREEN korunu, je to 1 materiál, ne 100. Three.js by 100
// individuálních materiálů znamenalo 100 separátních shader programů
// při kompilaci a větší state-change overhead při renderu.
//
// **`flatShading: true`** — shader spočítá normálu per fragment z derivativ
// world-space pozice (`dFdx`/`dFdy`). Výsledek: každá ploška geometrie
// dostane jednu konstantní lit-color, hrany jsou viditelné = faceted look
// (na rozdíl od smooth Gouraud, který interpoluje normály mezi vertices).
//
// **Pozor:** flatShading + InstancedMesh = artifact (cross-instance
// derivativní precision drift, tenké seamy mezi sousedy — sez. 34 memory
// `feedback_flat_shading_instanced`). DECOR je regular `Mesh` (Fáze 3),
// ne InstancedMesh — flatShading je tu OK. Pokud Fáze 6 InstancedMesh
// refactor (perf), bude třeba přepnout na vertex-color pipeline + per-face
// normals (jako `_lowpolyMat` v main.js).
const _matCache = new Map();

export function lowpolyMat(color) {
  // `Map.get` vrací `undefined` při miss. Nullish-coalescing assign by byl
  // hezčí, ale `Map` API nemá `getOrSet` — explicit set fallback.
  let mat = _matCache.get(color);
  if (mat !== undefined) return mat;
  mat = new THREE.MeshLambertMaterial({
    color: color,
    flatShading: true,
  });
  _matCache.set(color, mat);
  return mat;
}

// === Geometry cache =========================================================
// `Map<"kind/partKey", BufferGeometry>` — per (KIND × part) singleton. Pokud
// builder `buildSpruce` vytváří 100 stromů, každý se 4 kuželovými patry,
// chceme 1 sdílenou kuželovou geometrii × 4 (varianty per patro), ne 400
// kuželových geometrií. Klíč skládá kind ("spruce") + partKey ("cone_tier0"),
// builder si partKey volí libovolně (string namespace).
//
// Lazy factory closure — `factory` se volá **jen při miss**. Pattern:
//   const trunk = getGeomCache("spruce", "trunk",
//     () => new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6));
// První call vytvoří, další 99 stromů dostane stejnou ref. KISS, no eager
// pre-warming, no manual cache invalidation (geom je immutable per kind/part).
//
// **Sdílení geom napříč meshes:** Three.js dovoluje, aby N meshes referencovaly
// 1 BufferGeometry instanci — pozice/rotace jsou na úrovni `Mesh.position` /
// `Mesh.rotation`, geom samotná je „raw shape". Žádný clone potřeba.
const _geomCache = new Map();

export function getGeomCache(kind, partKey, factory) {
  // Template literal `${kind}/${partKey}` — KISS namespace separator. Pokud
  // partKey obsahuje `/` (kolize), je to bug v builderu — zatím nesetříme.
  const key = `${kind}/${partKey}`;
  let geom = _geomCache.get(key);
  if (geom !== undefined) return geom;
  geom = factory();
  _geomCache.set(key, geom);
  return geom;
}

// === Re-export mulberry32 ===================================================
// DRY — buildery importují přímo z toolkit, ne ze dvou modulů (terrain +
// toolkit). Pokud někdy `mulberry32` přejde do `src/random.js` shared,
// změní se jen tento re-export, klienti zůstanou.
export { mulberry32 };

// === Dev exposure ===========================================================
// `window.toolkit` umožňuje quick test v DevTools konzoli:
//   toolkit.lowpolyMat(toolkit.LEAF_GREEN)   → MeshLambertMaterial
//   toolkit._matCache.size                   → kolik materiálů cachováno
//   toolkit.getGeomCache("test", "box", () => new THREE.BoxGeometry())
// Není v produkční path, jen smoke test pre-Fáze 2.
if (typeof window !== "undefined") {
  window.toolkit = {
    BARK_BROWN, LEAF_GREEN,
    LEAF_AUTUMN, LEAF_AUTUMN_YELLOW, LEAF_AUTUMN_RED, LEAF_AUTUMN_BROWN, AUTUMN_PALETTE,
    ROCK_GRAY, GRASS_GREEN, BUSH_GREEN, CACTUS_GREEN,
    FLOWER_PETAL_RED, FLOWER_PETAL_YELLOW, FLOWER_PETAL_WHITE,
    lowpolyMat,
    getGeomCache,
    mulberry32,
    _matCache,   // dev introspection
    _geomCache,  // dev introspection
  };
}
