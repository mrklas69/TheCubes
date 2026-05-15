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
import { CUBES, CCUBES, TCUBES, TRRAMPS, TTRAMPS, TDRAMP, LAMP, DECOR, LIQUID, WORLD } from "./model.js";
import { DECOR_BUILDERS } from "./composites/builders.js";
import { generateTerrain, maxReliefForSize, BIOME_NAMES, BIOME_SURFACES, surfacesForBiome, snowSpecForLatitude, waterSpecForClimate, decorSpecForClimate, scatterWeightsForBiome, DECOR_DENSITY, SEASONS, mulberry32 } from "./terrain.js";
// Voxel surovinový model (DD-56, sez. 51) — RESOURCE_REGISTRY + V grid konstanty.
// `mulberry32` se importuje výš pro sdílený seeded RNG (scatter voxely).
import { RESOURCE_REGISTRY, RESOURCE_NAMES, VOXEL_GRID, VOXEL_EDGE } from "./resources.js";

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
// v 5× radiusu DirectionalLight. V noci (sun.position.y < SUN_HORIZON_Y_MIN)
// sunMesh.visible=false.
const SUN_DISTANCE_SCALE = 5;
// Threshold viditelnosti sun mesh pod obzorem (sez. 47, user request). Default
// scéna by hidla sun přesně na Y=0 (matematický horizon) — vizuálně „skokově
// zmizí" při sunset. Drží mesh visible do altitude angle -15° = sun mírně pod
// horizon, vidí se „za kopci" než zmizí úplně. Math: altitude = asin(y / SUN_
// DISTANCE), -15° → y = SUN_DISTANCE · sin(-15°) ≈ -0.259 · SUN_DISTANCE ≈ -4.21.
// DirectionalLight intensity = 0 (Math.max(0, negCosA)) v podstatě stejně držena
// — sun pod horizontem nesvítí, jen visible „za scénou" jako vizuální cue.
const SUN_HORIZON_Y_MIN = SUN_DISTANCE * Math.sin(THREE.MathUtils.degToRad(-15));

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

// HSL hue interpolation (sez. 45, DD-48 follow-up). Three.js Color má
// `.getHSL()` + `.setHSL()`, ale chybí native HSL lerp. RGB lerp pro orange↔blue
// prochází přes desaturovanou hnědou (purplish RGB midpoint má low S+L). HSL lerp
// drží S+L lineární, hue rotuje po shorter circular path → orange→blue ide přes
// purple (Rayleigh-correct dusk), místo přes hnědou.
// Shorter-path algoritmus: pokud |h2 - h1| > 0.5, wrap (přejdi přes 0/1 hranici).
// Pro hue 0.003 (orange) → 0.667 (blue): direct = +0.664 (přes green/cyan, špatně),
// wrap = -0.336 (přes magenta/purple, ✓). Default Three.js helper s tímhle nepočítá.
// Scratch objects pro zero alokace per-frame (volá se 4× per frame: 2× sun + 2× sky).
const _hslA = { h: 0, s: 0, l: 0 };
const _hslB = { h: 0, s: 0, l: 0 };
function _lerpHsl(target, a, b, t) {
  a.getHSL(_hslA);
  b.getHSL(_hslB);
  let dh = _hslB.h - _hslA.h;
  if (dh > 0.5) dh -= 1;
  else if (dh < -0.5) dh += 1;
  // `(x + 1) % 1` zaručí [0, 1) i pro záporné meziprůměry (JS % vrací záporky).
  const h = (_hslA.h + dh * t + 1) % 1;
  const s = _hslA.s + (_hslB.s - _hslA.s) * t;
  const l = _hslA.l + (_hslB.l - _hslA.l) * t;
  target.setHSL(h, s, l);
}

// SEASON tint deltas (DD-50 follow-up, sez. 47). Pattern „base × season modifier"
// — izomorfní s DECOR_DENSITY sezonním modifikátorem (sez. 43). Aplikuje se POST
// day/night lerp v `updateAtmosphere`/`updateSun`, scoped jen na LATITUDE=temperate
// (polar a tropical mají season-invariant snow/water spec, drží konzistenci).
//
// Subtle deltas (Q1=A, sez. 47): h ±0.005-0.025, s ×0.80-1.10, l ×0.95-1.03.
// Viditelné v summer↔winter porovnání, sotva v isolaci. Summer = baseline {0,1,1}
// (no-op, drží existing look). Pořadí čtyř enum vibe-driven: spring fresh +mírně
// teplé, autumn golden shift (víc saturace, mírně tmavší), winter cool +desatured
// +dimmer. Sun má vlastní (mírnější) sadu — sun = eye attracter (menší plocha,
// větší visual punch), plus na poledni sun=white → s mizí v desaturaci.
const SEASON_SKY_DELTA = {
  spring: { dh: -0.005, ms: 1.03, ml: 1.02 },
  summer: { dh:  0.000, ms: 1.00, ml: 1.00 },
  autumn: { dh: -0.025, ms: 1.10, ml: 0.98 },
  winter: { dh: +0.020, ms: 0.80, ml: 0.95 },
};
const SUN_SEASON_DELTA = {
  spring: { dh: +0.005, ms: 0.98, ml: 1.01 },
  summer: { dh:  0.000, ms: 1.00, ml: 1.00 },
  autumn: { dh: -0.015, ms: 1.05, ml: 0.99 },
  winter: { dh: +0.015, ms: 0.92, ml: 0.97 },
};
// In-place HSL shift na `color` podle `delta` ({dh, ms, ml}). Reuse `_hslA` scratch
// (zero alokace). `(h + dh + 1) % 1` wrap (JS % vrací záporky), s/l clamp do [0, 1]
// proti přetečení (např. baseline s=0.95 × ms=1.10 = 1.045 → clamp 1.0).
// Helper je season-agnostic — caller dodá delta z příslušné DELTA tabulky.
function _applyHslShift(color, delta) {
  color.getHSL(_hslA);
  const h = (_hslA.h + delta.dh + 1) % 1;
  const s = Math.min(1, Math.max(0, _hslA.s * delta.ms));
  const l = Math.min(1, Math.max(0, _hslA.l * delta.ml));
  color.setHSL(h, s, l);
}
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

// Plný kruh v radiánech — pojmenovaná konstanta, aby `world.DAY * TAU` šel
// číst jako „kolik radiánů odpovídá frakci dne" (DAY ∈ [0, 1), DAY · TAU dává
// úhel slunce na sférické dráze). Math.PI * 2 = 2π.
const TAU = Math.PI * 2;

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
  // HSL lerp (sez. 45, DD-48 follow-up) — `_lerpHsl` viz výše. Pro sun barvy
  // (warm peach → cream → white) je hue rotace minimální, ale držíme uniformní
  // pipeline napříč sun+sky lerps (DRY + izomorfně s `updateAtmosphere`).
  if (daylight < 0.5) {
    _lerpHsl(sun.color, _sunColorSunrise, _sunColorMid, daylight * 2);
  } else {
    _lerpHsl(sun.color, _sunColorMid, _sunColorNoon, (daylight - 0.5) * 2);
  }
  // SEASON tint post-lerp, jen pro temperate (sez. 47, DD-50 follow-up).
  // Mírnější deltas než sky (sun = eye attracter). Na poledni sun=white →
  // saturation modifier je no-op (white H undefined, S=0), hue shift se projeví
  // jen v dusk/sunrise fázi kdy sun má colored hue.
  if (world.LATITUDE === "temperate") {
    _applyHslShift(sun.color, SUN_SEASON_DELTA[world.SEASON] ?? SUN_SEASON_DELTA.summer);
  }
  // Sun mesh follow + skip render hluboko pod obzorem (sez. 47). Threshold
  // SUN_HORIZON_Y_MIN = -15° altitude (~-4.21 j) drží mesh visible krátce po
  // sunset/před sunrise — vyhne se „skokovému zmizení" na matematickém horizontu.
  sunMesh.position.copy(sun.position).multiplyScalar(SUN_DISTANCE_SCALE);
  sunMesh.visible = sun.position.y > SUN_HORIZON_Y_MIN;
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
// HSL lerp (sez. 45, DD-48 follow-up) přes `_lerpHsl` — pro `_skyDusk → _skyDay`
// (hue orange ~0.003 → blue ~0.667, diff > 0.5) wrap přes magenta/purple =
// Rayleigh-correct, místo RGB direct přes desaturovanou hnědou. Pro `_skyNight
// → _skyDusk` HSL≈RGB (black hue undefined, lerp drží S/L linear).
function updateAtmosphere() {
  const negCosA = -Math.cos(world.DAY * TAU);
  if (negCosA < 0) {
    _lerpHsl(scene.background, _skyNight, _skyDusk, negCosA + 1);
  } else {
    _lerpHsl(scene.background, _skyDusk, _skyDay, negCosA);
  }
  // SEASON tint post-lerp, jen pro temperate (sez. 47, DD-50 follow-up).
  // `sceneFog.color.copy()` níž automaticky picknе tintovanou barvu = fog
  // splývá s tintovaným nebem bez separátního volání.
  if (world.LATITUDE === "temperate") {
    _applyHslShift(scene.background, SEASON_SKY_DELTA[world.SEASON] ?? SEASON_SKY_DELTA.summer);
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
// Day/DaySpeed: mutují WORLD atributy; `updateSun()` se postará per-frame.
// Sun mesh visibility řeší `updateSun()` přes horizon threshold (sez. 47, sez. 48
// drop user override — auto-hide v noci stačí).
window.settings = {
  setDOF(on)      { bokehPass.enabled = on; },
  setFog(on)      { scene.fog = on ? sceneFog : null; },
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

// Sdílený fallback materiál pro neznámý TCUBES kind (= `NAME` mimo
// `BLOCK_COLORS` mapu). DD-07 šachovnice signalizuje „strana nevyplněná"
// vizuálně. Po sez. 49 K1 cleanup je toto jediná konzumace `checkerboardTexture`
// — atomic singleton (žádná dispatch flexibility, žádná cache).
const _checkerboardMat = new THREE.MeshStandardMaterial({ map: checkerboardTexture });

// Mapa instance.ID → Three.js Object3D. Plníme v `createMeshFor`; non-terrain
// entity (LAMP, DECOR, LIQUID, slow-path TCUBES) jdou single-mesh path, terrain
// TCUBES + rampy jsou v batch path (DD-37 InstancedMesh, discriminated union
// `{ batch, idx }` v Map). Lookup používá `setHoverHighlight`.
const meshByInstance = new Map();
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
// COMPOSITES (LAMP/DECOR) a LIQUID dostanou spojitou float pozici.
function createMeshFor(instance) {
  let object3d;

  if (instance instanceof LAMP) {
    // Pouliční lampa — sloupek + svítící hlava + PointLight. Group, float pozice.
    object3d = buildLamp(instance);
  } else if (instance instanceof DECOR) {
    // Krajinná dekorace (strom/keř/kámen/tráva) — Group s procedurálním obsahem
    // dle `instance.KIND` lookup v `DECOR_BUILDERS` (DD-49). Float pozice.
    object3d = createDecor(instance);
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
  object3d.userData.instance = instance;
  object3d.traverse((child) => {
    if (child.isMesh) {
      child.userData.instance = instance;
      // `noShadow` opt-out pro meshe, které jsou vizuální indikátory (THREE
      // default castShadow = false, stačí přeskočit). Sez. 44 Fáze 6 add —
      // paralelní `noReceiveShadow` opt-out: DECOR vrhá stín na zem, ale sama
      // nestíní okolními objekty (marginal perf save — listový/keřový mesh =
      // mnoho fragmentů × shadow sampling per fragment; visual loss zanedbatelný,
      // koruny stromů jsou facetované lowpoly).
      if (!child.userData.noShadow) {
        child.castShadow = true;
        child.receiveShadow = !child.userData.noReceiveShadow;
      }
    }
  });
  // Mapa pro rychlý lookup mesh-u podle instance ID — používá `setHoverHighlight`.
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

// Sestaví voxel pro TCUBES instanci. DD-41 (sez. 34): lowpoly vertex-color
// pipeline. Pokud `instance.NAME` je známý terrain kind (`BLOCK_COLORS[kind]`),
// použij sdílený per-kind lowpoly geom + `_lowpolyMat`. Jinak fallback
// šachovnice (DD-07, „neznámý kind") přes sdílený `_checkerboardMat`.
function createTCubeFor(instance) {
  const lowpolyGeom = getTcubesKindGeom(instance.NAME);
  if (lowpolyGeom) {
    const mesh = new THREE.Mesh(lowpolyGeom, _lowpolyMat);
    snapToGrid(mesh, instance);
    return mesh;
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), _checkerboardMat);
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
// 5 faces (DD-41 lowpoly vertex-color pipeline; sez. 48 D1 cleanup drop UV):
//   BOTTOM  quad (v0,v3,v2,v1) na Y=−0.5,  normála (0,−1, 0)
//   BACK    quad (v0,v1,v5,v4) na Z=−0.5,  normála (0, 0,−1)  vertikální stěna
//   SLOPE   quad (v3,v2,v5,v4) šikmá,      normála (0, 1, 1)/√2  svah
//   LEFT    triangle (v0,v4,v3) na X=−0.5, normála (−1,0,0)
//   RIGHT   triangle (v1,v2,v5) na X=+0.5, normála ( 1,0,0)
//
// Per-face vertices (non-shared) → flat shading bez `computeVertexNormals`
// (každá face má vlastní normály = ostré hrany mezi facey, pixel-art look).
// Celkem 18 vertices, 8 trojúhelníků. `getRampGeom` (DD-41) clonuje raw geom
// a doplňuje per-face vertex colors z `BLOCK_COLORS` palety.

const TRRAMP_FACE_COUNT = 5;
const _TRRAMP_RAW_GEOM = (() => {
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
  const indices = [];

  // Helper: přidá quad (4 vertices, 2 trojúhelníky) s jednou normálou per face.
  // CCW pořadí pro správnou face culling (Three.js front-face = CCW).
  function addQuad(p0, p1, p2, p3, n) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    indices.push(startVert, startVert + 1, startVert + 2);
    indices.push(startVert, startVert + 2, startVert + 3);
  }

  function addTri(p0, p1, p2, n) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // Pořadí face addů (musí ladit s `RAMP_FACE_VERT_COUNTS.trramps` v G0b
  // lowpoly builderu pro per-face vertex color mapping):
  // 0 = SLOPE, 1 = BOTTOM, 2 = BACK, 3 = LEFT, 4 = RIGHT.
  //
  // CCW order pro každý face = vertices v takovém pořadí, aby cross product
  // (v[1]−v[0]) × (v[2]−v[0]) dal kladnou složku ve směru deklarované normály
  // (Three.js front-face konvence).

  // SLOPE — quad (v3, v2, v5, v4), normála (0, 1, 1)/√2 (svah nakloněný k +Z).
  addQuad(v3, v2, v5, v4, [0, 1 / SQRT2, 1 / SQRT2]);
  // BOTTOM — quad (v0, v1, v2, v3), normála (0, −1, 0).
  addQuad(v0, v1, v2, v3, [0, -1, 0]);
  // BACK — quad (v0, v4, v5, v1), normála (0, 0, −1). Vertikální stěna na NORTH.
  addQuad(v0, v4, v5, v1, [0, 0, -1]);
  // LEFT — triangle (v0, v3, v4) na X=−0.5, normála (−1, 0, 0).
  addTri(v0, v3, v4, [-1, 0, 0]);
  // RIGHT — triangle (v1, v5, v2) na X=+0.5, normála (1, 0, 0).
  addTri(v1, v5, v2, [1, 0, 0]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
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
const _TTRAMP_RAW_GEOM = (() => {
  const SQRT3 = Math.sqrt(3);
  // 4 unique vertex pozice (lokálně, 1C blok centered v origin).
  const C = [-0.5, -0.5, -0.5];  // sdílený roh 3 perpendicular faces
  const X = [ 0.5, -0.5, -0.5];  // konec +X hrany
  const Y = [-0.5,  0.5, -0.5];  // konec +Y hrany (apex top)
  const Z = [-0.5, -0.5,  0.5];  // konec +Z hrany

  const positions = [];
  const normals = [];
  const indices = [];

  function addTri(p0, p1, p2, n) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // Pořadí face addů (musí ladit s `RAMP_FACE_VERT_COUNTS.ttramps` v G0b
  // lowpoly builderu pro per-face vertex color mapping):
  // 0 = SLOPE, 1 = BOTTOM, 2 = BACK, 3 = LEFT.

  // SLOPE — triangle (X, Y, Z), rovnostranný, normála (1, 1, 1)/√3.
  addTri(X, Y, Z, [1 / SQRT3, 1 / SQRT3, 1 / SQRT3]);
  // BOTTOM — triangle (C, X, Z) na Y=−0.5, normála (0, −1, 0).
  addTri(C, X, Z, [0, -1, 0]);
  // BACK — triangle (C, Y, X) na Z=−0.5, normála (0, 0, −1).
  addTri(C, Y, X, [0, 0, -1]);
  // LEFT — triangle (C, Z, Y) na X=−0.5, normála (−1, 0, 0).
  addTri(C, Z, Y, [-1, 0, 0]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals, 3));
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

// 7 face × 5 face groups (WALL_FULL na 2 sousedních quadech E+S, WALL_TRI na
// 2 sousedních triích N+W → sdílí stejný palette slot v G0b lowpoly mapping).
const TDRAMP_FACE_COUNT = 5;
const _TDRAMP_RAW_GEOM = (() => {
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
  const indices = [];

  function addQuad(p0, p1, p2, p3, n) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    normals.push(...n, ...n, ...n, ...n);
    indices.push(startVert, startVert + 1, startVert + 2);
    indices.push(startVert, startVert + 2, startVert + 3);
  }
  function addTri(p0, p1, p2, n) {
    const startVert = positions.length / 3;
    positions.push(...p0, ...p1, ...p2);
    normals.push(...n, ...n, ...n);
    indices.push(startVert, startVert + 1, startVert + 2);
  }

  // SLOPE — diagonální šikmá plocha. Normála (−1, +1, −1)/√3 → ven k NW-up.
  addTri(v0, v6, v4, [-1 / SQRT3, 1 / SQRT3, -1 / SQRT3]);
  // TOP — plochý trojúhelník na Y=+0.5. CCW (v6, v5, v4) dává +Y normálu.
  addTri(v6, v5, v4, [0, 1, 0]);
  // BOTTOM — quad (v0, v1, v2, v3) na Y=−0.5.
  addQuad(v0, v1, v2, v3, [0, -1, 0]);
  // WALL_FULL E — quad (v4, v5, v2, v1) na X=+0.5. CCW pro +X normálu.
  addQuad(v4, v5, v2, v1, [1, 0, 0]);
  // WALL_FULL S — quad (v5, v6, v3, v2) na Z=+0.5. CCW pro +Z normálu.
  addQuad(v5, v6, v3, v2, [0, 0, 1]);
  // WALL_TRI N — triangle (v0, v4, v1) na Z=−0.5, normála (0,0,−1).
  addTri(v0, v4, v1, [0, 0, -1]);
  // WALL_TRI W — triangle (v0, v3, v6) na X=−0.5, normála (−1,0,0).
  addTri(v0, v3, v6, [-1, 0, 0]);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute("normal",   new THREE.Float32BufferAttribute(normals,   3));
  geom.setIndex(indices);
  return geom;
})();


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
// Izomorfně s `getTcubesKindGeom`: per (typ, surface) clone raw ramp geom
// (`_TRRAMP_RAW_GEOM` / `_TTRAMP_RAW_GEOM` / `_TDRAMP_RAW_GEOM` — positions,
// normals, indices bez UV po sez. 48 D1 cleanup) a inject color attribute
// per face group.
//
// Per-typ vertex count per **logical face group** (matching order addTri/addQuad
// calls v raw IIFE). TDRAMP má 7 fyzických faces ve 5 color groups (WALL_FULL =
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
  const rawGeom     = type === "trramps" ? _TRRAMP_RAW_GEOM
                    : type === "ttramps" ? _TTRAMP_RAW_GEOM
                    : type === "tdramp"  ? _TDRAMP_RAW_GEOM
                    : null;
  if (!palette || !vertCounts || !paletteKeys || !rawGeom) {
    _lowpolyRampGeomCache.set(cacheKey, null);
    return null;
  }
  const geom = rawGeom.clone();
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
// Materiály pro LIQUID 1. třída entity (DD-54 sez. 45, prototype od DD-47 sez. 38:
// flood-fill basin entity, ne biome surface — DD-47 dropped pattern).
const _waterMat = new THREE.MeshStandardMaterial({
  color:        0x3a7090,
  transparent:  true,
  opacity:      0.55,
  metalness:    0.20,
  roughness:    0.25,
  side:         THREE.DoubleSide,
});
// Ice canvas texture generator (sez. 47, DD-47 follow-up). Solid `0xd9e8ec`
// → bílo-modré patches pattern. Canvas2D random radial blobs s alpha gradient
// = "zasněžený led" texture. 128×128 px = balance detail vs. memory (~64 kB
// RGBA). `repeat = 1×1` default = jedna texture instance per LIQUID mesh
// (= per cell pro DD-54 single-cell prototype). Sdílená napříč všechny ice
// meshes (jedna texture v paměti).
//
// Pattern: base `#d9e8ec` (= dnešní _iceMat color) + ~30 bílých radial blobs
// (radius 4..12 px, center alpha 0.7) → "vločkové" splotches simulující frost
// patches/snow dust on ice. Random seed-less (Math.random) = každý reload
// jiná texture, ale jedna sdílená napříč scénou v daném runu.
function makeIceCanvasTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d9e8ec";
  ctx.fillRect(0, 0, size, size);
  const stamps = 30;
  for (let i = 0; i < stamps; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 8;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const _iceTexture = makeIceCanvasTexture();
const _iceMat = new THREE.MeshStandardMaterial({
  // Color 0xffffff (unbiased) — texture barva (`0xd9e8ec` base + bílé patches)
  // dominuje výsledné barvě. Sez. 47: bílo-modré patches z `_iceTexture`
  // nahrazují dřívější solid `0xd9e8ec` (= dnes integrované v textuře jako
  // base color).
  color:        0xffffff,
  map:          _iceTexture,
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

// Vytvoří mesh pro LIQUID instanci (DD-54, sez. 45). Přijímá `LIQUID` data
// objekt — čte `TEMPERATURE` (material decision), `X/LEVEL/Z` (pozice),
// `BOUNDING_BOX` (scale). Plane v rovině XZ po rotaci kolem X osy.
// Internal materiály/geom stále `_waterMat`/`_iceMat`/`_waterGeom` — KISS,
// rename na `_liquid*` = sub-prah až přibude lava/oil sourozenec.
function createLiquidPlane(liquid) {
  const frozen = liquid.TEMPERATURE === "frozen";
  const mesh = new THREE.Mesh(_waterGeom, frozen ? _iceMat : _waterMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(liquid.X, liquid.Y, liquid.Z);
  mesh.scale.set(liquid.BOUNDING_BOX.w, 1, liquid.BOUNDING_BOX.d);
  mesh.receiveShadow = true;
  // Wave anim registrace: stash base Y + add do `_waterMeshes` Set.
  // Frozen (ice) se ne-anim (rigid surface) — vynechán ze Setu.
  if (!frozen) {
    mesh.userData.waterBaseY = liquid.Y;
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
// Sez. 30 stress test 100×100: 47k draw calls @ FPS 7 (CPU bound). 1 `THREE.Mesh`
// = 1 draw call → strop. Tady mergujeme N instancí stejného (geom, lowpoly mat)
// páru do **1 `InstancedMesh`** = 1 draw call. Per-instance se liší jen matrix
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
//   instance.ID → `Object3D`         pro non-terrain (slow-path TCUBES, water
//                                    plane, LAMP, DECOR, LIQUID)
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

// === Voxel InstancedMesh batches (sez. 51, DD-56) ===========================
// Paralel `_terrainBatches` pattern (DD-37): 4 InstancedMesh batches, jeden
// per resource type (`wood`/`stone`/`sand`/`water`). Per-instance se liší jen
// matrix (sub-grid pozice + scale=VOXEL_EDGE), barva je per-batch (flat material
// `MeshStandardMaterial({color: RESOURCE.color})`, žádné per-instance tint).
//
// Capacity sez. 51 = 1024 instances/batch (= dost pro rainbow rubik 16 + scatter
// reserve sez. 52; pro plný 20×20 voxelizovaný grid by bylo 20×20×64=25.6k =
// extreme stress, max 4 batches × 1024 = 4096 voxelů celkem). Pro sez. 52/53
// scaling se kapacita zvedne na 10k per DD-56 odhad.
//
// Sdílená geometrie: jeden `BoxGeometry(VOXEL_EDGE)` napříč všemi batchi.
// Per-batch materiál: jeden `MeshStandardMaterial` per resource s flat color.
// **Žádný `flatShading: true`** — memory `[[feedback_flat_shading_instanced]]`
// (Three.js InstancedMesh + flatShading = cross-instance derivative seam artifact).
const VOXEL_BATCH_CAPACITY = 1024;
const _voxelGeom = new THREE.BoxGeometry(VOXEL_EDGE, VOXEL_EDGE, VOXEL_EDGE);
const _voxelMats = {};       // resource → MeshStandardMaterial
const _voxelBatches = new Map();  // resource → InstancedMesh (lazy alloc per resource)

// Materiály alokujeme jednou (per RESOURCE_REGISTRY entry). Sdílené napříč
// regenerateScene calls (dispose by zničil i další spawny — paralel `_lowpolyMat`).
//
// **MeshLambertMaterial** (ne Standard) — sez. 51 patch #4 fix shader match.
// `_lowpolyMat` (TCUBES + rampy) je Lambert s `vertexColors: true`. Standard
// (PBR microfacet model) by stejné albedo renderoval znatelně tmavší než
// Lambert (user kapátko měření: TCUBES sand TOP 0x7F7743 vs. voxel sand
// 0x705F18 = Standard má cca 12 % tmavší diffuse response). Sjednocení na
// Lambert + plain `color` (žádné vertexColors, voxel je 1 barva napříč
// faces) = stejný shading path → identická lit barva pro stejný source hex.
//
// Caveat: voxely uvnitř rubika budou ve stínu sousedních voxelů (shadow
// casting drží), takže lokálně tmavší než fully-lit TCUBES top. To je
// intencionální Lambert behavior, ne mismatch.
for (const r of RESOURCE_NAMES) {
  _voxelMats[r] = new THREE.MeshLambertMaterial({
    color: RESOURCE_REGISTRY[r].color,
  });
}

// Vytvoří fresh InstancedMesh per resource, registruje do scene a `_voxelBatches`.
// `batch.count = 0` (zaplníme inkrementálně přes `pushVoxelToBatch`).
function createVoxelBatch(resource) {
  const batch = new THREE.InstancedMesh(_voxelGeom, _voxelMats[resource], VOXEL_BATCH_CAPACITY);
  batch.userData.terrain   = true;   // regen filter — voxely lze re-buildovat se scénou
  batch.userData.voxel     = true;   // diskriminátor (debug, future per-voxel raycast)
  batch.userData.resource  = resource;
  batch.castShadow         = true;
  batch.receiveShadow      = true;
  batch.count              = 0;
  _voxelBatches.set(resource, batch);
  scene.add(batch);
  return batch;
}

// Scratch objekty pro voxel matrix compose (žádné per-voxel alokace — paralel
// `_batchPos`/`_batchMatrix` z terrain batches sekce).
const _voxelPos    = new THREE.Vector3();
const _voxelQuat   = new THREE.Quaternion();  // identity (žádná rotace pro stack mode)
const _voxelScale  = new THREE.Vector3(1, 1, 1);  // geom už má VOXEL_EDGE
const _voxelMatrix = new THREE.Matrix4();

/**
 * pushVoxelInstance — low-level: pushne 1 voxel matrix do per-resource batch.
 * Sdílený mezi stack mode dispatch (`dispatchVoxelsToBatches`) a scatter mode
 * (`scatterRandomVoxels`). `quat = null` → identity rotace.
 */
function pushVoxelInstance(resource, x, y, z, quat) {
  let batch = _voxelBatches.get(resource);
  if (!batch) batch = createVoxelBatch(resource);
  if (batch.count >= VOXEL_BATCH_CAPACITY) {
    // Sez. 51 hard cap. Sez. 52+ zvedneme capacity na 10k.
    console.warn(`voxel batch ${resource} cap ${VOXEL_BATCH_CAPACITY} reached, skipping voxel`);
    return;
  }
  _voxelPos.set(x, y, z);
  if (quat) _voxelQuat.copy(quat);
  else _voxelQuat.identity();
  _voxelMatrix.compose(_voxelPos, _voxelQuat, _voxelScale);
  batch.setMatrixAt(batch.count, _voxelMatrix);
  batch.count++;
}

/**
 * flushVoxelBatches — flag všechny `instanceMatrix.needsUpdate = true`. Idempotent;
 * volat na konci dispatch + scatter (multiple flush = no-op před render frame).
 */
function flushVoxelBatches() {
  for (const batch of _voxelBatches.values()) {
    batch.instanceMatrix.needsUpdate = true;
  }
}

/**
 * dispatchVoxelsToBatches — projde `cube.voxelLayers()` a pushne voxel instance
 * do per-resource InstancedMesh batchí (stack mode, DD-56 koncept 5).
 *
 * Per-voxel pozice: voxel center v cube-local sub-gridu (`sx, sy, sz ∈ [0, V)`):
 *   localCenter = (-0.5 + (s + 0.5)/V)  pro každou osu
 *   worldCenter = cube.{X,Y,Z} + localCenter  (cube position = center, DD-12)
 */
function dispatchVoxelsToBatches(cube) {
  const V = VOXEL_GRID;
  for (const v of cube.voxelLayers()) {
    // Sub-grid center → world center.
    const cx = cube.X - 0.5 + (v.sx + 0.5) / V;
    const cy = cube.Y - 0.5 + (v.sy + 0.5) / V;
    const cz = cube.Z - 0.5 + (v.sz + 0.5) / V;
    pushVoxelInstance(v.resource, cx, cy, cz, null);
  }
  flushVoxelBatches();
}

// === Scatter mode (sez. 51 patch #4, DD-56 koncept 5) =======================
// Single voxely rozhozené po krajině: random (x, z) cell, surface = top TCUBES
// nebo top ramp; voxel posazen "na surface" s tilt quaternionem dle slope
// normály (TRRAMPS 45° kolmo na ORIENTATION, TTRAMPS corner (1,1,1)/√3 rotated
// by ORIENTATION, TDRAMP fallback identity = no tilt pro MVP).
//
// User spec sez. 51 patch #4: počet voxelů = `floor(sizeX * sizeZ / 10)`.
// Pro 10×10 grid = 10 voxelů, 20×20 = 40, 100×100 = 1000. Cap při dosažení
// VOXEL_BATCH_CAPACITY = 1024 per resource (= ~5120 voxelů celkem nad rubik).

// Slope normály per ramp type (default ORIENTATION 0°). Rotují se kolem osy Y
// per instance.orientation. Scratch Vector3 alokovány jednorázově (žádné
// per-voxel alocs v scatter loopu).
const _slopeNormalTRRAMPS = new THREE.Vector3(0, 1, -1).normalize();  // svah klesá k +Z (default 0°)
const _slopeNormalTTRAMPS = new THREE.Vector3(1, 1, 1).normalize();   // corner peak SE-top-SOUTH

// Scratch objekty pro scatter loop (žádné per-voxel alokace v hot path).
const _scatterNormal = new THREE.Vector3();
const _scatterYAxis = new THREE.Vector3(0, 1, 0);
const _scatterYRotQuat = new THREE.Quaternion();
const _scatterTiltQuat = new THREE.Quaternion();

/**
 * scatterRandomVoxels — rozhází `floor(sizeX * sizeZ / 10)` voxelů na náhodné
 * surface cells (TCUBES + rampy). Per voxel: **weighted** resource pick dle
 * `weights` (sez. 52 Krok 8, DD-56 fáze 2 — nahrazuje sez. 51 uniform random),
 * tilt podle ramp slope (TCUBES = no tilt + random Y rotation).
 *
 * Surface lookup: scan `terrain.blocks` (TCUBES top Y per kolona) + `terrain.
 * ramps` (ramp y má prioritu, leží **nad** top TCUBES). Pokud kolona má jen
 * water/air = chybí v surfaceByXZ → voxel tam nepadne.
 *
 * @param {object} terrain  — `generateTerrain` output (blocks + ramps).
 * @param {number} sizeX    — terrain X dimension (= `params.size[0]`).
 * @param {number} sizeZ    — terrain Z dimension (= `params.size[1]`).
 * @param {number} seed     — deterministic per regen (`params.seed` ?? 42).
 * @param {object} weights  — `{ resourceName: weight, ... }` sum ≈ 1.0. Per-biome
 *                            váhy z `scatterWeightsForBiome(latitude, humidity)`
 *                            v terrain.js. Per voxel = weighted sample přes
 *                            cumulative sum.
 */
function scatterRandomVoxels(terrain, sizeX, sizeZ, seed, weights) {
  // 1) Surface lookup: max Y per (x, z), preferovat ramp nad TCUBES top.
  const surfaceByXZ = new Map();  // "x,z" → { kind: "tcubes"|"trramps"|"ttramps"|"tdramp", y, orientation }
  for (const [, bx, by, bz] of terrain.blocks) {
    const key = `${bx},${bz}`;
    const prev = surfaceByXZ.get(key);
    if (!prev || by > prev.y) {
      surfaceByXZ.set(key, { kind: "tcubes", y: by, orientation: 0 });
    }
  }
  for (const r of terrain.ramps ?? []) {
    const key = `${r.x},${r.z}`;
    const prev = surfaceByXZ.get(key);
    // Ramp je vždy nad TCUBES top (= jeho y = top_tcubes_y + 1). Override.
    if (!prev || r.y >= prev.y) {
      let kind = "tdramp";
      if      (r.kind === "edge")     kind = "trramps";
      else if (r.kind === "corner")   kind = "ttramps";
      else if (r.kind === "diagonal") kind = "tdramp";
      surfaceByXZ.set(key, { kind, y: r.y, orientation: r.orientation ?? 0 });
    }
  }

  const keys = [...surfaceByXZ.keys()];
  if (keys.length === 0) return;

  const count = Math.floor(sizeX * sizeZ / 10);
  const rng = mulberry32(seed || 1);
  const half = VOXEL_EDGE / 2;  // 0.125 — half voxel size pro surface offset

  // 2) Pre-build cumulative weights (once per scatter, ne per voxel).
  //    `cumulative[k]` = součet vah resourceList[0..k]. Weighted pick = najdi
  //    nejmenší k takové, že `roll < cumulative[k]` (binary search by byl
  //    overkill pro 5 položek, lineární scan stačí).
  const resourceList = Object.keys(weights);
  const cumulative = [];
  let acc = 0;
  for (const r of resourceList) {
    acc += weights[r];
    cumulative.push(acc);
  }
  // `acc` ≈ 1.0 (sum vah), ale defensive — pokud sum < 1 numericky, roll
  // dosáhne max acc (ne hardcoded 1.0).

  for (let i = 0; i < count; i++) {
    const key = keys[Math.floor(rng() * keys.length)];
    const surface = surfaceByXZ.get(key);
    const [cellX, cellZ] = key.split(",").map(Number);
    // Weighted pick — roll v [0, acc), find first cumulative > roll. Fallback
    // na last resource (defensive pro floating-point edge case `roll === acc`).
    const roll = rng() * acc;
    let resource = resourceList[resourceList.length - 1];
    for (let k = 0; k < cumulative.length; k++) {
      if (roll < cumulative[k]) { resource = resourceList[k]; break; }
    }

    if (surface.kind === "tcubes") {
      // TCUBES top face — voxel center 1 half nad cell.Y + 0.5 (= na top face).
      // Random Y rotation pro vizuální variabilitu (A13 scatter mode spec).
      _scatterYRotQuat.setFromAxisAngle(_scatterYAxis, rng() * Math.PI * 2);
      pushVoxelInstance(
        resource,
        cellX,
        surface.y + 0.5 + half,
        cellZ,
        _scatterYRotQuat,
      );
    } else if (surface.kind === "trramps" || surface.kind === "ttramps") {
      // Ramp slope — voxel sedí na slope, tilt quat rotuje voxel "up" na slope
      // normálu, posun pozice o `half` podél normály (= voxel center 1 half
      // nad SLOPE midpoint).
      const baseN = surface.kind === "trramps" ? _slopeNormalTRRAMPS : _slopeNormalTTRAMPS;
      _scatterNormal.copy(baseN);
      // Rotate normála kolem Y by ORIENTATION (degrees → radians).
      _scatterYRotQuat.setFromAxisAngle(_scatterYAxis, surface.orientation * Math.PI / 180);
      _scatterNormal.applyQuaternion(_scatterYRotQuat);
      // Tilt = setFromUnitVectors(up, slopeNormal). Voxel local Y axis bude pointovat podél slope normály.
      _scatterTiltQuat.setFromUnitVectors(_scatterYAxis, _scatterNormal);
      pushVoxelInstance(
        resource,
        cellX + _scatterNormal.x * half,
        surface.y + _scatterNormal.y * half,
        cellZ + _scatterNormal.z * half,
        _scatterTiltQuat,
      );
    } else {
      // TDRAMP fallback — slope normála geometrically composite (= 3-vertex
      // diagonal slope), proper tilt vyžaduje per-orientation computation
      // mimo MVP scope. Pro sez. 51 patch: voxel na cell.Y + 0.5 + half (= "
      // shora" nad lomenou rampou), random Y rotation. Sub-prah pro post-MVP.
      _scatterYRotQuat.setFromAxisAngle(_scatterYAxis, rng() * Math.PI * 2);
      pushVoxelInstance(
        resource,
        cellX,
        surface.y + 0.5 + half,
        cellZ,
        _scatterYRotQuat,
      );
    }
  }
  flushVoxelBatches();
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

  // LIQUID instance per water cell (sez. 45, DD-54 5. vrstva DD-25 extension).
  // Sez. 45 prototype: 1 LIQUID = 1 water cell (single-cell skeleton, bbox
  // `{w:1, d:1}`, CELLS `[{x,z}]` single). Plný BFS clustering = sub-prah.
  // Per DD-11 model/engine separation: `terrain.water[]` jsou raw data
  // records (`{x, y, z, frozen, w, d}`), LIQUID construction patří sem do
  // engine spawn loopu, ne do `terrain.js`.
  // userData.terrain = true → flag pro regenerateScene cleanup.
  let liquidIdx = 0;
  for (const w of terrain.water ?? []) {
    // Zero-pad ID `liquid_NNNN` (paralel `decor_NNNN`); per DD-29 atribut
    // `name` zachovává sémantickou identitu („Jezero"/„Led" by mohlo přijít
    // až s LIQUID KIND atributem, dnes monolit).
    const id = `liquid_${String(liquidIdx++).padStart(4, "0")}`;
    const liquid = new LIQUID(
      id, "Tekutina",
      w.x, w.y, w.z,
      w.frozen ? "frozen" : "liquid",
      { w: w.w ?? 1, d: w.d ?? 1 },
      [{ x: w.x, z: w.z }],
    );
    const mesh = createLiquidPlane(liquid);
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

  // Rainbow rubik demo (sez. 51, DD-56 acceptance bod 1 + DD-57 sez. 51 patch).
  // Voxel-native MVP proof-of-life: 5 surovin (voda/písek/hlína/kámen/dřevo)
  // = 64 voxelů ve 4×4×4 sub-gridu, **render shuffled** (seeded Fisher-Yates,
  // DD-57). Distribuce 13+13+13+13+12 = 64 (4 typy po 13 + 5. typ 12 = V³).
  //
  // **Posazení (sez. 51 patch #2)**: najdi TCUBES, jehož (x, y+1, z) cell je
  // **volný** (žádný TCUBES ani ramp), pak vyber kandidáta nejbližšího k rohu
  // (0, 0) v Euclidean distance. Pre-patch verze ignorovala `terrain.ramps`
  // → rubik někdy přistál do TTRAMP cellu = z-fight (user feedback). Fix
  // = obsazený-set z **obou** terrain.blocks + terrain.ramps.
  //
  // Insertion order Map (= user-spec pořadí: water → sand → dirt → stone →
  // wood) drží LIFO mechaniku data-side (sez. 53 vzducholoď pick `[...keys].
  // at(-1)` = wood last inserted = first picked). Vizuální „inverted rainbow
  // emergent" zmizel (DD-57 trade-off) — sez. 53 acceptance bod 5 přepíšeme.

  const sizeX = params.size[0];
  const sizeZ = params.size[1];

  // 1) Postav set obsazených cell pozic (TCUBES + rampy). Klíč `"x,y,z"`.
  const occupied = new Set();
  for (const [, bx, by, bz] of terrain.blocks) occupied.add(`${bx},${by},${bz}`);
  for (const r of terrain.ramps ?? []) occupied.add(`${r.x},${r.y},${r.z}`);

  // 2) Pro každou (x, z) kolonu najdi top Y (jen TCUBES, ne rampy).
  const topByColumn = new Map();  // "x,z" → topY
  for (const [, bx, by, bz] of terrain.blocks) {
    const key = `${bx},${bz}`;
    const prev = topByColumn.get(key);
    if (prev === undefined || by > prev) topByColumn.set(key, by);
  }

  // 3) Filter: kandidát = TCUBES top, jehož cell o 1 výš je volný (žádný
  //    TCUBES / ramp / TTRAMP corner). Pro 4-cell occupancy check budoucí
  //    voxel collision pattern.
  const candidates = [];
  for (const [key, topY] of topByColumn) {
    const [x, z] = key.split(",").map(Number);
    if (!occupied.has(`${x},${topY + 1},${z}`)) {
      candidates.push({ x, z, topY });
    }
  }

  // 4) Sort dle Euclidean distance k rohu (0, 0) = `x² + z²` (= `dist²`,
  //    sqrt skip = monotone). Tie-break: nižší X (= levá strana preferred).
  candidates.sort((a, b) => {
    const da = a.x * a.x + a.z * a.z;
    const db = b.x * b.x + b.z * b.z;
    if (da !== db) return da - db;
    return a.x - b.x;
  });

  // 5) Pokud žádný kandidát (= prakticky se nestane, terrain je plný), fallback
  //    na (0, 0, 0) ground-level (rubik bude vidět, ale možná překrytý).
  const winner = candidates[0] ?? { x: 0, z: 0, topY: -1 };
  const cornerX = winner.x;
  const cornerZ = winner.z;
  const rubikY  = winner.topY + 1;  // 1 cell nad nalezenou volnou top TCUBES

  // Abstract CUBES instance — jen kontejner pro VOXELS, žádný single mesh
  // (= dispatch jde výhradně přes voxel batches). Per DD-56 koncept 3
  // „tile-jako-storage": VOXELS sedí na čemkoliv v CUBES rodině.
  const rubik = new CUBES("rubik_demo_001", "Rainbow rubik", cornerX, rubikY, cornerZ);
  // 5 surovin, distribuce 13+13+13+13+12 = 64 voxelů celkem (= V³ = plný cube).
  // Pořadí addVoxel = user-spec pořadí (Map insertion order pro LIFO).
  rubik.addVoxel("water", 13);
  rubik.addVoxel("sand",  13);
  rubik.addVoxel("dirt",  13);
  rubik.addVoxel("stone", 13);
  rubik.addVoxel("wood",  12);
  dispatchVoxelsToBatches(rubik);

  // Scatter random voxely po krajině (sez. 51 patch #4 + sez. 52 Krok 8) —
  // `floor(sizeX * sizeZ / 10)` voxelů na random surface (TCUBES top + rampy
  // s tilt). Sez. 52: resource pick = weighted dle `params.scatterWeights`
  // (per-biome váhy z `scatterWeightsForBiome` v terrain.js). Seed
  // deterministic per regen.
  scatterRandomVoxels(terrain, sizeX, sizeZ, params.seed ?? 42, params.scatterWeights);
  // Registruj instance pro infotip lookup (sub-prah pro per-voxel raycast,
  // sez. 51 ale alespoň hover nad rubik cubem celkově). meshByInstance value
  // = single-mesh entry by potřebovala mesh; voxel batches jsou shared per
  // resource, takže žádný 1:1 mesh-instance. Skip pro MVP — hover na voxel
  // je sub-prah pro sez. 52+ (chop interakce klikem).

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
//     Geometrii a materiál NEdisposovat (sdílené singletony — `_lowpolyMat`
//     + shared geom cache, dispose by zničil ostatní spawny).
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

  // 1b) Voxel batchy (sez. 51, DD-56) — paralel terrain cleanup pattern.
  //     Voxel batches nedrží `instancesByIdx` (sez. 51 prototype: žádný
  //     per-voxel raycast/hover, infotip je sub-prah). `batch.dispose()` uvolní
  //     instanceMatrix GPU buffer. `_voxelGeom` + `_voxelMats[*]` jsou sdílené
  //     singletony (paralel `_lowpolyMat`), NEdisposovat.
  for (const batch of _voxelBatches.values()) {
    scene.remove(batch);
    batch.dispose();
  }
  _voxelBatches.clear();

  // 2) Single-mesh entries s `userData.terrain === true` (water + DECOR
  //    od sez. 40 DD-49). Water plane nemá `userData.instance` (nešel přes
  //    `createMeshFor`), DECOR Group ho má — pokud existuje, `meshByInstance`
  //    cleanup uvolní zombie reference. Voxel batches mají taky `userData.terrain
  //    = true`, ale už jsme je dropli v kroku 1b → filter `!c.userData.voxel`.
  const staleEntries = scene.children.filter((c) => c.userData.terrain === true && !c.userData.voxel);
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
// Sdílený originál (`hoverOrigMat`) nedispose — patří sdílené factory.
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
// DD-47 (sez. 38) — waterSpec helper (flood-fill voda dle climate). Konzumuje LIQUID 1. třída entity od DD-54.
window.waterSpecForClimate = waterSpecForClimate;
// Sez. 40 DD-49 — decorSpec helper + DECOR_DENSITY tabulka pro UI/dev.
window.decorSpecForClimate = decorSpecForClimate;
window.DECOR_DENSITY = DECOR_DENSITY;
// Sez. 52 (DD-56 fáze 2 Krok 8) — scatterWeights helper pro UI `readParams()`.
window.scatterWeightsForBiome = scatterWeightsForBiome;
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
    surfaces:        surfacesForBiome(world.LATITUDE, world.HUMIDITY),
    snowSpec:        snowSpecForLatitude(world.LATITUDE, world.SEASON),
    waterSpec:       waterSpecForClimate(world.LATITUDE, world.HUMIDITY, world.SEASON),
    decorSpec:       decorSpecForClimate(world.LATITUDE, world.HUMIDITY, world.SEASON, world.DECOR_DENSITY_MULT),
    scatterWeights:  scatterWeightsForBiome(world.LATITUDE, world.HUMIDITY),
  });
}

buildScene(scene);

// === Hover highlight (editor-like feedback) ===
// Při najetí kurzoru na CUBES-potomka se objekt nažlutle.
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
//       Non-terrain entity (slow-path TCUBES, water plane, COMPOSITES jako
//       LAMP/DECOR) zůstávají single-mesh. Hover přes lazy clone-on-first-hover
//       (mutate emissive na klonovaném materiálu, sourozenci se sdíleným
//       originálem zůstanou nedotknuti).

const HOVER_EMISSIVE_HEX = 0x404020;  // single-mesh path: žluté světélkování (R=0x40, G=0x40, B=0x20)

function setHoverHighlight(instance, on) {
  if (!instance) return;
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
  return val;
}

// Vykreslí tooltip pro danou instanci.
function renderTooltip(instance) {
  // instance.constructor.name vrátí např. "CUBES" — použije se jako nadpis
  const header = instance.constructor.name;
  // Object.entries vytáhne [klíč, hodnota] páry z vlastních atributů instance.
  // Nevyplněná TEXTURE_* zůstávají s "—" (sémantické: fallback na šachovnici, DD-07).
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
  // Wall-clock v sekundách — plynulý parametr pro WORLD/atmosféru.
  // `performance.now()` vrací ms od spuštění stránky (high-resolution timer).
  const now = performance.now() / 1000;
  const dt  = now - _lastFrameTime;
  _lastFrameTime = now;
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
  updateKeyboardCamera(dt);
  // DOF focus = vzdálenost kamera→target (= střed scény při OrbitControls).
  // BokehPass má `uniforms.focus` ve fragment shaderu; setujeme každý frame,
  // takže při zoom in/out se ostrá zóna posouvá s cílem.
  bokehPass.uniforms.focus.value = camera.position.distanceTo(controls.target);
  composer.render();

  // Perf HUD report 1×/s — `renderer.info.render.*` akumulované přes všechny
  // frames + composer passes mezi reporty (sez. 42 Krok 3 — `autoReset=false`).
  // Reportujeme **average per-frame** (= total / frameCount).
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
