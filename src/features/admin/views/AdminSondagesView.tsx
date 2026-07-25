import {
  calculateSondagePercentage,
  totalSondageVotes,
} from '@/api/democracy';
import Badge from '@/components/ui/Badge';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Progress from '@/components/ui/Progress';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminSondages } from '@/queries/democracy';
import type { SondageAdminItem } from '@/lib/types/contract';

/** Repères des options, communs à toute la plateforme. */
const OPTION_MARKERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

/** Teintes des barres de résultat : trois séries suffisent à distinguer. */
const RESULT_TONES = ['accent', 'warm', 'success'] as const;

function SondageResults({ sondage }: { sondage: SondageAdminItem }) {
  const total = totalSondageVotes(sondage);
  const options = Array.isArray(sondage.options) ? sondage.options : [];

  return (
    <div className="mt-4 border-t border-separator pt-4">
      {sondage.description ? (
        <p className="k-subhead k-ink-secondary k-measure mb-4">{sondage.description}</p>
      ) : null}

      <div className="flex flex-col gap-4">
        {options.map((option, index) => {
          const percentage = calculateSondagePercentage(option.votes, total);
          return (
            <div key={option.text}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="k-subhead font-medium">
                  <span aria-hidden="true" className="mr-1.5">
                    {OPTION_MARKERS[index % OPTION_MARKERS.length]}
                  </span>
                  {option.text}
                </span>
                <span className="k-footnote shrink-0 font-semibold text-accent-ink tabular-nums">
                  {option.votes} vote{option.votes > 1 ? 's' : ''} · {percentage}%
                </span>
              </div>
              <Progress
                value={percentage}
                tone={RESULT_TONES[index % RESULT_TONES.length]}
                label={`${option.text} : ${percentage}%`}
              />
            </div>
          );
        })}

        {options.length === 0 ? (
          <p className="k-footnote k-ink-tertiary">Aucune option enregistrée.</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminSondagesView() {
  const { data: sondagesData = [], isLoading } = useAdminSondages();

  return (
    <Page className="pt-8">
      <PageHeader
        back={{ to: '/admin', label: 'Administration' }}
        eyebrow="🗳️ Administration"
        title="Résultats des sondages"
        description="Les consultations citoyennes en cours et closes, regroupées par quartier."
      />

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="k-card flex items-center gap-4 p-4">
              <Skeleton width="2.75rem" height="2.75rem" radius="var(--k-radius-full)" />
              <Skeleton width="45%" height="1.125rem" />
            </div>
          ))}
        </div>
      ) : sondagesData.length === 0 ? (
        <div className="k-card k-empty">
          <span className="text-5xl leading-none" aria-hidden="true">
            🗳️
          </span>
          <p className="k-title-3">Aucun sondage pour le moment</p>
          <p className="k-subhead k-ink-secondary k-measure">
            Les résultats apparaîtront ici dès qu’une consultation aura été publiée dans un
            quartier.
          </p>
        </div>
      ) : (
        sondagesData.map((quartier) => (
          <Section
            key={quartier.quartier_nom}
            title={
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true">📍</span>
                {quartier.quartier_nom}
              </span>
            }
          >
            <div className="flex flex-col gap-3">
              {(quartier.sondages ?? []).map((sondage) => (
                // Le repli garde la page dense : on ouvre un sondage à la fois,
                // sans quitter la liste ni empiler une carte par ligne.
                <details key={sondage.id} className="k-card group p-4">
                  <summary className="k-press flex cursor-pointer list-none items-center gap-3">
                    <Chip tone="consult" size={40}>
                      🗳️
                    </Chip>
                    <span className="k-callout min-w-0 flex-1 font-semibold">{sondage.title}</span>
                    <Badge tone="consult" emoji="🙋">
                      {totalSondageVotes(sondage)} vote
                      {totalSondageVotes(sondage) > 1 ? 's' : ''}
                    </Badge>
                    <Icon
                      name="chevronRight"
                      size={18}
                      className="k-ink-quaternary shrink-0 transition-transform group-open:rotate-90"
                    />
                  </summary>
                  <SondageResults sondage={sondage} />
                </details>
              ))}

              {(quartier.sondages ?? []).length === 0 ? (
                <p className="k-subhead k-ink-tertiary k-card k-card--flat p-4">
                  Aucun sondage dans ce quartier.
                </p>
              ) : null}
            </div>
          </Section>
        ))
      )}
    </Page>
  );
}
