import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supportPetition } from '@/api/democracy';
import {
  usePetition,
  usePetitionSupportStatus,
} from '@/queries/democracy';
import { useAuthStore } from '@/stores/authStore';

function getThemeColorClass(theme: string | null | undefined): string {
  if (!theme) return 'bg-gray-100 text-gray-800';
  const lower = theme.toLowerCase();
  if (lower.includes('transport')) return 'bg-blue-100 text-blue-800';
  if (lower.includes('sécurité')) return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

export default function PetitionView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const petitionId = idParam ? parseInt(idParam, 10) : undefined;

  const session = useAuthStore((state) => state.session);

  const { data: petition, isLoading, isError, refetch } = usePetition(petitionId);
  const { data: supportsSet } = usePetitionSupportStatus(session?.user?.id, petitionId);

  const [isUpdating, setIsUpdating] = useState(false);
  const [localSupports, setLocalSupports] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (petition) {
      setLocalSupports((petition.supports as number) ?? 0);
    }
  }, [petition]);

  useEffect(() => {
    if (supportsSet && petitionId != null) {
      setIsSupported(supportsSet.has(petitionId));
    }
  }, [supportsSet, petitionId]);

  const isButtonDisabled = isSupported || isUpdating || !session;

  const buttonClasses = useMemo(() => {
    if (isButtonDisabled) {
      return 'bg-gray-400 text-white cursor-not-allowed';
    }
    return 'bg-green-500 text-white hover:bg-green-600';
  }, [isButtonDisabled]);

  async function handleSupport() {
    if (!session || isSupported || isUpdating || !petition) return;

    setIsUpdating(true);
    try {
      const result = await supportPetition(petition.id, session.user.id);

      if (result.success) {
        setIsSupported(true);
        const newCount = result.newCount ?? result.new_count;
        if (newCount != null) {
          setLocalSupports(newCount);
        }
      } else {
        if (result.error) throw result.error;
        throw new Error('Erreur inconnue lors du soutien.');
      }
    } catch (err) {
      console.error('Erreur support:', err);
      alert('Une erreur est survenue lors du soutien.');
    } finally {
      setIsUpdating(false);
    }
  }

  function goBack() {
    if (petition?.quartier_id) {
      navigate(`/quartiers/${petition.quartier_id}/list?type=petitions`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center p-10">
        <p className="text-xl font-semibold text-gray-700">Chargement de la pétition...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 font-bold">Erreur : Impossible de charger la pétition.</p>
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

  if (!petition) {
    return (
      <div className="text-center p-10">
        <p>Pétition introuvable.</p>
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
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg max-w-3xl mx-auto my-8">
      <button
        onClick={goBack}
        className="mb-8 inline-flex items-center gap-2 bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-full transition hover:bg-gray-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Retour
      </button>

      <div>
        <span
          className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${getThemeColorClass(petition.theme)}`}
        >
          {petition.theme}
        </span>
        <h2 className="text-4xl font-bold text-gray-900 my-4">{petition.title}</h2>
        <p className="text-lg text-gray-700 mb-6">{petition.summary as string}</p>
        <div className="bg-gray-50 p-4 rounded-lg text-sm">
          <p className="text-gray-600">
            <strong>Source / Contexte :</strong> {petition.source as string}
          </p>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => void handleSupport()}
            disabled={isButtonDisabled}
            className={`${buttonClasses} w-full md:w-auto font-bold py-3 px-12 text-lg rounded-lg transition-colors`}
          >
            {isUpdating ? (
              <span>Mise à jour...</span>
            ) : isSupported ? (
              <span>
                Soutenu ({localSupports}) ✔️
              </span>
            ) : !session ? (
              <span>Connectez-vous pour soutenir</span>
            ) : (
              <span>Soutenir cette pétition ({localSupports})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
