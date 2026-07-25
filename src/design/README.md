# Système visuel Kartie — « Lagon »

Direction : un canevas clair et calme, une hiérarchie portée par la
typographie, l'espacement et des filets discrets plutôt que par des cartes
empilées, un accent unique réservé à l'interactif, et de la translucidité
uniquement là où une surface flotte réellement au-dessus du contenu.

## Où vivent les choses

| Fichier | Rôle |
| --- | --- |
| `tokens.css` | Source unique : couleur, typographie, espace, rayons, ombres, matériaux, ressorts |
| `base.css` | Reset (le preflight Tailwind est désactivé) + classes typographiques et matériaux |
| `components.css` | Classes des primitives (`k-btn`, `k-card`, `k-input`, `k-modal`, `k-toast`…) |
| `motion.ts` | Ressorts interruptibles, reprise de vélocité, projection du momentum, rubber-banding |
| `useSheetGesture.ts` | Glisser-pour-fermer des feuilles mobiles |
| `a11y.ts` | Piège à focus, verrou de défilement, échappement |
| `chartTheme.ts` | Habillage Chart.js aligné sur les tokens |
| `../components/ui/` | Primitives React |

## Règles qui ne se négocient pas

**Aucune valeur en dur.** Les couleurs passent par les utilitaires mappés sur
les tokens (`text-ink`, `bg-surface`, `text-accent`, `border-separator`…) ou par
les classes `k-ink*`. Aucune couleur de la palette Tailwind par défaut
(`text-slate-800`, `bg-blue-600`…) ne doit réapparaître.

**Pas de `@layer` Tailwind pour les primitives.** Tailwind élague ces couches
en se fiant aux chaînes littérales trouvées dans les sources : les classes
composées à l'exécution (`k-btn--${variant}`) y disparaîtraient silencieusement.
C'est pourquoi `tailwind.css` importe les fichiers du design system *avant* les
directives `@tailwind`, et que le preflight est désactivé au profit du reset
maison.

**La translucidité a une fonction.** `k-material-chrome`, `k-material-sheet` et
`k-material-popover` ne s'emploient que sur une surface sous laquelle du contenu
défile vraiment. Jamais deux surfaces translucides superposées.

**Les cartes se méritent.** Par défaut, on structure avec `k-list`,
`k-hairline-top`, l'espacement et les paliers typographiques. Une `Surface` ne
sert que si le bloc doit réellement se détacher du canevas.

**L'accent chaud est rare.** `--k-warm` est réservé aux moments de
participation : progression d'une pétition, consultation ouverte. Partout
ailleurs, l'accent teal.

## Typographie

Les paliers associent taille, interlignage **et** approche — la hiérarchie naît
de l'ensemble, jamais de la taille seule : `k-display`, `k-title-large`,
`k-title-1/2/3`, `k-callout`, `k-body`, `k-subhead`, `k-footnote`, `k-caption`,
`k-eyebrow`. Tout est en `rem` pour que la mise en page grandisse avec le
réglage de taille de texte de l'utilisateur.

## Mouvement

Les transitions non gestuelles utilisent les courbes `linear()` de `tokens.css`
(`--k-spring-snap`, `--k-spring-smooth`, `--k-spring-bounce`) : le rendu d'un
ressort sans coût JS. `motion.ts` sert tout ce qu'un doigt peut attraper — il
part de la valeur affichée, hérite de la vélocité du geste et reste
interruptible. Le rebond (`bounce`) ne s'emploie qu'après un geste qui portait
déjà de l'élan.

Les trois préférences système sont prises en charge dans `tokens.css` :
`prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`.

## Contraste

Les valeurs de `--k-ink-secondary`, `--k-ink-tertiary`, `--k-accent` et
`--k-warm` sont calées pour passer le 4.5:1 sur le canevas, sur blanc **et sur
leur propre teinte douce** — le cas le plus contraignant, celui des badges et
de l'onglet actif. `--k-ink-quaternary` n'est jamais du texte : icônes
décoratives et chevrons uniquement.

## Retours utilisateur

`useToast()` pour ce qui est fugace, `useConfirm()` pour le destructif et
irréversible uniquement, `<Notice>` pour ce qui doit rester au contact de son
sujet, `<Field error>` pour la validation de formulaire. Aucun `alert()` ni
`confirm()` natif.
