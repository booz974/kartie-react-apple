import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { getEvolutionThematique, getTopThematiques } from '@/api/charts';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

export default function ModuleThematiques() {
  const [topThemes, setTopThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [topThemesChartData, setTopThemesChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'Nombre de propositions',
        backgroundColor: '#f87979',
        data: [] as number[],
      },
    ],
  });
  const [evolutionChartData, setEvolutionChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'Nombre de mentions',
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        fill: true,
        data: [] as number[],
      },
    ],
  });
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [isLoadingEvol, setIsLoadingEvol] = useState(false);

  useEffect(() => {
    async function fetchTopThemes() {
      setIsLoadingTop(true);
      try {
        const data = await getTopThematiques();

        if (data.length > 0) {
          setTopThemes(data.map((d) => d.thematique));
          setTopThemesChartData({
            labels: data.map((d) => `#${d.thematique}`),
            datasets: [
              {
                label: 'Nombre de propositions',
                backgroundColor: '#f87979',
                data: data.map((d) => d.total),
              },
            ],
          });
        }
      } catch (err) {
        console.error('Erreur get_top_thematiques:', err);
      } finally {
        setIsLoadingTop(false);
      }
    }
    void fetchTopThemes();
  }, []);

  useEffect(() => {
    if (!selectedTheme) return;

    async function fetchThemeEvolution() {
      setIsLoadingEvol(true);
      setEvolutionChartData({
        labels: [],
        datasets: [
          {
            label: 'Nombre de mentions',
            borderColor: '#4A90E2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            fill: true,
            data: [],
          },
        ],
      });

      try {
        const data = await getEvolutionThematique(selectedTheme);

        if (data.length > 0) {
          setEvolutionChartData({
            labels: data.map((d) => d.mois),
            datasets: [
              {
                label: 'Nombre de mentions',
                borderColor: '#4A90E2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true,
                data: data.map((d) => d.total),
              },
            ],
          });
        }
      } catch (err) {
        console.error('Erreur get_evolution_thematique:', err);
      } finally {
        setIsLoadingEvol(false);
      }
    }

    void fetchThemeEvolution();
  }, [selectedTheme]);

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Baromètre des Thématiques</h2>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold mb-4 text-lg">Top 5 des thématiques</h3>
        <div className="relative h-96">
          {!isLoadingTop && topThemesChartData.labels.length > 0 ? (
            <Bar data={topThemesChartData} options={chartOptions} />
          ) : isLoadingTop ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Chargement des données...
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Aucune donnée disponible.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-bold mb-4 text-lg">Analyse détaillée par thématique</h3>

        <div className="mb-6 max-w-sm">
          <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700">
            Choisir une thématique à analyser :
          </label>
          <select
            id="theme-select"
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option disabled value="">
              -- Sélectionnez --
            </option>
            {topThemes.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        {selectedTheme ? (
          <div className="mt-4">
            <div>
              <h4 className="font-semibold mb-2">
                Évolution de la thématique &quot;#{selectedTheme}&quot;
              </h4>
              <div className="relative h-96">
                {!isLoadingEvol && evolutionChartData.labels.length > 0 ? (
                  <Line data={evolutionChartData} options={chartOptions} />
                ) : isLoadingEvol ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Chargement...
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Aucune donnée pour cette thématique.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
