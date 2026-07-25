import { useMemo, useState } from 'react';
import QuartierCard from '@/features/territory/components/QuartierCard';
import EmptyState from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader } from '@/components/ui/Page';
import Segmented from '@/components/ui/Segmented';
import { useQuartierZones } from '@/queries/territory';

/**
 * Les quatre secteurs de la commune. Les libellés viennent du produit ; l'ordre
 * suit la géographie, de l'est vers l'ouest.
 */
const ZONES = [
  { id: 'est-data', label: "Quartiers de l'Est", short: 'Est' },
  { id: 'centre-data', label: 'Centre & Mi-Pentes', short: 'Centre' },
  { id: 'hauteurs-data', label: 'Hauteurs & Périphérie', short: 'Hauteurs' },
  { id: 'ouest-data', label: 'Ouest & Littoral', short: 'Ouest' },
] as const;

type ZoneId = (typeof ZONES)[number]['id'] | 'all';

export default function QuartiersView() {
  const [zone, setZone] = useState<ZoneId>('all');
  const [search, setSearch] = useState('');

  const { data: quartierZones = {}, isLoading, isError } = useQuartierZones();

  const visible = useMemo(() => {
    const source =
      zone === 'all'
        ? ZONES.flatMap((entry) => quartierZones[entry.id] ?? [])
        : (quartierZones[zone] ?? []);

    const needle = search.trim().toLowerCase();
    if (!needle) return source;

    return source.filter(
      (quartier) =>
        quartier.name.toLowerCase().includes(needle) ||
        (quartier.catchphrase ?? '').toLowerCase().includes(needle),
    );
  }, [quartierZones, zone, search]);

  const total = useMemo(
    () => ZONES.reduce((sum, entry) => sum + (quartierZones[entry.id]?.length ?? 0), 0),
    [quartierZones],
  );

  const options = useMemo(
    () => [
      { value: 'all' as const, label: 'Tous' },
      ...ZONES.map((entry) => ({
        value: entry.id,
        label: entry.short,
        count: quartierZones[entry.id]?.length,
      })),
    ],
    [quartierZones],
  );

  return (
    <Page>
      <PageHeader
        className="pt-10 md:pt-14"
        eyebrow="🗺️ Territoires"
        title="Les quartiers de Saint-Denis"
        description={
          total > 0
            ? `${total} quartiers, du littoral aux Hauteurs. Choisissez le vôtre pour suivre son actualité, ses associations et ses consultations.`
            : 'Du littoral aux Hauteurs, chaque quartier a son actualité, ses associations et ses consultations.'
        }
      />

      <div className="flex flex-col gap-4 pb-8 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Filtrer par secteur"
          value={zone}
          onChange={setZone}
          options={options}
          className="max-w-full"
        />

        <div className="relative md:w-72">
          <Icon
            name="search"
            size={17}
            className="k-ink-tertiary pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un quartier"
            aria-label="Rechercher un quartier"
            className="pl-10"
          />
        </div>
      </div>

      {isError ? (
        <Notice tone="danger">
          Les quartiers n’ont pas pu être chargés. Vérifiez votre connexion, puis rechargez la page.
        </Notice>
      ) : null}

      {isLoading ? (
        <div className="k-grid">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="k-skeleton aspect-[4/3] rounded-lg" aria-hidden="true" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="k-grid">
          {visible.map((quartier) => (
            <QuartierCard key={quartier.id} quartier={quartier} />
          ))}
        </div>
      ) : !isError ? (
        <EmptyState
          icon="search"
          title="Aucun quartier ne correspond"
          description={
            search.trim()
              ? `Rien ne correspond à « ${search.trim()} ». Essayez un autre nom, ou élargissez à tous les secteurs.`
              : 'Ce secteur ne contient aucun quartier pour le moment.'
          }
        />
      ) : null}
    </Page>
  );
}
