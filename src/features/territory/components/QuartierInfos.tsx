import type { Quartier } from '@/lib/types/contract';

interface QuartierInfosProps {
  quartier: Quartier;
  onBack: () => void;
}

export default function QuartierInfos({ quartier, onBack }: QuartierInfosProps) {
  const sections = [
    { emoji: '💪', title: 'Les grands défis', html: quartier.enjeux as string },
    { emoji: '👀', title: 'Actions et Projets structurants', html: quartier.problematiques as string },
    { emoji: '✨', title: 'Ce qui le rend unique', html: quartier.particularites as string },
    { emoji: '🚀', title: 'Les atouts pour demain', html: quartier.opportunites as string },
  ];

  return (
    <div className="desktop-glass-card p-6 md:p-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-2 bg-white/30 text-slate-800 font-semibold py-2 px-5 rounded-full transition-all hover:bg-white/50 hover:scale-105 shadow backdrop-blur-sm"
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
        Retour au quartier
      </button>

      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-3">
          {quartier.name}
        </h1>
        <p className="text-xl text-slate-700 font-light">
          Informations détaillées sur le quartier
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {sections.map((section, index) => (
          <div
            key={section.title}
            className="desktop-glass-card p-6 animate-fade-in-up"
            style={{ animationDelay: `${(index + 1) * 0.1}s` }}
          >
            <h3 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
              <span className="text-3xl">{section.emoji}</span>
              {section.title}
            </h3>
            <div
              className="prose prose-sm max-w-none text-slate-700 quartier-prose"
              dangerouslySetInnerHTML={{ __html: section.html || '' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
