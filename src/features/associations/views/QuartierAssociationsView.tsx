import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ASSOCIATION_CATEGORIES, createAssociation } from '@/api/associations';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Skeleton, { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import AssociationCard, {
  associationCategoryStyle,
} from '@/features/associations/components/AssociationCard';
import AssociationForm, {
  type AssociationFormPayload,
} from '@/features/associations/components/AssociationForm';
import { associationKeys, useQuartierAssociations } from '@/queries/associations';
import { useQuartier } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import type { Association } from '@/lib/types/contract';

/** Gabarit calqué sur AssociationCard : le remplacement ne déplace rien. */
function AssociationCardSkeleton() {
  return (
    <div className="k-card overflow-hidden p-0">
      <Skeleton height="6rem" radius="0" />
      <div className="flex flex-col gap-3 px-5 pb-5">
        <Skeleton
          width="4.25rem"
          height="4.25rem"
          radius="var(--k-radius-md)"
          className="-mt-10"
        />
        <Skeleton height="1.5rem" width="70%" />
        <Skeleton height="1.25rem" width="40%" radius="var(--k-radius-full)" />
        <SkeletonText lines={3} />
        <Skeleton height="2.75rem" width="9rem" radius="var(--k-radius-full)" />
      </div>
    </div>
  );
}

export default function QuartierAssociationsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
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
  const hasFilters = Boolean(search.trim() || selectedCategory);

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
      toast.error("Impossible de créer l'association", message);
      return;
    }

    setShowCreateForm(false);
    await queryClient.invalidateQueries({
      queryKey: associationKeys.list(quartier.id, listFilters),
    });
    navigate(`/associations/${result.associationId}/dashboard`);
  }

  if (!quartier) {
    return (
      <Page className="pt-6 md:pt-10">
        <PageHeader eyebrow="🤝 Vie associative" title="Associations du quartier" />
        <div className="k-grid k-grid--wide">
          {Array.from({ length: 6 }, (_, index) => (
            <AssociationCardSkeleton key={index} />
          ))}
        </div>
      </Page>
    );
  }

  return (
    <Page className="pt-6 md:pt-10">
      <PageHeader
        back={{ to: `/quartiers/${quartier.id}`, label: 'Retour au quartier' }}
        eyebrow="🤝 Vie associative"
        title={quartier.name ? `Associations de ${quartier.name}` : 'Associations du quartier'}
        description="Découvrez la vie associative locale, suivez vos initiatives préférées et retrouvez leurs événements dans le quartier."
        actions={
          session ? (
            <Button
              variant={showCreateForm ? 'secondary' : 'primary'}
              onClick={() => setShowCreateForm((prev) => !prev)}
              leading={<Icon name={showCreateForm ? 'close' : 'plus'} size={17} />}
            >
              {showCreateForm ? 'Fermer le formulaire' : 'Proposer une association'}
            </Button>
          ) : null
        }
      />

      {showCreateForm ? (
        <Section>
          <AssociationForm
            showCancel
            submitLabel="Créer l’association"
            submitting={isCreating}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={handleCreateAssociation}
          />
        </Section>
      ) : null}

      <Section
        title="✨ Toutes les associations"
        description={
          isLoading
            ? undefined
            : // L'accord se fait vraiment plutôt que par un « (s) » collé au mot.
              `${filteredAssociations.length} association${
                filteredAssociations.length > 1 ? 's' : ''
              }${quartier.name ? ` dans ${quartier.name}` : ''}.`
        }
      >
        <div className="mb-6 flex flex-col gap-4">
          <div className="k-card grid gap-3 p-4 md:grid-cols-[1fr_18rem]">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une association"
              aria-label="Rechercher une association"
            />
            <Select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Filtrer par catégorie"
            >
              <option value="">🎨 Toutes les catégories</option>
              {ASSOCIATION_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {`${associationCategoryStyle(category.value).emoji} ${category.label}`}
                </option>
              ))}
            </Select>
          </div>

          {session ? (
            <Notice tone="info">
              Les associations en attente que vous gérez restent visibles ici pour vous, mais elles
              ne sont pas encore publiques.
            </Notice>
          ) : null}
        </div>

        {isLoading ? (
          <div className="k-grid k-grid--wide">
            {Array.from({ length: 6 }, (_, index) => (
              <AssociationCardSkeleton key={index} />
            ))}
          </div>
        ) : filteredAssociations.length === 0 ? (
          <EmptyState
            icon="handshake"
            title={hasFilters ? 'Aucun résultat' : 'Aucune association pour l’instant'}
            description={
              hasFilters
                ? 'Aucune association ne correspond à votre recherche dans ce quartier.'
                : session
                  ? 'Soyez le premier à référencer une association de votre quartier.'
                  : 'Connectez-vous pour proposer la première association de ce quartier.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('');
                  }}
                >
                  Réinitialiser les filtres
                </Button>
              ) : session ? (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateForm(true)}
                  leading={<Icon name="plus" size={17} />}
                >
                  Proposer une association
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="k-grid k-grid--wide">
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
      </Section>
    </Page>
  );
}
