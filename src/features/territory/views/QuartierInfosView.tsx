import { useParams, useNavigate } from 'react-router';
import QuartierInfos from '@/features/territory/components/QuartierInfos';
import { useQuartier } from '@/queries/territory';

export default function QuartierInfosView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quartierId = id ? Number(id) : undefined;

  const { data: quartier, isLoading, isError, refetch } = useQuartier(quartierId);

  if (isLoading) {
    return <div className="p-10 text-center">Chargement des informations du quartier...</div>;
  }

  if (isError) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 font-bold">
          Erreur : Impossible de charger les informations du quartier.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!quartier) {
    return (
      <div className="p-10 text-center">
        <p>Quartier introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <QuartierInfos quartier={quartier} onBack={() => navigate(`/quartiers/${quartier.id}`)} />
  );
}
