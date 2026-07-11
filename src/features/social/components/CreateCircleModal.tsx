import { useState } from 'react';

interface CreateCircleModalProps {
  isAdmin: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (data: { name: string; description: string; type: 'public' | 'private' }) => void;
}

export default function CreateCircleModal({
  isAdmin,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: CreateCircleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('private');

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), type });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Créer un nouveau cercle</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du cercle (ex: Jardiniers)"
          className="w-full border p-2 mb-2 rounded"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description..."
          className="w-full border p-2 mb-4 rounded"
        />
        <div className="flex gap-2 mb-4">
          {isAdmin ? (
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="circle-type"
                checked={type === 'public'}
                onChange={() => setType('public')}
              />
              Public
            </label>
          ) : null}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name="circle-type"
              checked={type === 'private'}
              onChange={() => setType('private')}
            />
            Privé
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="text-gray-600">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
