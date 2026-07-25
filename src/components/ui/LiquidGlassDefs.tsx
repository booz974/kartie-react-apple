/**
 * Filtres SVG du verre liquide.
 *
 * Le matériau d'Apple ne se contente pas de flouter : sur son pourtour, il
 * **réfracte** ce qui passe derrière, comme le bord épais d'une lentille. On
 * reproduit cela avec une carte de déplacement étirée à la taille de
 * l'élément : neutre au centre, divergente sur les bords.
 *
 * `feDisplacementMap` lit un décalage par canal, avec
 * `décalage = échelle × (canal / 255 − 0,5)`. Un canal à 128 ne déplace donc
 * rien : on s'en sert comme axe inerte pour traiter X puis Y séparément, ce qui
 * évite d'avoir à encoder les deux axes dans une seule image.
 *
 * L'ensemble est une amélioration progressive : `backdrop-filter: url()` n'est
 * honoré que par les navigateurs Chromium, et partout ailleurs la surface
 * reste le verre dépoli, qui se suffit à lui-même.
 */

/** Rampe neutre au centre, divergente aux extrémités, sur un seul canal. */
function displacementMap(axis: 'x' | 'y'): string {
  const horizontal = axis === 'x';
  // Canal actif : R pour l'axe horizontal, G pour l'axe vertical. Les deux
  // autres restent à 128, donc inertes.
  const start = horizontal ? 'rgb(255,128,128)' : 'rgb(128,255,128)';
  const end = horizontal ? 'rgb(0,128,128)' : 'rgb(128,0,128)';
  const coords = horizontal ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="g" ${coords}><stop offset="0%" stop-color="${start}"/><stop offset="16%" stop-color="rgb(128,128,128)"/><stop offset="84%" stop-color="rgb(128,128,128)"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

type LiquidFilterProps = {
  id: string;
  /** Amplitude de la réfraction, en pixels au bord. */
  scale: number;
};

function LiquidFilter({ id, scale }: LiquidFilterProps) {
  return (
    <filter
      id={id}
      x="-8%"
      y="-8%"
      width="116%"
      height="116%"
      colorInterpolationFilters="sRGB"
    >
      <feImage href={displacementMap('x')} result="mapX" preserveAspectRatio="none" />
      <feDisplacementMap
        in="SourceGraphic"
        in2="mapX"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="B"
        result="bentX"
      />
      <feImage href={displacementMap('y')} result="mapY" preserveAspectRatio="none" />
      <feDisplacementMap
        in="bentX"
        in2="mapY"
        scale={scale}
        xChannelSelector="B"
        yChannelSelector="G"
      />
    </filter>
  );
}

/**
 * Monté une seule fois au niveau de l'application : les filtres sont référencés
 * par identifiant depuis le CSS, ils n'ont pas besoin d'exister près de chaque
 * surface.
 */
export default function LiquidGlassDefs() {
  return (
    <svg aria-hidden="true" focusable="false" className="k-visually-hidden">
      <defs>
        {/* Trois amplitudes : la chrome affleure, les cartes creusent un peu,
            les feuilles et modales assument une vraie épaisseur. */}
        <LiquidFilter id="k-liquid-thin" scale={18} />
        <LiquidFilter id="k-liquid" scale={34} />
        <LiquidFilter id="k-liquid-thick" scale={54} />
      </defs>
    </svg>
  );
}
