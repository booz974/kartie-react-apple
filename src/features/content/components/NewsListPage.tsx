import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
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
        eyebrow={
          <>
            <span aria-hidden="true">📰 </span>Actualités
          </>
        }
        title={`Les nouvelles de ${quartierName}`}
        description="Ce que la ville et les acteurs du quartier annoncent, du plus récent au plus ancien."
        meta={
          newsItems.length > 0 ? (
            <Badge tone="news" size="lg" emoji="📰">
              {newsItems.length} {newsItems.length > 1 ? 'actualités' : 'actualité'}
            </Badge>
          ) : null
        }
      />

      <Section>
        {newsItems.length > 0 ? (
          // Un fil de cartes, pas un tableau de lignes : chaque actualité porte
          // son image et respire.
          <div className="flex flex-col gap-5">
            {newsItems.map((news, index) => (
              <NewsCard key={news.id ?? index} news={news} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="k-empty">
            <Chip tone="news" size={72}>
              📰
            </Chip>
            <p className="k-title-3">Aucune nouvelle pour le moment</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Rien n&apos;a encore été annoncé à {quartierName}. Retournez au quartier : ses
              événements et ses projets, eux, sont déjà en ligne.
            </p>
            <div className="mt-2">
              <Button variant="tinted" onClick={onBack}>
                <span aria-hidden="true">📍</span>
                Retour au quartier
              </Button>
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}
