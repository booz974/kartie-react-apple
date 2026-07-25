import { useEffect } from 'react';

/**
 * Hauteur occupée par le clavier virtuel, publiée en variable CSS.
 *
 * Le problème qu'elle résout : sur mobile, un élément en `position: fixed` se
 * place par rapport au **viewport de mise en page**, qui ne rétrécit pas à
 * l'ouverture du clavier. Une feuille ancrée en bas d'écran reste donc à sa
 * place, et le clavier vient la recouvrir. On saisit sans voir ce qu'on écrit.
 *
 * `VisualViewport` décrit, lui, la partie réellement visible. L'écart entre les
 * deux est précisément la place prise par le clavier :
 *
 *   inset = hauteur de mise en page − (hauteur visible + décalage vertical)
 *
 * Chrome sur Android sait faire rétrécir le viewport de mise en page, via
 * `interactive-widget=resizes-content` dans la balise viewport, et cette mesure
 * y renvoie alors zéro : les deux mécanismes ne se cumulent pas. Safari sur iOS
 * ignore cette directive, et c'est là que la mesure fait tout le travail.
 */

/**
 * En dessous de ce seuil, l'écart vient d'autre chose que d'un clavier :
 * repli de la barre d'adresse, barre d'outils, arrondis d'affichage. Un vrai
 * clavier occupe au bas mot le quart de l'écran.
 */
const KEYBOARD_MIN = 120;

/**
 * Nombre de surfaces qui observent le clavier. Sans ce décompte, la première à
 * se démonter effacerait la variable sous les pieds des autres, et la mesure
 * ne reviendrait qu'au prochain soubresaut du viewport.
 */
let observers = 0;

export function useVirtualKeyboardInset(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const viewport = window.visualViewport;
    const root = document.documentElement;
    if (!viewport) return;

    observers += 1;

    function sync() {
      if (!viewport) return;
      const gap = root.clientHeight - (viewport.height + viewport.offsetTop);
      const inset = gap > KEYBOARD_MIN ? Math.round(gap) : 0;
      root.style.setProperty('--k-keyboard-inset', `${inset}px`);
    }

    sync();
    // `scroll` autant que `resize` : sur iOS, faire défiler pendant que le
    // clavier est ouvert déplace le viewport visible sans le redimensionner.
    viewport.addEventListener('resize', sync);
    viewport.addEventListener('scroll', sync);

    return () => {
      viewport.removeEventListener('resize', sync);
      viewport.removeEventListener('scroll', sync);
      observers -= 1;
      if (observers === 0) root.style.removeProperty('--k-keyboard-inset');
    };
  }, [active]);
}
