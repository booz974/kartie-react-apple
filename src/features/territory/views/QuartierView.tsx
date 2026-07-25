import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Badge from '@/components/ui/Badge';
import Button, { buttonClass } from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Media from '@/components/ui/Media';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Progress from '@/components/ui/Progress';
import { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import QuartierPoll from '@/features/territory/components/QuartierPoll';
import {
  castVote,
  useQuartier,
  useQuartierAssociationsPreview,
  useQuartierConsultations,
  useQuartierEvents,
  useQuartierNews,
  useQuartierPetitions,
  useQuartierRealisations,
  useUserSupports,
  useUserVotes,
} from '@/queries/territory';
import { getConsultationDetails } from '@/api/democracy';
import {
  formatDateShort,
  formatStatValue,
  getPetitionProgress,
} from '@/features/territory/utils/quartierHelpers';
import { categoryKeyFor, petitionThemeEmoji, themeEmoji } from '@/design/categories';
import type {
  AgendaEvent,
  Association,
  Consultation,
  ConsultationDetails,
  News,
  Petition,
  Realisation,
} from '@/lib/types/contract';
import { useAuthStore } from '@/stores/authStore';

export default function QuartierView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const quartierId = id ? Number(id) : undefined;

  const { data: baseQuartier, isLoading: isLoadingQuartier } = useQuartier(quartierId);
  const { data: events } = useQuartierEvents(quartierId);
  const { data: associations } = useQuartierAssociationsPreview(quartierId);
  const { data: actualites } = useQuartierNews(quartierId);
  const { data: realisations } = useQuartierRealisations(quartierId);
  const { data: petitions } = useQuartierPetitions(quartierId);
  const { data: consultations } = useQuartierConsultations(quartierId);

  const petitionIds = useMemo(() => (petitions ?? []).map((p) => p.id), [petitions]);
  const { data: supportedIds } = useUserSupports(session?.user?.id, petitionIds);
  const { data: votedIds } = useUserVotes(session?.user?.id, quartierId);

  const [votedConsultationIds, setVotedConsultationIds] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [lastVotedPoll, setLastVotedPoll] = useState<Consultation | null>(null);
  const [lastVotedPollDetails, setLastVotedPollDetails] = useState<ConsultationDetails | null>(
    null,
  );
  const [isVoting, setIsVoting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  useEffect(() => {
    if (votedIds) {
      setVotedConsultationIds(new Set(votedIds));
    }
  }, [votedIds]);

  const petitionsWithSupport = useMemo(() => {
    if (!petitions) return petitions;
    return petitions.map((p) => ({
      ...p,
      user_has_supported: supportedIds?.has(p.id) ?? false,
    }));
  }, [petitions, supportedIds]);

  const quartier = useMemo(() => {
    if (!baseQuartier) return null;
    return {
      ...baseQuartier,
      events,
      associations,
      actualites,
      realisations,
      petitions: petitionsWithSupport,
      consultations,
    };
  }, [baseQuartier, events, associations, actualites, realisations, petitionsWithSupport, consultations]);

  const cleanRealisations = useMemo(() => {
    const raw = (quartier?.realisations as Realisation[]) || [];
    const uniqueMap = new Map<number, Realisation>();
    raw.forEach((item) => {
      if (item && item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [quartier?.realisations]);

  const unvotedConsultations = useMemo(() => {
    if (!quartier?.consultations || !Array.isArray(quartier.consultations)) return [];
    return (quartier.consultations as Consultation[]).filter(
      (consultation) => !votedConsultationIds.has(consultation.id),
    );
  }, [quartier?.consultations, votedConsultationIds]);

  const currentPoll = unvotedConsultations[0] || null;
  const displayedPoll = showResults && lastVotedPoll ? lastVotedPoll : currentPoll;

  async function loadConsultationResults(consultationId: number) {
    try {
      const data = await getConsultationDetails(consultationId);
      if (data) {
        setLastVotedPollDetails(data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err);
    }
  }

  async function handleQuickVote(consultationId: number, optionId: number) {
    if (isVoting || !session?.user) return;

    setIsVoting(true);
    try {
      const result = await castVote(session.user.id, optionId);

      if (!result.success) {
        const error = result.error as { code?: string } | undefined;
        if (error?.code === '23505') {
          setVotedConsultationIds((prev) => new Set([...prev, consultationId]));
          toast.info('Déjà voté', 'Vous avez déjà participé à cette consultation.');
        } else {
          throw result.error;
        }
      } else {
        setVotedConsultationIds((prev) => new Set([...prev, consultationId]));

        const currentConsultation = (quartier?.consultations as Consultation[])?.find(
          (c) => c.id === consultationId,
        );
        if (currentConsultation) {
          setLastVotedPoll(currentConsultation);
          await loadConsultationResults(consultationId);
          setShowResults(true);
        }
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du vote:", err);
      toast.error('Vote non enregistré', 'Réessayez dans un instant.');
    } finally {
      setIsVoting(false);
    }
  }

  function handleOptionClick(consultation: Consultation, optionId: number) {
    if (!session?.user) {
      toast.warning('Connexion requise', 'Connectez-vous pour prendre part à cette consultation.');
      return;
    }

    if (consultation.multiple_choices) {
      setSelectedOptions((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        }
        return [...prev, optionId];
      });
    } else {
      void handleQuickVote(consultation.id, optionId);
    }
  }

  async function submitMultipleVotes() {
    if (isVoting || !session?.user || selectedOptions.length === 0 || !displayedPoll) return;

    setIsVoting(true);
    const consultationId = displayedPoll.id;

    try {
      const votePromises = selectedOptions.map((optionId) => castVote(session.user.id, optionId));
      const results = await Promise.all(votePromises);

      const fatalErrors = results.filter(
        (r) => !r.success && (r.error as { code?: string })?.code !== '23505',
      );

      if (fatalErrors.length > 0) {
        throw fatalErrors[0].error;
      }

      setVotedConsultationIds((prev) => new Set([...prev, consultationId]));
      setSelectedOptions([]);

      const currentConsultation = (quartier?.consultations as Consultation[])?.find(
        (c) => c.id === consultationId,
      );
      if (currentConsultation) {
        setLastVotedPoll(currentConsultation);
        await loadConsultationResults(consultationId);
        setShowResults(true);
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement des votes multiples:", err);
      toast.error('Votes non enregistrés', 'Réessayez dans un instant.');
    } finally {
      setIsVoting(false);
    }
  }

  function goToNextPoll() {
    setShowResults(false);
    setLastVotedPoll(null);
    setLastVotedPollDetails(null);
    setSelectedOptions([]);
  }

  function eventPath(event: AgendaEvent): string {
    return event.routePath || `/events/${event.id}`;
  }

  const isAdmin = profile?.role === 'admin';
  const stats = quartier?.stats as Record<string, unknown> | null | undefined;

  if (isLoadingQuartier) {
    return (
      <Page>
        <div className="max-w-xl py-16">
          <div className="k-skeleton mb-4 h-10 w-2/3 rounded-md" aria-hidden="true" />
          <SkeletonText lines={3} />
        </div>
      </Page>
    );
  }

  if (!quartier) {
    return (
      <Page>
        <EmptyState
          icon="mapPin"
          title="Quartier introuvable"
          description="Ce quartier n’existe pas ou n’est plus accessible."
          action={
            <Link to="/quartiers" className={buttonClass({ variant: 'primary' })}>
              Voir tous les quartiers
            </Link>
          }
        />
      </Page>
    );
  }

  const listPath = (type: string, create = false) =>
    `/quartiers/${quartier.id}/list?type=${type}${create ? '&create=true' : ''}`;

  const keyStats = [
    { emoji: '🧑‍🤝‍🧑', label: 'Habitants', value: (stats?.population as string) || 'N/A', tone: 'quartier' as const },
    { emoji: '🎓', label: 'Jeunes 0-29 ans', value: formatStatValue(stats?.jeunes), tone: 'consult' as const },
    { emoji: '📊', label: 'Taux de pauvreté', value: formatStatValue(stats?.pauvrete), tone: 'petition' as const },
    { emoji: '🏠', label: 'Logements sociaux', value: formatStatValue(stats?.logementsSociaux), tone: 'asso' as const },
  ];

  const upcomingEvents = (quartier.events ?? []) as AgendaEvent[];
  const news = (quartier.actualites ?? []) as News[];

  return (
    <Page>
      <PageHeader
        className="pt-8 md:pt-12"
        back={{ to: '/quartiers', label: 'Tous les quartiers' }}
        title={quartier.name}
        description="Ce qui s’y passe, ce qui s’y construit, et ce sur quoi vous pouvez peser."
        meta={
          <Badge tone={stats?.pauvrete ? 'warning' : 'accent'}>
            {stats?.pauvrete ? 'Quartier prioritaire' : 'Quartier dynamique'}
          </Badge>
        }
        actions={
          <>
            <Link
              to={`/quartiers/${quartier.id}/feed`}
              className={buttonClass({ variant: 'primary' })}
            >
              <Icon name="chatLines" size={17} />
              Le fil du quartier
            </Link>
            <Link
              to={`/quartiers/${quartier.id}/associations`}
              className={buttonClass({ variant: 'secondary' })}
            >
              <Icon name="handshake" size={17} />
              Associations
            </Link>
            <Link
              to={`/quartiers/${quartier.id}/infos`}
              className={buttonClass({ variant: 'secondary' })}
            >
              <Icon name="info" size={17} />
              Le quartier
            </Link>
          </>
        }
      />

      <section aria-label="Le quartier en chiffres">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {keyStats.map((stat) => (
            <div key={stat.label} className="k-card flex flex-col gap-1 p-4">
              <Chip tone={stat.tone} size={38} className="mb-1">
                {stat.emoji}
              </Chip>
              <dt className="k-caption k-ink-tertiary order-2">{stat.label}</dt>
              <dd className="k-title-2 tabular-nums order-1">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section
        title="🗳️ Votre avis compte"
        description="Une question posée aux habitants du quartier. Votre réponse est comptabilisée immédiatement."
        className="pt-14"
        action={
          isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/quartiers/${quartier.id}/creer-sondage`)}
            >
              <Icon name="plus" size={16} />
              Créer
            </Button>
          ) : null
        }
      >
        <div className="max-w-2xl">
          <QuartierPoll
            consultation={displayedPoll}
            showResults={showResults}
            details={lastVotedPollDetails}
            isVoting={isVoting}
            selectedOptions={selectedOptions}
            onOptionClick={handleOptionClick}
            onSubmitMultiple={() => void submitMultipleVotes()}
            onNext={goToNextPoll}
            onSeeAll={() => navigate(listPath('consultations'))}
          />
        </div>
      </Section>

      <div className="k-section grid gap-12 lg:grid-cols-3">
        <Section
          className="k-section--flush lg:col-span-2"
          title="🎉 À ne pas manquer"
          action={
            <div className="flex gap-2">
              {isAdmin ? (
                <Button variant="ghost" size="sm" onClick={() => navigate(listPath('events', true))}>
                  <Icon name="plus" size={16} />
                  Proposer
                </Button>
              ) : null}
              <Link
                to={listPath('events')}
                className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
              >
                Tout voir
                <Icon name="chevronRight" size={15} />
              </Link>
            </div>
          }
        >
          {quartier.events === undefined ? (
            <SkeletonText lines={4} />
          ) : quartier.events === null ? (
            <Notice tone="danger">Les événements n’ont pas pu être chargés.</Notice>
          ) : upcomingEvents.length > 0 ? (
            <ul className="k-list">
              {upcomingEvents.slice(0, 3).map((event) => (
                <li key={event.id}>
                  <Link
                    to={eventPath(event)}
                    className="k-press group flex gap-4 py-4 first:pt-0"
                  >
                    <Chip tone={event.source === 'association' ? 'asso' : 'event'} size={52}>
                      {event.source === 'association' ? '🤝' : '🎉'}
                    </Chip>
                    <span className="min-w-0 flex-1">
                      {event.source === 'association' ? (
                        <span className="k-caption k-ink-tertiary block">
                          Association
                          {event.association_name ? ` · ${event.association_name}` : ''}
                        </span>
                      ) : null}
                      <span className="k-title-3 block truncate group-hover:text-accent-ink">
                        {event.title}
                      </span>
                      <span className="k-footnote block text-accent-ink">{event.date}</span>
                      <span className="k-footnote k-ink-secondary mt-1 line-clamp-2 block">
                        {(event as { description?: string }).description}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="calendar"
              title="Aucun événement à venir"
              description="Rien n’est programmé pour l’instant dans ce quartier."
            />
          )}
        </Section>

        <Section
          className="k-section--flush"
          title="📰 Dernières nouvelles"
          action={
            <div className="flex gap-2">
              {isAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(listPath('actualites', true))}
                >
                  <Icon name="plus" size={16} />
                  Partager
                </Button>
              ) : null}
              <Link
                to={listPath('actualites')}
                className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
              >
                Tout voir
              </Link>
            </div>
          }
        >
          {quartier.actualites === undefined ? (
            <SkeletonText lines={5} />
          ) : quartier.actualites === null ? (
            <Notice tone="danger">Les actualités n’ont pas pu être chargées.</Notice>
          ) : news.length > 0 ? (
            <ul className="k-list max-h-[26rem] overflow-y-auto">
              {news.map((item) => (
                <li key={item.id}>
                  <Link to={`/actualites/${item.id}`} className="k-press group flex gap-3 py-3 first:pt-0">
                    <span className="k-caption k-ink-tertiary w-12 shrink-0 pt-0.5 tabular-nums">
                      {formatDateShort(item.date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="k-subhead block truncate font-medium group-hover:text-accent-ink">
                        {item.title}
                      </span>
                      <span className="k-footnote k-ink-tertiary line-clamp-1 block">
                        {item.content}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="k-subhead k-ink-tertiary py-6">Aucune actualité pour le moment.</p>
          )}
        </Section>
      </div>

      {quartier.associations && quartier.associations.length > 0 ? (
        <Section
          title="🤝 Vie associative"
          action={
            <Link
              to={`/quartiers/${quartier.id}/associations`}
              className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
            >
              Tout voir
              <Icon name="chevronRight" size={15} />
            </Link>
          }
        >
          <div className="k-grid">
            {(quartier.associations as Association[]).slice(0, 3).map((association) => (
              <Link
                key={association.id}
                to={`/associations/${association.slug || association.id}`}
                className="k-card k-card--interactive p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  {association.logo_url ? (
                    <img
                      src={association.logo_url as string}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <Chip tone="asso" size={56}>
                      {themeEmoji(association.category_label as string, '🤝')}
                    </Chip>
                  )}
                  <span className="min-w-0">
                    <span className="k-subhead block truncate font-semibold">
                      {association.name}
                    </span>
                    <span className="k-caption k-ink-tertiary block truncate">
                      {association.category_label}
                    </span>
                  </span>
                </div>
                <p className="k-footnote k-ink-secondary line-clamp-3">
                  {String(association.short_description ?? '')}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {cleanRealisations.length > 0 ? (
        <Section
          title="🏗️ Nos réalisations"
          description="Les projets déjà sortis de terre."
          action={
            <div className="flex gap-2">
              {isAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(listPath('realisations', true))}
                >
                  <Icon name="plus" size={16} />
                  Ajouter
                </Button>
              ) : null}
              <Link
                to={listPath('realisations')}
                className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
              >
                Tout voir
                <Icon name="chevronRight" size={15} />
              </Link>
            </div>
          }
        >
          <div className="k-rail">
            {cleanRealisations.map((realisation) => (
              <Link
                key={realisation.id}
                to={`/realisations/${realisation.id}`}
                className="k-card k-card--interactive group overflow-hidden p-0"
              >
                <Media
                  src={realisation.image_url as string | null}
                  category={categoryKeyFor(realisation.category as string)}
                  emoji={themeEmoji(realisation.category as string, '🏗️')}
                  ratio="16 / 10"
                />
                <div className="p-4">
                  <Badge
                    tone={categoryKeyFor(realisation.category as string)}
                    emoji={themeEmoji(realisation.category as string, '🏗️')}
                  >
                    {(realisation.category as string) || 'Projet'}
                  </Badge>
                  <h3 className="k-title-3 mt-3 line-clamp-2">{realisation.title}</h3>
                  <p className="k-footnote k-ink-secondary mt-1.5 line-clamp-3">
                    {(realisation.description as string) || realisation.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      {quartier.petitions !== undefined ? (
        <Section
          title="✍️ Les habitants se mobilisent"
          description="Des initiatives lancées par des voisins. Une signature suffit pour les soutenir."
          action={
            quartier.petitions && quartier.petitions.length > 0 ? (
              <Link
                to={listPath('petitions')}
                className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
              >
                Tout voir
                <Icon name="chevronRight" size={15} />
              </Link>
            ) : null
          }
        >
          {quartier.petitions && quartier.petitions.length > 0 ? (
            <div className="k-grid">
              {(quartier.petitions as Petition[]).map((petition) => {
                const supports = (petition.supports as number) || 0;
                const progress = getPetitionProgress(petition);

                return (
                  <Link
                    key={petition.id}
                    to={`/petitions/${petition.id}`}
                    className="k-card k-card--interactive flex flex-col p-5"
                  >
                    <Badge
                      tone="petition"
                      emoji={petitionThemeEmoji(petition.theme)}
                      className="mb-3 self-start"
                    >
                      {petition.theme || 'Mobilisation'}
                    </Badge>
                    <h3 className="k-title-3 line-clamp-2">{petition.title}</h3>
                    <p className="k-footnote k-ink-secondary mt-2 line-clamp-2 flex-1">
                      {(petition.summary as string) || petition.description}
                    </p>
                    <div className="mt-4">
                      <Progress value={progress} tone="warm" />
                      <p className="k-caption k-ink-secondary mt-2">
                        <strong className="k-ink tabular-nums">{supports}</strong>{' '}
                        {supports > 1 ? 'voisins ont signé' : 'voisin a signé'}
                      </p>
                    </div>
                  </Link>
                );
              })}

              {session ? (
                <Link
                  to={listPath('petitions', true)}
                  className="k-press flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-warm/40 bg-warm-soft p-6 text-center transition-all hover:-translate-y-1 hover:border-warm hover:shadow-md"
                >
                  <span className="text-4xl" aria-hidden="true">📣</span>
                  <span className="k-title-3 mt-3 text-warm-ink">Une idée pour le quartier ?</span>
                  <span className="k-footnote k-ink-secondary mt-1">
                    Lancez votre pétition et mobilisez vos voisins.
                  </span>
                </Link>
              ) : null}
            </div>
          ) : session ? (
            <EmptyState
              icon="megaphone"
              title="Aucune pétition en cours"
              description="Soyez le premier à lancer une initiative et à mobiliser vos voisins."
              action={
                <Link
                  to={listPath('petitions', true)}
                  className={buttonClass({ variant: 'primary' })}
                >
                  Lancer une initiative
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon="megaphone"
              title="Aucune pétition en cours"
              description="Connectez-vous pour lancer la première initiative de votre quartier."
            />
          )}
        </Section>
      ) : null}
    </Page>
  );
}
