import type { Circle } from '@/lib/types/contract';

interface CircleListProps {
  circles: Circle[];
  onCreateCircle?: () => void;
  onJoinCircle?: (circle: Circle) => void;
  onOpenCircle?: (circle: Circle) => void;
}

export default function CircleList({
  circles,
  onCreateCircle,
  onJoinCircle,
  onOpenCircle,
}: CircleListProps) {
  function handleClick(circle: Circle) {
    if (circle.is_member) {
      onOpenCircle?.(circle);
    } else if (window.confirm(`Voulez-vous rejoindre le cercle "${circle.name}" ?`)) {
      onJoinCircle?.(circle);
    }
  }

  if (circles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="mb-4">Aucun cercle dans ce quartier pour le moment.</p>
          <button
            type="button"
            onClick={() => onCreateCircle?.()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Créer le premier cercle !
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {circles.map((circle) => (
          <div
            key={circle.id}
            onClick={() => handleClick(circle)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleClick(circle);
            }}
            role="button"
            tabIndex={0}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-2">
              <span
                className={`text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide ${
                  circle.type === 'public'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {String(circle.type)}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {circle.name}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{String(circle.description ?? '')}</p>

            <div className="flex items-center justify-between mt-4 border-t pt-3">
              <div className="flex items-center text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded-md">
                  {circle.member_count !== undefined ? circle.member_count : '?'} membres
                </span>
              </div>

              {!circle.is_member ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoinCircle?.(circle);
                  }}
                  className="text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
                >
                  Rejoindre
                </button>
              ) : (
                <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                  Membre ✓
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
