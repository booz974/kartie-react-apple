import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAssociationsForAdminReview,
  logModerationAction,
  updateAssociation,
} from '@/api/associations';
import ModuleQuartiers from '@/features/territory/components/ModuleQuartiers';
import ModuleSynthese from '@/features/territory/components/ModuleSynthese';
import ModuleThematiques from '@/features/territory/components/ModuleThematiques';
import { associationKeys } from '@/queries/associations';
import { useAuthStore } from '@/stores/authStore';
import type { Association } from '@/lib/types/contract';

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String((error as { message?: string })?.message || error);
}

export default function AdminView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);

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
    const result = await updateAssociation(association.id, { status });
    if (!result.success) {
      alert(`Impossible de mettre à jour le statut : ${errorMessage(result.error)}`);
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
  }

  return (
    <div className="p-4 md:p-8 space-y-12">
      <h1 className="text-4xl font-black text-center text-slate-800">
        Tableau de Bord Administrateur
      </h1>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-slate-700">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => navigate('/admin/alaune')}
            className="desktop-glass-card p-6 text-left hover:scale-105 transition-transform duration-300"
          >
            <div className="text-4xl mb-3">📰</div>
            <h3 className="font-bold text-xl text-slate-900">Gérer &quot;À la Une&quot;</h3>
            <p className="text-slate-600 text-sm">
              Modifier les contenus mis en avant sur la page d&apos;accueil.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/sondages')}
            className="desktop-glass-card p-6 text-left hover:scale-105 transition-transform duration-300"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-xl text-slate-900">Consulter les Sondages</h3>
            <p className="text-slate-600 text-sm">
              Analyser les résultats des consultations citoyennes par quartier.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/rag')}
            className="desktop-glass-card p-6 text-left hover:scale-105 transition-transform duration-300"
          >
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-xl text-slate-900">Documents IA (RAG)</h3>
            <p className="text-slate-600 text-sm">
              Ajouter des fichiers pour enrichir la base de connaissances de l&apos;assistant IA.
            </p>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-700">Associations à valider</h2>
            <p className="text-sm text-slate-500">
              Validez les nouvelles associations avant publication.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAssociations()}
            className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-slate-700 shadow transition hover:bg-white"
          >
            Actualiser
          </button>
        </div>

        {isLoadingAssociations ? (
          <div className="desktop-glass-card rounded-3xl p-8 text-center text-slate-600">
            Chargement des associations...
          </div>
        ) : pendingAssociations.length === 0 ? (
          <div className="desktop-glass-card rounded-3xl p-8 text-center text-slate-600">
            Aucune association en attente de validation.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {pendingAssociations.map((association) => (
              <article key={association.id} className="desktop-glass-card rounded-3xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-xl font-black text-slate-900">{association.name}</h3>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                        {association.status_label}
                      </span>
                      <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                        {association.category_label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">
                      Quartier{' '}
                      {association.quartier?.name ||
                        String(association.quartier_id ?? '')}
                    </p>
                  </div>
                  {typeof association.logo_url === 'string' && association.logo_url ? (
                    <img
                      src={association.logo_url}
                      alt={association.name}
                      className="h-14 w-14 rounded-2xl object-cover shadow"
                    />
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {typeof association.short_description === 'string'
                    ? association.short_description
                    : ''}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/associations/${association.id}/dashboard`)}
                    className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-white"
                  >
                    Ouvrir
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAssociationStatusChange(association, 'active')}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAssociationStatusChange(association, 'suspended')}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    Suspendre
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAssociationStatusChange(association, 'rejected')}
                    className="rounded-full bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-900"
                  >
                    Refuser
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <ModuleSynthese />
        <ModuleQuartiers />
        <ModuleThematiques />
      </div>
    </div>
  );
}
