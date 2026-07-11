import { useState } from 'react';
import ImageUploader from '@/components/ui/ImageUploader';

interface CreatePetitionFormProps {
  onCancel: () => void;
  onCreatePetition: (payload: {
    title: string;
    theme: string;
    summary: string;
    source: string;
    image: string | null;
  }) => void;
}

export default function CreatePetitionForm({
  onCancel,
  onCreatePetition,
}: CreatePetitionFormProps) {
  const [form, setForm] = useState({
    title: '',
    theme: '',
    summary: '',
    source: '',
    image: null as string | null,
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onCreatePetition({ ...form });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Lancer une nouvelle pétition</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              type="text"
              placeholder="Titre de la pétition"
              required
              className="w-full p-2 border rounded-md"
            />
            <select
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
              required
              className="w-full p-2 border rounded-md bg-white"
            >
              <option disabled value="">
                Choisissez un thème
              </option>
              <option>Logement</option>
              <option>Sécurité</option>
              <option>Environnement</option>
              <option>Transport</option>
              <option>Emploi</option>
              <option>Autre</option>
            </select>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Résumé (description courte)"
              required
              className="w-full p-2 border rounded-md"
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image (Optionnel)
              </label>
              <ImageUploader
                onUploadSuccess={(url) => setForm((f) => ({ ...f, image: url }))}
              />
            </div>
            <textarea
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="Source / Contexte"
              required
              className="w-full p-2 border rounded-md"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Lancer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
