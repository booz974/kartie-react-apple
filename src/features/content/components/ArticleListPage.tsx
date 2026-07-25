import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
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
        eyebrow="Réalisations"
        title={`Nos réalisations à ${quartierName}`}
        description="Ce qui a été construit, rénové ou lancé dans le quartier."
      />

      <Section>
        {articles.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="document"
            title="Aucune réalisation pour l'instant"
            description={`Rien n'a encore été publié pour ${quartierName}. Revenez au quartier pour découvrir ce qui s'y passe.`}
            action={
              <Button variant="tinted" onClick={onBack}>
                Retour à {quartierName}
              </Button>
            }
          />
        )}
      </Section>
    </Page>
  );
}
