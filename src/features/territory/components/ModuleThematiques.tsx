import { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { getEvolutionThematique, getTopThematiques } from '@/api/charts';
import Field, { Select } from '@/components/ui/Field';
import { Section } from '@/components/ui/Page';
import Spinner from '@/components/ui/Spinner';
import { CHART_COLORS, baseChartOptions } from '@/design/chartTheme';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
);

const TOP_LABEL = 'Nombre de propositions';
const EVOLUTION_LABEL = 'Nombre de mentions';

function emptyEvolution() {
  return {
    labels: [] as string[],
    datasets: [
      {
        label: EVOLUTION_LABEL,
        borderColor: CHART_COLORS.accent,
        backgroundColor: CHART_COLORS.accentSoft,
        pointBackgroundColor: CHART_COLORS.accent,
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        data: [] as number[],
      },
    ],
  };
}

/** Cadre commun aux deux graphiques : un conteneur, une hauteur, trois états. */
function ChartFrame({
  loading,
  hasData,
  emptyLabel,
  children,
}: {
  loading: boolean;
  hasData: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-72">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner size={22} className="k-ink-tertiary" label="Chargement du graphique" />
        </div>
      ) : hasData ? (
        children
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="k-subhead k-ink-tertiary">{emptyLabel}</p>
        </div>
      )}
    </div>
  );
}

export default function ModuleThematiques() {
  const [topThemes, setTopThemes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('');
  const [topThemesChartData, setTopThemesChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: TOP_LABEL,
        backgroundColor: CHART_COLORS.warm,
        borderRadius: 6,
        data: [] as number[],
      },
    ],
  });
  const [evolutionChartData, setEvolutionChartData] = useState(emptyEvolution);
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
                label: TOP_LABEL,
                backgroundColor: CHART_COLORS.warm,
                borderRadius: 6,
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
      setEvolutionChartData(emptyEvolution());

      try {
        const data = await getEvolutionThematique(selectedTheme);

        if (data.length > 0) {
          setEvolutionChartData({
            ...emptyEvolution(),
            labels: data.map((d) => d.mois),
            datasets: [
              {
                ...emptyEvolution().datasets[0],
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
    <Section
      title="Baromètre des thématiques"
      description="Ce dont les habitants parlent le plus, et comment cela évolue."
    >
      <div className="flex flex-col gap-8">
        <div className="rounded-lg border border-separator bg-surface p-5">
          <h3 className="k-title-3 mb-4">Top 5 des thématiques</h3>
          <ChartFrame
            loading={isLoadingTop}
            hasData={topThemesChartData.labels.length > 0}
            emptyLabel="Aucune thématique remontée pour l’instant."
          >
            <Bar data={topThemesChartData} options={baseChartOptions} />
          </ChartFrame>
        </div>

        <div className="rounded-lg border border-separator bg-surface p-5">
          <h3 className="k-title-3 mb-4">Analyse détaillée</h3>

          <Field label="Thématique à analyser" className="mb-6 max-w-sm">
            {(props) => (
              <Select
                {...props}
                value={selectedTheme}
                onChange={(event) => setSelectedTheme(event.target.value)}
              >
                <option disabled value="">
                  Sélectionnez une thématique
                </option>
                {topThemes.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {selectedTheme ? (
            <div>
              <h4 className="k-subhead mb-3 font-semibold">
                Évolution de « #{selectedTheme} »
              </h4>
              <ChartFrame
                loading={isLoadingEvol}
                hasData={evolutionChartData.labels.length > 0}
                emptyLabel="Aucune donnée pour cette thématique."
              >
                <Line data={evolutionChartData} options={baseChartOptions} />
              </ChartFrame>
            </div>
          ) : (
            <p className="k-subhead k-ink-tertiary">
              Choisissez une thématique pour voir son évolution mois par mois.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}
