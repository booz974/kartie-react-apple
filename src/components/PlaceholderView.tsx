import { Link } from 'react-router';
import { buttonClass } from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { Page, PageHeader } from '@/components/ui/Page';
import type { CategoryKey } from '@/design/categories';

interface PlaceholderViewProps {
  title: string;
}

/** Les portes qui restent ouvertes pendant qu'une section se construit. */
const EXITS: { to: string; emoji: string; tone: CategoryKey; label: string; detail: string }[] = [
  {
    to: '/quartiers',
    emoji: '📍',
    tone: 'quartier',
    label: 'Les quartiers',
    detail: 'Vingt territoires à explorer',
  },
  {
    to: '/chat',
    emoji: '✨',
    tone: 'consult',
    label: 'Assistant Kartie',
    detail: 'Une question, une réponse',
  },
];

/**
 * Écran d'attente d'une vue non encore migrée. Il annonce l'état réel plutôt
 * que de simuler un contenu, et laisse toujours une porte de sortie.
 */
export default function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <Page className="pt-8">
      <PageHeader
        eyebrow="🚧 En construction"
        title={title}
        description="Cette section n’est pas encore disponible dans cette version de Kartie."
        actions={
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            <span aria-hidden="true">🏠</span>
            Retour à l’accueil
          </Link>
        }
      />

      <div className="k-card overflow-hidden p-0">
        <div className="k-banner--accent flex items-center gap-3 px-5 py-4">
          <span aria-hidden="true" className="text-2xl leading-none">
            🚧
          </span>
          <p className="k-callout k-vibrant font-semibold">Cette page arrive bientôt</p>
        </div>
        <div className="p-5">
          <p className="k-subhead k-ink-secondary k-measure">
            Le reste de la plateforme fonctionne normalement : quartiers, actualités et
            consultations restent accessibles.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {EXITS.map((exit) => (
              <Link
                key={exit.to}
                to={exit.to}
                className="k-card k-card--flat k-card--interactive flex items-center gap-3 p-4"
              >
                <Chip tone={exit.tone} size={44}>
                  {exit.emoji}
                </Chip>
                <span className="min-w-0 flex-1">
                  <span className="k-callout block font-semibold">{exit.label}</span>
                  <span className="k-footnote k-ink-secondary block">{exit.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
