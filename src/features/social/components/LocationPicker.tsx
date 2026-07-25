import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import {
  debounce,
  reverseGeocode,
  searchLocations,
  type NominatimSearchResult,
} from '@/lib/nominatim';

export interface LocationValue {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  quartierLat?: number | null;
  quartierLng?: number | null;
  variant?: 'blue' | 'gray';
  location: LocationValue | null;
  automaticAddress: string;
  manualPrecision: string;
  onLocationChange: (location: LocationValue | null) => void;
  onAutomaticAddressChange: (address: string) => void;
  onManualPrecisionChange: (value: string) => void;
  compact?: boolean;
}

const SAINT_DENIS_CENTER: [number, number] = [-20.878, 55.448];

function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapMoveHandler({ onMoveEnd }: { onMoveEnd: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend: (event) => {
      const mapCenter = event.target.getCenter();
      onMoveEnd(mapCenter.lat, mapCenter.lng);
    },
  });
  return null;
}

/**
 * Le viseur reste immobile pendant que la carte glisse dessous : c'est la carte
 * qu'on déplace, pas un marqueur qu'on pose. Une seule teinte — l'accent — quel
 * que soit le contexte d'appel.
 */
function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center">
      <div className="relative text-accent">
        <div className="h-8 w-8 rounded-full border-2 border-current bg-accent-soft" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
        <div className="absolute left-full top-1/2 h-0.5 w-2 -translate-y-1/2 bg-current" />
        <div className="absolute right-full top-1/2 h-0.5 w-2 -translate-y-1/2 bg-current" />
        <div className="absolute left-1/2 top-full h-2 w-0.5 -translate-x-1/2 bg-current" />
        <div className="absolute bottom-full left-1/2 h-2 w-0.5 -translate-x-1/2 bg-current" />
      </div>
    </div>
  );
}

export default function LocationPicker({
  quartierLat,
  quartierLng,
  variant = 'blue',
  location,
  automaticAddress,
  manualPrecision,
  onLocationChange,
  onAutomaticAddressChange,
  onManualPrecisionChange,
  compact = false,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [center, setCenter] = useState<[number, number]>(() => {
    if (quartierLat != null && quartierLng != null) {
      return [quartierLat, quartierLng];
    }
    return SAINT_DENIS_CENTER;
  });

  const debouncedReverseRef = useRef(
    debounce(async (lat: number, lng: number) => {
      try {
        const address = await reverseGeocode(lat, lng);
        onAutomaticAddressChange(address);
      } catch {
        onAutomaticAddressChange('Adresse introuvable');
      }
    }, 800),
  );

  useEffect(() => {
    if (quartierLat != null && quartierLng != null) {
      setCenter([quartierLat, quartierLng]);
    }
  }, [quartierLat, quartierLng]);

  const handleMapMoveEnd = useCallback(
    (lat: number, lng: number) => {
      onLocationChange({ lat, lng });
      debouncedReverseRef.current(lat, lng);
    },
    [onLocationChange],
  );

  async function handleSearch() {
    if (searchQuery.length < 3) return;
    setSearchError('');
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('La recherche de lieu est indisponible. Déplacez la carte pour viser.');
    }
  }

  function selectSearchResult(result: NominatimSearchResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCenter([lat, lng]);
    onLocationChange({ lat, lng });
    setSearchResults([]);
    setSearchQuery('');
    onAutomaticAddressChange(result.display_name.split(',')[0] ?? '');
  }

  const mapKey = useMemo(() => `${center[0]}-${center[1]}`, [center]);

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'mb-3 flex flex-col gap-2'}>
      <div className="relative flex gap-2">
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleSearch();
            }
          }}
          placeholder="Rechercher un lieu (ex : Église du Chaudron)"
          aria-label="Rechercher un lieu"
          className="min-w-0 flex-1"
        />
        <Button
          variant="secondary"
          iconOnly
          onClick={() => void handleSearch()}
          aria-label="Rechercher ce lieu"
        >
          <Icon name="search" size={18} />
        </Button>

        {searchResults.length > 0 ? (
          <ul className="k-card k-card--raised k-list absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto p-1">
            {searchResults.map((result) => (
              <li key={result.place_id}>
                <button
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="k-press k-footnote k-ink-secondary w-full rounded-sm px-3 py-2.5 text-left hover:bg-surface-secondary"
                >
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {searchError ? <p className="k-footnote text-danger">{searchError}</p> : null}

      <div className="relative z-0 h-48 overflow-hidden rounded-md border border-separator">
        <MapContainer
          key={mapKey}
          center={center}
          zoom={15}
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapCenterUpdater center={center} />
          <MapMoveHandler onMoveEnd={handleMapMoveEnd} />
        </MapContainer>
        <Crosshair />
      </div>

      <div className="rounded-md bg-surface-secondary p-3">
        <div className="mb-2 flex items-start gap-2">
          <Icon name="mapPin" size={17} className="mt-0.5 text-accent" />
          <div className="min-w-0">
            <p className="k-eyebrow">Secteur détecté</p>
            <p className="k-subhead k-ink mt-0.5">
              {automaticAddress || 'Déplacez la carte pour viser un point.'}
            </p>
          </div>
        </div>

        <Input
          value={manualPrecision}
          onChange={(event) => onManualPrecisionChange(event.target.value)}
          aria-label="Précision de la localisation"
          placeholder={
            variant === 'blue'
              ? 'Précision (ex : face au stade, à côté de la boulangerie)'
              : 'Précision (ex : devant le n°42, près du panneau)'
          }
        />

        {location ? (
          <p className="k-visually-hidden">
            Point sélectionné : {location.lat}, {location.lng}
          </p>
        ) : null}
      </div>
    </div>
  );
}
