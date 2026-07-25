import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import EventCard from '@/features/content/components/EventCard';
import type { AgendaEvent } from '@/lib/types/contract';

interface EventListPageProps {
  events: AgendaEvent[];
  quartierName: string;
  onBack: () => void;
  onDelete: (id: number | string) => void;
}

export default function EventListPage({
  events,
  quartierName,
  onBack,
  onDelete,
}: EventListPageProps) {
  return (
    <Page>
      <Button
        variant="plain"
        onClick={onBack}
        leading={<Icon name="chevronLeft" size={16} />}
        className="k-footnote -ml-1 mb-3 font-medium"
      >
        Retour au quartier
      </Button>

      <PageHeader
        eyebrow="Agenda"
        title={`Tous les événements pour ${quartierName}`}
        description="Rendez-vous municipaux et associatifs à venir dans le quartier."
      />

      <Section>
        {events.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="calendar"
            title="Aucun événement programmé"
            description={`Rien n'est encore prévu à ${quartierName}. Revenez au quartier pour voir le reste de l'actualité locale.`}
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
