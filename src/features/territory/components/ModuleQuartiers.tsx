import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { getEngagementParQuartier } from '@/api/charts';
import { Section } from '@/components/ui/Page';
import { CHART_COLORS, baseChartOptions } from '@/design/chartTheme';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const DATASET_LABEL = 'Participants aux consultations';

export default function ModuleQuartiers() {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: DATASET_LABEL,
        backgroundColor: CHART_COLORS.accent,
        borderRadius: 6,
        data: [] as number[],
      },
    ],
  });

  useEffect(() => {
    async function fetchData() {
      const data = await getEngagementParQuartier();
      if (data.length > 0) {
        const top3 = data.slice(0, 3);
        setChartData({
          labels: top3.map((d) => d.quartier_nom),
          datasets: [
            {
              label: DATASET_LABEL,
              backgroundColor: CHART_COLORS.accent,
              borderRadius: 6,
              data: top3.map((d) => d.total_participants),
            },
          ],
        });
      }
    }
    void fetchData();
  }, []);

  return (
    <Section title="Thermomètre des quartiers" description="Les trois quartiers les plus engagés.">
      <div className="rounded-lg border border-separator bg-surface p-5">
        {chartData.labels.length > 0 ? (
          <div className="relative h-64">
            <Bar data={chartData} options={baseChartOptions} />
          </div>
        ) : (
          <p className="k-subhead k-ink-tertiary py-10 text-center">
            Pas encore assez de participations pour établir un classement.
          </p>
        )}
      </div>
    </Section>
  );
}
