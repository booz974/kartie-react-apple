import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
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
        eyebrow={
          <>
            <span aria-hidden="true">🗳️ </span>Consultations
          </>
        }
        title={`On vous demande votre avis à ${quartierName}`}
        description="Votre réponse oriente les décisions prises pour le quartier, et un sondage se répond en quelques secondes."
        meta={
          consultations.length > 0 ? (
            <Badge tone="consult" size="lg" emoji="🗳️">
              {consultations.length} {consultations.length > 1 ? 'sondages ouverts' : 'sondage ouvert'}
            </Badge>
          ) : null
        }
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
          <div className="k-empty">
            <Chip tone="consult" size={72}>
              🗳️
            </Chip>
            <p className="k-title-3">Aucun sondage ouvert</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Rien ne vous est demandé à {quartierName} pour l&apos;instant. Le prochain sondage
              arrivera ici : en attendant, découvrez ce qui se passe dans le quartier.
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
