import { useState } from 'react';
import { Link } from 'react-router';
import type { Session } from '@supabase/supabase-js';
import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Media from '@/components/ui/Media';
import { surfaceClass } from '@/components/ui/Surface';
import { useToast } from '@/components/ui/Toast';
import { supportPetitionDirect } from '@/api/democracy';
import { categoryKeyFor, petitionThemeEmoji } from '@/design/categories';
import type { Petition } from '@/lib/types/contract';
import { useUiStore } from '@/stores/uiStore';

interface PetitionCardProps {
  petition: Petition;
  session: Session | null;
  onDelete: (id: number) => void;
}

/**
 * Vignette d'une pétition.
 *
 * Le thème se lit à son émoji, posé sur la photo ou, à défaut de photo, en
 * grand sur le dégradé ambré des pétitions : un transport, une école ou un parc
 * se reconnaissent avant d'avoir lu une ligne.
 */
export default function PetitionCard({ petition, session, onDelete }: PetitionCardProps) {
  const toast = useToast();
  const openAuthModal = useUiStore((state) => state.openAuthModal);
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

  // Sans compte, le bouton ouvre la connexion plutôt que d'être grisé : un
  // bouton désactivé qui dit « connectez-vous » ne mène nulle part.
  const isButtonDisabled = isSupported || isUpdating;
  const summary = (petition.summary as string) || '';
  const imageUrl =
    ((petition as { image?: string }).image || (petition as { image_url?: string }).image_url) ?? '';
  const emoji = petitionThemeEmoji(petition.theme);

  return (
    <article
      className={surfaceClass({
        interactive: true,
        className: 'group relative flex h-full flex-col overflow-hidden',
      })}
    >
      <AdminDeleteButton tableName="petitions" itemId={petition.id} onDeleted={onDelete} />

      {/* Le dégradé de repli suit le thème : deux pétitions côte à côte ne
          doivent pas former un aplat de la même couleur. */}
      <Media
        src={imageUrl}
        category={imageUrl ? 'petition' : categoryKeyFor(petition.theme as string)}
        emoji={emoji}
        ratio="16 / 9"
      />

      {petition.theme ? (
        <span className="absolute left-3 top-3 z-10 max-w-[calc(100%-5rem)]">
          <Badge tone="petition" emoji={emoji} onMedia>
            <span className="min-w-0 truncate">{petition.theme}</span>
          </Badge>
        </span>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="k-title-3 text-balance">
          <Link
            to={`/petitions/${petition.id}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {petition.title}
          </Link>
        </h3>

        {summary ? <p className="k-subhead k-ink-secondary mt-2 line-clamp-3">{summary}</p> : null}

        {/* Le décompte est le moment de participation de la carte : c'est le
            seul endroit où l'accent chaud a le droit d'apparaître. */}
        <p className="mt-auto flex items-baseline gap-2 pt-4">
          <span className="k-title-3 tabular-nums text-warm">{localSupports}</span>
          <span className="k-footnote k-ink-secondary">
            {localSupports > 1 ? 'soutiens' : 'soutien'}
          </span>
        </p>

        <Button
          variant={isSupported ? 'secondary' : 'warm'}
          block
          // Le bouton passe au-dessus du lien qui couvre la carte.
          className="relative z-10 mt-3"
          onClick={(e) => {
            e.stopPropagation();
            if (!session) {
              openAuthModal();
              return;
            }
            void handleSupport();
          }}
          disabled={isButtonDisabled}
          loading={isUpdating}
          leading={isSupported ? <Icon name="check" size={17} /> : undefined}
        >
          {isSupported ? 'Soutenu' : !session ? 'Se connecter pour soutenir' : 'Soutenir'}
        </Button>
      </div>
    </article>
  );
}
