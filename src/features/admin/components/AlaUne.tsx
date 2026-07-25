import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { checkUserAlaUneVote } from '@/api/alaUne';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import Progress from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { sanitizeStorageUrl } from '@/utils/imageUtils';
import type { CategoryKey } from '@/design/categories';
import type { AlaUneContent, AlaUneVM } from '@/lib/types/contract';

interface AlaUneSondageOption {
  id?: number;
  option_text?: string;
  vote_count?: number;
}

interface AlaUneProps {
  data: AlaUneVM;
  isAdmin?: boolean;
  session?: Session | null;
  onVote?: (voteData: { sondageId: number; optionId: number; userId: string }) => void;
  onViewArticle?: (article: AlaUneContent & { description?: string | null }) => void;
  onViewEvent?: (event: AlaUneContent & { date?: string | null }) => void;
  onManage?: () => void;
}

/**
 * Repères des options d'un sondage. Un chiffre coloré se vise plus vite qu'une
 * puce grise, et il rend le bandeau lisible d'un coup d'œil.
 */
const OPTION_MARKERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

/** Teintes des barres de résultat : trois séries suffisent à distinguer. */
const RESULT_TONES = ['accent', 'warm', 'success'] as const;

/** Couleur et émoji tournants des flashs info, pour que la liste reste vivante. */
const FLASH_TONES: { tone: CategoryKey; emoji: string }[] = [
  { tone: 'petition', emoji: '📣' },
  { tone: 'news', emoji: '⚡' },
  { tone: 'asso', emoji: '📌' },
  { tone: 'quartier', emoji: '🔔' },
];

export default function AlaUne({
  data,
  isAdmin = false,
  session = null,
  onVote,
  onViewArticle,
  onViewEvent,
  onManage,
}: AlaUneProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;

    async function loadVoteStatus() {
      if (!session?.user || !data.sondage?.id) {
        setHasVoted(false);
        return;
      }

      try {
        const voted = await checkUserAlaUneVote(session.user.id, data.sondage.id);
        if (!cancelled) setHasVoted(voted);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de vote :', error);
        if (!cancelled) setHasVoted(false);
      }
    }

    void loadVoteStatus();
    return () => {
      cancelled = true;
    };
  }, [session, data.sondage?.id]);

  const totalVotes = useMemo(() => {
    const options = data.sondage?.consultation_options as AlaUneSondageOption[] | undefined;
    if (!options) return 1;
    return options.reduce((sum, option) => sum + (option.vote_count || 0), 0) || 1;
  }, [data.sondage?.consultation_options]);

  // Total réel, uniquement pour l'affichage : `totalVotes` ne peut pas descendre
  // sous 1 puisqu'il sert de diviseur.
  const castVotes = useMemo(() => {
    const options = data.sondage?.consultation_options as AlaUneSondageOption[] | undefined;
    if (!options) return 0;
    return options.reduce((sum, option) => sum + (option.vote_count || 0), 0);
  }, [data.sondage?.consultation_options]);

  function voteForOption(_option: AlaUneSondageOption, index: number) {
    if (!session?.user) {
      toast.warning('Connexion requise', 'Créez un compte ou connectez-vous pour voter.');
      return;
    }

    if (!data.sondage?.id) return;

    onVote?.({
      sondageId: data.sondage.id,
      optionId: index,
      userId: session.user.id,
    });

    setHasVoted(true);
  }

  function viewArticle() {
    if (data.article) onViewArticle?.(data.article);
  }

  function viewEvent() {
    if (data.event) onViewEvent?.(data.event);
  }

  const articleImageUrl = sanitizeStorageUrl(
    (data.article as (AlaUneContent & { image_url?: string | null }) | undefined)?.image_url ??
      null,
  );

  const eventImageUrl = sanitizeStorageUrl(
    (data.event as (AlaUneContent & { image_url?: string | null }) | undefined)?.image_url ?? null,
  );

  const eventLocation =
    (data.event as (AlaUneContent & { location?: string | null }) | undefined)?.location ?? '';

  const sondageOptions = (data.sondage?.consultation_options ?? []) as AlaUneSondageOption[];
  const eventDate = data.event?.date ? new Date(data.event.date) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        {data.article ? (
          // Toute la mise en avant est une seule cible : un titre et une image
          // qui pointent vers le même endroit ne se cliquent pas séparément.
          <button
            type="button"
            onClick={viewArticle}
            className="k-card k-card--interactive group overflow-hidden p-0 text-left"
          >
            <Media
              src={articleImageUrl}
              category="news"
              ratio="16 / 9"
              overlay={
                <>
                  <Badge tone="news" emoji="📰" size="lg" onMedia>
                    Actualité
                  </Badge>
                  <h3 className="k-title-1 k-vibrant mt-3 text-balance drop-shadow-lg">
                    {data.article.title}
                  </h3>
                </>
              }
            />
            <div className="p-5 md:p-6">
              <p className="k-body k-ink-secondary k-measure line-clamp-3">
                {data.article.description}
              </p>
              <span className="k-callout mt-4 inline-flex items-center gap-1.5 font-semibold text-accent-ink">
                Lire la suite
                <Icon
                  name="arrowRight"
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </span>
            </div>
          </button>
        ) : (
          <div className="k-card k-empty">
            <span className="text-5xl leading-none" aria-hidden="true">
              📰
            </span>
            <p className="k-title-3">Aucune actualité à la une</p>
            <p className="k-subhead k-ink-secondary k-measure">
              La prochaine actualité mise en avant s&apos;affichera ici.
            </p>
          </div>
        )}

        {data.flashInfos && data.flashInfos.length > 0 ? (
          <div className="k-card overflow-hidden p-0">
            <div className="k-banner--warm flex items-center gap-2.5 px-5 py-3.5">
              <span aria-hidden="true" className="text-xl leading-none">
                ⚡
              </span>
              <h3 className="k-callout k-vibrant font-semibold">Flash infos</h3>
              <Badge tone="warm" onMedia className="ml-auto tabular-nums">
                {data.flashInfos.length}
              </Badge>
            </div>
            <ul className="k-list p-3">
              {data.flashInfos.map((info, index) => {
                const flash = FLASH_TONES[index % FLASH_TONES.length];
                return (
                  <li key={info.id} className="flex items-start gap-3 p-2.5">
                    <Chip tone={flash.tone} size={34}>
                      {flash.emoji}
                    </Chip>
                    <span className="k-subhead k-ink pt-1.5">{info.content}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        {data.event ? (
          <button
            type="button"
            onClick={viewEvent}
            className="k-card k-card--interactive group overflow-hidden p-0 text-left"
          >
            <Media
              src={eventImageUrl}
              category="event"
              ratio="4 / 3"
              overlay={
                <div className="flex items-end gap-3">
                  {eventDate ? (
                    <span className="k-glass-thick flex w-14 shrink-0 flex-col items-center rounded-md py-1.5 text-cat-event-ink">
                      <span className="k-title-3 tabular-nums">{eventDate.getDate()}</span>
                      <span className="k-caption-2 uppercase">
                        {eventDate.toLocaleString('fr-FR', { month: 'short' })}
                      </span>
                    </span>
                  ) : null}
                  <Badge tone="event" emoji="🎉" onMedia>
                    Événement
                  </Badge>
                </div>
              }
            />
            <div className="p-5">
              <h3 className="k-title-3 text-balance">{data.event.title}</h3>
              {eventLocation ? (
                <p className="k-footnote k-ink-secondary mt-2 flex items-center gap-1.5">
                  <Icon name="mapPin" size={15} className="shrink-0 text-cat-event" />
                  {eventLocation}
                </p>
              ) : null}
              <span className="k-subhead mt-4 inline-flex items-center gap-1.5 font-semibold text-accent-ink">
                Voir les détails
                <Icon
                  name="arrowRight"
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </span>
            </div>
          </button>
        ) : null}

        {data.sondage ? (
          <div className="k-card overflow-hidden p-0">
            <div className="k-banner--consult px-5 py-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-xl leading-none">
                  🗳️
                </span>
                <p className="k-caption k-vibrant uppercase tracking-wider">Sondage express</p>
              </div>
              <h3 className="k-callout k-vibrant mt-2 text-balance font-semibold">
                {data.sondage.question}
              </h3>
              {castVotes > 0 ? (
                <p className="k-footnote mt-1.5 text-white/85 tabular-nums">
                  {castVotes} vote{castVotes > 1 ? 's' : ''} déjà exprimé
                  {castVotes > 1 ? 's' : ''}
                </p>
              ) : (
                <p className="k-footnote mt-1.5 text-white/85">Soyez le premier à répondre.</p>
              )}
            </div>

            {hasVoted ? (
              <div className="flex flex-col gap-4 p-5">
                {sondageOptions.map((option, index) => {
                  const percentage = Math.round(((option.vote_count ?? 0) / totalVotes) * 100);
                  return (
                    <div key={option.id ?? option.option_text}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="k-subhead font-medium">{option.option_text}</span>
                        <span className="k-footnote font-semibold text-cat-consult-ink tabular-nums">
                          {percentage}%
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        tone={RESULT_TONES[index % RESULT_TONES.length]}
                        label={`${option.option_text ?? 'Option'} : ${percentage}%`}
                      />
                    </div>
                  );
                })}
                <p className="k-footnote k-ink-secondary flex items-center gap-2">
                  <span aria-hidden="true">✅</span>
                  Merci d&apos;avoir voté.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 p-4">
                {sondageOptions.map((option, index) => (
                  <button
                    key={option.id ?? index}
                    type="button"
                    onClick={() => voteForOption(option, index)}
                    className="k-card k-card--flat k-card--interactive flex items-center gap-3 p-3 text-left"
                  >
                    <Chip tone="consult" size={34}>
                      {OPTION_MARKERS[index % OPTION_MARKERS.length]}
                    </Chip>
                    <span className="k-subhead min-w-0 flex-1 font-semibold">
                      {option.option_text}
                    </span>
                    <Icon name="chevronRight" size={18} className="k-ink-quaternary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <div className="lg:col-span-3">
          <Button
            variant="tinted"
            size="sm"
            onClick={onManage}
            leading={<Icon name="settings" size={16} />}
          >
            Administrer le contenu
          </Button>
        </div>
      ) : null}
    </div>
  );
}
