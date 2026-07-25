import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Icon, { type IconName } from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { supportPetition } from '@/api/democracy';
import {
  usePetition,
  usePetitionSupportStatus,
} from '@/queries/democracy';
import { useAuthStore } from '@/stores/authStore';

function getThemeIcon(theme: string | null | undefined): IconName {
  if (!theme) return 'tag';
  const lower = theme.toLowerCase();
  if (lower.includes('transport')) return 'road';
  if (lower.includes('sécurité')) return 'shield';
  if (lower.includes('environnement')) return 'leaf';
  if (lower.includes('logement')) return 'building';
  if (lower.includes('emploi')) return 'briefcase';
  return 'tag';
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="plain"
      onClick={onClick}
      leading={<Icon name="chevronLeft" size={16} />}
      className="k-footnote -ml-1 mb-3 font-medium"
    >
      Retour
    </Button>
  );
}

export default function PetitionView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const petitionId = idParam ? parseInt(idParam, 10) : undefined;

  const session = useAuthStore((state) => state.session);
  const toast = useToast();

  const { data: petition, isLoading, isError, refetch } = usePetition(petitionId);
  const { data: supportsSet } = usePetitionSupportStatus(session?.user?.id, petitionId);

  const [isUpdating, setIsUpdating] = useState(false);
  const [localSupports, setLocalSupports] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (petition) {
      setLocalSupports((petition.supports as number) ?? 0);
    }
  }, [petition]);

  useEffect(() => {
    if (supportsSet && petitionId != null) {
      setIsSupported(supportsSet.has(petitionId));
    }
  }, [supportsSet, petitionId]);

  const isButtonDisabled = isSupported || isUpdating || !session;

  async function handleSupport() {
    if (!session || isSupported || isUpdating || !petition) return;

    setIsUpdating(true);
    try {
      const result = await supportPetition(petition.id, session.user.id);

      if (result.success) {
        setIsSupported(true);
        const newCount = result.newCount ?? result.new_count;
        if (newCount != null) {
          setLocalSupports(newCount);
        }
        toast.success('Pétition soutenue', 'Votre voix est comptabilisée.');
      } else {
        if (result.error) throw result.error;
        throw new Error('Erreur inconnue lors du soutien.');
      }
    } catch (err) {
      console.error('Erreur support:', err);
      toast.error('Une erreur est survenue lors du soutien.', 'Réessayez dans un instant.');
    } finally {
      setIsUpdating(false);
    }
  }

  function goBack() {
    if (petition?.quartier_id) {
      navigate(`/quartiers/${petition.quartier_id}/list?type=petitions`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton width="6rem" height="1.25rem" radius="var(--k-radius-xs)" />
          <Skeleton height="2.25rem" className="mt-1" />
          <Skeleton width="65%" height="2.25rem" />
          <SkeletonText lines={3} className="mt-3" />
          <Skeleton height="3.25rem" radius="var(--k-radius-lg)" className="mt-6" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading pt-6">
        <BackButton onClick={goBack} />
        <h1 className="k-title-1 mb-4">Pétition</h1>
        <Notice tone="danger">
          <p className="font-medium">Impossible de charger cette pétition.</p>
          <p className="k-footnote mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </Notice>
      </Page>
    );
  }

  if (!petition) {
    return (
      <Page className="k-page--reading pt-6">
        <h1 className="k-visually-hidden">Pétition introuvable</h1>
        <EmptyState
          icon="petition"
          title="Cette pétition est introuvable"
          description="Elle a peut-être été retirée, ou l'adresse est incorrecte."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Retour à l&apos;accueil
            </Button>
          }
        />
      </Page>
    );
  }

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        {petition.theme ? (
          <Badge icon={getThemeIcon(petition.theme)} className="mb-3">
            {petition.theme}
          </Badge>
        ) : null}

        <h1 className="k-title-large text-balance">{petition.title}</h1>

        <p className="k-callout k-ink-secondary k-measure mt-4">{petition.summary as string}</p>

        <section className="k-hairline-top mt-8 pt-6">
          <h2 className="k-eyebrow mb-2">Source et contexte</h2>
          <p className="k-subhead k-ink-secondary k-measure">{petition.source as string}</p>
        </section>

        {/* Le soutien est le moment de participation de la page : c'est le seul
            bloc qui se détache, et le seul qui porte l'accent chaud. */}
        <section className="k-hairline-top mt-8 pt-6">
          <h2 className="k-visually-hidden">Soutenir</h2>

          <p className="flex items-baseline gap-2">
            <span className="k-title-1 tabular-nums text-warm">{localSupports}</span>
            <span className="k-subhead k-ink-secondary">
              {localSupports > 1 ? 'personnes ont signé' : 'personne a signé'}
            </span>
          </p>

          <Button
            variant={isSupported ? 'secondary' : 'warm'}
            size="lg"
            block
            className="mt-4 md:w-auto"
            onClick={() => void handleSupport()}
            disabled={isButtonDisabled}
            loading={isUpdating}
            leading={isSupported ? <Icon name="check" size={19} /> : undefined}
          >
            {isSupported
              ? `Soutenu (${localSupports})`
              : !session
                ? 'Connectez-vous pour soutenir'
                : `Soutenir cette pétition (${localSupports})`}
          </Button>

          {!session ? (
            <p className="k-footnote k-ink-tertiary mt-3">
              Un compte est nécessaire pour qu&apos;un soutien ne soit compté qu&apos;une fois.
            </p>
          ) : null}
        </section>
      </article>
    </Page>
  );
}
