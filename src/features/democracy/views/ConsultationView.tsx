import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import Progress from '@/components/ui/Progress';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { castVotes } from '@/api/democracy';
import { useConsultationDetails } from '@/queries/territory';
import { useUserConsultationVotes } from '@/queries/democracy';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { ConsultationDetails } from '@/lib/types/contract';

interface ConsultationOptionWithVotes {
  id: number;
  option_text?: string;
  votes?: number;
}

function getPercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
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

export default function ConsultationView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const consultationId = idParam ? parseInt(idParam, 10) : undefined;

  const session = useAuthStore((state) => state.session);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const toast = useToast();

  const {
    data: fetchedConsultation,
    isLoading,
    isError,
    refetch,
  } = useConsultationDetails(consultationId);
  const { data: userVotes } = useUserConsultationVotes(session?.user?.id);

  const [detailedConsultation, setDetailedConsultation] = useState<ConsultationDetails | null>(
    null,
  );
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number | number[] | null>(null);
  const [selectionError, setSelectionError] = useState('');

  useEffect(() => {
    if (fetchedConsultation) {
      setDetailedConsultation(fetchedConsultation);
      if (fetchedConsultation.multiple_choices) {
        setSelectedOptions([]);
      } else {
        setSelectedOptions(null);
      }
    }
  }, [fetchedConsultation]);

  useEffect(() => {
    if (!session?.user || !detailedConsultation?.options || !userVotes) {
      if (!session?.user) {
        setHasVoted(false);
      }
      return;
    }

    const optionIds = new Set(
      (detailedConsultation.options as ConsultationOptionWithVotes[]).map((o) => o.id),
    );
    const voted = userVotes.some((vote) => optionIds.has(vote.consultation_option_id));
    setHasVoted(voted);
  }, [session, detailedConsultation, userVotes]);

  const totalVotes = useMemo(() => {
    if (!detailedConsultation?.options) return 0;
    return (detailedConsultation.options as ConsultationOptionWithVotes[]).reduce(
      (total, opt) => total + (opt.votes ?? 0),
      0,
    );
  }, [detailedConsultation]);

  async function submitVote() {
    if (!session?.user || hasVoted || isSubmitting || !detailedConsultation) return;

    const selection = Array.isArray(selectedOptions)
      ? selectedOptions
      : selectedOptions != null
        ? [selectedOptions]
        : [];

    if (selection.length === 0 || selection[0] === null) {
      // Une erreur de saisie reste au contact du formulaire : elle dit quoi
      // corriger, à l'endroit où on le corrige.
      setSelectionError('Sélectionnez au moins une option avant de valider.');
      return;
    }

    setSelectionError('');
    setIsSubmitting(true);

    try {
      const result = await castVotes(session.user.id, selection);
      if (!result.success) throw result.error;

      toast.success('Votre vote est enregistré', 'Merci pour votre participation.');
      setHasVoted(true);

      setDetailedConsultation((prev) => {
        if (!prev?.options) return prev;
        const updatedOptions = (prev.options as ConsultationOptionWithVotes[]).map((opt) => {
          if (selection.includes(opt.id)) {
            return { ...opt, votes: (opt.votes ?? 0) + 1 };
          }
          return opt;
        });
        return { ...prev, options: updatedOptions as ConsultationDetails['options'] };
      });
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du vote:", err);
      const error = err as { code?: string };
      if (error.code === '23505') {
        toast.info('Vous avez déjà voté', 'Voici les résultats de ce sondage.');
        setHasVoted(true);
      } else {
        toast.error(
          "Votre vote n'a pas pu être enregistré",
          'Vérifiez votre connexion, puis réessayez.',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOptionChange(optionId: number, checked: boolean, multiple: boolean) {
    setSelectionError('');
    if (multiple) {
      setSelectedOptions((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        if (checked) {
          return [...current, optionId];
        }
        return current.filter((id) => id !== optionId);
      });
    } else {
      setSelectedOptions(optionId);
    }
  }

  function goBack() {
    const quartierId = detailedConsultation?.quartier_id as number | undefined;
    if (quartierId) {
      navigate(`/quartiers/${quartierId}/list?type=consultations`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading) {
    return (
      <Page className="k-page--reading pt-6">
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton height="14rem" radius="var(--k-radius-lg)" />
          <Skeleton height="2rem" className="mt-2" />
          <SkeletonText lines={3} />
          <Skeleton height="1.25rem" width="70%" className="mt-6" />
          <Skeleton height="3.25rem" radius="var(--k-radius-md)" />
          <Skeleton height="3.25rem" radius="var(--k-radius-md)" />
          <Skeleton height="3.25rem" radius="var(--k-radius-md)" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading pt-6">
        <BackButton onClick={goBack} />
        <h1 className="k-title-1 mb-4">Consultation</h1>
        <Notice tone="danger">
          <p className="font-medium">Impossible de charger ce sondage.</p>
          <p className="k-footnote mt-1">Vérifiez votre connexion, puis réessayez.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </Notice>
      </Page>
    );
  }

  if (!detailedConsultation) {
    return (
      <Page className="k-page--reading pt-6">
        <h1 className="k-visually-hidden">Sondage introuvable</h1>
        <EmptyState
          icon="ballot"
          title="Ce sondage est introuvable"
          description="Il a peut-être été clos, ou l'adresse est incorrecte."
          action={
            <Button variant="primary" onClick={() => navigate('/')}>
              Retour à l&apos;accueil
            </Button>
          }
        />
      </Page>
    );
  }

  // Une consultation renvoyée sans tableau d'options faisait planter le rendu
  // entier ; on dégrade vers un état vide explicite.
  const options = (detailedConsultation.options ?? []) as ConsultationOptionWithVotes[];
  const showResults = !session || hasVoted;
  const multiple = Boolean(detailedConsultation.multiple_choices);
  const coverImage = detailedConsultation.cover_image as string | undefined;
  const description = detailedConsultation.description as string | undefined;

  return (
    <Page className="k-page--reading pt-6">
      <BackButton onClick={goBack} />

      <article>
        {coverImage ? (
          <img
            src={coverImage}
            alt=""
            className="mb-6 h-64 w-full rounded-lg bg-canvas-sunken object-cover"
          />
        ) : null}

        {/* Un sondage ouvert est un moment de participation : c'est le seul
            endroit de la page où l'accent chaud apparaît. */}
        {!showResults ? (
          <Badge tone="warm" dot live className="mb-3">
            Vote ouvert
          </Badge>
        ) : null}

        <h1 className="k-title-large text-balance">{detailedConsultation.title}</h1>

        {description ? (
          <p className="k-callout k-ink-secondary k-measure mt-4">{description}</p>
        ) : null}

        <section className="k-hairline-top mt-8 pt-6">
          <h2 className="k-title-2 text-balance">{detailedConsultation.question}</h2>

          {showResults ? (
            <>
              <p className="k-subhead k-ink-secondary mt-2">
                {!session
                  ? 'Voici les résultats actuels. Connectez-vous pour donner votre avis.'
                  : 'Merci d’avoir voté. Voici les résultats.'}
              </p>

              {!session ? (
                // Inviter à se connecter sans offrir le moyen de le faire
                // laisserait le visiteur dans une impasse.
                <Button variant="primary" className="mt-4" onClick={openAuthModal}>
                  <Icon name="logIn" size={17} />
                  Se connecter pour participer
                </Button>
              ) : null}

              <ul className="mt-6 flex flex-col gap-5">
                {options.map((option) => {
                  const votes = option.votes ?? 0;
                  const percentage = getPercentage(votes, totalVotes);
                  return (
                    <li key={option.id}>
                      <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="k-subhead font-medium">{option.option_text}</span>
                        <span className="k-footnote k-ink-tertiary shrink-0 tabular-nums">
                          {percentage}% · {votes} {votes > 1 ? 'votes' : 'vote'}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        label={`${option.option_text ?? 'Option'} : ${percentage}%`}
                      />
                    </li>
                  );
                })}
              </ul>

              <p className="k-footnote k-ink-tertiary mt-5 tabular-nums">
                {totalVotes} {totalVotes > 1 ? 'votes exprimés' : 'vote exprimé'}
              </p>
            </>
          ) : (
            <>
              <p className="k-subhead k-ink-tertiary mt-2">
                {multiple ? 'Plusieurs choix possibles.' : 'Un seul choix possible.'}
              </p>

              <fieldset className="mt-5">
                <legend className="k-visually-hidden">{detailedConsultation.question}</legend>

                <div className="k-list k-hairline-all overflow-hidden rounded-lg bg-surface">
                  {options.map((option) => (
                    <label
                      key={option.id}
                      className="k-press-subtle flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-surface-secondary"
                    >
                      <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name="vote-option"
                        value={option.id}
                        checked={
                          multiple
                            ? Array.isArray(selectedOptions) && selectedOptions.includes(option.id)
                            : selectedOptions === option.id
                        }
                        onChange={(e) => handleOptionChange(option.id, e.target.checked, multiple)}
                        className="h-5 w-5 shrink-0 accent-accent"
                      />
                      <span className="k-body">{option.option_text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {selectionError ? (
                <Notice tone="danger" className="mt-4">
                  {selectionError}
                </Notice>
              ) : null}

              <Button
                variant="warm"
                size="lg"
                block
                className="mt-6"
                onClick={() => void submitVote()}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Valider mon choix
              </Button>
            </>
          )}
        </section>
      </article>
    </Page>
  );
}
