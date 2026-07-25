import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import ConsultationCard from '@/features/democracy/components/ConsultationCard';
import type { Consultation } from '@/lib/types/contract';

interface ConsultationListPageProps {
  consultations: Consultation[];
  quartierName: string;
  onBack: () => void;
  onConsultationSelected: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ConsultationListPage({
  consultations,
  quartierName,
  onBack,
  onConsultationSelected,
  onDelete,
}: ConsultationListPageProps) {
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
        eyebrow="Consultations"
        title={`Toutes les consultations pour ${quartierName}`}
        description="Votre avis oriente les décisions prises pour le quartier. Un sondage se répond en quelques secondes."
      />

      <Section>
        {consultations.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {consultations.map((consultation) => (
              <ConsultationCard
                key={consultation.id}
                consultation={consultation}
                onSelected={onConsultationSelected}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="ballot"
            title="Aucune consultation en cours"
            description={`Rien ne vous est demandé pour l'instant à ${quartierName}. Revenez au quartier pour voir ce qui s'y passe.`}
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
