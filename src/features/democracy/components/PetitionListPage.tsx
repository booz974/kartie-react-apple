import type { Session } from '@supabase/supabase-js';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import PetitionCard from '@/features/democracy/components/PetitionCard';
import type { Petition } from '@/lib/types/contract';

interface PetitionListPageProps {
  petitions: Petition[];
  quartierName: string;
  session: Session | null;
  onBack: () => void;
  onDelete: (id: number) => void;
}

export default function PetitionListPage({
  petitions,
  quartierName,
  session,
  onBack,
  onDelete,
}: PetitionListPageProps) {
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
        eyebrow="Pétitions"
        title={`Toutes les pétitions pour ${quartierName}`}
        description="Chaque soutien compte : il rend visible une demande auprès de la ville."
      />

      <Section>
        {!session && petitions.length > 0 ? (
          <Notice tone="info" className="mb-5">
            Connectez-vous pour soutenir une pétition. La lecture reste ouverte à tous.
          </Notice>
        ) : null}

        {petitions.length > 0 ? (
          <div className="k-grid k-grid--wide">
            {petitions.map((petition) => (
              <PetitionCard
                key={petition.id}
                petition={petition}
                session={session}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="petition"
            title="Aucune pétition en cours"
            description={`Personne n'a encore lancé de pétition à ${quartierName}. Revenez au quartier pour en créer une.`}
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
