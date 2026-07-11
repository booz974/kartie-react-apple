import { useState } from 'react';

interface CreateNewsFormProps {
  onCancel: () => void;
  onCreateNews: (payload: { title: string; content: string; date: string }) => void;
}

export default function CreateNewsForm({ onCancel, onCreateNews }: CreateNewsFormProps) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    date: new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onCreateNews({ ...form });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Publier une actualité</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              type="text"
              placeholder="Titre de l'actualité"
              required
              className="w-full p-2 border rounded-md"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Contenu de l'actualité"
              required
              className="w-full p-2 border rounded-md"
              rows={5}
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
              className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700"
            >
              Publier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
