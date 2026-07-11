import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import ImageUploader from '@/components/ui/ImageUploader';
import { createConsultationTransaction } from '@/api/democracy';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin as checkIsAdmin } from '@/lib/types/contract';

export default function CreateConsultationView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();

  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    question: '',
    options: ['', ''],
    summary: '',
    description: '',
    cover_image: null as string | null,
    multiple_choices: false,
  });

  function addOption() {
    setForm((prev) => ({ ...prev, options: [...prev.options, ''] }));
  }

  function removeOption(index: number) {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;
      return { ...prev, options: prev.options.filter((_, i) => i !== index) };
    });
  }

  function updateOption(index: number, value: string) {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  function handleImageUpload(url: string) {
    setForm((prev) => ({ ...prev, cover_image: url }));
  }

  function handleImageError(err: unknown) {
    console.error('Erreur upload image:', err);
    alert("Impossible d'uploader l'image.");
  }

  async function submitConsultation(event: React.FormEvent) {
    event.preventDefault();

    if (!session || !profile || !checkIsAdmin(profile)) {
      alert('Accès refusé. Vous devez être administrateur.');
      return;
    }

    if (!form.title.trim() || !form.question.trim()) {
      alert('Le titre et la question sont obligatoires.');
      return;
    }

    const validOptions = form.options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Vous devez fournir au moins 2 options valides.');
      return;
    }

    setIsSubmitting(true);

    try {
      const quartierId = parseInt(idParam ?? '', 10);
      if (Number.isNaN(quartierId)) throw new Error('ID du quartier invalide.');

      const payload = {
        p_quartier_id: quartierId,
        p_title: form.title,
        p_question: form.question,
        p_options: validOptions,
        p_summary: form.summary || null,
        p_description: form.description || null,
        p_cover_image: form.cover_image || null,
        p_multiple_choices: form.multiple_choices,
      };

      const { error } = await createConsultationTransaction(payload);

      if (error) {
        console.error("Détails de l'erreur Supabase:", error);
        throw error;
      }

      alert('Sondage créé avec succès !');
      navigate(`/quartiers/${quartierId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur attrapée :', message);
      alert(`Erreur lors de la création : ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Créer un Nouveau Sondage</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Annuler
          </button>
        </div>

        <form onSubmit={(e) => void submitConsultation(e)} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Titre du sondage <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              type="text"
              required
              placeholder="Ex: Aménagement du parc"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Question posée <span className="text-red-500">*</span>
            </label>
            <input
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
              type="text"
              required
              placeholder="Ex: Quel type d'équipement préférez-vous ?"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-4">
              Options de réponse (min. 2) <span className="text-red-500">*</span>
            </label>

            {form.options.map((option, index) => (
              <div key={index} className="flex gap-3 mb-3 items-center">
                <span className="text-gray-400 font-bold w-6 text-center">{index + 1}.</span>
                <input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  type="text"
                  required
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={form.options.length <= 2}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Supprimer l'option"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Ajouter une option
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Résumé court (Optionnel)
            </label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
              rows={2}
              placeholder="Apparaît dans la liste des sondages..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Description détaillée (Optionnel)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              placeholder="Expliquez le contexte du sondage..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Image de couverture (Optionnel)
            </label>
            <ImageUploader
              bucketName="post_images"
              onUploadSuccess={handleImageUpload}
              onUploadError={handleImageError}
            />

            {form.cover_image ? (
              <div className="mt-4 relative inline-block group w-full">
                <img
                  src={form.cover_image}
                  alt="Couverture"
                  className="h-32 w-full object-cover rounded-xl shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, cover_image: null }))}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <input
              id="multiple_choices"
              type="checkbox"
              checked={form.multiple_choices}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, multiple_choices: e.target.checked }))
              }
              className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label
              htmlFor="multiple_choices"
              className="text-sm font-medium text-gray-700 select-none cursor-pointer"
            >
              Autoriser les utilisateurs à sélectionner plusieurs réponses
            </label>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-8 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : null}
              {isSubmitting ? 'Création en cours...' : 'Publier le sondage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
