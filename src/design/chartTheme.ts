/**
 * Habillage commun des graphiques Chart.js.
 *
 * Les couleurs viennent des tokens « Lagon » : un graphique doit se lire comme
 * le reste de la page, pas comme une capture importée d'un autre produit. Les
 * barres reprennent le rayon des surfaces, la grille recule, les axes
 * s'effacent, la donnée reste.
 */

export const CHART_COLORS = {
  accent: '#0a8ba0',
  accentSoft: 'rgba(10, 139, 160, 0.16)',
  warm: '#e35a35',
  warmSoft: 'rgba(227, 90, 53, 0.16)',
  success: '#16b364',
  ink: '#12161c',
  inkSecondary: '#454c56',
  inkTertiary: '#626973',
  grid: 'rgba(18, 22, 28, 0.06)',
  surface: '#ffffff',
} as const;

/**
 * Séquence catégorielle : les couleurs de contenu du produit, dans un ordre qui
 * garde deux séries voisines distinguables. Au-delà de sept séries, un
 * graphique cesse de se lire.
 */
export const CHART_SERIES = [
  CHART_COLORS.accent,
  CHART_COLORS.warm,
  '#2e90fa', // actualité
  '#9b5cf6', // réalisation
  '#f08c00', // pétition
  '#16b364', // association
  '#06aec4', // consultation
] as const;

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Inter, system-ui, sans-serif';

/**
 * Options de base. `maintainAspectRatio: false` suppose un conteneur de hauteur
 * fixe, ce qui évite qu'un graphique s'étire indéfiniment sur grand écran.
 */
export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      display: false,
      labels: {
        color: CHART_COLORS.inkSecondary,
        font: { family: FONT_FAMILY, size: 12 },
        usePointStyle: true,
        boxWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: CHART_COLORS.ink,
      titleFont: { family: FONT_FAMILY, size: 12, weight: 600 as const },
      bodyFont: { family: FONT_FAMILY, size: 12 },
      padding: 12,
      cornerRadius: 14,
      displayColors: false,
    },
  },
  /*
   * Les barres reprennent le rayon des surfaces : arrondies sur les quatre
   * coins, jamais collées les unes aux autres, et jamais plus larges qu'une
   * vignette.
   */
  elements: {
    bar: {
      borderRadius: 10,
      borderSkipped: false as const,
    },
    line: {
      tension: 0.35,
      borderWidth: 2.5,
    },
    point: {
      radius: 3,
      hoverRadius: 6,
      borderWidth: 2,
      backgroundColor: CHART_COLORS.surface,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: CHART_COLORS.inkTertiary,
        font: { family: FONT_FAMILY, size: 11 },
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: CHART_COLORS.grid },
      border: { display: false },
      ticks: {
        precision: 0,
        color: CHART_COLORS.inkTertiary,
        font: { family: FONT_FAMILY, size: 11 },
        maxTicksLimit: 5,
      },
    },
  },
} as const;
