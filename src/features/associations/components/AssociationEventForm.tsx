import { useEffect, useState, type FormEvent } from 'react';
import {
  ASSOCIATION_CATEGORIES,
  ASSOCIATION_EVENT_STATUS_OPTIONS,
} from '@/api/associations';
import Button from '@/components/ui/Button';
import Field, { Input, Select, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
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
  /** Affiche l'état d'envoi sur le bouton de validation. */
  submitting?: boolean;
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
  submitting = false,
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
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="k-title-3 text-balance">{submitLabel}</h2>
          <p className="k-subhead k-ink-secondary k-measure mt-1.5">
            Publiez un événement visible sur la page de l’association et dans le quartier.
          </p>
        </div>
        {showCancel ? (
          <Button variant="ghost" onClick={onCancel} leading={<Icon name="close" size={17} />}>
            Fermer
          </Button>
        ) : null}
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label="Titre">
          {(props) => (
            <Input
              {...props}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          )}
        </Field>

        <Field label="Description">
          {(props) => (
            <Textarea
              {...props}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={4}
              required
            />
          )}
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Catégorie" optional>
            {(props) => (
              <Select
                {...props}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="">Sans catégorie</option>
                {ASSOCIATION_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Statut">
            {(props) => (
              <Select
                {...props}
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {ASSOCIATION_EVENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Début">
            {(props) => (
              <Input
                {...props}
                type="datetime-local"
                value={form.start_at}
                onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
                required
              />
            )}
          </Field>

          <Field label="Fin" optional>
            {(props) => (
              <Input
                {...props}
                type="datetime-local"
                value={form.end_at}
                onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
              />
            )}
          </Field>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Lieu" optional>
            {(props) => (
              <Input
                {...props}
                value={form.location_text}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, location_text: event.target.value }))
                }
              />
            )}
          </Field>

          <Field label="Lien externe" optional>
            {(props) => (
              <Input
                {...props}
                type="url"
                placeholder="https://"
                value={form.external_url}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, external_url: event.target.value }))
                }
              />
            )}
          </Field>
        </div>

        <div className="k-field">
          <p className="k-field__label">Image</p>
          <ImageUploader
            bucketName="post_images"
            initialImageUrl={form.image_url || null}
            onUploadSuccess={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
          />
        </div>

        <div className="k-hairline-top flex flex-wrap justify-end gap-2 pt-5">
          {showCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          ) : null}
          <Button type="submit" variant="primary" loading={submitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </section>
  );
}
