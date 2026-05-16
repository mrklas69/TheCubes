// src/composites/builders.js
// Procedurální buildery COMPOSITES dekorací (DD-49, sez. 40, Fáze 2).
//
// 5 KIND-ů pro krajinu:
//   - spruce      — smrk (kuželová patra na úzkém kmeni)
//   - oak         — dub (kulovité listové clusters na silnějším kmeni)
//   - bush        — keř (low cluster, žádný kmen)
//   - rock        — kámen (1-3 Icosahedron chunks)
//   - grass_tuft  — chomáč trávy (3-5 thin shards)
//
// Každý builder má signaturu `(group, opts) → group`:
//   - `group`: THREE.Group nebo Object3D, kam se appendují child meshes.
//             Builder NEVYTVÁŘÍ Group sám — caller (createDecor v main.js)
//             passne Group s nastavenou pozicí v world space.
//   - `opts.seed`: integer, deterministický RNG seed. Stejný seed = stejný strom.
//   - `opts.scale`: multiplikátor pro celkové rozměry (default 1.0).
//
// Sdílená geometrie přes `getGeomCache(kind, partKey, factory)` — 1 geom
// instance × N decorations stejného typu. Variace per instance řešena
// **transformem** (`mesh.position`, `mesh.rotation`, `mesh.scale`), ne
// per-instance geom deformací — cache by ztratila smysl.

import * as THREE from "three";
import {
  lowpolyMat,
  getGeomCache,
  mulberry32,
  BARK_BROWN,
  LEAF_GREEN,
  LEAF_AUTUMN,
  AUTUMN_PALETTE,
  ROCK_GRAY,
  GRASS_GREEN,
  BUSH_GREEN,
  CACTUS_GREEN,
  FLOWER_PETAL_RED,
  FLOWER_PETAL_YELLOW,
  FLOWER_PETAL_WHITE,
  SNOW_WHITE,
} from "./toolkit.js";

// `Y_AXIS` — sdílený unit-vector pro `setFromUnitVectors`. Použito v palm/cactus
// builderech pro orientaci listů/paží do libovolného směru (apex Cone/Cylinder
// se natočí ve směru `dir`). Three.js má `Object3D.DEFAULT_UP`, ale to je
// mutable — vlastní const je bezpečnější.
const Y_AXIS = new THREE.Vector3(0, 1, 0);

// === Pomocné funkce =========================================================
// `randRange(rng, lo, hi)` — uniformní float ∈ [lo, hi). `rng()` vrací [0, 1).
function randRange(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

// `randInt(rng, lo, hi)` — inclusive integer ∈ [lo, hi]. Math.floor(rng() *
// (hi - lo + 1)) je standard idiom.
function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// Pozn. ke stínům: builders nenastavují `castShadow` / `receiveShadow` per mesh.
// `createMeshFor` v main.js po dispatch dělá `traverse((child) => ...)` který
// to nastaví na oba `true` (default pro vizuální entity). DD-49 spec původně
// počítala s `receiveShadow=false` pro decor (marginal perf save), ale to by
// vyžadovalo opt-out flag analogický `noShadow` — sub-prah pro Fáze 5 podle
// vizuálního/perf testu.

// `recolorTopChild(group, candidates, color)` — najde mesh v `candidates` s
// nejvyšší `position.y` a nahradí jeho material za `lowpolyMat(color)`. Used
// pro snow caps na zasněžených DECOR (sez. 40 follow-up): top koruna /
// cluster / chunk je „posypaný shora" SNOW_WHITE, ostatní zachovají barvu.
// `candidates` musí být subset `group.children` — vylučujeme kmen (BARK_BROWN
// by ztratil identitu pokud by se přebarvil).
function recolorTopChild(candidates, color) {
  if (candidates.length === 0) return;
  let top = candidates[0];
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].position.y > top.position.y) top = candidates[i];
  }
  top.material = lowpolyMat(color);
}

// === buildSpruce — smrk (jehličnan, kuželová patra) =========================
// Anatomie:
//   - kmen: úzký Cylinder (radiusTop 0.06, radiusBottom 0.09, 6 segmentů)
//   - 3-5 patro: Cone, radius zmenšující od dole nahoru (`tier_i` cache key).
//     Patra se mírně překrývají (Y posun < tier height), aby kmen byl skoro
//     skrytý — typický smrkový profil.
// Random variace: počet pater, total height, mírná Y rotace celého stromu.
export function buildSpruce(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  // Total height ∈ [1.4, 2.2], aplikováno přes group.scale (níž).
  const tierCount = randInt(rng, 3, 5);
  const trunkHeight = randRange(rng, 0.5, 0.7);   // viditelný kmen pod patry
  const tierHeight  = randRange(rng, 0.45, 0.6);  // výška jednoho patra
  const tierOverlap = 0.15;  // o kolik se patra překrývají (= méně visible kmenu)

  // Kmen — geom sdílená pro všechny smrky. Cylinder(radiusTop, radiusBottom,
  // height, radialSegments). 6 segmentů = hexagonal kmen, faceted look.
  const trunkGeom = getGeomCache("spruce", "trunk",
    () => new THREE.CylinderGeometry(0.06, 0.09, 1.0, 6));
  const trunk = new THREE.Mesh(trunkGeom, lowpolyMat(BARK_BROWN));
  trunk.scale.y = trunkHeight + tierCount * (tierHeight - tierOverlap);
  trunk.position.y = trunk.scale.y / 2;
  group.add(trunk);

  // Patra — Cone(radius, height, radialSegments). 6 segmentů hexagonal.
  // Bottom patro nejširší (radius ~0.55), top nejužší (~0.25). Pokud snowed,
  // **všechna patra** SNOW_WHITE (kmen zachová BARK_BROWN) — celý strom
  // zasněžený, jen kmen prokoukne. User feedback sez. 40: top-only vypadalo
  // jako "vánoční ozdoba", celý strom bílý je realistický zimní strom.
  //
  // Spruce je **jehličnan** — autumn season ho nepřebarvuje (LEAF_GREEN drží
  // i v podzimu). LEAF_AUTUMN paletu používají jen listnaté: oak + bush.
  //
  // Sez. 43 Fáze 6 add — `dead` flag priorita `dead > snowed > default`.
  // Dead spruce = no tiers (skeleton/sušený), trunk-only render. Pokud `dead`,
  // přeskočíme tier loop celý.
  if (opts.dead) {
    group.rotation.y = randRange(rng, 0, Math.PI * 2);
    group.scale.multiplyScalar(scale);
    return group;
  }
  const leafColor = opts.snowed ? SNOW_WHITE : LEAF_GREEN;
  for (let i = 0; i < tierCount; i++) {
    // Lerp radius dle pozice patra od dole nahoru (i=0 dole, i=tierCount-1 top).
    const t = i / Math.max(1, tierCount - 1);
    const radius = 0.55 - t * 0.30;  // 0.55 → 0.25
    const partKey = `cone_t${i}_of${tierCount}`;
    const tierGeom = getGeomCache("spruce", partKey,
      () => new THREE.ConeGeometry(radius, tierHeight, 6));
    const tier = new THREE.Mesh(tierGeom, lowpolyMat(leafColor));
    // Y pozice patra: trunk top + i × (tierHeight - overlap) + tierHeight/2
    tier.position.y = trunkHeight + i * (tierHeight - tierOverlap) + tierHeight / 2;
    group.add(tier);
  }

  // Náhodná Y rotace celého stromu — 6-segmentová kmen/patra by jinak měla
  // viditelný „flat front face" vždy stejně orientovaný.
  group.rotation.y = randRange(rng, 0, Math.PI * 2);
  group.scale.multiplyScalar(scale);
  return group;
}

// === buildOak — dub (listnatý, kulovité clusters) ===========================
// Anatomie:
//   - kmen: silnější Cylinder (radius 0.10/0.14), vyšší visible část než smrk
//   - 2-4 listové clusters: Icosahedron(radius=1, detail=0) = 20-stěn,
//     scaled per cluster pro variabilitu. Pozice clusterů kolem apex kmene.
export function buildOak(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const clusterCount = randInt(rng, 2, 4);
  const trunkHeight = randRange(rng, 0.9, 1.3);

  // Kmen — silnější než smrk (radius 0.10 top, 0.14 bottom), vidět víc.
  const trunkGeom = getGeomCache("oak", "trunk",
    () => new THREE.CylinderGeometry(0.10, 0.14, 1.0, 6));
  const trunk = new THREE.Mesh(trunkGeom, lowpolyMat(BARK_BROWN));
  trunk.scale.y = trunkHeight;
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  // Listové clusters — Icosahedron(1, 0) = 20-stěn unit-radius. Per cluster
  // scaled + offset kolem apex. Detail=0 = nejhrubší (faceted, lowpoly).
  //
  // **Sez. 41 DD-50 follow-up: listnaté v zimě opadávají.** Pokud `snowed`
  // (= winter cell), skip cluster loop celý — vykreslí se jen kmen (holý
  // strom). Spruce drží jehličí, oak/bush ne. Tím seasonal cycle:
  //   spring/summer → LEAF_GREEN, autumn → LEAF_AUTUMN, winter → bare trunk.
  // Build cluster geom only when potřeba — getGeomCache je lazy, kdyby všechny
  // duby v scéně byly snowed, geom cache by ho nevytvořila vůbec.
  //
  // **Sez. 43 Fáze 6 add — `dead` flag priorita `dead > snowed > autumn > default`.**
  // Dead oak = trunk-only (sušený strom v dry biomě). Visually podobné snowed
  // oak (oba kmen-only), KISS: stejná větev. Sub-prah pro `BARK_DEAD` darker
  // paletu kdyby visual differentiation potřeba.
  if (!opts.snowed && !opts.dead) {
    const clusterGeom = getGeomCache("oak", "cluster",
      () => new THREE.IcosahedronGeometry(1.0, 0));

    // Sez. 44 Fáze 6 — autumn hue picked per-strom z AUTUMN_PALETTE (4-color
    // ORANGE/YELLOW/RED/BROWN). RNG roll PŘED cluster loop = celá koruna jednoho
    // stromu sdílí jednu barvu (= „1 strom = 1 druh"). Sousední duby v scéně
    // dostanou jiné barvy → spektrum jako reálný podzimní les. Per cluster
    // by dal pestrý vánoční stromek, což je nereálné.
    const clusterColor = opts.season === "autumn"
      ? AUTUMN_PALETTE[randInt(rng, 0, AUTUMN_PALETTE.length - 1)]
      : LEAF_GREEN;
    for (let i = 0; i < clusterCount; i++) {
      const cluster = new THREE.Mesh(clusterGeom, lowpolyMat(clusterColor));
      // Scale per cluster — variabilní velikost, slightly anisotropic.
      const sBase = randRange(rng, 0.35, 0.55);
      cluster.scale.set(
        sBase * randRange(rng, 0.9, 1.2),
        sBase * randRange(rng, 0.85, 1.1),
        sBase * randRange(rng, 0.9, 1.2),
      );
      // Pozice — kolem apex kmene v kruhu, mírně náhodně.
      const angle = (i / clusterCount) * Math.PI * 2 + randRange(rng, -0.4, 0.4);
      const r = randRange(rng, 0.05, 0.25);
      cluster.position.set(
        Math.cos(angle) * r,
        trunkHeight + randRange(rng, -0.15, 0.20),
        Math.sin(angle) * r,
      );
      // Slight random rotation per cluster — Icosahedron je sice symetrický,
      // ale rotace ho „smíchá" mezi clusters, faces nejsou paralelní.
      cluster.rotation.set(
        randRange(rng, 0, Math.PI * 2),
        randRange(rng, 0, Math.PI * 2),
        randRange(rng, 0, Math.PI * 2),
      );
      group.add(cluster);
    }
  }

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildBush — keř (low cluster, žádný kmen) ==============================
// 3-5 Icosahedron clusters nízko nad zemí, BUSH_GREEN. Žádný kmen — keř je
// jen koruna sedící na zemi.
export function buildBush(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const clusterCount = randInt(rng, 3, 5);

  // **Sez. 41 DD-50 follow-up: keř v zimě = defoliated.** `decorate()` v
  // terrain.js bush v snowed cell úplně skipne (entity nevznikne), takže sem
  // přijde jen non-snowed call. Defenzivně: pokud caller přímo passne
  // `snowed: true` (dev/test), vrátíme prázdnou Group (= keř bez listí, bez
  // kmenu = neviditelný). Symetrie s `buildOak` snowed = kmen-only.
  //
  // **Sez. 43 Fáze 6 add — `dead` flag.** Defoliated bush = stejné jako snowed
  // (bez listí, bez kmenu = prázdný entity). KISS: skip i pro dead.
  if (opts.snowed || opts.dead) {
    group.scale.multiplyScalar(scale);
    return group;
  }

  const clusterGeom = getGeomCache("bush", "cluster",
    () => new THREE.IcosahedronGeometry(1.0, 0));

  // Sez. 44 Fáze 6 — autumn hue picked per-keř z AUTUMN_PALETTE (stejný idiom
  // jako buildOak). Sousední keře mají různý odstín, jednotlivý keř monochrom.
  const clusterColor = opts.season === "autumn"
    ? AUTUMN_PALETTE[randInt(rng, 0, AUTUMN_PALETTE.length - 1)]
    : BUSH_GREEN;
  for (let i = 0; i < clusterCount; i++) {
    const cluster = new THREE.Mesh(clusterGeom, lowpolyMat(clusterColor));
    const sBase = randRange(rng, 0.20, 0.32);
    cluster.scale.set(
      sBase * randRange(rng, 0.9, 1.2),
      sBase * randRange(rng, 0.85, 1.1),
      sBase * randRange(rng, 0.9, 1.2),
    );
    // Cluster centra v radius 0.25 horizontálně. Y proporční k `scale.y` (=
    // unit radius × scale = scaled Y poloměr clusteru): 50-90 % radius nad
    // ground → bottom guaranteed pod 0 (= cluster částečně zapuštěn do země,
    // nikdy nepluje). Fix sez. 40: dříve hard-coded `[0.15, 0.40]` mohlo dát
    // bottom > 0 pokud scale.y bylo malé (decor_0003 user nález).
    const angle = (i / clusterCount) * Math.PI * 2 + randRange(rng, -0.3, 0.3);
    const r = randRange(rng, 0, 0.25);
    cluster.position.set(
      Math.cos(angle) * r,
      cluster.scale.y * randRange(rng, 0.5, 0.9),
      Math.sin(angle) * r,
    );
    cluster.rotation.set(
      randRange(rng, 0, Math.PI * 2),
      randRange(rng, 0, Math.PI * 2),
      randRange(rng, 0, Math.PI * 2),
    );
    group.add(cluster);
  }

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildRock — kámen (1-3 Icosahedron chunks) =============================
// 1-3 chunks s asymetrickým scale per chunk (rocky look — žádný unit-sphere).
// ROCK_GRAY, podsazené v Y (mírně zapuštěné do země, „roste z terénu").
export function buildRock(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const chunkCount = randInt(rng, 1, 3);
  const chunkGeom = getGeomCache("rock", "chunk",
    () => new THREE.IcosahedronGeometry(1.0, 0));

  const chunks = [];  // pro snow cap recolor
  for (let i = 0; i < chunkCount; i++) {
    const chunk = new THREE.Mesh(chunkGeom, lowpolyMat(ROCK_GRAY));
    const sBase = randRange(rng, 0.25, 0.55);
    // Anisotropic scale — Y kratší (flat, „placatý balvan"), X/Z širší.
    chunk.scale.set(
      sBase * randRange(rng, 1.0, 1.4),
      sBase * randRange(rng, 0.5, 0.9),
      sBase * randRange(rng, 1.0, 1.4),
    );
    // Pozice — slight offset kolem origin. Y mírně podsazené pod 0
    // (chunk vyrůstá ze země, ne lebí na ní).
    const angle = (i / chunkCount) * Math.PI * 2 + randRange(rng, -0.5, 0.5);
    const r = chunkCount > 1 ? randRange(rng, 0.1, 0.3) : 0;
    chunk.position.set(
      Math.cos(angle) * r,
      chunk.scale.y * 0.4,  // ~60 % zapuštěno
      Math.sin(angle) * r,
    );
    chunk.rotation.set(
      randRange(rng, 0, Math.PI * 2),
      randRange(rng, 0, Math.PI * 2),
      randRange(rng, 0, Math.PI * 2),
    );
    group.add(chunk);
    chunks.push(chunk);
  }

  if (opts.snowed) recolorTopChild(chunks, SNOW_WHITE);

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildGrassTuft — chomáč trávy (thin shards) ============================
// 3-5 tenkých „shards" — Cone(0.02, 0.3, 4) = úzký kužel s 4 segmenty
// (= čtyřboký jehlan, billboard-like ze strany). Random tilt z origin, fan-out.
export function buildGrassTuft(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const shardCount = randInt(rng, 3, 5);
  // Shard geom — radius 0.02, height 0.3, 4 segmenty (= čtyřboký jehlan).
  // Sdíleno napříč všemi grass_tufts.
  const shardGeom = getGeomCache("grass_tuft", "shard",
    () => new THREE.ConeGeometry(0.02, 0.3, 4));

  // Snowed cell → bílé shards (sníh leží i na trávě v zimě).
  const shardColor = opts.snowed ? SNOW_WHITE : GRASS_GREEN;
  for (let i = 0; i < shardCount; i++) {
    const shard = new THREE.Mesh(shardGeom, lowpolyMat(shardColor));
    const shardHeight = randRange(rng, 0.7, 1.3);
    shard.scale.y = shardHeight;
    // Fan-out pattern: shards mírně vychýlené z osy Y, různými směry.
    const angle = (i / shardCount) * Math.PI * 2;
    const tiltMag = randRange(rng, 0.1, 0.35);  // radiány tilt z vertikály
    shard.rotation.set(
      Math.cos(angle) * tiltMag,
      randRange(rng, 0, Math.PI * 2),
      Math.sin(angle) * tiltMag,
    );
    // Position — drobný offset z origin (~0.02-0.05) + Y posun nahoru
    // o polovinu výšky (Cone má pivot uprostřed, base v y=-h/2).
    const r = randRange(rng, 0, 0.05);
    shard.position.set(
      Math.cos(angle) * r,
      0.3 * shardHeight / 2,
      Math.sin(angle) * r,
    );
    group.add(shard);
  }

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildPalm — palma (vysoký úzký kmen + radiální listy) ==================
// Anatomie:
//   - kmen: vysoký úzký Cylinder (radius 0.05/0.08, height 1.8-2.6),
//     mírně se zužuje nahoru. 6 segmentů = hexagonal "vrubovaný" profil.
//   - 5-7 listy: dlouhé úzké Cone (radius 0.08, height 0.9, 4 segmenty =
//     čtyřboký jehlan), distribuované radiálně z apex kmene s tilt 45-80° od
//     vertikály (= listy „padají" ven a mírně dolů jako u skutečné palmy).
//
// Orientace listů: každý list má apex Cone (=+Y) natočen ve směru `dir`
// pomocí `quaternion.setFromUnitVectors(Y_AXIS, dir)`. Pozice = trunk apex
// + dir × half-height (= base listu u apex kmene, tip ven).
//
// Sez. 43 Fáze 6 add. Tropical.wet primary, tropical.mid sub-dominant.
export function buildPalm(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const frondCount = randInt(rng, 5, 7);
  const trunkHeight = randRange(rng, 1.8, 2.6);

  // Kmen — výrazně vyšší než oak (1.8-2.6 vs. oak 0.9-1.3), tenký.
  const trunkGeom = getGeomCache("palm", "trunk",
    () => new THREE.CylinderGeometry(0.05, 0.08, 1.0, 6));
  const trunk = new THREE.Mesh(trunkGeom, lowpolyMat(BARK_BROWN));
  trunk.scale.y = trunkHeight;
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  // Frond geom: Cone(0.08, 0.9, 4) — čtyřboký jehlan, apex v +Y, base v -Y,
  // pivot uprostřed. Half-height = 0.45.
  // Snowed defenzivně: tropical biomy ve snowSpec nemají snow (DD-47), ale
  // pokud by si user toggleoval climate ručně → bílé listy. Konzistence s oak.
  const frondGeom = getGeomCache("palm", "frond",
    () => new THREE.ConeGeometry(0.08, 0.9, 4));

  // Autumn → LEAF_AUTUMN (botanicky reálná palma nemění barvy, ale konzistence
  // s globálním season UI; sub-prah pro „tropical season cycle invariant").
  // Snowed → bílé listy.
  let frondColor = LEAF_GREEN;
  if (opts.snowed) frondColor = SNOW_WHITE;
  else if (opts.season === "autumn") frondColor = LEAF_AUTUMN;

  for (let i = 0; i < frondCount; i++) {
    const frond = new THREE.Mesh(frondGeom, lowpolyMat(frondColor));

    // Radial angle + tilt od vertikály (45-80°).
    const angle = (i / frondCount) * Math.PI * 2 + randRange(rng, -0.2, 0.2);
    const tilt = randRange(rng, Math.PI / 4, Math.PI / 2.2);

    // Směr apex listu v 3D. tilt=0 → svisle (0,1,0). tilt=π/2 → vodorovně.
    // Sphere coordinates: dir = (cos(angle)·sin(tilt), cos(tilt), sin(angle)·sin(tilt)).
    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.sin(tilt),
      Math.cos(tilt),
      Math.sin(angle) * Math.sin(tilt),
    );

    // Pozice listu = trunk apex (Y=trunkHeight) + dir × half-height (= base
    // listu u apex kmene, apex listu vyčnívá ven po dir × 0.9 délka).
    frond.position.set(
      dir.x * 0.45,
      trunkHeight + dir.y * 0.45,
      dir.z * 0.45,
    );

    // Orientace: +Y osa cone se natočí ve směru dir (quaternion shortest-arc rotation).
    frond.quaternion.setFromUnitVectors(Y_AXIS, dir);

    group.add(frond);
  }

  group.rotation.y = randRange(rng, 0, Math.PI * 2);
  group.scale.multiplyScalar(scale);
  return group;
}

// === buildCactus — kaktus (saguaro-like sloupec + paže) =====================
// Anatomie:
//   - hlavní sloupec: vysoký Cylinder (radius 0.15-0.20, height 1.0-1.5),
//     8 segmentů = octagonal profil. Geom sdílená přes scale (unit cylinder
//     → trunk.scale.set).
//   - 0-2 paže: kratší válce (length 0.5-0.8, radius 60-80 % trunk) vyrůstající
//     z mid-height pod úhlem 30-60° od vertikály. Pivot na base paže
//     (= apex Y konec po `setFromUnitVectors`), umístěn na side trunk.
//
// CACTUS_GREEN paleta (toolkit.js sez. 43 add). Subtropical.dry primary feature
// (žádný snow per DD-47, defenzivně snowed = white tip přes recolorTopChild).
// `dead` flag → kmen-only BARK_BROWN (sušený kaktus, sub-prah Fáze 6 priorita).
export function buildCactus(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const trunkHeight = randRange(rng, 1.0, 1.5);
  const trunkRadius = randRange(rng, 0.15, 0.20);
  const armCount = randInt(rng, 0, 2);

  // Unit cylinder (radius=1, height=1) — scale per instance. Sdílená geom
  // napříč cactus, scale.set diferencuje velikost.
  const colGeom = getGeomCache("cactus", "column",
    () => new THREE.CylinderGeometry(1.0, 1.0, 1.0, 8));

  // `dead` priorita: kmen-only, BARK_BROWN (vyschlý kaktus). Žádné paže.
  // Priorita per TODO: dead > snowed > default. Pro cactus snowed je hypotetické
  // (subtropical.dry žádný snow), ale konzistence s ostatními buildery.
  const trunkColor = opts.dead ? BARK_BROWN : CACTUS_GREEN;
  const trunk = new THREE.Mesh(colGeom, lowpolyMat(trunkColor));
  trunk.scale.set(trunkRadius, trunkHeight, trunkRadius);
  trunk.position.y = trunkHeight / 2;
  group.add(trunk);

  const arms = [trunk];  // pro snow cap recolor (snowed → top arm/trunk bílý)

  if (!opts.dead) {
    for (let i = 0; i < armCount; i++) {
      const armLength = randRange(rng, 0.5, 0.8);
      const armRadius = trunkRadius * randRange(rng, 0.6, 0.8);
      const arm = new THREE.Mesh(colGeom, lowpolyMat(CACTUS_GREEN));
      arm.scale.set(armRadius, armLength, armRadius);

      // Směr paže: ven do `angle` + tilt 30-60° od vertikály (= paže šikmo vzhůru).
      const angle = randRange(rng, 0, Math.PI * 2);
      const tilt = randRange(rng, Math.PI / 6, Math.PI / 3);
      const dir = new THREE.Vector3(
        Math.cos(angle) * Math.sin(tilt),
        Math.cos(tilt),
        Math.sin(angle) * Math.sin(tilt),
      );

      // Base paže na side trunk (radial offset = trunkRadius), výška ~0.4-0.7 trunk.
      // Pozice mid paže = base + dir × half-length (apex Cylinder vyčnívá ven).
      const armBaseHeight = randRange(rng, 0.4, 0.7) * trunkHeight;
      arm.position.set(
        dir.x * (trunkRadius + armLength * 0.5),
        armBaseHeight + dir.y * armLength * 0.5,
        dir.z * (trunkRadius + armLength * 0.5),
      );
      arm.quaternion.setFromUnitVectors(Y_AXIS, dir);

      group.add(arm);
      arms.push(arm);
    }
  }

  // Snowed → top element (= nejvyšší arm/trunk) bílý. Defenzivní pro
  // konzistenci, subtropical.dry reálně snow neprodukuje.
  if (opts.snowed) recolorTopChild(arms, SNOW_WHITE);

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildFlower — louka kvítek (stem + bloom) ==============================
// Anatomie:
//   - stem: tenký Cylinder (radius 0.015, height 0.20-0.30), GRASS_GREEN.
//     4 segmenty = pixel-art úzký stonek.
//   - bloom: malý Icosahedron (radius 0.05-0.08, detail=0 lowpoly) na top stem.
//     Per-instance hue: red/yellow/white picked z 3-color palety podle seed.
//
// Slight tilt z vertikály — flower head ne přesně svislá. Snowed/dead → skip
// (drobná květina sníh schová, dead flower = no realistic withered visual KISS).
// Sez. 43 Fáze 6 add. Temperate.wet/mid louka detail.
export function buildFlower(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  // Snowed/dead → skip entire (KISS, no withered visual). Symetrické s bush.
  if (opts.snowed || opts.dead) {
    group.scale.multiplyScalar(scale);
    return group;
  }

  const stemHeight = randRange(rng, 0.20, 0.30);

  // Stem — thin cylinder, GRASS_GREEN matches grass blade.
  const stemGeom = getGeomCache("flower", "stem",
    () => new THREE.CylinderGeometry(0.015, 0.015, 1.0, 4));
  const stem = new THREE.Mesh(stemGeom, lowpolyMat(GRASS_GREEN));
  stem.scale.y = stemHeight;
  stem.position.y = stemHeight / 2;
  group.add(stem);

  // Bloom — pick z 3-color paletky (RNG-driven hue variation).
  const FLOWER_COLORS = [FLOWER_PETAL_RED, FLOWER_PETAL_YELLOW, FLOWER_PETAL_WHITE];
  const petalColor = FLOWER_COLORS[randInt(rng, 0, 2)];
  const bloomRadius = randRange(rng, 0.05, 0.08);
  // Unit-radius Icosahedron (sdílená s rock/oak cluster), scale per instance.
  const bloomGeom = getGeomCache("flower", "bloom",
    () => new THREE.IcosahedronGeometry(1.0, 0));
  const bloom = new THREE.Mesh(bloomGeom, lowpolyMat(petalColor));
  bloom.scale.set(bloomRadius, bloomRadius, bloomRadius);
  bloom.position.y = stemHeight;
  group.add(bloom);

  // Slight tilt — flower head ne přesně svislá. Rotace celé group kolem
  // origin (= base stem) → stem se nakloní jako květina ve větru.
  // Tilt magnitude ~0.1-0.25 rad (5-15°) — subtle.
  const tiltAngle = randRange(rng, 0, Math.PI * 2);
  const tiltMag = randRange(rng, 0.1, 0.25);
  group.rotation.set(Math.cos(tiltAngle) * tiltMag, 0, Math.sin(tiltAngle) * tiltMag);

  group.scale.multiplyScalar(scale);
  return group;
}

// === buildStump — pařez (krátký tlustý válec) ===============================
// Krátký Cylinder, BARK_BROWN. Stump je už "dead wood" by koncept — `dead`
// flag no-op, snowed → top disc bílý.
// Sez. 43 Fáze 6 add. Temperate woodland clearings + subtropical.wet detail.
export function buildStump(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const stumpHeight = randRange(rng, 0.30, 0.50);
  const stumpRadius = randRange(rng, 0.18, 0.28);

  // Unit cylinder (radius=1, height=1) — scale per instance, 8 segments octagonal.
  const stumpGeom = getGeomCache("stump", "trunk",
    () => new THREE.CylinderGeometry(1.0, 1.0, 1.0, 8));
  const stump = new THREE.Mesh(stumpGeom, lowpolyMat(BARK_BROWN));
  stump.scale.set(stumpRadius, stumpHeight, stumpRadius);
  stump.position.y = stumpHeight / 2;
  group.add(stump);

  // Snowed → thin SNOW_WHITE disc na top face (~ 4 cm sníh na pařezu).
  if (opts.snowed) {
    const snowCap = new THREE.Mesh(stumpGeom, lowpolyMat(SNOW_WHITE));
    snowCap.scale.set(stumpRadius * 0.95, 0.04, stumpRadius * 0.95);
    snowCap.position.y = stumpHeight + 0.02;
    group.add(snowCap);
  }

  group.rotation.y = randRange(rng, 0, Math.PI * 2);
  group.scale.multiplyScalar(scale);
  return group;
}

// === buildLog — ležící kmen (horizontal cylinder) ===========================
// Cylinder rotated 90° kolem X → osa válce vodorovná. Délka 0.5-0.8, radius
// 0.10-0.15. Group origin u ground, log mesh posunutý nahoru o logRadius
// (= log sedí na zemi). Random Y rotace celé group → log v libovolném směru.
// Sez. 43 Fáze 6 add. Same biomy jako stump (woodland clean-up).
export function buildLog(group, opts = {}) {
  const seed = opts.seed ?? 0;
  const scale = opts.scale ?? 1.0;
  const rng = mulberry32(seed);

  const logLength = randRange(rng, 0.5, 0.8);
  const logRadius = randRange(rng, 0.10, 0.15);

  // Unit cylinder shared with stump.
  const logGeom = getGeomCache("log", "trunk",
    () => new THREE.CylinderGeometry(1.0, 1.0, 1.0, 8));
  const log = new THREE.Mesh(logGeom, lowpolyMat(BARK_BROWN));
  log.scale.set(logRadius, logLength, logRadius);
  // Rotate 90° kolem X — Y axis cylinderu → −Z axis world (lying horizontally).
  log.rotation.x = Math.PI / 2;
  // Po rotaci je log osa horizontální. Y pozice mesh = logRadius (= radius nad
  // ground, takže spodek logu se dotýká země v group origin Y=0).
  log.position.y = logRadius;
  group.add(log);

  // Snowed/dead na log = no-op (log je už dead wood). Pro symetrii s ostatními
  // buildery handle defensively (snowed by mohlo přidat thin top strip, KISS skip).

  group.rotation.y = randRange(rng, 0, Math.PI * 2);
  group.scale.multiplyScalar(scale);
  return group;
}

// === DECOR_BUILDERS lookup ==================================================
// Mapping KIND string → builder function. `createDecor(instance)` v main.js
// volá `DECOR_BUILDERS[instance.KIND](group, { seed, scale })`. Pokud KIND
// neexistuje, dispatch v main.js musí ošetřit (graceful skip).
export const DECOR_BUILDERS = {
  spruce: buildSpruce,
  oak: buildOak,
  bush: buildBush,
  rock: buildRock,
  grass_tuft: buildGrassTuft,
  palm: buildPalm,
  cactus: buildCactus,
  flower: buildFlower,
  stump: buildStump,
  log: buildLog,
};

// === RESOURCE_YIELD lookup (sez. 53, DD-49 spec extension) ==================
// Per-KIND fixed yield při chop interakci (left-click decor → decor mizí, yieldy
// se přidají do nejbližší volné cell přes BFS overflow, sez. 53).
//
// `{ resource: count }` objekt — deterministic per KIND (= žádný RNG roll per
// chop, KISS). Random yield per chop je sub-prah (mission-driven extraction
// IDEAS). Per user kalibrace sez. 53 follow-up: **jediný voxel per chop**
// napříč všemi chopable KIND-y. Realistická „heavy yield" verze (8 wood ze
// stromu, 4 stone z kamene) působila nadhodnocená pro mini-dioráma scope —
// 1 voxel per chop = sběrný gameplay rhythm, akumulace přes multi-chop.
//   - spruce/oak/palm/stump/log/cactus  → 1 wood
//   - rock                              → 1 stone
//   - bush/flower/grass_tuft            → bez yieldu (vegetace)
//
// Empty object `{}` = explicit no-yield (= chop akce je no-op + decor zůstává).
// Konzument: `chopDecor()` v main.js dispatch + `hasChopYield()` predicate
// pro hover highlight diferenciaci (yield > 0 = chopable = červený hover tint).
export const RESOURCE_YIELD = {
  spruce:     { wood: 1 },
  oak:        { wood: 1 },
  palm:       { wood: 1 },
  rock:       { stone: 1 },
  stump:      { wood: 1 },
  log:        { wood: 1 },
  cactus:     { wood: 1 },
  bush:       {},
  flower:     {},
  grass_tuft: {},
};

// `hasChopYield(kind)` — predicate pro UI/hover highlight rozlišení (vegetace
// bez yieldu vs. chopable strom/kámen). KISS: sum > 0 = chopable.
export function hasChopYield(kind) {
  const y = RESOURCE_YIELD[kind];
  if (!y) return false;
  for (const c of Object.values(y)) if (c > 0) return true;
  return false;
}
