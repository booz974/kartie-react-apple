import { useState } from 'react';
import ImageUploader from '@/components/ui/ImageUploader';
import {
  mapAlaUneRowToFormValues,
  type AlaUneFormOptionDraft,
  type AlaUneFormValues,
} from '@/api/alaUne';
import type { AlaUneContent, AlaUneContentType } from '@/lib/types/contract';

interface AlaUneFormProps {
  initialData?: AlaUneContent | null;
  onCancel: () => void;
  onSubmit: (form: AlaUneFormValues) => void;
}

/**
 * Dynamic À la Une form — Vue AlaUneForm parity.
 * Uses controlled useState (project convention; no RHF/Zod in app-react).
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

  return (
    <div className="desktop-glass-card p-6 md:p-10">
      <h2 className="text-3xl font-bold text-center mb-8">
        {isEditing ? 'Modifier' : 'Créer'} un élément &quot;À la Une&quot;
      </h2>
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        <div>
          <label className="font-semibold">Type d&apos;élément</label>
          <select
            value={form.type}
            disabled={isEditing}
            onChange={(e) => setType(e.target.value as AlaUneContentType)}
            className="w-full p-2 border rounded mt-1"
          >
            <option value="article">Article</option>
            <option value="event">Événement</option>
            <option value="sondage">Sondage</option>
            <option value="flash_info">Flash Info</option>
          </select>
        </div>

        {showTitle ? (
          <div>
            <label className="font-semibold">
              {form.type === 'sondage' ? 'Question du sondage' : 'Titre'}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full p-2 border rounded mt-1"
              required
            />
          </div>
        ) : null}

        {showContent ? (
          <div>
            <label className="font-semibold">Contenu</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full p-2 border rounded mt-1"
              rows={4}
              required
            />
          </div>
        ) : null}

        {showImage ? (
          <div>
            <label className="font-semibold">Image</label>
            <div className="mt-1">
              <ImageUploader
                initialImageUrl={form.image_url || null}
                onUploadSuccess={(url) => setForm((f) => ({ ...f, image_url: url }))}
                onUploadError={(error) =>
                  console.error("Erreur lors de l'upload de l'image:", error)
                }
              />
            </div>
          </div>
        ) : null}

        {showEventFields ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold">Date de l&apos;événement</label>
              <input
                type="datetime-local"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                className="w-full p-2 border rounded mt-1"
                required
              />
            </div>
            <div>
              <label className="font-semibold">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full p-2 border rounded mt-1"
                required
              />
            </div>
          </div>
        ) : null}

        {showSondageOptions ? (
          <div>
            <label className="font-semibold">Options de réponse</label>
            {form.sondage_options.map((option: AlaUneFormOptionDraft, index: number) => (
              <div key={index} className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Texte de l'option"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="bg-red-500 text-white px-3 py-2 rounded"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-blue-600 font-semibold"
            >
              + Ajouter une option
            </button>
          </div>
        ) : null}

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-5 w-5"
            />
            <span className="font-semibold">Actif (visible sur la page d&apos;accueil)</span>
          </label>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="font-semibold py-2 px-6 rounded-lg hover:bg-gray-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
