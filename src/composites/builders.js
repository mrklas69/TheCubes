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
  ROCK_GRAY,
  GRASS_GREEN,
  BUSH_GREEN,
  SNOW_WHITE,
} from "./toolkit.js";

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
  const clusterGeom = getGeomCache("oak", "cluster",
    () => new THREE.IcosahedronGeometry(1.0, 0));

  // Snowed = všechny clustery SNOW_WHITE (kmen zachová BARK_BROWN).
  const clusterColor = opts.snowed ? SNOW_WHITE : LEAF_GREEN;
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
  const clusterGeom = getGeomCache("bush", "cluster",
    () => new THREE.IcosahedronGeometry(1.0, 0));

  // Snowed = všechny clustery SNOW_WHITE (keř nemá kmen, takže celý bílý).
  const clusterColor = opts.snowed ? SNOW_WHITE : BUSH_GREEN;
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
};
