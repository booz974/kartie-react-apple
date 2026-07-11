import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import AlaUne from '@/features/admin/components/AlaUne';
import QuartierCard from '@/features/territory/components/QuartierCard';
import { incrementAlaUneVote } from '@/api/alaUne';
import { useAlaUneData, useInvalidateAlaUne } from '@/queries/alaUne';
import { useQuartierZones } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin as checkIsAdmin } from '@/lib/types/contract';
import type { AlaUneContent } from '@/lib/types/contract';

const TABS = [
  { id: 'est-data', label: "Quartiers de l'Est" },
  { id: 'centre-data', label: 'Centre & Mi-Pentes' },
  { id: 'hauteurs-data', label: 'Hauteurs & Périphérie' },
  { id: 'ouest-data', label: 'Ouest & Littoral' },
] as const;

export default function HomeView() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = checkIsAdmin(profile);

  const [activeTab, setActiveTab] = useState<string>('est-data');
  const [parent] = useAutoAnimate<HTMLDivElement>({ duration: 300 });

  const { data: quartierZones = {}, isLoading } = useQuartierZones();
  const { data: alaUneData } = useAlaUneData();
  const invalidateAlaUne = useInvalidateAlaUne();

  const showAlaUneSection =
    alaUneData &&
    (alaUneData.article || alaUneData.event || alaUneData.sondage);

  async function handleAlaUneVote(voteData: {
    sondageId: number;
    optionId: number;
    userId: string;
  }) {
    if (!session?.user) {
      alert('Vous devez être connecté pour voter.');
      return;
    }

    try {
      const { sondageId, optionId } = voteData;

      if (!sondageId || optionId === undefined) {
        throw new Error(
          'Les informations pour le vote (sondageId, optionId, userId) sont incomplètes.',
        );
      }

      await incrementAlaUneVote(sondageId, optionId);
      await invalidateAlaUne();
      alert('Vote enregistré ! Merci pour votre participation.');
    } catch (err) {
      console.error('Erreur lors du vote:', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Une erreur est survenue lors de l'enregistrement de votre vote :\n\n${message}`);
    }
  }

  function handleViewAlaUneArticle(article: AlaUneContent & { description?: string | null }) {
    navigate(`/actualites/${article.id}`);
  }

  function handleViewAlaUneEvent(event: AlaUneContent & { date?: string | null }) {
    navigate(`/events/${event.id}`);
  }

  return (
    <div>
      <section className="desktop-glass-card text-gray-800 rounded-3xl shadow-lg flex items-center justify-center p-6 md:p-16 my-8">
        <div className="text-center space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight">
            Au cœur de Saint-Denis
          </h1>
          <p className="text-base md:text-xl max-w-3xl mx-auto font-light">
            Explorez les 20 quartiers qui font battre le cœur de la ville. Découvrez leurs défis,
            leurs projets et participez à leur avenir !
          </p>
          <a
            href="#quartiers"
            className="inline-block bg-white/60 text-black font-bold py-2 px-6 md:py-3 md:px-8 rounded-full text-base md:text-lg transition transform hover:scale-110 shadow-lg"
          >
            Découvrir les quartiers
          </a>
        </div>
      </section>

      <section id="stats" className="my-16">
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-10 text-black"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          La Capitale en un Coup d&apos;Œil
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="desktop-glass-card p-6 text-center">
            <div className="text-4xl text-blue-500 mb-2">🧑‍🤝‍🧑</div>
            <span className="text-3xl font-bold block text-slate-900">156 149</span>
            <p className="text-slate-700">Habitants</p>
          </div>
          <div className="desktop-glass-card p-6 text-center">
            <div className="text-4xl text-green-500 mb-2">📈</div>
            <span className="text-3xl font-bold block text-slate-900">+0.9%</span>
            <p className="text-slate-700">Croissance</p>
          </div>
          <div className="desktop-glass-card p-6 text-center">
            <div className="text-4xl text-orange-500 mb-2">💼</div>
            <span className="text-3xl font-bold block text-slate-900">73.6%</span>
            <p className="text-slate-700">Taux d&apos;emploi</p>
          </div>
          <div className="desktop-glass-card p-6 text-center">
            <div className="text-4xl text-red-500 mb-2">🏠</div>
            <span className="text-3xl font-bold block text-slate-900">9 900</span>
            <p className="text-slate-700">Entreprises</p>
          </div>
          <div className="desktop-glass-card p-6 text-center col-span-2 md:col-span-1">
            <div className="text-4xl text-purple-500 mb-2">💶</div>
            <span className="text-3xl font-bold block text-slate-900">18 270 €</span>
            <p className="text-slate-700">Revenu Médian</p>
          </div>
        </div>
      </section>

      {showAlaUneSection ? (
        <section id="a-la-une" className="my-16">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-10 text-black"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            Infos à la Une
          </h2>
          <AlaUne
            data={alaUneData}
            isAdmin={isAdmin}
            session={session}
            onVote={handleAlaUneVote}
            onViewArticle={handleViewAlaUneArticle}
            onViewEvent={handleViewAlaUneEvent}
            onManage={() => navigate('/admin/alaune')}
          />
        </section>
      ) : null}

      <section id="quartiers" className="my-24">
        <h2
          className="text-3xl md:text-4xl font-bold text-center mb-10 text-black"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          Zoom sur les Territoires
        </h2>

        {isLoading ? (
          <div className="text-center p-10">
            <p className="text-xl font-semibold text-gray-700">Chargement des données...</p>
          </div>
        ) : (
          <div className="desktop-glass-card p-4">
            <div className="flex flex-wrap justify-center gap-2 mb-6 bg-white/20 p-2 rounded-xl">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button${activeTab === tab.id ? ' active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div id="tab-content" className="p-2" ref={parent}>
              {TABS.map((tab) => (
                <div key={tab.id} className={activeTab === tab.id ? '' : 'hidden'}>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(quartierZones[tab.id] ?? []).map((quartier) => (
                      <QuartierCard key={quartier.id} quartier={quartier} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
