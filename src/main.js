// src/main.js
// Boot celé aplikace: Three.js scéna, kamera, osvětlení, první kostka,
// tikání TIME, render loop.
//
// Závislosti se importují skrz import map v index.html.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { CUBES, BLOCKS, CCUBES, TCUBES, TRRAMPS, TTRAMPS, TTUNELS, SPRITES, COMPOSITES, TREE, GRASS_TUFT, ROCK_PIXEL, LOG, VOXEL_MODEL, PATH, TIMER, COUNTER, WORLD, FACILITY, GENERATOR, TRANSFORMER, STORAGE, RESOURCES_DEF, RECIPES_DEF, FACILITY_DEF } from "./model.js";
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
// PCFShadowMap = středně tvrdé stíny (PCF, ale bez "Soft" extra blur).
// Soft varianta blurovala přes několik texelů a na voxel boundaries zanechávala
// tenký light leak — sez. 14 přepnuto na PCF.
renderer.shadowMap.type = THREE.PCFShadowMap;

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
// (vak balónu, kužely stromu), kde klasický bias způsobuje "peter-panning".
// Pro voxel kostky dotýkající se ploch způsobuje vysoká hodnota
// opačný problém — tenkou „lit line" na styku → snížené z 0.02 na 0.005,
// (stín se odlepí od objektu).
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0;
scene.add(sun);

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

// Štěrková cesta — šedé kameny různých odstínů, kropenatý šum (žádné stopy).
// Hustá rozsypaná zrnka 1×1 px různých odstínů → blízko vidět texturu kamínků,
// z dálky splyne v jednolitou šeď.
const PATH_BASE    = "#7a7a78";
const PATH_ACCENTS = ["#9a9a98", "#b0b0ae", "#6a6a68", "#5a5a58", "#3a3a38", "#8a8478"];
function makePathDirtTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TEX_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PATH_BASE;
  ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);
  // Kropenatý šum — ~240 drobných záplat 1-2 px po celé ploše. Patche se
  // překrývají (canvas má 256 px²), což dává ještě bohatší variaci.
  drawPatches(ctx, PATH_ACCENTS, 210 + Math.floor(Math.random() * 60), 0, TEX_SIZE);
  return canvasToPixelTexture(canvas);
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

// Per-cube fresh textury (žádný singleton) — každé volání factory vrátí novou
// `THREE.Texture` s vlastním vzorem → 100 kostek × 6 stran = až 600 unikátních
// textur. Každá 16×16 = 256 px, celkem ~600 KB GPU mem (zanedbatelné).
const NAMED_TEXTURE_FACTORIES = {
  ":dirt":       () => makeDirtTexture(),
  ":grass-top":  () => makeGrassTopTexture(),
  ":stone":      () => makeStoneTexture(),
  ":rail-top":   () => makeRailTopTexture(),
  ":path-dirt":  () => makePathDirtTexture(),
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

// WORLD singleton (DD-29, sez. 20) — globální stav scény. `WIND_STRENGTH`
// čte `animateTreeSway`. Nevizuální entita, nemá registraci (žádný
// tickHandler ani DOM) — žije čistě jako data.
// Dev exposure přes `window.world` — bez `registerBehavior` infrastruktury
// (která je pro tickHandlers / HUD řádky) je to nejjednodušší cesta, jak
// otestovat efekt v konzoli: `world.WIND_STRENGTH = 2` → bouře, `0` →
// bezvětří. Pokud přibude víc dev singletonů, dá se sjednotit pod `window.tc.*`.
const world = new WORLD();
window.world = world;

// TIME_SCALE slider (DD-31, sez. 22 fáze B) — HUD ovladač rychlosti simulace.
// `input` event mutuje `world.TIME_SCALE` a aktualizuje text. Render loop si
// `world.TIME_SCALE` čte každý frame, takže změna se projeví okamžitě bez reloadu.
{
  const slider = document.getElementById("time-scale-slider");
  const valEl  = document.getElementById("time-scale-val");
  if (slider && valEl) {
    slider.addEventListener("input", () => {
      const v = parseFloat(slider.value);
      world.TIME_SCALE = v;
      valEl.textContent = `${v.toFixed(1)}×`;
    });
  }
}

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

// Strom se kývá ve větru. Per-voxel snapshot pozice (lazy init), pak
// per-frame offset škálovaný **výškou voxelu** — kmen u země má heightFactor
// ≈ 0 → statický; špička koruny ≈ 0.9 → maximální výchylka. Random fáze
// (anim.phaseX/Z) → desync mezi stromy stejného druhu. Dvě nesoudělné periody
// (X/Z) → elipsovitý pohyb, ne 1D kyvadlo.
function animateTreeSway(group, anim, t) {
  const phaseX = oscPhase(t, anim.periodX, anim.phaseX ?? 0);
  const phaseZ = oscPhase(t, anim.periodZ, (anim.phaseZ ?? 0) + Math.PI / 3);
  // Globální vítr (DD-29) škáluje amplitudu všech stromů jednotně.
  // `world.WIND_STRENGTH = 1.0` (default) = beze změny vůči pre-DD-29 stavu.
  const amp = anim.amplitude * world.WIND_STRENGTH;
  const sx = amp * Math.sin(phaseX);
  const sz = amp * Math.sin(phaseZ);
  for (const child of group.children) {
    if (!child.userData.swayBase) {
      child.userData.swayBase = {
        x: child.position.x,
        y: child.position.y,
        z: child.position.z,
      };
    }
    const base = child.userData.swayBase;
    const heightFactor = Math.max(0, base.y + 0.5);
    child.position.x = base.x + sx * heightFactor;
    child.position.z = base.z + sz * heightFactor;
  }
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
// s `MeshStandardMaterial` (CCUBES, jednostranné TCUBES plochy…).
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

// Sez. 14 cleanup: humanoidi (CHARACTER/NOODLE/STICKMAN) + 2D kolizní systém
// (DD-19) + wander stavový automat + pose primitives + gait animátory přesunuty
// do sibling projektu ./source/Stickman. DD-18/19/20 v immutable logu.

// Lookup tabulka `kind` → animátor. Nový druh pohybu = nová větev zde (+
// samotná funkce výš). Izomorfní s `faceMaterialFor` dispatchem (DD-14).
// Umožňuje i validaci při registraci — překlep v `ANIMATE.kind` odhalíme
// boot-time warnem, ne tichým no-op v render loopu.
const ANIMATORS = {
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
// `bubbleTails`, `tickHandlers` a hover material klony (v `userData.hoverHotMat`
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

// Sez. 15 cleanup: LIT fade system + BALLOON třída smazány (DD-23 „all-voxel" pivot).

// =============================================================================
// FACTORY TOY ENGINE (DD-30 / DD-31, sez. 21)
//
// Tick-based ekonomický loop. `productionTick(dt)` se volá z render loopu
// (continuous, ne 1 wall-s tick), s `dt = wall second elapsed * TIME_SCALE`.
// Generátory produkují do `BUFFER`, transformery čerpají z `BUFFER` dle
// `RECIPES_DEF[KIND]`. Material gate pauzuje na chybějícím inputu / plném outputu.
// Sklady (zatím) pasivní — drží zásoby, transport přijde v Phase B (PATH).
//
// HUD: 6 čítačů top bar (Σ napříč fasilitami), event log bottom bar (5 řádků).
// Eventy se loguji jen na **state change** (PAUS/RSUM) a každý whole-unit krok
// produkce (`PROD` na floor cross), aby se log neutopil v per-frame spamu.
// =============================================================================

// Registry všech aktivních fasilit — naplňuje `createMeshFor` při FACILITY
// větvi. Iterujeme každý frame v `productionTick`.
const facilities = [];

// Registry všech aktivních PATH instancí — naplňuje `createPathFor`. Iterujeme
// každý frame v `pathTick` (DD-31, sez. 22 fáze B). Dekorativní cesty
// (`KIND="dirt"`, bez SOURCE/SINK) jsou v registry také, pathTick je tolerantně
// přeskočí — větvení by bylo zbytečné, missing-fields check je levný.
const paths = [];

// Event log = ring buffer (max 100). Render zobrazuje posledních 5.
const EVENT_LOG_CAPACITY = 100;
const EVENT_LOG_VISIBLE = 5;
const events = [];

// Verb → CSS třída pro barvení v #eventlog. Voidspan-derived (DD-30) zúžené
// na MVP set verb: PROD = green (produkce), DRN = neutral (čerpání inputu),
// PAUS = amber (gate spadla), RSUM = cyan (gate uvolněna).
const EVENT_VERB_CLASS = {
  PROD: "evt-prod",
  DRN:  "evt-drn",
  PAUS: "evt-paus",
  RSUM: "evt-rsum",
};

function logEvent(verb, target, detail) {
  events.push({ tick: TIME.tick, verb, target, detail });
  if (events.length > EVENT_LOG_CAPACITY) events.shift();
  renderEventLog();
}

// Vykresli posledních N eventů do #eventlog elementu. Volá se po každém
// `logEvent` (jednorázový DOM patch). KISS: vyrobíme řádky odznova; 5 řádků
// = zanedbatelná cena.
function renderEventLog() {
  const el = document.getElementById("eventlog");
  if (!el) return;
  el.innerHTML = "";
  const start = Math.max(0, events.length - EVENT_LOG_VISIBLE);
  for (let i = start; i < events.length; i++) {
    const e = events[i];
    const line = document.createElement("div");
    line.className = `evt-line ${EVENT_VERB_CLASS[e.verb] || ""}`;
    line.textContent = `[T${e.tick}] ${e.verb}  ${e.target}  ${e.detail}`;
    el.appendChild(line);
  }
}

// Logger produkce s thresholdem: emit PROD jen když `BUFFER[r]` překročí novou
// celou jednotku (floor crossing). Bez toho by 60 FPS produkce zahltila log.
// Sleduje předchozí floor v `prevFloor` mapě per (facility, resource).
const _prodFloorCache = new Map(); // klíč `${id}::${r}` → poslední floor

function maybeLogProduction(facility, resource_id, prevAmount, newAmount) {
  const key = `${facility.ID}::${resource_id}`;
  const prevFloor = Math.floor(prevAmount);
  const newFloor = Math.floor(newAmount);
  if (newFloor > prevFloor) {
    _prodFloorCache.set(key, newFloor);
    logEvent("PROD", facility.NAME, `+1 ${resource_id} (${newFloor} celkem)`);
  }
}

function maybeLogConsumption(facility, resource_id, prevAmount, newAmount) {
  const prevFloor = Math.floor(prevAmount);
  const newFloor = Math.floor(newAmount);
  if (newFloor < prevFloor) {
    logEvent("DRN", facility.NAME, `−1 ${resource_id} (${newFloor} zbývá)`);
  }
}

// Pauza / resume tracking — emit jen na state change.
function setPaused(facility, paused, reason) {
  const wasPaused = facility.PAUSED;
  facility.PAUSED = paused;
  facility.PAUSE_REASON = paused ? reason : null;
  if (paused && !wasPaused) {
    logEvent("PAUS", facility.NAME, reason);
  } else if (!paused && wasPaused) {
    logEvent("RSUM", facility.NAME, "běží");
  }
}

// Generator tick: produkuje `outputs[r]` * dt ks/s. Backpressure pauza na
// plný buffer. Žádný input check (generator = unlimited source — les nikdy
// nedojde, KISS pro MVP).
function generatorTick(facility, def, dt) {
  // Předpoklad: def.outputs existuje a je objekt {resource_id: rate_per_s}.
  // Pro každý výstup nezávisle: spočítej kolik bys přidal, ořež na kapacitu.
  let anyProduced = false;
  let anyBlocked = false;
  for (const [r, rate] of Object.entries(def.outputs)) {
    const prev = facility.BUFFER[r] ?? 0;
    const capacity_left = def.buffer_capacity - prev;
    if (capacity_left <= 0) {
      anyBlocked = true;
      continue;
    }
    const wanted = rate * dt;
    const actual = Math.min(wanted, capacity_left);
    const next = prev + actual;
    facility.BUFFER[r] = next;
    maybeLogProduction(facility, r, prev, next);
    anyProduced = true;
  }
  // Pauza pokud je VŠECHNO blokované a NIC se nevyprodukovalo. Smíšený stav
  // (1 ze 2 output plný) generator nehlásí — zbylé výstupy stále tečou.
  if (anyBlocked && !anyProduced) {
    setPaused(facility, true, "buffer plný");
  } else {
    setPaused(facility, false);
  }
}

// Transformer tick: dle recipe spotřebuje `inputs`, vyrobí `outputs`.
// Material gate: pauza s důvodem, pokud chybí input nebo je plný output.
function transformerTick(facility, def, dt) {
  const recipe = RECIPES_DEF[def.recipe];
  if (!recipe) {
    console.warn(`TRANSFORMER ${facility.ID} má neznámý recept "${def.recipe}"`);
    return;
  }
  const cycles = recipe.rate_per_tick * dt;
  // 1) Check input availability.
  for (const [r, need_per_cycle] of Object.entries(recipe.inputs)) {
    const have = facility.BUFFER[r] ?? 0;
    const need = need_per_cycle * cycles;
    if (have < need) {
      setPaused(facility, true, `chybí ${r}`);
      return;
    }
  }
  // 2) Check output capacity.
  for (const [r, out_per_cycle] of Object.entries(recipe.outputs)) {
    const prev = facility.BUFFER[r] ?? 0;
    const would_add = out_per_cycle * cycles;
    if (prev + would_add > def.buffer_capacity) {
      setPaused(facility, true, `buffer ${r} plný`);
      return;
    }
  }
  // 3) Apply: drén inputs, plnění outputs.
  for (const [r, need_per_cycle] of Object.entries(recipe.inputs)) {
    const prev = facility.BUFFER[r];
    const next = prev - need_per_cycle * cycles;
    facility.BUFFER[r] = next;
    maybeLogConsumption(facility, r, prev, next);
  }
  for (const [r, out_per_cycle] of Object.entries(recipe.outputs)) {
    const prev = facility.BUFFER[r] ?? 0;
    const next = prev + out_per_cycle * cycles;
    facility.BUFFER[r] = next;
    maybeLogProduction(facility, r, prev, next);
  }
  setPaused(facility, false);
}

// Hlavní produkční tick — volá se z render loopu s `dt` v sekundách
// (už škálovaný `TIME_SCALE`). Storage je pasivní (transport řeší pathTick).
function productionTick(dt) {
  for (const f of facilities) {
    const def = FACILITY_DEF[f.KIND];
    if (!def) continue;
    if (def.type === "generator")        generatorTick(f, def, dt);
    else if (def.type === "transformer") transformerTick(f, def, dt);
    // storage: no-op v MVP
  }
}

// PATH transport tick (DD-31, sez. 22 fáze B). Iteruje `paths[]`, per cesta
// s validním transportem (SOURCE+SINK+RESOURCE+THROUGHPUT) přesune
// `min(THROUGHPUT*dt, source_have, sink_free_capacity)` daného resource
// ze source BUFFER do sink BUFFER. Dekorativní `"dirt"` cesty engine přeskočí.
//
// Volá se z render loopu **po** productionTick — jinak by transport mohl
// odvézt items, které generator/transformer právě v tomto tick vyrobil
// (= mikro-zpoždění o jeden frame, ale ekonomicky korektní: tick = produkce,
// pak distribuce).
function pathTick(dt) {
  for (const p of paths) {
    if (!p.SOURCE || !p.SINK || !p.RESOURCE || !p.THROUGHPUT) continue;
    transferOnPath(p, dt);
  }
}

// Jednotka transportu. Source-dry → 0, sink-full → 0; jinak min(want, have, free).
// Loguje DRN/PROD přes existující floor-crossing helpery — stejná granularita
// jako u generator/transformer eventů (1 řádek per whole-unit krok).
function transferOnPath(path, dt) {
  const src = path.SOURCE;
  const dst = path.SINK;
  const r   = path.RESOURCE;
  const sinkDef = FACILITY_DEF[dst.KIND];
  if (!sinkDef) return;

  const have = src.BUFFER[r] ?? 0;
  if (have <= 0) return;
  const dstHave = dst.BUFFER[r] ?? 0;
  const free = sinkDef.buffer_capacity - dstHave;
  if (free <= 0) return;

  const wanted = path.THROUGHPUT * dt;
  const amount = Math.min(wanted, have, free);
  if (amount <= 0) return;

  const newSrc = have - amount;
  const newDst = dstHave + amount;
  src.BUFFER[r] = newSrc;
  dst.BUFFER[r] = newDst;
  maybeLogConsumption(src, r, have, newSrc);
  maybeLogProduction(dst, r, dstHave, newDst);
}

// Přepočítá `world.RESOURCES` jako Σ `BUFFER` napříč všemi fasilitami a
// aktualizuje HUD čítače (#res-<id> spany).
function aggregateResources() {
  // Reset všech klíčů na 0.
  for (const r of Object.keys(world.RESOURCES)) world.RESOURCES[r] = 0;
  // Sečti přes facilities.
  for (const f of facilities) {
    for (const [r, amount] of Object.entries(f.BUFFER)) {
      if (r in world.RESOURCES) world.RESOURCES[r] += amount;
    }
  }
  // HUD update — jen jednou za frame, formátované jako celé číslo (zlomky
  // v buffer interně, UI nepotřebuje precizi).
  for (const r of Object.keys(world.RESOURCES)) {
    const el = document.getElementById(`res-${r}`);
    if (el) el.textContent = Math.floor(world.RESOURCES[r]);
  }
}

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
  } else if (instance instanceof FACILITY) {
    // Factory toy fasilita (DD-31, sez. 21) — 1×1×1 placeholder box s plochou
    // barvou z `FACILITY_DEF[KIND].color`. Pixel-art asset (VOXEL_MODEL per
    // KIND) přijde v Phase 2. Snap-to-grid jako BLOCKS (DD-28 grid-center).
    object3d = createFacilityFor(instance);
  } else if (instance instanceof PATH) {
    // 1D křivka (DD-25 vrstva 3 Linie) — strip mesh sledující POINTS.
    object3d = createPathFor(instance);
  } else if (instance instanceof SPRITES) {
    // 2D billboard — obrázek vždy otočený ke kameře. Nevoxelový potomek,
    // pozice float bez snap-to-grid.
    object3d = createSpriteFor(instance);
  } else if (instance instanceof TCUBES) {
    // Voxel s per-face texturami (6 různých materiálů). Snap-to-grid.
    object3d = createTCubeFor(instance);
  } else if (instance instanceof TRRAMPS) {
    // Trojboký hranol (klín) s 5 per-face texturami. Snap-to-grid + rotace Y.
    object3d = createTRRampFor(instance);
  } else if (instance instanceof TTRAMPS) {
    // Trojboký jehlan (trirectangular tetrahedron) se 4 per-face texturami.
    object3d = createTTRampFor(instance);
  } else if (instance instanceof TTUNELS) {
    // Tunel skrz 1C blok (4 vnitřní stěny, 2 osy průchozí).
    object3d = createTTunnelFor(instance);
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

// === TRRAMPS — Trojboký hranol (klín) =======================================
//
// 1C blok (1×1×1) s pravoúhlým trojúhelníkem v boční rovině XY. Default
// orientace (ORIENTATION=0): apex sloupec na −Z (NORTH), svah klesá k +Z (SOUTH).
// Stojící divák před rampou (na +Z) tedy vidí svah klesat k němu.
//
// Vertices v lokálních souřadnicích (1C blok centered v origin):
//   v0 (-0.5, -0.5, -0.5)  bottom NW
//   v1 ( 0.5, -0.5, -0.5)  bottom NE
//   v2 ( 0.5, -0.5,  0.5)  bottom SE
//   v3 (-0.5, -0.5,  0.5)  bottom SW
//   v4 (-0.5,  0.5, -0.5)  apex top NW
//   v5 ( 0.5,  0.5, -0.5)  apex top NE
//
// 5 faces, každý má vlastní material (per-face dispatch přes faceMaterialFor):
//   BOTTOM  quad (v0,v3,v2,v1) na Y=−0.5,  normála (0,−1, 0)
//   BACK    quad (v0,v1,v5,v4) na Z=−0.5,  normála (0, 0,−1)  vertikální stěna
//   SLOPE   quad (v3,v2,v5,v4) šikmá,      normála (0, 1, 1)/√2  svah
//   LEFT    triangle (v0,v4,v3) na X=−0.5, normála (−1,0,0)
//   RIGHT   triangle (v1,v2,v5) na X=+0.5, normála ( 1,0,0)
//
// Per-face vertices (non-shared) → flat shading bez `computeVertexNormals`
// (každá face má vlastní normály = ostré hrany mezi facey, pixel-art look).
// Celkem 18 vertices, 8 trojúhelníků, 5 material groups.

const TRRAMP_GEOM_CACHE = (() => {
  const SQRT2 = Math.SQRT2;
  // Pomocné lokální vertex pozice (zkráceně).
  const v0 = [-0.5, -0.5, -0.5];
  const v1 = [ 0.5, -0.5, -0.5];
  const v2 = [ 0.5, -0.5,  0.5];
  const v3 = [-0.5, -0.5,  0.5];
  const v4 = [-0.5,  0.5, -0.5];
  const v5 = [ 0.5,  0.5, -0.5];

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const groups = []; // { start, count, materialIndex }

  // Helper: přidá quad (4 vertices, 2 trojúhelníky) s jednou normálou per face.
  // CCW pořadí pro správnou face culling (Three.js front-face = CCW).
  function addQuad(p0, p1, p2, p3, n, uv0, uv1, uv2, uv3, materialIndex) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    uvs.push(...uv0, ...uv1, ...uv2, ...uv3);
    const startIdx = indices.length;
    indices.push(startVert, startVert + 1, startVert + 2);
    indices.push(startVert, startVert + 2, startVert + 3);
    groups.push({ start: startIdx, count: 6, materialIndex });
  }

  function addTri(p0, p1, p2, n, uv0, uv1, uv2, materialIndex) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...uv0, ...uv1, ...uv2);
    const startIdx = indices.length;
    indices.push(startVert, startVert + 1, startVert + 2);
    groups.push({ start: startIdx, count: 3, materialIndex });
  }

  // Pořadí materialIndex (musí ladit s `createTRRampFor` materials array):
  // 0 = SLOPE, 1 = BOTTOM, 2 = BACK, 3 = LEFT, 4 = RIGHT.

  // CCW order pro každý face = vertices v takovém pořadí, aby cross product
  // (v[1]−v[0]) × (v[2]−v[0]) dal kladnou složku ve směru deklarované normály
  // (Three.js front-face konvence). Bug fix proti první verzi: geometrická
  // normála musí ladit s rendering normálou, jinak Three.js culluje nebo
  // dochází k z-fighting.

  // SLOPE — quad (v3, v2, v5, v4), normála (0, 1, 1)/√2 (svah nakloněný k +Z).
  // UV: v3 (SW dno) = (0,0), v2 (SE dno) = (1,0), v5 (NE apex) = (1,1), v4 (NW apex) = (0,1).
  // → Textura natažená přes 1×√2 obdélník (pixel-art stretch ~41 %, akceptovatelné).
  addQuad(
    v3, v2, v5, v4,
    [0, 1 / SQRT2, 1 / SQRT2],
    [0, 0], [1, 0], [1, 1], [0, 1],
    0,
  );

  // BOTTOM — quad (v0, v1, v2, v3), normála (0, −1, 0).
  // CCW při pohledu zezdola (cam na −Y looking +Y; v této orientaci je +X right, +Z up).
  // UV: v0 = (0,0), v1 = (1,0), v2 = (1,1), v3 = (0,1).
  addQuad(
    v0, v1, v2, v3,
    [0, -1, 0],
    [0, 0], [1, 0], [1, 1], [0, 1],
    1,
  );

  // BACK — quad (v0, v4, v5, v1), normála (0, 0, −1).
  // Vertikální stěna na NORTH (Z=−0.5). CCW při pohledu z −Z stran (= ven z bloku).
  // UV: v0 (W-bottom) = (0,0), v4 (W-top) = (0,1), v5 (E-top) = (1,1), v1 (E-bottom) = (1,0).
  addQuad(
    v0, v4, v5, v1,
    [0, 0, -1],
    [0, 0], [0, 1], [1, 1], [1, 0],
    2,
  );

  // LEFT — triangle (v0, v3, v4) na X=−0.5, normála (−1, 0, 0).
  // CCW při pohledu z −X stran. Apex sloupec v4 → UV (0, 1) = top-left textury.
  addTri(
    v0, v3, v4,
    [-1, 0, 0],
    [0, 0], [1, 0], [0, 1],
    3,
  );

  // RIGHT — triangle (v1, v5, v2) na X=+0.5, normála (1, 0, 0).
  // CCW při pohledu z +X stran. Apex v5 → UV (1, 1) = top-right textury.
  addTri(
    v1, v5, v2,
    [1, 0, 0],
    [1, 0], [1, 1], [0, 0],
    4,
  );

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  for (const g of groups) geom.addGroup(g.start, g.count, g.materialIndex);
  return geom;
})();

// Sestaví trojboký hranol pro TRRAMPS instanci. 5 materials (SLOPE/BOTTOM/BACK/
// LEFT/RIGHT) přes sdílený dispatch `faceMaterialFor` (DD-14, izomorfně s TCUBES).
// Geometrie sdílená přes cache — instance se liší pozicí a rotací.
function createTRRampFor(instance) {
  const materials = [
    faceMaterialFor(instance.TEXTURE_SLOPE),   // 0
    faceMaterialFor(instance.TEXTURE_BOTTOM),  // 1
    faceMaterialFor(instance.TEXTURE_BACK),    // 2
    faceMaterialFor(instance.TEXTURE_LEFT),    // 3
    faceMaterialFor(instance.TEXTURE_RIGHT),   // 4
  ];
  const mesh = new THREE.Mesh(TRRAMP_GEOM_CACHE, materials);
  snapToGrid(mesh, instance);
  mesh.rotation.y = instance.ORIENTATION * (Math.PI / 180);
  return mesh;
}

// === TTRAMPS — Trojboký jehlan (trirectangular tetrahedron) =================
//
// 1C blok s 4 vrcholy: roh `C` v lokálním (-0.5, -0.5, -0.5) + 3 axiální body
// na koncích hran délky 1 podél +X, +Y, +Z. SLOPE = rovnostranný trojúhelník
// mezi 3 axiálními body (hrana √2). 3 perpendicular faces leží v rovinách
// X=−0.5 (LEFT), Y=−0.5 (BOTTOM), Z=−0.5 (BACK), všechny pravoúhlé trojúhelníky
// se sdíleným pravým úhlem v rohu C.
//
// 4 faces × 3 vertices (per-face non-shared) = 12 vertices, 4 trojúhelníky.

const TTRAMP_GEOM_CACHE = (() => {
  const SQRT3 = Math.sqrt(3);
  // 4 unique vertex pozice (lokálně, 1C blok centered v origin).
  const C = [-0.5, -0.5, -0.5];  // sdílený roh 3 perpendicular faces
  const X = [ 0.5, -0.5, -0.5];  // konec +X hrany
  const Y = [-0.5,  0.5, -0.5];  // konec +Y hrany (apex top)
  const Z = [-0.5, -0.5,  0.5];  // konec +Z hrany

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const groups = [];

  function addTri(p0, p1, p2, n, uv0, uv1, uv2, materialIndex) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...uv0, ...uv1, ...uv2);
    const startIdx = indices.length;
    indices.push(startVert, startVert + 1, startVert + 2);
    groups.push({ start: startIdx, count: 3, materialIndex });
  }

  // Pořadí materialIndex (musí ladit s `createTTRampFor` materials):
  // 0 = SLOPE, 1 = BOTTOM, 2 = BACK, 3 = LEFT.

  // SLOPE — triangle (X, Y, Z), rovnostranný, normála (1, 1, 1)/√3.
  // CCW při pohledu z venku (z opačného rohu).
  // UV: rovnostranný v UV space — X = (0,0), Z = (1,0), Y = (0.5, 1) apex.
  addTri(
    X, Y, Z,
    [1 / SQRT3, 1 / SQRT3, 1 / SQRT3],
    [0, 0], [0.5, 1], [1, 0],
    0,
  );

  // BOTTOM — triangle (C, X, Z) na Y=−0.5, normála (0, −1, 0).
  // CCW při pohledu z −Y stran (cam zezdola, looking +Y; +X right, +Z up).
  // UV: C = (0,0), X = (1,0), Z = (0,1).
  addTri(
    C, X, Z,
    [0, -1, 0],
    [0, 0], [1, 0], [0, 1],
    1,
  );

  // BACK — triangle (C, Y, X) na Z=−0.5, normála (0, 0, −1).
  // CCW při pohledu z −Z stran. UV: C (W-bottom) = (0,0), Y (W-top, apex) = (0,1),
  // X (E-bottom) = (1,0). Apex v UV (0,1).
  addTri(
    C, Y, X,
    [0, 0, -1],
    [0, 0], [0, 1], [1, 0],
    2,
  );

  // LEFT — triangle (C, Z, Y) na X=−0.5, normála (−1, 0, 0).
  // CCW při pohledu z −X stran. UV: C (N-bottom) = (0,0), Z (S-bottom) = (1,0),
  // Y (N-top, apex) = (0,1). Symetrické s BACK — apex u UV.v=1.
  addTri(
    C, Z, Y,
    [-1, 0, 0],
    [0, 0], [1, 0], [0, 1],
    3,
  );

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  for (const g of groups) geom.addGroup(g.start, g.count, g.materialIndex);
  return geom;
})();

// Sestaví trojboký jehlan pro TTRAMPS instanci. 4 materials (SLOPE/BOTTOM/BACK/
// LEFT). Geometrie sdílená přes cache.
function createTTRampFor(instance) {
  const materials = [
    faceMaterialFor(instance.TEXTURE_SLOPE),   // 0
    faceMaterialFor(instance.TEXTURE_BOTTOM),  // 1
    faceMaterialFor(instance.TEXTURE_BACK),    // 2
    faceMaterialFor(instance.TEXTURE_LEFT),    // 3
  ];
  const mesh = new THREE.Mesh(TTRAMP_GEOM_CACHE, materials);
  snapToGrid(mesh, instance);
  mesh.rotation.y = instance.ORIENTATION * (Math.PI / 180);
  return mesh;
}

// === TTUNELS — 1C blok s klenutým tunelem ===================================
//
// Geometrie: kvádr 1×1×1 mínus „obdélník + půlkruh extrudovaný v ose X" (=
// klenutý tunel se spodním obdélníkovým průchodem). Profil otvoru v rovině
// YZ (kolmé k ose tunelu):
//   Spodní obdélník: Y = −0.5..0,    Z = −0.3..+0.3
//   Horní půlkruh:   střed (Y=0, Z=0), poloměr 0.3 → klenba k Y=+0.3
//   Nad obloukem (Y=+0.3..+0.5) zůstává plný materiál — „klenba bloku".
//
// 4 material groups (= 4 user-faces):
//   0 = TOP       — vnější vrchní stěna (typicky `:grass-top`)
//   1 = SIDES     — vnější 2 boky + 2 vstupní stěny s vyříznutým profilem
//   2 = WALLS     — vnitřní 2 boční stěny (Z=±0.3, Y=−0.5..0)
//   3 = CEILING   — vnitřní klenutý strop (N=12 segmentů půlkruhu)
//
// Bez bottom outside i bez inside floor — tunel je „průhledný dolů" na top
// voxelu pod ním (typicky grass podlaha diorámy).
//
// Vstupní stěny (X=±0.5) jsou triangulovány: 2 ears (sloupce mimo tunel) +
// 1 shoulder (pásek nad obloukem) + 2 sektory klenby (fan z corner shoulder
// k bodům půlkruhu, 6 trojúhelníků per sektor).
//
// Vnitřní povrchy mají normály mířící **dovnitř** tunelu (k ose průchodu),
// aby je postava uvnitř viděla bez DoubleSide. Vnější povrchy mají normály
// ven (standard FrontSide).

const TTUNEL_GEOM_CACHE = (() => {
  const W = 0.3;   // polovina šířky tunelu
  const H = 0.0;   // přechod rectangular → arch (Y koordináta)
  const R = W;     // poloměr půlkruhu = polovina šířky
  const N = 12;    // segmentů na půlkruhu (sudé číslo, dělí se na 2 čtvrtě)

  // Polokruhové body na entry plane (X = const). Parametrizace: θ ∈ [0, π],
  //   archPt(θ) = (Z = R·cos(θ), Y = H + R·sin(θ))
  //   θ=0:   (+R, H)        — pravý dolní (= SOUTH-bottom of arch)
  //   θ=π/2: (0,  H+R)      — vrchol oblouku
  //   θ=π:   (−R, H)        — levý dolní (= NORTH-bottom of arch)
  const arch = [];
  for (let i = 0; i <= N; i++) {
    const θ = (i / N) * Math.PI;
    arch.push({ z: R * Math.cos(θ), y: H + R * Math.sin(θ) });
  }

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const groups = [];

  function addTri(p0, p1, p2, n, uv0, uv1, uv2, materialIndex) {
    const start = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...uv0, ...uv1, ...uv2);
    const idxStart = indices.length;
    indices.push(start, start + 1, start + 2);
    groups.push({ start: idxStart, count: 3, materialIndex });
  }

  function addQuad(p0, p1, p2, p3, n, uv0, uv1, uv2, uv3, materialIndex) {
    const start = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    uvs.push(...uv0, ...uv1, ...uv2, ...uv3);
    const idxStart = indices.length;
    indices.push(start, start + 1, start + 2);
    indices.push(start, start + 2, start + 3);
    groups.push({ start: idxStart, count: 6, materialIndex });
  }

  // Material constants
  const MAT_TOP     = 0;
  const MAT_SIDES   = 1;
  const MAT_WALLS   = 2;
  const MAT_CEILING = 3;

  // === OUTSIDE — TOP quad + 2 side quads + 2 entry walls (žádný bottom) ===

  // TOP outside (Y=+0.5, normála +Y), CCW from above. Vlastní material =
  // jako grass cube top → uživatel typicky pošle `:grass-top`.
  addQuad(
    [-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5],
    [0, 1, 0],
    [0, 0], [0, 1], [1, 1], [1, 0],
    MAT_TOP,
  );

  // NORTH outside (Z=−0.5, normála −Z), CCW from -Z
  addQuad(
    [0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5],
    [0, 0, -1],
    [0, 0], [1, 0], [1, 1], [0, 1],
    MAT_SIDES,
  );

  // SOUTH outside (Z=+0.5, normála +Z), CCW from +Z
  addQuad(
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
    [0, 0, 1],
    [0, 0], [1, 0], [1, 1], [0, 1],
    MAT_SIDES,
  );

  // Helper — entry wall na X = xPlane (sign = +1 pro EAST, −1 pro WEST).
  // Skládá se ze 2 ears + shoulder + 2 fan sektorů kolem půlkruhu.
  function buildEntryWall(xPlane, sign) {
    const n = [sign, 0, 0];

    // Pro CCW vrtex order respektující normálu (sign·X, 0, 0) volíme:
    //   sign = +1: vertices (Y=yA, Z=zA) → (Y=yB, Z=zB) such that
    //              (yB−yA)·(zC−zA) − (zB−zA)·(yC−yA) > 0
    //   sign = −1: opačné znaménko.
    // Pro konzistenci kódu napíšeme dvě varianty pro +1 a převrátíme order
    // u trojúhelníků/quadů pro −1.

    function quadEntry(yzCorners, uvs, mat) {
      // yzCorners = [[yA, zA], [yB, zB], [yC, zC], [yD, zD]] — pořadí pro +X CCW.
      const verts = yzCorners.map(([y, z]) => [xPlane, y, z]);
      if (sign === 1) {
        addQuad(verts[0], verts[1], verts[2], verts[3], n, uvs[0], uvs[1], uvs[2], uvs[3], mat);
      } else {
        // Reverse winding for −X normal
        addQuad(verts[0], verts[3], verts[2], verts[1], n, uvs[0], uvs[3], uvs[2], uvs[1], mat);
      }
    }

    function triEntry(yzCorners, uvs, mat) {
      const verts = yzCorners.map(([y, z]) => [xPlane, y, z]);
      if (sign === 1) {
        addTri(verts[0], verts[1], verts[2], n, uvs[0], uvs[1], uvs[2], mat);
      } else {
        addTri(verts[0], verts[2], verts[1], n, uvs[0], uvs[2], uvs[1], mat);
      }
    }

    // 1. NORTH ear (Z=−0.5..−W, full Y) — pro +X CCW: (Y=−0.5,Z=−0.5) → (Y=+0.5,Z=−0.5) → (Y=+0.5,Z=−W) → (Y=−0.5,Z=−W)
    quadEntry(
      [[-0.5, -0.5], [0.5, -0.5], [0.5, -W], [-0.5, -W]],
      [[0, 0], [0, 1], [1, 1], [1, 0]],
      MAT_SIDES,
    );

    // 2. SOUTH ear (Z=+W..+0.5, full Y) — analogicky
    quadEntry(
      [[-0.5, W], [0.5, W], [0.5, 0.5], [-0.5, 0.5]],
      [[0, 0], [0, 1], [1, 1], [1, 0]],
      MAT_SIDES,
    );

    // 3. SHOULDER (Z=−W..+W, Y=H+R..+0.5) — pro +X CCW: (Y=H+R,Z=−W) → (Y=+0.5,Z=−W) → (Y=+0.5,Z=+W) → (Y=H+R,Z=+W)
    quadEntry(
      [[H + R, -W], [0.5, -W], [0.5, W], [H + R, W]],
      [[0, 0], [0, 1], [1, 1], [1, 0]],
      MAT_SIDES,
    );

    // 4. NORTH arch sector — fan z corner (Y=H+R, Z=−W) k arch points i ∈ [N/2, N]
    const apexNorth = [H + R, -W];
    for (let i = N / 2; i < N; i++) {
      const a = arch[i];
      const b = arch[i + 1];
      // Pro +X CCW order trojúhelníku (apex, archPt[i], archPt[i+1]):
      // ověřeno cross-productem že má kladnou X složku.
      triEntry(
        [apexNorth, [a.y, a.z], [b.y, b.z]],
        [[0, 1], [0.7, 0.6], [0, 0]],
        MAT_SIDES,
      );
    }

    // 5. SOUTH arch sector — fan z corner (Y=H+R, Z=+W) k arch points i ∈ [0, N/2]
    const apexSouth = [H + R, W];
    for (let i = 0; i < N / 2; i++) {
      const a = arch[i];
      const b = arch[i + 1];
      triEntry(
        [apexSouth, [a.y, a.z], [b.y, b.z]],
        [[1, 1], [0.3, 0.6], [1, 0]],
        MAT_SIDES,
      );
    }
  }

  buildEntryWall(0.5, 1);   // EAST entry (X=+0.5, normála +X)
  buildEntryWall(-0.5, -1); // WEST entry (X=−0.5, normála −X)

  // === INSIDE — 2 walls + 12 ceiling segments (žádný floor — průhled dolů) ===

  const ε = 0.001;

  // NORTH inside wall (Z=−W+ε, Y=−0.5..H), normála +Z (mířit do tunelu)
  addQuad(
    [-0.5, -0.5, -W + ε], [0.5, -0.5, -W + ε], [0.5, H, -W + ε], [-0.5, H, -W + ε],
    [0, 0, 1],
    [0, 0], [1, 0], [1, 1], [0, 1],
    MAT_WALLS,
  );

  // SOUTH inside wall (Z=+W−ε, Y=−0.5..H), normála −Z (mířit do tunelu)
  addQuad(
    [-0.5, -0.5, W - ε], [-0.5, H, W - ε], [0.5, H, W - ε], [0.5, -0.5, W - ε],
    [0, 0, -1],
    [0, 0], [0, 1], [1, 1], [1, 0],
    MAT_WALLS,
  );

  // CEILING — N segmentů půlkruhu, každý jako quad mezi entry a exit walls.
  // Inward normála per segment: směrem ke středu polokruhu (0, H, 0).
  // Order vrcholů (i_west, (i+1)_west, (i+1)_east, i_east) → cross product
  // dává normálu (0, ΔZ, −ΔY), což pro arch jdoucí CCW (θ rostoucí) znamená
  // inward orientaci.
  for (let i = 0; i < N; i++) {
    const a = arch[i];
    const b = arch[i + 1];
    const θ_mid = ((i + 0.5) / N) * Math.PI;
    const nIn = [0, -Math.sin(θ_mid), -Math.cos(θ_mid)];
    addQuad(
      [-0.5, a.y, a.z], [-0.5, b.y, b.z], [0.5, b.y, b.z], [0.5, a.y, a.z],
      nIn,
      [0, 0], [0, 1], [1, 1], [1, 0],
      MAT_CEILING,
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  for (const g of groups) geom.addGroup(g.start, g.count, g.materialIndex);
  return geom;
})();

// Sestaví klenutý tunelový blok pro TTUNELS instanci. 4 materials přes
// sdílený `faceMaterialFor` dispatch.
function createTTunnelFor(instance) {
  const materials = [
    faceMaterialFor(instance.TEXTURE_TOP),      // 0
    faceMaterialFor(instance.TEXTURE_SIDES),    // 1
    faceMaterialFor(instance.TEXTURE_WALLS),    // 2
    faceMaterialFor(instance.TEXTURE_CEILING),  // 3
  ];
  const mesh = new THREE.Mesh(TTUNEL_GEOM_CACHE, materials);
  snapToGrid(mesh, instance);
  mesh.rotation.y = instance.ORIENTATION * (Math.PI / 180);
  return mesh;
}

// Sdílená box geometrie pro FACILITY placeholdery — 1×1×1 jednotka. Per-KIND
// barva se řeší materiálem, ne geometrií, tak že geometrie může být sdílená.
const _facilityGeom = new THREE.BoxGeometry(1, 1, 1);
// Materiály cache per KIND (sdílené napříč instancemi stejného druhu).
const _facilityMatCache = new Map();
function facilityMat(kind) {
  let mat = _facilityMatCache.get(kind);
  if (!mat) {
    const def = FACILITY_DEF[kind];
    if (!def) {
      console.warn(`Neznámý FACILITY KIND "${kind}", použiji fallback`);
      mat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    } else {
      mat = new THREE.MeshStandardMaterial({ color: def.color });
    }
    _facilityMatCache.set(kind, mat);
  }
  return mat;
}

// Sestaví placeholder mesh pro FACILITY: 1×1×1 box s plochou barvou dle KIND.
// Snap-to-grid (DD-28 grid-center jako BLOCKS). Registruje instanci do
// `facilities[]` pro per-frame produkční tick.
function createFacilityFor(instance) {
  const mesh = new THREE.Mesh(_facilityGeom, facilityMat(instance.KIND));
  snapToGrid(mesh, instance);
  // Registrace do produkčního registru. Idempotence: po reloadu scény (kdyby
  // se kdy dělal hot-reload) by se duplikovala — pro MVP jednorázový build.
  facilities.push(instance);
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
// Dispatch podle konkrétní podtřídy COMPOSITES. Po DD-23 (sez. 15) zůstávají
// jen voxel-based: TREE (pixel KIND-y) a VOXEL_MODEL (externí MV).
function createCompositeFor(instance) {
  const group = new THREE.Group();
  group.position.set(instance.X, instance.Y, instance.Z);
  // ORIENTATION (DD-26) — uniform Y rotace pro všechny COMPOSITES. Ve modelu
  // jsou stupně, engine převádí na radiány. Auto-centrování VOXEL_MODELu pak
  // proběhne v lokálním (rotovaném) prostoru group → bbox stále sedí.
  group.rotation.y = instance.ORIENTATION * (Math.PI / 180);

  if (instance instanceof TREE) {
    buildTree(group, instance);
  } else if (instance instanceof GRASS_TUFT) {
    buildGrassTuft(group, instance);
  } else if (instance instanceof ROCK_PIXEL) {
    buildRockPixel(group, instance);
  } else if (instance instanceof LOG) {
    buildLog(group, instance);
  } else if (instance instanceof VOXEL_MODEL) {
    buildVoxelModel(group, instance);
  }

  return group;
}

// VOXEL_MODEL builder (DD-21 + DD-22) — async načte `.obj` + `.mtl` + `.png`
// z `./assets/`, aplikuje scale (default 0.625 = 1 MV voxel = 1/16 TC voxelu),
// rotaci kolem Y, auto-centruje v XZ a posune Y tak, aby spodek mesh seděl
// přesně na `instance.Y`. Pixel-art filter (NearestFilter) na všechny textury.
function buildVoxelModel(group, instance) {
  const mtlLoader = new MTLLoader().setPath("./assets/");
  mtlLoader.load(`${instance.ASSET}.mtl`, (materials) => {
    materials.preload();
    const objLoader = new OBJLoader().setMaterials(materials).setPath("./assets/");
    objLoader.load(`${instance.ASSET}.obj`, (object) => {
      // Pořadí transformací (Three.js skládá scale → position): uniform
      // scale, pak auto-centrování. Rotace kolem Y se aplikuje na rodičovský
      // group v `createCompositeFor` (DD-26 ORIENTATION).
      object.scale.setScalar(instance.SCALE);
      object.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(object);
      object.position.set(
        -(bbox.min.x + bbox.max.x) / 2,    // auto-center X
        -bbox.min.y,                        // bottom snap k Y=0 lokálně
        -(bbox.min.z + bbox.max.z) / 2,    // auto-center Z
      );
      // Pixel-art filter + shadows na všechny mesh-e v importu
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material?.map) {
          child.material.map.magFilter = THREE.NearestFilter;
          child.material.map.minFilter = THREE.NearestFilter;
          child.material.map.colorSpace = THREE.SRGBColorSpace;
          child.material.map.needsUpdate = true;
        }
      });
      group.add(object);
    }, undefined, (err) => console.error(`OBJ load failed: ${instance.ASSET}.obj`, err));
  }, undefined, (err) => console.error(`MTL load failed: ${instance.ASSET}.mtl`, err));
}

// === PATH — Linie (DD-25 vrstva 3) ============================================
// 1D křivka jako plochý strip mesh. POINTS interpolovány Catmull-Rom curvou,
// sample 64 bodů, levá/pravá strana strip podle tangenty (kolmá v XZ rovině).
// UV scale 8× podél délky → textura se opakuje ~každého 1 j světové vzdálenosti
// (s 8× úzkou cestou na šířku). Drobný Y offset +0.005 nad terrain proti
// z-fightingu s grass top facemi.

const PATH_WIDTH        = 0.5;   // šířka cesty v j
const PATH_SEGMENTS     = 64;    // počet vzorků křivky
const PATH_Y_OFFSET     = 0.005; // mírně nad terrain
const PATH_UV_REPEAT    = 8;     // opakování textury podél délky

const PATH_TEX_NAMES = {
  dirt: ":path-dirt",
};
const _pathTexCache = new Map();
function pathTexture(kind) {
  let tex = _pathTexCache.get(kind);
  if (!tex) {
    const texName = PATH_TEX_NAMES[kind] ?? ":path-dirt";
    tex = NAMED_TEXTURE_FACTORIES[texName]();
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    _pathTexCache.set(kind, tex);
  }
  return tex;
}

function createPathFor(instance) {
  const group = new THREE.Group();
  // PATH žije v world coords — instance.X/Y/Z není smysluplné, držíme group v origin.

  const pts = instance.POINTS.map((p) => new THREE.Vector3(p[0], p[1] + PATH_Y_OFFSET, p[2]));
  if (pts.length < 2) return group;

  // Catmull-Rom spline → měkké zatáčky bez nutnosti ručních tangent vektorů.
  const curve   = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  const samples = curve.getPoints(PATH_SEGMENTS);

  const positions = [];
  const uvs       = [];
  const indices   = [];
  const _tan = new THREE.Vector3();

  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    // Tangenta = směr na další bod (poslední bod kopíruje předchozí směr).
    if (i < samples.length - 1) _tan.subVectors(samples[i + 1], p);
    else                         _tan.subVectors(p, samples[i - 1]);
    _tan.y = 0;
    _tan.normalize();
    // Kolmá v XZ rovině (rotace o 90°): (-tan.z, 0, tan.x). Šířka půlená.
    const nx = -_tan.z * (PATH_WIDTH / 2);
    const nz =  _tan.x * (PATH_WIDTH / 2);

    positions.push(p.x - nx, p.y, p.z - nz);  // levý okraj
    positions.push(p.x + nx, p.y, p.z + nz);  // pravý okraj

    const v = (i / (samples.length - 1)) * PATH_UV_REPEAT;
    uvs.push(0, v);
    uvs.push(1, v);
  }

  for (let i = 0; i < samples.length - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    indices.push(a, b, c,  b, d, c);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ map: pathTexture(instance.KIND ?? "dirt") });
  const mesh = new THREE.Mesh(geom, mat);
  // Shadow handling: traverze v `createMeshFor` nastaví cast=true, receive=true.
  // Vlastní stín strip-mesh je benigní (cesta je 0.005 j nad ground, stín splyne
  // s podkladem). Stromy nad cestou vrhají stín na ni → receive je užitečný.
  group.add(mesh);

  // Registrace do paths registry — pathTick iteruje v render loopu. Dekorativní
  // PATH (KIND="dirt", bez SOURCE/SINK) je zde také; pathTick je přeskočí
  // missing-fields checkem. Boot-time validace category × KIND pro factory PATH.
  paths.push(instance);
  if (instance.RESOURCE && instance.KIND !== "dirt") {
    const cat = RESOURCES_DEF[instance.RESOURCE]?.category;
    const expected = cat === "fluid" ? "pipeline" : "conveyor";
    if (instance.KIND !== expected) {
      console.warn(
        `[PATH] ${instance.ID}: RESOURCE "${instance.RESOURCE}" je ${cat}, ` +
        `očekáván KIND="${expected}", máš "${instance.KIND}".`,
      );
    }
  }

  return group;
}

// Strom — dispatch podle `instance.KIND` na konkrétní sub-builder.
// Pattern izomorfní s ANIMATORS lookup tabulkou (DD-15) — model drží recept
// (string), engine staví mesh. Default `"spruce"` (jehličnatý smrk).
function buildTree(group, instance) {
  const kind = instance.KIND ?? "spruce";
  const builder = TREE_BUILDERS[kind];
  if (!builder) {
    console.warn(`[TREE] Unknown KIND "${kind}", fallback na "spruce".`);
    TREE_BUILDERS.spruce(group);
    return;
  }
  builder(group);
}

// === Pixel-voxel helpery pro varianty TREE.KIND ===
// Velikost 1 pixelu = 0.125 j (= 1/8 TC voxelu = 12.5 cm). Strom 12-16 vrstev
// → 1.5-2 m vysoký. Sdílená BoxGeometry + cache materiálů per barva (DRY).
const TREE_PX = 0.125;
const _treeBoxGeom = new THREE.BoxGeometry(TREE_PX, TREE_PX, TREE_PX);
const _treeMatCache = new Map();
function treeMat(color) {
  let m = _treeMatCache.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color });
    _treeMatCache.set(color, m);
  }
  return m;
}

// Pixel-voxel na grid pozici (gx, gy, gz). gy=0 = první vrstva nad zemí.
// Lokální Y center = (gy + 0.5) * TREE_PX → bottom face prvního voxelu (gy=0)
// sedí přesně na lokální Y=0 (= group origin = world surface, viz DD-28).
// Stíny dostane mesh později v `createMeshFor` traverzi (jednotné nastavení
// pro všechny meshe scény, ne duplicitně tady).
function treeVoxel(group, gx, gy, gz, color) {
  const m = new THREE.Mesh(_treeBoxGeom, treeMat(color));
  m.position.set(
    (gx + 0.5) * TREE_PX,
    (gy + 0.5) * TREE_PX,
    (gz + 0.5) * TREE_PX,
  );
  group.add(m);
}

// Vyplnění obdélníkového bloku v gridu — wraps `treeVoxel` přes 3D smyčku.
function treeBlock(group, gx0, gy0, gz0, w, h, d, color) {
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < h; dy++) {
      for (let dz = 0; dz < d; dz++) {
        treeVoxel(group, gx0 + dx, gy0 + dy, gz0 + dz, color);
      }
    }
  }
}

// Diamond-cutoff vrstva v rovině XZ (|dx|+|dz| ≤ radius) na výšce gy.
// Pro spruce/oak/maple koruny — měkčí, kulatější siluetu než plný 5×5.
function treeDiamond(group, cx, gy, cz, radius, color) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > radius) continue;
      treeVoxel(group, cx + dx, gy, cz + dz, color);
    }
  }
}

// === TREE_KIND barvy ===
const TREE_C = {
  trunkOak:    0x6b4423,
  trunkDark:   0x4a3520,
  trunkBirch:  0xeae5d8,
  trunkBirchSpot: 0x222222,
  trunkPalm:   0x8a6a3a,
  trunkDead:   0x8c8278,
  leafSpruce:  0x2a5a2a,
  leafOak:     0x4a8a3a,
  leafBirch:   0x9aae3a,    // žluto-zelená
  leafCypress: 0x254520,    // tmavě zelená
  leafBush:    0x5a8a3a,
  leafPalm:    0x3a8430,
  leafCoco:    0x8a6a3a,
  leafWillow:  0x6a8a3a,    // olive
  leafBonsai:  0xa84030,    // červená
  leafBonsaiAlt: 0xc06b3a,  // oranžová akcent
  leafMaple1:  0xd06028,
  leafMaple2:  0xc04020,
  leafMaple3:  0xe0a020,
};

// === Sub-buildery — všechny pixel-voxel (DD-23, sez. 15) ===

// Smrk — úzký jehlan, tmavě zelená koruna ve 3 vrstvách diamond.
function buildTreeSpruce(group) {
  // Kmen 1×4 tmavě hnědá
  treeBlock(group, 0, 0, 0, 1, 4, 1, TREE_C.trunkDark);
  // Koruna 3 patra zužující se
  treeDiamond(group, 0, 4, 0, 2, TREE_C.leafSpruce);   // 5×5 diamond (13)
  treeDiamond(group, 0, 5, 0, 2, TREE_C.leafSpruce);
  treeDiamond(group, 0, 6, 0, 1, TREE_C.leafSpruce);   // 3×3 diamond (5)
  treeDiamond(group, 0, 7, 0, 1, TREE_C.leafSpruce);
  treeVoxel(group, 0, 8, 0, TREE_C.leafSpruce);        // špička
  treeVoxel(group, 0, 9, 0, TREE_C.leafSpruce);
}

// Dub — kulatá listnatá koruna, kratší kmen.
function buildTreeOak(group) {
  treeBlock(group, 0, 0, 0, 1, 3, 1, TREE_C.trunkOak);
  // Koruna ~5×4×5 zaoblená
  treeDiamond(group, 0, 3, 0, 2, TREE_C.leafOak);
  treeBlock(group, -2, 4, -2, 5, 1, 5, TREE_C.leafOak);
  treeBlock(group, -2, 5, -2, 5, 1, 5, TREE_C.leafOak);
  treeDiamond(group, 0, 6, 0, 2, TREE_C.leafOak);
  treeBlock(group, -1, 7, -1, 3, 1, 3, TREE_C.leafOak);
  treeVoxel(group, 0, 8, 0, TREE_C.leafOak);
}

// Bříza — bílo-černý kmen vyšší, žluto-zelená oválná koruna.
function buildTreeBirch(group) {
  treeBlock(group, 0, 0, 0, 1, 6, 1, TREE_C.trunkBirch);
  // Černé skvrny na kmeni
  treeVoxel(group, 0, 1, 0, TREE_C.trunkBirchSpot);
  treeVoxel(group, 0, 3, 0, TREE_C.trunkBirchSpot);
  // Koruna oválná
  treeDiamond(group, 0, 5, 0, 1, TREE_C.leafBirch);
  treeBlock(group, -1, 6, -1, 3, 1, 3, TREE_C.leafBirch);
  treeBlock(group, -1, 7, -1, 3, 1, 3, TREE_C.leafBirch);
  treeVoxel(group, 0, 8, 0, TREE_C.leafBirch);
}

// Palma — vysoký tenký kmen + 4 listové paprsky + 2 kokos.
function buildTreePalm(group) {
  treeBlock(group, 0, 0, 0, 1, 8, 1, TREE_C.trunkPalm);
  // Listy — 4 paprsky ven, na výšce 8
  treeBlock(group, 1, 8, 0, 3, 1, 1, TREE_C.leafPalm);   // východ
  treeBlock(group, -3, 8, 0, 3, 1, 1, TREE_C.leafPalm);  // západ
  treeBlock(group, 0, 8, 1, 1, 1, 3, TREE_C.leafPalm);   // jih
  treeBlock(group, 0, 8, -3, 1, 1, 3, TREE_C.leafPalm);  // sever
  // Špička listů ohnutá o 1 dolů
  treeVoxel(group, 3, 7, 0, TREE_C.leafPalm);
  treeVoxel(group, -3, 7, 0, TREE_C.leafPalm);
  treeVoxel(group, 0, 7, 3, TREE_C.leafPalm);
  treeVoxel(group, 0, 7, -3, TREE_C.leafPalm);
  // Kokos pod listy
  treeVoxel(group, 1, 7, 1, TREE_C.leafCoco);
  treeVoxel(group, -1, 7, -1, TREE_C.leafCoco);
}

// Keř — bez kmene, jen kulatá koruna nízká.
function buildTreeBush(group) {
  treeDiamond(group, 0, 0, 0, 2, TREE_C.leafBush);
  treeBlock(group, -2, 1, -2, 5, 1, 5, TREE_C.leafBush);
  treeDiamond(group, 0, 2, 0, 2, TREE_C.leafBush);
  treeBlock(group, -1, 3, -1, 3, 1, 3, TREE_C.leafBush);
  treeVoxel(group, 0, 4, 0, TREE_C.leafBush);
}

// Cypřiš — úzký vysoký jehličnan, sloupec + boční rozšíření, tmavě zelený.
function buildTreeCypress(group) {
  // Centrální sloupec
  treeBlock(group, 0, 0, 0, 1, 10, 1, TREE_C.leafCypress);
  // Boční rozšíření + (1 voxel ven N/S/E/W) ve výškách 1..8
  for (let gy = 1; gy <= 8; gy++) {
    treeVoxel(group, 1, gy, 0, TREE_C.leafCypress);
    treeVoxel(group, -1, gy, 0, TREE_C.leafCypress);
    treeVoxel(group, 0, gy, 1, TREE_C.leafCypress);
    treeVoxel(group, 0, gy, -1, TREE_C.leafCypress);
  }
}

// Vrba — kmen + kulatá koruna + visící větve (sloupce dolů z okrajů koruny).
function buildTreeWillow(group) {
  treeBlock(group, 0, 0, 0, 1, 4, 1, TREE_C.trunkOak);
  // Koruna hlavní
  treeDiamond(group, 0, 4, 0, 2, TREE_C.leafWillow);
  treeBlock(group, -2, 5, -2, 5, 1, 5, TREE_C.leafWillow);
  treeDiamond(group, 0, 6, 0, 2, TREE_C.leafWillow);
  treeVoxel(group, 0, 7, 0, TREE_C.leafWillow);
  // Visící větve — 4× sloupec dolů z okrajů (gy=2..3 pod úrovní hlavní koruny)
  for (let gy = 2; gy <= 3; gy++) {
    treeVoxel(group, 2, gy, 0, TREE_C.leafWillow);
    treeVoxel(group, -2, gy, 0, TREE_C.leafWillow);
    treeVoxel(group, 0, gy, 2, TREE_C.leafWillow);
    treeVoxel(group, 0, gy, -2, TREE_C.leafWillow);
  }
}

// Bonsai — malý zkroucený S-kmen + drobná červená koruna.
function buildTreeBonsai(group) {
  // S-kmen: spodní 2 vlevo, horní 2 vpravo
  treeVoxel(group, 0, 0, 0, TREE_C.trunkDark);
  treeVoxel(group, 0, 1, 0, TREE_C.trunkDark);
  treeVoxel(group, 1, 2, 0, TREE_C.trunkDark);
  treeVoxel(group, 1, 3, 0, TREE_C.trunkDark);
  // Drobná koruna nad horním koncem kmene
  treeDiamond(group, 1, 4, 0, 1, TREE_C.leafBonsai);
  treeVoxel(group, 1, 5, 0, TREE_C.leafBonsaiAlt);
  treeVoxel(group, 2, 4, 0, TREE_C.leafBonsaiAlt);
}

// Suchý strom — vysoký šedý kmen, 2-3 holé větve, žádná koruna.
function buildTreeDead(group) {
  treeBlock(group, 0, 0, 0, 1, 9, 1, TREE_C.trunkDead);
  // Větev vpravo (gy=5)
  treeVoxel(group, 1, 5, 0, TREE_C.trunkDead);
  treeVoxel(group, 2, 5, 0, TREE_C.trunkDead);
  treeVoxel(group, 2, 6, 0, TREE_C.trunkDead);
  // Větev vlevo nahoře (gy=7)
  treeVoxel(group, -1, 7, 0, TREE_C.trunkDead);
  treeVoxel(group, -2, 7, 0, TREE_C.trunkDead);
  // Větvička dopředu (gy=6)
  treeVoxel(group, 0, 6, 1, TREE_C.trunkDead);
  treeVoxel(group, 0, 6, 2, TREE_C.trunkDead);
}

// Javor — kmen + podzimní oranžovo-červená koruna s mix barev.
function buildTreeMaple(group) {
  treeBlock(group, 0, 0, 0, 1, 4, 1, TREE_C.trunkOak);
  // Koruna 5×3×5 s namixovanými podzimními barvami (deterministic via gx+gz parita)
  const mapleColors = [TREE_C.leafMaple1, TREE_C.leafMaple2, TREE_C.leafMaple3];
  function mapleColorAt(gx, gz) {
    return mapleColors[((gx + gz + 100) % 3 + 3) % 3];
  }
  // gy=4 — diamond r=2
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) + Math.abs(dz) > 2) continue;
      treeVoxel(group, dx, 4, dz, mapleColorAt(dx, dz));
    }
  }
  // gy=5 — full 5×5
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      treeVoxel(group, dx, 5, dz, mapleColorAt(dx, dz + 1));
    }
  }
  // gy=6 — 3×3
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      treeVoxel(group, dx, 6, dz, mapleColorAt(dx + 1, dz));
    }
  }
  treeVoxel(group, 0, 7, 0, TREE_C.leafMaple3);
}

// === Dispatch tabulka KIND → builder ===
const TREE_BUILDERS = {
  spruce:  buildTreeSpruce,
  oak:     buildTreeOak,
  birch:   buildTreeBirch,
  palm:    buildTreePalm,
  bush:    buildTreeBush,
  cypress: buildTreeCypress,
  willow:  buildTreeWillow,
  bonsai:  buildTreeBonsai,
  dead:    buildTreeDead,
  maple:   buildTreeMaple,
};

// === Doplňková flora a kameny — vrstva 2 DD-25 (GRASS_TUFT, ROCK_PIXEL, LOG) ===
// Sdílí pixel helpery `treeMat` / `treeVoxel` / `treeBlock` (DRY) — naming
// je tree-prefixed historicky, ale helper sám je obecný pixel-voxel idiom.

const DECO_C = {
  grassDark:   0x3a6a2a,
  grassMid:    0x5a8a3a,
  grassYellow: 0x9aae3a,
  fernDark:    0x254520,
  rockGray:    0x6a6a6a,
  rockDark:    0x4a4a4a,
  rockLight:   0x8a8a8a,
  moss:        0x4a7a3a,
  logBirch:    0xeae5d8,
  logBirchSpot: 0x222222,
  logPine:     0x6b4423,
  logPineCore: 0x8a6435,
};

// --- GRASS_TUFT buildery ---

// Mikro voxel zeleně — jediný 1×1×1 voxel (= 0.125 j ≈ 12.5 cm).
function buildGrassMicro(group) {
  treeVoxel(group, 0, 0, 0, DECO_C.grassMid);
}

// Krátký trsík — 3 voxely vrcholu, široký 2×2.
function buildGrassShort(group) {
  treeVoxel(group, 0, 0, 0, DECO_C.grassMid);
  treeVoxel(group, 1, 0, 0, DECO_C.grassDark);
  treeVoxel(group, 0, 0, 1, DECO_C.grassDark);
  treeVoxel(group, 1, 0, 1, DECO_C.grassMid);
  treeVoxel(group, 0, 1, 0, DECO_C.grassYellow);
  treeVoxel(group, 1, 1, 1, DECO_C.grassYellow);
}

// Kapradina — 5-listá rozšířená do stran (severské lesní podloží).
function buildGrassFern(group) {
  // Středový stonek
  treeBlock(group, 0, 0, 0, 1, 2, 1, DECO_C.fernDark);
  // 4 listy vně
  treeVoxel(group, 1, 1, 0, DECO_C.fernDark);
  treeVoxel(group, -1, 1, 0, DECO_C.fernDark);
  treeVoxel(group, 0, 1, 1, DECO_C.fernDark);
  treeVoxel(group, 0, 1, -1, DECO_C.fernDark);
  treeVoxel(group, 0, 2, 0, DECO_C.fernDark);
}

const GRASS_TUFT_BUILDERS = {
  micro: buildGrassMicro,
  short: buildGrassShort,
  fern:  buildGrassFern,
};

function buildGrassTuft(group, instance) {
  const kind = instance.KIND ?? "short";
  const builder = GRASS_TUFT_BUILDERS[kind];
  if (!builder) {
    console.warn(`[GRASS_TUFT] Unknown KIND "${kind}", fallback "short".`);
    GRASS_TUFT_BUILDERS.short(group);
    return;
  }
  builder(group);
}

// --- ROCK_PIXEL buildery ---

// Mikro kámen — jediný 1×1×1 voxel (oblázek).
function buildRockMicro(group) {
  treeVoxel(group, 0, 0, 0, DECO_C.rockGray);
}

// Malý kámen — 2×1×2 shluk se světlou špičkou.
function buildRockSmall(group) {
  treeBlock(group, 0, 0, 0, 2, 1, 2, DECO_C.rockGray);
  treeVoxel(group, 0, 1, 1, DECO_C.rockLight);
}

// Střední kámen — 3×2×3 cluster s temnými nárohy a světlým vrcholem.
function buildRockMedium(group) {
  // Spodek 3×3 šedý
  treeBlock(group, 0, 0, 0, 3, 1, 3, DECO_C.rockGray);
  // Tmavé rohy spodku
  treeVoxel(group, 0, 0, 0, DECO_C.rockDark);
  treeVoxel(group, 2, 0, 2, DECO_C.rockDark);
  // Druhé patro 2×2 posunuté
  treeBlock(group, 1, 1, 0, 2, 1, 2, DECO_C.rockGray);
  // Vrcholový voxel světlý
  treeVoxel(group, 1, 2, 1, DECO_C.rockLight);
}

// Mechový kámen — medium s mechovým povlakem nahoře (severská vlhkost).
function buildRockMossy(group) {
  treeBlock(group, 0, 0, 0, 3, 1, 3, DECO_C.rockGray);
  treeVoxel(group, 0, 0, 0, DECO_C.rockDark);
  treeVoxel(group, 2, 0, 0, DECO_C.rockDark);
  treeBlock(group, 1, 1, 1, 2, 1, 2, DECO_C.rockGray);
  // Mech nahoře — místo světlého voxelu
  treeVoxel(group, 1, 2, 1, DECO_C.moss);
  treeVoxel(group, 0, 1, 0, DECO_C.moss);
  treeVoxel(group, 2, 1, 2, DECO_C.moss);
}

const ROCK_PIXEL_BUILDERS = {
  micro:  buildRockMicro,
  small:  buildRockSmall,
  medium: buildRockMedium,
  mossy:  buildRockMossy,
};

function buildRockPixel(group, instance) {
  const kind = instance.KIND ?? "small";
  const builder = ROCK_PIXEL_BUILDERS[kind];
  if (!builder) {
    console.warn(`[ROCK_PIXEL] Unknown KIND "${kind}", fallback "small".`);
    ROCK_PIXEL_BUILDERS.small(group);
    return;
  }
  builder(group);
}

// --- LOG buildery (padlý kmen, leží podél lokální osy X) ---

// Pařez — jediný voxel dřeva (kousek nebo úplně malý pařízek).
function buildLogStump(group) {
  treeVoxel(group, 0, 0, 0, DECO_C.logPine);
}

// Bříza — bílý kmen s 3 černými skvrnami. 6 voxelů dlouhý, 1×1 průřez.
function buildLogBirch(group) {
  treeBlock(group, 0, 0, 0, 6, 1, 1, DECO_C.logBirch);
  treeVoxel(group, 1, 0, 0, DECO_C.logBirchSpot);
  treeVoxel(group, 3, 0, 0, DECO_C.logBirchSpot);
  treeVoxel(group, 5, 0, 0, DECO_C.logBirchSpot);
}

// Borovice — hnědý kmen s tmavšími prstenci a světlým středem na konci.
function buildLogPine(group) {
  treeBlock(group, 0, 0, 0, 5, 1, 1, DECO_C.logPine);
  // Konec s viditelným letokruhem
  treeVoxel(group, 5, 0, 0, DECO_C.logPineCore);
  // Tmavší prstence
  treeVoxel(group, 1, 0, 0, DECO_C.logBirchSpot);
  treeVoxel(group, 3, 0, 0, DECO_C.logBirchSpot);
}

const LOG_BUILDERS = {
  stump: buildLogStump,
  birch: buildLogBirch,
  pine:  buildLogPine,
};

function buildLog(group, instance) {
  const kind = instance.KIND ?? "birch";
  const builder = LOG_BUILDERS[kind];
  if (!builder) {
    console.warn(`[LOG] Unknown KIND "${kind}", fallback "birch".`);
    LOG_BUILDERS.birch(group);
    return;
  }
  builder(group);
}


// === Scéna: 10×10 voxelová dioráma ===
// Po DD-23 (sez. 15) je toto jediná scéna v TheCubes — vše voxelové.

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
    NORTH:  ":dirt", SOUTH:  ":dirt",
    EAST:   ":dirt", WEST:   ":dirt",
  }, "TCUBES — travnatý blok (vrch grass, boky/spodek hlína).");
}


// Layout Scény 2 — exportovaný z builderu (sez. 14). Pravidlo „překryté =
// hlína / skála" je už aplikované při exportu (grass s Y+1 obsazené → dirt;
// + Y+2 obsazené → stone). Aktualizace: postavit v builderu, kliknout
// „Export do clipboardu", nahradit obsah pole.
const SCENE_LAYOUT = [
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

function buildScene(scene) {
  const FACTORIES = {
    grass: makeGrassBlock,
    dirt:  makeDirtBlock,
    stone: makeStoneBlock,
  };
  for (const [kind, x, y, z] of SCENE_LAYOUT) {
    const id = `s2_${kind}_${x + 5}_${y + 1}_${z + 5}`;
    scene.add(createMeshFor(FACTORIES[kind](id, x, y, z)));
  }

  // Tunelové vstupy — TTUNELS bloky (DD-25 procedurální geometrie). Nahrazují
  // dřívější 3×3×3 TC VOXEL_MODEL `tunel-grass` (sez. 14, DD-21). 1C velikost
  // místo 3C — užší tunel, ale konzistentní s rodinou Bloků. Y=0 = grid Y voxelu
  // (BLOCKS = mesh center semantics, snap-to-int v rendereru; viz DD-28).
  // Vlak jezdí podél X osy na Z = −3. Default ORIENTATION=0 = vstupy ±X.
  // SIDES = `:dirt` (eliminuje druhý grass-strip pásek).
  const TUNEL_TEX = {
    TOP:     ":grass-top",
    SIDES:   ":dirt",
    WALLS:   ":stone",
    CEILING: ":stone",
  };
  scene.add(createMeshFor(new TTUNELS(
    "tunnel_0", "Tunel vlevo", -4, 0, -3, TUNEL_TEX, 0,
    "TTUNELS — tunelový vstup vlevo (osa X).",
  )));
  scene.add(createMeshFor(new TTUNELS(
    "tunnel_1", "Tunel vpravo", 3, 0, -3, TUNEL_TEX, 0,
    "TTUNELS — tunelový vstup vpravo (osa X).",
  )));

  // Travnaté rampy — Bloky (DD-25 kandidát: 1C grid-aligned, procedurální).
  // Per-face textury sdílí paletu s grass cube voxely (`:grass-top` svah,
  // `:grass-top` na vrchu/svahu, `:dirt` na všech bočních faces (= konzistence
  // s grass blokem; sez. 17 zjednodušení BLOCKS rodiny).
  const TRRAMP_TEX = {
    SLOPE:  ":grass-top",
    BOTTOM: ":dirt",
    BACK:   ":dirt",
    LEFT:   ":dirt",
    RIGHT:  ":dirt",
  };
  const TTRAMP_TEX = {
    SLOPE:  ":grass-top",
    BOTTOM: ":dirt",
    BACK:   ":dirt",
    LEFT:   ":dirt",
  };
  // TRRAMPS (trojboký hranol) — ORIENTATION=90° (CCW od defaultu) otočí apex
  // na −X → svah stoupá v −X (= vede z grass(-4,-1,0) k peaku (-5,0,0)).
  // Pozice (-4, 0, 0) = jeden voxel nahoru od grass podlahy (BLOCKS Y konvence).
  scene.add(createMeshFor(new TRRAMPS(
    "ramp_0", "Travnatá rampa Z=0", -4, 0, 0, TRRAMP_TEX, 90,
    "TRRAMPS — trojboký hranol, svah stoupá v −X. Spojuje grass(-4,-1,0) → peak(-5,0,0).",
  )));
  // TTRAMPS (trojboký jehlan) — ORIENTATION=0° (default). Apex Y vrchol směřuje
  // do NW-top rohu bloku.
  scene.add(createMeshFor(new TTRAMPS(
    "ramp_1", "Trojúhelníková rampa Z=1", -4, 0, 1, TTRAMP_TEX, 0,
    "TTRAMPS — trojboký jehlan (corner ramp), rovnostranný svah + 3 pravoúhlé stěny.",
  )));

  // Cesta z tunnel_0 ven scénou (DD-25 vrstva 3 LINES). Pro **rovný vstup
  // i výstup** podél X osy stačí mít první dva body na stejném Z a poslední
  // dva také — Catmull-Rom v krajních bodech používá reflexi sousedního, tj.
  // tangenta = (P[1] − P[0]); pokud P[1].Z = P[0].Z, je čistě +X. Anchory
  // mimo scénu nepotřebujeme. Uprostřed jeden inflexní bod (esíčko).
  const PATH_FROM  = [-3.5, -0.5, -3];   // východní vstup tunnel_0
  const PATH_LEFT  = [-1.5, -0.5, -3];   // 2 j rovně podél X (Z=−3)
  const PATH_VIA   = [ 0.5, -0.5, -1];   // inflexní bod (na spojnici start-end)
  const PATH_RIGHT = [ 2.5, -0.5,  1];   // 2 j rovně podél X (Z=+1)
  const PATH_TO    = [ 4.5, -0.5,  1];   // odchod přes východní hranu scény
  const pathPoints = [PATH_FROM, PATH_LEFT, PATH_VIA, PATH_RIGHT, PATH_TO];
  scene.add(createMeshFor(new PATH(
    "path_0", "Cesta z tunelu", pathPoints,
    "PATH — štěrková cesta z tunnel_0 ven přes východní hranu scény.",
    "dirt",
  )));

  populateNorthernScene(scene, pathOccupiedCells(pathPoints));

  // === Factory toy test scéna (DD-31, sez. 21–22, fáze A→B) ===
  // 3 fasility na grass podlaze (Y=0 = jeden blok nad podlahou gy=−1, BLOCKS
  // grid-center konvence DD-28) propojené 2 conveyor PATH (sez. 22 fáze B).
  // Tok: forest → conveyor → sawmill → conveyor → storage. Bez pre-stocku —
  // sawmill čeká na první klády z transportu (PAUS „chybí logs" na startu,
  // RSUM jakmile forest stihne vyprodukovat & conveyor přesune).
  const forest = new GENERATOR(
    "fac_forest_0", "Les (test)", -2, 0, 2, "forest",
    "GENERATOR — produkuje klády (0.5/s) do lokálního BUFFER.",
  );
  scene.add(createMeshFor(forest));

  const sawmill = new TRANSFORMER(
    "fac_sawmill_0", "Pila (test)", 0, 0, 2, "sawmill",
    "TRANSFORMER — recept sawmill (1 kláda → 0.8 prkna / cyklus, 1 cyklus/s).",
  );
  scene.add(createMeshFor(sawmill));

  const storage = new STORAGE(
    "fac_storage_0", "Sklad (test)", 2, 0, 2,
    "STORAGE — pasivní pufr pro prkna z pily (cap 200).",
  );
  scene.add(createMeshFor(storage));

  // Conveyor PATH 1: forest → sawmill (resource: logs). POINTS na Y=−0.5
  // (grass surface, stejná konvence jako dekorativní path_0). Throughput 2 ks/s
  // (DD-31 default conveyor) — větší než forest production 0.5/s, takže transport
  // není bottleneck a forest BUFFER zůstává ~0 (source-limited).
  const pathForestSawmill = new PATH(
    "path_forest_sawmill", "Dopravník Les → Pila",
    [[-2, -0.5, 2], [0, -0.5, 2]],
    "Conveyor — přemisťuje klády z lesa do pily.",
    "conveyor",
  );
  pathForestSawmill.SOURCE     = forest;
  pathForestSawmill.SINK       = sawmill;
  pathForestSawmill.RESOURCE   = "logs";
  pathForestSawmill.THROUGHPUT = 2;
  scene.add(createMeshFor(pathForestSawmill));

  // Conveyor PATH 2: sawmill → storage (resource: planks). Pila výstup 0.8/s,
  // throughput 2/s — také source-limited. Storage cap 200 = ~250 s plnění
  // dokud sklad nebude full a sawmill nehlásí PAUS „buffer planks plný"
  // (≈ až pila vyprodukuje 200 prken, což při 0.4-0.8/s effective trvá ~5 min).
  const pathSawmillStorage = new PATH(
    "path_sawmill_storage", "Dopravník Pila → Sklad",
    [[0, -0.5, 2], [2, -0.5, 2]],
    "Conveyor — přemisťuje prkna z pily do skladu.",
    "conveyor",
  );
  pathSawmillStorage.SOURCE     = sawmill;
  pathSawmillStorage.SINK       = storage;
  pathSawmillStorage.RESOURCE   = "planks";
  pathSawmillStorage.THROUGHPUT = 2;
  scene.add(createMeshFor(pathSawmillStorage));
}

// Spočítá grid buňky (X, Z), kterými PATH prochází — populate je pak skipne,
// aby dekorace nepřekrývaly cestu. Vzorkujeme 128× Catmull-Rom curve a každý
// vzorek zaokrouhlíme na grid; sousední voxely (±1 v X i Z) skip taky kvůli
// jitteru +/−0.2 j v populate (drobné dekorace by jinak vyčuhovaly nad cestu).
function pathOccupiedCells(points) {
  const set = new Set();
  if (points.length < 2) return set;
  const v3pts = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(v3pts, false, "catmullrom", 0.5);
  for (const p of curve.getPoints(128)) {
    const gx = Math.round(p.x);
    const gz = Math.round(p.z);
    set.add(`${gx},${gz}`);
  }
  return set;
}

// === Procedurální dekorace severského podnebí ===
// Vyplní 10×10 dioráma stromy, keři, trávou, kameny a padlými kmeny. Severský
// mix: smrk dominuje (70%), bříza akcent (20%), suchý strom občas (10%);
// keře, kapradiny, mechové kameny. Deterministická RNG (mulberry32, seed 42)
// pro reprodukovatelnost.

// Mulberry32 — deterministický pseudo-random generátor (4 řádky, 32-bit state).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Najde nejvyšší voxel v každé (X, Z) buňce 10×10 gridu z LAYOUT-u.
// Vrací Map s klíčem `${x},${z}` → { y, kind }.
function topVoxelMap(layout) {
  const map = new Map();
  for (const [kind, x, y, z] of layout) {
    const key = `${x},${z}`;
    const prev = map.get(key);
    if (!prev || y > prev.y) map.set(key, { y, kind });
  }
  return map;
}

function populateNorthernScene(scene, pathBlocked = new Set()) {
  const top = topVoxelMap(SCENE_LAYOUT);
  // Voxely obsazené tunely a rampami — žádná dekorace nahoře.
  const blocked = new Set(["-4,-3", "3,-3", "-4,0", "-4,1"]);
  for (const key of pathBlocked) blocked.add(key);
  const rng = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  // Severský mix — váhy přes opakování v poli (KISS místo cumulative table).
  const TREE_KINDS  = ["spruce", "spruce", "spruce", "spruce", "spruce",
                       "birch",  "birch",
                       "dead",
                       "bonsai"];
  const GRASS_KINDS = ["short", "short", "fern"];
  const ROCK_KINDS  = ["small", "small", "medium", "mossy"];
  const LOG_KINDS   = ["birch", "pine"];

  let counter = 0;
  for (let x = -5; x <= 4; x++) {
    for (let z = -5; z <= 4; z++) {
      const key = `${x},${z}`;
      if (blocked.has(key)) continue;
      const t = top.get(key);
      if (!t) continue;

      // DD-28 surface konvence: pixel-voxel COMPOSITES + VOXEL_MODEL používají
      // `instance.Y = world Y surface = gy + 0.5` (= top voxelu, na kterém model
      // stojí). Pro grass podlahu na grid Y=−1 → t.y=−1 → instance.Y=−0.5.
      // BLOCKS (TCUBES, TRRAMPS, ...) mají naopak grid-Y semantics (= mesh center).
      const instY = t.y + 0.5;
      // Drobný jitter (±0.2 j) — eliminuje vizuální mřížkovost rozmístění.
      const jx = x + (rng() - 0.5) * 0.4;
      const jz = z + (rng() - 0.5) * 0.4;

      const r = rng();

      // Skála (stone top): drobné kameny rozházené po povrchu — small a micro.
      if (t.kind === "stone") {
        const yawStone = rng() * 360;
        if (r < 0.30) spawnRock(scene, counter++, jx, instY, jz, "small", yawStone);
        else if (r < 0.70) spawnRock(scene, counter++, jx, instY, jz, "micro", yawStone);
        continue;
      }

      // Náhodná Y rotace pro každou dekoraci (DD-26) — eliminuje
      // mřížkový vzhled (všechny stromy stejně otočené).
      const yaw = rng() * 360;

      // Hlína (dirt top, peak zadní stěny bez grass): suchý strom občas, kameny.
      if (t.kind !== "grass") {
        if (r < 0.15) spawnRock(scene, counter++, jx, instY, jz, "small", yaw);
        else if (r < 0.225) spawnTree(scene, counter++, jx, instY, jz, "dead", yaw);
        else if (r < 0.40) spawnRock(scene, counter++, jx, instY, jz, "micro", yaw);
        continue;
      }

      // Grass top — hlavní severský mix. Vícevoxelové dekorace (strom/keř/rock/
      // log/short+fern grass) zhruba × 0.75 oproti sez. 17 prvotnímu nastavení;
      // mikro vrstva (1-voxel rock/grass/stump) doplňuje hustotu drobnostmi.
      if (r < 0.075) {
        spawnTree(scene, counter++, jx, instY, jz, pick(TREE_KINDS), yaw);
      } else if (r < 0.120) {
        spawnTree(scene, counter++, jx, instY, jz, "bush", yaw);
      } else if (r < 0.180) {
        spawnRock(scene, counter++, jx, instY, jz, pick(ROCK_KINDS), yaw);
      } else if (r < 0.200) {
        spawnLog(scene, counter++, jx, instY, jz, pick(LOG_KINDS), yaw);
      } else if (r < 0.410) {
        spawnGrass(scene, counter++, jx, instY, jz, pick(GRASS_KINDS), yaw);
      } else if (r < 0.470) {
        spawnRock(scene, counter++, jx, instY, jz, "micro", yaw);
      } else if (r < 0.580) {
        spawnGrass(scene, counter++, jx, instY, jz, "micro", yaw);
      } else if (r < 0.610) {
        spawnLog(scene, counter++, jx, instY, jz, "stump", yaw);
      }
    }
  }
}

function spawnTree(scene, id, x, y, z, kind, yaw) {
  const tree = new TREE(
    `deco_tree_${id}`, `Strom (${x.toFixed(1)}, ${z.toFixed(1)})`, x, y, z,
    `TREE — pixelová varianta „${kind}".`, kind,
  );
  tree.ORIENTATION = yaw;
  tree.ANIMATE = {
    kind:      "tree_sway",
    periodX:   3.5 + Math.random() * 1.5,
    periodZ:   2.7 + Math.random() * 1.0,
    amplitude: 0.04,
    phaseX:    Math.random() * Math.PI * 2,
    phaseZ:    Math.random() * Math.PI * 2,
  };
  scene.add(createMeshFor(tree));
}

function spawnGrass(scene, id, x, y, z, kind, yaw) {
  const tuft = new GRASS_TUFT(
    `deco_grass_${id}`, `Tráva (${x.toFixed(1)}, ${z.toFixed(1)})`, x, y, z,
    `GRASS_TUFT — chomáč „${kind}".`, kind,
  );
  tuft.ORIENTATION = yaw;
  scene.add(createMeshFor(tuft));
}

function spawnRock(scene, id, x, y, z, kind, yaw) {
  const rock = new ROCK_PIXEL(
    `deco_rock_${id}`, `Kámen (${x.toFixed(1)}, ${z.toFixed(1)})`, x, y, z,
    `ROCK_PIXEL — varianta „${kind}".`, kind,
  );
  rock.ORIENTATION = yaw;
  scene.add(createMeshFor(rock));
}

function spawnLog(scene, id, x, y, z, kind, yaw) {
  const log = new LOG(
    `deco_log_${id}`, `Padlý kmen (${x.toFixed(1)}, ${z.toFixed(1)})`, x, y, z,
    `LOG — padlý kmen „${kind}".`, kind,
  );
  log.ORIENTATION = yaw;
  scene.add(createMeshFor(log));
}


// Po DD-23 (sez. 15) zůstává jediná scéna — voxelová dioráma. Bývalá Scéna 1
// + scene switcher byly odstraněny při „all-voxel" pivotu.
buildScene(scene);

// === Hover highlight (editor-like feedback) ===
// Při najetí kurzoru na CUBES-potomka (kromě SPRITES) jemně zežloutne celý
// objekt — boost emissive komponenty materiálu. Vizuálně se objekt rozsvítí
// žlutým „světélkováním" bez ostrých hran.
//
// Sdílení materiálů: TREE _treeMatCache (DD-23) sdílí MeshStandardMaterial
// mezi sourozenci stejné barvy. Pokud bychom mutovali emissive na sdíleném
// materiálu, hover by zvýraznil všechny stromy téže barvy. Řešení:
// **lazy clone-on-first-hover** — při prvním hoveru klonujeme materials per
// mesh, originály držíme v userData. Při on/off přepneme `child.material`
// mezi originálem a klonem; emissive nastavujeme jen na klonu.
//
// SPRITES skip: 2D billboardy s SpriteMaterial nemají emissive komponentu.
// VOXEL_MODEL ze MagicaVoxelu má MeshLambertMaterial bez emissive — pro něj
// fallback: emissive vlastnost dodáme dynamicky (Lambert ji neumí, ale Standard
// ano). KISS: pokud mat.emissive neexistuje, hover je no-op pro ten material.

const HOVER_EMISSIVE_HEX = 0x404020;  // jemné žluté světélkování (R=0x40, G=0x40, B=0x20)

function setHoverHighlight(instance, on) {
  if (!instance) return;
  if (instance instanceof SPRITES) return;
  const root = meshByInstance.get(instance.ID);
  if (!root) return;

  // Lazy příprava clone materials při prvním zapnutí. Klon je per-mesh, takže
  // sourozenci se sdíleným originálem zůstanou nedotknuti.
  if (!root.userData.hoverInit) {
    root.traverse((child) => {
      if (!child.isMesh) return;
      const orig = child.material;
      const cloned = Array.isArray(orig) ? orig.map((m) => m.clone()) : orig.clone();
      child.userData.hoverOrigMat = orig;
      child.userData.hoverHotMat  = cloned;
    });
    root.userData.hoverInit = true;
  }

  root.traverse((child) => {
    if (!child.isMesh) return;
    if (on) {
      child.material = child.userData.hoverHotMat;
      const matsArr = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of matsArr) {
        if (mat.emissive) mat.emissive.setHex(HOVER_EMISSIVE_HEX);
      }
    } else {
      child.material = child.userData.hoverOrigMat;
    }
  });
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
  // COLOR na CCUBES; TEXTURE_* na TCUBES. Oba případ: number → hex.
  if (typeof val === "number" && (key === "COLOR" || key.startsWith("TEXTURE_"))) {
    return "#" + val.toString(16).padStart(6, "0");
  }
  // ANIMATE = recept chování (objekt `{ kind, ...params }`). V infotipu
  // stačí zobrazit samotný `kind` — detailní parametry uživatel uvidí v kódu.
  // Plná serializace by dala „[object Object]" přes escapeHtml.
  if (key === "ANIMATE" && typeof val === "object") {
    return val.kind || "object";
  }
  // POINTS na PATH = pole [x, y, z] trojic. Default `Array.toString()` je sklouže
  // všechny čárky do plochého řetězce (nečitelné). Uzávorkujeme každý bod.
  if (key === "POINTS" && Array.isArray(val)) {
    return val.map((p) => `(${p.join(", ")})`).join(" → ");
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
      setHoverHighlight(lastHoveredInstance, false);
      setHoverHighlight(instance, true);
      lastHoveredInstance = instance;
    }
  } else {
    hideTooltip();
    setHoverHighlight(lastHoveredInstance, false);
    lastHoveredInstance = null;
    lastHoveredMesh = null;
  }
});
// Skryj tooltip + edge highlight, když kurzor opustí canvas úplně
canvas.addEventListener("pointerleave", () => {
  hideTooltip();
  setHoverHighlight(lastHoveredInstance, false);
  lastHoveredInstance = null;
});

// Sez. 15 cleanup: click handler smazán s BALLOON.LIT (DD-23). Až bude nová
// interaktivní entita, refaktor na `INTERACTIONS = { ClassName: fn }` dispatch.

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
// World Y osa pro Q/E orbit — explicitní (0,1,0) místo camera.up, eliminuje
// drift, kdyby camera.up někdy přestala být přesně vertikální.
const _kbWorldY  = new THREE.Vector3(0, 1, 0);

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

  // Q/E rotace — kamera obíhá cíl kolem world Y osy. Q = CCW (camera shifts
  // left od pohledu kamery), E = CW. Mutujeme camera.position; cíl zůstává.
  // Explicitní `_kbWorldY` (ne camera.up) + `camera.lookAt` → kruh přesně
  // kolem cíle bez postranního shiftu (sez. 17 fix).
  if (heldKeys.has("q") || heldKeys.has("e")) {
    const sign  = heldKeys.has("q") ? 1 : -1;
    const angle = sign * KB_ROT_SPEED * dt;
    _kbDelta.subVectors(camera.position, controls.target);
    _kbDelta.applyAxisAngle(_kbWorldY, angle);
    camera.position.copy(controls.target).add(_kbDelta);
    camera.lookAt(controls.target);
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
  // Factory toy produkční tick (DD-31). `dt` v sekundách × `world.TIME_SCALE`
  // (DD-29 nový konzument). TIME_SCALE=0 → pauza simulace, =2 → 2× zrychleně.
  // Cap na 0.1 s (kdyby tab uspal a `dt` byl velký) — žádné spikes v ekonomice.
  const simDt = Math.min(dt, 0.1) * world.TIME_SCALE;
  if (simDt > 0) {
    productionTick(simDt);
    pathTick(simDt);
  }
  aggregateResources();
  // Ocásky dialogových bublin: přepočítáme až **po** animátorech, aby jsme
  // četli aktuální `object3d.position` případných pohybujících se mluvčí
  // (tbox_0002 orbituje, …).
  updateBubbleTails();
  updateKeyboardCamera(dt);
  renderer.render(scene, camera);
}
animate();
