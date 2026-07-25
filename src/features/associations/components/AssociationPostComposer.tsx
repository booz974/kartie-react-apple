import { useEffect, useState, type FormEvent } from 'react';
import { ASSOCIATION_POST_STATUS_OPTIONS } from '@/api/associations';
import Button from '@/components/ui/Button';
import Field, { Input, Select, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
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
  /** Affiche l'état d'envoi sur le bouton de validation. */
  submitting?: boolean;
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
  submitting = false,
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
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="k-title-3 text-balance">{submitLabel}</h2>
          <p className="k-subhead k-ink-secondary k-measure mt-1.5">
            Créez une publication native au quartier, visible aussi sur la page de l’association.
          </p>
        </div>
        {showCancel ? (
          <Button variant="ghost" onClick={onCancel} leading={<Icon name="close" size={17} />}>
            Fermer
          </Button>
        ) : null}
      </div>

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <Field label="Titre" optional>
          {(props) => (
            <Input
              {...props}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          )}
        </Field>

        <Field label="Message">
          {(props) => (
            <Textarea
              {...props}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={5}
              required
            />
          )}
        </Field>

        <Field label="Statut">
          {(props) => (
            <Select
              {...props}
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              {ASSOCIATION_POST_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

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
