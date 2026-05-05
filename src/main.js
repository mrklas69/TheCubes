// src/main.js
// Boot celé aplikace: Three.js scéna, kamera, osvětlení, první kostka,
// tikání TIME, render loop.
//
// Závislosti se importují skrz import map v index.html.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CUBES, CCUBES, TCUBES, SPRITES, COMPOSITES, TREE, BALLOON, HOUSE, CLOUD, ROCK, TUNNEL_ARCH, WAREHOUSE, TRAIN, TIMER, COUNTER } from "./model.js";
import { TIME, advanceTime } from "./time.js";

// === Renderer ===
// WebGLRenderer = Three.js komponenta, která překládá scénu na GPU volání.
// `antialias: true` = plynulejší hrany (mírně dražší).
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
// Pozice slunce: úhel ≈ 30° nad horizontem (Y=8, horizontal_dist=√(100+100)≈14.14
// → atan(8/14.14)=29.5°). Stíny ~1.5× delší než výška objektu.
sun.position.set(-10, 8, 10);
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

// (Sez. 14: GridHelper a AxesHelper odstraněny — orientační pomůcky pro
// vývojářské účely M1/M2 už nepotřebujeme. Souřadný systém Three.js Y-up
// je etablovaný; mřížka navíc rušila čistotu dioramy.)

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

// === Canvas-generovaná textura pro dialog bubble (SPRITES) ===
// Vykreslí text do zaobleného bílého obdélníku → vrátí CanvasTexture a poměr
// stran (width/height) pro správné měřítko spritu v 3D. Poměr vrací proto,
// aby sprite ve scéně neměl zkreslené proporce (square 1×1 by dialog
// protáhl nebo zmáčknul).
//
// HTML5 canvas API: `fillText` nakreslí text; `textAlign` / `textBaseline`
// určuje, jak se souřadnice mapují na bounding box textu (center/middle
// = střed textu leží přesně v (x, y)). `quadraticCurveTo` se v helperu
// `roundRect` používá pro zaoblení rohů — kvadratická Bézierova křivka
// se dvěma řídícími body.
function makeBubbleTexture(text) {
  const canvas = document.createElement("canvas");
  // Plátno bez ocásku — ocásek je teď samostatný 3D mesh (dynamický směr,
  // míří na mluvčího z libovolného úhlu). Plátno je tedy jen zaoblený
  // obdélník s textem. Poměr 512×150 ≈ 3.4:1 odpovídá předchozímu bubble
  // regionu, takže velikost textu zůstane podobná.
  const W = 512, H = 150;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // --- Zaoblený obdélník jako jeden path + fill + stroke ---
  const PAD = 6;                   // vnitřní okraj, aby stroke nevyjel z plátna
  const RADIUS = 28;               // radius zaoblení rohů

  ctx.beginPath();
  ctx.moveTo(PAD + RADIUS, PAD);
  ctx.lineTo(W - PAD - RADIUS, PAD);                                   // horní hrana
  ctx.quadraticCurveTo(W - PAD, PAD, W - PAD, PAD + RADIUS);           // pravý horní roh
  ctx.lineTo(W - PAD, H - PAD - RADIUS);                               // pravá hrana
  ctx.quadraticCurveTo(W - PAD, H - PAD, W - PAD - RADIUS, H - PAD);   // pravý spodní roh
  ctx.lineTo(PAD + RADIUS, H - PAD);                                   // spodní hrana
  ctx.quadraticCurveTo(PAD, H - PAD, PAD, H - PAD - RADIUS);           // levý spodní roh
  ctx.lineTo(PAD, PAD + RADIUS);                                       // levá hrana
  ctx.quadraticCurveTo(PAD, PAD, PAD + RADIUS, PAD);                   // levý horní roh
  ctx.closePath();

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#222222";
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();

  // --- Text ---
  // `system-ui` = systémový sans-serif. 34 px na 150 px výšce → čitelné.
  ctx.fillStyle = "#111111";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);

  const texture = new THREE.CanvasTexture(canvas);
  // SRGB aby barvy (bílá, černá text) seděly s PBR renderem
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, aspect: W / H };
}

// === Canvas-generovaná textura pro TCUBES stranu s textem/emoji ===
// Vykreslí jediný znak (typicky emoji) na bílý čtverec. Použití: TCUBES s
// `TEXTURE_TOP = "🌳"` atp. Plátno je čtvercové (128×128), aby textura
// nezkreslila jednotku voxelu.
//
// Fonty pro emoji závisí na OS — `Apple Color Emoji` (macOS/iOS), `Segoe UI
// Emoji` (Windows), `Noto Color Emoji` (Linux). Browser si vybere první
// dostupný z fallbacku. Běžný text (např. `"N"`) vykreslí systémový sans.
function makeEmojiTexture(char) {
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Bílé pozadí — kontrastní základ pro tmavé emoji/text
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Emoji vycentrované; velikost 88 px na 128 px plátně = vzduch okolo
  ctx.font = "88px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', system-ui, sans-serif";
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, size / 2, size / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// === Pojmenované procedurální textury (`:dirt`, `:grass-top`, …) ===
// Jednotná base barva + 2–4 náhodné obdélníkové záplaty v kontrastních
// odstínech. Per-cube fresh (žádný singleton) → každá kostka v 10×10 dioramě
// má lehce jiný vzor → žádné mřížkové opakování v ploše.
//
// Idiom inspirovaný Minecraftem zjednodušený do KISS: minimum noisy detailu,
// dominantní jednolitá plocha s drobnou variací. Rozšiřitelné — přidání
// `":sand"` = nová `make*Texture()` + řádek v NAMED_TEXTURE_FACTORIES.
// Konstanty texturového gridu — 16×16 px (Minecraft klasika), záplaty 1–2 px
// (na polovinu z původních 2–5 px). Grass strip = 2 px ≈ 12.5 % výšky kostky
// (cíl 10 % = 1.6 px, zaokrouhleno na celý pixel pro pixel-art look).
const TEX_SIZE = 16;
const PATCH_MIN = 1;
const PATCH_MAX = 2;
const GRASS_STRIP_PX = 2;

// Helper — náhodné obdélníkové záplaty v zadaném vertikálním pásu canvasu.
// Záplaty mohou přesáhnout okraj canvasu nebo pásu (fillRect ořízne) — drobné
// „roztrhané" hrany dávají organický vzhled.
function drawPatches(ctx, palette, count, yMin, yMax) {
  const yRange = yMax - yMin;
  for (let i = 0; i < count; i++) {
    const w = PATCH_MIN + Math.floor(Math.random() * (PATCH_MAX - PATCH_MIN + 1));
    const h = PATCH_MIN + Math.floor(Math.random() * (PATCH_MAX - PATCH_MIN + 1));
    const x = Math.floor(Math.random() * TEX_SIZE);
    const y = yMin + Math.floor(Math.random() * yRange);
    ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
    ctx.fillRect(x, y, w, h);
  }
}

// Wrap canvas → THREE.Texture s pixel-art nastavením (NearestFilter) a
// správným barvovým prostorem.
function canvasToPixelTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Jednolitý base + 2–4 záplaty (přes celou plochu).
function makePatchTexture(baseColor, accentPalette) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  const patchCount = 2 + Math.floor(Math.random() * 3);   // 2..4
  drawPatches(ctx, accentPalette, patchCount, 0, TEX_SIZE);
  return canvasToPixelTexture(canvas);
}

// Pozn.: paleta dirt + grass je sdílená v `DIRT_*` / `GRASS_*` konstantách,
// aby `:grass-side` (kompozit obou vrstev) mohla čerpat ze stejných hodnot.
const DIRT_BASE = "#6b4a2a";
const DIRT_ACCENTS = ["#5a3a22", "#7a5630", "#48301d"];
const GRASS_BASE = "#5d9446";
const GRASS_ACCENTS = ["#4e823c", "#3e6a32", "#6ea054"];
const STONE_BASE = "#8a8278";
const STONE_ACCENTS = ["#6f6860", "#a09890", "#5a5450"];

function makeDirtTexture() {
  return makePatchTexture(DIRT_BASE, DIRT_ACCENTS);
}

function makeGrassTopTexture() {
  return makePatchTexture(GRASS_BASE, GRASS_ACCENTS);
}

function makeStoneTexture() {
  return makePatchTexture(STONE_BASE, STONE_ACCENTS);
}

// Kolej (vrch voxelu): tmavě hnědý štěrkový základ + pražce (sleepers) +
// kovové kolejnice. Pražce vertikální v canvasu (= napříč směrem jízdy
// ve světě X), kolejnice horizontální v canvasu (= podél X osy ve světě).
// Pokud orientace v prohlížeči vyjde špatně, swap canvas X/Y.
function makeRailTopTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  // Tmavě hnědý štěrk pod tratí
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Pražce — 4 vertikální dřevěné pruhy (canvas X)
  ctx.fillStyle = "#6b4a2a";
  for (const sx of [1, 5, 9, 13]) {
    ctx.fillRect(sx, 0, 2, TEX_SIZE);
  }
  // Kolejnice — 2 horizontální kovové pruhy (canvas Y)
  ctx.fillStyle = "#9c948c";
  ctx.fillRect(0, 4, TEX_SIZE, 2);
  ctx.fillRect(0, 10, TEX_SIZE, 2);
  return canvasToPixelTexture(canvas);
}

// Boční strana grass-bloku: spodních 14 px dirt + vrchních 2 px grass strip.
// Záplaty každé vrstvy jen v jejím pásu (drawPatches respektuje yMin/yMax).
function makeGrassSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  // Spodní vrstva — dirt
  ctx.fillStyle = DIRT_BASE;
  ctx.fillRect(0, GRASS_STRIP_PX, TEX_SIZE, TEX_SIZE - GRASS_STRIP_PX);
  drawPatches(ctx, DIRT_ACCENTS, 2 + Math.floor(Math.random() * 3), GRASS_STRIP_PX, TEX_SIZE);
  // Vrchní vrstva — grass strip
  ctx.fillStyle = GRASS_BASE;
  ctx.fillRect(0, 0, TEX_SIZE, GRASS_STRIP_PX);
  // V tenkém pásu jen 0–1 záplata, ať nezakryje base barvu.
  if (Math.random() < 0.6) {
    drawPatches(ctx, GRASS_ACCENTS, 1, 0, GRASS_STRIP_PX);
  }
  return canvasToPixelTexture(canvas);
}

// Per-cube fresh textury (žádný singleton) — každé volání factory vrátí novou
// `THREE.Texture` s vlastním vzorem → 100 kostek × 6 stran = až 600 unikátních
// textur. Každá 16×16 = 256 px, celkem ~600 KB GPU mem (zanedbatelné).
const NAMED_TEXTURE_FACTORIES = {
  ":dirt":       () => makeDirtTexture(),
  ":grass-top":  () => makeGrassTopTexture(),
  ":grass-side": () => makeGrassSideTexture(),
  ":stone":      () => makeStoneTexture(),
  ":rail-top":   () => makeRailTopTexture(),
};

// === Dispatch: atribut strany TCUBES → Three.js materiál ===
// Rozhodne podle **typu** hodnoty, jaký materiál pro jednu stranu voxelu
// vyrobit. Izomorfně s dispatchem `createSpriteFor(ASSET)` — stejný pattern
// „model drží data, engine interpretuje".
//
//  - `null`/`undefined` → fallback šachovnice (DD-07). Stejná sdílená
//    textura jako u mateřské CUBES — vizuální idiom „strana nevyplněná".
//  - `number` (0xRRGGBB) → plocha barva celé strany.
//  - `string` `:<name>` → pojmenovaná sdílená procedurální textura
//    (`:dirt`, `:grass-top`, …). Lookup v `NAMED_TEXTURE_FACTORIES` —
//    všechny voxely sdílejí stejný `THREE.Texture` instance.
//  - `string` `#rrggbb` / CSS barva → plocha barva.
//  - jiný `string` (emoji/text) → canvas s textem.
function faceMaterialFor(val) {
  if (val == null) {
    return new THREE.MeshStandardMaterial({ map: checkerboardTexture });
  }
  if (typeof val === "number") {
    return new THREE.MeshStandardMaterial({ color: val });
  }
  if (typeof val === "string") {
    // Prefix `:` značí pojmenovanou sdílenou texturu (Minecraft-style).
    if (val.startsWith(":")) {
      const factory = NAMED_TEXTURE_FACTORIES[val];
      if (factory) {
        return new THREE.MeshStandardMaterial({ map: factory() });
      }
      console.warn(`Neznámá pojmenovaná textura: "${val}"`);
      return new THREE.MeshStandardMaterial({ map: checkerboardTexture });
    }
    // `#rrggbb` → Three.js Color parse (stejné jako number). Test přes regex,
    // aby např. `"red"` prošlo stejnou cestou (pojmenované CSS barvy).
    if (/^#[0-9a-f]{3,8}$/i.test(val)) {
      return new THREE.MeshStandardMaterial({ color: val });
    }
    // Jinak canvas s textem / emoji
    return new THREE.MeshStandardMaterial({ map: makeEmojiTexture(val) });
  }
  // Neznámý typ → fallback (defensive; model by neměl dodat nic jiného)
  return new THREE.MeshStandardMaterial({ map: checkerboardTexture });
}

// === Animátory: reakce objektů na TIME ===
// Registry párů `{ object3d, instance }` — render loop přes ně každý frame
// iteruje a podle `instance.ANIMATE.kind` rozhoduje, jak mesh update-ovat.
// Izomorfní s dispatchem vizuálních atributů (DD-14) — model drží recept
// (atribut `ANIMATE`), engine ho interpretuje. Viz DD-15.
//
// Proč nesahá model přímo na mesh? DD-11 (model/engine separation) — model
// je čistě datový, o Three.js neví. Animátor je tedy v `main.js`, ne v třídě.
const animators = [];

// Plný kruh v radiánech — pojmenovaná konstanta, aby `(TAU * t) / period` šel
// číst jako „kolik period uplynulo v radiánech". Math.PI * 2 = 2π.
const TAU = Math.PI * 2;

// Scratch vektory pro animační hot path — reuse místo `new THREE.Vector3()`
// každý frame. `_up` je default osa Three.js válce (+Y, readonly konstanta);
// `_dir`, `_a`, `_b` jsou pracovní buffery, spotřebované v rámci jednoho
// volání a hned přepsané dalším. Pattern „scratch vectors" je standard v
// Three.js animacích — vyhýbá se GC pressure v 60 FPS smyčce.
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

// Fáze harmonické oscilace: převod wall-clock `t` (sekundy) na argument pro
// `Math.sin`. `period` = doba jednoho kompletního kmitu v sekundách,
// `offset` = fázový posun v radiánech (π/2 posune sinus na kosinus).
function oscPhase(t, period, offset = 0) {
  return (TAU * t) / period + offset;
}

// Balón se mírně pohupuje nahoru/dolů. Vak a koš oscilují **nezávisle**
// (různé periody + fázový posun π/2) — koš působí jako „pérující" vůči vaku.
// Lana se každý frame přepnou mezi aktuálními pozicemi vak/koš (geometrie
// `cylinderBetween` je unit-height, délka přes `scale.y`).
function animateBalloonBob(group, anim, t) {
  const parts = group.userData.parts;
  if (!parts) return;

  const bagDy    = anim.bagAmp    * Math.sin(oscPhase(t, anim.bagPeriod));
  const basketDy = anim.basketAmp * Math.sin(oscPhase(t, anim.basketPeriod, Math.PI / 2));

  parts.bag.position.y    = parts.bagBaseY    + bagDy;
  parts.basket.position.y = parts.basketBaseY + basketDy;

  // Přepočítej 4 lana podle aktuálních Y vaku/koše. Scratch vektory `_a`,
  // `_b` reuse-ujeme v každé iteraci — žádná nová alokace per frame.
  const basketRopeY = parts.basket.position.y + parts.ropeBasketOffset;
  const bagRopeY    = parts.bag.position.y    + parts.ropeBagOffset;
  parts.ropes.forEach((ropeMesh, i) => {
    const [cx, cz] = parts.ropeCorners[i];
    _a.set(cx, basketRopeY, cz);
    _b.set(cx * 1.3, bagRopeY, cz * 1.3);
    updateCylinderBetween(ropeMesh, _a, _b);
  });
}

// Strom se kývá ve větru. 3 kužely koruny dostanou X/Z offset jako
// kombinaci dvou sinusů s **různými periodami** (X: periodX, Z: periodZ) —
// nesoudělné periody dávají iluzi náhodnosti (elipsovitý pohyb), ne čistého
// kyvadla. Amplituda × koeficient výšky → spodní kužel se pohne míň, špička
// víc. Kmen zůstává statický (simuluje tuhý kmen s flexibilní korunou).
function animateTreeSway(group, anim, t) {
  const parts = group.userData.parts;
  if (!parts) return;

  // Dvě nezávislé fáze, jedna pro každou osu. Fázový posun π/3 na Z aby
  // kužely ve chvíli t=0 nezačínaly z nuly v obou osách současně.
  const phaseX = oscPhase(t, anim.periodX);
  const phaseZ = oscPhase(t, anim.periodZ, Math.PI / 3);

  parts.cones.forEach((cone, i) => {
    const coef = parts.heightCoefs[i];
    cone.position.x = anim.amplitude * coef * Math.sin(phaseX);
    cone.position.z = anim.amplitude * coef * Math.sin(phaseZ);
  });
}

// Rovnoměrná rotace kolem jedné z os. Na rozdíl od `balloon_bob` / `tree_sway`
// sahá **přímo na kořenový Object3D** (ne na vnitřní díly v `userData.parts`) —
// není závislá na typu vizuálu, funguje pro voxel (TCUBES), složeninu
// (COMPOSITES), sprite i cokoli dalšího. Dokazuje, že pattern `ANIMATE`
// generalizuje napříč třídami (ne jen COMPOSITES).
// Parametry: `axis` = "x" | "y" | "z" (default "y"); `period` = doba jednoho
// plného otočení v sekundách. `oscPhase` vrátí úhel v radiánech (2π × počet
// uplynulých period) — pro rotaci to je přímo aktuální úhel natočení.
function animateRotate(object3d, anim, t) {
  const axis = anim.axis ?? "y";
  object3d.rotation[axis] = oscPhase(t, anim.period);
}

// Objekt obíhá uzavřenou oválnou dráhu („stadium" — atletický ovál, 2 rovné
// úseky + 2 půlkruhové otočky). Parametry:
//  - `length` (L) = délka rovné části (dlouhá osa)
//  - `radius` (R) = poloměr půlkruhu na koncích (krátká osa = 2R)
//  - `period` (T) = doba jednoho oběhu v sekundách
//
// Dráha je v rovině XZ (Y se nemění), dlouhá osa je **X**, krátká **Z**.
// Střed dráhy = původní pozice instance (snapshot `object3d.userData.base`,
// pořízený při registraci). Obvod = 2L + 2πR; `progress = (t/T) mod 1` dává
// normalizovanou polohu, vynásobením obvodem získáme `s` (arc-length).
//
// Heading (`rotation.y`) = tečna k dráze → NORTH strana kostky (default
// forward v Three.js je −Z) vždy míří ve směru pohybu. `rotation.y` rotuje
// CCW při pohledu shora, proto heading = **−a** (opačný smysl než parametr
// úhlu na kružnici) — jinak by se kostka v zatáčce otáčela „ven" místo „do"
// směru pohybu.
function animateOrbitStadium(object3d, anim, t) {
  const base = object3d.userData.base;
  if (!base) return;
  const L = anim.length;
  const R = anim.radius;
  const T = anim.period;

  const perimeter = 2 * L + 2 * Math.PI * R;
  // Dvojité modulo ošetří i záporné `t` — JS `%` vrací záporky pro záporná t.
  const progress = ((t / T) % 1 + 1) % 1;
  const s = progress * perimeter;

  // Hranice fází podle arc-length
  const endStraight1 = L;
  const endArc1      = L + Math.PI * R;
  const endStraight2 = 2 * L + Math.PI * R;

  let dx, dz, heading;
  if (s < endStraight1) {
    // Rovná 1: Z = +R, X roste z −L/2 do +L/2 → směr pohybu +X.
    dx = -L / 2 + s;
    dz = R;
    heading = -Math.PI / 2;
  } else if (s < endArc1) {
    // Půlkruh 1: střed (+L/2, 0), úhel `a` klesá z π/2 do −π/2.
    const a = Math.PI / 2 - (s - endStraight1) / R;
    dx = L / 2 + R * Math.cos(a);
    dz = R * Math.sin(a);
    heading = -a;
  } else if (s < endStraight2) {
    // Rovná 2: Z = −R, X klesá z +L/2 do −L/2 → směr pohybu −X.
    dx = L / 2 - (s - endArc1);
    dz = -R;
    heading = Math.PI / 2;
  } else {
    // Půlkruh 2: střed (−L/2, 0), úhel `a` klesá z −π/2 do −3π/2 (wrap na π/2).
    const a = -Math.PI / 2 - (s - endStraight2) / R;
    dx = -L / 2 + R * Math.cos(a);
    dz = R * Math.sin(a);
    heading = -a;
  }

  object3d.position.x = base.x + dx;
  object3d.position.z = base.z + dz;
  object3d.rotation.y = heading;
}

// Emisivní pulsace — objekt sám ze sebe vyzařuje světlo, které sinusově
// kolísá mezi `min` a `max`. Třetí dimenze `ANIMATE` patternu: po
// **transformaci** (`rotate`, `orbit_stadium`) a **dílech** (`balloon_bob`,
// `tree_sway`) přijde mutace **materiálu**. Funguje na libovolném mesh-u
// s `MeshStandardMaterial` (CCUBES, BALLOON vak, jednostranné TCUBES plochy…).
//
// Parametry:
//  - `period` — doba jednoho cyklu pulsu (s)
//  - `min`    — minimum `emissiveIntensity` (default 0 = úplně zhasnuto)
//  - `max`    — maximum `emissiveIntensity` (default 1.0 = plná síla barvy)
//  - `color`  — barva self-emise jako JS number 0xRRGGBB; default = `material.color`
//  - `opacityMin`, `opacityMax` *(volitelné)* — pokud jsou nastavené, objekt
//    zároveň sinusově mění `material.opacity` v daném rozsahu **ve stejné
//    fázi** s emissive (max záře = max neprůhlednost, „dýchá"). Pro aktivaci
//    stačí zadat alespoň jeden — engine si pak zapne `transparent = true`.
//    Jen jedna z dvojice = druhá dostane default (0 resp. 1.0).
//
// Implementace: `emissive` barva se nastaví **jednou** (lazy init přes
// `userData.pulseInit` flag); per-frame mění jen `emissiveIntensity` (a
// případně `opacity`). Levné (jedna–dvě float mutace) a izomorfní s tím,
// jak `animateRotate` mutuje rotaci. Sinus → [−1, 1] přeškálováno na [0, 1]
// přes (0.5 + 0.5·sin), pak lerp [min, max].
//
// Pozn.: stín transparentního objektu Three.js default nestínuje opacitně
// (závisí na stanardní shadow map bez alpha testu). Pro náš use case
// (dlaždice na zemi s malým stínem) to není viditelně rušivé.
function animatePulse(object3d, anim, t) {
  const mat = object3d.material;
  // Materiály bez `emissive` (ShadowMaterial, SpriteMaterial, pole materiálů
  // u TCUBES) → tichý skip. Instance byla registrována (kind je známý), jen
  // její konkrétní mesh neumí emissive. Validace v registraci by musela znát
  // interní dispatch, což by bylo těsné spojení — raději defensive tady.
  if (!mat?.emissive) return;
  const hasOpacityPulse = anim.opacityMin != null || anim.opacityMax != null;
  if (!object3d.userData.pulseInit) {
    const color = anim.color ?? mat.color.getHex();
    mat.emissive.setHex(color);
    // `transparent = true` zapne alpha blending — jinak Three.js ignoruje
    // `material.opacity` (default režim je opaque). Nastavujeme jen pokud
    // instance opravdu opacity puls chce — nemá smysl za běhu blendovat
    // plně neprůhlednou dlaždici (vyšší fill cost).
    if (hasOpacityPulse) mat.transparent = true;
    object3d.userData.pulseInit = true;
  }
  const min = anim.min ?? 0;
  const max = anim.max ?? 1.0;
  // Normalizovaný sinus ∈ [0, 1] — sdílený pro emissive i opacity, aby
  // obě dimenze „dýchaly" synchronně (max záře = max neprůhlednost).
  const s = 0.5 + 0.5 * Math.sin(oscPhase(t, anim.period));
  mat.emissiveIntensity = min + (max - min) * s;
  if (hasOpacityPulse) {
    const oMin = anim.opacityMin ?? 0;
    const oMax = anim.opacityMax ?? 1.0;
    mat.opacity = oMin + (oMax - oMin) * s;
  }
}

// Lineární drift po jedné ose s **wrap-around** — když objekt opustí dráhu
// na jednom konci, vrátí se z druhého. Idiom „mraky po obloze": jednosměrný
// pohyb s plynulým návratem. Na rozdíl od `orbit_stadium` (uzavřená dráha
// v rovině) je `drift` 1D a má skok — když objekt projde celý `range`,
// teleportuje se zpět na start. Pro mrak vysoko nad scénou je skok na okraji
// viewportu prakticky neviditelný.
//
// Parametry:
//  - `axis`  — "x" | "y" | "z" (default "x")
//  - `speed` — jednotky za sekundu (default 1.0)
//  - `range` — šířka pásu (default 16). Pohyb obíhá v intervalu
//    `[base - range/2, base + range/2]` kolem `userData.base`.
//
// Implementace: `phase = (t * speed) mod range` převedené na `[0, range)`
// (dvojité modulo ošetří záporné `t`). Pozice = `base + phase - range/2` —
// začínáme u `base − range/2`, pokračujeme přes `base`, končíme u
// `base + range/2`, pak skok zpět na start.
function animateDrift(object3d, anim, t) {
  const base = object3d.userData.base;
  if (!base) return;
  const axis = anim.axis ?? "x";
  const speed = anim.speed ?? 1.0;
  const range = anim.range ?? 16;
  const phase = ((t * speed) % range + range) % range;
  object3d.position[axis] = base[axis] + phase - range / 2;
}

// 2D kolizní systém (DD-19) odstraněn v sez. 14 — jediný konzument byly
// humanoidní postavy (CHARACTER/NOODLE/STICKMAN), které se přesunuly do
// samostatného projektu ./source/Stickman. Statické dekorace (TREE/HOUSE/
// ROCK/CLOUD) se mezi sebou nemůžou srážet, takže registry je zbytečný.

// Humanoidní pose primitives + gait animátory + wander stavový automat
// odstraněny v sez. 14 (přesun do projektu ./source/Stickman). Smazáno:
// applyWalkCycle/SitPose/LiePose/WorkPose, resetCharBase, WORK_POSE,
// LIE_GROUND_Y_DEFAULT, animateWalkIdle/RunIdle/SquatLift, moveTowards,
// NOODLE pose primitives (rebuildNoodleLimb, resetNoodleLimbs,
// applyNoodleWalkCycle/SitPose/WorkPose, resetNoodleBase), animateWalk,
// animateSit, animateWander + WANDER_STATES/TIMERS, WALK_PARAMS, RUN_PARAMS,
// enterWanderState, pickNextWanderState. DD-18/19/20 zůstávají v immutable
// logu jako historický kontext.

// Lookup tabulka `kind` → animátor. Nový druh pohybu = nová větev zde (+
// samotná funkce výš). Izomorfní s `faceMaterialFor` dispatchem (DD-14).
// Umožňuje i validaci při registraci — překlep v `ANIMATE.kind` odhalíme
// boot-time warnem, ne tichým no-op v render loopu.
const ANIMATORS = {
  balloon_bob:    animateBalloonBob,
  tree_sway:      animateTreeSway,
  rotate:         animateRotate,
  orbit_stadium:  animateOrbitStadium,
  pulse:          animatePulse,
  drift:          animateDrift,
};

// Registruje pár mesh↔instance k animaci. Voláno z `createMeshFor` pro
// jakoukoli instanci, která má vyplněný `ANIMATE`. Neznámý `kind` se
// odmítne (warn) — nemá smysl iterovat přes něj v render loopu.
//
// Snapshot `object3d.userData.base` drží referenční (počáteční) polohu —
// transformační animátory (`orbit_stadium` a budoucí `drift`) z něj čtou
// střed dráhy. Pozdější změna instance.X/Y/Z by se musela propagovat ručně.
function registerAnimator(object3d, instance) {
  const anim = instance.ANIMATE;
  if (!anim) return;
  if (!ANIMATORS[anim.kind]) {
    console.warn(`Neznámý ANIMATE.kind: "${anim.kind}" (instance ${instance.ID})`);
    return;
  }
  object3d.userData.base = {
    x: object3d.position.x,
    y: object3d.position.y,
    z: object3d.position.z,
  };
  animators.push({ object3d, instance });
}

// Update všech animovaných objektů. `tSeconds` = wall-clock v sekundách
// (plynulé, ne diskrétní TIME.tick). TIME.tick zůstává pro diskrétní
// událostní logiku pozdějších milníků.
function updateAnimations(tSeconds) {
  for (const { object3d, instance } of animators) {
    const anim = instance.ANIMATE;
    if (!anim) continue;
    // `ANIMATORS[anim.kind]` je garantováno vyplněné — registerAnimator
    // nevpustil nezmapované kindy.
    ANIMATORS[anim.kind](object3d, anim, tSeconds);
  }
}

// === Dynamický 3D ocásek pro SPRITES s vyplněným SPEAKER === (DD-16)
// Ocásek žije jako samostatný mesh (tenký 4-segmentový jehlan) mimo sprite —
// sprite je billboard (vždy čelem ke kameře), ocásek je 3D a plnohodnotně
// sleduje mluvčího z jakéhokoli úhlu. Pattern izomorfní s lany balónu:
//  1. `buildBubbleTail` vyrobí unit-height mesh (scale.y = skutečná délka).
//  2. Registrace páru `{ sprite, tail, instance, bubbleHalfHeight }` do
//     `bubbleTails[]` při `createSpriteFor`.
//  3. Per-frame `updateBubbleTails` přepočítá pozici/orientaci jehlanu
//     (vedle `updateAnimations` v render loopu).
//
// Proč samostatný registry a ne `ANIMATE` (DD-15)? **Rozdílná kategorie:**
// `ANIMATE` je uživatelský recept chování zapsaný v modelu (DD-15 definuje
// `{ kind, ...params }`), `bubbleTails` je **engine-interní důsledek** toho,
// že má SPRITES vyplněný `SPEAKER`. Sdílet jeden slot by znamenalo, že
// user s vlastním `ANIMATE` (bubbling bubliny atp.) by přišel o ocásek.
const bubbleTails = [];

// Mapa instance.ID → Three.js Object3D. Plníme v `createMeshFor` a čteme
// při překladu `SPEAKER` instance na aktuální **world position** (ne jen
// instance.X/Y/Z, protože animátory jako `orbit_stadium` mutují mesh,
// ne model — DD-15). Tím může ocásek sledovat i pohybující se mluvčí.
//
// **Cleanup TBD (napříč registry):** `meshByInstance`, `animators`,
// `bubbleTails`, `litEntities`, `tickHandlers` a `edgeOverlays` (v `userData`
// na mesh rootu) se plní monotonně, žádný `removeInstance` mechanismus zatím
// neexistuje. Pro statickou scénu OK; pro editor (Příště sez. 9 bod 3) bude
// potřeba jednotný `destroyInstance(id)` — projde všechny registry a uklidí.
// Dokud editor není, komentář tady stačí jako připomínka; duplicitní
// „TODO cleanup" u každého registru není nutná.
const meshByInstance = new Map();

// Scratch vektor pro cíl ocásku (výstup `resolveSpeakerTarget`).
const _speakerTarget = new THREE.Vector3();

// Převede `SPEAKER` hodnotu na 3D cíl ve world coords. Duck-typing na tvaru
// hodnoty (DD-16, izomorfně s DD-14 pro vizuální atributy):
//  - `{ X, Y, Z }` (UPPER case, DD-12) = instance OBJECTS-potomka.
//    Priorita: pokud je instance v `meshByInstance`, čti **mesh world
//    position** (dynamické — sleduje `object3d.position`, kterou mění
//    animátory). Fallback na `instance.X/Y/Z` + offset (defensive, pro
//    instance zaregistrované mimo standardní flow).
//    Y offset = `bubbleInstance.SPEAKER_OFFSET_Y` (default 0.5 = vrch
//    voxelu 1×1×1). Pro větší entity uživatel nastaví ručně.
//  - `{ x, y, z }` (lower case) = pevný bod v prostoru. Offset ignorován.
function resolveSpeakerTarget(speaker, offsetY, out) {
  if (!speaker) return null;
  if (typeof speaker.X === "number") {
    const mesh = meshByInstance.get(speaker.ID);
    if (mesh) {
      out.set(mesh.position.x, mesh.position.y + offsetY, mesh.position.z);
    } else {
      out.set(speaker.X, speaker.Y + offsetY, speaker.Z);
    }
    return out;
  }
  if (typeof speaker.x === "number") {
    out.set(speaker.x, speaker.y, speaker.z);
    return out;
  }
  return null;
}

// Vyrobí tenký jehlan jako ocásek dialogu. Pattern shodný s `cylinderBetween`:
// geometrie má **jednotkovou výšku**, skutečnou délku řeší `scale.y` při
// update. 4 radiální segmenty dávají „papírový" (tetrahedrický) vzhled —
// méně generický než hladký kónus, a pořád viditelný z jakéhokoli úhlu.
//
// ConeGeometry(radius, height, radialSegments): špička na +Y, základna na
// −Y, střed geometrie v lokálním origin. Stejná konvence jako CylinderGeometry,
// proto `updateBubbleTail` vypočítává quaternion přes `_up` = (0,1,0).
function buildBubbleTail() {
  const geom = new THREE.ConeGeometry(0.06, 1, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geom, mat);
  // Ocásek je vizuální indikátor, ne fyzický objekt — stín tenkého proužku
  // na zemi rušil by čitelnost (přesahuje přes dlaždice gridu). Flag čteme
  // v `createMeshFor` traverzi a přeskakujeme jinak globální castShadow.
  mesh.userData.noShadow = true;
  return mesh;
}

// Přepočítá jeden ocásek — pozici, orientaci, délku. Volaná per-frame.
// Dispatch:
//  1. Pokud `SPEAKER` neumíme rozlousknout (null, nebo target neexistuje)
//     → ocásek zneviditelníme (ne vymažeme, uživatel může SPEAKER doplnit).
//  2. Cíl je < 0.001 j od bubliny → skryj (degenerovaný směr by dal NaN).
//  3. Základna ocásku = střed bubliny posunutý směrem k cíli o
//     `bubbleHalfHeight` — přichytí se na okraj bubliny (ne uprostřed).
//     Aproximace platí přesně, když je cíl pod bublinou (default iso scéna);
//     do stran mírně „kouká dovnitř" bubliny, ale je to přijatelné (bublina
//     ji přesto překryje z pohledu diváka).
//  4. Délka = vzdálenost(start, cíl) — tip přesně v cíli.
//  5. Orientace: quaternion rotující default osu +Y jehlanu na směr
//     (cíl − start). `cylinderBetween` styl.
function updateBubbleTail(entry) {
  const { sprite, tail, instance, bubbleHalfHeight } = entry;
  const target = resolveSpeakerTarget(instance.SPEAKER, instance.SPEAKER_OFFSET_Y, _speakerTarget);
  if (!target) { tail.visible = false; return; }

  // `_dir` = cíl − střed bubliny (reuse scratch z balloon animátoru)
  _dir.subVectors(target, sprite.position);
  const distCenter = _dir.length();
  if (distCenter < 0.001) { tail.visible = false; return; }
  _dir.divideScalar(distCenter);

  // Start ocásku = okraj bubliny směrem k cíli
  _a.copy(sprite.position).addScaledVector(_dir, bubbleHalfHeight);
  // Pokud už je cíl uvnitř bubliny, zbytečný ocásek
  const length = distCenter - bubbleHalfHeight;
  if (length <= 0) { tail.visible = false; return; }

  tail.visible = true;
  tail.scale.y = length;
  tail.quaternion.setFromUnitVectors(_up, _dir);
  // Střed mesh-u = midpoint (start, target)
  tail.position.set(
    (_a.x + target.x) / 2,
    (_a.y + target.y) / 2,
    (_a.z + target.z) / 2,
  );
}

// Update všech ocásků — volané v render loopu vedle `updateAnimations`.
function updateBubbleTails() {
  for (const entry of bubbleTails) updateBubbleTail(entry);
}

// === Diskrétní reakce na TIME.tick: TIMER → ACTION dispatch === (DD-17)
// `ANIMATE` (DD-15) řeší plynulé per-frame chování (wall-clock). Nový mechanismus
// pokrývá **diskrétní události**: TIMER instance se probudí každých N ticků
// a vystřelí `ACTION` — recept `{ kind, target, attr, ... }` izomorfně s ANIMATE.
//
// `tickHandlers[]` je seznam callbacků `(tick) => void` volaných z rozšířeného
// `setInterval` (vedle `advanceTime`). TIMER se tam registruje v `registerBehavior`
// jako closure, která si drží `lastFire` tick počítadlo.
const tickHandlers = [];

// Dispatch ACTION. Každý `kind` je funkce `(action) => void` s odpovědností
// provést efekt. Konzistence s ANIMATORS / faceMaterialFor patternem.
//
//  - `toggle` — flip bool atributu `target[attr]`.
//  - `set`    — `target[attr] = value`.
// Budoucí rozšíření: `increment` (counter), `spawn` (vytvořit instanci),
// `trigger` (řetězit ACTION), …
const ACTIONS = {
  toggle: (action) => {
    action.target[action.attr] = !action.target[action.attr];
  },
  set: (action) => {
    action.target[action.attr] = action.value;
  },
};

function dispatchAction(action) {
  if (!action) return;
  const fn = ACTIONS[action.kind];
  if (!fn) {
    console.warn(`Neznámý ACTION.kind: "${action.kind}"`);
    return;
  }
  fn(action);
}

// Registruje COUNTER instanci do `tickHandlers` + dynamicky přidá HUD řádek.
// COUNTER je „nevizuální ale observable": není ve 3D scéně (nedědí z CUBES),
// ale engine mu vytvoří řádek v `#hud` elementu vedle `TIME`. Každý tick
// `VALUE += INCREMENT`, DOM element se aktualizuje textContentem.
//
// Proč dynamický DOM a ne pevný řádek v HTML? Obecný pattern — libovolný
// počet COUNTERů registrovaných po bootu dostane svůj řádek. HTML zůstává
// minimální (drží jen TIME jako systémový counter).
//
// Bezpečnost: vytváříme elementy přes `createElement` + `textContent`, ne
// `innerHTML` — NAME může přijít od uživatele (budoucí editor), nechceme
// XSS. Konzistentní s `escapeHtml` principem v infotipu.
function registerCounter(instance) {
  const hud = document.getElementById("hud");
  const row = document.createElement("div");
  const labelSpan = document.createElement("span");
  labelSpan.className = "label";
  labelSpan.textContent = `${instance.NAME}:`;
  const valueSpan = document.createElement("span");
  valueSpan.textContent = instance.VALUE;
  row.appendChild(labelSpan);
  row.appendChild(valueSpan);
  hud.appendChild(row);

  // Handler signatura `(tick) => void` je uniform s `registerTimer`. COUNTER
  // sám tick nepotřebuje (inkrementuje každé zavolání), ale kontrakt držíme
  // jednotný — jakýkoli budoucí tickHandler počítá s `(tick)` parametrem.
  tickHandlers.push((_tick) => {
    instance.VALUE += instance.INCREMENT;
    valueSpan.textContent = instance.VALUE;
  });
}

// Registruje TIMER instanci do `tickHandlers`. Closure si pamatuje
// `lastFire = TIME.tick` (start relativní k aktuálnímu stavu, ne absolutní 0 —
// TIMER registrovaný v tick 42 s INTERVAL=5 firuje poprvé v tick 47, ne hned).
function registerTimer(instance) {
  let lastFire = TIME.tick;
  tickHandlers.push((tick) => {
    if (tick - lastFire >= instance.INTERVAL) {
      lastFire = tick;
      dispatchAction(instance.ACTION);
    }
  });
}

// Proběhne všechny handlery — volá se z rozšířeného `setInterval` za
// `advanceTime()`, aby handler viděl už inkrementovaný `TIME.tick`.
function updateTickHandlers() {
  for (const h of tickHandlers) h(TIME.tick);
}

// Dispatch pro nevizuální instance (potomci OBJECTS, ne CUBES). Registruje
// jejich chování v příslušném registru. Symetrie s `createMeshFor` pro
// vizuální entity: user píše `registerBehavior(timer)` místo `scene.add(createMeshFor(timer))`.
function registerBehavior(instance) {
  if (instance instanceof TIMER) {
    registerTimer(instance);
    return;
  }
  if (instance instanceof COUNTER) {
    registerCounter(instance);
    return;
  }
  console.warn(`Neznámá nevizuální třída: ${instance.constructor.name}`);
}

// === Lit entities: fade sync pro BALLOON.LIT ===
// Engine watcher — per-frame lerpuje `emissiveIntensity` vaku a `intensity`
// PointLight-u směrem k cíli podle `instance.LIT` bool. Exponenciální
// konvergence (`1 − exp(−k·dt)`) dává plynulý „fade in / fade out" pocit
// lampionu — ne skok. Rate `k = 5` → ~92 % cesty za 0.5 s.
//
// Proč ne `ANIMATE.kind = "lit"`? LIT je **stav**, ne recept. ANIMATE jede
// nezávisle na atributu, zatímco fade je *reakcí* na změnu bool atributu
// (click nebo TIMER). Stejná kategorie jako bubble tail (DD-16) —
// engine-derived behavior, ne user recipe.
const litEntities = [];

const LIT_MAX_EMISSIVE = 2.0;    // HDR — s tone mappingem vypadá jako „září"
const LIT_MAX_LIGHT    = 30.0;   // PointLight.intensity — dramatické stíny
const LIT_FADE_RATE    = 5.0;    // exponenciální rate; ~0.5 s do 92 %

function registerLit(instance, envelope, light) {
  // `current` drží aktuální interpolovanou intenzitu (0..1). Cíl je
  // `instance.LIT ? 1 : 0`. `envelope`/`light` jsou Three.js refy, aby
  // watcher nemusel procházet scénu.
  litEntities.push({ instance, envelope, light, current: 0 });
}

function updateLit(dt) {
  // `factor = 1 − e^(−k·dt)` = „kolik cesty mezi current a target urazit
  // za tento frame". Pro dt = 1/60 a k = 5: factor ≈ 0.080.
  const factor = 1 - Math.exp(-LIT_FADE_RATE * dt);
  for (const e of litEntities) {
    const target = e.instance.LIT ? 1 : 0;
    e.current += (target - e.current) * factor;
    // Apply na obě vizuální stránky: materiálová záře vaku (HDR) + fyzický
    // světelný zdroj (stíny). Obě sledují stejnou křivku — vizuálně synced.
    e.envelope.material.emissiveIntensity = e.current * LIT_MAX_EMISSIVE;
    e.light.intensity                     = e.current * LIT_MAX_LIGHT;
  }
}

// Face plane systém (canvas výrazy před hlavou STICKMANa) odstraněn v sez. 14
// — STICKMAN se přesunul do projektu ./source/Stickman.

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
  } else if (instance instanceof SPRITES) {
    // 2D billboard — obrázek vždy otočený ke kameře. Nevoxelový potomek,
    // pozice float bez snap-to-grid.
    object3d = createSpriteFor(instance);
  } else if (instance instanceof TCUBES) {
    // Voxel s per-face texturami (6 různých materiálů). Snap-to-grid.
    object3d = createTCubeFor(instance);
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
  //
  // Pozn. pro SPRITES: Three.js `Sprite` nemá `isMesh` (má `isSprite`) a
  // stíny stejně nepodporuje — traverze ho přeskočí a to je záměr. Kořenový
  // userData.instance z řádku výš stačí, raycaster najde sprite přímo.
  object3d.userData.instance = instance;
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.userData.instance = instance;
      // `noShadow` opt-out pro meshe, které jsou vizuální indikátory, ne
      // fyzické objekty (např. bubble tail — tenký proužek na zemi). THREE
      // default castShadow = false, takže stačí prostě přeskočit.
      if (!child.userData.noShadow) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });
  // Pokud má instance vyplněný ANIMATE recept, zaregistruj ji pro per-frame
  // update v render loopu. Bez ANIMATE (null) = statický objekt → přeskoč.
  registerAnimator(object3d, instance);
  // Mapa pro rychlý lookup mesh-u podle instance ID — používá
  // `resolveSpeakerTarget` u dynamických ocásků. Plníme vždy, i pro instance
  // bez SPEAKER (levné — Map put, vlastní spotřeba jen když jiný mesh míří
  // na tuto instanci).
  meshByInstance.set(instance.ID, object3d);
  // LIT-capable třídy registrujeme pro fade watcher tady (ne uvnitř `buildX`),
  // aby registrace engine-derived behaviorů držela jedinou úroveň detailu —
  // stejně jako `registerAnimator` a `meshByInstance.set`. Refy na konkrétní
  // díly (vak, PointLight) čteme z `group.userData.parts`, které `buildBalloon`
  // naplnil. Rozšíření na další LIT třídu (STREETLAMP, FIRE_PIT) = jen další
  // `instanceof` větev zde, ne rozsypané `registerLit` volání v `buildX`.
  if (instance instanceof BALLOON) {
    const { bag, light } = object3d.userData.parts;
    registerLit(instance, bag, light);
  }
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

// Sestaví voxel s per-face texturami pro TCUBES instanci. BoxGeometry v
// Three.js přijímá **pole 6 materiálů** (místo jednoho) — pořadí strnule
// definované engine: [+X, -X, +Y, -Y, +Z, -Z]. Mapujeme ho na projektové
// světové strany podle DD-13 a Q5 ze sezení 4:
//  index 0 (+X) = EAST, 1 (-X) = WEST, 2 (+Y) = TOP, 3 (-Y) = BOTTOM,
//  4 (+Z) = SOUTH (+Z je v Three.js směr „k divákovi"), 5 (-Z) = NORTH.
//
// Každá strana prochází dispatchem `faceMaterialFor`, který podle **typu**
// atributu vrátí barvený nebo textúrovaný materiál, případně fallback
// šachovnici (DD-07).
function createTCubeFor(instance) {
  const materials = [
    faceMaterialFor(instance.TEXTURE_EAST),    // +X
    faceMaterialFor(instance.TEXTURE_WEST),    // −X
    faceMaterialFor(instance.TEXTURE_TOP),     // +Y
    faceMaterialFor(instance.TEXTURE_BOTTOM),  // −Y
    faceMaterialFor(instance.TEXTURE_SOUTH),   // +Z
    faceMaterialFor(instance.TEXTURE_NORTH),   // −Z
  ];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
  snapToGrid(mesh, instance);
  return mesh;
}

// Sestaví 2D billboard pro SPRITES instanci. Vrací `THREE.Sprite` — speciální
// Three.js objekt, který se sám stará o to, aby byl vždy otočený ke kameře
// (tzv. billboard). Nepotřebuje per-frame `lookAt(camera)`, projekce se řeší
// v shaderu. Pozice je float bez snap-to-grid (DD-12).
//
// Interpretace atributu `ASSET`:
//  - `null` / nezadáno → šachovnicový billboard (fallback DD-07).
//  - `string` → text vykreslený přes `makeBubbleTexture` jako dialog bubble.
//
// Měřítko spritu: default `Sprite.scale` je 1×1×1. Pro bubble se poměr stran
// vypočítá z plátna (aby se text nezkreslil), pro šachovnici drží čtvercový
// formát. Jednotka délky 3D světa = stejná jako hrana voxelu, takže bubble
// široká ~2 jednotky působí „úměrně" ke kostkám.
function createSpriteFor(instance) {
  let material;
  let spriteWidth;
  let spriteHeight;

  if (typeof instance.ASSET === "string") {
    // Text → canvas bubble (plochý zaoblený obdélník, bez ocásku). Poměr
    // stran ~3.4:1 podle plátna 512×150. Cílová výška bubliny ve světě = 0.5 j.
    const { texture, aspect } = makeBubbleTexture(instance.ASSET);
    material = new THREE.SpriteMaterial({ map: texture });
    spriteHeight = 0.5;
    spriteWidth  = spriteHeight * aspect;
  } else {
    // Fallback: šachovnicový billboard (DD-07). Square 1×1, reuse sdílené textury.
    material = new THREE.SpriteMaterial({ map: checkerboardTexture });
    spriteWidth = spriteHeight = 1;
  }

  const sprite = new THREE.Sprite(material);
  sprite.position.set(instance.X, instance.Y, instance.Z);
  // `scale` spritu určuje jeho velikost ve světových jednotkách (jako kdyby
  // kamera byla ortografická — sprite si drží apparent size podle vzdálenosti
  // v perspektivě). Z-rozměr scale je u spritu ignorován, ale musí být > 0.
  sprite.scale.set(spriteWidth, spriteHeight, 1);

  // Bez vyplněného SPEAKER → bublina bez ocásku, sprite jako samostatný node.
  if (!instance.SPEAKER) return sprite;

  // S vyplněným SPEAKER → `Group` obsahující sprite (billboard) + ocásek
  // (plnohodnotný 3D mesh). Group je v origin bez transformace, takže
  // `sprite.position` = world pozice (čte ji `updateBubbleTail`). Sprite
  // v Group billboarduje nezávisle na rodiči (Three.js Sprite si projekci
  // řeší v shader-u podle kamery, ne hierarchie).
  const group = new THREE.Group();
  group.add(sprite);
  const tail = buildBubbleTail();
  group.add(tail);
  bubbleTails.push({ sprite, tail, instance, bubbleHalfHeight: spriteHeight / 2 });
  return group;
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
  } else if (instance instanceof HOUSE) {
    buildHouse(group, instance);
  } else if (instance instanceof CLOUD) {
    buildCloud(group);
  } else if (instance instanceof ROCK) {
    buildRock(group, instance);
  } else if (instance instanceof TUNNEL_ARCH) {
    buildTunnelArch(group, instance);
  } else if (instance instanceof WAREHOUSE) {
    buildWarehouse(group, instance);
  } else if (instance instanceof TRAIN) {
    buildTrain(group, instance);
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
  // Geometrie má **jednotkovou výšku** (height = 1); skutečnou délku zajistí
  // `scale.y` v `updateCylinderBetween`. Tím lze stejný mesh reuse-ovat pro
  // animované lana (délka se mění za běhu) i pro statické (nastaví se jednou).
  const geom = new THREE.CylinderGeometry(radius, radius, 1, 8);
  const mesh = new THREE.Mesh(geom, material);
  updateCylinderBetween(mesh, a, b);
  return mesh;
}

// Přestaví existující válec mezi body `a` a `b` — použito při tvorbě i
// při každém frame u animovaných lan. Mutuje `mesh.position`,
// `mesh.quaternion`, `mesh.scale.y`. Reuse `_dir` + `_up` scratch vektorů
// → žádné per-frame alokace.
function updateCylinderBetween(mesh, a, b) {
  _dir.subVectors(b, a);                     // `_dir` = b − a, délka vektoru
  const length = _dir.length();
  mesh.scale.y = length;                     // jednotková výška × délka
  if (length > 0) {
    // Normalizace in-place — délku už známe, dělíme přímo (ušetří další
    // Math.sqrt, které by proběhlo v `normalize()`).
    _dir.divideScalar(length);
    mesh.quaternion.setFromUnitVectors(_up, _dir);
  }
  mesh.position.copy(a).lerp(b, 0.5);        // střed válce = midpoint
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

  // Reference na kužely + váhy výšky pro animaci `tree_sway`. Koeficient
  // roste zdola nahoru — spodní kužel se pohne nejmíň, špička nejvíc,
  // což simuluje ohybový profil kmene („S-flex"). Kmen je statický, takže
  // ho neukládáme.
  group.userData.parts = {
    cones: [cone1, cone2, cone3],
    heightCoefs: [0.3, 0.6, 1.0],
  };
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
  const basketBaseY = 0.15;
  basket.position.y = basketBaseY;
  group.add(basket);

  // --- Vak ---
  // SphereGeometry(radius, widthSegments, heightSegments).
  // Widthsegments/heightsegments = kolik polí má síť — vyšší hodnoty = hladší
  // koule (víc trojúhelníků). 16×12 je kompromis mezi kvalitou a náklady.
  // Vak má navíc `emissive` nastavené na vlastní COLOR (lampion po rozsvícení
  // září vlastní barvou); `emissiveIntensity = 0` při bootu → start tmavý.
  // Fade watcher (DD-17 — BALLOON.LIT) tuto hodnotu per-frame lerpuje.
  const envelopeMat = new THREE.MeshStandardMaterial({
    color: instance.COLOR,
    emissive: new THREE.Color(instance.COLOR),
    emissiveIntensity: 0,
  });
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    envelopeMat,
  );
  // Lehké vertikální protažení pro klasický hruškovitý tvar balónu
  envelope.scale.y = 1.15;
  // Střed vaku Y = 1.3 → spodek vaku na Y ≈ 0.67 (1.3 − 0.55·1.15)
  const bagBaseY = 1.3;
  envelope.position.y = bagBaseY;
  group.add(envelope);

  // --- PointLight uvnitř vaku (lampion) ---
  // Barva laděná k vaku, ale mírně teplejší (žloutnutí směrem k warm white)
  // — čistý orange by zabarvil celou scénu do ohnivé, lehce posunutý
  // k 0xffb060 dává „lantern/ohňový" pocit bez přebarvení.
  // Intenzita = 0 (watcher ji přepočítá podle LIT); distance 20 j pokryje
  // celou scénu s rezervou (pozice balónu (1,3,2), okraj gridu ±5 → ~9 j
  // nejdelší úhlopříčka, zbytek falloff mezi decay=2); decay 2 je fyzikálně
  // korektní kvadratický pokles, ale s vyšší max intenzitou (30) lampion
  // svítí na celou scénu, ne jen bezprostřední okolí.
  // castShadow = true — **druhá shadow mapa** vedle slunce, objekty vrhají
  // další stíny (záměr uživatele). Cube camera pro 6 směrů = 6× render pass;
  // mapSize 1024² dává ostřejší stíny (svítivější lampion víc ukazuje artefakty).
  const light = new THREE.PointLight(0xffb060, 0, 20, 2);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far  = 20;
  // Mírný bias proti shadow acne / peter-panning (stejný důvod jako u slunce).
  light.shadow.bias       = -0.0005;
  light.shadow.normalBias =  0.02;
  // Light jako **child vaku** (ne sourozenec v `group`): při pohupování
  // (`animateBalloonBob` mutuje `envelope.position.y`) se světlo pohupuje
  // spolu s vakem → lantern efekt zůstává centrovaný. Lokální pozice (0,0,0)
  // = střed envelope; scale.y = 1.15 na envelope nemá vliv (scale × 0 = 0).
  envelope.add(light);

  // --- 4 lana ---
  // Uchycení hluboko uvnitř koše (Y = 0.1, pod vrškem) a hluboko uvnitř vaku
  // (Y = 1.0, ve spodní třetině koule). Lana pak prostupují stěnami obou
  // objektů — vypadá to jako "lana skrze kůži", ne "lana přilepená zvenku".
  // Ukládáme **relativní offset** vůči základní Y koše/vaku: při pohupování
  // se uchycení posune spolu s rodičem a zůstane „ve" stěně.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
  const ropeStartY = 0.1;                           // uvnitř koše
  const ropeEndY   = 1.0;                           // uvnitř vaku
  const ropeBasketOffset = ropeStartY - basketBaseY; // −0.05
  const ropeBagOffset    = ropeEndY   - bagBaseY;    // −0.3
  const corners = [
    [ 0.18,  0.18],   // +X, +Z
    [-0.18,  0.18],   // −X, +Z
    [-0.18, -0.18],   // −X, −Z
    [ 0.18, -0.18],   // +X, −Z
  ];
  // Lana si budeme pamatovat jako pole meshů — animátor je potom za běhu
  // přepočítá (dynamická délka při pohupování vaku/koše). Reuse scratch `_a`,
  // `_b` aby `cylinderBetween` nedostalo per-call alokace.
  const ropes = corners.map(([cx, cz]) => {
    _a.set(cx,        ropeStartY, cz);
    _b.set(cx * 1.3,  ropeEndY,   cz * 1.3);
    const rope = cylinderBetween(_a, _b, 0.015, ropeMat);
    group.add(rope);
    return rope;
  });

  // Reference na části uložíme do userData skupiny — `animateBalloonBob` je
  // za běhu přepočítává (bag Y, basket Y, přepnutí lan).
  group.userData.parts = {
    bag: envelope,
    bagBaseY,
    basket,
    basketBaseY,
    ropes,
    ropeCorners: corners,
    ropeBasketOffset,
    ropeBagOffset,
    light,
  };
}

// Procedurální domek — kvádr stěn + jehlanová střecha. Lokální souřadnice
// Group: střed kvádru v Y=0 (jako kostky 1×1×1). Barva stěn z `instance.COLOR`,
// střecha fixně rezavě červená („pálená taška").
//
// Rozměry: stěny 1.2×1.0×1.2 (šířka × výška × hloubka), střecha jehlan
// 4-segmentový s poloměrem ≈ √2/2 × šířka stěn, výška 0.8. `rotation.y = π/4`
// natočí jehlan tak, aby jeho 4 hrany protnuly rohy stěn (default orientace
// by měla hranu uprostřed strany kvádru → vypadalo by zkroucené).
//
// Jehlan místo sedlové střechy: `ConeGeometry(r, h, 4)` je 1 primitiv (proti
// 2 BoxGeometry prismatu) a vypadá pohádkově symetricky z libovolného směru.
function buildHouse(group, instance) {
  const wallsMat = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  const wallsW = 1.2, wallsH = 1.0, wallsD = 1.2;
  const walls = new THREE.Mesh(
    new THREE.BoxGeometry(wallsW, wallsH, wallsD),
    wallsMat,
  );
  // Střed stěn na Y=0 (vyčnívají od −0.5 do +0.5, stejně jako kostky) — dům
  // opticky „sedí" na gridu bez odsazení.
  walls.position.y = 0;
  group.add(walls);

  // --- Střecha ---
  // ConeGeometry(radius, height, radialSegments). 4 segmenty = čtyřboký jehlan.
  // Poloměr √2/2 × wallsW ≈ 0.849 zajistí, že 4 hrany jehlanu (vzdálené
  // `radius` od osy) trefí rohy stěn (úhlopříčka čtvercového půdorysu dělená 2
  // = √2/2 × strana).
  const roofColor = 0x9b3a2a; // rezavě červená — idiom pálené tašky
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor });
  const roofR = (Math.SQRT2 / 2) * wallsW;
  const roofH = 0.8;
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(roofR, roofH, 4),
    roofMat,
  );
  // Střecha sedí přesně na vrchu stěn (Y = wallsH/2 = 0.5) + polovina výšky
  // střechy (0.4) → střed střechy na Y = 0.9.
  roof.position.y = wallsH / 2 + roofH / 2;
  // Default ConeGeometry se 4 segmenty má hranu na +X; otočení o π/4 (45°)
  // kolem Y posune hrany do rohů kvádru — vizuálně „správně" posazená střecha.
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
}

// Procedurální mrak — shluk 5 překrývajících se koulí s bílou barvou.
// Koule mají různé velikosti a lehce offset pozice, aby výsledek vypadal
// jako shluk oblačnosti, ne geometrická sestava. Vše v lokálních
// souřadnicích Group (0,0,0 = střed mraku).
//
// KISS: pevná geometrie (žádný RNG), seed-free — mrak vypadá pokaždé stejně.
// Pokud budeme chtít variabilní mraky, přidá se `seed` atribut do CLOUD.
function buildCloud(group) {
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
  // Pole [x, y, z, radius] — 5 kusů, centrální největší, okolní menší a
  // posunuté ven. Proporce 0.9 × 2.0 × 0.9 (šířka × výška × hloubka) dává
  // horizontálně protažený mrak, jak se sluší.
  const puffs = [
    [ 0.0,  0.0,  0.0, 0.45],   // centrální
    [-0.55, -0.05, 0.05, 0.35],  // levá
    [ 0.55, -0.05, -0.05, 0.35], // pravá
    [-0.20, 0.20, 0.10, 0.30],   // levá horní
    [ 0.25, 0.18, -0.10, 0.30],  // pravá horní
  ];
  puffs.forEach(([px, py, pz, r]) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(r, 12, 10),
      cloudMat,
    );
    puff.position.set(px, py, pz);
    group.add(puff);
  });
}

// Procedurální balvan — shluk 5 nízkopolygonových koulí v šedé paletě.
// IcosahedronGeometry(radius, detail=0) = 20 trojúhelníků, default hladké
// normály. `flatShading: true` v materiálu přepne na **per-face** normály
// → ostré facety, „tesaný kámen" vzhled (na rozdíl od hladkého kamínku).
// Materiál je per-kus (3 barvy z palety odvozené od `instance.COLOR`), aby
// balvany působily jako geologicky sourodé, ale ne identicky naklonované.
//
// KISS: pevná geometrie (žádný RNG), seed-free — stejný pattern jako CLOUD.
// Rotace jsou pevné funkce indexu (determinický pseudo-random vzhled).
function buildRock(group, instance) {
  // Paleta tří odstínů z `instance.COLOR`: základní, tmavší (×0.75), světlejší
  // (×1.2). Pro každý odstín **jediný sdílený materiál** (3 materiály pro 5
  // mesh-ů, ne 5 unikátních) — GPU state batching friendlier při vyšším počtu
  // kamenů ve scéně. Shared materials jsou bezpečné, dokud je nemutujeme
  // per-instance; balvan je statický (žádný ANIMATE), takže invariant drží.
  const base = new THREE.Color(instance.COLOR);
  const materials = [
    new THREE.MeshStandardMaterial({ color: base.clone(),                         flatShading: true }),
    new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.75),    flatShading: true }),
    new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(1.2),     flatShading: true }),
  ];
  // [x, y, z, radius, materialIndex] — 1 centrální + 2 velké okrajové + 2 malé
  // odštěpky. Y hodnoty záporné → kameny „zapuštěné" do země (působí jako
  // vyčnívající, ne levitující). Scéna Y=-0.5 je země, centrální balvan
  // s r=0.45 sahá od −0.6 do +0.3 (přesah pod zemí = 0.1).
  const puffs = [
    [ 0.0,  -0.15,  0.0,  0.45, 0],  // centrální
    [ 0.4,  -0.25, -0.1,  0.32, 1],  // vpravo vzadu (tmavší)
    [-0.35, -0.30,  0.1,  0.30, 2],  // vlevo vpředu (světlejší)
    [ 0.1,  -0.35,  0.4,  0.18, 1],  // malý odštěpek vpředu
    [-0.1,   0.15, -0.25, 0.22, 0],  // nahoře, jako „kloboučka"
  ];
  puffs.forEach(([px, py, pz, r, mi], i) => {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), materials[mi]);
    rock.position.set(px, py, pz);
    // Pevné (ne náhodné) natočení závislé na indexu — deterministicky rozbije
    // vizuální symetrii icosahedronů (které by bez rotace vypadaly stejně).
    rock.rotation.set(0.3 * i, 0.7 * i + 0.2, 0.5 * i - 0.3);
    group.add(rock);
  });
}

// TUNNEL_ARCH builder — kamenný kulový (zaoblený) oblouk. Half-torus stojící
// jako duha: nohy na zemi, oblouk nahoře, vlak prochází zespodu podél X osy.
//
// TorusGeometry: ring v XY plane, thetaLength=π → horní polovina kruhu.
// Rotace Y o π/2 přepne ring do YZ plane → opening (void uvnitř oblouku) pro
// průchod podél X. Translate Y na −0.5 → nohy na ground level.
// Vertikální stretch 1.7× pro elegantnější (Roman-style) proporce.
function buildTunnelArch(group, instance) {
  const stoneMat = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  const RING_R = 0.42;   // poloměr středu trubky → outer width = 2×(R+tube) ≈ 1
  const TUBE_R = 0.08;   // tloušťka oblouku
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(RING_R, TUBE_R, 8, 24, Math.PI), stoneMat,
  );
  arch.rotation.y = Math.PI / 2;
  arch.position.y = -0.5;
  arch.scale.y = 1.7;    // elliptický stretch — vyšší než širší
  group.add(arch);
}

// WAREHOUSE builder — sklad u koleje (Scéna 2). Kvádr stěn + jehlanová střecha
// (HOUSE idiom) + dveře a okno na čelní (-Z) stěně. Konvence: instance.Y = 0
// znamená spodek stěn na world Y = −0.5 (= horní plocha grass voxelů). Footprint
// 2j × ~1.4j, výška stěn 1.5j + střecha 0.7j → vrchol v world Y ≈ 1.7.
function buildWarehouse(group, instance) {
  const wallMat = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });   // tmavě hnědá
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2a1810 });
  const winMat  = new THREE.MeshStandardMaterial({
    color: 0xffe8a0, emissive: 0x664422, emissiveIntensity: 0.4,         // teplé světlo zevnitř
  });

  const W = 2.0;          // šířka (X)
  const D = 1.4;          // hloubka (Z)
  const H = 1.5;          // výška stěn (Y)
  const ROOF_H = 0.7;
  const GROUND = -0.5;    // top of grass voxel = world Y −0.5

  // Stěny — BoxGeometry s base v Y=GROUND (instance.Y posune celý group)
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wallMat);
  walls.position.y = GROUND + H / 2;
  group.add(walls);

  // Dveře — tmavý plát na −Z stěně (čelo směřující ke koleji v Z=−4)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95), doorMat);
  door.position.set(-0.5, GROUND + 0.475, -D / 2 - 0.001);
  group.add(door);

  // Okno — světlý plát vpravo od dveří, mírně výš (působí osvětleně)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), winMat);
  win.position.set(0.5, GROUND + 0.95, -D / 2 - 0.001);
  group.add(win);

  // Střecha — 4-stranný jehlan (ConeGeometry s 4 segmenty, HOUSE pattern).
  // ConeGeometry default: vrchol v +Y, base v −Y, radius je půl diagonály base.
  // Rotace Y o π/4 narovná stěny jehlanu rovnoběžně s X/Z osami.
  const roofRadius = Math.hypot(W / 2, D / 2) * 0.95;   // diagonála základny
  const roof = new THREE.Mesh(new THREE.ConeGeometry(roofRadius, ROOF_H, 4), roofMat);
  roof.position.y = GROUND + H + ROOF_H / 2;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
}

// TRAIN builder — lokomotiva + 1 nákladní vagón. Konvence: instance.Y = 0
// znamená kola sedí na rail topu (world Y = 0.5) — interní wheel.position.y =
// railTop + wheelRadius. Train heading: lokomotiva vpřed (+X). Vagón vzadu (−X).
function buildTrain(group, instance) {
  const bodyMat    = new THREE.MeshStandardMaterial({ color: instance.COLOR });
  const cabMat     = new THREE.MeshStandardMaterial({ color: 0x442218 });   // tmavší než tělo
  const cargoMat   = new THREE.MeshStandardMaterial({ color: 0x6a4a2a });   // hnědý vagón
  const wheelMat   = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

  const RAIL_TOP   = 0.5;          // world Y koleje (top voxelu Y=0)
  const WHEEL_R    = 0.16;
  const WHEEL_THK  = 0.06;
  const FRAME_BOT  = RAIL_TOP + 2 * WHEEL_R;   // spodek lokomotivy/vagónu

  // --- Lokomotiva (vpředu, X > 0) ---
  const LOCO_LEN = 1.2;
  const LOCO_W   = 0.55;
  const LOCO_H   = 0.55;
  const LOCO_X   = 0.65;            // střed lokomotivy v X
  const loco = new THREE.Mesh(new THREE.BoxGeometry(LOCO_LEN, LOCO_H, LOCO_W), bodyMat);
  loco.position.set(LOCO_X, FRAME_BOT + LOCO_H / 2, 0);
  group.add(loco);

  // Kabina — užší box vzadu na lokomotivě (zadní třetina, vyšší)
  const CAB_LEN = 0.45;
  const CAB_H   = 0.4;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(CAB_LEN, CAB_H, LOCO_W), cabMat);
  cab.position.set(LOCO_X - LOCO_LEN / 2 + CAB_LEN / 2,
                   FRAME_BOT + LOCO_H + CAB_H / 2, 0);
  group.add(cab);

  // Komín — krátký válec na předku lokomotivy
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.32, 10), chimneyMat,
  );
  chimney.position.set(LOCO_X + LOCO_LEN / 2 - 0.2,
                       FRAME_BOT + LOCO_H + 0.16, 0);
  group.add(chimney);

  // --- Vagón (vzadu, X < 0) ---
  const CAR_LEN = 0.95;
  const CAR_W   = LOCO_W;
  const CAR_H   = 0.5;
  const CAR_X   = -0.55;
  const car = new THREE.Mesh(new THREE.BoxGeometry(CAR_LEN, CAR_H, CAR_W), cargoMat);
  car.position.set(CAR_X, FRAME_BOT + CAR_H / 2, 0);
  group.add(car);

  // Spojka mezi lokomotivou a vagónem — krátká tyč
  const link = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.06), wheelMat);
  link.position.set((LOCO_X - LOCO_LEN / 2 + CAR_X + CAR_LEN / 2) / 2,
                    FRAME_BOT + 0.1, 0);
  group.add(link);

  // --- Kola — po 2 párech pod lokomotivou a vagónem ---
  // CylinderGeometry default osa Y; pro kola s osou rovnoběžnou s Z (= napříč
  // směrem jízdy) rotujeme kolem X o π/2.
  function addWheel(x, z) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_THK, 12), wheelMat,
    );
    wheel.position.set(x, RAIL_TOP + WHEEL_R, z);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
  }
  // Lokomotiva — 2 páry: pod přední třetinou + zadní třetinou
  for (const x of [LOCO_X + 0.3, LOCO_X - 0.3]) {
    addWheel(x,  LOCO_W / 2 + 0.02);
    addWheel(x, -LOCO_W / 2 - 0.02);
  }
  // Vagón — 2 páry
  for (const x of [CAR_X + 0.25, CAR_X - 0.25]) {
    addWheel(x,  CAR_W / 2 + 0.02);
    addWheel(x, -CAR_W / 2 - 0.02);
  }
}

// === Scéna 1: úvodní svět ===
// Wrap stávajícího setupu do funkce — umožňuje URL-driven přepínač scén.
// Reload stránky s `?scene=N` → dispatch na patřičný builder. Cleanup
// registrů je „zdarma" díky reloadu (žádný in-memory dispose).
function buildSceneOne(scene) {

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
// Každý záznam má { x, z, color, name } a volitelně `animate` (recept pro
// `ANIMATE`). Červená dlaždice pulsuje emisivně (heartbeat-like, period 2 s)
// jako demo `pulse` animátoru — třetí dimenze `ANIMATE` patternu (mutace
// materiálu po transformacích a dílech). Tyrkysová pulsuje pomaleji a slabší
// — desynchronizovaná s červenou (různé periody ukážou, že animátory běží
// nezávisle per-instance, ne sdílený clock).
const ccubeDefs = [
  { x: -1, z: -1, color: 0xff3b30, name: "Červená dlaždice",
    animate: { kind: "pulse", period: 2.0, min: 0, max: 0.9 } },
  { x:  0, z: -1, color: 0xff9500, name: "Oranžová dlaždice" },
  { x:  1, z: -1, color: 0xffcc00, name: "Žlutá dlaždice" },
  { x:  1, z:  0, color: 0x34c759, name: "Zelená dlaždice" },
  { x:  1, z:  1, color: 0x00c7be, name: "Tyrkysová dlaždice",
    animate: { kind: "pulse", period: 3.5, min: 0.05, max: 0.6,
               opacityMin: 0.25, opacityMax: 1.0 } },
  { x:  0, z:  1, color: 0x007aff, name: "Modrá dlaždice" },
  { x: -1, z:  1, color: 0x7b61ff, name: "Fialová dlaždice" },
  { x: -1, z:  0, color: 0xff2d92, name: "Růžová dlaždice" },
];

// forEach = iterace přes pole. Druhý parametr callbacku je index.
// `padStart(4, "0")` doplní vedoucí nuly → "0001", "0002", …
ccubeDefs.forEach((def, i) => {
  const id = `ccube_${String(i + 1).padStart(4, "0")}`;
  const instance = new CCUBES(id, def.name, def.x, 0, def.z, def.color);
  if (def.animate) instance.ANIMATE = def.animate;
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
// Strom se kývá ve větru. Dvě nesoudělné periody (3.5 a 2.7 s) dávají
// elipsovitý pohyb (ne čisté 1D kyvadlo). Amplituda 0.08 m × koeficient
// výšky kuželu → špička (~1.6 m) viditelně opisuje malou elipsu, spodní
// kužel se téměř nehne.
tree1.ANIMATE = {
  kind: "tree_sway",
  periodX: 3.5,
  periodZ: 2.7,
  amplitude: 0.08,
};
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
// Balón se pomalu pohupuje (vak 4 s / 0.15 m), koš pruží nezávisle s kratší
// periodou a menší amplitudou → vizuální dojem „balón plave, koš dohání".
// Fázový posun π/2 na `basketPeriod` desynchronizuje oba sinusy, takže lana
// viditelně mění délku. `ANIMATE` nastavit **před** `createMeshFor` —
// registrace animátora proběhne tam.
balloon1.ANIMATE = {
  kind: "balloon_bob",
  bagPeriod: 4,
  bagAmp: 0.15,
  basketPeriod: 1.5,
  basketAmp: 0.05,
};
scene.add(createMeshFor(balloon1));

// Krabice s obsahem — TCUBES (per-face textury, DD-13). Pozice (-3, 0, 0)
// zrcadlově ke stromu. TOP = 🌳 (obsah), BOTTOM = 🪵 (dno), 4 strany = 📦
// (stejný obsah). Demo plného vyplnění všech 6 stran.
const tbox1 = new TCUBES(
  "tbox_0001",
  "Krabice s obsahem",
  -3, 0, 0,
  { TOP: "🌳", BOTTOM: "🪵", NORTH: "📦", SOUTH: "📦", EAST: "📦", WEST: "📦" },
  "TCUBES — emoji per-face. TOP strom, BOTTOM poleno, strany krabice.",
);
// Krabice se pomalu otáčí kolem Y (jedno plné otočení za 6 s). Dokazuje, že
// `ANIMATE` funguje i mimo COMPOSITES — `animateRotate` sahá přímo na
// `object3d.rotation`, nevyžaduje `userData.parts`.
tbox1.ANIMATE = { kind: "rotate", axis: "y", period: 6 };
scene.add(createMeshFor(tbox1));

// Částečně texturovaná kostka — TCUBES (-3, 0, 2). Vyplněný jen TOP (⭐),
// zbývající 5 stran null → fallback šachovnice (DD-07). Demo, že nevyplněná
// strana sedí na stejném vizuálním idiomu jako mateřská CUBES.
const tbox2 = new TCUBES(
  "tbox_0002",
  "Hvězda na vrchu",
  -3, 0, 2,
  { TOP: "⭐" },
  "TCUBES — jen TOP vyplněný, ostatní strany fallback na šachovnici.",
);
// Kostka obíhá oválnou dráhu kolem své výchozí pozice (stadium: 2 rovné
// úseky × 2 půlkruhy). L=2, R=0.8 → rozsah X [-4.8, -1.2], Z [1.2, 2.8]
// (v gridu, neprotíná tbox_0001 na Z=0). Heading plynule sleduje tečnu
// dráhy → NORTH strana vždy ukazuje dopředu jako auto na trati.
tbox2.ANIMATE = {
  kind: "orbit_stadium",
  length: 2,
  radius: 0.8,
  period: 10,
};
scene.add(createMeshFor(tbox2));

// Domek za růžicí — HOUSE (COMPOSITES). Pozice (0, 0, -3): středově
// v ose Z, za mateřskou CUBES + severní řadou dlaždic (ty jsou na Z=-1).
// Stěny bledě béžové (0xe8d4a8, wheat-like), střecha fixně rezavá v enginu.
// Statický — žádný ANIMATE. Dokončuje základní COMPOSITES trio (TREE +
// BALLOON + HOUSE).
const house1 = new HOUSE(
  "house_0001",
  "Domek",
  0, 0, -3,
  0xe8d4a8,
  "COMPOSITES — stěny (kvádr) + jehlanová střecha (4-segment cone).",
);
scene.add(createMeshFor(house1));

// Mrak vysoko nad scénou — CLOUD (COMPOSITES) s `drift` animací.
// Pozice base (0, 4.5, -2): nad scénou mírně dozadu. Drift po ose X, speed
// 0.6 j/s, range 16 → pozice obíhá od -8 do +8. Cyklus 26.7 s; skok
// wrap-around na hranicích viewportu je v default kamera perspektivě
// minimálně rušivý. Y a Z zůstávají fixní (mrak letí horizontálně).
const cloud1 = new CLOUD(
  "cloud_0001",
  "Mrak",
  0, 4.5, -2,
  "COMPOSITES — shluk 5 koulí. Drift po ose X s wrap-around.",
);
cloud1.ANIMATE = {
  kind: "drift",
  axis: "x",
  speed: 0.6,
  range: 16,
};
scene.add(createMeshFor(cloud1));

// Balvan vlevo vzadu — ROCK (COMPOSITES). Pozice (-3, 0, -2): mimo dráhu
// tbox_0002 (ta obíhá Z ∈ [1.2, 2.8]) a za mateřskou CUBES. Barva 0x9b8871
// = teplá šedohnědá (pískovec) — světlejší než domek, tmavší než mrak,
// přirozeně zapadá do palety. Statický (bez ANIMATE) — balvany nemají
// ambice se hýbat. Uzavírá pětici COMPOSITES (TREE / BALLOON / HOUSE /
// CLOUD / ROCK): organický, mechanický, stavební, atmosférický, geologický.
const rock1 = new ROCK(
  "rock_0001",
  "Balvan",
  -3, 0, -2,
  0x9b8871,
  "COMPOSITES — shluk 5 nízkopolygonových koulí (flat-shaded icosahedronů).",
);
scene.add(createMeshFor(rock1));

// (Sez. 14: humanoidní postavy — char_0001..char_0004, wander automat —
// přesunuty do projektu ./source/Stickman. Scéna 1 dál ukazuje statické
// dekorace + animátory ne-humanoidních entit.)

// TIMER — první nevizuální potomek OBJECTS ve scéně (DD-17). Každých 5 ticků
// (= 5 s) toggle-uje `balloon1.LIT`. Kombinuje se s click-to-toggle handlerem
// — oba mechanismy mění stejný stav, fade watcher propaguje do emissive +
// PointLight. Po zapnutí „lantern mode": vak září, objekty ve scéně dostanou
// druhý zdroj stínů (vedle slunce) → dramatická večerní atmosféra.
const timer1 = new TIMER(
  "timer_0001",
  "Timer lampionu",
  5,
  "Nevizuální OBJECTS — každých 5 ticků toggle balloon.LIT (DD-17).",
);
timer1.ACTION = { kind: "toggle", target: balloon1, attr: "LIT" };
registerBehavior(timer1);

// COUNTER — druhý nevizuální potomek OBJECTS (sez. 9). Není ve 3D scéně,
// ale engine mu přidá řádek do HUD vedle `TIME`. Každý tick `VALUE +=
// INCREMENT` (= 1 / s). Demonstruje, že nevizuální entita může být
// plně observable jinou cestou než 3D renderováním (HUD DOM).
//
// COUNTER.VALUE je obyčejné datové pole — TIMER.ACTION { kind: "set",
// target: counter, attr: "VALUE", value: 0 } by ho mohl kdykoli resetovat.
const counter1 = new COUNTER(
  "counter_0001",
  "Skóre",
  0,   // start hodnota
  1,   // increment per tick
  "Nevizuální OBJECTS — skóre v HUD, +1 každý tick.",
);
registerBehavior(counter1);

// Dialog bubble mluvícího stromu — SPRITES (2D billboard, DD-13) + dynamický
// 3D ocásek (M8+). Pozice (4.6, 2.7, 1.2) je **mimo osu stromu** (4.6 vs.
// tree.X=3, Z=1.2 vs. tree.Z=0) — demonstruje, že ocásek míří diagonálně
// na mluvčího, ne jen kolmo dolů. Statický ocásek v tomto případě (strom
// mění jen pozice kuželů v `userData.parts`, ne kořenovou `object3d.position`,
// proto `resolveSpeakerTarget` vrací stabilní bod).
const dialog1 = new SPRITES(
  "dialog_0001",
  "Bublina stromu",
  4.6, 2.7, 1.2,
  "Ahoj! Jsem mluvící strom.",
  "SPRITES — bublina mimo osu stromu, dynamický 3D ocásek míří na mluvčího.",
);
dialog1.SPEAKER = tree1;
// Strom má vrch koruny v ~Y = 1.85. Přepíšeme default 0.5 (pro voxel) na 1.8,
// aby tail mířil do horní třetiny koruny, ne do kmene.
dialog1.SPEAKER_OFFSET_Y = 1.8;
scene.add(createMeshFor(dialog1));

// Druhá bublina — demo dynamického trackingu pohyblivého cíle. SPEAKER =
// `tbox2` (obíhá po stadium-dráze kolem své základny (-3, 0, 2)). Protože
// `animateOrbitStadium` mutuje `object3d.position` (ne `instance.X/Y/Z`),
// `resolveSpeakerTarget` čte aktuální world position přes `meshByInstance`
// → ocásek se po scéně „žene" za krabicí. Bublina je pevně nad středem
// orbity ve výšce ~3 j (dostatečně vysoko, aby neprotínala dráhu krabice
// L=2, R=0.8 v Y=0).
const dialog2 = new SPRITES(
  "dialog_0002",
  "Bublina krabice",
  -3, 3.2, 2,
  "Hej! Koukni, jak obíhám!",
  "SPRITES — dynamický ocásek sleduje orbitující krabici tbox_0002.",
);
dialog2.SPEAKER = tbox2;
// Krabice je voxel 1×1×1 → default SPEAKER_OFFSET_Y (0.5) míří přesně na vrch.
scene.add(createMeshFor(dialog2));

}   // konec buildSceneOne

// === Scéna 2: 10×10 dioráma (postupně budovaná, s interaktivním builderem) ===
// Připraveno v kódu (čeká na zavolání): textura `:rail-top`; třídy WAREHOUSE,
// TRAIN; buildery `buildWarehouse`, `buildTrain`.

// Helpery pro 3 typy voxelových bloků — sjednocený pattern (izomorfismus).
// Volány z `buildSceneTwo` (statický seed) i z builderu (interaktivní spawn).
// Helpery pro 3 typy voxelových bloků — sdílený pattern (izomorfismus DD-14).
function makeStoneBlock(id, x, y, z) {
  return new TCUBES(id, `Skála (${x}, ${y}, ${z})`, x, y, z, {
    TOP:    ":stone", BOTTOM: ":stone",
    NORTH:  ":stone", SOUTH:  ":stone",
    EAST:   ":stone", WEST:   ":stone",
  }, "TCUBES — skála (šedý kamenný blok).");
}

function makeDirtBlock(id, x, y, z) {
  return new TCUBES(id, `Hlína (${x}, ${y}, ${z})`, x, y, z, {
    TOP:    ":dirt", BOTTOM: ":dirt",
    NORTH:  ":dirt", SOUTH:  ":dirt",
    EAST:   ":dirt", WEST:   ":dirt",
  }, "TCUBES — hlíněný blok.");
}

function makeGrassBlock(id, x, y, z) {
  return new TCUBES(id, `Tráva (${x}, ${y}, ${z})`, x, y, z, {
    TOP:    ":grass-top", BOTTOM: ":dirt",
    NORTH:  ":grass-side", SOUTH:  ":grass-side",
    EAST:   ":grass-side", WEST:   ":grass-side",
  }, "TCUBES — travnatý blok.");
}

// Layout Scény 2 — exportovaný z builderu (sez. 14). Pravidlo „překryté =
// hlína / skála" je už aplikované při exportu (grass s Y+1 obsazené → dirt;
// + Y+2 obsazené → stone). Aktualizace: postavit v builderu, kliknout
// „Export do clipboardu", nahradit obsah pole.
const SCENE2_LAYOUT = [
  ["dirt", -5, -1, -5],
  ["dirt", -5, 0, -5],
  ["dirt", -5, 1, -5],
  ["grass", -5, 2, -5],
  ["dirt", -4, -1, -5],
  ["dirt", -4, 0, -5],
  ["dirt", -4, 1, -5],
  ["grass", -4, 2, -5],
  ["dirt", -3, -1, -5],
  ["dirt", -3, 0, -5],
  ["grass", -3, 1, -5],
  ["dirt", -2, -1, -5],
  ["dirt", -2, 0, -5],
  ["grass", -2, 1, -5],
  ["dirt", -1, -1, -5],
  ["dirt", -1, 0, -5],
  ["dirt", 0, -1, -5],
  ["dirt", 0, 0, -5],
  ["grass", 0, 1, -5],
  ["dirt", 1, -1, -5],
  ["dirt", 1, 0, -5],
  ["grass", 1, 1, -5],
  ["dirt", 2, -1, -5],
  ["dirt", 2, 0, -5],
  ["stone", 2, 1, -5],
  ["stone", 2, 2, -5],
  ["dirt", 3, -1, -5],
  ["dirt", 3, 0, -5],
  ["dirt", 3, 1, -5],
  ["grass", 3, 2, -5],
  ["dirt", 4, -1, -5],
  ["dirt", 4, 0, -5],
  ["dirt", 4, 1, -5],
  ["grass", 4, 2, -5],
  ["dirt", -5, -1, -4],
  ["dirt", -5, 0, -4],
  ["grass", -5, 1, -4],
  ["dirt", -4, -1, -4],
  ["dirt", -4, 0, -4],
  ["grass", -4, 1, -4],
  ["dirt", -3, -1, -4],
  ["grass", -3, 0, -4],
  ["dirt", -2, -1, -4],
  ["grass", -2, 0, -4],
  ["grass", -1, -1, -4],
  ["grass", 0, -1, -4],
  ["dirt", 1, -1, -4],
  ["stone", 1, 0, -4],
  ["dirt", 2, -1, -4],
  ["stone", 2, 0, -4],
  ["stone", 3, -1, -4],
  ["dirt", 3, 0, -4],
  ["stone", 3, 1, -4],
  ["dirt", 4, -1, -4],
  ["grass", 4, 0, -4],
  ["dirt", -5, -1, -3],
  ["dirt", -5, 0, -3],
  ["grass", -5, 1, -3],
  ["dirt", -4, -1, -3],
  // (Y=0 vynecháno — místo pro tunelový oblouk arch_left)
  ["grass", -3, -1, -3],
  ["grass", -2, -1, -3],
  ["grass", -1, -1, -3],
  ["grass", 0, -1, -3],
  ["grass", 1, -1, -3],
  ["grass", 2, -1, -3],
  ["dirt", 3, -1, -3],
  // (Y=0 vynecháno — místo pro tunelový oblouk arch_right)
  ["dirt", 4, -1, -3],
  ["grass", 4, 0, -3],
  ["dirt", -5, -1, -2],
  ["dirt", -5, 0, -2],
  ["grass", -5, 1, -2],
  ["grass", -4, -1, -2],
  ["grass", -3, -1, -2],
  ["grass", -2, -1, -2],
  ["grass", -1, -1, -2],
  ["grass", 0, -1, -2],
  ["grass", 1, -1, -2],
  ["grass", 2, -1, -2],
  ["grass", 3, -1, -2],
  ["dirt", 4, -1, -2],
  ["grass", 4, 0, -2],
  ["grass", -5, -1, -1],
  ["grass", -4, -1, -1],
  ["grass", -3, -1, -1],
  ["grass", -2, -1, -1],
  ["grass", -1, -1, -1],
  ["grass", 0, -1, -1],
  ["grass", 1, -1, -1],
  ["grass", 2, -1, -1],
  ["grass", 3, -1, -1],
  ["dirt", 4, -1, -1],
  ["grass", 4, 0, -1],
  ["dirt", -5, -1, 0],
  ["grass", -5, 0, 0],
  ["grass", -4, -1, 0],
  ["grass", -3, -1, 0],
  ["grass", -2, -1, 0],
  ["grass", -1, -1, 0],
  ["grass", 0, -1, 0],
  ["grass", 1, -1, 0],
  ["grass", 2, -1, 0],
  ["grass", 3, -1, 0],
  ["grass", 4, -1, 0],
  ["dirt", -5, -1, 1],
  ["grass", -5, 0, 1],
  ["grass", -4, -1, 1],
  ["grass", -3, -1, 1],
  ["grass", -2, -1, 1],
  ["grass", -1, -1, 1],
  ["grass", 0, -1, 1],
  ["grass", 1, -1, 1],
  ["grass", 2, -1, 1],
  ["grass", 3, -1, 1],
  ["grass", 4, -1, 1],
  ["grass", -5, -1, 2],
  ["grass", -4, -1, 2],
  ["grass", -3, -1, 2],
  ["grass", -2, -1, 2],
  ["grass", -1, -1, 2],
  ["grass", 0, -1, 2],
  ["grass", 1, -1, 2],
  ["stone", 2, -1, 2],
  ["dirt", 3, -1, 2],
  ["stone", 3, 0, 2],
  ["grass", 4, -1, 2],
  ["grass", -5, -1, 3],
  ["grass", -4, -1, 3],
  ["grass", -3, -1, 3],
  ["grass", -2, -1, 3],
  ["grass", -1, -1, 3],
  ["grass", 0, -1, 3],
  ["grass", 1, -1, 3],
  ["dirt", 2, -1, 3],
  ["grass", 2, 0, 3],
  ["stone", 3, -1, 3],
  ["stone", 3, 0, 3],
  ["grass", 4, -1, 3],
  ["grass", -5, -1, 4],
  ["grass", -4, -1, 4],
  ["grass", -3, -1, 4],
  ["grass", -2, -1, 4],
  ["grass", -1, -1, 4],
  ["grass", 0, -1, 4],
  ["grass", 1, -1, 4],
  ["grass", 2, -1, 4],
  ["grass", 3, -1, 4],
  ["grass", 4, -1, 4],
];

function buildSceneTwo(scene) {
  const FACTORIES = {
    grass: makeGrassBlock,
    dirt:  makeDirtBlock,
    stone: makeStoneBlock,
  };
  for (const [kind, x, y, z] of SCENE2_LAYOUT) {
    const id = `s2_${kind}_${x + 5}_${y + 1}_${z + 5}`;
    scene.add(createMeshFor(FACTORIES[kind](id, x, y, z)));
  }

  // Tunelové oblouky — vstupy do tunelu na obou koncích budoucí trati.
  // Vlak mezi nimi pojede podél X osy na Z = −3.
  scene.add(createMeshFor(new TUNNEL_ARCH(
    "arch_left", "Tunelový oblouk vlevo", -4, 0, -3,
  )));
  scene.add(createMeshFor(new TUNNEL_ARCH(
    "arch_right", "Tunelový oblouk vpravo", 3, 0, -3,
  )));
}


// === Scene dispatch podle URL ===
// `?scene=N` parametr vybírá builder. Default = 1. Reload stránky dělá
// kompletní cleanup zdarma (Three.js scene + všechny engine registry).
const SCENE_BUILDERS = { "1": buildSceneOne, "2": buildSceneTwo };
const requestedScene = new URLSearchParams(location.search).get("scene") || "1";
const sceneBuilder = SCENE_BUILDERS[requestedScene] || buildSceneOne;
sceneBuilder(scene);

// === Scene switcher: HUD tlačítka v pravém horním rohu ===
// Reload-based přepínač. Aktivní scéna má `aria-pressed="true"` (vizuální
// odlišení v CSS). Klik = `location.search` → reload s novým parametrem.
const switcherEl = document.getElementById("scene-switcher");
if (switcherEl) {
  Object.keys(SCENE_BUILDERS).forEach((id) => {
    const btn = document.createElement("button");
    btn.textContent = `Scéna ${id}`;
    btn.setAttribute("aria-pressed", id === requestedScene ? "true" : "false");
    btn.addEventListener("click", () => {
      if (id === requestedScene) return;
      location.search = `?scene=${id}`;
    });
    switcherEl.appendChild(btn);
  });
}

// === Edge highlight při hover (editor-like feedback) ===
// Při najetí kurzoru na CUBES-potomka (kromě SPRITES) vykreslíme žluté
// hrany meshe — jasný signál „toto je vybraná entita". Použití v budoucím
// scéně-editoru (selekce), zatím UX zpětná vazba.
//
// Pattern: lazy build při prvním hoveru, cache v `root.userData.edgeOverlays`.
// Per-mesh `THREE.EdgesGeometry(geom, 20)` → hrany s dihedral úhlem > 20°
// (BoxGeometry = 12 hran čistě; SphereGeometry = žádné, plynulé; IcosahedronGeometry
// s flatShading = všechny facet hrany). `LineSegments` s `LineBasicMaterial`
// (WebGL limit — tenká 1px linie, na většině driverů se neignoruje linewidth).
//
// `depthTest = true` → jen **viditelné** hrany (zadní hrany skryté za plochou
// se nekreslí). `polygonOffset: true` + negativní factor/units posune hrany
// mírně k divákovi, aby nekoexistovaly v přesně stejném Z jako mesh plochy
// (prevence „stípkaného" nebo mizejícího efektu hran sedících přesně na ploše).
//
// `raycast = () => {}` no-op → hrany nejsou raycastovatelné → hover detekci
// (raycaster nad `firstHit`) neruší. Jinak by hover „chytal" vlastní overlay.
//
// SPRITES skip: 2D billboardy nemají smysluplné 3D hrany. SPRITES se SPEAKER
// (Group s tail mesh) by jinak dostali hranatý ocásek — nežádoucí.

function setEdgeHighlight(instance, on) {
  if (!instance) return;
  if (instance instanceof SPRITES) return;
  const root = meshByInstance.get(instance.ID);
  if (!root) return;

  if (!root.userData.edgeOverlays) {
    const overlays = [];
    root.traverse((child) => {
      if (!child.isMesh) return;
      const edges = new THREE.EdgesGeometry(child.geometry, 20);
      const material = new THREE.LineBasicMaterial({
        color: 0xffff00,             // editor-yellow (konvence selekce)
        depthTest: true,             // jen viditelné hrany
        polygonOffset: true,         // posun vůči ploše (prevence z-fight)
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const lines = new THREE.LineSegments(edges, material);
      lines.raycast = () => {};                   // ignore v raycast
      lines.visible = false;                      // default off; `on=true` zapne
      child.add(lines);                           // child mesh-u → dědí transform
      overlays.push(lines);
    });
    root.userData.edgeOverlays = overlays;
  }
  for (const ov of root.userData.edgeOverlays) ov.visible = on;
}

// === Infotip (hover panel s atributy instance) ===
// Viz DD-08. Generický přístup: iteruje vlastní vlastnosti instance a
// vypíše je jako řádky. Funguje pro libovolnou třídu dědící z OBJECTS.
const tooltipEl = document.getElementById("tooltip");
const raycaster = new THREE.Raycaster();
// pointer = normalized device coordinates: X v [-1, +1], Y v [-1, +1]
const pointer = new THREE.Vector2();
let lastHoveredMesh = null;
let lastHoveredInstance = null;   // pro edge highlight — pamatovat, kdo byl highlighted

// Escape HTML kvůli bezpečnosti — NAME/DESCRIPTION může v budoucnu přijít
// od uživatele; nechceme XSS, když se tam dostane `<script>`.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

// Formátování hodnoty podle klíče — pro většinu atributů se nic nemění,
// ale barvové atributy (COLOR, TEXTURE_*) převedeme na čitelný hex "#rrggbb",
// null/undefined zobrazíme jako pomlčku (pro TCUBES = „strana nevyplněná,
// fallback na šachovnici").
//
// `toString(16)` převádí číslo na hex řetězec; `padStart(6, "0")` doplní
// vedoucí nuly (aby např. 0x00ff00 nedávalo "ff00").
function formatValue(key, val) {
  // Nullish → pomlčka (izomorfně pro jakýkoli atribut, ne jen TEXTURE_*)
  if (val == null) return "—";
  // COLOR na CCUBES/BALLOON; TEXTURE_* na TCUBES. Oba případ: number → hex.
  if (typeof val === "number" && (key === "COLOR" || key.startsWith("TEXTURE_"))) {
    return "#" + val.toString(16).padStart(6, "0");
  }
  // ANIMATE = recept chování (objekt `{ kind, ...params }`). V infotipu
  // stačí zobrazit samotný `kind` — detailní parametry uživatel uvidí v kódu.
  // Plná serializace by dala „[object Object]" přes escapeHtml.
  if (key === "ANIMATE" && typeof val === "object") {
    return val.kind || "object";
  }
  return val;
}

// Vykreslí tooltip pro danou instanci.
function renderTooltip(instance) {
  // instance.constructor.name vrátí např. "CUBES" — použije se jako nadpis
  const header = instance.constructor.name;
  // Object.entries vytáhne [klíč, hodnota] páry z vlastních atributů instance.
  // Nevyplněný `ANIMATE` (default null u statických entit) skryjeme — je to
  // technický default, uživatele ruší. Nevyplněná TEXTURE_* zůstávají (tam je
  // „—" sémantické: fallback na šachovnici, DD-07).
  const rows = Object.entries(instance)
    .filter(([key, val]) => !(key === "ANIMATE" && val == null))
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
    const instance = firstHit.object.userData.instance;
    showTooltip(event, instance);
    lastHoveredMesh = firstHit.object;
    // Edge highlight: pokud jsme přešli na jinou instanci, vypni starý
    // overlay a zapni nový. Same-instance hover → nic (overlay už svítí).
    if (instance !== lastHoveredInstance) {
      setEdgeHighlight(lastHoveredInstance, false);
      setEdgeHighlight(instance, true);
      lastHoveredInstance = instance;
    }
  } else {
    hideTooltip();
    setEdgeHighlight(lastHoveredInstance, false);
    lastHoveredInstance = null;
    lastHoveredMesh = null;
  }
});
// Skryj tooltip + edge highlight, když kurzor opustí canvas úplně
canvas.addEventListener("pointerleave", () => {
  hideTooltip();
  setEdgeHighlight(lastHoveredInstance, false);
  lastHoveredInstance = null;
});

// === Click handler: toggle interakce s entitami ===
// Událost `click` (ne `pointerdown`) se spouští jen při down+up bez drag —
// elegantně odlišuje „kliknutí na entitu" od „tah OrbitControls kamery".
// Reuse stávajícího raycasteru + pointer vektoru (alokace mimo hot path).
//
// Dispatch podle třídy: zatím jediný handled case = klik na BALLOON → toggle
// `instance.LIT`. Fade watcher (DD-17) stav propaguje do emissive + PointLight.
// Pokud přibude víc interaktivních tříd, refaktor na `INTERACTIONS = { ClassName: fn }`
// tabulku — izomorfně s `ACTIONS` / `ANIMATORS` patternem.
// Pomocný raycast helper — sdílený mezi LMB click a RMB contextmenu.
function raycastFirstInstance(event) {
  pointer.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  return hits.find((h) => h.object.userData?.instance);
}

canvas.addEventListener("click", (event) => {
  const firstHit = raycastFirstInstance(event);
  if (!firstHit) return;
  const instance = firstHit.object.userData.instance;
  if (instance instanceof BALLOON) {
    instance.LIT = !instance.LIT;
  }
});

// === Klávesové ovládání kamery ===
// WASD = horizontální pan (W/S podél kamerového „forward" promítnutého na XZ
// rovinu, A/D strafe). Q/E = rotace kamery kolem cíle (yaw, kolem Y osy).
// Y/X = zoom (Y in, X out). Kombinuje se s OrbitControls.
const heldKeys = new Set();
window.addEventListener("keydown", (e) => heldKeys.add(e.key.toLowerCase()));
window.addEventListener("keyup",   (e) => heldKeys.delete(e.key.toLowerCase()));
// Když okno ztratí focus (alt-tab apod.), uvolníme všechny zachycené klávesy,
// jinak by „vlasy stály" do dalšího keydown.
window.addEventListener("blur", () => heldKeys.clear());

const KB_PAN_SPEED    = 6.0;     // jednotek za sekundu
const KB_ROT_SPEED    = 1.5;     // radiánů za sekundu (yaw rotace)
const KB_ZOOM_PER_SEC = 2.0;     // multiplier vzdálenosti za sekundu
const _kbForward = new THREE.Vector3();
const _kbRight   = new THREE.Vector3();
const _kbDelta   = new THREE.Vector3();

function updateKeyboardCamera(dt) {
  if (heldKeys.size === 0) return;

  // „Forward" = směr pohledu kamery promítnutý na vodorovnou rovinu (Y=0)
  // → pohyb po terénu, ne ponor pod / ven nad scénu.
  camera.getWorldDirection(_kbForward);
  _kbForward.y = 0;
  if (_kbForward.lengthSq() < 1e-6) _kbForward.set(0, 0, -1);
  _kbForward.normalize();
  _kbRight.crossVectors(_kbForward, camera.up).normalize();

  let panFwd = 0, panRight = 0;
  if (heldKeys.has("w")) panFwd   += KB_PAN_SPEED * dt;
  if (heldKeys.has("s")) panFwd   -= KB_PAN_SPEED * dt;
  if (heldKeys.has("d")) panRight += KB_PAN_SPEED * dt;
  if (heldKeys.has("a")) panRight -= KB_PAN_SPEED * dt;

  if (panFwd || panRight) {
    _kbDelta.set(0, 0, 0);
    _kbDelta.addScaledVector(_kbForward, panFwd);
    _kbDelta.addScaledVector(_kbRight,   panRight);
    controls.target.add(_kbDelta);
    camera.position.add(_kbDelta);
  }

  // Q/E rotace — kamera obíhá cíl kolem Y osy. Q = CCW (camera shifts left
  // od pohledu kamery), E = CW. Mutujeme camera.position; cíl zůstává.
  if (heldKeys.has("q") || heldKeys.has("e")) {
    const sign  = heldKeys.has("q") ? 1 : -1;
    const angle = sign * KB_ROT_SPEED * dt;
    _kbDelta.subVectors(camera.position, controls.target);
    _kbDelta.applyAxisAngle(camera.up, angle);
    camera.position.copy(controls.target).add(_kbDelta);
  }

  // Zoom — Y přiblížit, X oddálit. Geometrický factor podle dt → konstantní
  // rychlost zoomu nezávisle na FPS.
  if (heldKeys.has("y") || heldKeys.has("x")) {
    const factor = Math.pow(KB_ZOOM_PER_SEC, dt);
    const scale  = heldKeys.has("y") ? 1 / factor : factor;
    _kbDelta.subVectors(camera.position, controls.target).multiplyScalar(scale);
    camera.position.copy(controls.target).add(_kbDelta);
  }
}

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
// Rozšířeno (DD-17): po inkrementu TIME.tick fire-uje všechny `tickHandlers`
// — diskrétní chování (TIMER → ACTION) se probudí na nové hodnotě tiku.
// Pořadí `advanceTime` → `updateTickHandlers` garantuje, že handler čte
// aktualizovaný tick (ne starý).
setInterval(() => {
  advanceTime();
  updateTickHandlers();
}, 1000);

// === Render loop ===
// requestAnimationFrame = "zavolej mě, až bude vhodný čas překreslit".
// Prohlížeč to obvykle dělá 60× za vteřinu, a synchronizuje to s refresh
// rate monitoru. Uvnitř aktualizujeme controls a překreslíme scénu.
let _lastFrameTime = performance.now() / 1000;
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // Wall-clock v sekundách — plynulý parametr pro sinusy/rotace v
  // `updateAnimations`. `performance.now()` vrací ms od spuštění stránky
  // (high-resolution timer). TIME.tick by dával frame/sekundový counter —
  // ten je lepší pro diskrétní události, ne pro plynulou animaci.
  const now = performance.now() / 1000;
  const dt  = now - _lastFrameTime;
  _lastFrameTime = now;
  updateAnimations(now);
  // Ocásky dialogových bublin: přepočítáme až **po** animátorech, aby jsme
  // četli aktuální `object3d.position` případných pohybujících se mluvčí
  // (tbox_0002 orbituje, …).
  updateBubbleTails();
  // Fade watcher pro BALLOON.LIT — exponenciální lerp `emissive` a
  // `PointLight.intensity` podle `instance.LIT` stavu (DD-17).
  updateLit(dt);
  updateKeyboardCamera(dt);
  renderer.render(scene, camera);
}
animate();
