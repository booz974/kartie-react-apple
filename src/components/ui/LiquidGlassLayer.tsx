import { useEffect, useRef, useState } from 'react';
import {
  acquireLiquidFilter,
  claimRefractionSlot,
  freeRefractionSlot,
  releaseLiquidFilter,
  waitForRefractionSlot,
  type LiquidSpec,
} from '@/design/liquidFilters';
import { supportsBackdropRefraction } from '@/design/displacementMap';
import { useMediaQuery } from '@/design/useMediaQuery';

/**
 * Couche de réfraction du verre liquide.
 *
 * Le verre dépoli floute ce qui passe derrière ; le verre d'Apple le **courbe**
 * sur son pourtour, comme la tranche épaisse d'une lentille. C'est cette
 * déviation, et elle seule, qui sépare les deux matériaux à l'oeil.
 *
 * Le composant se pose en enfant absolu d'un hôte positionné, mesure la taille
 * réelle de cet hôte, réserve un filtre à ces dimensions puis l'applique par
 * `backdrop-filter`. La mesure n'est pas un luxe : `feImage` étire sa carte à
 * la région du filtre, donc une carte aux mauvaises dimensions décale le biseau
 * par rapport au bord visible, et la réfraction cesse de coïncider avec la
 * forme.
 *
 * Deux mécanismes tiennent le coût : les filtres sont partagés entre surfaces
 * de mêmes dimensions, et `lazy` limite la réfraction aux surfaces proches du
 * champ visible. Sur une liste longue, la dépense reste celle d'un écran, quel
 * que soit le nombre d'éléments.
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
  /**
   * N'active la réfraction qu'aux abords du champ visible. Indispensable dès
   * qu'une page peut en aligner plus d'une poignée.
   */
  lazy?: boolean;
  /** Teinte propre du verre. Par défaut, celle héritée de l'hôte. */
  tint?: string;
  /**
   * L'hôte porte déjà sa propre tranche lumineuse : inutile d'en superposer une
   * seconde, qui doublerait le liseré.
   */
  rim?: boolean;
  className?: string;
};

/**
 * Les dimensions sont arrondies avant d'entrer dans le registre : sans cela un
 * redimensionnement continu produirait un filtre par pixel parcouru, et deux
 * cartes d'une même grille ne partageraient pas le leur pour un écart d'un
 * pixel de hauteur.
 */
function quantize(value: number): number {
  return Math.max(8, Math.round(value / 8) * 8);
}

/**
 * Marge d'anticipation : le verre est prêt un peu avant d'entrer dans le champ,
 * mais pas au point d'allumer un écran entier de cartes qu'on ne verra jamais.
 */
const LAZY_MARGIN = '80px';

/** Une carte à peine effleurée par le bord de l'écran ne mérite pas sa place. */
const LAZY_THRESHOLD = 0.2;

export default function LiquidGlassLayer({
  bezel = 18,
  blur = 14,
  chromatic = false,
  lazy = false,
  tint,
  rim = true,
  className,
}: LiquidGlassLayerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [spec, setSpec] = useState<LiquidSpec | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [near, setNear] = useState(!lazy);
  // Une surface différée n'obtient sa réfraction que si le budget global le
  // permet ; sinon elle reste du verre dépoli, ce qui ne se remarque pas sur
  // une carte mais se remarquerait beaucoup au défilement.
  const [granted, setGranted] = useState(!lazy);

  // La transparence réduite et le contraste renforcé demandent une surface
  // franche : dans ce cas le matériau disparaît entièrement.
  const plain = useMediaQuery(
    '(prefers-reduced-transparency: reduce), (prefers-contrast: more)',
  );

  // Proximité du champ visible. Observé sur l'hôte, pas sur la couche, pour que
  // la mesure reste valable même quand la couche n'a pas encore de filtre.
  useEffect(() => {
    if (!lazy) {
      setNear(true);
      return;
    }
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (records) =>
        setNear(
          records.some(
            (record) =>
              record.isIntersecting && record.intersectionRatio >= LAZY_THRESHOLD,
          ),
        ),
      { rootMargin: LAZY_MARGIN, threshold: [0, LAZY_THRESHOLD, 1] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [lazy]);

  // Réservation d'une place dans le budget global, tant que la surface est à
  // portée du champ visible.
  useEffect(() => {
    if (!lazy) {
      setGranted(true);
      return;
    }
    if (!near || plain || !supportsBackdropRefraction()) {
      setGranted(false);
      return;
    }

    let held = false;
    let unwait: (() => void) | undefined;

    function attempt() {
      if (held) return;
      if (claimRefractionSlot()) {
        held = true;
        setGranted(true);
      } else {
        // Plafond atteint : on se met en file plutôt que de réessayer en
        // boucle, ce qui coûterait précisément ce qu'on cherche à économiser.
        unwait = waitForRefractionSlot(attempt);
      }
    }

    attempt();

    return () => {
      unwait?.();
      if (held) freeRefractionSlot();
      setGranted(false);
    };
  }, [lazy, near, plain]);

  useEffect(() => {
    const element = ref.current;
    if (!element || plain || !granted || !supportsBackdropRefraction()) {
      setSpec(null);
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
      const parsed = Number.parseFloat(getComputedStyle(node).borderTopLeftRadius);
      const width = quantize(rect.width);
      const height = quantize(rect.height);
      const half = Math.min(width, height) / 2;
      const radius = Number.isFinite(parsed) ? Math.min(parsed, half) : 0;

      const next: LiquidSpec = {
        width,
        height,
        radius,
        // Le biseau ne peut pas dépasser la demi-épaisseur, sinon les deux
        // bords opposés se recouvrent et la surface entière se met à onduler.
        bezel: Math.min(bezel, half),
        chromatic,
      };

      setSpec((previous) =>
        previous &&
        previous.width === next.width &&
        previous.height === next.height &&
        previous.radius === next.radius &&
        previous.bezel === next.bezel &&
        previous.chromatic === next.chromatic
          ? previous
          : next,
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [plain, granted, bezel, chromatic]);

  // Réservation du filtre partagé, rendue à la sortie du champ ou au démontage.
  useEffect(() => {
    if (!spec) {
      setFilterId(null);
      return;
    }
    const id = acquireLiquidFilter(spec);
    setFilterId(id);
    return () => releaseLiquidFilter(spec);
  }, [spec]);

  // L'hôte a délégué son flou à cette couche : elle doit donc le porter même
  // quand la réfraction n'est pas disponible, sinon la chrome deviendrait
  // franchement transparente sur les navigateurs non Chromium.
  const filterValue = plain
    ? undefined
    : filterId
      ? `blur(${blur}px) url(#${filterId}) saturate(180%) brightness(1.04)`
      : `blur(${blur}px) saturate(180%)`;

  return (
    <>
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
      {rim ? <span aria-hidden="true" className="k-liquid-specular" /> : null}
    </>
  );
}
