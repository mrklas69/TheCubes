// src/main.js
// Boot celé aplikace: Three.js scéna, kamera, osvětlení, první kostka,
// tikání TIME, render loop.
//
// Závislosti se importují skrz import map v index.html.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CUBES, CCUBES, COMPOSITES, TREE, BALLOON } from "./model.js";
import { advanceTime } from "./time.js";

// === Renderer ===
// WebGLRenderer = Three.js komponenta, která překládá scénu na GPU volání.
// `antialias: true` = plynulejší hrany (mírně dražší, pro M1 OK).
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Stíny. `shadowMap.enabled = true` = GPU bude generovat depth-mapy ze světel,
// které stíny podporují. `PCFSoftShadowMap` = Percentage-Closer Filtering
// s rozmazáním → měkké hrany stínů (nejhezčí/nejdražší default). Alternativy:
// BasicShadowMap (ostré hrany, rychlejší), VSMShadowMap (variance, složitější).
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// === Scéna ===
// Scene = kontejner pro všechny 3D objekty (kostky, světla, kamery).
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // tmavě modrofialová pozadí

// === Kamera ===
// PerspectiveCamera = perspektivní projekce (vzdálené věci jsou menší).
// Parametry: FOV (field of view ve stupních), aspect ratio, near, far clip.
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
// Kamera trochu z boku a shora, dívá se na střed scény.
camera.position.set(4, 4, 4);
camera.lookAt(0, 0, 0);

// OrbitControls = ovládání kamery myší.
// Left drag = rotace kolem středu, wheel = zoom, right drag = posun.
// `enableDamping` = plynulý dojezd po uvolnění myši.
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// === Osvětlení ===
// AmbientLight = rovnoměrné měkké nasvícení (žádné stíny, všichni stejně).
// Intenzita 0.15 = jen jemné "zesvětlení odvrácených stran", hlavní zdroj
// světla je DirectionalLight níž. Vyšší hodnoty (0.3+) maskují self-shadow:
// odvrácená strana kostky by byla moc světlá a kontrast stínu by zmizel.
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
// DirectionalLight = paralelní paprsky (jako slunce). Dává tvar kostce.
// Zdroj v rohu (-10, 10, 10) — zleva, shora, vepředu — svítí na počátek (0,0,0).
// target.position je default (0,0,0), směr se odvodí jako position → target.
// Pozn.: Three.js má Y jako osu nahoru. Viz DD-10 (nahrazuje DD-09).
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(-10, 10, 10);
// Slunce vrhá stíny. DirectionalLight používá **ortografickou** stínovou
// kameru — je jako slunce v nekonečnu, paprsky jsou rovnoběžné. Frustum
// této kamery musí obalit celou scénu, jinak objekty mimo frustum stín
// vrhat nebudou. Grid je 10×10, balón Y=4 → bezpečný rozměr 16×16, near/far
// 1..50 pokrývá pozici slunce (≈17 jednotek od středu).
sun.castShadow = true;
sun.shadow.camera.left   = -8;
sun.shadow.camera.right  =  8;
sun.shadow.camera.top    =  8;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.near   =  1;
sun.shadow.camera.far    = 50;
// Rozlišení shadow mapy — vyšší = ostřejší stíny, vyšší paměť/čas. 2048²
// je slušný kompromis pro malou scénu; default 512² je viditelně zubaté.
sun.shadow.mapSize.set(2048, 2048);
// `bias` posune depth-test o malý zápor, aby mesh nestínoval sám sebe
// artefakty ("shadow acne" = tečkovaný vzor na osvětlených plochách).
// `normalBias` posune test podle normály — pomáhá na zaoblených plochách
// (vak balónu, kužely stromu), kde klasický bias způsobuje "peter-panning"
// (stín se odlepí od objektu).
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);

// === Orientační pomůcky ===
// GridHelper = 2D mřížka v rovině XZ na dané výšce Y. Pomáhá vizuálně
// pochopit rozložení scény a směr os. Parametry: celková velikost (10
// jednotek), počet dělení (10 → 1 jednotka = 1 buňka — odpovídá voxelu).
// Y = -0.5 → grid leží přesně pod kostkami (BoxGeometry 1×1×1 centrovaná
// v (0,0,0) sahá od -0.5 do +0.5). Kostky tak "stojí" na gridu.
const grid = new THREE.GridHelper(10, 10, 0x666666, 0x333333);
grid.position.y = -0.5;
scene.add(grid);

// AxesHelper = tři barevné úsečky z počátku: X červená, Y zelená, Z modrá.
// Parametr = délka v jednotkách. Incident DD-09 (světlo svítilo zespodu
// kvůli záměně os) by s helperem ve scéně nenastal.
scene.add(new THREE.AxesHelper(3));

// === Ground plane pro zachytávání stínů ===
// PlaneGeometry je default v rovině XY (ležící vertikálně). Otočíme ji
// o -90° kolem X, aby ležela v rovině XZ (horizontálně). `ShadowMaterial`
// je speciální materiál, který je jinak **průhledný** a zobrazuje jen
// stíny — ideální pro zachycení stínů bez zakrývání gridu pod sebou.
// Y = -0.501 (mírně pod spodkem kostek v -0.5) eliminuje z-fight se spodními
// plochami kostek, které také leží na Y = -0.5.
const groundGeom = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
const ground = new THREE.Mesh(groundGeom, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.501;
ground.receiveShadow = true;
scene.add(ground);

// === Default textura pro mateřskou CUBES (šachovnice, DD-07) ===
// Stejný vizuální idiom jako "průhledné pozadí" v Photoshopu/GIMPu/Figmě —
// signalizuje "vizuál není definován". Potomci (TERRAIN, SPRITE, …) override.
// Texturu tvoříme jednou a sdílíme mezi všemi mateřskými CUBES (zatím 1).
function makeCheckerboardTexture(cellsPerSide = 8) {
  // Vykreslíme šachovnici do offscreen <canvas> a z něj uděláme THREE texturu.
  const canvas = document.createElement("canvas");
  const size = 128;                    // rozlišení textury v pixelech
  const cell = size / cellsPerSide;    // velikost jednoho pole
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Dvě konvenční barvy šachovnice z grafických editorů
  const LIGHT = "#ffffff";
  const DARK  = "#c8c8c8";

  for (let y = 0; y < cellsPerSide; y++) {
    for (let x = 0; x < cellsPerSide; x++) {
      // (x + y) sudé → světlé pole, liché → tmavé. Dává klasický šach.
      ctx.fillStyle = (x + y) % 2 === 0 ? LIGHT : DARK;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  // NearestFilter = ostré hrany polí (bez rozmazání při přiblížení)
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  // ColorSpace: SRGB aby barvy seděly s renderem
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Texturu vytvoříme jednou — sdílená instance pro všechny mateřské CUBES.
const checkerboardTexture = makeCheckerboardTexture();

// === Vizualizační dispatch: instance → Three.js Object3D ===
// Podle konkrétní třídy instance rozhodujeme, jaký vizuál sestrojit.
// `instanceof` testuje řetěz dědičnosti. Pořadí větví je důležité:
// specifické třídy před obecnými (TREE je potomek COMPOSITES, proto dřív).
//
// Model/engine separation: tady je jediné místo, kde je vazba
// "třída → vizuál" — model.js nezná Three.js vůbec. Viz DD-11.
//
// Pozice (DD-12): voxelové potomky (CCUBES, TCUBES) snap-to-grid
// přes Math.round — brání z-fightingu mezi sousedícími kostkami.
// Nevoxelové (SPRITES, COMPOSITES) dostanou spojitou float pozici.
function createMeshFor(instance) {
  let object3d;

  if (instance instanceof COMPOSITES) {
    // 3D mesh složený z primitivů. Konkrétní tvar řešíme podle podtřídy.
    object3d = createCompositeFor(instance);
  } else if (instance instanceof CCUBES) {
    // Voxel s plochou barvou (dříve TERRAIN).
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: instance.COLOR });
    object3d = new THREE.Mesh(geometry, material);
    snapToGrid(object3d, instance);
  } else {
    // Mateřská CUBES: default šachovnice (DD-07). Taktéž voxel — snap.
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ map: checkerboardTexture });
    object3d = new THREE.Mesh(geometry, material);
    snapToGrid(object3d, instance);
  }

  // Jednotný post-processing pro všechny typy vizualizace:
  //  1. userData.instance propojí 3D reprezentaci s modelem (raycaster
  //     ho používá k hledání tooltipu); musí být na kořeni i na každém
  //     mesh-childu (u Group/COMPOSITES), aby hit kteréhokoli dílu vracel
  //     správnou instanci.
  //  2. castShadow + receiveShadow = objekt vrhá stín (blokuje světlo)
  //     a zároveň stín přijímá (jeho povrch může být stínován).
  object3d.userData.instance = instance;
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.userData.instance = instance;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object3d;
}

// Pomocná funkce — umístí voxelový mesh na celé souřadnice (snap-to-grid).
// DD-12: souřadnice CUBES jsou float, ale voxelové potomky renderujeme
// na intech, aby plochy sousedících kostek přesně lícovaly (žádný z-fighting).
function snapToGrid(mesh, instance) {
  mesh.position.set(
    Math.round(instance.X),
    Math.round(instance.Y),
    Math.round(instance.Z),
  );
}

// Sestaví 3D strukturu pro COMPOSITES instanci. Vrací THREE.Group
// (kontejner pro více mesh-children — Three.js s nimi pracuje jako s celkem).
// Pozice je spojitá (float) — bez snap-to-grid.
//
// Dispatch uvnitř podle konkrétní podtřídy COMPOSITES (zatím jen TREE).
// Když přibude Balloon atp., přidá se další větev.
function createCompositeFor(instance) {
  const group = new THREE.Group();
  group.position.set(instance.X, instance.Y, instance.Z);

  if (instance instanceof TREE) {
    buildTree(group);
  } else if (instance instanceof BALLOON) {
    buildBalloon(group, instance);
  }

  // userData.instance + shadow flagy nastaví až `createMeshFor` jednotně
  // pro celý řetězec (traverze Group).
  return group;
}

// Pomocný helper — postaví válec (CylinderGeometry) mezi dvěma body `a` a `b`.
// Three.js CylinderGeometry je default orientovaný podél osy +Y (vertikálně);
// musíme ho (1) roztáhnout na správnou délku, (2) natočit ve směru b − a
// a (3) umístit jeho střed na midpoint mezi a a b.
//
// `Vector3.subVectors(b, a)` = vrátí nový vektor b − a (směr + délka).
// `Quaternion.setFromUnitVectors(from, to)` = vytvoří kvaternion, který
// otáčí z jednotkového vektoru `from` do jednotkového vektoru `to`.
// `position.copy(a).lerp(b, 0.5)` = nejprve zkopíruj a, pak lineární
// interpolace k b s parametrem 0.5 → výsledek je přesný midpoint.
function cylinderBetween(a, b, radius, material) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const geom = new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geom, material);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),          // default osa válce (před rotací)
    direction.clone().normalize(),        // kam chceme, aby mířila
  );
  mesh.position.copy(a).lerp(b, 0.5);    // střed válce = midpoint
  return mesh;
}

// Procedurální strom z ~5 primitivů. Všechny pozice v lokálních souřadnicích
// Group (0,0,0 = base). Strom stojí tak, aby jeho základna seděla na Y = -0.5
// (stejně jako kostky 1×1×1 centrované v Y=0).
function buildTree(group) {
  // --- Kmen ---
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
  // Lehce kónický kmen — šířka 0.18 dole, 0.12 nahoře, výška 0.9.
  const trunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 10);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 }); // hnědá
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  // Kmen s polovinou výšky nahoru = jeho základna sedí na Y = -0.5
  trunk.position.y = -0.5 + 0.45;
  group.add(trunk);

  // --- Koruna: tři kužely narůstajícího/zužujícího se průměru ---
  // ConeGeometry(radius, height, radialSegments)
  const coneColor = 0x2d7a3a; // sytá listová zelená
  const coneMat = new THREE.MeshStandardMaterial({ color: coneColor });

  // Největší (spodní) kužel
  const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 12), coneMat);
  cone1.position.y = -0.5 + 0.9 + 0.35; // nad kmen
  group.add(cone1);

  // Střední kužel — posunutý výš, užší
  const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 12), coneMat);
  cone2.position.y = -0.5 + 0.9 + 0.35 + 0.45;
  group.add(cone2);

  // Špička — nejužší, nejvyšší
  const cone3 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 12), coneMat);
  cone3.position.y = -0.5 + 0.9 + 0.35 + 0.45 + 0.4;
  group.add(cone3);
}

// Procedurální horkovzdušný balón. Lokální coords: spodek koše na Y = 0.
// Skládá se z koše (kvádr), vaku (koule lehce protažená nahoru) a 4 lan
// (válce z rohů koše k spodku vaku). Celkem 6 primitivů. Viz DD-13.
//
// `instance` má atribut COLOR (JS number 0xRRGGBB) — aplikujeme ho na vak.
// Lana a koš mají fixní „provazovou" a „košíkovou" barvu.
function buildBalloon(group, instance) {
  // --- Koš ---
  // BoxGeometry(width, height, depth) s proutěnou barvou
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), basketMat);
  // Střed koše = +0.15 (aby spodek ležel na Y = 0 lokálně)
  basket.position.y = 0.15;
  group.add(basket);

  // --- Vak ---
  // SphereGeometry(radius, widthSegments, heightSegments).
  // Widthsegments/heightsegments = kolik polí má síť — vyšší hodnoty = hladší
  // koule (víc trojúhelníků). 16×12 je kompromis mezi kvalitou a náklady.
  const envelopeMat = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    envelopeMat,
  );
  // Lehké vertikální protažení pro klasický hruškovitý tvar balónu
  envelope.scale.y = 1.15;
  // Střed vaku Y = 1.3 → spodek vaku na Y ≈ 0.67 (1.3 − 0.55·1.15)
  envelope.position.y = 1.3;
  group.add(envelope);

  // --- 4 lana ---
  // Uchycení hluboko uvnitř koše (Y = 0.1, pod vrškem) a hluboko uvnitř vaku
  // (Y = 1.0, ve spodní třetině koule). Lana pak prostupují stěnami obou
  // objektů — vypadá to jako "lana skrze kůži", ne "lana přilepená zvenku".
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
  const ropeStartY = 0.1;   // uvnitř koše (spodek koše 0, vršek 0.3)
  const ropeEndY   = 1.0;   // uvnitř vaku (střed vaku Y=1.3, radius ~0.63)
  const corners = [
    [ 0.18,  0.18],   // +X, +Z
    [-0.18,  0.18],   // −X, +Z
    [-0.18, -0.18],   // −X, −Z
    [ 0.18, -0.18],   // +X, −Z
  ];
  corners.forEach(([cx, cz]) => {
    // Start lana = bod uvnitř koše (přesah 0.2 pod vrškem)
    const from = new THREE.Vector3(cx, ropeStartY, cz);
    // Konec lana = bod uvnitř vaku, mírně rozšířený ven (balón je širší
    // než koš, takže lana se směrem nahoru rozbíhají)
    const to = new THREE.Vector3(cx * 1.3, ropeEndY, cz * 1.3);
    group.add(cylinderBetween(from, to, 0.015, ropeMat));
  });
}

// === Model: 3×3 grid dlaždic v rovině Y=0 + strom ===
// Centrální buňka (0,0,0) = mateřská CUBES (šachovnice jako default DD-07).
// Okolních 8 buněk = CCUBES s různými barvami — první potomek demonstrující
// override vizualizace (dříve TERRAIN, přejmenováno v sez. 3 — DD-13).
// Vpravo na (3, 0, 0) = TREE (COMPOSITES) — demonstrace 3D mesh z primitivů.

// Středová kostka — jediná mateřská CUBES ve scéně
const centralCube = new CUBES(
  "cube_0001",
  "Středová kostka",
  0, 0, 0,
  "Mateřská CUBES — vizuální default (šachovnice)."
);
scene.add(createMeshFor(centralCube));

// 8 CCUBES dlaždic kolem středu. Paleta = výrazná duha po obvodu,
// počínaje levým horním rohem (z = -1) po směru hodinových ručiček.
// Každý záznam má { x, z, color, name }; Y je vždy 0 (všechny v jedné rovině).
const ccubeDefs = [
  { x: -1, z: -1, color: 0xff3b30, name: "Červená dlaždice" },
  { x:  0, z: -1, color: 0xff9500, name: "Oranžová dlaždice" },
  { x:  1, z: -1, color: 0xffcc00, name: "Žlutá dlaždice" },
  { x:  1, z:  0, color: 0x34c759, name: "Zelená dlaždice" },
  { x:  1, z:  1, color: 0x00c7be, name: "Tyrkysová dlaždice" },
  { x:  0, z:  1, color: 0x007aff, name: "Modrá dlaždice" },
  { x: -1, z:  1, color: 0x7b61ff, name: "Fialová dlaždice" },
  { x: -1, z:  0, color: 0xff2d92, name: "Růžová dlaždice" },
];

// forEach = iterace přes pole. Druhý parametr callbacku je index.
// `padStart(4, "0")` doplní vedoucí nuly → "0001", "0002", …
ccubeDefs.forEach((def, i) => {
  const id = `ccube_${String(i + 1).padStart(4, "0")}`;
  const instance = new CCUBES(id, def.name, def.x, 0, def.z, def.color);
  scene.add(createMeshFor(instance));
});

// Strom vedle růžice — COMPOSITES (3D mesh z primitivů, DD-13).
// Pozice (3, 0, 0) = mimo 3×3 grid, ale stále na celých souřadnicích
// (float systém to umožňuje, ale pro čistotu prvních ukázek držíme int).
const tree1 = new TREE(
  "tree_0001",
  "Strom",
  3, 0, 0,
  "COMPOSITES — kmen (válec) + 3 kužely koruny.",
);
scene.add(createMeshFor(tree1));

// Balón nad scénou — BALLOON (COMPOSITES) na **float** pozici mimo grid.
// Demonstrace DD-12: jednotný souřadný systém, snap-to-grid se neuplatňuje.
// Pozice (1, 3, 2): výška snížena o 1/4 proti dřívějšímu Y=4, aby stín
// balónu nesplýval se stínem stromu. Paprsek slunce (směr (1,-1,-1)/√3)
// z této pozice dopadne na zem v bodě:
//    t = 3√3 → (1+3, 0, 2-3) = (4, 0, -1) — před patou stromu (který
// je v (3, 0, 0)), s čistou mezerou mezi oběma stíny.
const balloon1 = new BALLOON(
  "balloon_0001",
  "Balón",
  1, 3, 2,
  0xff6b35,                                  // sytá oranžová pro vak
  "COMPOSITES mimo grid — vak, 4 lana, koš.",
);
scene.add(createMeshFor(balloon1));

// === Infotip (hover panel s atributy instance) ===
// Viz DD-08. Generický přístup: iteruje vlastní vlastnosti instance a
// vypíše je jako řádky. Funguje pro libovolnou třídu dědící z OBJECTS.
const tooltipEl = document.getElementById("tooltip");
const raycaster = new THREE.Raycaster();
// pointer = normalized device coordinates: X v [-1, +1], Y v [-1, +1]
const pointer = new THREE.Vector2();
let lastHoveredMesh = null;

// Escape HTML kvůli bezpečnosti — NAME/DESCRIPTION může v budoucnu přijít
// od uživatele; nechceme XSS, když se tam dostane `<script>`.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Formátování hodnoty podle klíče — pro většinu atributů se nic nemění,
// ale COLOR (JS number 0xRRGGBB) převedeme na čitelný hex "#rrggbb".
// `toString(16)` převádí číslo na hex řetězec; `padStart(6, "0")` doplní
// vedoucí nuly (aby např. 0x00ff00 nedávalo "ff00").
function formatValue(key, val) {
  if (key === "COLOR" && typeof val === "number") {
    return "#" + val.toString(16).padStart(6, "0");
  }
  return val;
}

// Vykreslí tooltip pro danou instanci.
function renderTooltip(instance) {
  // instance.constructor.name vrátí např. "CUBES" — použije se jako nadpis
  const header = instance.constructor.name;
  // Object.entries vytáhne [klíč, hodnota] páry z vlastních atributů instance
  const rows = Object.entries(instance)
    .map(([key, val]) =>
      `<div class="tt-row">
         <span class="tt-key">${escapeHtml(key)}</span>
         <span class="tt-val">${escapeHtml(formatValue(key, val))}</span>
       </div>`)
    .join("");
  tooltipEl.innerHTML = `<div class="tt-header">${escapeHtml(header)}</div>${rows}`;
}

function showTooltip(event, instance) {
  // Pokud najedeme na stejný mesh jako posledně, nepřerenderujeme obsah
  if (lastHoveredMesh?.userData.instance !== instance) renderTooltip(instance);
  // Offset 14 px od kurzoru, aby tooltip nepřekrýval samotný target
  tooltipEl.style.left = `${event.clientX + 14}px`;
  tooltipEl.style.top  = `${event.clientY + 14}px`;
  tooltipEl.style.display = "block";
}
function hideTooltip() { tooltipEl.style.display = "none"; }

// mousemove handler → raycaster → infotip
canvas.addEventListener("pointermove", (event) => {
  // Převést pixel souřadnice kurzoru na normalized device coords (-1..+1)
  pointer.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Vyšleme paprsek z kamery přes kurzor a najdeme protnuté meshe
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  // Zajímají nás jen meshe, které mají userData.instance (tj. reprezentují model)
  const firstHit = hits.find((h) => h.object.userData?.instance);

  if (firstHit) {
    showTooltip(event, firstHit.object.userData.instance);
    lastHoveredMesh = firstHit.object;
  } else {
    hideTooltip();
    lastHoveredMesh = null;
  }
});
// Skryj tooltip, když kurzor opustí canvas úplně
canvas.addEventListener("pointerleave", hideTooltip);

// === Responsivita ===
// Když uživatel změní velikost okna, upravíme aspect ratio kamery
// a velikost rendereru. Jinak by se obraz protahoval.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// === TIME tikání ===
// setInterval volá callback každých N milisekund. 1000 ms = 1 s = 1 tick.
// Render loop (animate) běží nezávisle na ~60 FPS.
setInterval(advanceTime, 1000);

// === Render loop ===
// requestAnimationFrame = "zavolej mě, až bude vhodný čas překreslit".
// Prohlížeč to obvykle dělá 60× za vteřinu, a synchronizuje to s refresh
// rate monitoru. Uvnitř aktualizujeme controls a překreslíme scénu.
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
