// src/time.js
// Globální čítač TIME.
//
// V M1 (viz DD-04 a DD-05) je TIME pouhé "hodiny na stěně" — monotonně
// roste, ale objekty samy nereagují. Mechanismus, jakým se na čas
// napojuje chování, přijde v pozdějších milnících.

/**
 * TIME je singleton objekt s jediným polem `tick`.
 * Používáme `export const` — reference je immutable, ale pole lze měnit.
 *
 * Proč ne jen `export let tick = 0`? Protože při `import { tick }`
 * by se do jiných modulů zkopírovala hodnota ve chvíli importu
 * a neaktualizovala by se. Obalený v objektu se živě čte.
 */
export const TIME = {
  tick: 0,
};

/**
 * Zvýší TIME o 1 a aktualizuje HUD (element #time v index.html).
 *
 * Pozn.: `document.getElementById` vrací element nebo null. Kontrolujeme
 * null, aby funkce přežila, i kdyby HUD nebyl v DOMu (např. v testu).
 */
export function advanceTime() {
  TIME.tick += 1;
  const el = document.getElementById("time");
  if (el) el.textContent = TIME.tick;
}
