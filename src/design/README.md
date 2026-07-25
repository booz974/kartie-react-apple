# Système visuel Kartie, « Lagon »

Kartie n'est pas un tableau de bord : c'est un lieu de vie. Le fond est vivant,
les surfaces sont en verre, les photos portent le contenu, et chaque nature
d'information a sa couleur et son émoji.

## Où vivent les choses

| Fichier | Rôle |
| --- | --- |
| `tokens.css` | Source unique : couleur, dégradés, typographie, espace, rayons, ombres, verre, ressorts |
| `categories.ts` | Couleur et émoji par nature de contenu, plus les fonctions de rattachement |
| `base.css` | Reset (le preflight Tailwind est désactivé), classes typographiques, matériaux |
| `components.css` | Classes des primitives (`k-card`, `k-media`, `k-chip`, `k-badge`, `k-btn`…) |
| `motion.ts` | Ressorts interruptibles, reprise de vélocité, projection du momentum |
| `useSheetGesture.ts` | Glisser pour fermer les feuilles mobiles |
| `a11y.ts` | Piège à focus, verrou de défilement, échappement |
| `chartTheme.ts` | Habillage Chart.js aligné sur les tokens |
| `../components/ui/` | Primitives React |

## Les cinq règles

**1. Le fond est vivant.** Un dégradé maillé aux couleurs de l'île occupe une
couche fixe derrière toute la page (`body::before`). C'est lui que le verre
capte et diffuse : sans lui, les surfaces translucides n'auraient rien à
montrer. Il ne défile pas et ne s'anime pas.

**2. Le verre est une matière.** `k-glass`, `k-glass-thin`, `k-glass-thick` :
flou marqué, sursaturation élevée pour faire remonter la couleur du fond,
liseré clair sur la tranche haute, ombre à trois couches. Jamais deux surfaces
translucides l'une sur l'autre. Ne jamais écrire `bg-white` : `--k-surface` est
translucide par construction.

**3. Les photos portent le contenu.** Tout ce qui a une image l'affiche en
grand, via `<Media>`. Quand elle manque, `<Media>` produit un dégradé de la
couleur du contenu et l'émoji de son sujet, jamais un rectangle gris. Passe-lui
un `gradient` explicite quand toute une grille relève de la même catégorie,
pour éviter un aplat monochrome.

**4. Couleur et émojis font comprendre vite.** Chaque nature de contenu a sa
teinte (`k-badge--event`, `--news`, `--project`, `--petition`, `--consult`,
`--asso`, `--quartier`) et son émoji (`CATEGORIES` dans `categories.ts`). Les
émojis sont des repères de lecture, portés par les badges, les pastilles
`<Chip>`, les titres de section et les états vides. Les icônes au trait
(`<Icon>`) restent réservées aux commandes : navigation, boutons, contrôles.

**5. Tout ce qui se touche a du relief.** `k-card k-card--interactive` : la
carte se soulève au survol, son ombre s'approfondit, son verre s'éclaircit, sa
photo zoome légèrement, puis elle se rétracte sous le doigt. Rayons généreux,
boutons en pilule.

## Deux familles de dégradés

Un dégradé qui porte du texte blanc n'a pas les mêmes contraintes qu'un dégradé
purement décoratif.

- `--k-accent-gradient`, `--k-warm-gradient`, `--k-banner-consult` : chaque
  arrêt tient le 4.5:1 avec du blanc. Boutons, bandeaux, onglet actif, avatars.
- `--k-accent-gradient-vivid`, `--k-warm-gradient-vivid`, `--k-cat-*-gradient` :
  vifs, réservés aux surfaces qui ne portent qu'un émoji (pastilles, replis de
  vignette).

Se tromper de famille casse la lisibilité sans qu'aucun test ne le voie.

## Contraste

`--k-ink-secondary`, `--k-ink-tertiary`, `--k-accent-ink`, `--k-warm-ink`, les
`--k-cat-*-ink` et `--k-success` sont calés pour passer le 4.5:1 sur le verre,
sur le canevas nu **et sur la zone la plus saturée du dégradé de fond**, qui est
le cas le plus contraignant. `--k-ink-quaternary` n'est jamais du texte : icônes
décoratives et chevrons uniquement.

## Typographie

Les paliers associent taille, interlignage **et** approche : la hiérarchie naît
de l'ensemble, jamais de la taille seule. `k-display`, `k-title-large`,
`k-title-1/2/3`, `k-callout`, `k-body`, `k-subhead`, `k-footnote`, `k-caption`,
`k-eyebrow`. Tout est en `rem`, pour que la mise en page grandisse avec le
réglage de taille de texte de l'utilisateur.

## Mouvement

Les transitions non gestuelles utilisent les courbes `linear()` de
`tokens.css` (`--k-spring-snap`, `--k-spring-smooth`, `--k-spring-bounce`) : le
rendu d'un ressort sans coût JS. `motion.ts` sert tout ce qu'un doigt peut
attraper : il part de la valeur affichée, hérite de la vélocité du geste et
reste interruptible. Le rebond ne s'emploie qu'après un geste qui portait déjà
de l'élan.

Les trois préférences système sont prises en charge :
`prefers-reduced-motion`, `prefers-reduced-transparency` (le verre devient
opaque), `prefers-contrast` (le dégradé de fond disparaît, les teintes
s'assombrissent).

## Écriture

Ton direct et chaleureux, jamais administratif. **Aucun cadratin** dans les
chaînes affichées : une virgule, un deux-points, une parenthèse ou une
reformulation. Les accords au pluriel s'écrivent en toutes lettres, jamais
en « (s) ».

## Retours utilisateur

`useToast()` pour ce qui est fugace, `useConfirm()` pour le destructif et
irréversible uniquement, `<Notice>` pour ce qui doit rester au contact de son
sujet, `<Field error>` pour la validation de formulaire. Aucun `alert()` ni
`confirm()` natif.

## Pièges connus

Tailwind élague ses couches `@layer` en se fiant aux chaînes littérales
trouvées dans les sources : les classes composées à l'exécution
(`k-btn--${variant}`) y disparaîtraient. C'est pourquoi `tailwind.css` importe
les fichiers du design system **avant** les directives `@tailwind`, et que le
preflight est désactivé au profit du reset maison.
