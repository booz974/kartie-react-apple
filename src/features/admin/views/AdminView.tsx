import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAssociationsForAdminReview,
  logModerationAction,
  updateAssociation,
} from '@/api/associations';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import { useConfirm } from '@/components/ui/Confirm';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import SafeImage from '@/components/ui/SafeImage';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ModuleQuartiers from '@/features/territory/components/ModuleQuartiers';
import ModuleSynthese from '@/features/territory/components/ModuleSynthese';
import ModuleThematiques from '@/features/territory/components/ModuleThematiques';
import { associationKeys } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { CategoryKey } from '@/design/categories';
import type { Association } from '@/lib/types/contract';

/**
 * Les trois portes d'entrée de l'administration. Chacune porte la couleur et
 * l'émoji du contenu qu'elle gouverne, comme sur la page d'accueil.
 */
const QUICK_ACTIONS: {
  to: string;
  emoji: string;
  tone: CategoryKey;
  title: string;
  description: string;
}[] = [
  {
    to: '/admin/alaune',
    emoji: '🔥',
    tone: 'news',
    title: 'Gérer « À la une »',
    description: 'Les contenus mis en avant sur la page d’accueil.',
  },
  {
    to: '/admin/sondages',
    emoji: '🗳️',
    tone: 'consult',
    title: 'Consulter les sondages',
    description: 'Les résultats des consultations citoyennes, par quartier.',
  },
  {
    to: '/admin/rag',
    emoji: '🤖',
    tone: 'project',
    title: 'Documents IA (RAG)',
    description: 'La base de connaissances de l’assistant conversationnel.',
  },
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { message?: string })?.message || error);
}

export default function AdminView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const confirm = useConfirm();
  const toast = useToast();

  const [associations, setAssociations] = useState<Association[]>([]);
  const [isLoadingAssociations, setIsLoadingAssociations] = useState(true);

  const pendingAssociations = useMemo(
    () => associations.filter((association) => association.status === 'pending'),
    [associations],
  );

  const loadAssociations = useCallback(async () => {
    setIsLoadingAssociations(true);
    const list = await getAssociationsForAdminReview();
    setAssociations(list);
    setIsLoadingAssociations(false);
  }, []);

  useEffect(() => {
    void loadAssociations();
  }, [loadAssociations]);

  async function handleAssociationStatusChange(association: Association, status: string) {
    // Seul le refus est irréversible du point de vue de l'association : c'est le
    // seul geste qui mérite une confirmation.
    if (status === 'rejected') {
      const confirmed = await confirm({
        title: 'Refuser cette association ?',
        message: `« ${association.name} » ne sera pas publiée sur la plateforme.`,
        confirmLabel: 'Refuser',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    const result = await updateAssociation(association.id, { status });
    if (!result.success) {
      toast.error('Mise à jour impossible', errorMessage(result.error));
      return;
    }

    await logModerationAction({
      entityType: 'association',
      entityId: association.id,
      action: `status:${status}`,
      performedBy: session?.user?.id,
    });

    await queryClient.invalidateQueries({ queryKey: ['association'] });
    await queryClient.invalidateQueries({ queryKey: associationKeys.adminReview() });
    await loadAssociations();
    toast.success('Statut mis à jour');
  }

  return (
    <Page className="pt-8">
      <PageHeader
        eyebrow="⚙️ Administration"
        title="Tableau de bord"
        description="Les contenus mis en avant, les consultations, la base de l’assistant et les associations en attente."
      />

      <Section title="⚡ Actions rapides">
        <div className="k-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="k-card k-card--interactive group flex items-start gap-4 p-5"
            >
              <Chip tone={action.tone} size={52}>
                {action.emoji}
              </Chip>
              <span className="min-w-0 flex-1">
                <span className="k-title-3 block">{action.title}</span>
                <span className="k-subhead k-ink-secondary mt-1 block">{action.description}</span>
              </span>
              <Icon
                name="chevronRight"
                size={20}
                className="k-ink-quaternary mt-1 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="🤝 Associations à valider"
        description="Vérifiez les nouvelles associations avant leur publication."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadAssociations()}
            loading={isLoadingAssociations}
            leading={<Icon name="refresh" size={16} />}
          >
            Actualiser
          </Button>
        }
      >
        {isLoadingAssociations ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {[0, 1].map((row) => (
              <div key={row} className="k-card flex items-start gap-4 p-5">
                <Skeleton width="3.5rem" height="3.5rem" radius="var(--k-radius-md)" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton width="40%" height="1.125rem" />
                  <Skeleton width="70%" height="0.875rem" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingAssociations.length === 0 ? (
          <div className="k-card k-empty">
            <span className="text-5xl leading-none" aria-hidden="true">
              🤝
            </span>
            <p className="k-title-3">Aucune association en attente</p>
            <p className="k-subhead k-ink-secondary k-measure">
              Les nouvelles demandes apparaîtront ici dès leur dépôt.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingAssociations.map((association) => (
              <li key={association.id} className="k-card p-5">
                <div className="flex items-start gap-4">
                  <SafeImage
                    src={
                      typeof association.logo_url === 'string' ? association.logo_url : null
                    }
                    alt={association.name}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                    fallback={
                      <span aria-hidden="true" className="text-2xl">
                        🤝
                      </span>
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="k-callout min-w-0 font-semibold">{association.name}</h3>
                      <Badge tone="warning" emoji="⏳" dot>
                        {association.status_label}
                      </Badge>
                      <Badge tone="asso" emoji="🏷️">
                        {association.category_label}
                      </Badge>
                    </div>
                    <p className="k-footnote k-ink-tertiary mt-1">
                      Quartier{' '}
                      {association.quartier?.name || String(association.quartier_id ?? '')}
                    </p>
                    {typeof association.short_description === 'string' &&
                    association.short_description ? (
                      <p className="k-subhead k-ink-secondary k-measure mt-2">
                        {association.short_description}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          void handleAssociationStatusChange(association, 'active')
                        }
                        leading={<span aria-hidden="true">✅</span>}
                      >
                        Valider
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(`/associations/${association.id}/dashboard`)
                        }
                      >
                        Ouvrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void handleAssociationStatusChange(association, 'suspended')
                        }
                      >
                        Suspendre
                      </Button>
                      <Button
                        variant="danger-tinted"
                        size="sm"
                        onClick={() =>
                          void handleAssociationStatusChange(association, 'rejected')
                        }
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="📈 Activité du territoire">
        <div className="flex flex-col gap-8">
          <ModuleSynthese />
          <ModuleQuartiers />
          <ModuleThematiques />
        </div>
      </Section>
    </Page>
  );
}
