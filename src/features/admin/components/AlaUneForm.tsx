import { useState } from 'react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Field, { Checkbox, Input, Select, Textarea } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import ImageUploader from '@/components/ui/ImageUploader';
import {
  mapAlaUneRowToFormValues,
  type AlaUneFormOptionDraft,
  type AlaUneFormValues,
} from '@/api/alaUne';
import type { CategoryKey } from '@/design/categories';
import type { AlaUneContent, AlaUneContentType } from '@/lib/types/contract';

interface AlaUneFormProps {
  initialData?: AlaUneContent | null;
  onCancel: () => void;
  onSubmit: (form: AlaUneFormValues) => void;
}

/**
 * Chaque type d'élément a sa couleur et son émoji, comme partout ailleurs dans
 * le produit : on reconnaît ce que l'on est en train de composer avant même de
 * lire le formulaire.
 */
/** Repères des options d'un sondage, identiques à ceux de la page d'accueil. */
const OPTION_MARKERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

const TYPE_LOOK: Record<AlaUneContentType, { emoji: string; tone: CategoryKey; hint: string }> = {
  article: {
    emoji: '📰',
    tone: 'news',
    hint: 'Une actualité, en tête de la page d’accueil, avec sa photo.',
  },
  event: {
    emoji: '🎉',
    tone: 'event',
    hint: 'Un rendez-vous à venir, avec sa date, son lieu et sa photo.',
  },
  sondage: {
    emoji: '🗳️',
    tone: 'consult',
    hint: 'Une question courte et ses réponses, votables en un geste.',
  },
  flash_info: {
    emoji: '⚡',
    tone: 'petition',
    hint: 'Une brève, affichée dans le bandeau des flashs info.',
  },
};

/**
 * Formulaire « À la Une ». Les champs affichés dépendent du type choisi : on
 * montre le chemin courant et rien d'autre, plutôt qu'un formulaire complet
 * dont les trois quarts seraient inertes.
 */
export default function AlaUneForm({
  initialData = null,
  onCancel,
  onSubmit,
}: AlaUneFormProps) {
  const isEditing = Boolean(initialData);
  const [form, setForm] = useState<AlaUneFormValues>(() =>
    mapAlaUneRowToFormValues(initialData),
  );

  function setType(type: AlaUneContentType) {
    if (isEditing) return;
    setForm((prev) => ({ ...prev, type }));
  }

  function addOption() {
    setForm((prev) => ({
      ...prev,
      sondage_options: [...prev.sondage_options, { text: '', votes: 0 }],
    }));
  }

  function removeOption(index: number) {
    setForm((prev) => ({
      ...prev,
      sondage_options: prev.sondage_options.filter((_, i) => i !== index),
    }));
  }

  function updateOption(index: number, text: string) {
    setForm((prev) => ({
      ...prev,
      sondage_options: prev.sondage_options.map((opt, i) =>
        i === index ? { ...opt, text } : opt,
      ),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(form);
  }

  const showTitle =
    form.type === 'article' || form.type === 'event' || form.type === 'sondage';
  const showContent =
    form.type === 'article' || form.type === 'event' || form.type === 'flash_info';
  const showImage = form.type === 'article' || form.type === 'event';
  const showEventFields = form.type === 'event';
  const showSondageOptions = form.type === 'sondage';

  const look = TYPE_LOOK[form.type] ?? TYPE_LOOK.article;

  return (
    <form onSubmit={handleSubmit} className="k-measure flex flex-col gap-6">
      <div className="k-card flex items-center gap-4 p-4">
        <Chip tone={look.tone} size={48}>
          {look.emoji}
        </Chip>
        <p className="k-subhead k-ink-secondary min-w-0 flex-1">{look.hint}</p>
      </div>

      <Field
        label={"Type d'élément"}
        hint={isEditing ? 'Le type ne peut plus changer après création.' : undefined}
      >
        {(props) => (
          <Select
            {...props}
            value={form.type}
            disabled={isEditing}
            onChange={(e) => setType(e.target.value as AlaUneContentType)}
          >
            <option value="article">Article</option>
            <option value="event">Événement</option>
            <option value="sondage">Sondage</option>
            <option value="flash_info">Flash Info</option>
          </Select>
        )}
      </Field>

      {showTitle ? (
        <Field label={form.type === 'sondage' ? 'Question du sondage' : 'Titre'}>
          {(props) => (
            <Input
              {...props}
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          )}
        </Field>
      ) : null}

      {showContent ? (
        <Field label="Contenu">
          {(props) => (
            <Textarea
              {...props}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
              required
            />
          )}
        </Field>
      ) : null}

      {showImage ? (
        // L'uploader n'est pas un contrôle unique : le libellé décrit le groupe
        // plutôt que de pointer un champ inexistant.
        <div className="k-field">
          <span className="k-field__label">Image</span>
          <ImageUploader
            initialImageUrl={form.image_url || null}
            onUploadSuccess={(url) => setForm((f) => ({ ...f, image_url: url }))}
            onUploadError={(error) =>
              console.error("Erreur lors de l'upload de l'image:", error)
            }
          />
        </div>
      ) : null}

      {showEventFields ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={"Date de l'événement"}>
            {(props) => (
              <Input
                {...props}
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                required
              />
            )}
          </Field>
          <Field label="Lieu">
            {(props) => (
              <Input
                {...props}
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                required
              />
            )}
          </Field>
        </div>
      ) : null}

      {showSondageOptions ? (
        <fieldset className="k-field">
          <legend className="k-field__label">Options de réponse</legend>
          <div className="flex flex-col gap-2">
            {form.sondage_options.map((option: AlaUneFormOptionDraft, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Chip tone="consult" size={34}>
                  {OPTION_MARKERS[index % OPTION_MARKERS.length]}
                </Chip>
                <Input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder="Texte de l'option"
                  aria-label={`Option ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  iconOnly
                  onClick={() => removeOption(index)}
                  aria-label={`Retirer l'option ${index + 1}`}
                  className="hover:text-danger"
                >
                  <Icon name="close" size={17} />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="plain"
            onClick={addOption}
            leading={<Icon name="plus" size={16} />}
            className="mt-2 self-start"
          >
            Ajouter une option
          </Button>
        </fieldset>
      ) : null}

      <div className="k-card k-card--flat p-4">
        <Checkbox
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          label="Actif (visible sur la page d’accueil)"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-separator pt-5">
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
