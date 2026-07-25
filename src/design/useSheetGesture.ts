/**
 * Geste de fermeture par glissement pour les feuilles mobiles.
 *
 * Le suivi est strictement 1:1 avec le doigt, en respectant l'endroit exact où
 * la feuille a été saisie. Au relâchement on projette le momentum pour décider
 * de fermer ou de revenir, puis on passe la vélocité au ressort : il ne doit y
 * avoir aucune couture entre le glissement et l'animation.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  SPRING,
  VelocityTracker,
  animateSpring,
  prefersReducedMotion,
  project,
  rubberband,
  type SpringAnimation,
} from './motion';

type SheetGestureOptions = {
  onDismiss: () => void;
  /** Fraction de la hauteur au-delà de laquelle un relâchement lent ferme. */
  dismissThreshold?: number;
  /** Vélocité (px/s) au-delà de laquelle un lancer ferme quel que soit le point. */
  dismissVelocity?: number;
  enabled?: boolean;
};

export function useSheetGesture({
  onDismiss,
  dismissThreshold = 0.35,
  dismissVelocity = 550,
  enabled = true,
}: SheetGestureOptions) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<SpringAnimation | null>(null);
  const trackerRef = useRef(new VelocityTracker());
  const offsetRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(
    () => () => {
      animationRef.current?.stop();
    },
    [],
  );

  const applyOffset = useCallback((value: number) => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    offsetRef.current = value;
    sheet.style.transform = value === 0 ? '' : `translate3d(0, ${value}px, 0)`;
    // La toile de fond s'éclaircit à mesure que la feuille descend : le
    // mouvement intermédiaire annonce le résultat au lieu d'interpoler à l'aveugle.
    const scrim = sheet.parentElement?.querySelector<HTMLElement>('[data-k-scrim]');
    if (scrim) {
      const height = sheet.offsetHeight || 1;
      const progress = Math.min(1, Math.max(0, value / height));
      scrim.style.opacity = String(1 - progress * 0.75);
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return;
      const sheet = sheetRef.current;
      if (!sheet) return;

      // Une animation en cours peut être rattrapée en vol : on la stoppe sur
      // place, sans revenir à sa cible, et on repart de la valeur affichée.
      animationRef.current?.stop();
      animationRef.current = null;

      draggingRef.current = true;
      startYRef.current = event.clientY - offsetRef.current;
      trackerRef.current.reset();
      trackerRef.current.add(event.clientY);

      event.currentTarget.setPointerCapture(event.pointerId);
      sheet.style.willChange = 'transform';
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      trackerRef.current.add(event.clientY);

      const sheet = sheetRef.current;
      if (!sheet) return;

      const raw = event.clientY - startYRef.current;
      if (raw >= 0) {
        applyOffset(raw);
      } else {
        // Vers le haut il n'y a rien de plus : on résiste progressivement au
        // lieu de bloquer net.
        applyOffset(-rubberband(-raw, sheet.offsetHeight || 1));
      }
    },
    [applyOffset],
  );

  const settle = useCallback(
    (velocity: number) => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      sheet.style.willChange = '';

      const height = sheet.offsetHeight || 1;
      const current = offsetRef.current;
      // On décide à partir de l'endroit où le geste *allait*, pas de celui où
      // le doigt s'est levé.
      const projected = current + project(velocity);
      const shouldDismiss =
        velocity > dismissVelocity || projected > height * dismissThreshold;

      if (shouldDismiss) {
        if (prefersReducedMotion()) {
          dismissRef.current();
          return;
        }
        animationRef.current = animateSpring({
          from: current,
          to: height,
          velocity,
          config: SPRING.smooth,
          onUpdate: applyOffset,
          onRest: () => dismissRef.current(),
        });
        return;
      }

      animationRef.current = animateSpring({
        from: current,
        to: 0,
        velocity,
        // Le geste portait de l'élan : un léger dépassement au retour se lit
        // comme physique, là où il paraîtrait gratuit sur une simple ouverture.
        config: SPRING.bounce,
        onUpdate: applyOffset,
      });
    },
    [applyOffset, dismissThreshold, dismissVelocity],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      trackerRef.current.add(event.clientY);
      settle(trackerRef.current.velocity);
    },
    [settle],
  );

  const handleProps = enabled
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
      }
    : {};

  return { sheetRef, handleProps };
}
