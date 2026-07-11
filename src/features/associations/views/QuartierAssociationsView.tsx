import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ASSOCIATION_CATEGORIES, createAssociation } from '@/api/associations';
import AssociationCard from '@/features/associations/components/AssociationCard';
import AssociationForm, {
  type AssociationFormPayload,
} from '@/features/associations/components/AssociationForm';
import { associationKeys, useQuartierAssociations } from '@/queries/associations';
import { useQuartier } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import type { Association } from '@/lib/types/contract';

export default function QuartierAssociationsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: idParam } = useParams<{ id: string }>();
  const quartierId = idParam ? parseInt(idParam, 10) : undefined;

  const session = useAuthStore((state) => state.session);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [followersDelta, setFollowersDelta] = useState<Record<number, number>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const listFilters = useMemo(
    () => ({
      includeManaged: Boolean(session?.user),
    }),
    [session?.user],
  );

  const { data: quartier, isLoading: quartierLoading } = useQuartier(quartierId);
  const {
    data: associations = [],
    isLoading: associationsLoading,
    followStates,
  } = useQuartierAssociations(quartierId, listFilters, session?.user?.id);

  const filteredAssociations = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return associations.filter((association) => {
      const matchesCategory =
        !selectedCategory || association.category === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        association.name.toLowerCase().includes(searchTerm) ||
        String(association.short_description || '')
          .toLowerCase()
          .includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [associations, search, selectedCategory]);

  const isLoading = quartierLoading || associationsLoading;

  function openAssociation(association: Association) {
    navigate(`/associations/${association.slug || association.id}`);
  }

  function handleFollowUpdated({
    association,
    following,
  }: {
    association: Association;
    following: boolean;
  }) {
    const delta = following ? 1 : -1;
    setFollowersDelta((prev) => ({
      ...prev,
      [association.id]: (prev[association.id] ?? 0) + delta,
    }));
  }

  function getFollowersCount(association: Association) {
    const delta = followersDelta[association.id] ?? 0;
    return Math.max(0, (association.followers_count || 0) + delta);
  }

  async function handleCreateAssociation(payload: AssociationFormPayload) {
    if (!quartier || isCreating) return;

    setIsCreating(true);
    const result = await createAssociation({
      ...payload,
      quartier_id: quartier.id,
      social_links: {},
    });
    setIsCreating(false);

    if (!result.success) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : String((result.error as { message?: string })?.message || result.error);
      alert(`Impossible de créer l'association : ${message}`);
      return;
    }

    setShowCreateForm(false);
    await queryClient.invalidateQueries({
      queryKey: associationKeys.list(quartier.id, listFilters),
    });
    navigate(`/associations/${result.associationId}/dashboard`);
  }

  if (!quartier && !isLoading) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Chargement...</p>
      </div>
    );
  }

  if (!quartier) {
    return (
      <div className="p-10 text-center">
        <p className="text-xl font-semibold text-slate-700">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(`/quartiers/${quartier.id}`)}
          className="inline-flex items-center gap-2 rounded-full bg-white/70 px-5 py-2.5 text-sm font-bold text-slate-800 shadow transition hover:bg-white"
        >
          Retour au quartier
        </button>

        {session ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {showCreateForm ? 'Fermer le formulaire' : 'Proposer une association'}
          </button>
        ) : null}
      </div>

      <section className="desktop-glass-card mb-8 rounded-[2rem] p-6 md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          Associations de {quartier.name}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-700 md:text-lg">
          Découvrez la vie associative locale, suivez vos initiatives préférées et retrouvez leurs
          événements dans le quartier.
        </p>
      </section>

      {showCreateForm ? (
        <AssociationForm
          className="mb-8"
          showCancel
          submitLabel="Créer l’association"
          onCancel={() => setShowCreateForm(false)}
          onSubmit={handleCreateAssociation}
        />
      ) : null}

      <section className="desktop-glass-card rounded-[2rem] p-5 md:p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder="Rechercher une association..."
            className="w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3"
          />
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full rounded-2xl border border-white/30 bg-white/80 px-4 py-3"
          >
            <option value="">Toutes les catégories</option>
            {ASSOCIATION_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {session ? (
          <p className="mb-6 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            Les associations en attente que vous gérez restent visibles ici pour vous, mais elles ne
            sont pas encore publiques.
          </p>
        ) : null}

        {isLoading ? (
          <div className="py-12 text-center text-slate-600">Chargement des associations...</div>
        ) : filteredAssociations.length === 0 ? (
          <div className="rounded-3xl bg-white/60 p-10 text-center text-slate-600">
            Aucune association ne correspond à votre recherche.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredAssociations.map((association) => (
              <AssociationCard
                key={association.id}
                association={{
                  ...association,
                  followers_count: getFollowersCount(association),
                }}
                session={session}
                following={followStates[association.id] || false}
                onOpen={openAssociation}
                onFollowUpdated={handleFollowUpdated}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
