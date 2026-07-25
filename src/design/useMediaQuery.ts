import { useEffect, useState } from 'react';

/** S'abonne à une media query et re-rend quand elle bascule. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Le seuil unique du produit : en dessous, l'interface est pensée pour le pouce. */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/** Vrai quand le pointeur est imprécis — le doigt plutôt que la souris. */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
