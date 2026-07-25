import { useEffect, useState } from 'react';
import { getInteractionsSemaine, getSondageChaudSemaine } from '@/api/charts';
import type { SondageChaud } from '@/api/charts';
import { Section } from '@/components/ui/Page';

export default function ModuleSynthese() {
  const [interactions, setInteractions] = useState(0);
  const [sondageChaud, setSondageChaud] = useState<SondageChaud | null>(null);

  useEffect(() => {
    async function fetchData() {
      const interactionData = await getInteractionsSemaine();
      setInteractions(interactionData);

      const sondageData = await getSondageChaudSemaine();
      if (sondageData) {
        setSondageChaud(sondageData);
      }
    }
    void fetchData();
  }, []);

  return (
    <Section title="Synthèse de la semaine">
      <dl className="k-hairline-top k-hairline-bottom grid gap-x-8 gap-y-6 py-6 sm:grid-cols-2">
        <div className="flex flex-col-reverse gap-1">
          <dt className="k-caption k-ink-tertiary">Volume d’interactions</dt>
          <dd className="k-title-1 tabular-nums">{interactions}</dd>
        </div>

        <div className="flex flex-col-reverse gap-1">
          <dt className="k-caption k-ink-tertiary">
            Consultation la plus active
            {sondageChaud ? ` · ${sondageChaud.vote_count} votes` : ''}
          </dt>
          <dd className="k-title-3 text-balance">
            {sondageChaud?.title || 'Aucune cette semaine'}
          </dd>
        </div>
      </dl>
    </Section>
  );
}
