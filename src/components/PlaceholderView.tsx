import { Link } from 'react-router';
import { buttonClass } from '@/components/ui/Button';
import { Page, PageHeader } from '@/components/ui/Page';
import Notice from '@/components/ui/Notice';

interface PlaceholderViewProps {
  title: string;
}

/**
 * Écran d'attente d'une vue non encore migrée. Il annonce l'état réel plutôt
 * que de simuler un contenu, et laisse toujours une porte de sortie.
 */
export default function PlaceholderView({ title }: PlaceholderViewProps) {
  return (
    <Page className="pt-8">
      <PageHeader
        eyebrow="En construction"
        title={title}
        description="Cette section n’est pas encore disponible dans cette version de Kartie."
        actions={
          <Link to="/" className={buttonClass({ variant: 'secondary' })}>
            Retour à l’accueil
          </Link>
        }
      />
      <Notice tone="info">
        Le reste de la plateforme fonctionne normalement : quartiers, actualités et
        consultations restent accessibles.
      </Notice>
    </Page>
  );
}
