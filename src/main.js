// src/main.js
// Boot celé aplikace: Three.js scéna, kamera, osvětlení, první kostka,
// tikání TIME, render loop.
//
// Závislosti se importují skrz import map v index.html.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CUBES, TERRAIN } from "./model.js";
import { advanceTime } from "./time.js";

// === Renderer ===
// WebGLRenderer = Three.js komponenta, která překládá scénu na GPU volání.
// `antialias: true` = plynulejší hrany (mírně dražší, pro M1 OK).
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

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
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
// DirectionalLight = paralelní paprsky (jako slunce). Dává tvar kostce.
// Zdroj v rohu (-10, 10, 10) — zleva, shora, vepředu — svítí na počátek (0,0,0).
// target.position je default (0,0,0), směr se odvodí jako position → target.
// Pozn.: Three.js má Y jako osu nahoru. Viz DD-10 (nahrazuje DD-09).
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(-10, 10, 10);
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

// === Vizualizační dispatch: instance → Three.js Mesh ===
// Podle konkrétní třídy instance rozhodujeme, jaký materiál použít.
// `instanceof` testuje řetěz dědičnosti. Pořadí větví je důležité:
// specifické třídy před obecnými (TERRAIN je potomek CUBES, proto dřív).
//
// Model/engine separation: tady je jediné místo, kde je vazba
// "třída → vizuál" — model.js nezná Three.js vůbec.
function createMeshFor(instance) {
  // BoxGeometry 1×1×1 = geometrie krychle. Sdílíme ji napříč kostkami,
  // ale materiál má každá instance vlastní (jinak by barvy kolidovaly).
  const geometry = new THREE.BoxGeometry(1, 1, 1);

  let material;
  if (instance instanceof TERRAIN) {
    // Potomek override: plochá barva podle COLOR.
    material = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  } else {
    // Mateřská CUBES: default šachovnice (DD-07).
    material = new THREE.MeshStandardMaterial({ map: checkerboardTexture });
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(instance.X, instance.Y, instance.Z);
  // userData = volné pole na mesh objektu. Propojuje 3D reprezentaci
  // s instancí modelu — raycaster podle toho pozná, kterému objektu patří.
  mesh.userData.instance = instance;
  return mesh;
}

// === Model: 3×3 grid dlaždic v rovině Y=0 ===
// Centrální buňka (0,0,0) = mateřská CUBES (šachovnice jako default DD-07).
// Okolních 8 buněk = TERRAIN s různými barvami — první potomek demonstrující
// override vizualizace.

// Středová kostka — jediná mateřská CUBES ve scéně
const centralCube = new CUBES(
  "cube_0001",
  "Středová kostka",
  0, 0, 0,
  "Mateřská CUBES — vizuální default (šachovnice)."
);
scene.add(createMeshFor(centralCube));

// 8 TERRAIN dlaždic kolem středu. Paleta = výrazná duha po obvodu,
// počínaje levým horním rohem (z = -1) po směru hodinových ručiček.
// Každý záznam má { x, z, color, name }; Y je vždy 0 (všechny v jedné rovině).
const terrainDefs = [
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
terrainDefs.forEach((def, i) => {
  const id = `terrain_${String(i + 1).padStart(4, "0")}`;
  const instance = new TERRAIN(id, def.name, def.x, 0, def.z, def.color);
  scene.add(createMeshFor(instance));
});

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
