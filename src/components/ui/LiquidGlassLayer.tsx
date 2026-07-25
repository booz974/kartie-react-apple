import { useEffect, useId, useRef, useState } from 'react';
import { buildDisplacementMap, supportsBackdropRefraction } from '@/design/displacementMap';
import { useMediaQuery } from '@/design/useMediaQuery';

/**
 * Couche de réfraction du verre liquide.
 *
 * Le verre dépoli floute ce qui passe derrière ; le verre d'Apple le **courbe**
 * sur son pourtour, comme la tranche épaisse d'une lentille. C'est cette
 * déviation, et elle seule, qui sépare les deux matériaux à l'oeil.
 *
 * Le composant se pose en enfant absolu d'un hôte positionné, mesure la taille
 * réelle de cet hôte, fabrique une carte de déplacement à ses dimensions puis
 * l'applique par `backdrop-filter`. La mesure n'est pas un luxe : `feImage`
 * étire sa carte à la région du filtre, donc une carte aux mauvaises
 * dimensions décale le biseau par rapport au bord visible, et la réfraction
 * cesse de coïncider avec la forme.
 *
 * Le coût est réel, une passe GPU par surface, aussi la réserve-t-on à la
 * chrome flottante : barre supérieure, barre d'onglets, modales, menus. Apple
 * fait le même choix, et pour la même raison : le verre est la couche de
 * commande qui survole le contenu, pas le contenu lui-même.
 */

type LiquidGlassLayerProps = {
  /**
   * Épaisseur de la bande réfractante, en pixels. Au delà du rayon de l'angle,
   * le biseau déborde sur la face plane et le verre paraît bombé.
   */
  bezel?: number;
  /** Flou de fond, en pixels. */
  blur?: number;
  /**
   * Dispersion des longueurs d'onde. Trois passes au lieu d'une : réservé aux
   * surfaces dont le fond ne défile pas, car le filtre est recalculé à chaque
   * changement de ce qui passe derrière.
   */
  chromatic?: boolean;
  /** Teinte propre du verre. Par défaut, celle héritée de l'hôte. */
  tint?: string;
  className?: string;
};

/** Dimensions et rayon effectivement mesurés sur l'hôte. */
type Geometry = { width: number; height: number; radius: number };

/**
 * Les dimensions sont arrondies avant d'entrer dans le cache : sans cela, un
 * redimensionnement continu produirait une carte par pixel parcouru.
 */
function quantize(value: number): number {
  return Math.max(8, Math.round(value / 4) * 4);
}

export default function LiquidGlassLayer({
  bezel = 18,
  blur = 14,
  chromatic = false,
  tint,
  className,
}: LiquidGlassLayerProps) {
  const rawId = useId();
  const filterId = `k-liquid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  const ref = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [map, setMap] = useState<string | null>(null);

  // La transparence réduite et le contraste renforcé demandent une surface
  // franche : dans ce cas le matériau disparaît entièrement.
  const plain = useMediaQuery(
    '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
  );

  useEffect(() => {
    const element = ref.current;
    if (!element || plain || !supportsBackdropRefraction()) {
      setGeometry(null);
      return;
    }

    function measure() {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;

      // `border-radius: inherit` est résolu par le navigateur en pixels : on
      // relit la valeur utilisée plutôt que de la redemander en propriété, ce
      // qui garderait les deux réglages à synchroniser à la main.
      const radiusRaw = getComputedStyle(node).borderTopLeftRadius;
      const parsed = Number.parseFloat(radiusRaw);
      const width = quantize(rect.width);
      const height = quantize(rect.height);
      const radius = Number.isFinite(parsed)
        ? Math.min(parsed, Math.min(width, height) / 2)
        : 0;

      setGeometry((previous) =>
        previous &&
        previous.width === width &&
        previous.height === height &&
        previous.radius === radius
          ? previous
          : { width, height, radius },
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [plain]);

  useEffect(() => {
    if (!geometry) {
      setMap(null);
      return;
    }
    // Le biseau ne peut pas dépasser la demi-épaisseur, sinon les deux bords
    // opposés se recouvrent et la surface entière se met à onduler.
    const limit = Math.min(geometry.width, geometry.height) / 2;
    setMap(
      buildDisplacementMap({
        width: geometry.width,
        height: geometry.height,
        radius: geometry.radius,
        bezel: Math.min(bezel, limit),
      }),
    );
  }, [geometry, bezel]);

  const active = Boolean(geometry && map);
  // L'échelle vaut l'épaisseur du biseau : la carte encode une amplitude
  // normalisée, c'est l'échelle qui la ramène en pixels. Positive, parce que le
  // vecteur encodé pointe déjà vers le centre.
  const scale = geometry ? Math.min(bezel, Math.min(geometry.width, geometry.height) / 2) : 0;

  // L'hôte a délégué son flou à cette couche : elle doit donc le porter même
  // quand la réfraction n'est pas disponible, sinon la chrome deviendrait
  // franchement transparente sur les navigateurs non Chromium.
  const filterValue = plain
    ? undefined
    : active
      ? `blur(${blur}px) url(#${filterId}) saturate(180%) brightness(1.04)`
      : `blur(${blur}px) saturate(180%)`;

  return (
    <>
      {active && geometry && map ? (
        <svg
          aria-hidden="true"
          focusable="false"
          width={0}
          height={0}
          style={{ position: 'absolute', overflow: 'hidden' }}
        >
          <defs>
            {/* `sRGB` est obligatoire : sans lui le navigateur applique une
                correction gamma aux canaux avant de les lire comme des
                décalages, et le neutre cesse d'être neutre. */}
            <filter
              id={filterId}
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
                width={geometry.width}
                height={geometry.height}
                preserveAspectRatio="none"
                href={map}
              />

              {chromatic ? (
                <>
                  {/* Le verre disperse : chaque longueur d'onde est déviée d'un
                      angle légèrement différent. Un écart de quelques pour cent
                      suffit à faire apparaître une frange colorée sur la
                      tranche ; au delà, l'image paraît simplement déréglée. */}
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
          </defs>
        </svg>
      ) : null}

      {/* Couche 0 : réfraction. Elle porte aussi le flou, pour que l'hôte n'ait
          pas un second `backdrop-filter` qui doublerait le coût. */}
      <span
        ref={ref}
        aria-hidden="true"
        className={['k-liquid-refract', className].filter(Boolean).join(' ')}
        style={{
          backdropFilter: filterValue,
          WebkitBackdropFilter: filterValue,
        }}
      />

      {/* Couche 1 : teinte propre du matériau. */}
      <span
        aria-hidden="true"
        className="k-liquid-tint"
        style={tint ? { background: tint } : undefined}
      />

      {/* Couche 2 : lumière sur la tranche. */}
      <span aria-hidden="true" className="k-liquid-specular" />
    </>
  );
}
