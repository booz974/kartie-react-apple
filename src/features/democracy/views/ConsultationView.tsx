import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { castVotes } from '@/api/democracy';
import { useConsultationDetails } from '@/queries/territory';
import { useUserConsultationVotes } from '@/queries/democracy';
import { useAuthStore } from '@/stores/authStore';
import type { ConsultationDetails } from '@/lib/types/contract';

interface ConsultationOptionWithVotes {
  id: number;
  option_text?: string;
  votes?: number;
}

function getPercentage(votes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
}

export default function ConsultationView() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const consultationId = idParam ? parseInt(idParam, 10) : undefined;

  const session = useAuthStore((state) => state.session);

  const {
    data: fetchedConsultation,
    isLoading,
    isError,
    refetch,
  } = useConsultationDetails(consultationId);
  const { data: userVotes } = useUserConsultationVotes(session?.user?.id);

  const [detailedConsultation, setDetailedConsultation] = useState<ConsultationDetails | null>(
    null,
  );
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number | number[] | null>(null);

  useEffect(() => {
    if (fetchedConsultation) {
      setDetailedConsultation(fetchedConsultation);
      if (fetchedConsultation.multiple_choices) {
        setSelectedOptions([]);
      } else {
        setSelectedOptions(null);
      }
    }
  }, [fetchedConsultation]);

  useEffect(() => {
    if (!session?.user || !detailedConsultation?.options || !userVotes) {
      if (!session?.user) {
        setHasVoted(false);
      }
      return;
    }

    const optionIds = new Set(
      (detailedConsultation.options as ConsultationOptionWithVotes[]).map((o) => o.id),
    );
    const voted = userVotes.some((vote) => optionIds.has(vote.consultation_option_id));
    setHasVoted(voted);
  }, [session, detailedConsultation, userVotes]);

  const totalVotes = useMemo(() => {
    if (!detailedConsultation?.options) return 0;
    return (detailedConsultation.options as ConsultationOptionWithVotes[]).reduce(
      (total, opt) => total + (opt.votes ?? 0),
      0,
    );
  }, [detailedConsultation]);

  async function submitVote() {
    if (!session?.user || hasVoted || isSubmitting || !detailedConsultation) return;

    const selection = Array.isArray(selectedOptions)
      ? selectedOptions
      : selectedOptions != null
        ? [selectedOptions]
        : [];

    if (selection.length === 0 || selection[0] === null) {
      alert('Veuillez sélectionner au moins une option.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await castVotes(session.user.id, selection);
      if (!result.success) throw result.error;

      alert('Votre vote a bien été pris en compte !');
      setHasVoted(true);

      setDetailedConsultation((prev) => {
        if (!prev?.options) return prev;
        const updatedOptions = (prev.options as ConsultationOptionWithVotes[]).map((opt) => {
          if (selection.includes(opt.id)) {
            return { ...opt, votes: (opt.votes ?? 0) + 1 };
          }
          return opt;
        });
        return { ...prev, options: updatedOptions as ConsultationDetails['options'] };
      });
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du vote:", err);
      const error = err as { code?: string };
      if (error.code === '23505') {
        alert('Vous avez déjà voté pour ce sondage.');
        setHasVoted(true);
      } else {
        alert("Une erreur est survenue lors de l'enregistrement de votre vote.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOptionChange(optionId: number, checked: boolean, multiple: boolean) {
    if (multiple) {
      setSelectedOptions((prev) => {
        const current = Array.isArray(prev) ? prev : [];
        if (checked) {
          return [...current, optionId];
        }
        return current.filter((id) => id !== optionId);
      });
    } else {
      setSelectedOptions(optionId);
    }
  }

  function goBack() {
    const quartierId = detailedConsultation?.quartier_id as number | undefined;
    if (quartierId) {
      navigate(`/quartiers/${quartierId}/list?type=consultations`);
    } else {
      navigate(-1);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center p-10">
        <p className="text-xl font-semibold text-gray-700">Chargement du sondage...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-10">
        <p className="text-red-500 font-bold">Erreur : Impossible de charger le sondage.</p>
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

  if (!detailedConsultation) {
    return (
      <div className="text-center p-10">
        <p>Sondage introuvable.</p>
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

  const options = detailedConsultation.options as ConsultationOptionWithVotes[];
  const showResults = !session || hasVoted;

  return (
    <div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg max-w-3xl mx-auto my-8">
      <button
        type="button"
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
        {detailedConsultation.cover_image ? (
          <img
            src={detailedConsultation.cover_image as string}
            alt={detailedConsultation.title ?? ''}
            className="w-full h-64 object-cover rounded-xl mb-6"
          />
        ) : null}
        <h2 className="text-4xl font-bold text-gray-900 mb-3">{detailedConsultation.title}</h2>
        <p className="text-gray-800 leading-relaxed mb-8">
          {detailedConsultation.description as string}
        </p>

        <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4">{detailedConsultation.question}</h3>

          {showResults ? (
            <div>
              {!session ? (
                <p className="font-semibold text-blue-700 mb-4">
                  Connectez-vous pour participer ! Voici les résultats actuels :
                </p>
              ) : (
                <p className="font-semibold text-green-700 mb-4">
                  Merci d&apos;avoir voté ! Voici les résultats :
                </p>
              )}

              {options.map((option) => (
                <div key={option.id} className="mb-3">
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="font-bold">{option.option_text}</span>
                    <span className="text-gray-600">
                      {option.votes ?? 0} vote(s) ({getPercentage(option.votes ?? 0, totalVotes)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-500 h-4 rounded-full"
                      style={{
                        width: `${getPercentage(option.votes ?? 0, totalVotes)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {detailedConsultation.multiple_choices
                  ? 'Plusieurs choix possibles.'
                  : 'Un seul choix possible.'}
              </p>
              <div className="space-y-3">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center p-3 rounded-lg border bg-white hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type={detailedConsultation.multiple_choices ? 'checkbox' : 'radio'}
                      name="vote-option"
                      value={option.id}
                      checked={
                        detailedConsultation.multiple_choices
                          ? Array.isArray(selectedOptions) && selectedOptions.includes(option.id)
                          : selectedOptions === option.id
                      }
                      onChange={(e) =>
                        handleOptionChange(
                          option.id,
                          e.target.checked,
                          Boolean(detailedConsultation.multiple_choices),
                        )
                      }
                      className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="ml-3 font-medium text-gray-800">{option.option_text}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void submitVote()}
                disabled={isSubmitting}
                className="mt-6 w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
              >
                {isSubmitting ? 'Vote en cours...' : 'Valider mon choix'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
