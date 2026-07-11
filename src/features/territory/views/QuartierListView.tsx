import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import CreateArticleForm from '@/features/content/components/CreateArticleForm';
import CreateEventForm from '@/features/content/components/CreateEventForm';
import CreateNewsForm from '@/features/content/components/CreateNewsForm';
import ArticleListPage from '@/features/content/components/ArticleListPage';
import EventListPage from '@/features/content/components/EventListPage';
import NewsListPage from '@/features/content/components/NewsListPage';
import CreatePetitionForm from '@/features/democracy/components/CreatePetitionForm';
import ConsultationListPage from '@/features/democracy/components/ConsultationListPage';
import PetitionListPage from '@/features/democracy/components/PetitionListPage';
import { createEvent, createNews, createRealisation } from '@/api/content';
import { createPetition, getConsultationsForList } from '@/api/democracy';
import { getQuartierEvents, getQuartierListItems, getQuartierSummary } from '@/api/quartiers';
import type {
  AgendaEvent,
  Consultation,
  Event,
  News,
  Petition,
  Quartier,
  Realisation,
} from '@/lib/types/contract';
import { territoryKeys } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';

type ListType = 'events' | 'actualites' | 'realisations' | 'petitions' | 'consultations';

type ListItem = AgendaEvent | Event | News | Realisation | Petition | Consultation;

export default function QuartierListView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const session = useAuthStore((state) => state.session);

  const type = searchParams.get('type') as ListType | null;
  const isCreating = searchParams.get('create') === 'true';

  const [quartier, setQuartier] = useState<Pick<Quartier, 'id' | 'name'> | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const quartierId = id ? Number(id) : undefined;

  function invalidateContentQueries(
    contentType: 'events' | 'actualites' | 'realisations',
    itemId?: number,
  ) {
    if (!quartierId) return;
    if (contentType === 'events') {
      void queryClient.invalidateQueries({ queryKey: territoryKeys.quartierEvents(quartierId) });
      if (itemId != null) {
        void queryClient.invalidateQueries({ queryKey: territoryKeys.event(itemId) });
      }
    } else if (contentType === 'actualites') {
      void queryClient.invalidateQueries({ queryKey: territoryKeys.quartierNews(quartierId) });
      if (itemId != null) {
        void queryClient.invalidateQueries({ queryKey: territoryKeys.news(itemId) });
      }
    } else {
      void queryClient.invalidateQueries({
        queryKey: territoryKeys.quartierRealisations(quartierId),
      });
      if (itemId != null) {
        void queryClient.invalidateQueries({ queryKey: territoryKeys.realisation(itemId) });
      }
    }
  }

  const loadData = useCallback(async () => {
    if (!quartierId || !type) return;
    setLoading(true);

    try {
      if (!quartier || quartier.id !== quartierId) {
        const qData = await getQuartierSummary(quartierId);
        if (!qData) throw new Error('Quartier not found');
        setQuartier(qData);
      }

      if (type === 'events') {
        const events = await getQuartierEvents(quartierId);
        setItems(events ?? []);
      } else if (type === 'consultations') {
        setItems(await getConsultationsForList(quartierId));
      } else {
        setItems((await getQuartierListItems(quartierId, type)) as ListItem[]);
      }
    } catch (err) {
      console.error('Error loading list data:', err);
    } finally {
      setLoading(false);
    }
  }, [quartier, quartierId, type]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleBack() {
    navigate(`/quartiers/${quartierId}`);
  }

  function cancelCreate() {
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next);
  }

  function handleDelete(itemId: number | string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (type === 'events' || type === 'actualites' || type === 'realisations') {
      const numericId = typeof itemId === 'number' ? itemId : Number(itemId);
      invalidateContentQueries(type, Number.isFinite(numericId) ? numericId : undefined);
    }
  }

  async function handleCreateEvent(payload: Record<string, unknown>) {
    if (!quartier) return;
    const data = await createEvent({ ...payload, quartier_id: quartier.id });
    if (data) {
      setItems((prev) => [...prev, data as Event]);
      invalidateContentQueries('events', data.id);
      cancelCreate();
    }
  }

  async function handleCreateNews(payload: Record<string, unknown>) {
    if (!quartier) return;
    const data = await createNews({ ...payload, quartier_id: quartier.id });
    if (data) {
      setItems((prev) => [...prev, data as News]);
      invalidateContentQueries('actualites', data.id);
      cancelCreate();
    }
  }

  async function handleCreatePetition(payload: Record<string, unknown>) {
    if (!quartier) return;
    const data = await createPetition({ ...payload, quartier_id: quartier.id });
    if (data) {
      setItems((prev) => [...prev, data as Petition]);
      cancelCreate();
    }
  }

  async function handleCreateArticle(payload: Record<string, unknown>) {
    // Prod schema has no realisations.user_id (PGRST204 if sent). Vue still sends it;
    // React omits it so admin create works against the immutable deployed contract.
    if (!quartier) return;
    try {
      const articleData = {
        title: payload.title,
        category: payload.category,
        description: payload.description,
        content: payload.content,
        image_url: payload.image_url,
        quartier_id: quartier.id,
      };

      const data = await createRealisation(articleData);
      if (data) {
        setItems((prev) => [...prev, data as Realisation]);
        invalidateContentQueries('realisations', data.id);
        cancelCreate();
      }
    } catch (err) {
      console.error('Erreur création réalisation :', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Erreur: ${message}`);
    }
  }

  const quartierName = useMemo(() => quartier?.name ?? '', [quartier]);

  if (!quartier) {
    return <div className="text-center p-10">Chargement...</div>;
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto mb-6 px-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 bg-white/30 text-slate-800 font-semibold py-2 px-5 rounded-full transition-all hover:bg-white/50 hover:scale-105 shadow backdrop-blur-sm"
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
          Retour au quartier
        </button>
      </div>

      {isCreating ? (
        <div className="max-w-4xl mx-auto px-4">
          {type === 'events' ? (
            <CreateEventForm onCancel={cancelCreate} onCreateEvent={handleCreateEvent} />
          ) : null}
          {type === 'actualites' ? (
            <CreateNewsForm onCancel={cancelCreate} onCreateNews={handleCreateNews} />
          ) : null}
          {type === 'petitions' ? (
            <CreatePetitionForm onCancel={cancelCreate} onCreatePetition={handleCreatePetition} />
          ) : null}
          {type === 'realisations' ? (
            <CreateArticleForm onCancel={cancelCreate} onCreateArticle={handleCreateArticle} />
          ) : null}
        </div>
      ) : loading ? (
        <div className="text-center p-10">Chargement...</div>
      ) : (
        <div>
          {type === 'events' ? (
            <EventListPage
              events={items as AgendaEvent[]}
              quartierName={quartierName}
              onBack={handleBack}
              onDelete={handleDelete}
            />
          ) : null}
          {type === 'petitions' ? (
            <PetitionListPage
              petitions={items as Petition[]}
              quartierName={quartierName}
              session={session}
              onBack={handleBack}
              onDelete={(itemId) => handleDelete(itemId)}
            />
          ) : null}
          {type === 'actualites' ? (
            <NewsListPage
              newsItems={items as News[]}
              quartierName={quartierName}
              onBack={handleBack}
              onDelete={(itemId) => handleDelete(itemId)}
            />
          ) : null}
          {type === 'consultations' ? (
            <ConsultationListPage
              consultations={items as Consultation[]}
              quartierName={quartierName}
              onBack={handleBack}
              onConsultationSelected={(consultationId) =>
                navigate(`/consultations/${consultationId}`)
              }
              onDelete={(itemId) => handleDelete(itemId)}
            />
          ) : null}
          {type === 'realisations' ? (
            <ArticleListPage
              articles={items as Realisation[]}
              quartierName={quartierName}
              onBack={handleBack}
              onDelete={(itemId) => handleDelete(itemId)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
