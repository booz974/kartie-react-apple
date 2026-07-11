import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  getCategoryColor,
  getConsultationOptions,
  getOptionText,
  getPetitionProgress,
  getPetitionThemeColor,
  getResultPercentage,
  getVoteButtonClass,
  getVoteEmoji,
} from '@/features/territory/utils/quartierHelpers';
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

  const petitionIds = useMemo(
    () => (petitions ?? []).map((p) => p.id),
    [petitions],
  );
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
  }, [
    baseQuartier,
    events,
    associations,
    actualites,
    realisations,
    petitionsWithSupport,
    consultations,
  ]);

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
          alert('Vous avez déjà voté pour ce sondage.');
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
      alert("Une erreur est survenue lors de l'enregistrement de votre vote.");
    } finally {
      setIsVoting(false);
    }
  }

  function handleOptionClick(consultation: Consultation, optionId: number) {
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
      const votePromises = selectedOptions.map((optionId) =>
        castVote(session.user.id, optionId),
      );
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
      alert("Une erreur est survenue lors de l'enregistrement de vos votes.");
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

  function openEvent(event: AgendaEvent) {
    if (!event) return;
    navigate(event.routePath || `/events/${event.id}`);
  }

  const stats = quartier?.stats as Record<string, unknown> | null | undefined;
  const jeunesValue = parseFloat(String(stats?.jeunes ?? 0)) || 0;

  if (isLoadingQuartier) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl">Chargement du quartier...</p>
      </div>
    );
  }

  if (!quartier) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl">Quartier introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 glass-card px-4 py-2"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  const pollSummary = (displayedPoll as { summary?: string })?.summary ?? '';

  return (
    <div className="desktop-glass-card p-4 md:p-10">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center gap-2 bg-white/30 text-slate-800 font-semibold py-2 px-5 rounded-full transition-all hover:bg-white/50 hover:scale-105 shadow backdrop-blur-sm text-sm md:text-base"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Voir tous les quartiers
      </button>

      <div className="hero-section mb-8 md:mb-12 animate-fade-in">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex items-center gap-3 mb-2 md:mb-4">
            <span className="badge-priority glass-card px-3 py-1 md:px-4 md:py-2 text-xs md:text-sm font-bold text-slate-900 animate-pulse-slow">
              {stats?.pauvrete ? 'Quartier Prioritaire' : 'Quartier Dynamique'}
            </span>
          </div>
          <h1 className="text-3xl md:text-7xl font-black tracking-tight text-slate-900 mb-2 md:mb-3 leading-tight">
            {quartier.name}
          </h1>
          <p className="text-lg md:text-xl text-slate-700 font-light mb-4 md:mb-6">
            Découvrez ce qui fait vibrer le quartier.
          </p>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => navigate(`/quartiers/${quartier.id}/feed`)}
              className="glass-card px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-slate-900 transition-all hover:scale-105 hover:bg-white/50 shadow-lg"
            >
              💬 Consulter le fil d&apos;actualité
            </button>
            <button
              type="button"
              onClick={() => navigate(`/quartiers/${quartier.id}/associations`)}
              className="glass-card px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-slate-900 transition-all hover:scale-105 hover:bg-white/50 shadow-lg"
            >
              🤝 Découvrir les associations
            </button>
            <button
              type="button"
              onClick={() => navigate(`/quartiers/${quartier.id}/infos`)}
              className="glass-card px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-slate-900 transition-all hover:scale-105 hover:bg-white/50 shadow-lg"
            >
              ℹ️ Découvrir le quartier
            </button>
          </div>
        </div>
      </div>

      <div className="bento-grid mb-12">
        <div className="bento-item consultation-express desktop-glass-card p-6 md:p-8 col-span-1 md:col-span-2 row-span-2 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
                  Sondage Express
                </h3>
                {profile?.role === 'admin' ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/quartiers/${quartier.id}/creer-sondage`)}
                    className="glass-card px-3 py-1 text-xs font-bold text-slate-900 hover:bg-white/50 transition-all rounded-lg mb-2"
                  >
                    + Créer
                  </button>
                ) : null}
              </div>
              <p className="text-slate-600">Votre avis compte !</p>
            </div>
            <div className="text-4xl">🗳️</div>
          </div>

          {displayedPoll ? (
            <div className="consultation-content">
              <h4 className="text-xl font-bold text-slate-900 mb-4">{displayedPoll.title}</h4>
              <p className="text-slate-700 mb-6">{pollSummary}</p>

              {showResults && lastVotedPollDetails ? (
                <div>
                  <div className="glass-card p-4 rounded-xl mb-4 bg-green-500/10 border border-green-500/20">
                    <p className="text-sm font-bold text-green-700 text-center mb-4">
                      ✅ Merci pour votre vote !
                    </p>
                  </div>
                  <div className="vote-results space-y-4 mb-6">
                    {(lastVotedPollDetails.options ?? []).map((option) => {
                      const opt = option as { id: number; option_text?: string; votes?: number };
                      const votes = opt.votes || 0;
                      return (
                        <div key={opt.id} className="result-item">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-800">
                              {opt.option_text}
                            </span>
                            <span className="text-sm font-semibold text-slate-600">
                              {votes} vote(s) ({getResultPercentage(votes, lastVotedPollDetails)}%)
                            </span>
                          </div>
                          <div className="w-full bg-white/30 rounded-full h-4 overflow-hidden">
                            <div
                              className="result-bar-fill h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${getResultPercentage(votes, lastVotedPollDetails)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={goToNextPoll}
                    className="w-full glass-card p-4 rounded-xl text-center font-bold text-lg text-slate-900 hover:bg-white/50 transition-all mb-3"
                  >
                    Sondage suivant ➔
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/quartiers/${quartier.id}/list?type=consultations`)
                    }
                    className="w-full glass-card p-3 rounded-xl text-center font-semibold text-slate-700 hover:bg-white/50 transition-all"
                  >
                    Voir tous les sondages →
                  </button>
                </div>
              ) : (
                <div>
                  <div className="vote-options space-y-3">
                    {getConsultationOptions(displayedPoll).map((option, index) => (
                      <button
                        key={option.id || index}
                        type="button"
                        onClick={() => handleOptionClick(displayedPoll, option.id)}
                        disabled={isVoting}
                        className={`vote-button w-full glass-card p-5 rounded-2xl text-left font-bold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group ${getVoteButtonClass(index)}${displayedPoll.multiple_choices && selectedOptions.includes(option.id) ? ' ring-4 ring-offset-2 ring-blue-400 scale-[1.02]' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {displayedPoll.multiple_choices ? (
                              <div
                                className={`w-6 h-6 rounded-md border-2 border-slate-400 flex items-center justify-center transition-all bg-white/40${selectedOptions.includes(option.id) ? ' bg-blue-600 border-blue-600' : ''}`}
                              >
                                {selectedOptions.includes(option.id) ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 text-white"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : null}
                              </div>
                            ) : null}
                            <span>{getOptionText(option)}</span>
                          </div>
                          <span className="text-2xl">{getVoteEmoji(index)}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {displayedPoll.multiple_choices ? (
                    <button
                      type="button"
                      onClick={() => void submitMultipleVotes()}
                      disabled={selectedOptions.length === 0 || isVoting}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      {isVoting ? (
                        <span>Envoi en cours...</span>
                      ) : (
                        <span>Valider mon vote ({selectedOptions.length})</span>
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/quartiers/${quartier.id}/list?type=consultations`)
                    }
                    className="mt-4 w-full glass-card p-3 rounded-xl text-center font-semibold text-slate-700 hover:bg-white/50 transition-all"
                  >
                    Voir tous les sondages →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="consultation-content text-center py-8">
              <p className="text-slate-600">Aucun sondage disponible pour le moment.</p>
            </div>
          )}
        </div>

        <div
          className="col-span-1 md:col-span-2 md:col-start-3 grid grid-cols-2 gap-3 animate-fade-in-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="bento-item stat-key-card desktop-glass-card p-3 h-full flex flex-col items-center justify-center">
            <div className="circular-progress-wrapper-compact">
              <svg className="circular-progress-compact" viewBox="0 0 120 120">
                <circle className="progress-bg" cx="60" cy="60" r="50" />
                <circle
                  className="progress-bar"
                  cx="60"
                  cy="60"
                  r="50"
                  style={{ strokeDashoffset: 314 - (314 * jeunesValue) / 100 }}
                />
              </svg>
              <div className="progress-content-compact">
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-xl font-black text-blue-600">
                    {formatStatValue(stats?.jeunes, true)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs font-bold text-slate-500 text-center uppercase tracking-wide leading-none">
              Jeunes 0-29 ans
            </div>
          </div>

          <div className="bento-item desktop-glass-card p-4 h-full flex flex-col">
            <h3 className="text-sm font-bold mb-4 text-slate-800 text-center">📊 En bref</h3>
            <div className="flex flex-col justify-between flex-grow space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-4xl">👥</div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">
                    {(stats?.population as string) || 'N/A'}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none mt-0.5">
                    Habitants
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-4xl">📉</div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">
                    {formatStatValue(stats?.pauvrete)}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none mt-0.5">
                    Pauvreté
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-4xl">🏠</div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-800">
                    {formatStatValue(stats?.logementsSociaux)}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none mt-0.5">
                    Log. Sociaux
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quartier.events && quartier.events.length > 0 ? (
          <div
            className="bento-item desktop-glass-card p-4 pb-6 col-span-1 md:col-span-2 md:col-start-3 animate-fade-in-up hover-tilt h-fit self-start"
            style={{ animationDelay: '0.3s' }}
            onClick={() => openEvent(quartier.events![0] as AgendaEvent)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEvent(quartier.events![0] as AgendaEvent);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 glass-card rounded-2xl flex items-center justify-center text-3xl">
                  📅
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-blue-600 mb-1">
                  {(quartier.events[0] as AgendaEvent).source === 'association'
                    ? 'ÉVÉNEMENT ASSOCIATIF'
                    : 'PROCHAIN ÉVÉNEMENT'}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">
                  {quartier.events[0].title}
                </h4>
                <p className="text-sm text-slate-600 mb-2">
                  {(quartier.events[0] as AgendaEvent).date}
                </p>
                <p className="text-sm text-slate-700 line-clamp-2">
                  {(quartier.events[0] as { description?: string }).description}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="events-news-grid mb-12 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {quartier.events !== undefined ? (
              <div className="section-modern">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-black text-slate-900">À ne pas manquer</h2>
                  <div className="flex gap-2">
                    {profile?.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/quartiers/${quartier.id}/list?type=events&create=true`)
                        }
                        className="glass-card px-4 py-2 text-sm font-bold text-blue-900 hover:bg-white/50 transition-all rounded-xl"
                      >
                        + Proposer
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => navigate(`/quartiers/${quartier.id}/list?type=events`)}
                      className="glass-card px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white/50 transition-all rounded-xl"
                    >
                      Tout voir →
                    </button>
                  </div>
                </div>
                {quartier.events && quartier.events.length > 0 ? (
                  <div className="modern-list">
                    {quartier.events.slice(0, 3).map((event, index) => (
                      <div
                        key={event.id}
                        className="modern-card hover-tilt desktop-glass-card p-5 rounded-2xl cursor-pointer transition-all"
                        onClick={() => openEvent(event as AgendaEvent)}
                        style={{ animationDelay: `${0.9 + index * 0.1}s` }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEvent(event as AgendaEvent);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-16 h-16 glass-card rounded-xl flex items-center justify-center text-2xl">
                            📅
                          </div>
                          <div className="flex-1 min-w-0">
                            {(event as AgendaEvent).source === 'association' ? (
                              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                                Association
                                {(event as AgendaEvent).association_name
                                  ? ` · ${(event as AgendaEvent).association_name}`
                                  : ''}
                              </p>
                            ) : null}
                            <h4 className="font-bold text-lg text-slate-900 mb-1 truncate">
                              {event.title}
                            </h4>
                            <p className="text-sm font-semibold text-blue-600 mb-1">
                              {(event as AgendaEvent).date}
                            </p>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {(event as { description?: string }).description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : quartier.events === null ? (
                  <div className="p-6 text-center text-red-500 bg-red-50/50 rounded-2xl border border-red-100">
                    <p>⚠️ Impossible de charger les événements.</p>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 desktop-glass-card rounded-2xl">
                    <p>Aucun événement à venir.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="skeleton-loader desktop-glass-card p-8 rounded-2xl">
                <div className="skeleton-line h-4 w-3/4 mb-4" />
                <div className="skeleton-line h-4 w-1/2" />
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {quartier.actualites !== undefined ? (
              <div className="flash-infos-container">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black text-slate-900">Dernières nouvelles</h2>
                  <div className="flex gap-2">
                    {profile?.role === 'admin' ? (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/quartiers/${quartier.id}/list?type=actualites&create=true`)
                        }
                        className="glass-card px-3 py-1.5 text-xs font-bold text-purple-900 hover:bg-white/50 transition-all rounded-lg"
                      >
                        + Partager
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => navigate(`/quartiers/${quartier.id}/list?type=actualites`)}
                      className="glass-card px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white/50 transition-all rounded-lg"
                    >
                      Tout voir →
                    </button>
                  </div>
                </div>
                {quartier.actualites && quartier.actualites.length > 0 ? (
                  <div className="flash-infos-scroll desktop-glass-card p-4 rounded-2xl">
                    <div className="flash-infos-list space-y-0">
                      {(quartier.actualites as News[]).map((news) => (
                        <div
                          key={news.id}
                          className="flash-info-item py-3 border-b border-white/20 last:border-b-0"
                        >
                          <div
                            onClick={() => navigate(`/actualites/${news.id}`)}
                            className="flex gap-3 items-start cursor-pointer"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/actualites/${news.id}`);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="flex-shrink-0 w-8 h-8 glass-card rounded-lg flex items-center justify-center text-xs text-slate-500">
                              {formatDateShort(news.date)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 mb-1 line-clamp-1">
                                {news.title}
                              </h4>
                              <p className="text-xs text-slate-600 line-clamp-1">{news.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : quartier.actualites === null ? (
                  <div className="flash-infos-scroll desktop-glass-card p-4 rounded-2xl text-center text-red-500">
                    <p>⚠️ Erreur de chargement.</p>
                  </div>
                ) : (
                  <div className="flash-infos-scroll desktop-glass-card p-4 rounded-2xl">
                    <p className="text-sm text-slate-500 text-center py-8">
                      Aucune actualité pour le moment.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flash-infos-scroll desktop-glass-card p-4 rounded-2xl animate-pulse">
                <div className="h-10 bg-gray-200 rounded mb-2 w-full" />
                <div className="h-10 bg-gray-200 rounded mb-2 w-3/4" />
              </div>
            )}
          </div>
        </div>
      </div>

      {quartier.associations && quartier.associations.length > 0 ? (
        <div
          className="section-modern mb-12 animate-fade-in-up"
          style={{ animationDelay: '1s' }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900">Vie associative</h2>
            <button
              type="button"
              onClick={() => navigate(`/quartiers/${quartier.id}/associations`)}
              className="glass-card px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white/50 transition-all rounded-xl"
            >
              Tout voir →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(quartier.associations as Association[]).slice(0, 3).map((association) => (
              <div
                key={association.id}
                className="desktop-glass-card rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
                onClick={() =>
                  navigate(`/associations/${association.slug || association.id}`)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/associations/${association.slug || association.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3 mb-3">
                  {association.logo_url ? (
                    <img
                      src={association.logo_url as string}
                      alt={association.name}
                      className="w-12 h-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex w-12 h-12 items-center justify-center rounded-2xl bg-white/70 text-xl">
                      🤝
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{association.name}</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {association.category_label}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 line-clamp-3">
                  {String(association.short_description ?? '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cleanRealisations.length > 0 ? (
        <div
          className="section-modern mb-12 animate-fade-in-up"
          style={{ animationDelay: '1.2s' }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900">Nos réalisations</h2>
            <div className="flex gap-2">
              {profile?.role === 'admin' ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/quartiers/${quartier.id}/list?type=realisations&create=true`)
                  }
                  className="glass-card px-4 py-2 text-sm font-bold text-indigo-900 hover:bg-white/50 transition-all rounded-xl"
                >
                  + Ajouter
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(`/quartiers/${quartier.id}/list?type=realisations`)}
                className="glass-card px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white/50 transition-all rounded-xl"
              >
                Toutes voir →
              </button>
            </div>
          </div>
          <div className="realisations-slider flex overflow-x-auto pb-6 space-x-4 snap-x snap-mandatory scrollbar-hide">
            {cleanRealisations.map((realisation) => (
              <div
                key={realisation.id}
                className="article-card desktop-glass-card rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 flex-none snap-start w-[260px] md:w-[280px]"
                onClick={() => navigate(`/realisations/${realisation.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/realisations/${realisation.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="article-image-wrapper h-32 w-full overflow-hidden bg-slate-200 relative">
                  {realisation.image_url ? (
                    <img
                      src={realisation.image_url as string}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                      alt={realisation.title || ''}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-slate-300 to-slate-400">
                      🏆
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`article-tag px-2 py-1 text-[10px] font-bold rounded-full ${getCategoryColor(realisation.category as string)}`}
                    >
                      {(realisation.category as string) || 'Projet'}
                    </span>
                  </div>
                </div>
                <div className="article-content p-4 bg-white/30 backdrop-blur-sm flex flex-col h-[160px]">
                  <h3 className="font-bold text-slate-800 text-base leading-tight mb-2 line-clamp-2">
                    {realisation.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed flex-grow">
                    {(realisation.description as string) || realisation.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {quartier.petitions !== undefined ? (
        <div
          className="section-modern mb-12 animate-fade-in-up"
          style={{ animationDelay: '1.4s' }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900">Les habitants se mobilisent</h2>
            {quartier.petitions && quartier.petitions.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/quartiers/${quartier.id}/list?type=petitions`)}
                className="glass-card px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white/50 transition-all rounded-xl"
              >
                Toutes voir →
              </button>
            ) : null}
          </div>

          {quartier.petitions && quartier.petitions.length > 0 ? (
            <div className="petitions-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(quartier.petitions as Petition[]).map((petition, index) => (
                <div
                  key={petition.id}
                  className="petition-card-kickstarter desktop-glass-card rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl"
                  onClick={() => navigate(`/petitions/${petition.id}`)}
                  style={{ animationDelay: `${1.5 + index * 0.1}s` }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/petitions/${petition.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="p-5 pb-3">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold uppercase rounded-full mb-3 ${getPetitionThemeColor(petition.theme)}`}
                    >
                      {petition.theme || 'Mobilisation'}
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                      {petition.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                      {(petition.summary as string) || petition.description}
                    </p>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="progress-bar-petition mb-2">
                      <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
                        <div
                          className="progress-fill-petition h-full rounded-full transition-all duration-500"
                          style={{ width: `${getPetitionProgress(petition)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-700">
                      ✍️ <strong>{(petition.supports as number) || 0}</strong> voisins ont signé
                    </p>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      type="button"
                      className="w-full glass-card py-2.5 px-4 rounded-xl text-sm font-bold text-slate-900 hover:bg-white/50 transition-all text-center"
                    >
                      Je signe
                    </button>
                  </div>
                </div>
              ))}

              {session ? (
                <div
                  className="petition-card-cta desktop-glass-card rounded-2xl border-2 border-dashed border-white/40 bg-blue-600/10 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-blue-600/20 hover:border-white/60 hover:-translate-y-1"
                  onClick={() =>
                    navigate(`/quartiers/${quartier.id}/list?type=petitions&create=true`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/quartiers/${quartier.id}/list?type=petitions&create=true`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="text-5xl mb-4">📣</div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">
                    Une idée pour le quartier ?
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Lancez votre pétition et mobilisez vos voisins.
                  </p>
                  <button
                    type="button"
                    className="glass-card px-6 py-2.5 rounded-xl text-sm font-bold text-blue-900 hover:bg-white/50 transition-all"
                  >
                    Lancer une initiative
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="petitions-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {session ? (
                <div
                  className="petition-card-cta desktop-glass-card rounded-2xl border-2 border-dashed border-white/40 bg-blue-600/10 p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-blue-600/20 hover:border-white/60 hover:-translate-y-1 col-span-1 md:col-span-2 lg:col-span-3"
                  onClick={() =>
                    navigate(`/quartiers/${quartier.id}/list?type=petitions&create=true`)
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/quartiers/${quartier.id}/list?type=petitions&create=true`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="text-6xl mb-6">📣</div>
                  <h3 className="font-bold text-2xl text-slate-900 mb-3">
                    Une idée pour le quartier ?
                  </h3>
                  <p className="text-base text-slate-600 mb-6 max-w-md mx-auto">
                    Lancez votre pétition et mobilisez vos voisins pour transformer votre quartier.
                  </p>
                  <button
                    type="button"
                    className="glass-card px-8 py-3 rounded-xl text-base font-bold text-blue-900 hover:bg-white/50 transition-all"
                  >
                    Lancer une initiative
                  </button>
                </div>
              ) : (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12">
                  <p className="text-slate-600">
                    Aucune pétition pour le moment. Connectez-vous pour lancer la vôtre !
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
