import { useMemo, useState } from 'react';
import AlaUneForm from '@/features/admin/components/AlaUneForm';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Progress from '@/components/ui/Progress';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  useAdminAlaUneList,
  useDeleteAlaUne,
  useSaveAlaUne,
} from '@/queries/alaUne';
import type { AlaUneContent, AlaUneSondageOption } from '@/lib/types/contract';
import type { AlaUneFormValues } from '@/api/alaUne';

type TypeBadgeTone = 'accent' | 'warm' | 'warning' | 'neutral';

/** Un type de contenu = une teinte et un mot lisible, pas une constante brute. */
const TYPE_META: Record<string, { label: string; tone: TypeBadgeTone }> = {
  article: { label: 'Article', tone: 'accent' },
  event: { label: 'Événement', tone: 'warm' },
  sondage: { label: 'Sondage', tone: 'neutral' },
  flash_info: { label: 'Flash info', tone: 'warning' },
};

function typeMeta(type: string): { label: string; tone: TypeBadgeTone } {
  return TYPE_META[type] ?? { label: type, tone: 'neutral' };
}

function getPercentage(votes: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
}

function itemLabel(item: AlaUneContent): string {
  if (item.title) return item.title;
  const content = item.content ?? '';
  return content.length > 50 ? `${content.substring(0, 50)}...` : content || '(sans titre)';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { message?: string })?.message || error);
}

export default function AdminAlaUneView() {
  const { data: items = [], isLoading, refetch } = useAdminAlaUneList();
  const saveMutation = useSaveAlaUne();
  const deleteMutation = useDeleteAlaUne();
  const confirm = useConfirm();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AlaUneContent | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedSondage, setSelectedSondage] = useState<AlaUneContent | null>(null);

  const totalVotes = useMemo(() => {
    const options = selectedSondage?.sondage_options;
    if (!Array.isArray(options) || options.length === 0) return 1;
    return (
      options.reduce((sum, option) => {
        const row = option as AlaUneSondageOption;
        return sum + (row.vote_count || 0);
      }, 0) || 1
    );
  }, [selectedSondage]);

  function openCreateForm() {
    setEditingItem(null);
    setShowForm(true);
  }

  function openEditForm(item: AlaUneContent) {
    setEditingItem(item);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingItem(null);
  }

  function showSondageResults(item: AlaUneContent) {
    setSelectedSondage(item);
    setShowResultsModal(true);
  }

  async function handleDeleteAlaUne(item: AlaUneContent) {
    const confirmed = await confirm({
      title: 'Supprimer cet élément ?',
      message: `« ${itemLabel(item)} » ne sera plus affiché sur la page d'accueil. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success('Élément supprimé');
      await refetch();
    } catch (err) {
      console.error('Erreur de suppression:', err);
      toast.error('La suppression a échoué', errorMessage(err));
    }
  }

  async function handleSaveAlaUne(form: AlaUneFormValues) {
    try {
      await saveMutation.mutateAsync(form);
      toast.success('Élément enregistré');
      closeForm();
      await refetch();
    } catch (err) {
      console.error('Erreur:', err);
      toast.error("L'enregistrement a échoué", errorMessage(err));
    }
  }

  if (showForm) {
    return (
      <Page className="pt-8">
        <PageHeader
          back={{ to: '/admin', label: 'Administration' }}
          eyebrow="À la une"
          title={editingItem ? 'Modifier un élément' : 'Créer un élément'}
          description="Le contenu apparaîtra en tête de la page d’accueil tant qu’il reste actif."
        />
        <AlaUneForm
          initialData={editingItem}
          onCancel={closeForm}
          onSubmit={(form) => void handleSaveAlaUne(form)}
        />
      </Page>
    );
  }

  return (
    <Page className="pt-8">
      <PageHeader
        back={{ to: '/admin', label: 'Administration' }}
        eyebrow="Administration"
        title="Gestion « À la une »"
        description="Les contenus mis en avant sur la page d’accueil : articles, événements, sondages et flashs info."
        actions={
          <Button
            variant="primary"
            onClick={openCreateForm}
            leading={<Icon name="plus" size={17} />}
          >
            Créer un élément
          </Button>
        }
      />

      <Section>
        {isLoading ? (
          <ul className="k-list border-t border-separator" aria-busy="true">
            {[0, 1, 2].map((row) => (
              <li key={row} className="flex items-center gap-3 py-4">
                <Skeleton width="5.5rem" height="1.25rem" />
                <Skeleton width="40%" height="1rem" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            icon="newspaper"
            title="Aucun contenu à la une"
            description="Ajoutez un article, un événement, un sondage ou un flash info pour ouvrir la page d’accueil."
            action={
              <Button variant="primary" onClick={openCreateForm}>
                Créer un élément
              </Button>
            }
          />
        ) : (
          <ul className="k-list border-t border-separator">
            {items.map((item) => {
              const meta = typeMeta(item.type);
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span className="k-body min-w-0 flex-1 truncate font-medium">
                      {itemLabel(item)}
                    </span>
                    {item.is_active === false ? (
                      <Badge tone="outline" dot>
                        Inactif
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {item.type === 'sondage' ? (
                      <Button variant="ghost" size="sm" onClick={() => showSondageResults(item)}>
                        Résultats
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => openEditForm(item)}
                      aria-label={`Modifier ${itemLabel(item)}`}
                    >
                      <Icon name="pencil" size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => void handleDeleteAlaUne(item)}
                      aria-label={`Supprimer ${itemLabel(item)}`}
                      className="hover:text-danger"
                    >
                      <Icon name="trash" size={16} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {showResultsModal ? (
        <Modal
          onClose={() => setShowResultsModal(false)}
          title={selectedSondage?.title ?? 'Résultats du sondage'}
          description={`${totalVotes} vote${totalVotes > 1 ? 's' : ''} au total`}
        >
          {selectedSondage && Array.isArray(selectedSondage.sondage_options) ? (
            <div className="flex flex-col gap-5">
              {selectedSondage.sondage_options.map((option, index) => {
                const row = option as AlaUneSondageOption;
                const percentage = getPercentage(row.vote_count || 0, totalVotes);
                return (
                  <div key={index}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="k-subhead font-medium">{row.option_text}</span>
                      <span className="k-subhead k-ink-secondary tabular-nums">
                        {percentage}%
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      label={`${row.option_text ?? 'Option'} : ${percentage}%`}
                    />
                    <p className="k-footnote k-ink-tertiary mt-1.5">
                      {row.vote_count || 0} vote{(row.vote_count || 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="k-subhead k-ink-secondary">Ce sondage n’a pas encore d’options.</p>
          )}
        </Modal>
      ) : null}
    </Page>
  );
}
