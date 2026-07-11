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

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default function ModuleQuartiers() {
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'Participants aux consultations',
        backgroundColor: '#4A90E2',
        data: [] as number[],
      },
    ],
  });

  const chartOptions = { responsive: true };

  useEffect(() => {
    async function fetchData() {
      const data = await getEngagementParQuartier();
      if (data.length > 0) {
        const top3 = data.slice(0, 3);
        setChartData({
          labels: top3.map((d) => d.quartier_nom),
          datasets: [
            {
              label: 'Participants aux consultations',
              backgroundColor: '#4A90E2',
              data: top3.map((d) => d.total_participants),
            },
          ],
        });
      }
    }
    void fetchData();
  }, []);

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Thermomètre des Quartiers</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-bold mb-2">Top 3 de l&apos;Engagement</h3>
        <Bar data={chartData} options={chartOptions} />
      </div>
    </section>
  );
}
