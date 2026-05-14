// src/main.js
// Boot celé aplikace: Three.js scéna, kamera, osvětlení, první kostka,
// tikání TIME, render loop.
//
// Závislosti se importují skrz import map v index.html.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CUBES, CCUBES, TCUBES, TRRAMPS, TTRAMPS, TDRAMP, SPRITES, LAMP, DECOR, PATH, TIMER, COUNTER, WORLD } from "./model.js";
import { DECOR_BUILDERS } from "./composites/builders.js";
import { TIME, advanceTime } from "./time.js";
import { generateTerrain, maxReliefForSize, BIOME_NAMES, BIOME_SURFACES, surfacesForBiome, snowSpecForLatitude, waterSpecForClimate, decorSpecForClimate, DECOR_DENSITY, SEASONS } from "./terrain.js";

// === Renderer ===
// WebGLRenderer = Three.js komponenta, která překládá scénu na GPU volání.
// `antialias: true` = plynulejší hrany (mírně dražší).
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Sez. 42 Krok 3 (perf HUD fix) — `info.autoReset = false` zachová akumulaci
// stats napříč všemi pass v `composer.render()` (= main scene render + DOF blur
// pass + OutputPass). Manuální `info.reset()` per frame na začátku `animate()`.
// Bez tohohle Three.js resetuje stats na začátku **každého** renderer.render(),
// takže perf HUD čte jen stats z OutputPass (= 1 quad, 2 tri = naprosto k ničemu).
renderer.info.autoReset = false;
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
// Sky/ambient paleta — keypointy pro day/night cyklus. Driver: `world.DAY`
// (DD-38). `updateAtmosphere()` per-frame lerpuje `scene.background` + `sceneFog.
// color` + `ambientLight.intensity` mezi NIGHT a DAY podle `max(0, -cos(2π·DAY))`
// — stejná křivka jako sun intensity (DRY s `updateSun()`).
// Posun křivky `sin` → `-cos` (sez. 35): DAY=0.5 = poledne (intuitivní 24h cyklus
// 0=půlnoc, 0.25=východ, 0.5=poledne, 0.75=západ), nahrazuje původní DD-38 mapping
// kde 0.25=poledne (matematicky úsporné, prakticky matoucí pro user-facing slider).
const _skyDay = new THREE.Color(0x1a1a2e);   // tmavě modrofialová (poledne)
const _skyDusk = new THREE.Color(0x5f3433);  // dusk peak oslabený na 30 % (sez. 38, lerp(_skyDay, 0xff7040, 0.3))
const _skyNight = new THREE.Color(0x000000); // úplná čerň (půlnoc bez Měsíce)
const AMBIENT_DAY = 0.15;
const AMBIENT_NIGHT = 0.005; // téměř 0 — noc skoro úplná tma, scéna spoléhá výhradně na lokální SpotLight (lampy)
scene.background = new THREE.Color().copy(_skyDay); // placeholder, updatuje updateAtmosphere
// Atmospheric fog — vzdálené objekty plynule blednou do barvy pozadí.
// `THREE.Fog(color, near, far)` lineární mlha: na vzdálenosti < `near` = ostrý
// obraz, mezi `near` a `far` = lineární přechod, > `far` = plně pozadí. Pro
// 100×100 terrain (half=50) far=120 = vidíš až k okraji, ale s ubývající jasností.
//
// Drž jako reference (ne přímo `scene.fog = new Fog(...)`), aby toggle on/off
// (přes `#settings` panel) mohl restore stejnou instanci místo realokace.
const sceneFog = new THREE.Fog(_skyDay.getHex(), 30, 120);
scene.fog = sceneFog;

// Adaptivní fog distances dle velikosti scény (sez. 38 bug fix). Default
// distances 30..120 byly nastavené pro 100×100 perf test (sez. 31) — pro
// menší scény ležel celý terén v < near zóně a fog byl vizuálně neaktivní
// (toggle FOG on/off nedělal nic viditelného).
// Vzorec drží paritu s historickou 30..120 hodnotou pro 100×100, škáluje
// proporcionálně pro menší scény. `max(sx, sz)` (ne min) = pokrýt delší
// hranu terénu — kratší vždy spadne do fog gradient zóny.
//
// Aditivní offset `+10` j na far oslabuje fog pro malé scény (10×10:
// 12 → 22, +83 %) víc než pro velké (100×100: 120 → 130, +8 %), aby
// uživatel viděl celé dioráma i na default 10×10 (vzdálený okraj ~13 j
// od default kamery v (4,4,4)).
function updateFogForSize(sx, sz) {
  const m = Math.max(sx, sz);
  sceneFog.near = m * 0.3;
  sceneFog.far  = m * 1.2 + 10;
}

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
// Reference držena pro day/night intensity lerp v `updateAtmosphere()`.
const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_DAY);
scene.add(ambientLight);
// DirectionalLight = paralelní paprsky (jako slunce). Dává tvar kostce.
// Pozice se aktualizuje každý frame v `updateSun()` z `world.DAY` (DD-38, sez. 32) —
// dráha leží v rovině nakloněné 30° od svislice (≈ severní polokoule v létě).
// Initial pozice je placeholder pro první frame před prvním `updateSun()`.
// Pozn.: Three.js má Y jako osu nahoru. Viz DD-10 (nahrazuje DD-09).
const SUN_BASE_INTENSITY = 0.8;
const sun = new THREE.DirectionalLight(0xffffff, SUN_BASE_INTENSITY);
// Magnitude pozice slunce — zachovává původní vzdálenost √(100+64+100) ≈ 16.25.
// Zachování důležité kvůli shadow.camera.near=1, far=50 (sun je uvnitř).
const SUN_DISTANCE = Math.sqrt(10 * 10 + 8 * 8 + 10 * 10);
// Sklon dráhy slunce od svislice (rad). 0 = slunce v poledne přesně v zenitu
// (stíny nulové = nevizuální), π/6 = 30° náklon (stíny v poledne mírné, na
// úsvitu/západu dlouhé). G2 (sez. 35) — driver `world.LATITUDE` (DD-29 atribut):
// rovník = vyšší slunce (~zenith), póly = nižší (sun blízko horizontu). Lookup
// per LATITUDE enum, čte se v `updateSun()` per-frame.
const SUN_TILT_BY_LATITUDE = {
  tropical:    0,             // sun přímo overhead (no-shadow trade-off, ale fyzikálně OK)
  subtropical: Math.PI / 12,  // 15° náklon
  temperate:   Math.PI / 6,   // 30° náklon (DD-38 původní default)
  polar:       Math.PI / 3,   // 60° náklon (slunce nízko nad horizontem)
};
sun.position.set(-10, 8, 10);
// Slunce vrhá stíny. DirectionalLight používá **ortografickou** stínovou
// kameru — je jako slunce v nekonečnu, paprsky jsou rovnoběžné. Frustum
// této kamery musí obalit celou scénu, jinak objekty mimo frustum stín
// vrhat nebudou. Default ±8 = vhodný pro malé scény před `spawnTerrain` (DD-32
// generátor přepíše dle `params.size` přes `updateShadowFrustum`). near/far
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

// Vizualizace slunce — drobná bílá koule ve směru `sun.position` daleko za
// scénou. `MeshBasicMaterial` je unlit (ignoruje osvětlení) → koule "svítí"
// konstantní bílou nezávisle na DirectionalLight. Vzdálenost ×5 (= ~80 j)
// umístí ji za hranici 100×100 terrain (half=50). Radius 1.5 = drobný bod
// na obloze (realistická distance perspective).
//
// Pozice sync-uje `updateSun()` v render loopu (DD-38, sez. 32) — drží sun mesh
// v 5× radiusu DirectionalLight. V noci (sun.position.y < 0) sunMesh.visible=false.
const SUN_DISTANCE_SCALE = 5;

// Sun color paleta (sez. 38). 3-keypoint piecewise lerp dle `daylight` (= max(0, -cos α)).
// Symetrický před/po poledni — atmospheric warming při sunrise/sunset reálné Země,
// kdy paprsky jdou skrz delší vrstvu atmosféry → modré spektrum se rozptýlí,
// červené prochází (Rayleigh scattering). DirectionalLight color přebarví celou
// scénu na warm tone během krajních fází dne.
//   daylight=0   (sunrise/sunset)  → červánková (sytě oranžová s nádechem červené)
//   daylight=0.5 (mid-morning/-noon → teplé žluté
//   daylight=1   (poledne)         → neutrální bílá
// Hodnoty oslabené na 30 % původní amplitudy (sez. 38 user feedback: full
// peak `0xff7040`/`0xffd870` = "obrazovka v ohni", 10 % téměř neviditelné).
// Pravidlo: keypoint = `lerp(_sunColorNoon, original_peak, 0.3)`. Pro silnější
// dusk efekt zvýšit blend ratio (např. 0.5 = polocesta, 1.0 = původní oheň).
const _sunColorSunrise = new THREE.Color(0xffd4c6);  // lerp(white, 0xff7040, 0.3)
const _sunColorMid     = new THREE.Color(0xfff3d4);  // lerp(white, 0xffd870, 0.3)
const _sunColorNoon    = new THREE.Color(0xffffff);
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 16, 16),
  // `fog: false` = slunce ignoruje scene.fog; jinak by se bílá koule s rostoucí
  // vzdáleností rozplynula do barvy oblohy (na ~80 j by zmizela úplně).
  new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
);
sunMesh.position.copy(sun.position).multiplyScalar(SUN_DISTANCE_SCALE);
scene.add(sunMesh);

// === WORLD singleton (DD-38, sez. 32 re-introduce) ===========================
// Nositel globálních atributů scény. Aktuální konzumenti:
//   - `DAY` ↔ sun.position + sun.intensity + sunMesh.position/visible
//   - `DAY_SPEED` ↔ render loop auto-advance DAY
// `window.world` dev exposure (settings panel API mutuje atributy, console test).
const world = new WORLD("world_0001", "Svět", "Globální atributy scény (DD-38).");
window.world = world;

// Auto-advance DAY ze rychlosti DAY_SPEED. Při speed=0 (default) je pauza —
// user mutuje DAY manuálně přes slider/console. Modulo `% 1` zaručí cyklic.
// Pozn.: záporný DAY_SPEED by jel opačně (před-poledne → východ → půlnoc → ...),
// JS `%` vrací záporky → `((x % 1) + 1) % 1` zaručí [0,1).
function updateWorldTime(dt) {
  if (world.DAY_SPEED === 0) return;
  world.DAY = ((world.DAY + dt * world.DAY_SPEED) % 1 + 1) % 1;
}

// Derivuje sun.position + intensity + sunMesh z `world.DAY`. Volat v render loopu
// po `updateWorldTime` a před `composer.render()`. Math: úhel α = DAY · 2π,
// dráha v rovině nakloněné `SUN_TILT` od svislice. 24h cyklus mapping (sez. 35):
//   DAY=0.0  (půlnoc)  → -cos=-1, sin=0    → sun pod horizontem (Y<0), intensity=0
//   DAY=0.25 (východ)  → -cos=0,  sin=+1   → sun na +X horizontu (Y=0)
//   DAY=0.5  (poledne) → -cos=+1, sin=0    → sun v zenithu (Y=+cos(tilt)·dist)
//   DAY=0.75 (západ)   → -cos=0,  sin=-1   → sun na -X horizontu (Y=0)
// Y výška = SUN_DISTANCE · (-cos α) · cos(tilt). V noci (-cos < 0) intensity → 0
// a sun mesh hidden.
function updateSun() {
  const angle = world.DAY * TAU;
  const sinA = Math.sin(angle);
  const negCosA = -Math.cos(angle);
  // G2 (sez. 35) — sun tilt fce LATITUDE. Fallback na temperate při neznámém klíči
  // (defensive, world.LATITUDE je controlled enum přes UI; nemělo by nastat).
  const tilt = SUN_TILT_BY_LATITUDE[world.LATITUDE] ?? SUN_TILT_BY_LATITUDE.temperate;
  sun.position.set(
    SUN_DISTANCE * sinA,
    SUN_DISTANCE * negCosA * Math.cos(tilt),
    SUN_DISTANCE * negCosA * Math.sin(tilt),
  );
  // Intensity lerp: max 0 v noci (-cos záporný), plné 0.8 v poledne (-cos=1).
  // `max(0, -cos)` = pásmo "noc bez DirectionalLight". `updateAtmosphere()` stmívá
  // ambient + sky podle stejné křivky → v noci scéna spoléhá jen na zbytkový
  // AMBIENT_NIGHT (0.04) + tmavé pozadí, vizuálně temná silueta.
  const daylight = Math.max(0, negCosA);
  sun.intensity = SUN_BASE_INTENSITY * daylight;
  // Color piecewise lerp (sez. 38) — sunrise/sunset červánková, mid žlutá, poledne bílá.
  // `lerpColors(c1, c2, t)` zapisuje do `this` instance, žádná per-frame alokace.
  if (daylight < 0.5) {
    sun.color.lerpColors(_sunColorSunrise, _sunColorMid, daylight * 2);
  } else {
    sun.color.lerpColors(_sunColorMid, _sunColorNoon, (daylight - 0.5) * 2);
  }
  // Sun mesh follow + skip render v noci (Y<0 = pod scénou = stejně neviditelné).
  // AND s `_sunUserVisible` — pokud user vypne toggle v settings panelu, hide
  // se zachová i v poledne (toggle = user override, ne overflow flag).
  sunMesh.position.copy(sun.position).multiplyScalar(SUN_DISTANCE_SCALE);
  sunMesh.visible = _sunUserVisible && sun.position.y > 0;
}

// Day/night atmospheric lerp. Driver: `world.DAY` (DD-38). 3 konzumenti:
//   - scene.background (3-keypoint piecewise _skyNight → _skyDusk → _skyDay) — obloha
//   - sceneFog.color (kopie background) — vzdálené splývá s oblohou
//   - ambientLight.intensity (lerp AMBIENT_NIGHT ↔ AMBIENT_DAY) — fill light
//
// Sky používá **raw `negCosA` ∈ [-1, 1]** (ne clamped `daylight`), aby šlo
// rozlišit "deep night" (negCosA → -1) od "moment sunset/sunrise" (negCosA → 0).
// 3-keypoint piecewise (sez. 38, rozšiřuje DD-39 původní 2-keypoint lineární):
//   negCosA = -1 (půlnoc)         → _skyNight (čerň)
//   negCosA =  0 (sunset/sunrise) → _skyDusk  (oranžová)
//   negCosA = +1 (poledne)        → _skyDay   (modrofialová)
// Ambient intensity zůstává driven `daylight` (= max(0, negCosA)) — fill light
// se v noci propadne na AMBIENT_NIGHT, dusk fáze už lift na ~AMBIENT_NIGHT
// (= shoduje se s "obloha se rozjasňuje, ale slunce ještě neosvětluje").
// `lerpColors(c1, c2, alpha)` zapisuje do `this` instance, žádná alokace per-frame.
function updateAtmosphere() {
  const negCosA = -Math.cos(world.DAY * TAU);
  if (negCosA < 0) {
    scene.background.lerpColors(_skyNight, _skyDusk, negCosA + 1);
  } else {
    scene.background.lerpColors(_skyDusk, _skyDay, negCosA);
  }
  sceneFog.color.copy(scene.background);
  const daylight = Math.max(0, negCosA);
  ambientLight.intensity = AMBIENT_NIGHT + (AMBIENT_DAY - AMBIENT_NIGHT) * daylight;
}

// === Post-processing (DOF + fog) =============================================
// EffectComposer = wrapper kolem rendereru; provede sérii `passes` na off-screen
// texturách a finální výstup poslat na canvas. Pro DOF (Depth-of-Field) potřeba:
//   1. RenderPass — vykreslí scénu do off-screen target (s color + depth bufferem).
//   2. BokehPass  — Gaussian blur podle depth: ostrá zóna ±maxblur kolem `focus`,
//                   ostatní rozostřené. Vyžaduje depth buffer z RenderPass.
//   3. OutputPass — gamma/color-space korekce (sRGB → linear → sRGB), kterou jinak
//                   dělá WebGLRenderer automaticky. Bez OutputPass by composer
//                   output byl tmavší.
//
// `focus` se synchronizuje v animate() s `camera.position.distanceTo(controls.
// target)` — ohnisko = vzdálenost kamera→target (= střed scény). Při zoom in/out
// (Y/X klávesa) se focus dynamicky drží na cíli.
//
// `aperture` = sílu blur (větší = víc blur); 0.0005 = jemný DoF, na pixel-art
// textury (NearestFilter 16px) by větší hodnoty rozmazaly atlas tile boundary.
// `maxblur` = max strength of blur (0.005 = decentní bokeh, ne dramatický).
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokehPass = new BokehPass(scene, camera, {
  focus:    10,       // overridujeme v animate() dynamicky
  aperture: 0.0005,
  maxblur:  0.005,
});
composer.addPass(bokehPass);
composer.addPass(new OutputPass());

// === Settings API — toggle volitelných vizuálních efektů ====================
// Wire-up: `index.html` panel `#settings` volá `window.settings.setXxx(...)`
// na `change` / `input` event. Default v HTML matchne initial state po
// inicializaci (checkboxy `checked`, slider hodnoty = WORLD defaulty).
//
// DOF: `BokehPass.enabled = false` přeskočí pass v composeru (+5-10 FPS na 100×100).
// Fog: `scene.fog = null` vypne fog uniform; restoreujeme `sceneFog` (cheap toggle).
// Sun: dvojkový stav — user override (`_sunUserVisible`) + auto-hide v noci
// (`updateSun()` skryje mesh pod horizontem). Finální visible = AND obou.
// Day/DaySpeed: mutují WORLD atributy; `updateSun()` se postará per-frame.
let _sunUserVisible = true;
window.settings = {
  setDOF(on)      { bokehPass.enabled = on; },
  setFog(on)      { scene.fog = on ? sceneFog : null; },
  setSun(on)      { _sunUserVisible = on; },
  setDay(v)       { world.DAY = v; },
  setDaySpeed(v)  { world.DAY_SPEED = v; },
  // G2 (sez. 35) — climate enum mutátory. Validace klíče: silent skip neznámých
  // hodnot (UI controller posílá jen z LATITUDE_KEYS / HUMIDITY_KEYS).
  setLatitude(v)  { if (v in SUN_TILT_BY_LATITUDE) world.LATITUDE = v; },
  setHumidity(v)  { world.HUMIDITY = v; },
  // DD-50 (sez. 40) — SEASON mutátor. Validace: musí být v SEASONS enum.
  setSeason(v)    { if (SEASONS.includes(v)) world.SEASON = v; },
};

// F12 (sez. 29) — fix: shadow frustum reaktivně dle aktuální velikosti terrain.
// Volaný z `spawnTerrain` po každém regen. Buffer +4 j pokrývá vyšší objekty
// (balon, sprites). `updateProjectionMatrix` je nutné po mutaci ortho parametrů.
function updateShadowFrustum(maxDim) {
  const half = Math.ceil(maxDim / 2) + 4;
  sun.shadow.camera.left   = -half;
  sun.shadow.camera.right  =  half;
  sun.shadow.camera.top    =  half;
  sun.shadow.camera.bottom = -half;
  sun.shadow.camera.updateProjectionMatrix();
}

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
const SAND_BASE = "#d4b97c";
const SAND_ACCENTS = ["#c5a86b", "#e3c98a", "#b89858", "#dec595"];

function makeDirtTexture() {
  return makePatchTexture(DIRT_BASE, DIRT_ACCENTS);
}

function makeGrassTopTexture() {
  return makePatchTexture(GRASS_BASE, GRASS_ACCENTS);
}

function makeStoneTexture() {
  return makePatchTexture(STONE_BASE, STONE_ACCENTS);
}

function makeSandTexture() {
  return makePatchTexture(SAND_BASE, SAND_ACCENTS);
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

// Pojmenované sdílené textury — factory vyrobí canvas s random patches, ale
// výsledek je memoizovaný v `_namedTextureCache`. Všichni konzumenti (slow path
// `faceMaterialFor`, TCUBES atlas, ramp atlas, PATH) sdílí stejnou `THREE.Texture`
// instanci → jednotný vizuál napříč cestami (sez. 32 F5 fix — bez sdílení by
// atlas a slow path měly různé random patches pro stejný `:name`).
const NAMED_TEXTURE_FACTORIES = {
  ":dirt":       () => makeDirtTexture(),
  ":grass-top":  () => makeGrassTopTexture(),
  ":stone":      () => makeStoneTexture(),
  ":sand":       () => makeSandTexture(),
  ":rail-top":   () => makeRailTopTexture(),
  ":path-dirt":  () => makePathDirtTexture(),
};

// Lazy cache pojmenovaných textur — první volání spustí factory, další vrátí
// cached `THREE.Texture`. `null` cached miss značí neznámý název (`console.warn`
// už proběhl) — zabrání spamování warnů.
const _namedTextureCache = new Map();
function getNamedTexture(name) {
  const cached = _namedTextureCache.get(name);
  if (cached !== undefined) return cached;
  const factory = NAMED_TEXTURE_FACTORIES[name];
  if (!factory) {
    console.warn(`Neznámá pojmenovaná textura: "${name}"`);
    _namedTextureCache.set(name, null);
    return null;
  }
  const tex = factory();
  _namedTextureCache.set(name, tex);
  return tex;
}

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
// Memoizační cache materiálů (sez. 28 — `feat/terrain-perf`). Před cache
// vytvářel každý TCUBES/ramp 6× nový `MeshStandardMaterial` — při 30×30 terénu
// to znamenalo ~16000 alokací per regen (drahé GC + GPU state spam mezi
// stejně-vypadajícími objekty). Po cache cca ~30 unikátů (4 surfaces × ~6 faces).
//
// Klíč: stringifikace `val`. Stejná `val` = stejný materiál = renderer batches
// dle reference rovnosti = výrazně méně state changes. Hover (sez. 16) klonuje
// per-mesh (`mat.clone()`), takže sdílený materiál se neporuší — klony jsou
// nezávislé kopie.
//
// `null` má vlastní bucket (`"__null__"`), aby šel rozlišit od stringu `"null"`.
//
// === 3 paralelní material cache (F6 doc komentář) ===========================
// V projektu žije **`_faceMaterialCache`** — slow path, klíč = stringifikace
// `val` (per-face atribut: barva / `:name` / emoji). 1 materiál = 1 strana
// voxelu, mesh dostane `material[6]` array. Fallback pro non-terrain TCUBES,
// PATH, water plane, COMPOSITES boxy, CCUBES default šachovnice (DD-07).
//
// Historicky paralelně existovaly i `_tcubesAtlasMatCache` (DD-36 TCUBES atlas)
// a `_rampsAtlasMatCache` (DD-36 ramp atlas) — obě smazány v DD-41 (sez. 34,
// lowpoly vertex-color refactor). Lowpoly pipeline drží 1 sdílený `_lowpolyMat`
// napříč všemi terrain batchi, žádná per-kind cache potřeba.
const _faceMaterialCache = new Map();

function faceMaterialFor(val) {
  const key = val == null ? "__null__" : (typeof val === "number" ? `0x${val.toString(16)}` : val);
  const cached = _faceMaterialCache.get(key);
  if (cached) return cached;

  let mat;
  if (val == null) {
    mat = new THREE.MeshStandardMaterial({ map: checkerboardTexture });
  } else if (typeof val === "number") {
    mat = new THREE.MeshStandardMaterial({ color: val });
  } else if (typeof val === "string") {
    // Prefix `:` značí pojmenovanou sdílenou texturu (Minecraft-style).
    if (val.startsWith(":")) {
      const tex = getNamedTexture(val);
      mat = new THREE.MeshStandardMaterial({ map: tex ?? checkerboardTexture });
    } else if (/^#[0-9a-f]{3,8}$/i.test(val)) {
      // `#rrggbb` → Three.js Color parse (stejné jako number). Test přes regex,
      // aby např. `"red"` prošlo stejnou cestou (pojmenované CSS barvy).
      mat = new THREE.MeshStandardMaterial({ color: val });
    } else {
      // Jinak canvas s textem / emoji
      mat = new THREE.MeshStandardMaterial({ map: makeEmojiTexture(val) });
    }
  } else {
    // Neznámý typ → fallback (defensive; model by neměl dodat nic jiného)
    mat = new THREE.MeshStandardMaterial({ map: checkerboardTexture });
  }

  _faceMaterialCache.set(key, mat);
  return mat;
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
// `_dir` a `_a` jsou pracovní buffery, spotřebované v rámci jednoho volání
// a hned přepsané dalším. Pattern „scratch vectors" je standard v Three.js
// animacích — vyhýbá se GC pressure v 60 FPS smyčce.
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _a = new THREE.Vector3();

// Fáze harmonické oscilace: převod wall-clock `t` (sekundy) na argument pro
// `Math.sin`. `period` = doba jednoho kompletního kmitu v sekundách,
// `offset` = fázový posun v radiánech (π/2 posune sinus na kosinus).
function oscPhase(t, period, offset = 0) {
  return (TAU * t) / period + offset;
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

  // `_dir` = cíl − střed bubliny (scratch vektor, viz `_up`/`_dir`/`_a` výše)
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
// Sez. 24 cleanup: FACTORY TOY ENGINE smazán (DD-32 pivot).


// === Vizualizační dispatch: instance → Three.js Object3D ===
// Podle konkrétní třídy instance rozhodujeme, jaký vizuál sestrojit.
// `instanceof` testuje řetěz dědičnosti. Pořadí větví je důležité:
// specifické třídy před obecnými.
//
// Model/engine separation: tady je jediné místo, kde je vazba
// "třída → vizuál" — model.js nezná Three.js vůbec. Viz DD-11.
//
// Pozice (DD-12): voxelové potomky (CCUBES, TCUBES) snap-to-grid
// přes Math.round — brání z-fightingu mezi sousedícími kostkami.
// Nevoxelové (SPRITES) dostanou spojitou float pozici.
function createMeshFor(instance) {
  let object3d;

  if (instance instanceof PATH) {
    // 1D křivka (DD-25 vrstva 3 Linie) — strip mesh sledující POINTS.
    object3d = createPathFor(instance);
  } else if (instance instanceof LAMP) {
    // Pouliční lampa — sloupek + svítící hlava + PointLight. Group, float pozice.
    object3d = buildLamp(instance);
  } else if (instance instanceof DECOR) {
    // Krajinná dekorace (strom/keř/kámen/tráva) — Group s procedurálním obsahem
    // dle `instance.KIND` lookup v `DECOR_BUILDERS` (DD-49). Float pozice.
    object3d = createDecor(instance);
  } else if (instance instanceof SPRITES) {
    // 2D billboard — obrázek vždy otočený ke kameře. Nevoxelový potomek,
    // pozice float bez snap-to-grid.
    object3d = createSpriteFor(instance);
  } else if (instance instanceof TCUBES) {
    // Voxel s lowpoly vertex-color paletou (DD-41). Snap-to-grid.
    // Pozn.: Terrain TCUBES jdou batch path (DD-37 InstancedMesh), createMeshFor
    // slouží pro single-spawn mimo terrain (dev/test).
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
      //
      // Sez. 44 Fáze 6 add — paralelní `noReceiveShadow` opt-out (cast zachováno,
      // jen receive vypnuto). Použito pro DECOR (DD-49 spec): krajinná dekorace
      // vrhá stín na zem, ale sama nestíní okolními objekty (marginal perf save
      // — listový/keřový mesh = mnoho fragmentů × shadow sampling per fragment;
      // visual loss zanedbatelný, koruny stromů jsou facetované lowpoly, ne
      // smooth surface kde by stínování bylo čitelné).
      if (!child.userData.noShadow) {
        child.castShadow = true;
        child.receiveShadow = !child.userData.noReceiveShadow;
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
  // G0 (sez. 34, DD-41): lowpoly vertex-color pipeline. Pokud `instance.NAME`
  // je známý terrain kind (`BLOCK_COLORS[kind]`), použij sdílený per-kind
  // lowpoly geom + `_lowpolyMat`. Jinak fallback šachovnice (DD-07, „neznámý kind").
  const lowpolyGeom = getTcubesKindGeom(instance.NAME);
  if (lowpolyGeom) {
    const mesh = new THREE.Mesh(lowpolyGeom, _lowpolyMat);
    snapToGrid(mesh, instance);
    return mesh;
  }
  // Fallback — sdílený šachovnicový materiál z `_faceMaterialCache` (null key).
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), faceMaterialFor(null));
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
// 5 faces se single-material atlas mapováním (DD-36):
//   BOTTOM  quad (v0,v3,v2,v1) na Y=−0.5,  normála (0,−1, 0)
//   BACK    quad (v0,v1,v5,v4) na Z=−0.5,  normála (0, 0,−1)  vertikální stěna
//   SLOPE   quad (v3,v2,v5,v4) šikmá,      normála (0, 1, 1)/√2  svah
//   LEFT    triangle (v0,v4,v3) na X=−0.5, normála (−1,0,0)
//   RIGHT   triangle (v1,v2,v5) na X=+0.5, normála ( 1,0,0)
//
// Per-face vertices (non-shared) → flat shading bez `computeVertexNormals`
// (každá face má vlastní normály = ostré hrany mezi facey, pixel-art look).
// Celkem 18 vertices, 8 trojúhelníků, **1 atlas material** (DD-36 pattern):
// per-face vertices non-shared = lowpoly flat look. UV attribute zachován
// pro historickou kompatibilitu, `getRampGeom` (DD-41) ho stripuje v clone
// a doplňuje per-face vertex colors z `BLOCK_COLORS` palety.

const TRRAMP_FACE_COUNT = 5;
const TRRAMP_GEOM_CACHE = (() => {
  const SQRT2 = Math.SQRT2;
  const N = TRRAMP_FACE_COUNT;
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

  // Atlas UV remap: face k → U ∈ [k/N, (k+1)/N]. Vstupní `uv*` je v lokálním
  // [0..1] frame face, výsledek je posunut + zmenšen do atlas slotu k.
  function remapU(uv, faceIdx) {
    return [faceIdx / N + uv[0] / N, uv[1]];
  }

  // Helper: přidá quad (4 vertices, 2 trojúhelníky) s jednou normálou per face.
  // CCW pořadí pro správnou face culling (Three.js front-face = CCW).
  // `faceIdx` slouží jen k remap UV — geometrie je single-material (no groups).
  function addQuad(p0, p1, p2, p3, n, uv0, uv1, uv2, uv3, faceIdx) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    uvs.push(...remapU(uv0, faceIdx), ...remapU(uv1, faceIdx),
            ...remapU(uv2, faceIdx), ...remapU(uv3, faceIdx));
    indices.push(startVert, startVert + 1, startVert + 2);
    indices.push(startVert, startVert + 2, startVert + 3);
  }

  function addTri(p0, p1, p2, n, uv0, uv1, uv2, faceIdx) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...remapU(uv0, faceIdx), ...remapU(uv1, faceIdx), ...remapU(uv2, faceIdx));
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // Pořadí faceIdx (musí ladit s `RAMP_FACE_VERT_COUNTS.trramps` v G0b
  // lowpoly builderu pro per-face vertex color mapping):
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
  return geom;
})();

// === TTRAMPS — Trojboký jehlan (trirectangular tetrahedron) =================
//
// 1C blok s 4 vrcholy: roh `C` v lokálním (-0.5, -0.5, -0.5) + 3 axiální body
// na koncích hran délky 1 podél +X, +Y, +Z. SLOPE = rovnostranný trojúhelník
// mezi 3 axiálními body (hrana √2). 3 perpendicular faces leží v rovinách
// X=−0.5 (LEFT), Y=−0.5 (BOTTOM), Z=−0.5 (BACK), všechny pravoúhlé trojúhelníky
// se sdíleným pravým úhlem v rohu C.
//
// 4 faces × 3 vertices (per-face non-shared) = 12 vertices, 4 trojúhelníky.
// Vertex colors per face řízeny `BLOCK_COLORS` + `RAMP_FACE_PALETTE_KEYS`
// v G0b lowpoly builderu (`getRampGeom("ttramps", surface)`).

const TTRAMP_FACE_COUNT = 4;
const TTRAMP_GEOM_CACHE = (() => {
  const SQRT3 = Math.sqrt(3);
  const N = TTRAMP_FACE_COUNT;
  // 4 unique vertex pozice (lokálně, 1C blok centered v origin).
  const C = [-0.5, -0.5, -0.5];  // sdílený roh 3 perpendicular faces
  const X = [ 0.5, -0.5, -0.5];  // konec +X hrany
  const Y = [-0.5,  0.5, -0.5];  // konec +Y hrany (apex top)
  const Z = [-0.5, -0.5,  0.5];  // konec +Z hrany

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function remapU(uv, faceIdx) {
    return [faceIdx / N + uv[0] / N, uv[1]];
  }

  function addTri(p0, p1, p2, n, uv0, uv1, uv2, faceIdx) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...remapU(uv0, faceIdx), ...remapU(uv1, faceIdx), ...remapU(uv2, faceIdx));
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // Pořadí faceIdx (musí ladit s `RAMP_FACE_VERT_COUNTS.ttramps` v G0b
  // lowpoly builderu pro per-face vertex color mapping):
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
  return geom;
})();

// === TDRAMP — Diagonální rampa (1C blok bez jednoho horního rohu) ===========
//
// DD-35 kandidát (sez. 26). Krychle 1×1×1 minus tetrahedron na 1 horním rohu
// = 7-vrcholový polyhedron. Vyhladí **3-cell convex peak** stepu (A má 2
// sousední direct vyšší + diagonální peak vyšší) jediným meshem.
//
// Vertices v lokálních souřadnicích (default ORIENTATION=0, low corner NW):
//   v0 (-0.5, -0.5, -0.5)  bottom NW   (low corner)
//   v1 ( 0.5, -0.5, -0.5)  bottom NE
//   v2 ( 0.5, -0.5,  0.5)  bottom SE
//   v3 (-0.5, -0.5,  0.5)  bottom SW
//   v4 ( 0.5,  0.5, -0.5)  top NE
//   v5 ( 0.5,  0.5,  0.5)  top SE        (peak corner)
//   v6 (-0.5,  0.5,  0.5)  top SW
//   (NW_top chybí — odříznutý roh)
//
// 7 faces se 5 material groups:
//   0 SLOPE      — triangle (v0, v6, v4)         diagonální slope NW→NE-SW hrana
//   1 TOP        — triangle (v6, v5, v4)         plochá horní podstava
//   2 BOTTOM     — quad     (v0, v1, v2, v3)     čtvercová podstava
//   3 WALL_FULL  — 2 quads  (E: v1,v4,v5,v2)     plné svislé stěny (peak side)
//                           (S: v2,v5,v6,v3)
//   4 WALL_TRI   — 2 trojúhelníky                šikmé svislé stěny (low side)
//                  (N: v0, v4, v1)
//                  (W: v0, v3, v6)
//
// SLOPE + TOP sdílí lomenou hranu v4-v6 → vizuálně 1 lomený povrch („dvěma
// trojúhelníky" — uživatel sez. 26).
//
// Per-face vertices (non-shared) — flat shading bez computeVertexNormals.

// Single-material atlas (DD-36) — 7 face × 5 unique texture keys (WALL_FULL je
// na 2 sousedních quadech E+S, WALL_TRI na 2 sousedních triích N+W → sdílí
// stejný atlas slot). Atlas má 5 slotů, UV remap na 1/5-tici v U-axis.
const TDRAMP_FACE_COUNT = 5;
const TDRAMP_GEOM_CACHE = (() => {
  const N = TDRAMP_FACE_COUNT;
  const v0 = [-0.5, -0.5, -0.5];
  const v1 = [ 0.5, -0.5, -0.5];
  const v2 = [ 0.5, -0.5,  0.5];
  const v3 = [-0.5, -0.5,  0.5];
  const v4 = [ 0.5,  0.5, -0.5];
  const v5 = [ 0.5,  0.5,  0.5];
  const v6 = [-0.5,  0.5,  0.5];

  const SQRT3 = Math.sqrt(3);

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function remapU(uv, faceIdx) {
    return [faceIdx / N + uv[0] / N, uv[1]];
  }

  function addQuad(p0, p1, p2, p3, n, uv0, uv1, uv2, uv3, faceIdx) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    uvs.push(...remapU(uv0, faceIdx), ...remapU(uv1, faceIdx),
            ...remapU(uv2, faceIdx), ...remapU(uv3, faceIdx));
    indices.push(startVert, startVert + 1, startVert + 2);
    indices.push(startVert, startVert + 2, startVert + 3);
  }
  function addTri(p0, p1, p2, n, uv0, uv1, uv2, faceIdx) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    uvs.push(...remapU(uv0, faceIdx), ...remapU(uv1, faceIdx), ...remapU(uv2, faceIdx));
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // SLOPE — diagonální šikmá plocha. Normála (−1, +1, −1)/√3 → ven k NW-up.
  // UV: low corner v0 = (0.5, 0), high edge v6 = (0, 1), v4 = (1, 1).
  addTri(
    v0, v6, v4,
    [-1 / SQRT3, 1 / SQRT3, -1 / SQRT3],
    [0.5, 0], [0, 1], [1, 1],
    0,
  );

  // TOP — plochý trojúhelník na Y=+0.5. CCW (v6, v5, v4) dává +Y normálu.
  // UV: v6 (NW-most of triangle) = (0, 0), v5 (peak SE) = (1, 1), v4 = (1, 0).
  addTri(
    v6, v5, v4,
    [0, 1, 0],
    [0, 0], [1, 1], [1, 0],
    1,
  );

  // BOTTOM — quad (v0, v1, v2, v3) na Y=−0.5. Stejné jako TRRAMPS.
  addQuad(
    v0, v1, v2, v3,
    [0, -1, 0],
    [0, 0], [1, 0], [1, 1], [0, 1],
    2,
  );

  // WALL_FULL E — quad (v4, v5, v2, v1) na X=+0.5. CCW pro +X normálu.
  // UV: top→bottom, N→S. v4 (top-N) = (0, 1), v5 (top-S) = (1, 1), v2 (bot-S) = (1, 0), v1 (bot-N) = (0, 0).
  addQuad(
    v4, v5, v2, v1,
    [1, 0, 0],
    [0, 1], [1, 1], [1, 0], [0, 0],
    3,
  );

  // WALL_FULL S — quad (v5, v6, v3, v2) na Z=+0.5. CCW pro +Z normálu.
  // UV: v5 (top-E) = (1, 1), v6 (top-W) = (0, 1), v3 (bot-W) = (0, 0), v2 (bot-E) = (1, 0).
  addQuad(
    v5, v6, v3, v2,
    [0, 0, 1],
    [1, 1], [0, 1], [0, 0], [1, 0],
    3,
  );

  // WALL_TRI N — triangle (v0, v4, v1) na Z=−0.5. Pravoúhlý, normála (0,0,−1).
  // UV: v0 (bot-W) = (0, 0), v4 (top-E, apex) = (1, 1), v1 (bot-E) = (1, 0).
  addTri(
    v0, v4, v1,
    [0, 0, -1],
    [0, 0], [1, 1], [1, 0],
    4,
  );

  // WALL_TRI W — triangle (v0, v3, v6) na X=−0.5. Pravoúhlý, normála (−1,0,0).
  // UV: v0 (bot-N) = (0, 0), v3 (bot-S) = (1, 0), v6 (top-S, apex) = (1, 1).
  addTri(
    v0, v3, v6,
    [-1, 0, 0],
    [0, 0], [1, 0], [1, 1],
    4,
  );

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals,   3));
  geom.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs,       2));
  geom.setIndex(indices);
  return geom;
})();


// Sestaví 2D billboard pro SPRITES instanci. Vrací `THREE.Sprite` — speciální
// Three.js objekt, který se sám stará o to, aby byl vždy otočený ke kameře
// (tzv. billboard). Nepotřebuje per-frame `lookAt(camera)`, projekce se řeší
// v shaderu. Pozice je float bez snap-to-grid (DD-12).
//
// Interpretace atributu `ASSET`:
//  - `null` / nezadáno → šachovnicový billboard (fallback DD-07).
//  - `string` → text vykreslený přes `makeBubbleTexture` jako dialog bubble.
//
// === buildLamp — pouliční lampa (LAMP COMPOSITES) ===
// Victorian-style: vertikální sloup + horizontální paže + visící stínítko +
// SpotLight uvnitř stínítka mířící kuželem dolů. Pozice float (DD-12, COMPOSITES
// nedělá snap-to-grid). Rotace celé Group kolem Y z `instance.ORIENTATION`.
//
// SpotLight místo PointLight: kuželové světlo svítí jen dolů → sloup ani paže
// neblokují vlastní paprsky (PointLight 360° měl tmu pod lampou kvůli sloupu).
// `decay = 2` physically-correct (default r155+), proto vyšší intensity (5).
// Shadow ano (512×512 cube map, bias -0.002 proti acne). Pro budoucí scaling
// (~10+ lamp) zvážit `castShadow = false` na sekundárních lampách.
function buildLamp(instance) {
  const group = new THREE.Group();

  // Sdílený kovový materiál pro sloup + paži (DRY, jedna instance).
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });

  // === Sloup === — vertikální, 2 j vysoký, tenký (10×10 cm v real-world units).
  const poleGeom = new THREE.BoxGeometry(0.15, 2.0, 0.15);
  const pole = new THREE.Mesh(poleGeom, ironMat);
  pole.position.y = 1.0; // střed sloupu (origin = geometry center)
  group.add(pole);

  // === Horizontální paže === — vyčnívá z vrcholu sloupu ve směru +X (relativní;
  // ORIENTATION otáčí celou Group). Tenká, 0.6 j dlouhá.
  const armGeom = new THREE.BoxGeometry(0.6, 0.08, 0.08);
  const arm = new THREE.Mesh(armGeom, ironMat);
  arm.position.set(0.3, 1.95, 0); // X=0.3 = střed paže (0.6/2), Y=1.95 = horní hrana sloupu
  group.add(arm);

  // === Stínítko === — visí z konce paže (X=0.6). Tmavé z venku, oranžově
  // emissive zevnitř (i v poledne svítí vlastním jasem, kontrast s šerem).
  const shadeGeom = new THREE.BoxGeometry(0.35, 0.3, 0.35);
  const shadeMat  = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    emissive: 0xffaa00,
    emissiveIntensity: 0.8,
  });
  const shade = new THREE.Mesh(shadeGeom, shadeMat);
  shade.position.set(0.6, 1.7, 0); // konec paže, mírně níž (visí pod paží)
  // SpotLight je uvnitř stínítka — kdyby stínítko castovalo stín, blokovalo by
  // vlastní světlo dolů. `noShadow` říká traverzi v `createMeshFor` opt-out.
  shade.userData.noShadow = true;
  group.add(shade);

  // === SpotLight === — kuželové oranžové světlo dolů.
  // Args: (color, intensity, distance, angle, penumbra, decay)
  //   intensity 5 — vyšší než PointLight verze, decay 2 quadratic fall-off
  //   distance 12 — za 12 j světla = 0
  //   angle π/5 ≈ 36° — středně široký kužel
  //   penumbra 0.4 — okraje kuželu měkce vyblednou (0=sharp, 1=full soft)
  //   decay 2 — physically-correct (default r155+)
  const light = new THREE.SpotLight(0xffaa00, 5, 12, Math.PI / 5, 0.4, 2);
  light.position.set(0.6, 1.7, 0); // ve stínítku
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far  = 14; // ≥ distance, aby stíny nestrihly
  light.shadow.bias = -0.002; // kompenzuje shadow acne
  group.add(light);

  // SpotLight.target = Object3D, kam svit směřuje. Musí být v scéně (Three.js
  // používá jeho world matrix). Přidáme do group → target rotuje s lampou
  // (ORIENTATION mate směr "dolů" relativní k lampě, ale fakticky pořád dolů,
  // protože target.Y < light.Y a rotace Y nehne s vertikálou).
  const target = new THREE.Object3D();
  target.position.set(0.6, -3, 0); // 4.7 j pod stínítkem
  group.add(target);
  light.target = target;

  // Pozice + rotace ze model instance. Group origin = pata sloupu v (X,Y,Z).
  group.position.set(instance.X, instance.Y, instance.Z);
  group.rotation.y = THREE.MathUtils.degToRad(instance.ORIENTATION);
  return group;
}

// === createDecor — krajinná dekorace (DECOR COMPOSITES, DD-49) =============
// Dispatch dle `instance.KIND` na builder v `DECOR_BUILDERS` (importovaný
// z `src/composites/builders.js`). Builder dostane prázdnou Group a vyplní
// ji procedurálně podle `{ seed: instance.SEED, scale: instance.SCALE }`.
//
// Pokud KIND neexistuje v lookup tabulce (typo, future-incompatible save),
// vrátíme prázdnou Group s warning v konzoli — žádný crash. Caller (createMeshFor)
// pak Group přidá do scény jako neviditelný placeholder.
//
// Pozice je float (DD-12, COMPOSITES nedělá snap-to-grid). ORIENTATION
// z COMPOSITES base třídy by se mohl použít, ale buildery už dělají vlastní
// Y rotaci (seed-based variace) — kombinace by se srážela. Pro teď ORIENTATION
// ignorujeme; pokud by vznikl use-case explicit „natoč strom takhle", builder
// by musel rozlišit „seeded random" vs. „explicit override".
function createDecor(instance) {
  const group = new THREE.Group();
  const builder = DECOR_BUILDERS[instance.KIND];
  if (builder) {
    builder(group, {
      seed:   instance.SEED,
      scale:  instance.SCALE,
      snowed: instance.SNOWED,  // builder dle flagu přebarví top element na SNOW_WHITE
      season: instance.SEASON,  // sez. 41 DD-50 — "autumn" → oak/bush listí LEAF_AUTUMN
      dead:   instance.DEAD,    // sez. 43 Fáze 6 — sušený strom v dry biomě (trunk-only)
    });
  } else {
    // KIND neznámý — log + prázdná Group. Diagnostic, ne fatal.
    console.warn(`DECOR: unknown KIND "${instance.KIND}" (id=${instance.ID})`);
  }
  // Sez. 44 Fáze 6 — receive shadow opt-out per DD-49 spec (decor je facetovaný
  // lowpoly, stínování na korunách stromů ani na keřích by stejně nebylo čitelné;
  // cast shadow ale zachováno = strom stále vrhá stín na zem). Flag se aplikuje
  // BEFORE globální traverze v `createMeshFor`, která čte `noReceiveShadow` a
  // přeskočí `receiveShadow = true` přiřazení.
  group.traverse((child) => {
    if (child.isMesh) child.userData.noReceiveShadow = true;
  });
  group.position.set(instance.X, instance.Y, instance.Z);
  return group;
}

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

  return group;
}

// === Terrain builder (DD-32, sez. 24; DD-41 lowpoly pipeline sez. 34) =======
// `generateTerrain` (src/terrain.js) vrátí { blocks, ramps }; `buildScene`
// spawne TCUBES + rampy do scény přes batch path (DD-37
// InstancedMesh). Lowpoly pipeline (DD-41) nahradila DD-36 atlas — barvy v
// `BLOCK_COLORS` mapě, vertex-color geometry, jeden sdílený `_lowpolyMat`.
//
// Důvod oproti atlasu (DD-36):
//   - Eliminuje tile pattern uvnitř kindu (DD-36 známé omezení) — solid color.
//   - Drop CanvasTexture + texture sampling overhead (Lambert vertex colors
//     = pure gouraud lookup z attribute).
//   - Lambert (no PBR) = lepší "tiny-world" estetika, žádný plast highlight.
//   - Připravuje G3 (climate-driven barvy) — barvy jsou data, ne textury.

// Per-kind 3-key paleta (TOP / BOTTOM / SIDE). Severská konvence (sez. 17):
// grass má jen vrch zelený, stěny a spodek = hnědá zem. Stone/sand/dirt jsou
// homogenní (BOTTOM/SIDE marginálně tmavší pro mikroshade rozdíl mezi sousedy).
const BLOCK_COLORS = {
  grass: { TOP: 0x6aaa3a, BOTTOM: 0x8a5e36, SIDE: 0x8a5e36 },
  dirt:  { TOP: 0x8a5e36, BOTTOM: 0x8a5e36, SIDE: 0x8a5e36 },
  stone: { TOP: 0x9a9a9a, BOTTOM: 0x8a8a8a, SIDE: 0x8a8a8a },
  sand:  { TOP: 0xe8d97a, BOTTOM: 0xd9c66a, SIDE: 0xd9c66a },
  // Snow varianty (sez. 38, DD-47): TOP=off-white (sníh leží na horních +
  // nekolmých plochách), BOTTOM/SIDE = base color (= "sníh seshora"). Pro
  // rampy `getRampGeom` automaticky mapuje SLOPE+TOP face na palette.TOP
  // (= white), BACK/LEFT/RIGHT/BOTTOM zachovají base. Off-white `0xf5f5f5`
  // místo pure `0xffffff` — čistá bílá by mohla být oslnivá při bright sun.
  grass_snow: { TOP: 0xf5f5f5, BOTTOM: 0x8a5e36, SIDE: 0x8a5e36 },
  dirt_snow:  { TOP: 0xf5f5f5, BOTTOM: 0x8a5e36, SIDE: 0x8a5e36 },
  stone_snow: { TOP: 0xf5f5f5, BOTTOM: 0x8a8a8a, SIDE: 0x8a8a8a },
  sand_snow:  { TOP: 0xf5f5f5, BOTTOM: 0xd9c66a, SIDE: 0xd9c66a },
};

// Sdílený material pro VŠECHNY terrain batche (TCUBES + rampy po G0b).
// `vertexColors: true` říká shaderu, ať čte barvy z `geometry.attributes.color`
// místo z `material.color`. MeshLambertMaterial = diffuse-only, bez PBR
// specular (lepší fit pro neotexturované voxely než MeshStandardMaterial).
//
// **`flatShading: false`** (= default) — záměrně NE flat shading. BoxGeometry
// i ramp BufferGeometries už mají per-face normály v `geometry.attributes.normal`
// (vertices nesdílené napříč faces), takže flat look vzniká z geom samotné.
// `flatShading: true` by nutilo shader spočítat per-face normálu z `dFdx/dFdy`
// derivatives v fragment shaderu — u **InstancedMesh** může na hraně mezi
// 2 sousedními instancemi normála drifovat (precision artifact), což generuje
// **tenké šedé/černé seam linky mezi sousedními voxely** (sez. 34 user nález).
// Při nižší intenzitě světla (DD-39 night) je kontrast seam vs. lit face větší,
// artifact je výraznější.
const _lowpolyMat = new THREE.MeshLambertMaterial({
  vertexColors: true,
});

// Per-kind BoxGeometry s pre-baked vertex colors. `BoxGeometry` má 24 vertices
// (4 per face × 6 faces) v pořadí faces: +X, −X, +Y, −Y, +Z, −Z (Three.js
// default). Per face všechny 4 vertices dostanou stejnou barvu = solid face.
// Cache klíč = kind, hodnota = sdílená geometrie (DD-37 InstancedMesh batch
// shareuje 1 geom per kind napříč všemi instancemi).
const _lowpolyBoxGeomCache = new Map();
const _tmpColor = new THREE.Color();  // scratch (no per-call alokace)
function getTcubesKindGeom(kind) {
  let cached = _lowpolyBoxGeomCache.get(kind);
  if (cached !== undefined) return cached;  // může být i `null` cached miss
  const palette = BLOCK_COLORS[kind];
  if (!palette) {
    _lowpolyBoxGeomCache.set(kind, null);
    return null;
  }
  const geom = new THREE.BoxGeometry(1, 1, 1);
  // BoxGeometry face order: 0=+X (E), 1=−X (W), 2=+Y (TOP), 3=−Y (BOTTOM),
  // 4=+Z (S), 5=−Z (N). SIDE je 4× stejná (E/W/N/S) — severská konvence.
  const faceHex = [
    palette.SIDE,   // +X
    palette.SIDE,   // −X
    palette.TOP,    // +Y
    palette.BOTTOM, // −Y
    palette.SIDE,   // +Z
    palette.SIDE,   // −Z
  ];
  // 24 verts × 3 channels = 72 floats. Vertex colors interpretované v linear
  // space (renderer výstup je sRGB), proto sRGB hex → linear convert per kanál.
  const colorArr = new Float32Array(24 * 3);
  for (let face = 0; face < 6; face++) {
    _tmpColor.setHex(faceHex[face]);
    _tmpColor.convertSRGBToLinear();
    for (let v = 0; v < 4; v++) {
      const idx = (face * 4 + v) * 3;
      colorArr[idx + 0] = _tmpColor.r;
      colorArr[idx + 1] = _tmpColor.g;
      colorArr[idx + 2] = _tmpColor.b;
    }
  }
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colorArr, 3));
  _lowpolyBoxGeomCache.set(kind, geom);
  return geom;
}

// === G0b Ramp vertex-color pipeline (sez. 34) ===============================
// Izomorfně s `getTcubesKindGeom`: per (typ, surface) clone existující ramp
// atlas geom (TRRAMP/TTRAMP/TDRAMP_GEOM_CACHE), strip UV, inject color
// attribute. Atlas IIFE-cache zůstává jako "raw geom source" — cleanup
// fáze G0 smaže jen atlas **materiály + texture tabulky**, geom IIFE může
// zůstat (raw positions/normals/indices stále potřeba). Cleanup nice-to-have:
// strip UV at source + rename na `_RAMP_RAW_GEOM_*` (delegováno na cleanup commit).
//
// Per-typ vertex count per **logical face group** (matching faceIdx v IIFE
// `addTri/addQuad`). TDRAMP má 7 fyzických faces ve 5 color groups (WALL_FULL =
// 2 quads × 4v = 8, WALL_TRI = 2 tris × 3v = 6).
const RAMP_FACE_VERT_COUNTS = {
  trramps: [4, 4, 4, 3, 3],   // [SLOPE, BOTTOM, BACK, LEFT, RIGHT]
  ttramps: [3, 3, 3, 3],      // [SLOPE, BOTTOM, BACK, LEFT]
  tdramp:  [3, 3, 4, 8, 6],   // [SLOPE, TOP, BOTTOM, WALL_FULL, WALL_TRI]
};

// Per faceIdx mapuje na klíč v `BLOCK_COLORS[surface]` paletě. SLOPE/TOP =
// `.TOP` (vrchní barva kindu — grass zelená, ostatní matching kind), BOTTOM =
// `.BOTTOM`, ostatní stěny = `.SIDE`. TDRAMP SLOPE+TOP sdílí `.TOP` (vizuálně
// 1 lomený povrch — DD-35 sez. 26).
const RAMP_FACE_PALETTE_KEYS = {
  trramps: ["TOP", "BOTTOM", "SIDE", "SIDE", "SIDE"],
  ttramps: ["TOP", "BOTTOM", "SIDE", "SIDE"],
  tdramp:  ["TOP", "TOP",    "BOTTOM", "SIDE", "SIDE"],
};

// Cache `${type}:${surface}` → BufferGeometry. 3 typy × 3 surfaces = max 9 entries.
const _lowpolyRampGeomCache = new Map();
function getRampGeom(type, surface) {
  const cacheKey = `${type}:${surface}`;
  let cached = _lowpolyRampGeomCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const palette     = BLOCK_COLORS[surface];
  const vertCounts  = RAMP_FACE_VERT_COUNTS[type];
  const paletteKeys = RAMP_FACE_PALETTE_KEYS[type];
  const atlasGeom   = type === "trramps" ? TRRAMP_GEOM_CACHE
                    : type === "ttramps" ? TTRAMP_GEOM_CACHE
                    : type === "tdramp"  ? TDRAMP_GEOM_CACHE
                    : null;
  if (!palette || !vertCounts || !paletteKeys || !atlasGeom) {
    _lowpolyRampGeomCache.set(cacheKey, null);
    return null;
  }
  const geom = atlasGeom.clone();
  geom.deleteAttribute("uv");  // vertex colors nahrazují atlas texturu
  const totalVerts = vertCounts.reduce((a, b) => a + b, 0);
  const colorArr = new Float32Array(totalVerts * 3);
  let vertOffset = 0;
  for (let face = 0; face < vertCounts.length; face++) {
    _tmpColor.setHex(palette[paletteKeys[face]]);
    _tmpColor.convertSRGBToLinear();  // sRGB → linear (parita s getTcubesKindGeom)
    for (let v = 0; v < vertCounts[face]; v++) {
      const idx = (vertOffset + v) * 3;
      colorArr[idx + 0] = _tmpColor.r;
      colorArr[idx + 1] = _tmpColor.g;
      colorArr[idx + 2] = _tmpColor.b;
    }
    vertOffset += vertCounts[face];
  }
  geom.setAttribute("color", new THREE.Float32BufferAttribute(colorArr, 3));
  _lowpolyRampGeomCache.set(cacheKey, geom);
  return geom;
}

function createBlock(kind, x, y, z) {
  return new TCUBES(
    `terrain_${kind}_${x}_${y}_${z}`,
    kind,
    x, y, z,
    `TCUBES — terrain ${kind} blok (generateTerrain).`,
  );
}

// Vodní + ledové plane(y) — sdílené materiály (DRY, jeden mat per stav).
// Voda: transparent 0.55, mírná reflexe (metalness 0.2, roughness 0.25), modrá.
// Led: transparent 0.85 (větší zákal), nízká reflexe (metalness 0.05, roughness
// 0.55 = matnější), světle modro-bílá. User feedback sez. 38: led má **menší
// reflexi a větší zákal** než voda.
// Vrácené sez. 38 jako LIQUID prototype (= flood-fill basin entity, ne biome
// surface DD-47 dropped pattern). Reference k post-DD-47 entitě v IDEAS.md.
const _waterMat = new THREE.MeshStandardMaterial({
  color:        0x3a7090,
  transparent:  true,
  opacity:      0.55,
  metalness:    0.20,
  roughness:    0.25,
  side:         THREE.DoubleSide,
});
const _iceMat = new THREE.MeshStandardMaterial({
  // Color shift bělejší (sez. 38 user feedback "led jemně zasněžený").
  // Lerp(0xc0d8e0, 0xffffff, ~0.4) = `0xd9e8ec` — světlejší modrobílá, snowy.
  color:        0xd9e8ec,
  transparent:  true,
  opacity:      0.85,
  metalness:    0.05,
  roughness:    0.55,
  side:         THREE.DoubleSide,
});
const _waterGeom = new THREE.PlaneGeometry(1, 1);

// Water wave animation (sez. 38, KISS): sinusová vertikální oscilace celé
// hladiny synchroně. Žádný shader / texture work. Ice meshe **neanimují**
// (rigid surface). Per-frame v `animate()` aplikuje na všechny meshe v
// `_waterMeshes` Set.
const WATER_WAVE_AMP    = 0.04;  // metrů (drobná vlnka, ne dramatic surge)
const WATER_WAVE_PERIOD = 9.0;   // s (klidný swell, sez. 38 user 3× pomalejší než původní 3 s)
const WATER_WAVE_OMEGA  = 2 * Math.PI / WATER_WAVE_PERIOD;
const _waterMeshes = new Set();  // jen non-frozen water; zase clear v regenerateScene

function createWaterPlane(w) {
  // `w.frozen` flag rozhoduje materiál: ice (polar all, temperate ~30 %) vs.
  // water (otherwise). Plane v rovině XZ po rotaci kolem X osy.
  const mesh = new THREE.Mesh(_waterGeom, w.frozen ? _iceMat : _waterMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(w.x, w.y, w.z);
  mesh.scale.set(w.w ?? 1, 1, w.d ?? 1);
  mesh.receiveShadow = true;
  // Water wave anim registrace: stash base Y + add do `_waterMeshes` Set.
  // Ice se ne-anim (rigid surface) — vynechán ze Setu.
  if (!w.frozen) {
    mesh.userData.waterBaseY = w.y;
    _waterMeshes.add(mesh);
  }
  return mesh;
}

// === Ramp dispatch (DD-34 kandidát, sez. 26; DD-41 lowpoly sez. 34) =========
// `generateTerrain` krok 5 vrací `ramps[]` se 2 kindy:
//   - "edge"   → TRRAMPS (klín) — primární přístupový ramp; volba směru
//                greedy s criticality, compatibility check proti sousedním
//                rampám (drop pokud dest má perpendikulární ramp = bok).
//   - "corner" → TTRAMPS (jehlan) — sekundární estetický ramp pro isolated
//                diag peak (A má 0 direct vyšších, ale diag corner vyšší
//                + oba direct sousedi rohu jsou na úrovni A). Vyhladí ostrý
//                rohový voxel; **není accessibility**, jen vyhlazení hrany.
//   - "diagonal" → TDRAMP — 1C blok bez 1 horního rohu pro 3-cell convex peak.
// Barvy SLOPE/TOP/sides řízeny `BLOCK_COLORS` + `RAMP_FACE_PALETTE_KEYS` v
// G0b lowpoly pipeline (viz `getRampGeom` výše). Sez. 17 severská konvence:
// vrch grass-top, jinak dirt — vyjádřeno přes `palette.TOP` vs. `palette.SIDE`.

// === Terrain InstancedMesh batches (sez. 31, DD-37) =========================
// Sez. 30 stress test 100×100: 47k draw calls @ FPS 7 (CPU bound). Atlas
// pipeline (DD-36) sjednotila geom + materiály, ale 1 `THREE.Mesh` = 1 draw
// call → strop. Tady mergujeme N instancí stejného (geom, atlas mat) páru do
// **1 `InstancedMesh`** = 1 draw call. Per-instance se liší jen matrix
// (`setMatrixAt`) a barva (`setColorAt`, hover tint).
//
// Klíč batch:
//   "tcubes:<kind>"     — TCUBES terrain (grass/dirt/stone/sand)
//   "trramps:<surface>" — TRRAMPS klín ramp (grass/stone/sand)
//   "ttramps:<surface>" — TTRAMPS jehlan ramp
//   "tdramp:<surface>"  — TDRAMP diagonal ramp
//
// Hodnota: `THREE.InstancedMesh` s rozšířeným `userData`:
//   .terrain          = true                     (regen filter)
//   .batchKey         = "tcubes:grass" atd.      (debug, dispose lookup)
//   .instancesByIdx   = [inst0, inst1, ...]      (raycaster: instanceId → model)
//
// `meshByInstance` po refactoru drží 2 tvary hodnot (discriminated union):
//   instance.ID → `{ batch, idx }`   pro terrain bloky/rampy (InstancedMesh)
//   instance.ID → `Object3D`         pro non-terrain (PATH, SPRITES, slow-path
//                                    TCUBES, water plane) — beze změny
const _terrainBatches = new Map();

// Hover tint pro instanceColor (multiplikuje albedo v shaderu). MeshStandardMaterial
// nepodporuje per-instance emissive v batchi bez custom shader; instanceColor
// multiplikace by sama jen ztmavovala (values 0..1). **Trik:** `Float32Array`
// buffer v `InstancedBufferAttribute` **nemá clamp** — values > 1.0 dávají
// overbright efekt (R=1.6 = R kanál albedo × 1.6 → projasní), funkčně blízko
// emissive boostu. Hodnoty zvoleny tak, aby výsledná barva přes většinu
// surfaců byla **sytá oranžová** (R boost, G mírný, B redukce).
const HOVER_TINT_COLOR = new THREE.Color(1.6, 0.8, 0.2);
const _batchColorWhite = new THREE.Color(1, 1, 1);

// Scratch objekty pro `compose` matice (žádné per-instance alokace).
const _batchPos    = new THREE.Vector3();
const _batchEuler  = new THREE.Euler();
const _batchQuat   = new THREE.Quaternion();
const _batchScale  = new THREE.Vector3(1, 1, 1);
const _batchMatrix = new THREE.Matrix4();

// Vytvoří fresh `InstancedMesh` s kapacitou `count`, registruje do scene a
// `_terrainBatches`. `batch.count` nastavíme **na 0** (i když Three.js volá
// constructor s `count`); plníme inkrementálně přes `pushInstanceToBatch`,
// na konci spawn loopu odpovídá skutečnému počtu vložených instancí.
function createTerrainBatch(key, geom, mat, capacity) {
  const batch = new THREE.InstancedMesh(geom, mat, capacity);
  batch.userData.terrain        = true;
  batch.userData.batchKey       = key;
  batch.userData.instancesByIdx = new Array(capacity);
  batch.castShadow              = true;
  batch.receiveShadow           = true;
  batch.count                   = 0;
  _terrainBatches.set(key, batch);
  scene.add(batch);
  return batch;
}

// Přidá instanci do batche. `rotY` v radiánech (0 pro TCUBES, ORIENTATION pro
// rampy). `setMatrixAt` zapíše do `instanceMatrix` Float32Array buffer;
// `setColorAt` lazy-alokuje `instanceColor` při prvním zápisu (white default).
function pushInstanceToBatch(batch, instance, x, y, z, rotY) {
  const idx = batch.count;
  _batchPos.set(x, y, z);
  _batchEuler.set(0, rotY, 0);
  _batchQuat.setFromEuler(_batchEuler);
  _batchMatrix.compose(_batchPos, _batchQuat, _batchScale);
  batch.setMatrixAt(idx, _batchMatrix);
  batch.setColorAt(idx, _batchColorWhite);
  batch.userData.instancesByIdx[idx] = instance;
  meshByInstance.set(instance.ID, { batch, idx });
  batch.count = idx + 1;
}

function createRampEdge(r) {
  return new TRRAMPS(
    `ramp_edge_${r.surface}_${r.x}_${r.y}_${r.z}`,
    `ramp_${r.surface}`,
    r.x, r.y, r.z, r.orientation,
    `TRRAMPS — edge ramp (${r.surface}) na step generovaného terénu.`,
  );
}

function createRampCorner(r) {
  return new TTRAMPS(
    `ramp_corner_${r.surface}_${r.x}_${r.y}_${r.z}`,
    `ramp_${r.surface}`,
    r.x, r.y, r.z, r.orientation,
    `TTRAMPS — corner ramp (${r.surface}) pro isolated diag peak.`,
  );
}

function createRampDiagonal(r) {
  return new TDRAMP(
    `ramp_diagonal_${r.surface}_${r.x}_${r.y}_${r.z}`,
    `ramp_${r.surface}`,
    r.x, r.y, r.z, r.orientation,
    `TDRAMP — diagonální rampa (${r.surface}) pro 3-cell convex peak.`,
  );
}

// Default parametry generátoru — UI panel `#terrainctrl` je přepíše.
// G3 (sez. 36, DD-44): `surfaces` driver-derived z `world.LATITUDE/HUMIDITY`
// (helper `surfacesForBiome` z terrain.js). TERRAIN_DEFAULTS proto `surfaces`
// nemá — `buildScene`/`regenerateScene` ho dohnají per call.
const TERRAIN_DEFAULTS = {
  size:   [10, 10],
  relief: 3,         // Rolling hills (anglický venkov)
  seed:   42,
};

// Spawne terrain z parametrů do scény. Sez. 31 InstancedMesh refactor:
// místo N `THREE.Mesh` per blok/ramp → 1 `InstancedMesh` per (geom, mat) pár.
// Sez. 38 DD-47: drop water surface kind + add snow varianty → batche
// rozšířeny na ~17 (4 base + 4 snow TCUBES + 9 ramp surface×type).
//
// 3-pass:
//   1) Pre-count instancí per batch klíč (pro alokaci kapacity).
//   2) Alokuj batchy — všechny terrain batche sdílí `_lowpolyMat`, geom je
//      per-kind (`getTcubesKindGeom`) nebo per (typ, surface) (`getRampGeom`).
//   3) Spawn instancí (`pushInstanceToBatch` plní matrix + barvu + map).
function spawnTerrain(params) {
  const terrain = generateTerrain(params);
  updateFogForSize(params.size[0], params.size[1]);

  // 1) Pre-count.
  const counts = new Map();  // batchKey → int
  for (const [kind] of terrain.blocks) {
    if (!BLOCK_COLORS[kind]) continue;  // unknown kind skip (slow path neexistuje pro terrain)
    const key = `tcubes:${kind}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const r of terrain.ramps ?? []) {
    const type = r.kind === "edge"     ? "trramps"
               : r.kind === "corner"   ? "ttramps"
               : r.kind === "diagonal" ? "tdramp"
               : null;
    if (!type) continue;
    counts.set(`${type}:${r.surface}`, (counts.get(`${type}:${r.surface}`) ?? 0) + 1);
  }

  // 2) Alokuj batchy s přesnou kapacitou.
  for (const [key, capacity] of counts) {
    const [type, surface] = key.split(":");
    let geom, mat;
    if (type === "tcubes") {
      // G0a (sez. 34): vertex-color pipeline — per-kind geom drží barvy v
      // color attribute, mat shared napříč všemi terrain batchi.
      geom = getTcubesKindGeom(surface);  // surface tady = kind (grass/dirt/stone/sand)
      mat  = _lowpolyMat;
    } else if (type === "trramps" || type === "ttramps" || type === "tdramp") {
      // G0b (sez. 34): per (type, surface) lowpoly ramp geom s vertex colors,
      // shared `_lowpolyMat` napříč všemi 9 (type×surface) batchi.
      geom = getRampGeom(type, surface);
      mat  = _lowpolyMat;
    }
    if (!geom || !mat) continue;
    createTerrainBatch(key, geom, mat, capacity);
  }

  // 3) Fill batches.
  for (const [kind, x, y, z] of terrain.blocks) {
    const batch = _terrainBatches.get(`tcubes:${kind}`);
    if (!batch) continue;
    const inst = createBlock(kind, x, y, z);
    pushInstanceToBatch(batch, inst, x, y, z, 0);  // TCUBES bez rotace
  }
  for (const r of terrain.ramps ?? []) {
    let inst, type;
    if      (r.kind === "edge")     { inst = createRampEdge(r);     type = "trramps"; }
    else if (r.kind === "corner")   { inst = createRampCorner(r);   type = "ttramps"; }
    else if (r.kind === "diagonal") { inst = createRampDiagonal(r); type = "tdramp"; }
    else continue;
    const batch = _terrainBatches.get(`${type}:${r.surface}`);
    if (!batch) continue;
    const rotY = (r.orientation ?? 0) * (Math.PI / 180);  // DD-26: stupně → rad
    pushInstanceToBatch(batch, inst, r.x, r.y, r.z, rotY);
  }

  // Flush GPU buffery (instanceMatrix vždy; instanceColor lazy-alokovaný v
  // pushInstanceToBatch přes setColorAt).
  for (const batch of _terrainBatches.values()) {
    batch.instanceMatrix.needsUpdate = true;
    if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
  }

  // Water plane(y) (sez. 38, post-DD-47 LIQUID prototype) — single-mesh per
  // water cell. `frozen` flag rozhoduje materiál (water vs. ice).
  // userData.terrain = true → flag pro regenerateScene cleanup.
  for (const w of terrain.water ?? []) {
    const mesh = createWaterPlane(w);
    mesh.userData.terrain = true;
    scene.add(mesh);
  }

  // Krajinná dekorace (sez. 40, DD-49) — DECOR instance per scatter entry.
  // `terrain.decorations[]` jsou raw plan z `decorate()`; tady z nich vytvoříme
  // DECOR modelové instance a scéna je přidá přes standardní `createMeshFor`
  // dispatch (DECOR větev → `createDecor` → `DECOR_BUILDERS[kind]`).
  // `userData.terrain = true` značí entry pro `regenerateScene` cleanup.
  let decorIdx = 0;
  for (const d of terrain.decorations ?? []) {
    // ID: `decor_NNNN` (4-mistné zero-pad). Unikátnost stačí v rámci jedné
    // scény (regenerateScene clearuje všechny entries). Hover infotip ho
    // ukáže, ale nezachovává mezi regen.
    const id = `decor_${String(decorIdx++).padStart(4, "0")}`;
    const name = d.kind;
    const instance = new DECOR(id, name, d.x, d.y, d.z, d.kind, d.seed, d.scale ?? 1.0, d.snowed === true, d.season ?? "summer", d.dead === true);
    const mesh = createMeshFor(instance);
    mesh.userData.terrain = true;
    scene.add(mesh);
  }

  // F12: shadow frustum dle aktuální size — bez updatu by stíny ostříhly
  // na ±8 (aktuální i 30×30 už mimo, 100×100 by drželo stíny v centrální 1/6).
  updateShadowFrustum(Math.max(params.size[0], params.size[1]));
}

// Vymaže staré terrain prvky ze scény (batchy + water single-mesh) a spawne
// nové dle `params`. Volaný z UI panelu `#terrainctrl` na `change` event
// slideru (rozhodnutí sez. 26: ne `input`, ne debounce, ne button — jeden
// regen per dotažení slideru).
//
// Cleanup `meshByInstance`:
//   - Batchy: každá entry `{ batch, idx }` se vyčistí podle `batch.userData.
//     instancesByIdx` (instanceId → instance map).
//   - Water: single-mesh entries čistíme přes `userData.instance` jako dřív.
//
// Dispose:
//   - `batch.dispose()` uvolní GPU buffery instanceMatrix + instanceColor.
//     Geometrii a materiál NEdisposovat (sdílené singletony — atlas mat
//     cache + shared geom cache, dispose by zničil ostatní spawny).
//   - Water `_waterGeom`/`_waterMat` taktéž sdílené, GC posbírá jen Mesh.
function regenerateScene(params) {
  // 1) Terrain batchy (InstancedMesh).
  for (const batch of _terrainBatches.values()) {
    for (let i = 0; i < batch.count; i++) {
      const inst = batch.userData.instancesByIdx[i];
      if (inst) meshByInstance.delete(inst.ID);
    }
    scene.remove(batch);
    batch.dispose();
  }
  _terrainBatches.clear();

  // 2) Single-mesh entries s `userData.terrain === true` (water + DECOR
  //    od sez. 40 DD-49). Water plane nemá `userData.instance` (nešel přes
  //    `createMeshFor`), DECOR Group ho má — pokud existuje, `meshByInstance`
  //    cleanup uvolní zombie reference.
  const staleEntries = scene.children.filter((c) => c.userData.terrain === true);
  for (const mesh of staleEntries) {
    scene.remove(mesh);
    disposeHoverClones(mesh);
    const inst = mesh.userData.instance;
    if (inst) meshByInstance.delete(inst.ID);
  }
  _waterMeshes.clear();  // wave anim Set sync — staré meshe jsou pryč

  spawnTerrain(params);
}

// Uvolnění klonovaných materiálů z lazy hover-clone-on-first-hover (single-mesh
// case v `setHoverHighlight`). Bez tohoto by se klony akumulovaly v GPU paměti
// při opakovaném `regenerateScene` (mesh remove sám nedrží GPU lifecycle).
// Sdílený originál (`hoverOrigMat`) nedispose — patří atlasu / sdílené factory.
function disposeHoverClones(root) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    const cloned = child.userData.hoverHotMat;
    if (!cloned) return;
    const mats = Array.isArray(cloned) ? cloned : [cloned];
    for (const mat of mats) mat.dispose?.();
    child.userData.hoverHotMat = null;
    child.userData.hoverOrigMat = null;
    child.userData.hoverInit = false;
  });
}
// Globální expose pro HTML panel `#terrainctrl` (inline script v index.html).
window.regenerateScene = regenerateScene;
// G1 (sez. 35) — helper pro dynamický clamp `#tc-relief` slideru dle MIN(sx,sz).
window.maxReliefForSize = maxReliefForSize;
// G2 (sez. 35) — biome matice 4×3 pro UI Climate sekci (display readout).
window.BIOME_NAMES = BIOME_NAMES;
// G3 (sez. 36, DD-44) — surface mix driver (12 buněk × 4 koef.) + helper
// pro UI controller (HTML inline IIFE volá při sestavování `readParams`).
window.BIOME_SURFACES = BIOME_SURFACES;
window.surfacesForBiome = surfacesForBiome;
// DD-47 (sez. 38) — snowSpec helper pro UI panel (`#terrainctrl` `readParams()`).
window.snowSpecForLatitude = snowSpecForLatitude;
// Sez. 38 LIQUID prototype — waterSpec helper (flood-fill voda dle climate).
window.waterSpecForClimate = waterSpecForClimate;
// Sez. 40 DD-49 — decorSpec helper + DECOR_DENSITY tabulka pro UI/dev.
window.decorSpecForClimate = decorSpecForClimate;
window.DECOR_DENSITY = DECOR_DENSITY;
// Sez. 40 DD-50 — SEASONS enum array pro UI (4 hodnoty pro slider lookup).
window.SEASONS = SEASONS;

function buildScene(scene) {
  // G3 (sez. 36, DD-44) — surfaces driver-derived z WORLD climate atributů.
  // Sez. 38 (DD-47) — plus snowSpec driver-derived z `world.LATITUDE`. UI
  // Climate slidery mutují `world.LATITUDE/HUMIDITY` (přes `window.settings`)
  // a regen-trigger volá `regenerateScene(readParams())` z HTML controlleru,
  // který oba parametry dohnají identicky z aktuálního WORLD stavu.
  // Sez. 40 (DD-49) — plus decorSpec driver-derived z (LATITUDE, HUMIDITY).
  // Sez. 40 (DD-50) — plus SEASON driver pro snowSpec.patchThreshold +
  // waterSpec.freezeRatio v temperate biomu.
  spawnTerrain({
    ...TERRAIN_DEFAULTS,
    surfaces:  surfacesForBiome(world.LATITUDE, world.HUMIDITY),
    snowSpec:  snowSpecForLatitude(world.LATITUDE, world.SEASON),
    waterSpec: waterSpecForClimate(world.LATITUDE, world.HUMIDITY, world.SEASON),
    decorSpec: decorSpecForClimate(world.LATITUDE, world.HUMIDITY, world.SEASON, world.DECOR_DENSITY_MULT),
  });
}

buildScene(scene);

// === Hover highlight (editor-like feedback) ===
// Při najetí kurzoru na CUBES-potomka (kromě SPRITES) se objekt nažlutle.
// Dva mechanismy podle toho, jak je instance reprezentována v `meshByInstance`:
//
//   (A) Batch case — `meshByInstance.get(ID) === { batch, idx }`.
//       Terrain bloky/rampy jsou sloučené v `InstancedMesh` (sez. 31, DD-37
//       kandidát). Hover přes `instanceColor` attribut: `setColorAt(idx, tint)`
//       multiplikuje albedo žlutým nádechem. Trade-off vs. emissive boost:
//       jemnější light efekt (multiplicative tint místo additive světélkování),
//       ale per-instance v 1 batchi = ~0 GPU overhead, zero allocation.
//
//   (B) Single-mesh case — `meshByInstance.get(ID) === THREE.Object3D`.
//       Non-terrain entity (PATH, slow-path TCUBES, water plane, budoucí
//       COMPOSITES) zůstávají single-mesh. Hover přes lazy clone-on-first-hover
//       (mutate emissive na klonovaném materiálu, sourozenci se sdíleným
//       originálem zůstanou nedotknuti).
//
// SPRITES skip: 2D billboardy s SpriteMaterial nemají emissive komponentu;
// KISS no-op.

const HOVER_EMISSIVE_HEX = 0x404020;  // single-mesh path: žluté světélkování (R=0x40, G=0x40, B=0x20)

function setHoverHighlight(instance, on) {
  if (!instance) return;
  if (instance instanceof SPRITES) return;
  const ref = meshByInstance.get(instance.ID);
  if (!ref) return;

  // (A) Batch case — discriminated union přes `.batch` property.
  if (ref.batch) {
    ref.batch.setColorAt(ref.idx, on ? HOVER_TINT_COLOR : _batchColorWhite);
    if (ref.batch.instanceColor) ref.batch.instanceColor.needsUpdate = true;
    return;
  }

  // (B) Single-mesh case — lazy clone-on-first-hover.
  const root = ref;
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
  // Pokud najedeme na stejnou instanci jako posledně, nepřerenderujeme obsah.
  // `lastHoveredInstance` se aktualizuje až po `showTooltip` v pointermove
  // handleru, takže tady reflektuje předchozí frame — přesně to, co chceme
  // jako diff check.
  if (lastHoveredInstance !== instance) renderTooltip(instance);
  // Offset 14 px od kurzoru, aby tooltip nepřekrýval samotný target
  tooltipEl.style.left = `${event.clientX + 14}px`;
  tooltipEl.style.top  = `${event.clientY + 14}px`;
  tooltipEl.style.display = "block";
}
function hideTooltip() { tooltipEl.style.display = "none"; }

// Resolve instance z raycast hitu — discriminated union:
//   - InstancedMesh hit: `hit.object.userData.instancesByIdx[hit.instanceId]`
//     (sez. 31 terrain batch). `instanceId` je per-hit int from Three.js.
//   - Single mesh hit: `hit.object.userData.instance` (legacy).
function resolveInstanceFromHit(hit) {
  const obj = hit.object;
  if (obj.isInstancedMesh && obj.userData.instancesByIdx) {
    return obj.userData.instancesByIdx[hit.instanceId] ?? null;
  }
  return obj.userData?.instance ?? null;
}

// mousemove handler → raycaster → infotip
canvas.addEventListener("pointermove", (event) => {
  // Převést pixel souřadnice kurzoru na normalized device coords (-1..+1)
  pointer.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Vyšleme paprsek z kamery přes kurzor a najdeme protnuté meshe
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  // První hit, který má rozluštitelnou instanci (batch nebo single-mesh).
  let firstHit = null;
  let firstInstance = null;
  for (const h of hits) {
    const inst = resolveInstanceFromHit(h);
    if (inst) { firstHit = h; firstInstance = inst; break; }
  }

  if (firstHit) {
    showTooltip(event, firstInstance);
    // Edge highlight: pokud jsme přešli na jinou instanci, vypni starý
    // overlay a zapni nový. Same-instance hover → nic (overlay už svítí).
    if (firstInstance !== lastHoveredInstance) {
      setHoverHighlight(lastHoveredInstance, false);
      setHoverHighlight(firstInstance, true);
      lastHoveredInstance = firstInstance;
    }
  } else {
    hideTooltip();
    setHoverHighlight(lastHoveredInstance, false);
    lastHoveredInstance = null;
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
  // Composer pracuje s vlastními off-screen targets; ty musí být zvětšené taky.
  composer.setSize(window.innerWidth, window.innerHeight);
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

// === Perf HUD throttle (sez. 28) ===
// Čteme `renderer.info` po každém render() a 1× za sekundu propisujeme do DOM.
// FPS = počet snímků mezi reporty / dobu mezi reporty (rolling, ne instant).
const _perfHud = {
  frameCount:  0,
  lastReport:  performance.now() / 1000,
  el: {
    fps:   document.getElementById("ph-fps"),
    calls: document.getElementById("ph-calls"),
    tri:   document.getElementById("ph-tri"),
    geom:  document.getElementById("ph-geom"),
  },
};

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
  // WORLD tick + sun derivace (DD-38, sez. 32) — DAY_SPEED inkrementuje DAY,
  // updateSun přepočítá pozici DirectionalLight + intensity + sunMesh.
  // updateAtmosphere lerpuje sky/fog/ambient podle stejné daylight křivky.
  updateWorldTime(dt);
  updateSun();
  updateAtmosphere();
  // Water wave anim (sez. 38, KISS): sinusová vertikální oscilace celé
  // hladiny napříč všemi non-frozen water meshes synchroně. 1 sin compute /
  // frame, pak Y update per mesh (žádná alokace).
  if (_waterMeshes.size > 0) {
    const wave = Math.sin(now * WATER_WAVE_OMEGA) * WATER_WAVE_AMP;
    for (const m of _waterMeshes) m.position.y = m.userData.waterBaseY + wave;
  }
  // Ocásky dialogových bublin: přepočítáme až **po** animátorech, aby jsme
  // četli aktuální `object3d.position` případných pohybujících se mluvčí
  // (tbox_0002 orbituje, …).
  updateBubbleTails();
  updateKeyboardCamera(dt);
  // DOF focus = vzdálenost kamera→target (= střed scény při OrbitControls).
  // BokehPass má `uniforms.focus` ve fragment shaderu; setujeme každý frame,
  // takže při zoom in/out se ostrá zóna posouvá s cílem.
  bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target);
  composer.render();

  // Perf HUD report 1×/s — `renderer.info.render.*` akumulované přes všechny
  // frames + composer passes mezi reporty (sez. 42 Krok 3 — `autoReset=false`).
  // Reportujeme **average per-frame** (= total / frameCount). `mat` field
  // smazán — `_faceMaterialCache` byl pre-DD-41 slow-path cache; po DD-41
  // lowpoly pipeline drží 1 sdílený `_lowpolyMat`, cache permanentně prázdná.
  _perfHud.frameCount++;
  if (now - _perfHud.lastReport >= 1.0) {
    const fps = _perfHud.frameCount / (now - _perfHud.lastReport);
    const callsAvg = renderer.info.render.calls / _perfHud.frameCount;
    const triAvg   = renderer.info.render.triangles / _perfHud.frameCount;
    _perfHud.el.fps.textContent   = fps.toFixed(0);
    _perfHud.el.calls.textContent = Math.round(callsAvg);
    _perfHud.el.tri.textContent   = Math.round(triAvg).toLocaleString("cs-CZ");
    _perfHud.el.geom.textContent  = renderer.info.memory.geometries;
    renderer.info.reset();  // start nové accumulation periody
    _perfHud.frameCount = 0;
    _perfHud.lastReport = now;
  }
}
animate();
