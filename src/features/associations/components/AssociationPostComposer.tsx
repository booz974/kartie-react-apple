import { useEffect, useState, type FormEvent } from 'react';
import { ASSOCIATION_POST_STATUS_OPTIONS } from '@/api/associations';
import ImageUploader from '@/components/ui/ImageUploader';
import type { AssociationPost } from '@/lib/types/contract';

export interface AssociationPostFormPayload {
  title: string | null;
  content: string;
  status: string;
  image_url: string | null;
}

interface AssociationPostComposerProps {
  modelValue?: Partial<AssociationPost> | null;
  showCancel?: boolean;
  submitLabel?: string;
  onSubmit: (payload: AssociationPostFormPayload) => void;
  onCancel?: () => void;
}

interface FormState {
  title: string;
  content: string;
  status: string;
  image_url: string;
}

function hydrate(model?: Partial<AssociationPost> | null): FormState {
  return {
    title: (model?.title as string) || '',
    content: (model?.content as string) || '',
    status: (model?.status as string) || 'draft',
    image_url: (model?.image_url as string) || '',
  };
}

export default function AssociationPostComposer({
  modelValue = null,
  showCancel = false,
  submitLabel = 'Publier un post',
  onSubmit,
  onCancel,
}: AssociationPostComposerProps) {
  const [form, setForm] = useState<FormState>(() => hydrate(modelValue));

  useEffect(() => {
    setForm(hydrate(modelValue));
  }, [modelValue]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      title: form.title.trim() || null,
      content: form.content.trim(),
      status: form.status,
      image_url: form.image_url || null,
    });
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">{submitLabel}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Créez une publication native au quartier, visible aussi sur la page de l’association.
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
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Message</label>
          <textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            rows={5}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Statut</label>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              {ASSOCIATION_POST_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Image</label>
            <ImageUploader
              bucketName="post_images"
              initialImageUrl={form.image_url || null}
              onUploadSuccess={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
            />
          </div>
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
