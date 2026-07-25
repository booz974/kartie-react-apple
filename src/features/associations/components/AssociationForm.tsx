import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  ASSOCIATION_CATEGORIES,
  ASSOCIATION_STATUS_OPTIONS,
  slugifyAssociationName,
} from '@/api/associations';
import Button from '@/components/ui/Button';
import Field, { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
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
  /** Affiche l'état d'envoi sur le bouton de validation. */
  submitting?: boolean;
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

/**
 * Bloc de champs. Un filet sépare les groupes plutôt qu'une carte par groupe :
 * la lecture reste continue et la page ne se fragmente pas.
 */
function Group({
  title,
  divider = true,
  children,
}: {
  title: string;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={['flex flex-col gap-5', divider ? 'k-hairline-top pt-7' : ''].join(' ').trim()}
    >
      <h3 className="k-eyebrow">{title}</h3>
      {children}
    </section>
  );
}

export default function AssociationForm({
  modelValue = null,
  allowModerationFields = false,
  showCancel = false,
  submitLabel = 'Enregistrer',
  className = '',
  submitting = false,
  onSubmit,
  onCancel,
}: AssociationFormProps) {
  const [form, setForm] = useState<FormState>(() => hydrate(modelValue));
  const [shortDescriptionError, setShortDescriptionError] = useState('');

  useEffect(() => {
    setForm(hydrate(modelValue));
    setShortDescriptionError('');
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
      // L'erreur reste au niveau du champ concerné, jamais dans une alerte.
      setShortDescriptionError('La description courte doit contenir au moins 10 caractères.');
      return;
    }

    setShortDescriptionError('');

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
    <section className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="k-title-2 text-balance">{submitLabel}</h2>
          <p className="k-subhead k-ink-secondary k-measure mt-1.5">
            Créez ou mettez à jour la fiche publique de l’association.
          </p>
        </div>
        {showCancel ? (
          <Button variant="ghost" onClick={onCancel} leading={<Icon name="close" size={17} />}>
            Fermer
          </Button>
        ) : null}
      </div>

      <form className="flex flex-col gap-7" onSubmit={handleSubmit}>
        <Group title="Identité" divider={false}>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Nom">
              {(props) => (
                <Input
                  {...props}
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  required
                />
              )}
            </Field>

            <Field label="Slug public" hint="Il compose l’adresse de la page.">
              {(props) => (
                <Input
                  {...props}
                  value={form.slug}
                  onChange={(event) => updateField('slug', event.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <Field label="Catégorie">
            {(props) => (
              <Select
                {...props}
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
              >
                {ASSOCIATION_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </Group>

        <Group title="Présentation">
          <Field
            label="Description courte"
            hint="Minimum 10 caractères. C’est le texte affiché dans les listes."
            error={shortDescriptionError || undefined}
          >
            {(props) => (
              <Textarea
                {...props}
                value={form.short_description}
                onChange={(event) => {
                  updateField('short_description', event.target.value);
                  if (shortDescriptionError) setShortDescriptionError('');
                }}
                rows={3}
                minLength={10}
                maxLength={300}
                required
              />
            )}
          </Field>

          <Field label="Description détaillée" optional>
            {(props) => (
              <Textarea
                {...props}
                value={form.full_description}
                onChange={(event) => updateField('full_description', event.target.value)}
                rows={5}
              />
            )}
          </Field>

          <Field label="Mission" optional>
            {(props) => (
              <Textarea
                {...props}
                value={form.mission}
                onChange={(event) => updateField('mission', event.target.value)}
                rows={4}
              />
            )}
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Activités" hint="Une activité par ligne." optional>
              {(props) => (
                <Textarea
                  {...props}
                  value={form.activitiesText}
                  onChange={(event) => updateField('activitiesText', event.target.value)}
                  rows={4}
                  placeholder="Une activité par ligne"
                />
              )}
            </Field>

            <Field label="Publics concernés" hint="Un public par ligne." optional>
              {(props) => (
                <Textarea
                  {...props}
                  value={form.audiencesText}
                  onChange={(event) => updateField('audiencesText', event.target.value)}
                  rows={4}
                  placeholder="Un public par ligne"
                />
              )}
            </Field>
          </div>
        </Group>

        <Group title="Contact">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Email de contact" optional>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  autoComplete="email"
                  value={form.contact_email}
                  onChange={(event) => updateField('contact_email', event.target.value)}
                />
              )}
            </Field>

            <Field label="Téléphone" optional>
              {(props) => (
                <Input
                  {...props}
                  type="tel"
                  autoComplete="tel"
                  value={form.contact_phone}
                  onChange={(event) => updateField('contact_phone', event.target.value)}
                />
              )}
            </Field>

            <Field label="Site web" optional>
              {(props) => (
                <Input
                  {...props}
                  type="url"
                  placeholder="https://"
                  value={form.website_url}
                  onChange={(event) => updateField('website_url', event.target.value)}
                />
              )}
            </Field>

            <Field label="Adresse" optional>
              {(props) => (
                <Input
                  {...props}
                  value={form.address_text}
                  onChange={(event) => updateField('address_text', event.target.value)}
                />
              )}
            </Field>
          </div>
        </Group>

        <Group title="Images">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="k-field">
              <p className="k-field__label">Logo</p>
              <ImageUploader
                bucketName="post_images"
                initialImageUrl={form.logo_url || null}
                onUploadSuccess={(url) => updateField('logo_url', url)}
              />
            </div>
            <div className="k-field">
              <p className="k-field__label">Image de couverture</p>
              <ImageUploader
                bucketName="post_images"
                initialImageUrl={form.cover_url || null}
                onUploadSuccess={(url) => updateField('cover_url', url)}
              />
            </div>
          </div>
        </Group>

        {allowModerationFields ? (
          <Group title="Modération">
            <div className="grid items-end gap-5 md:grid-cols-2">
              <Field label="Statut">
                {(props) => (
                  <Select
                    {...props}
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                  >
                    {ASSOCIATION_STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Checkbox
                label="Association vérifiée"
                checked={form.is_verified}
                onChange={(event) => updateField('is_verified', event.target.checked)}
              />
            </div>
          </Group>
        ) : null}

        <div className="k-hairline-top flex flex-wrap justify-end gap-2 pt-6">
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
