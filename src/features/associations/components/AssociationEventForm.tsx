import { useEffect, useState, type FormEvent } from 'react';
import {
  ASSOCIATION_CATEGORIES,
  ASSOCIATION_EVENT_STATUS_OPTIONS,
} from '@/api/associations';
import ImageUploader from '@/components/ui/ImageUploader';
import type { AssociationEvent } from '@/lib/types/contract';

export interface AssociationEventFormPayload {
  title: string;
  description: string;
  category: string | null;
  status: string;
  start_at: string | null;
  end_at: string | null;
  location_text: string | null;
  external_url: string | null;
  image_url: string | null;
}

interface AssociationEventFormProps {
  modelValue?: Partial<AssociationEvent> | null;
  showCancel?: boolean;
  submitLabel?: string;
  onSubmit: (payload: AssociationEventFormPayload) => void;
  onCancel?: () => void;
}

interface FormState {
  title: string;
  description: string;
  category: string;
  status: string;
  start_at: string;
  end_at: string;
  location_text: string;
  external_url: string;
  image_url: string;
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function hydrate(model?: Partial<AssociationEvent> | null): FormState {
  return {
    title: (model?.title as string) || '',
    description: (model?.description as string) || '',
    category: (model?.category as string) || '',
    status: (model?.status as string) || 'draft',
    start_at: toLocalDateTime(model?.start_at as string | null | undefined),
    end_at: toLocalDateTime(model?.end_at as string | null | undefined),
    location_text: (model?.location_text as string) || '',
    external_url: (model?.external_url as string) || '',
    image_url: (model?.image_url as string) || '',
  };
}

export default function AssociationEventForm({
  modelValue = null,
  showCancel = false,
  submitLabel = 'Enregistrer l’événement',
  onSubmit,
  onCancel,
}: AssociationEventFormProps) {
  const [form, setForm] = useState<FormState>(() => hydrate(modelValue));

  useEffect(() => {
    setForm(hydrate(modelValue));
  }, [modelValue]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category || null,
      status: form.status,
      start_at: fromLocalDateTime(form.start_at),
      end_at: fromLocalDateTime(form.end_at),
      location_text: form.location_text.trim() || null,
      external_url: form.external_url.trim() || null,
      image_url: form.image_url || null,
    });
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">{submitLabel}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Publiez un événement visible sur la page de l’association et dans le quartier.
          </p>
        </div>
        {showCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Fermer
          </button>
        ) : null}
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Titre</label>
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Description</label>
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={4}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Catégorie</label>
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value="">Sans catégorie</option>
              {ASSOCIATION_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Statut</label>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              {ASSOCIATION_EVENT_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Début</label>
            <input
              value={form.start_at}
              onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
              type="datetime-local"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Fin</label>
            <input
              value={form.end_at}
              onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
              type="datetime-local"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Lieu</label>
            <input
              value={form.location_text}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, location_text: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Lien externe</label>
            <input
              value={form.external_url}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, external_url: event.target.value }))
              }
              type="url"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">Image</label>
          <ImageUploader
            bucketName="post_images"
            initialImageUrl={form.image_url || null}
            onUploadSuccess={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
