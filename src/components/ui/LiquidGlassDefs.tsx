import { useSyncExternalStore } from 'react';
import {
  getLiquidFilters,
  subscribeLiquidFilters,
  type LiquidFilter,
} from '@/design/liquidFilters';

/**
 * Définitions des filtres de verre liquide, montées une seule fois.
 *
 * Chaque géométrie distincte produit un filtre, et toutes les surfaces de mêmes
 * dimensions s'y réfèrent. Une grille de vingt cartes n'ajoute donc qu'une
 * définition, pas vingt.
 */

function Refraction({ filter }: { filter: LiquidFilter }) {
  const { id, width, height, map, bezel, chromatic } = filter;

  // L'échelle vaut l'épaisseur du biseau : la carte encode une amplitude
  // normalisée, c'est l'échelle qui la ramène en pixels. Positive, parce que le
  // vecteur encodé pointe déjà vers le centre.
  const scale = bezel;

  return (
    // `sRGB` est obligatoire : sans lui le navigateur applique une correction
    // gamma aux canaux avant de les lire comme des décalages, et le neutre
    // cesse d'être neutre.
    <filter
      id={id}
      colorInterpolationFilters="sRGB"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
    >
      <feImage
        result="map"
        x="0"
        y="0"
        width={width}
        height={height}
        preserveAspectRatio="none"
        href={map}
      />

      {chromatic ? (
        <>
          {/* Le verre disperse : chaque longueur d'onde est déviée d'un angle
              légèrement différent. Un écart de quelques pour cent suffit à
              faire apparaître une frange colorée sur la tranche ; au delà,
              l'image paraît simplement déréglée. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="pass-r"
          />
          <feColorMatrix
            in="pass-r"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="only-r"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={scale * 1.07}
            xChannelSelector="R"
            yChannelSelector="G"
            result="pass-g"
          />
          <feColorMatrix
            in="pass-g"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="only-g"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={scale * 1.035}
            xChannelSelector="R"
            yChannelSelector="G"
            result="pass-b"
          />
          <feColorMatrix
            in="pass-b"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="only-b"
          />
          <feBlend in="only-r" in2="only-g" mode="screen" result="rg" />
          <feBlend in="rg" in2="only-b" mode="screen" />
        </>
      ) : (
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      )}
    </filter>
  );
}

export default function LiquidGlassDefs() {
  const filters = useSyncExternalStore(
    subscribeLiquidFilters,
    getLiquidFilters,
    getLiquidFilters,
  );

  if (filters.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={0}
      height={0}
      style={{ position: 'absolute', overflow: 'hidden' }}
    >
      <defs>
        {filters.map((filter) => (
          <Refraction key={filter.id} filter={filter} />
        ))}
      </defs>
    </svg>
  );
}
