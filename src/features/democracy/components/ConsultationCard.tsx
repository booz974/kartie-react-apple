import AdminDeleteButton from '@/components/ui/AdminDeleteButton';
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
    <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
      <AdminDeleteButton
        tableName="consultations"
        itemId={consultation.id}
        onDeleted={onDelete}
      />
      <img src={coverImage} alt={consultation.title ?? ''} className="w-full h-40 object-cover" />
      <div className="p-6 flex flex-col flex-grow">
        <h4 className="font-bold text-lg text-gray-800 mb-2">{consultation.title}</h4>
        <p className="text-sm text-gray-700 flex-grow mb-4">{summary}</p>
        <button
          type="button"
          onClick={() => onSelected(consultation.id)}
          className="mt-auto w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
        >
          Répondre au sondage
        </button>
      </div>
    </div>
  );
}
