/* eslint-env node */
/**
 * Tailwind ne définit aucune valeur ici : il expose les tokens de
 * src/design/tokens.css sous forme d'utilitaires. Une couleur, un rayon ou une
 * ombre se change à un seul endroit, et le changement se propage aux classes
 * utilitaires comme aux composants.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  /*
   * Le preflight est désactivé : il s'insérait après les fondations Kartie et
   * les écrasait. src/design/base.css assure le reset, y compris ce dont les
   * utilitaires dépendent (`border: 0 solid` pour que `border-t` dessine).
   */
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        canvas: 'var(--k-canvas)',
        'canvas-sunken': 'var(--k-canvas-sunken)',
        surface: {
          DEFAULT: 'var(--k-surface)',
          secondary: 'var(--k-surface-secondary)',
          tertiary: 'var(--k-surface-tertiary)',
        },
        ink: {
          DEFAULT: 'var(--k-ink)',
          secondary: 'var(--k-ink-secondary)',
          tertiary: 'var(--k-ink-tertiary)',
          quaternary: 'var(--k-ink-quaternary)',
          // Encre posée sur une surface accentuée : elle suit l'accent si
          // celui-ci change, là où un `text-white` figé ne suivrait pas.
          'on-accent': 'var(--k-ink-on-accent)',
          'on-warm': 'var(--k-ink-on-warm)',
        },
        accent: {
          DEFAULT: 'var(--k-accent)',
          hover: 'var(--k-accent-hover)',
          soft: 'var(--k-accent-soft)',
          50: 'var(--k-accent-50)',
          100: 'var(--k-accent-100)',
          200: 'var(--k-accent-200)',
          300: 'var(--k-accent-300)',
          400: 'var(--k-accent-400)',
        },
        warm: {
          DEFAULT: 'var(--k-warm)',
          soft: 'var(--k-warm-soft)',
          50: 'var(--k-warm-50)',
          100: 'var(--k-warm-100)',
          200: 'var(--k-warm-200)',
        },
        success: 'var(--k-success)',
        'success-soft': 'var(--k-success-soft)',
        warning: 'var(--k-warning)',
        'warning-soft': 'var(--k-warning-soft)',
        danger: 'var(--k-danger)',
        'danger-soft': 'var(--k-danger-soft)',
        separator: 'var(--k-separator)',
        'separator-strong': 'var(--k-separator-strong)',
      },
      fontFamily: {
        sans: 'var(--k-font-sans)',
        mono: 'var(--k-font-mono)',
      },
      borderRadius: {
        xs: 'var(--k-radius-xs)',
        sm: 'var(--k-radius-sm)',
        md: 'var(--k-radius-md)',
        lg: 'var(--k-radius-lg)',
        xl: 'var(--k-radius-xl)',
        '2xl': 'var(--k-radius-2xl)',
      },
      boxShadow: {
        xs: 'var(--k-shadow-xs)',
        sm: 'var(--k-shadow-sm)',
        DEFAULT: 'var(--k-shadow-sm)',
        md: 'var(--k-shadow-md)',
        lg: 'var(--k-shadow-lg)',
        xl: 'var(--k-shadow-xl)',
      },
      transitionTimingFunction: {
        'spring-snap': 'var(--k-spring-snap)',
        'spring-smooth': 'var(--k-spring-smooth)',
        'spring-bounce': 'var(--k-spring-bounce)',
        'ease-out': 'var(--k-ease-out)',
      },
      maxWidth: {
        measure: 'var(--k-measure)',
        page: 'var(--k-page-max)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
