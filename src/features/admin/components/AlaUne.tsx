import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { checkUserAlaUneVote } from '@/api/alaUne';
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
      alert('Vous devez être connecté pour voter.');
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
    (data.article as (AlaUneContent & { image_url?: string | null }) | undefined)?.image_url ||
    'https://via.placeholder.com/800x400';

  const eventLocation =
    (data.event as (AlaUneContent & { location?: string | null }) | undefined)?.location ?? '';

  const sondageOptions = (data.sondage?.consultation_options ?? []) as AlaUneSondageOption[];

  return (
    <section id="a-la-une" className="my-16">
      <div className="desktop-glass-card p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {data.article ? (
              <div
                className="bg-white/20 p-6 rounded-2xl cursor-pointer hover:bg-white/30 transition"
                onClick={viewArticle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    viewArticle();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="relative mb-4">
                  <img
                    src={articleImageUrl}
                    alt="Image de l'article"
                    className="rounded-lg w-full h-64 object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ACTUALITÉ
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{data.article.title}</h3>
                <p className="text-slate-700 line-clamp-3">{data.article.description}</p>
                <button type="button" className="mt-4 text-blue-600 font-semibold hover:underline">
                  Lire la suite →
                </button>
              </div>
            ) : (
              <p className="text-center p-10 text-slate-600">
                Aucune actualité à la une pour le moment.
              </p>
            )}

            {data.flashInfos && data.flashInfos.length > 0 ? (
              <div
                style={{ backgroundColor: '#27A3F5', color: '#000' }}
                className="p-6 rounded-2xl shadow-lg"
              >
                <h4
                  className="font-bold text-xl mb-4 border-b-2 pb-2"
                  style={{ borderColor: 'rgba(0,0,0,0.2)' }}
                >
                  FLASH INFOS
                </h4>
                <ul className="space-y-3">
                  {data.flashInfos.map((info) => (
                    <li key={info.id} className="flex items-start">
                      <span className="mr-3 mt-1">❯</span>
                      <span>{info.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            {data.event ? (
              <div className="bg-white/20 p-6 rounded-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-pink-500 text-white p-3 rounded-lg text-center">
                    <div className="font-bold text-2xl">
                      {new Date(data.event.date ?? '').getDate()}
                    </div>
                    <div className="text-xs uppercase">
                      {new Date(data.event.date ?? '').toLocaleString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{data.event.title}</h4>
                    <p className="text-sm text-slate-600">{eventLocation}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={viewEvent}
                  className="block w-full text-center bg-white/50 font-semibold py-2 rounded-lg hover:bg-white/80 transition"
                >
                  Voir les détails
                </button>
              </div>
            ) : null}

            {data.sondage ? (
              <div className="bg-white/20 p-6 rounded-2xl">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block">
                  SONDAGE
                </span>
                <h4 className="font-bold text-lg text-slate-800 mb-4">{data.sondage.question}</h4>

                {hasVoted ? (
                  <div className="space-y-3">
                    {sondageOptions.map((option) => (
                      <div key={option.id ?? option.option_text}>
                        <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                          <span>{option.option_text}</span>
                          <span>
                            {Math.round(((option.vote_count ?? 0) / totalVotes) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-300/50 rounded-full h-2.5">
                          <div
                            className="bg-blue-500 h-2.5 rounded-full"
                            style={{
                              width: `${((option.vote_count ?? 0) / totalVotes) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-slate-600 text-center mt-4">
                      Merci d&apos;avoir voté !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sondageOptions.map((option, index) => (
                      <button
                        key={option.id ?? index}
                        type="button"
                        onClick={() => voteForOption(option, index)}
                        className="w-full text-left bg-white/50 hover:bg-white/80 font-semibold py-3 px-4 rounded-lg transition text-slate-800"
                      >
                        {option.option_text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {isAdmin ? (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={onManage}
              className="bg-slate-800 text-white font-bold py-2 px-6 rounded-full hover:bg-slate-900 transition"
            >
              Administrer le contenu
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
