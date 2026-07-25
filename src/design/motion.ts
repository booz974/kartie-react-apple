/**
 * Kartie — moteur de mouvement.
 *
 * Les transitions non gestuelles utilisent les courbes `linear()` de
 * tokens.css et ne coûtent aucun JS. Ce module sert le reste : tout ce qu'un
 * doigt peut attraper, et qui doit donc partir de la valeur affichée, hériter
 * de la vélocité du geste et rester interruptible à tout instant.
 */

import { useEffect, useRef, useState } from 'react';

/** Paramètres façon Apple : amortissement (dépassement) + réponse (rapidité). */
export type SpringConfig = {
  /** 1 = amorti critique, aucun rebond. En dessous, la valeur dépasse la cible. */
  damping: number;
  /** Temps caractéristique d'approche de la cible, en secondes. */
  response: number;
};

export const SPRING = {
  /** Micro-interactions : bascule, onglet, sélection. */
  snap: { damping: 1, response: 0.28 },
  /** Surfaces et panneaux. Le défaut du produit. */
  smooth: { damping: 1, response: 0.4 },
  /** Grands déplacements, à utiliser avec parcimonie. */
  gentle: { damping: 1, response: 0.55 },
  /** Réservé aux gestes qui portaient déjà de l'élan : lancer, glisser-relâcher. */
  bounce: { damping: 0.72, response: 0.38 },
} as const satisfies Record<string, SpringConfig>;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** S'abonne à la préférence de mouvement réduit et re-rend quand elle change. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Projection du momentum — où le geste allait-il s'arrêter ?
 *
 * On ne s'accroche pas au point le plus proche du relâchement mais du point
 * projeté : c'est ce qui donne à un lancer la sensation de lancer. Forme à
 * décroissance exponentielle, celle du défilement inertiel — pas la formule
 * v²/2a des manuels.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Résistance progressive au-delà d'une limite. Un arrêt net se lit comme un
 * gel ; une résistance qui croît se lit comme « il n'y a rien de plus ici ».
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension === 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Renvoie la valeur d'accroche la plus proche d'un point donné. */
export function nearestSnapPoint(value: number, points: readonly number[]): number {
  let best = points[0] ?? value;
  let bestDistance = Math.abs(value - best);
  for (const point of points) {
    const distance = Math.abs(value - point);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Suit un court historique de positions horodatées pour estimer la vélocité au
 * relâchement. Le dernier `pointermove` seul est trop bruité pour ça.
 */
export class VelocityTracker {
  private samples: { value: number; time: number }[] = [];
  private readonly window: number;

  constructor(windowMs = 100) {
    this.window = windowMs;
  }

  add(value: number, time = performance.now()): void {
    this.samples.push({ value, time });
    const cutoff = time - this.window;
    while (this.samples.length > 2 && this.samples[0].time < cutoff) {
      this.samples.shift();
    }
  }

  /** Vélocité en unités par seconde. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const elapsed = last.time - first.time;
    if (elapsed <= 0) return 0;
    return ((last.value - first.value) / elapsed) * 1000;
  }

  reset(): void {
    this.samples = [];
  }
}

export type SpringAnimation = {
  /** Arrête l'animation en place, sans revenir ni sauter. */
  stop: () => void;
  /**
   * Redirige vers une nouvelle cible en conservant position **et** vélocité
   * courantes. C'est ce qui évite le « mur » ressenti à l'inversion d'un geste.
   */
  retarget: (next: number) => void;
  /** Valeur affichée à l'instant présent. */
  readonly value: number;
  readonly velocity: number;
  readonly done: boolean;
};

type SpringOptions = {
  from: number;
  to: number;
  velocity?: number;
  config?: SpringConfig;
  onUpdate: (value: number, velocity: number) => void;
  onRest?: () => void;
  restDistance?: number;
  restVelocity?: number;
};

/**
 * Anime une valeur scalaire avec un ressort, en solution analytique de
 * l'oscillateur amorti — exact, sans accumulation d'erreur d'intégration, et
 * capable de démarrer depuis n'importe quel couple (position, vélocité).
 *
 * Un mouvement en deux dimensions se décompose en deux ressorts indépendants :
 * un ressort unique sur la distance se désynchronise dès que X et Y n'ont pas
 * la même vélocité.
 */
export function animateSpring({
  from,
  to,
  velocity = 0,
  config = SPRING.smooth,
  onUpdate,
  onRest,
  restDistance = 0.1,
  restVelocity = 2,
}: SpringOptions): SpringAnimation {
  const reduced = prefersReducedMotion();

  let target = to;
  let currentValue = from;
  let currentVelocity = velocity;
  let frame = 0;
  let done = false;

  // Origine analytique du segment courant : chaque redirection en ouvre un
  // nouveau à partir de l'état affiché.
  let originValue = from;
  let originVelocity = velocity;
  let originTime = 0;

  const omega = (2 * Math.PI) / config.response;
  const zeta = config.damping;

  function evaluate(elapsedSeconds: number): { value: number; velocity: number } {
    const x0 = originValue - target;
    const v0 = originVelocity;
    const t = elapsedSeconds;

    if (zeta >= 1) {
      const decay = Math.exp(-omega * t);
      const c = v0 + omega * x0;
      const x = (x0 + c * t) * decay;
      const v = decay * (c - omega * x0 - omega * c * t);
      return { value: target + x, velocity: v };
    }

    const alpha = zeta * omega;
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-alpha * t);
    const a = x0;
    const b = (v0 + alpha * x0) / omegaD;
    const cos = Math.cos(omegaD * t);
    const sin = Math.sin(omegaD * t);
    const x = decay * (a * cos + b * sin);
    const v = decay * ((-alpha * a + b * omegaD) * cos + (-alpha * b - a * omegaD) * sin);
    return { value: target + x, velocity: v };
  }

  function finish() {
    done = true;
    currentValue = target;
    currentVelocity = 0;
    onUpdate(target, 0);
    onRest?.();
  }

  // Mouvement réduit : on rejoint la valeur finale sans trajectoire, mais le
  // changement d'état reste bien signalé par l'opacité côté CSS.
  if (reduced) {
    queueMicrotask(finish);
    return {
      stop: () => {
        done = true;
      },
      retarget: (next) => {
        target = next;
        finish();
      },
      get value() {
        return currentValue;
      },
      get velocity() {
        return currentVelocity;
      },
      get done() {
        return done;
      },
    };
  }

  function tick(now: number) {
    if (done) return;
    if (originTime === 0) originTime = now;
    const elapsed = (now - originTime) / 1000;
    const next = evaluate(elapsed);
    currentValue = next.value;
    currentVelocity = next.velocity;

    if (
      Math.abs(currentValue - target) < restDistance &&
      Math.abs(currentVelocity) < restVelocity
    ) {
      finish();
      return;
    }

    onUpdate(currentValue, currentVelocity);
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);

  return {
    stop() {
      done = true;
      cancelAnimationFrame(frame);
    },
    retarget(next: number) {
      if (next === target) return;
      // On repart de l'état *affiché*, jamais de la valeur logique : c'est la
      // condition pour qu'une interruption ne provoque aucun saut visible.
      originValue = currentValue;
      originVelocity = currentVelocity;
      originTime = 0;
      target = next;
      if (done) {
        done = false;
        frame = requestAnimationFrame(tick);
      }
    },
    get value() {
      return currentValue;
    },
    get velocity() {
      return currentVelocity;
    },
    get done() {
      return done;
    },
  };
}

/**
 * Pilote une valeur scalaire par ressort et applique le résultat à un élément.
 * Une seule animation vit à la fois : redéfinir la cible redirige celle qui est
 * en cours plutôt que d'en empiler une nouvelle.
 */
export function useSpringRef<T extends HTMLElement>(
  initial: number,
  apply: (element: T, value: number) => void,
) {
  const elementRef = useRef<T | null>(null);
  const animationRef = useRef<SpringAnimation | null>(null);
  const valueRef = useRef(initial);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(
    () => () => {
      animationRef.current?.stop();
    },
    [],
  );

  function set(next: number, config: SpringConfig = SPRING.smooth, velocity?: number) {
    const element = elementRef.current;
    if (!element) {
      valueRef.current = next;
      return;
    }

    if (animationRef.current && !animationRef.current.done && velocity === undefined) {
      animationRef.current.retarget(next);
      return;
    }

    animationRef.current?.stop();
    animationRef.current = animateSpring({
      from: valueRef.current,
      to: next,
      velocity,
      config,
      onUpdate: (value) => {
        valueRef.current = value;
        const target = elementRef.current;
        if (target) applyRef.current(target, value);
      },
    });
  }

  /** Écrit une valeur immédiatement, sans animation — pour le suivi 1:1. */
  function setImmediate(next: number) {
    animationRef.current?.stop();
    valueRef.current = next;
    const element = elementRef.current;
    if (element) applyRef.current(element, next);
  }

  return { ref: elementRef, set, setImmediate, valueRef, animationRef };
}
