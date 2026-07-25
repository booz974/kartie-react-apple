import LiquidGlassLayer from './LiquidGlassLayer';

/**
 * Verre liquide d'une carte, en un seul réglage.
 *
 * Une page peut en aligner vingt, d'où trois écarts avec la chrome flottante :
 * biseau plus court, car une carte est un objet mince ; flou plus faible, moins
 * coûteux à chaque image ; et surtout activation différée, la réfraction ne
 * s'allumant qu'aux abords du champ visible. La tranche vient du `box-shadow`
 * de la carte, inutile d'en superposer une seconde.
 *
 * Pose-le en **premier enfant** d'un élément portant `k-card k-liquid-host`.
 * Les deux vont ensemble : la classe seule rendrait la carte transparente,
 * puisqu'elle cède son fond et son flou à une couche qui n'existerait pas.
 */
export default function CardGlass() {
  return <LiquidGlassLayer lazy bezel={16} blur={12} rim={false} />;
}
