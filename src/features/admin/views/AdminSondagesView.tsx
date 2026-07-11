import { useNavigate } from 'react-router';
import {
  calculateSondagePercentage,
  totalSondageVotes,
} from '@/api/democracy';
import { useAdminSondages } from '@/queries/democracy';
import type { SondageAdminItem } from '@/lib/types/contract';

function SondageResults({ sondage }: { sondage: SondageAdminItem }) {
  const total = totalSondageVotes(sondage);
  const options = Array.isArray(sondage.options) ? sondage.options : [];

  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-gray-600 mb-4">{sondage.description}</p>

      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.text}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-700">{option.text}</span>
              <span className="font-bold text-gray-800">{option.votes} vote(s)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${calculateSondagePercentage(option.votes, total)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSondagesView() {
  const navigate = useNavigate();
  const { data: sondagesData = [], isLoading } = useAdminSondages();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex items-center space-x-4">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="text-blue-600 hover:underline"
        >
          &larr; Retour au Dashboard Admin
        </button>
        <h1 className="text-3xl font-bold">Résultats des Sondages</h1>
      </header>

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-lg text-gray-600">Chargement des résultats...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sondagesData.map((quartier) => (
            <section key={quartier.quartier_nom}>
              <h2 className="text-2xl font-semibold text-gray-800 border-b-2 border-blue-200 pb-2 mb-4">
                {quartier.quartier_nom}
              </h2>
              <div className="space-y-4">
                {(quartier.sondages ?? []).map((sondage) => (
                  <details
                    key={sondage.id}
                    className="bg-white p-4 rounded-lg shadow-sm cursor-pointer"
                  >
                    <summary className="font-semibold text-lg text-gray-900">
                      {sondage.title}
                    </summary>
                    <SondageResults sondage={sondage} />
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
