import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { upsertProfile, type ProfileUpsert } from '@/api/profiles';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Field, { Input } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
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
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: initialData.first_name ?? '',
    last_name: initialData.last_name ?? '',
    avatar_url: initialData.avatar_url ?? '',
  });

  const isValid = form.first_name.trim().length > 0 && form.last_name.trim().length > 0;
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim();

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!isValid) return;
    setLoading(true);

    try {
      const updates: ProfileUpsert = {
        id: session.user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        avatar_url: form.avatar_url || `https://i.pravatar.cc/150?u=${session.user.id}`,
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
      toast.success('Profil enregistré');
      onSaved(updates);
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error(
        'Enregistrement impossible',
        'Votre profil n’a pas pu être mis à jour. Réessayez dans un instant.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      onClose={onCancel}
      size="narrow"
      title="Votre profil"
      description="Votre nom apparaît à côté de vos publications et de vos soutiens."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="profile-form"
            loading={loading}
            disabled={!isValid}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={saveProfile} className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* L'aperçu se met à jour pendant la saisie : le résultat est visible
              avant d'être validé. */}
          <Avatar src={form.avatar_url || undefined} name={fullName} size={56} />
          <p className="k-footnote k-ink-tertiary">
            Voici comment vous apparaîtrez dans les fils de discussion.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom">
            {(props) => (
              <Input
                {...props}
                required
                autoComplete="given-name"
                placeholder="Jean"
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, first_name: event.target.value }))
                }
                data-autofocus
              />
            )}
          </Field>

          <Field label="Nom">
            {(props) => (
              <Input
                {...props}
                required
                autoComplete="family-name"
                placeholder="Dupont"
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, last_name: event.target.value }))
                }
              />
            )}
          </Field>
        </div>

        <Field
          label="Photo de profil"
          optional
          hint="Collez l’adresse d’une image. Sans photo, vos initiales sont utilisées."
        >
          {(props) => (
            <Input
              {...props}
              type="url"
              placeholder="https://…"
              value={form.avatar_url}
              onChange={(event) =>
                setForm((current) => ({ ...current, avatar_url: event.target.value }))
              }
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
