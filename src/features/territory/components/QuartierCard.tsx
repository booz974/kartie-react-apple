import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { getStorageUrl } from '@/utils/imageUtils';

interface QuartierCardQuartier {
  id: number;
  name: string;
  catchphrase?: string | null;
  image_filename?: string | null;
}

interface QuartierCardProps {
  quartier: QuartierCardQuartier;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80';

export default function QuartierCard({ quartier }: QuartierCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketUrl = `${supabaseUrl}/storage/v1/object/public/quartiers_images`;

  const imageUrl = useMemo(() => {
    if (quartier.image_filename) {
      const filename = quartier.image_filename.trim();
      return getStorageUrl(bucketUrl, filename) ?? FALLBACK_IMAGE;
    }
    return FALLBACK_IMAGE;
  }, [bucketUrl, quartier.image_filename]);

  const displayTitle = quartier.name;
  const displayDescription =
    quartier.catchphrase || 'Découvrez ce quartier emblématique de Saint-Denis.';

  function navigateToQuartier() {
    navigate(`/quartiers/${quartier.id}`);
  }

  return (
    <div
      className="quartier-card group relative overflow-hidden rounded-[2.5rem] w-full aspect-[4/3] cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
      onClick={navigateToQuartier}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigateToQuartier();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt={displayTitle}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center transition-transform duration-700 ease-in-out group-hover:scale-110">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-400 opacity-50"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

      <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-10 text-white">
        <h3 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-md translate-y-8 group-hover:translate-y-0 transition-transform duration-500 ease-out">
          {displayTitle}
        </h3>

        <div className="overflow-hidden max-h-0 opacity-0 group-hover:max-h-40 group-hover:opacity-100 transition-all duration-500 ease-out delay-75">
          <p className="text-sm md:text-base text-gray-200 font-light leading-relaxed mb-4">
            {displayDescription}
          </p>
        </div>

        <div className="mt-2 transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500 delay-100 flex items-center gap-2">
          <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-white/30 transition-colors">
            Découvrir
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
