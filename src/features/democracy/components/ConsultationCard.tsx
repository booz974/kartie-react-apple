import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { surfaceClass } from '@/components/ui/Surface';
import type { Consultation } from '@/lib/types/contract';

interface ConsultationCardProps {
  consultation: Consultation;
  onSelected: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ConsultationCard({
  consultation,
  onSelected,
  onDelete,
}: ConsultationCardProps) {
  const coverImage = (consultation as { cover_image?: string }).cover_image || '';
  const summary = (consultation as { summary?: string }).summary || '';

  return (
    <article className={surfaceClass({ className: 'relative flex h-full flex-col overflow-hidden' })}>
      <AdminDeleteButton
        tableName="consultations"
        itemId={consultation.id}
        onDeleted={onDelete}
      />

      {coverImage ? (
        <img
          src={coverImage}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full bg-canvas-sunken object-cover"
        />
      ) : (
        <div
          className="grid aspect-[16/9] w-full place-items-center bg-canvas-sunken text-ink-quaternary"
          aria-hidden="true"
        >
          <Icon name="ballot" size={26} />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <h3 className="k-title-3 text-balance">{consultation.title}</h3>

        {summary ? <p className="k-subhead k-ink-secondary mt-2 line-clamp-3">{summary}</p> : null}

        {consultation.question ? (
          <p className="k-footnote k-ink-tertiary mt-3 line-clamp-2">{consultation.question}</p>
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
