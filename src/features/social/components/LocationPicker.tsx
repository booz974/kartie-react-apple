import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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

function Crosshair({ variant }: { variant: 'blue' | 'gray' }) {
  const ring = variant === 'blue' ? 'border-blue-600 bg-blue-500/10' : 'border-gray-600 bg-gray-500/10';
  const dot = variant === 'blue' ? 'bg-blue-600' : 'bg-gray-600';
  const line = variant === 'blue' ? 'bg-blue-600' : 'bg-gray-600';

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1000]">
      <div className="relative">
        <div className={`w-8 h-8 border-2 rounded-full shadow-sm ${ring}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full ${dot}`} />
        <div className={`absolute top-1/2 left-full w-2 h-0.5 -translate-y-1/2 ${line}`} />
        <div className={`absolute top-1/2 right-full w-2 h-0.5 -translate-y-1/2 ${line}`} />
        <div className={`absolute left-1/2 top-full h-2 w-0.5 -translate-x-1/2 ${line}`} />
        <div className={`absolute left-1/2 bottom-full h-2 w-0.5 -translate-x-1/2 ${line}`} />
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

  const borderClass = variant === 'blue' ? 'border-blue-200' : 'border-gray-300';
  const searchBtnClass = variant === 'blue' ? 'bg-blue-600' : 'bg-gray-600';
  const addressBoxClass =
    variant === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-700';
  const addressInputBorder = variant === 'blue' ? 'border-blue-200' : 'border-gray-300';

  const handleMapMoveEnd = useCallback(
    (lat: number, lng: number) => {
      onLocationChange({ lat, lng });
      debouncedReverseRef.current(lat, lng);
    },
    [onLocationChange],
  );

  async function handleSearch() {
    if (searchQuery.length < 3) return;
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
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
    <div className={compact ? 'space-y-2' : 'mb-3 space-y-2'}>
      <div className="flex gap-2 relative">
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void handleSearch();
            }
          }}
          placeholder="Rechercher un lieu (ex: Eglise du Chaudron)..."
          className={`flex-1 p-2 rounded-lg border text-sm focus:ring-500 ${borderClass}`}
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          className={`${searchBtnClass} text-white px-4 rounded-lg text-sm font-bold`}
        >
          🔍
        </button>
        {searchResults.length > 0 ? (
          <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-lg mt-1 z-50 border border-gray-100 max-h-48 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectSearchResult(result)}
                className="w-full text-left p-2 hover:bg-gray-50 text-xs text-gray-700 border-b border-gray-50 last:border-0"
              >
                {result.display_name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`h-48 rounded-lg overflow-hidden border relative z-0 ${borderClass}`}>
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
        <Crosshair variant={variant} />
      </div>

      <div className={`p-3 rounded-lg border text-sm ${addressBoxClass}`}>
        <div className="flex items-start gap-2 mb-2">
          <span className="text-lg">📍</span>
          <div>
            <p className="font-bold text-xs uppercase tracking-wide">Secteur détecté</p>
            <p>{automaticAddress || 'Déplacez la carte...'}</p>
          </div>
        </div>
        <input
          value={manualPrecision}
          onChange={(event) => onManualPrecisionChange(event.target.value)}
          placeholder={
            variant === 'blue'
              ? 'Précision (ex: Face au stade, à côté de la boulangerie...)'
              : 'Précision (ex: Devant le n°42, près du panneau...)'
          }
          className={`w-full p-2 rounded border text-sm focus:ring-500 bg-white ${addressInputBorder}`}
        />
        {location ? (
          <p className="sr-only">
            Selected location {location.lat}, {location.lng}
          </p>
        ) : null}
      </div>
    </div>
  );
}
