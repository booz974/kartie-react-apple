import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { upsertProfile, type ProfileUpsert } from '@/api/profiles';
import type { Profile } from '@/lib/types/contract';
import { useAuthStore } from '@/stores/authStore';

interface CompleteProfileModalProps {
  session: Session;
  initialData?: Partial<Profile>;
  onCancel: () => void;
  onSaved: (updates: ProfileUpsert) => void;
}

export default function CompleteProfileModal({
  session,
  initialData = {},
  onCancel,
  onSaved,
}: CompleteProfileModalProps) {
  const setProfile = useAuthStore((state) => state.setProfile);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: initialData.first_name ?? '',
    last_name: initialData.last_name ?? '',
    avatar_url: initialData.avatar_url ?? '',
  });

  const isValid =
    form.first_name.trim().length > 0 && form.last_name.trim().length > 0;

  async function saveProfile() {
    if (!isValid) return;
    setLoading(true);

    try {
      const updates: ProfileUpsert = {
        id: session.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        avatar_url:
          form.avatar_url || `https://i.pravatar.cc/150?u=${session.user.id}`,
        updated_at: new Date(),
      };

      await upsertProfile(updates);
      setProfile({
        username: initialData.username ?? null,
        role: initialData.role ?? 'user',
        quartier_id: initialData.quartier_id ?? null,
        first_name: updates.first_name,
        last_name: updates.last_name,
        avatar_url: updates.avatar_url,
      });
      onSaved(updates);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Complétez votre profil</h2>
        <p className="text-gray-600 mb-6 text-center text-sm">
          Pour participer à la vie du quartier, nous avons besoin de mieux vous connaître !
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            <input
              id="first-name"
              type="text"
              value={form.first_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, first_name: event.target.value }))
              }
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Jean"
            />
          </div>

          <div>
            <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            <input
              id="last-name"
              type="text"
              value={form.last_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, last_name: event.target.value }))
              }
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Dupont"
            />
          </div>

          <div>
            <label htmlFor="avatar-url" className="block text-sm font-medium text-gray-700 mb-1">
              Photo de profil (URL)
            </label>
            <div className="flex gap-2">
              <input
                id="avatar-url"
                type="text"
                value={form.avatar_url}
                onChange={(event) =>
                  setForm((current) => ({ ...current, avatar_url: event.target.value }))
                }
                className="flex-1 border rounded-lg p-2 text-sm"
                placeholder="https://..."
              />
              <img
                src={form.avatar_url || 'https://i.pravatar.cc/150'}
                alt="Aperçu avatar"
                className="w-10 h-10 rounded-full border bg-gray-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Laissez vide pour une image par défaut.</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={loading || !isValid}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enregistrement...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}
