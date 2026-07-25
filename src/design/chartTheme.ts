/**
 * Habillage commun des graphiques Chart.js.
 *
 * Les couleurs et les graduations sont alignées sur les tokens : un graphique
 * doit se lire comme le reste de la page, pas comme une capture importée d'un
 * autre produit. Les grilles reculent, les axes s'effacent, la donnée reste.
 */

export const CHART_COLORS = {
  accent: '#0e7c88',
  accentSoft: 'rgba(14, 124, 136, 0.12)',
  warm: '#c4503c',
  warmSoft: 'rgba(196, 80, 60, 0.12)',
  success: '#16794b',
  ink: '#16181c',
  inkSecondary: '#5a6068',
  inkTertiary: '#868c95',
  grid: 'rgba(22, 24, 28, 0.07)',
  surface: '#ffffff',
} as const;

/** Séquence catégorielle : au-delà de six séries, un graphique cesse de se lire. */
export const CHART_SERIES = [
  CHART_COLORS.accent,
  CHART_COLORS.warm,
  '#359aa4',
  '#9a6300',
  CHART_COLORS.success,
  '#6bbac1',
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
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
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
