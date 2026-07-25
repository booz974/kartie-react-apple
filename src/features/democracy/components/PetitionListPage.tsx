import type { Session } from '@supabase/supabase-js';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
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
        eyebrow={
          <>
            <span aria-hidden="true">✍️ </span>Pétitions
          </>
        }
        title={`Ce que demandent les habitants de ${quartierName}`}
        description="Chaque soutien compte : c'est lui qui rend une demande visible auprès de la ville."
        meta={
          petitions.length > 0 ? (
            <Badge tone="petition" size="lg" emoji="✍️">
              {petitions.length} {petitions.length > 1 ? 'pétitions en cours' : 'pétition en cours'}
            </Badge>
          ) : null
        }
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
          <div className="k-empty">
            <Chip tone="petition" size={72}>
              ✍️
            </Chip>
            <p className="k-title-3">Aucune pétition en cours</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Personne n&apos;a encore lancé de demande à {quartierName}. Une idée pour améliorer le
              quartier ? Elle commence ici.
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
