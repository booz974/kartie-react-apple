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
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import Icon, { type IconName } from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import SafeImage from '@/components/ui/SafeImage';
import Skeleton from '@/components/ui/Skeleton';
import { surfaceClass } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import ModuleQuartiers from '@/features/territory/components/ModuleQuartiers';
import ModuleSynthese from '@/features/territory/components/ModuleSynthese';
import ModuleThematiques from '@/features/territory/components/ModuleThematiques';
import { associationKeys } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { Association } from '@/lib/types/contract';

const QUICK_ACTIONS: { to: string; icon: IconName; title: string; description: string }[] = [
  {
    to: '/admin/alaune',
    icon: 'newspaper',
    title: 'Gérer « À la une »',
    description: 'Les contenus mis en avant sur la page d’accueil.',
  },
  {
    to: '/admin/sondages',
    icon: 'chartBar',
    title: 'Consulter les sondages',
    description: 'Les résultats des consultations citoyennes, par quartier.',
  },
  {
    to: '/admin/rag',
    icon: 'robot',
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
        eyebrow="Administration"
        title="Tableau de bord"
        description="Les contenus mis en avant, les consultations, la base de l’assistant et les associations en attente."
      />

      <Section title="Actions rapides">
        <div className="k-grid">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={surfaceClass({ interactive: true, className: 'p-5' })}
            >
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-md bg-accent-soft text-accent">
                <Icon name={action.icon} size={20} />
              </span>
              <h3 className="k-title-3">{action.title}</h3>
              <p className="k-subhead k-ink-secondary mt-1">{action.description}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Associations à valider"
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
          <div className="k-list border-t border-separator" aria-busy="true">
            {[0, 1].map((row) => (
              <div key={row} className="flex items-start gap-4 py-5">
                <Skeleton width="3rem" height="3rem" radius="var(--k-radius-md)" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton width="40%" height="1.125rem" />
                  <Skeleton width="70%" height="0.875rem" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingAssociations.length === 0 ? (
          <EmptyState
            icon="handshake"
            title="Aucune association en attente"
            description="Les nouvelles demandes apparaîtront ici dès leur dépôt."
          />
        ) : (
          <ul className="k-list border-t border-separator">
            {pendingAssociations.map((association) => (
              <li key={association.id} className="py-5">
                <div className="flex items-start gap-4">
                  <SafeImage
                    src={
                      typeof association.logo_url === 'string' ? association.logo_url : null
                    }
                    alt={association.name}
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="k-callout min-w-0 font-semibold">{association.name}</h3>
                      <Badge tone="warning" dot>
                        {association.status_label}
                      </Badge>
                      <Badge tone="outline">{association.category_label}</Badge>
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

      <Section title="Activité du territoire">
        <div className="flex flex-col gap-8">
          <ModuleSynthese />
          <ModuleQuartiers />
          <ModuleThematiques />
        </div>
      </Section>
    </Page>
  );
}
