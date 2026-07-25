/**
 * Kartie — utilitaires d'accessibilité partagés par les surfaces modales.
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * Enferme le focus dans un conteneur tant qu'il est monté, puis le rend à
 * l'élément qui avait ouvert la surface. Sans ce retour, l'utilisateur au
 * clavier se retrouve renvoyé en haut du document après chaque fermeture.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const initial =
      container.querySelector<HTMLElement>('[data-autofocus]') ?? focusableWithin(container)[0];
    // Si la surface n'a rien de focusable, on porte le focus sur elle-même
    // pour que les lecteurs d'écran annoncent son contenu.
    (initial ?? container).focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const target = containerRef.current;
      if (!target) return;

      const items = focusableWithin(target);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !target.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [active]);

  return containerRef;
}

/** Ferme sur Échap. Toujours offrir une sortie, jamais piéger l'utilisateur. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handler.current();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

let scrollLockCount = 0;

/**
 * Empêche le document de défiler derrière une surface modale. On compense la
 * largeur de la barre de défilement pour que la page ne se décale pas au
 * moment de l'ouverture — un saut de quelques pixels se voit immédiatement.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    scrollLockCount += 1;
    if (scrollLockCount === 1) {
      const width = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--k-scrollbar-width', `${width}px`);
      document.documentElement.classList.add('k-scroll-locked');
    }

    return () => {
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.documentElement.classList.remove('k-scroll-locked');
        document.documentElement.style.removeProperty('--k-scrollbar-width');
      }
    };
  }, [active]);
}
