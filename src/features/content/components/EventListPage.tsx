import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
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
        eyebrow={
          <>
            <span aria-hidden="true">🎉 </span>Agenda
          </>
        }
        title={`Ça se passe à ${quartierName}`}
        description="Fêtes, réunions, ateliers, rendez-vous associatifs : tout l'agenda du quartier."
        meta={
          events.length > 0 ? (
            <Badge tone="event" size="lg" emoji="🎉">
              {events.length} rendez-vous à venir
            </Badge>
          ) : null
        }
      />

      <Section>
        {events.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="k-empty">
            <Chip tone="event" size={72}>
              🎉
            </Chip>
            <p className="k-title-3">L&apos;agenda est encore vide</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Rien n&apos;est programmé à {quartierName} pour le moment. Retournez au quartier pour
              voir ce qui s&apos;y passe, ou proposez le prochain rendez-vous.
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
