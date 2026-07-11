import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import AlaUneForm from '@/features/admin/components/AlaUneForm';
import {
  useAdminAlaUneList,
  useDeleteAlaUne,
  useSaveAlaUne,
} from '@/queries/alaUne';
import type { AlaUneContent, AlaUneSondageOption } from '@/lib/types/contract';
import type { AlaUneFormValues } from '@/api/alaUne';

function tagClass(type: string): string {
  const classes: Record<string, string> = {
    article: 'bg-red-200 text-red-900',
    event: 'bg-pink-200 text-pink-900',
    sondage: 'bg-purple-200 text-purple-900',
    flash_info: 'bg-orange-200 text-orange-900',
  };
  return classes[type] || 'bg-gray-200 text-gray-900';
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
  const navigate = useNavigate();
  const { data: items = [], isLoading, refetch } = useAdminAlaUneList();
  const saveMutation = useSaveAlaUne();
  const deleteMutation = useDeleteAlaUne();

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

  function showSondageResults(item: AlaUneContent) {
    setSelectedSondage(item);
    setShowResultsModal(true);
  }

  async function handleDeleteAlaUne(itemId: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    try {
      await deleteMutation.mutateAsync(itemId);
      alert('Élément supprimé !');
      await refetch();
    } catch (err) {
      console.error('Erreur de suppression:', err);
      alert('La suppression a échoué.');
    }
  }

  async function handleSaveAlaUne(form: AlaUneFormValues) {
    try {
      await saveMutation.mutateAsync(form);
      alert('Élément enregistré avec succès !');
      setShowForm(false);
      setEditingItem(null);
      await refetch();
    } catch (err) {
      console.error('❌ Erreur:', err);
      alert(`L'enregistrement a échoué.\n\nRaison : ${errorMessage(err)}`);
    }
  }

  if (showForm) {
    return (
      <div className="desktop-glass-card p-6 md:p-10">
        <AlaUneForm
          initialData={editingItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSubmit={(form) => void handleSaveAlaUne(form)}
        />
      </div>
    );
  }

  return (
    <>
      <div className="desktop-glass-card p-6 md:p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-black">Gestion &quot;À la Une&quot;</h2>
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-slate-800 font-semibold py-2 px-4 rounded-lg hover:bg-black/10 text-sm mr-4"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
            >
              + Créer un élément
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-slate-600">
            Aucun élément &quot;À la Une&quot; pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white/30 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full mr-3 ${tagClass(item.type)}`}
                  >
                    {item.type.toUpperCase()}
                  </span>
                  <span className="font-semibold text-slate-800">{itemLabel(item)}</span>
                  {item.is_active === false ? (
                    <span className="ml-3 text-red-600 font-bold text-sm">(Inactif)</span>
                  ) : null}
                </div>
                <div>
                  {item.type === 'sondage' ? (
                    <button
                      type="button"
                      onClick={() => showSondageResults(item)}
                      className="font-semibold text-purple-700 hover:underline mr-4"
                    >
                      Voir les résultats
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEditForm(item)}
                    className="font-semibold text-blue-700 hover:underline mr-4"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAlaUne(item.id)}
                    className="font-semibold text-red-700 hover:underline"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showResultsModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{selectedSondage?.title}</h3>
              <button
                type="button"
                onClick={() => setShowResultsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            {selectedSondage && Array.isArray(selectedSondage.sondage_options) ? (
              <div className="space-y-4">
                {selectedSondage.sondage_options.map((option, index) => {
                  const row = option as AlaUneSondageOption;
                  return (
                    <div key={index} className="border-b pb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-800">{row.option_text}</span>
                        <span className="text-blue-600 font-bold">
                          {getPercentage(row.vote_count || 0, totalVotes)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-purple-600 h-3 rounded-full"
                          style={{
                            width: `${getPercentage(row.vote_count || 0, totalVotes)}%`,
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {row.vote_count || 0} vote(s)
                      </p>
                    </div>
                  );
                })}

                <div className="mt-6 pt-4 border-t">
                  <p className="text-center text-gray-700 font-semibold">
                    Total : {totalVotes} vote(s)
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
