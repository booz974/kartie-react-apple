import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Media from '@/components/ui/Media';
import { surfaceClass } from '@/components/ui/Surface';
import type { Consultation } from '@/lib/types/contract';

interface ConsultationCardProps {
  consultation: Consultation;
  onSelected: (id: number) => void;
  onDelete: (id: number) => void;
}

/**
 * Vignette d'un sondage.
 *
 * La couverture porte la carte, l'étiquette turquoise dit sa nature, et
 * l'appel à répondre reste en bas, toujours à la même place d'une carte à
 * l'autre. La carte n'est pas cliquable en entier : c'est le bouton qui ouvre
 * le sondage, donc elle ne se soulève pas, seule sa photo s'anime au survol.
 */
export default function ConsultationCard({
  consultation,
  onSelected,
  onDelete,
}: ConsultationCardProps) {
  const coverImage = (consultation as { cover_image?: string }).cover_image || '';
  const summary = (consultation as { summary?: string }).summary || '';

  return (
    <article
      className={surfaceClass({ className: 'group relative flex h-full flex-col overflow-hidden' })}
    >
      <AdminDeleteButton
        tableName="consultations"
        itemId={consultation.id}
        onDeleted={onDelete}
      />

      <Media src={coverImage} category="consult" ratio="16 / 9" />

      <span className="absolute left-3 top-3 z-10">
        <Badge tone="consult" emoji="🗳️" onMedia>
          Votre avis compte
        </Badge>
      </span>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="k-title-3 text-balance">{consultation.title}</h3>

        {summary ? <p className="k-subhead k-ink-secondary mt-2 line-clamp-3">{summary}</p> : null}

        {consultation.question ? (
          <p className="k-footnote k-ink-tertiary mt-3 line-clamp-2">
            <span aria-hidden="true">💬 </span>
            {consultation.question}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <Button variant="primary" block onClick={() => onSelected(consultation.id)}>
            Répondre au sondage
          </Button>
        </div>
      </div>
    </article>
  );
}
