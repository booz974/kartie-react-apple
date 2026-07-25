import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { checkUserAlaUneVote } from '@/api/alaUne';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Progress from '@/components/ui/Progress';
import SafeImage from '@/components/ui/SafeImage';
import { surfaceClass } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
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

  const articleImageUrl =
    (data.article as (AlaUneContent & { image_url?: string | null }) | undefined)?.image_url ??
    null;

  const eventLocation =
    (data.event as (AlaUneContent & { location?: string | null }) | undefined)?.location ?? '';

  const sondageOptions = (data.sondage?.consultation_options ?? []) as AlaUneSondageOption[];
  const eventDate = data.event?.date ? new Date(data.event.date) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-8 lg:col-span-2">
        {data.article ? (
          // Toute la mise en avant est une seule cible : un titre et une image
          // qui pointent vers le même endroit ne se cliquent pas séparément.
          <button
            type="button"
            onClick={viewArticle}
            className="k-press k-press-subtle block w-full text-left"
          >
            <div className="relative">
              <SafeImage
                src={articleImageUrl}
                alt={data.article.title ?? "Image de l'article"}
                className="h-64 w-full rounded-lg object-cover"
              />
              <Badge tone="warm" pill className="absolute left-3 top-3">
                Actualité
              </Badge>
            </div>
            <h3 className="k-title-2 mt-4 text-balance">{data.article.title}</h3>
            <p className="k-body k-ink-secondary k-measure mt-2 line-clamp-3">
              {data.article.description}
            </p>
            <span className="k-subhead mt-3 inline-flex items-center gap-1 font-semibold text-accent">
              Lire la suite
              <Icon name="arrowRight" size={16} />
            </span>
          </button>
        ) : (
          <p className="k-subhead k-ink-tertiary py-8 text-center">
            Aucune actualité à la une pour le moment.
          </p>
        )}

        {data.flashInfos && data.flashInfos.length > 0 ? (
          <div className={surfaceClass({ variant: 'sunken', className: 'p-5' })}>
            <h3 className="k-eyebrow mb-3 flex items-center gap-2">
              <Icon name="megaphone" size={14} />
              Flash infos
            </h3>
            <ul className="k-list">
              {data.flashInfos.map((info) => (
                <li key={info.id} className="k-subhead flex items-start gap-2.5 py-2.5">
                  <Icon name="dot" size={9} className="mt-1.5 shrink-0 text-accent" />
                  <span>{info.content}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-8">
        {data.event ? (
          <div className={surfaceClass({ className: 'p-5' })}>
            <div className="flex items-start gap-4">
              {eventDate ? (
                <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-accent-soft py-2 text-accent">
                  <span className="k-title-3 tabular-nums">{eventDate.getDate()}</span>
                  <span className="k-caption-2 uppercase">
                    {eventDate.toLocaleString('fr-FR', { month: 'short' })}
                  </span>
                </div>
              ) : null}
              <div className="min-w-0">
                <h3 className="k-callout font-semibold text-balance">{data.event.title}</h3>
                {eventLocation ? (
                  <p className="k-footnote k-ink-secondary mt-1 flex items-center gap-1.5">
                    <Icon name="mapPin" size={14} className="shrink-0" />
                    {eventLocation}
                  </p>
                ) : null}
              </div>
            </div>
            <Button variant="secondary" block onClick={viewEvent} className="mt-4">
              Voir les détails
            </Button>
          </div>
        ) : null}

        {data.sondage ? (
          <div className={surfaceClass({ className: 'p-5' })}>
            <Badge tone="accent" className="mb-3">
              Sondage
            </Badge>
            <h3 className="k-callout font-semibold text-balance">{data.sondage.question}</h3>

            {hasVoted ? (
              <div className="mt-4 flex flex-col gap-3">
                {sondageOptions.map((option) => {
                  const percentage = Math.round(((option.vote_count ?? 0) / totalVotes) * 100);
                  return (
                    <div key={option.id ?? option.option_text}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="k-subhead">{option.option_text}</span>
                        <span className="k-footnote k-ink-secondary tabular-nums">
                          {percentage}%
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        label={`${option.option_text ?? 'Option'} : ${percentage}%`}
                      />
                    </div>
                  );
                })}
                <p className="k-footnote k-ink-tertiary mt-1 flex items-center gap-1.5">
                  <Icon name="checkCircle" size={15} className="text-success" />
                  Merci d&apos;avoir voté.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {sondageOptions.map((option, index) => (
                  <Button
                    key={option.id ?? index}
                    variant="secondary"
                    block
                    onClick={() => voteForOption(option, index)}
                    className="justify-start text-left"
                  >
                    {option.option_text}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isAdmin ? (
        <div className="lg:col-span-3">
          <Button
            variant="ghost"
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
