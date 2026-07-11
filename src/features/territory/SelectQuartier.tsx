import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listQuartiers } from '@/api/profiles';

interface SelectQuartierProps {
  onQuartierSaved: (quartierId: number) => void;
}

export default function SelectQuartier({ onQuartierSaved }: SelectQuartierProps) {
  const [selectedQuartierId, setSelectedQuartierId] = useState('');

  const { data: allQuartiers = [], isError } = useQuery({
    queryKey: ['quartiers'],
    queryFn: listQuartiers,
  });

  function saveQuartier() {
    if (!selectedQuartierId) return;
    onQuartierSaved(Number(selectedQuartierId));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Bienvenue !</h2>
        <p className="text-gray-600 mb-6">
          Pour personnaliser votre expérience, veuillez sélectionner votre quartier de résidence.
        </p>

        <select
          value={selectedQuartierId}
          onChange={(event) => setSelectedQuartierId(event.target.value)}
          className="w-full p-3 border rounded-lg mb-6"
        >
          <option disabled value="">
            -- Choisissez un quartier --
          </option>
          {allQuartiers.map((quartier) => (
            <option key={quartier.id} value={quartier.id}>
              {quartier.name}
            </option>
          ))}
        </select>

        {isError ? (
          <p className="text-sm text-red-600 mb-4">
            Erreur lors de la récupération des quartiers.
          </p>
        ) : null}

        <button
          type="button"
          onClick={saveQuartier}
          disabled={!selectedQuartierId}
          className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition hover:bg-blue-700 disabled:bg-gray-400"
        >
          Enregistrer et continuer
        </button>
      </div>
    </div>
  );
}
