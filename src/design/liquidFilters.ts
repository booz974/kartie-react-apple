import { buildDisplacementMap } from './displacementMap';

/**
 * Registre des filtres de verre liquide.
 *
 * Une grille de cartes, c'est vingt surfaces de dimensions identiques. Laisser
 * chacune fabriquer son filtre SVG et sa carte de déplacement reviendrait à
 * produire vingt fois le même objet. Le registre les met en commun : une
 * définition par géométrie distincte, quel que soit le nombre de surfaces qui
 * s'y réfèrent.
 *
 * Le comptage de références permet de retirer une définition dès que plus
 * personne ne l'utilise, ce qui compte sur une liste que l'on fait défiler :
 * les tailles vues puis quittées ne s'accumulent pas dans le document.
 */

export type LiquidSpec = {
  width: number;
  height: number;
  radius: number;
  bezel: number;
  chromatic: boolean;
};

export type LiquidFilter = LiquidSpec & {
  id: string;
  /** Carte de déplacement, en data URI. */
  map: string;
};

type Entry = { filter: LiquidFilter; count: number };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

/** Recalculé à chaque mutation : `useSyncExternalStore` compare les identités. */
let snapshot: LiquidFilter[] = [];

function specKey(spec: LiquidSpec): string {
  return `${spec.width}x${spec.height}r${spec.radius}b${spec.bezel}${spec.chromatic ? 'c' : ''}`;
}

function publish() {
  snapshot = [...entries.values()].map((entry) => entry.filter);
  for (const listener of listeners) listener();
}

/**
 * Réserve un filtre pour cette géométrie et renvoie son identifiant, ou `null`
 * si la carte n'a pas pu être produite. Chaque appel doit être rendu par
 * `releaseLiquidFilter`.
 */
export function acquireLiquidFilter(spec: LiquidSpec): string | null {
  const key = specKey(spec);
  const existing = entries.get(key);
  if (existing) {
    existing.count += 1;
    return existing.filter.id;
  }

  const map = buildDisplacementMap({
    width: spec.width,
    height: spec.height,
    radius: spec.radius,
    bezel: spec.bezel,
  });
  if (!map) return null;

  // L'identifiant dérive de la géométrie : deux surfaces de même taille
  // pointent naturellement vers la même définition.
  const id = `k-liquid-${key.replace(/[^a-z0-9]/gi, '')}`;
  entries.set(key, { filter: { ...spec, id, map }, count: 1 });
  publish();
  return id;
}

export function releaseLiquidFilter(spec: LiquidSpec): void {
  const key = specKey(spec);
  const existing = entries.get(key);
  if (!existing) return;
  existing.count -= 1;
  if (existing.count <= 0) {
    entries.delete(key);
    publish();
  }
}

export function subscribeLiquidFilters(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLiquidFilters(): LiquidFilter[] {
  return snapshot;
}

/* ------------------------------------------------------------------ Budget */

/**
 * Plafond des surfaces réfractantes simultanées.
 *
 * La réfraction se paie à chaque image, et par surface. Mesuré sur la grille
 * des quartiers en 1280 par 900 : dix-sept surfaces réfractantes font tomber le
 * défilement à quinze images par seconde, contre vingt-neuf sans réfraction.
 * En deçà de ce plafond, l'écart devient négligeable.
 *
 * Le plafond ne s'applique qu'aux surfaces différées, c'est-à-dire aux cartes.
 * La chrome flottante, qui est peu nombreuse et toujours à l'écran, n'entre pas
 * en concurrence : sa réfraction est acquise.
 */
const MAX_CONCURRENT = 8;

let used = 0;
const waiting = new Set<() => void>();

/** Tente de réserver une place. Renvoie `false` si le plafond est atteint. */
export function claimRefractionSlot(): boolean {
  if (used >= MAX_CONCURRENT) return false;
  used += 1;
  return true;
}

export function freeRefractionSlot(): void {
  used = Math.max(0, used - 1);
  // Une place se libère : on réveille les surfaces qui attendaient leur tour,
  // typiquement celles qui viennent d'entrer dans le champ pendant que
  // d'autres en sortaient.
  const pending = [...waiting];
  waiting.clear();
  for (const retry of pending) retry();
}

/** S'inscrit pour être rappelé dès qu'une place se libère. */
export function waitForRefractionSlot(retry: () => void): () => void {
  waiting.add(retry);
  return () => waiting.delete(retry);
}
