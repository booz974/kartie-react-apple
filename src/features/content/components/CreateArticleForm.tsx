import { useState } from 'react';

interface CreateArticleFormProps {
  onCancel: () => void;
  onCreateArticle: (payload: {
    title: string;
    category: string;
    description: string;
    image_url: string;
    content: string;
  }) => void;
}

export default function CreateArticleForm({
  onCancel,
  onCreateArticle,
}: CreateArticleFormProps) {
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    image_url: '',
    content: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateAndSubmit() {
    const nextErrors: Record<string, string> = {};

    if (!form.title) {
      nextErrors.title = 'Le titre est obligatoire.';
    }
    if (!form.content) {
      nextErrors.content = "Le contenu de l'article ne peut pas être vide.";
    }
    if (!form.image_url) {
      nextErrors.image_url = "L'URL de l'image de couverture est requise.";
    } else {
      try {
        new URL(form.image_url);
      } catch {
        nextErrors.image_url =
          'URL invalide. Elle doit commencer par http:// ou https://';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onCreateArticle({ ...form });
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Nouvel article</h2>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-5 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={validateAndSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-lg"
            >
              Publier
            </button>
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-lg shadow-lg">
          <input
            type="text"
            placeholder="Titre de la réalisation..."
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className={`text-4xl font-extrabold w-full border-none focus:ring-0 p-0 mb-2 placeholder-gray-300 create-article-input${errors.title ? ' border-b border-red-500' : ''}`}
            required
          />
          {errors.title ? (
            <p className="text-red-500 text-sm mb-4">{errors.title}</p>
          ) : null}

          <input
            type="text"
            placeholder="Catégorie (ex: Rénovation, Social)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="text-sm font-bold uppercase w-full border-none focus:ring-0 p-0 mb-6 placeholder-gray-400 text-indigo-600 create-article-input"
            required
          />

          <textarea
            placeholder="Description courte (visible sur la carte)..."
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="text-lg font-light w-full border-none focus:ring-0 p-0 mb-8 h-24 resize-none placeholder-gray-400 create-article-input"
            required
          />

          <div className="mb-8 border-t pt-8">
            <label className="block text-gray-500 text-sm font-bold mb-2">
              URL de l&apos;image de couverture
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              className={`w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400${errors.image_url ? ' border-red-500' : ''}`}
              required
            />
            {errors.image_url ? (
              <p className="text-red-500 text-sm mt-1">{errors.image_url}</p>
            ) : null}
          </div>

          <div className="border-t pt-8">
            <label className="block text-gray-500 text-sm font-bold mb-2">
              Contenu de l&apos;article{' '}
              <span className="font-normal">
                (Vous pouvez utiliser des balises HTML comme &lt;h2&gt;, &lt;p&gt;,
                &lt;img src=&quot;...&quot;&gt;)
              </span>
            </label>
            <textarea
              placeholder="Racontez votre histoire ici..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className={`w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 h-96 resize-y placeholder-gray-400 font-serif text-lg${errors.content ? ' border-red-500' : ''}`}
              required
            />
            {errors.content ? (
              <p className="text-red-500 text-sm mt-1">{errors.content}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
