import { useState } from 'react';
import { Link } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon, { type IconName } from '@/components/ui/Icon';
import { surfaceClass } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { supportPetitionDirect } from '@/api/democracy';
import type { Petition } from '@/lib/types/contract';

interface PetitionCardProps {
  petition: Petition;
  session: Session | null;
  onDelete: (id: number) => void;
}

/**
 * Le thème n'est plus une couleur parmi sept : c'est une icône. Sept teintes
 * concurrentes se disputaient l'attention avec l'accent du produit ; un
 * pictogramme situe le sujet sans rien réclamer.
 */
function getThemeIcon(theme: string | null | undefined): IconName {
  if (!theme) return 'tag';
  const lower = theme.toLowerCase();
  if (lower.includes('transport')) return 'road';
  if (lower.includes('sécurité')) return 'shield';
  if (lower.includes('environnement')) return 'leaf';
  if (lower.includes('logement')) return 'building';
  if (lower.includes('emploi')) return 'briefcase';
  return 'tag';
}

export default function PetitionCard({ petition, session, onDelete }: PetitionCardProps) {
  const toast = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSupported, setIsSupported] = useState(
    Boolean((petition as { user_has_supported?: boolean }).user_has_supported),
  );
  const [localSupports, setLocalSupports] = useState((petition.supports as number) ?? 0);

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
      } else {
        toast.error('Soutien non enregistré', 'Réessayez dans un instant.');
      }
    } finally {
      setIsUpdating(false);
    }
  }

  const isButtonDisabled = isSupported || isUpdating || !session;
  const summary = (petition.summary as string) || '';

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'relative flex h-full flex-col p-5',
      })}
    >
      <AdminDeleteButton tableName="petitions" itemId={petition.id} onDeleted={onDelete} />

      {petition.theme ? (
        <Badge icon={getThemeIcon(petition.theme)} className="mb-3 self-start">
          {petition.theme}
        </Badge>
      ) : null}

      <h3 className="k-title-3 text-balance">
        <Link
          to={`/petitions/${petition.id}`}
          className="after:absolute after:inset-0 after:content-['']"
        >
          {petition.title}
        </Link>
      </h3>

      {summary ? <p className="k-subhead k-ink-secondary mt-2 line-clamp-3">{summary}</p> : null}

      {/* Le décompte est le moment de participation de la carte : c'est le seul
          endroit où l'accent chaud a le droit d'apparaître. */}
      <p className="k-footnote mt-auto flex items-center gap-1.5 pt-4 font-medium text-warm">
        <Icon name="handRaised" size={16} />
        <span className="tabular-nums">
          {localSupports} {localSupports > 1 ? 'soutiens' : 'soutien'}
        </span>
      </p>

      <Button
        variant={isSupported ? 'secondary' : 'warm'}
        block
        // Le bouton passe au-dessus du lien qui couvre la carte.
        className="relative z-10 mt-3"
        onClick={(e) => {
          e.stopPropagation();
          void handleSupport();
        }}
        disabled={isButtonDisabled}
        loading={isUpdating}
        leading={isSupported ? <Icon name="check" size={17} /> : undefined}
      >
        {isSupported ? 'Soutenu' : !session ? 'Se connecter pour soutenir' : 'Soutenir'}
      </Button>
    </article>
  );
}
