import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import ImageUploader from '@/components/ui/ImageUploader';
import type { LocationValue } from '@/features/social/components/LocationPicker';
import type { Quartier } from '@/lib/types/contract';

/** Leaflet only when a map post-type is selected — keeps feed chunk lean (T-803 / NFR-5). */
const LocationPicker = lazy(() => import('@/features/social/components/LocationPicker'));

export interface CreatePostPayload {
  content: string;
  post_type: string;
  metadata: Record<string, unknown>;
}

interface CreatePostProps {
  quartier: Quartier | null;
  onSubmit: (payload: CreatePostPayload) => void;
  isSubmitting?: boolean;
}

const postTypes = [
  { value: 'regular', label: 'Message', icon: '📝' },
  { value: 'entraide', label: 'Entraide', icon: '🤝' },
  { value: 'perdu_trouve', label: 'Perdu/Trouvé', icon: '🔍' },
  { value: 'alerte', label: 'Alerte', icon: '⚠️' },
  { value: 'signalement', label: 'Signalement', icon: '📸' },
  { value: 'village_square', label: 'Place du Village', icon: '🏟️' },
] as const;

type PostType = (typeof postTypes)[number]['value'];

const IMAGE_TYPES: PostType[] = ['signalement', 'perdu_trouve', 'alerte', 'regular', 'village_square'];

function getTypeClasses(type: PostType): string {
  switch (type) {
    case 'entraide':
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case 'perdu_trouve':
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'alerte':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'signalement':
      return 'bg-gray-200 text-gray-800 border border-gray-300';
    case 'village_square':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default:
      return 'bg-blue-600 text-white';
  }
}

function getContentLabel(type: PostType): string {
  switch (type) {
    case 'entraide':
      return 'Détails de votre annonce';
    case 'perdu_trouve':
      return 'Description supplémentaire';
    case 'alerte':
      return "Description de l'incident";
    case 'signalement':
      return 'Description du problème';
    default:
      return 'Votre message';
  }
}

function getPlaceholder(type: PostType): string {
  switch (type) {
    case 'entraide':
      return 'Décrivez ce que vous proposez ou recherchez...';
    case 'perdu_trouve':
      return 'Détails distinctifs (couleur, marque, collier...)...';
    case 'alerte':
      return 'Expliquez la situation pour informer vos voisins...';
    case 'signalement':
      return "Plus on est précis, plus c'est efficace !";
    case 'village_square':
      return 'Un sujet de discussion pour le quartier ?';
    default:
      return 'Partagez une idée, une info...';
  }
}

interface PostMetadata {
  entraideType: string;
  category: string;
  availability: string;
  isVolunteer: boolean;
  status: string;
  itemType: string;
  date: string;
  urgency: string;
  validity: string;
  problemType: string;
  location: LocationValue | null;
}

const defaultMetadata = (): PostMetadata => ({
  entraideType: 'offer',
  category: 'services',
  availability: '',
  isVolunteer: false,
  status: 'lost',
  itemType: '',
  date: new Date().toISOString().split('T')[0] ?? '',
  urgency: 'yellow',
  validity: '24h',
  problemType: 'voirie',
  location: null,
});

export default function CreatePost({ quartier, onSubmit, isSubmitting = false }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>('regular');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PostMetadata>(defaultMetadata);
  const [automaticAddress, setAutomaticAddress] = useState('');
  const [manualPrecision, setManualPrecision] = useState('');
  const [resetKey, setResetKey] = useState(0);

  const isValid = useMemo(() => {
    if (!content.trim()) return false;
    if (selectedType === 'signalement' && !metadata.location) return false;
    if (selectedType === 'perdu_trouve' && !metadata.location) return false;
    return true;
  }, [content, metadata.location, selectedType]);

  const selectType = useCallback((type: PostType) => {
    setSelectedType(type);
    setMetadata((current) => ({ ...current, location: null }));
    setAutomaticAddress('');
    setManualPrecision('');
  }, []);

  const resetForm = useCallback(() => {
    setContent('');
    setSelectedType('regular');
    setUploadedImageUrl(null);
    setMetadata((current) => ({ ...current, location: null }));
    setAutomaticAddress('');
    setManualPrecision('');
    setResetKey((k) => k + 1);
  }, []);

  function handleSubmit() {
    if (!isValid || isSubmitting) return;

    const finalMetadata: Record<string, unknown> = { ...metadata };

    if (uploadedImageUrl) {
      finalMetadata.image_url = uploadedImageUrl;
    }

    if (metadata.location) {
      finalMetadata.automatic_address = automaticAddress;
      finalMetadata.manual_precision = manualPrecision;
    }

    if (selectedType === 'signalement') {
      finalMetadata.status = 'submitted';
      finalMetadata.history = [{ status: 'submitted', date: new Date().toISOString() }];
    }

    onSubmit({
      content,
      post_type: selectedType,
      metadata: finalMetadata,
    });

    resetForm();
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-lg border border-gray-100 mb-8 transition-all duration-300 hover:shadow-xl">
      <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
        <span>✨</span> Exprimez-vous !
      </h3>

      <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex space-x-2">
          {postTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => selectType(type.value)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                selectedType === type.value
                  ? `${getTypeClasses(type.value)} shadow-md transform scale-105`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {selectedType === 'entraide' ? (
          <div className="animate-fade-in bg-amber-50 p-4 rounded-xl border border-amber-100">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setMetadata((m) => ({ ...m, entraideType: 'offer' }))}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                  metadata.entraideType === 'offer'
                    ? 'bg-amber-500 text-white shadow'
                    : 'bg-white text-amber-900 border border-amber-200'
                }`}
              >
                🎁 Je propose
              </button>
              <button
                type="button"
                onClick={() => setMetadata((m) => ({ ...m, entraideType: 'request' }))}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                  metadata.entraideType === 'request'
                    ? 'bg-amber-500 text-white shadow'
                    : 'bg-white text-amber-900 border border-amber-200'
                }`}
              >
                🙏 Je recherche
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Catégorie</label>
                <select
                  value={metadata.category}
                  onChange={(e) => setMetadata((m) => ({ ...m, category: e.target.value }))}
                  className="w-full p-2 rounded-lg border-amber-200 text-sm focus:ring-amber-500"
                >
                  <option value="outils">🛠️ Outils</option>
                  <option value="jardinage">🌿 Jardinage</option>
                  <option value="services">🤝 Services</option>
                  <option value="courses">🛒 Courses</option>
                  <option value="garde">👶 Garde d&apos;enfants</option>
                  <option value="autre">✨ Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">Disponibilité</label>
                <input
                  value={metadata.availability}
                  onChange={(e) => setMetadata((m) => ({ ...m, availability: e.target.value }))}
                  placeholder="Ex: Ce weekend, Soirs de semaine..."
                  className="w-full p-2 rounded-lg border border-amber-200 text-sm focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="volunteer"
                checked={metadata.isVolunteer}
                onChange={(e) => setMetadata((m) => ({ ...m, isVolunteer: e.target.checked }))}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="volunteer" className="text-sm text-amber-900 font-medium">
                Bénévole / Gratuit
              </label>
            </div>
          </div>
        ) : null}

        {selectedType === 'perdu_trouve' ? (
          <div className="animate-fade-in bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setMetadata((m) => ({ ...m, status: 'lost' }))}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                  metadata.status === 'lost'
                    ? 'bg-red-500 text-white shadow'
                    : 'bg-white text-red-700 border border-red-200'
                }`}
              >
                🔴 Perdu
              </button>
              <button
                type="button"
                onClick={() => setMetadata((m) => ({ ...m, status: 'found' }))}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                  metadata.status === 'found'
                    ? 'bg-blue-500 text-white shadow'
                    : 'bg-white text-blue-700 border border-blue-200'
                }`}
              >
                🔵 Trouvé
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Quoi ?</label>
                <input
                  value={metadata.itemType}
                  onChange={(e) => setMetadata((m) => ({ ...m, itemType: e.target.value }))}
                  placeholder="Ex: Chat, Clés, Doudou..."
                  className="w-full p-2 rounded-lg border border-blue-200 text-sm focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">Quand ?</label>
                <input
                  type="date"
                  value={metadata.date}
                  onChange={(e) => setMetadata((m) => ({ ...m, date: e.target.value }))}
                  className="w-full p-2 rounded-lg border border-blue-200 text-sm focus:ring-blue-500"
                />
              </div>
            </div>
            <label className="block text-xs font-bold text-blue-900 mb-1">
              Où ? (Déplacez la carte pour viser)
            </label>
            <Suspense fallback={<div className="h-64 bg-blue-100/50 rounded-xl animate-pulse" aria-hidden />}>
              <LocationPicker
                key={`perdu-${resetKey}`}
                quartierLat={typeof quartier?.latitude === 'number' ? quartier.latitude : null}
                quartierLng={typeof quartier?.longitude === 'number' ? quartier.longitude : null}
                variant="blue"
                location={metadata.location}
                automaticAddress={automaticAddress}
                manualPrecision={manualPrecision}
                onLocationChange={(location) => setMetadata((m) => ({ ...m, location }))}
                onAutomaticAddressChange={setAutomaticAddress}
                onManualPrecisionChange={setManualPrecision}
              />
            </Suspense>
          </div>
        ) : null}

        {selectedType === 'alerte' ? (
          <div className="animate-fade-in bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="mb-4">
              <label className="block text-xs font-bold text-red-900 mb-2">Niveau d&apos;urgence</label>
              <div className="flex gap-2">
                {(['yellow', 'orange', 'red'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setMetadata((m) => ({ ...m, urgency: level }))}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${
                      metadata.urgency === level
                        ? level === 'yellow'
                          ? 'bg-yellow-100 border-yellow-500 text-yellow-900'
                          : level === 'orange'
                            ? 'bg-orange-100 border-orange-500 text-orange-900'
                            : 'bg-red-100 border-red-600 text-red-900'
                        : 'bg-white border-transparent text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {level === 'yellow' ? '🟡 Info' : level === 'orange' ? '🟠 Vigilance' : '🔴 Danger'}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-red-900 mb-1">Durée de validité</label>
              <select
                value={metadata.validity}
                onChange={(e) => setMetadata((m) => ({ ...m, validity: e.target.value }))}
                className="w-full p-2 rounded-lg border-red-200 text-sm focus:ring-red-500"
              >
                <option value="2h">⏳ 2 heures</option>
                <option value="24h">📅 24 heures</option>
                <option value="indefinite">♾️ Indéterminé</option>
              </select>
            </div>
          </div>
        ) : null}

        {selectedType === 'signalement' ? (
          <div className="animate-fade-in bg-gray-100 p-4 rounded-xl border border-gray-200">
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Type de problème</label>
              <select
                value={metadata.problemType}
                onChange={(e) => setMetadata((m) => ({ ...m, problemType: e.target.value }))}
                className="w-full p-2 rounded-lg border-gray-300 text-sm focus:ring-gray-500"
              >
                <option value="eclairage">💡 Éclairage</option>
                <option value="voirie">🛣️ Voirie / Trous</option>
                <option value="proprete">🗑️ Propreté / Déchets</option>
                <option value="espaces_verts">🌳 Espaces verts</option>
                <option value="autre">🔧 Autre</option>
              </select>
            </div>
            <div className="mb-3 space-y-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Localisation précise (Visez avec la carte)
              </label>
              <Suspense fallback={<div className="h-48 bg-gray-100 rounded-xl animate-pulse" aria-hidden />}>
                <LocationPicker
                  key={`sig-${resetKey}`}
                  quartierLat={typeof quartier?.latitude === 'number' ? quartier.latitude : null}
                  quartierLng={typeof quartier?.longitude === 'number' ? quartier.longitude : null}
                  variant="gray"
                  location={metadata.location}
                  automaticAddress={automaticAddress}
                  manualPrecision={manualPrecision}
                  onLocationChange={(location) => setMetadata((m) => ({ ...m, location }))}
                  onAutomaticAddressChange={setAutomaticAddress}
                  onManualPrecisionChange={setManualPrecision}
                  compact
                />
              </Suspense>
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
            {getContentLabel(selectedType)}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-gray-700"
            placeholder={getPlaceholder(selectedType)}
            rows={3}
          />
        </div>

        {IMAGE_TYPES.includes(selectedType) ? (
          <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Photo (Optionnel)</p>
            <ImageUploader
              bucketName="post_images"
              onUploadSuccess={(url) => setUploadedImageUrl(url)}
              onUploadError={() => {
                alert('Erreur lors de l\'upload de l\'image.');
              }}
            />
            {uploadedImageUrl ? (
              <div className="mt-2 relative inline-block">
                <img src={uploadedImageUrl} className="h-20 w-20 object-cover rounded-lg shadow-sm" alt="Aperçu" />
                <button
                  type="button"
                  onClick={() => setUploadedImageUrl(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
          >
            {isSubmitting ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </div>
    </div>
  );
}
