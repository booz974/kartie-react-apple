import type { ReactNode } from 'react';
import type { Association } from '@/lib/types/contract';

interface AssociationHeaderProps {
  association: Association;
  actions?: ReactNode;
}

export default function AssociationHeader({ association, actions }: AssociationHeaderProps) {
  const coverStyle = association.cover_url
    ? {
        backgroundImage: `url('${association.cover_url as string}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <section className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
      <div
        className="relative h-48 bg-gradient-to-br from-blue-700 via-sky-500 to-emerald-500 md:h-64"
        style={coverStyle}
      >
        <div className="absolute inset-0 bg-slate-900/30" />
      </div>

      <div className="relative px-6 pb-6 pt-0 md:px-8">
        <div className="-mt-14 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            {association.logo_url ? (
              <img
                src={association.logo_url as string}
                alt={association.name}
                className="h-24 w-24 rounded-[1.75rem] border-4 border-white bg-white object-cover shadow-xl md:h-28 md:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border-4 border-white bg-white text-4xl shadow-xl md:h-28 md:w-28">
                🤝
              </div>
            )}

            <div className="pb-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {association.category_label}
                </span>
                <span
                  className={[
                    'rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
                    association.is_publicly_visible
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}
                >
                  {association.status_label}
                </span>
                {association.is_verified ? (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                    Vérifiée
                  </span>
                ) : null}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                {association.name}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-600 md:text-base">
                {association.short_description as string}
              </p>
            </div>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </div>
    </section>
  );
}
