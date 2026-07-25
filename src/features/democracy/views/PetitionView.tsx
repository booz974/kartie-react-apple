import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { supportPetition } from '@/api/democracy';
import { petitionThemeEmoji } from '@/design/categories';
import {
  usePetition,
  usePetitionSupportStatus,
} from '@/queries/democracy';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

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
  const openAuthModal = useUiStore((state) => state.openAuthModal);
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
          <Skeleton height="16rem" radius="var(--k-radius-xl)" />
          <Skeleton width="6rem" height="1.5rem" radius="var(--k-radius-full)" className="mt-2" />
          <Skeleton height="2.25rem" />
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
        <div className="k-empty">
          <Chip tone="petition" size={72}>
            ✍️
          </Chip>
          <p className="k-title-3">Cette pétition n&apos;existe plus</p>
          <p className="k-subhead k-ink-secondary k-measure">
            Elle a peut-être été retirée, ou l&apos;adresse est incorrecte. D&apos;autres demandes
            attendent votre soutien.
          </p>
          <div className="mt-2">
            <Button variant="primary" onClick={() => navigate('/')}>
              <span aria-hidden="true">🏠</span>
              Retour à l&apos;accueil
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const imageUrl =
    ((petition as { image?: string }).image || (petition as { image_url?: string }).image_url) ?? '';
  const emoji = petitionThemeEmoji(petition.theme);

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        {/* La demande s'ouvre sur son sujet : une photo du lieu, ou le dégradé
            ambré des pétitions et l'émoji de son thème. */}
        <Media
          src={imageUrl}
          category="petition"
          emoji={emoji}
          ratio={imageUrl ? '16 / 9' : '21 / 9'}
          rounded="var(--k-radius-xl)"
          loading="eager"
          className="shadow-lg"
        />

        {petition.theme ? (
          <Badge tone="petition" emoji={emoji} size="lg" className="mt-6">
            {petition.theme}
          </Badge>
        ) : null}

        <h1 className="k-title-large mt-3 text-balance">{petition.title}</h1>

        <p className="k-callout k-ink-secondary k-measure mt-4">{petition.summary as string}</p>

        <section className="mt-8">
          <h2 className="k-title-3 mb-2">
            <span aria-hidden="true">📌 </span>D&apos;où vient cette demande
          </h2>
          <p className="k-subhead k-ink-secondary k-measure">{petition.source as string}</p>
        </section>

        {/* Le soutien est le moment de participation de la page : c'est le seul
            bloc qui se détache, et le seul qui porte l'accent chaud. */}
        <section className="k-card mt-8 p-6">
          <h2 className="k-visually-hidden">Soutenir</h2>

          <p className="flex items-center gap-3">
            <Chip tone="warm" size={48}>
              ✍️
            </Chip>
            <span className="flex flex-col">
              <span className="k-title-1 tabular-nums text-warm">{localSupports}</span>
              <span className="k-subhead k-ink-secondary">
                {localSupports > 1 ? 'personnes ont signé' : 'personne a signé'}
              </span>
            </span>
          </p>

          <Button
            variant={isSupported ? 'secondary' : 'warm'}
            size="lg"
            block
            className="mt-5 md:w-auto"
            // Sans compte, le bouton ouvre la connexion au lieu d'être grisé :
            // un bouton désactivé qui dit « connectez-vous » est une impasse.
            onClick={session ? () => void handleSupport() : openAuthModal}
            disabled={session ? isButtonDisabled : false}
            loading={isUpdating}
            leading={isSupported ? <Icon name="check" size={19} /> : undefined}
          >
            {isSupported
              ? `Soutenu (${localSupports})`
              : !session
                ? 'Se connecter pour soutenir'
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
