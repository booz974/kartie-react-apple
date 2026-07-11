import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import { supportPetitionDirect } from '@/api/democracy';
import type { Petition } from '@/lib/types/contract';

interface PetitionCardProps {
  petition: Petition;
  session: Session | null;
  onDelete: (id: number) => void;
}

function getThemeColorClass(theme: string | null | undefined): string {
  if (!theme) return 'bg-gray-100 text-gray-800';
  const lower = theme.toLowerCase();
  if (lower.includes('transport')) return 'bg-blue-100 text-blue-800';
  if (lower.includes('sécurité')) return 'bg-red-100 text-red-800';
  if (lower.includes('environnement')) return 'bg-green-100 text-green-800';
  if (lower.includes('logement')) return 'bg-purple-100 text-purple-800';
  if (lower.includes('emploi')) return 'bg-gray-200 text-gray-800';
  return 'bg-yellow-100 text-yellow-800';
}

export default function PetitionCard({ petition, session, onDelete }: PetitionCardProps) {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSupported, setIsSupported] = useState(
    Boolean((petition as { user_has_supported?: boolean }).user_has_supported),
  );
  const [localSupports, setLocalSupports] = useState((petition.supports as number) ?? 0);

  function navigateToPetition() {
    navigate(`/petitions/${petition.id}`);
  }

  async function handleSupport() {
    if (!session || isSupported || isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await supportPetitionDirect(
        petition.id,
        session.user.id,
        localSupports,
      );

      if (result.success && result.newCount != null) {
        setIsSupported(true);
        setLocalSupports(result.newCount);
      }
    } finally {
      setIsUpdating(false);
    }
  }

  const isButtonDisabled = isSupported || isUpdating || !session;
  const buttonClasses = isButtonDisabled
    ? 'bg-gray-400 text-white cursor-not-allowed'
    : 'bg-green-500 text-white hover:bg-green-600';

  return (
    <div className="relative petition-card bg-white rounded-2xl shadow-lg p-6 flex flex-col h-full">
      <AdminDeleteButton tableName="petitions" itemId={petition.id} onDeleted={onDelete} />
      <div onClick={navigateToPetition} className="flex-grow cursor-pointer">
        <span
          className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${getThemeColorClass(petition.theme)}`}
        >
          {petition.theme}
        </span>
        <h4 className="font-bold text-lg mt-4 mb-2 text-gray-800">{petition.title}</h4>
        <p className="text-sm text-gray-600 mb-4">{petition.summary as string}</p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleSupport();
        }}
        disabled={isButtonDisabled}
        className={`mt-auto w-full font-bold py-2 px-4 rounded-lg transition-colors ${buttonClasses}`}
      >
        {isUpdating ? (
          <span>Vote en cours...</span>
        ) : isSupported ? (
          <span>Soutenu ✔️</span>
        ) : !session ? (
          <span>Se connecter pour soutenir</span>
        ) : (
          <span>Soutenir</span>
        )}{' '}
        ({localSupports})
      </button>
    </div>
  );
}
