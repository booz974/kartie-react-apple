import { useState } from 'react';
import ImageUploader from '@/components/ui/ImageUploader';

interface CreateEventFormProps {
  onCancel: () => void;
  onCreateEvent: (payload: {
    title: string;
    date: string;
    location: string;
    description: string;
    image: string;
  }) => void;
}

export default function CreateEventForm({ onCancel, onCreateEvent }: CreateEventFormProps) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    image: '',
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (form.image) {
      onCreateEvent({ ...form });
    } else {
      alert("Veuillez uploader une image pour l'événement.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Ajouter un nouvel événement</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              type="text"
              placeholder="Titre de l'événement"
              required
              className="w-full p-2 border rounded-md"
            />
            <input
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              type="text"
              placeholder="Date (ex: 25 Décembre 2025)"
              required
              className="w-full p-2 border rounded-md"
            />
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              type="text"
              placeholder="Lieu"
              required
              className="w-full p-2 border rounded-md"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              required
              className="w-full p-2 border rounded-md"
              rows={4}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image de l&apos;événement
              </label>
              <ImageUploader onUploadSuccess={(url) => setForm((f) => ({ ...f, image: url }))} />
            </div>
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
              disabled={!form.image}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {!form.image ? 'Veuillez uploader une image' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
