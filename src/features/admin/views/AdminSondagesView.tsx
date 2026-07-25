import {
  calculateSondagePercentage,
  totalSondageVotes,
} from '@/api/democracy';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Progress from '@/components/ui/Progress';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminSondages } from '@/queries/democracy';
import type { SondageAdminItem } from '@/lib/types/contract';

function SondageResults({ sondage }: { sondage: SondageAdminItem }) {
  const total = totalSondageVotes(sondage);
  const options = Array.isArray(sondage.options) ? sondage.options : [];

  return (
    <div className="mt-4 border-t border-separator pt-4">
      {sondage.description ? (
        <p className="k-subhead k-ink-secondary k-measure mb-4">{sondage.description}</p>
      ) : null}

      <div className="flex flex-col gap-4">
        {options.map((option) => {
          const percentage = calculateSondagePercentage(option.votes, total);
          return (
            <div key={option.text}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="k-subhead">{option.text}</span>
                <span className="k-footnote k-ink-secondary shrink-0 tabular-nums">
                  {option.votes} vote(s) · {percentage}%
                </span>
              </div>
              <Progress value={percentage} label={`${option.text} : ${percentage}%`} />
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
        eyebrow="Administration"
        title="Résultats des sondages"
        description="Les consultations citoyennes en cours et closes, regroupées par quartier."
      />

      {isLoading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="border-t border-separator py-4">
              <Skeleton width="45%" height="1.125rem" />
            </div>
          ))}
        </div>
      ) : sondagesData.length === 0 ? (
        <EmptyState
          icon="ballot"
          title="Aucun sondage pour le moment"
          description="Les résultats apparaîtront ici dès qu’une consultation aura été publiée dans un quartier."
        />
      ) : (
        sondagesData.map((quartier) => (
          <Section key={quartier.quartier_nom} title={quartier.quartier_nom}>
            <div className="k-list border-t border-separator">
              {(quartier.sondages ?? []).map((sondage) => (
                // Le repli garde la page dense : on ouvre un sondage à la fois,
                // sans quitter la liste ni empiler une carte par ligne.
                <details key={sondage.id} className="group py-3">
                  <summary className="k-press flex cursor-pointer list-none items-center gap-3">
                    <Icon
                      name="chevronRight"
                      size={16}
                      className="k-ink-tertiary transition-transform group-open:rotate-90"
                    />
                    <span className="k-callout min-w-0 flex-1 font-medium">{sondage.title}</span>
                    <span className="k-footnote k-ink-tertiary shrink-0 tabular-nums">
                      {totalSondageVotes(sondage)} vote(s)
                    </span>
                  </summary>
                  <SondageResults sondage={sondage} />
                </details>
              ))}

              {(quartier.sondages ?? []).length === 0 ? (
                <p className="k-subhead k-ink-tertiary py-4">
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
