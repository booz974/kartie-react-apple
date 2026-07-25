import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import ArticleCard from '@/features/content/components/ArticleCard';
import type { Realisation } from '@/lib/types/contract';

interface ArticleListPageProps {
  articles: Realisation[];
  quartierName: string;
  onBack: () => void;
  onDelete: (id: number) => void;
}

export default function ArticleListPage({
  articles,
  quartierName,
  onBack,
  onDelete,
}: ArticleListPageProps) {
  return (
    <Page>
      <Button
        variant="plain"
        onClick={onBack}
        leading={<Icon name="chevronLeft" size={16} />}
        className="k-footnote -ml-1 mb-3 font-medium"
      >
        Retour à {quartierName}
      </Button>

      <PageHeader
        eyebrow={
          <>
            <span aria-hidden="true">🏗️ </span>Réalisations
          </>
        }
        title={`Ce qui a changé à ${quartierName}`}
        description="Construit, rénové, planté, ouvert : tout ce qui a pris forme dans le quartier."
        meta={
          articles.length > 0 ? (
            <Badge tone="project" size="lg" emoji="🏗️">
              {articles.length} {articles.length > 1 ? 'réalisations' : 'réalisation'}
            </Badge>
          ) : null
        }
      />

      <Section>
        {articles.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="k-empty">
            <Chip tone="project" size={72}>
              🏗️
            </Chip>
            <p className="k-title-3">Rien à montrer ici, pour l&apos;instant</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Aucune réalisation n&apos;a encore été publiée à {quartierName}. Le quartier vit
              ailleurs : allez voir ses événements et ses actualités.
            </p>
            <div className="mt-2">
              <Button variant="tinted" onClick={onBack}>
                <span aria-hidden="true">📍</span>
                Retour à {quartierName}
              </Button>
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}
