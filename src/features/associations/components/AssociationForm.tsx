import { useEffect, useState, type FormEvent } from 'react';
import {
  ASSOCIATION_CATEGORIES,
  ASSOCIATION_STATUS_OPTIONS,
  slugifyAssociationName,
} from '@/api/associations';
import ImageUploader from '@/components/ui/ImageUploader';
import type { Association } from '@/lib/types/contract';

export interface AssociationFormPayload {
  name: string;
  slug: string;
  category: string;
  short_description: string;
  full_description: string | null;
  mission: string | null;
  activities: string[];
  audiences: string[];
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  address_text: string | null;
  logo_url: string | null;
  cover_url: string | null;
  status: string;
  is_verified: boolean;
}

interface AssociationFormProps {
  modelValue?: Partial<Association> | null;
  allowModerationFields?: boolean;
  showCancel?: boolean;
  submitLabel?: string;
  className?: string;
  onSubmit: (payload: AssociationFormPayload) => void;
  onCancel?: () => void;
}

interface FormState {
  name: string;
  slug: string;
  category: string;
  short_description: string;
  full_description: string;
  mission: string;
  activitiesText: string;
  audiencesText: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  address_text: string;
  logo_url: string;
  cover_url: string;
  status: string;
  is_verified: boolean;
}

function hydrate(model?: Partial<Association> | null): FormState {
  return {
    name: (model?.name as string) || '',
    slug: (model?.slug as string) || '',
    category: (model?.category as string) || 'other',
    short_description: (model?.short_description as string) || '',
    full_description: (model?.full_description as string) || '',
    mission: (model?.mission as string) || '',
    activitiesText: ((model?.activities as string[]) || []).join('\n'),
    audiencesText: ((model?.audiences as string[]) || []).join('\n'),
    contact_email: (model?.contact_email as string) || '',
    contact_phone: (model?.contact_phone as string) || '',
    website_url: (model?.website_url as string) || '',
    address_text: (model?.address_text as string) || '',
    logo_url: (model?.logo_url as string) || '',
    cover_url: (model?.cover_url as string) || '',
    status: (model?.status as string) || 'pending',
    is_verified: !!model?.is_verified,
  };
}

function parseMultiline(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AssociationForm({
  modelValue = null,
  allowModerationFields = false,
  showCancel = false,
  submitLabel = 'Enregistrer',
  className = '',
  onSubmit,
  onCancel,
}: AssociationFormProps) {
  const [form, setForm] = useState<FormState>(() => hydrate(modelValue));

  useEffect(() => {
    setForm(hydrate(modelValue));
  }, [modelValue]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === 'name' && !modelValue?.id) {
        const previousAutoSlug = slugifyAssociationName((modelValue?.name as string) || '');
        if (!prev.slug || prev.slug === previousAutoSlug) {
          next.slug = slugifyAssociationName(String(value));
        }
      }

      return next;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const shortDescription = form.short_description.trim();
    if (shortDescription.length < 10) {
      alert('La description courte doit contenir au moins 10 caractères.');
      return;
    }

    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      category: form.category,
      short_description: shortDescription,
      full_description: form.full_description.trim() || null,
      mission: form.mission.trim() || null,
      activities: parseMultiline(form.activitiesText),
      audiences: parseMultiline(form.audiencesText),
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      website_url: form.website_url.trim() || null,
      address_text: form.address_text.trim() || null,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      status: form.status,
      is_verified: form.is_verified,
    });
  }

  return (
    <div className={`rounded-3xl bg-white p-6 shadow-lg md:p-8 ${className}`.trim()}>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{submitLabel}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Créez ou mettez à jour la fiche publique de l’association.
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

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Nom</label>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Slug public</label>
            <input
              value={form.slug}
              onChange={(event) => updateField('slug', event.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Catégorie</label>
            <select
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            >
              {ASSOCIATION_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Email de contact</label>
            <input
              value={form.contact_email}
              onChange={(event) => updateField('contact_email', event.target.value)}
              type="email"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Description courte</label>
          <textarea
            value={form.short_description}
            onChange={(event) => updateField('short_description', event.target.value)}
            rows={3}
            minLength={10}
            maxLength={300}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
          <p className="mt-1 text-xs text-slate-500">Minimum 10 caractères.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Description détaillée</label>
          <textarea
            value={form.full_description}
            onChange={(event) => updateField('full_description', event.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Mission</label>
          <textarea
            value={form.mission}
            onChange={(event) => updateField('mission', event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Activités</label>
            <textarea
              value={form.activitiesText}
              onChange={(event) => updateField('activitiesText', event.target.value)}
              rows={4}
              placeholder="Une activité par ligne"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Publics concernés</label>
            <textarea
              value={form.audiencesText}
              onChange={(event) => updateField('audiencesText', event.target.value)}
              rows={4}
              placeholder="Un public par ligne"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Téléphone</label>
            <input
              value={form.contact_phone}
              onChange={(event) => updateField('contact_phone', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Site web</label>
            <input
              value={form.website_url}
              onChange={(event) => updateField('website_url', event.target.value)}
              type="url"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Adresse</label>
          <input
            value={form.address_text}
            onChange={(event) => updateField('address_text', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Logo</label>
            <ImageUploader
              bucketName="post_images"
              initialImageUrl={form.logo_url || null}
              onUploadSuccess={(url) => updateField('logo_url', url)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Cover</label>
            <ImageUploader
              bucketName="post_images"
              initialImageUrl={form.cover_url || null}
              onUploadSuccess={(url) => updateField('cover_url', url)}
            />
          </div>
        </div>

        {allowModerationFields ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Statut</label>
              <select
                value={form.status}
                onChange={(event) => updateField('status', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              >
                {ASSOCIATION_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                checked={form.is_verified}
                onChange={(event) => updateField('is_verified', event.target.checked)}
                type="checkbox"
                className="h-4 w-4 rounded"
              />
              Association vérifiée
            </label>
          </div>
        ) : null}

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
