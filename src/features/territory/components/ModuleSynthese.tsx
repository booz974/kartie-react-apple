import { useEffect, useState } from 'react';
import { getInteractionsSemaine, getSondageChaudSemaine } from '@/api/charts';
import type { SondageChaud } from '@/api/charts';

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
    <section>
      <h2 className="text-2xl font-semibold mb-4">Synthèse de la semaine</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Volume d&apos;interactions</p>
          <p className="text-3xl font-bold">{interactions}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-gray-600">Sondage &quot;chaud&quot;</p>
          <p className="text-xl font-bold">{sondageChaud?.title || 'N/A'}</p>
          <p>{sondageChaud?.vote_count} votes</p>
        </div>
      </div>
    </section>
  );
}
