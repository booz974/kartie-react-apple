import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import NewsCard from '@/features/content/components/NewsCard';
import type { News } from '@/lib/types/contract';

interface NewsListPageProps {
  newsItems: News[];
  quartierName: string;
  onBack: () => void;
  onDelete: (id: number) => void;
}

export default function NewsListPage({
  newsItems,
  quartierName,
  onBack,
  onDelete,
}: NewsListPageProps) {
  return (
    <Page className="k-page--reading">
      <Button
        variant="plain"
        onClick={onBack}
        leading={<Icon name="chevronLeft" size={16} />}
        className="k-footnote -ml-1 mb-3 font-medium"
      >
        Retour au quartier
      </Button>

      <PageHeader
        eyebrow="Actualités"
        title={`Toutes les actualités pour ${quartierName}`}
        description="Les informations publiées par la ville et les acteurs du quartier."
      />

      <Section>
        {newsItems.length > 0 ? (
          <div className="k-list">
            {newsItems.map((news, index) => (
              <NewsCard key={news.id ?? index} news={news} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="newspaper"
            title="Aucune actualité publiée"
            description={`Rien n'a encore été annoncé pour ${quartierName}. Revenez au quartier pour découvrir ce qui s'y passe.`}
            action={
              <Button variant="tinted" onClick={onBack}>
                Retour au quartier
              </Button>
            }
          />
        )}
      </Section>
    </Page>
  );
}
