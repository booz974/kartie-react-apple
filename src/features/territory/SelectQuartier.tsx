import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listQuartiers } from '@/api/profiles';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Notice from '@/components/ui/Notice';
import { Input } from '@/components/ui/Field';
import Spinner from '@/components/ui/Spinner';

interface SelectQuartierProps {
  onQuartierSaved: (quartierId: number) => void;
  /** Absent tant qu'aucun quartier n'est choisi : le choix conditionne la suite. */
  onClose?: () => void;
}

export default function SelectQuartier({ onQuartierSaved, onClose }: SelectQuartierProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: allQuartiers = [], isError, isLoading } = useQuery({
    queryKey: ['quartiers'],
    queryFn: listQuartiers,
  });

  // Vingt quartiers tiennent dans une liste, mais un filtre évite de la
  // parcourir entièrement quand on sait déjà ce qu'on cherche.
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allQuartiers;
    return allQuartiers.filter((quartier) => quartier.name.toLowerCase().includes(needle));
  }, [allQuartiers, search]);

  return (
    <Modal
      onClose={onClose ?? (() => {})}
      dismissible={Boolean(onClose)}
      hideCloseButton={!onClose}
      title="📍 Quel est votre quartier ?"
      description="Il détermine le fil, les associations et les consultations qui vous sont proposés. Vous pourrez en changer à tout moment."
      bodyClassName="pb-0"
      footer={
        <Button
          variant="primary"
          size="lg"
          disabled={selectedId === null}
          onClick={() => selectedId !== null && onQuartierSaved(selectedId)}
        >
          Continuer
        </Button>
      }
    >
      <Input
        type="search"
        placeholder="Rechercher un quartier"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Rechercher un quartier"
        className="mb-3"
      />

      {isError ? (
        <Notice tone="danger">
          Impossible de charger la liste des quartiers. Vérifiez votre connexion et réessayez.
        </Notice>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} className="k-ink-tertiary" label="Chargement des quartiers" />
        </div>
      ) : null}

      <div role="radiogroup" aria-label="Quartiers" className="k-list -mx-1 max-h-72 overflow-y-auto">
        {filtered.map((quartier) => {
          const selected = selectedId === quartier.id;
          return (
            <button
              key={quartier.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedId(quartier.id)}
              className="k-press flex w-full items-center gap-3 px-1 py-3 text-left"
            >
              <span className={`k-body flex-1 ${selected ? 'font-semibold text-accent-ink' : 'k-ink'}`}>
                {quartier.name}
              </span>
              {selected ? <Icon name="check" size={18} className="text-accent-ink" /> : null}
            </button>
          );
        })}

        {!isLoading && filtered.length === 0 ? (
          <p className="k-subhead k-ink-tertiary py-8 text-center">
            Aucun quartier ne correspond à « {search} ».
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
