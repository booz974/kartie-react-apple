import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from 'react';
import Button from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Field, { Checkbox, Input, Select } from '@/components/ui/Field';
import Icon from '@/components/ui/Icon';
import ImageUploader from '@/components/ui/ImageUploader';
import Notice from '@/components/ui/Notice';
import Segmented from '@/components/ui/Segmented';
import Skeleton from '@/components/ui/Skeleton';
import { POST_TYPE_EMOJI, type CategoryKey } from '@/design/categories';
import type { LocationValue } from '@/features/social/components/LocationPicker';
import type { Quartier } from '@/lib/types/contract';

/** Leaflet only when a map post-type is selected, which keeps the feed chunk lean (T-803 / NFR-5). */
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

/**
 * Le choix du type est le premier geste de la publication : chaque option porte
 * son émoji et sa teinte, pour qu'on repère « Alerte » ou « Entraide » sans
 * lire la rangée entière.
 */
const postTypes = [
  { value: 'regular', label: 'Message', tone: 'news' },
  { value: 'entraide', label: 'Entraide', tone: 'asso' },
  { value: 'perdu_trouve', label: 'Perdu/Trouvé', tone: 'project' },
  { value: 'alerte', label: 'Alerte', tone: 'event' },
  { value: 'signalement', label: 'Signalement', tone: 'petition' },
  { value: 'village_square', label: 'Place du Village', tone: 'consult' },
] as const satisfies readonly { value: string; label: string; tone: CategoryKey }[];

type PostType = (typeof postTypes)[number]['value'];

const IMAGE_TYPES: PostType[] = ['signalement', 'perdu_trouve', 'alerte', 'regular', 'village_square'];

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

/** Libellé de segment : l'émoji donne le repère, le mot reste seul à être lu. */
function EmojiLabel({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <>
      <span aria-hidden="true">{emoji}</span>
      {children}
    </>
  );
}

/** Le panneau propre à un type : un verre fin posé dans le flux. */
function TypePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="k-card k-card--flat k-animate-fade-in flex flex-col gap-4 p-4">
      {children}
    </div>
  );
}

function MapFallback({ height }: { height: string }) {
  return <Skeleton height={height} radius="var(--k-radius-md)" />;
}

/**
 * Champ qui grandit avec ce qu'on y écrit : le texte saisi reste visible en
 * entier et l'action d'envoi descend avec lui, au lieu d'être repoussée hors de
 * portée par une barre de défilement interne.
 */
function AutoGrowTextarea({
  className,
  value,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={elementRef}
      value={value}
      className={['k-input resize-none overflow-hidden', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

export default function CreatePost({ quartier, onSubmit, isSubmitting = false }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState<PostType>('regular');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
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
    setUploadError('');
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

  const needsLocation =
    (selectedType === 'signalement' || selectedType === 'perdu_trouve') && !metadata.location;

  return (
    <section aria-labelledby="create-post-title" className="k-card flex flex-col gap-5 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Chip tone="accent" size={44}>
          ✍️
        </Chip>
        <div className="min-w-0">
          <h2 id="create-post-title" className="k-title-3">
            Prendre la parole
          </h2>
          <p className="k-footnote k-ink-tertiary">Votre quartier vous lit.</p>
        </div>
      </div>

      {/* Le choix du type déborde volontairement : le geste latéral est plus
          naturel qu'un empilement, et rien n'est tronqué à 375 px. */}
      <div
        role="group"
        aria-label="Type de publication"
        className="k-scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {postTypes.map((type) => {
          const selected = selectedType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              aria-pressed={selected}
              onClick={() => selectType(type.value)}
              style={
                selected ? { backgroundImage: `var(--k-cat-${type.tone}-gradient)` } : undefined
              }
              className={`k-press k-subhead inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-semibold ${
                selected
                  ? 'text-ink-on-accent shadow-md'
                  : 'k-glass-thin k-ink-secondary hover:text-ink'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {POST_TYPE_EMOJI[type.value]}
              </span>
              {type.label}
            </button>
          );
        })}
      </div>

      {selectedType === 'entraide' ? (
        <TypePanel>
          <Segmented
            label="Sens de l’entraide"
            block
            value={metadata.entraideType === 'request' ? 'request' : 'offer'}
            onChange={(value) => setMetadata((m) => ({ ...m, entraideType: value }))}
            options={[
              { value: 'offer', label: <EmojiLabel emoji="🎁">Je propose</EmojiLabel> },
              { value: 'request', label: <EmojiLabel emoji="🙋">Je recherche</EmojiLabel> },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Catégorie">
              {(props) => (
                <Select
                  {...props}
                  value={metadata.category}
                  onChange={(e) => setMetadata((m) => ({ ...m, category: e.target.value }))}
                >
                  <option value="outils">Outils</option>
                  <option value="jardinage">Jardinage</option>
                  <option value="services">Services</option>
                  <option value="courses">Courses</option>
                  <option value="garde">Garde d&apos;enfants</option>
                  <option value="autre">Autre</option>
                </Select>
              )}
            </Field>

            <Field label="Disponibilité" optional>
              {(props) => (
                <Input
                  {...props}
                  value={metadata.availability}
                  onChange={(e) => setMetadata((m) => ({ ...m, availability: e.target.value }))}
                  placeholder="Ce week-end, soirs de semaine..."
                />
              )}
            </Field>
          </div>

          <Checkbox
            label="Bénévole, c’est gratuit"
            checked={metadata.isVolunteer}
            onChange={(e) => setMetadata((m) => ({ ...m, isVolunteer: e.target.checked }))}
          />
        </TypePanel>
      ) : null}

      {selectedType === 'perdu_trouve' ? (
        <TypePanel>
          <Segmented
            label="Objet perdu ou trouvé"
            block
            value={metadata.status === 'found' ? 'found' : 'lost'}
            onChange={(value) => setMetadata((m) => ({ ...m, status: value }))}
            options={[
              { value: 'lost', label: <EmojiLabel emoji="❓">Perdu</EmojiLabel> },
              { value: 'found', label: <EmojiLabel emoji="🎯">Trouvé</EmojiLabel> },
            ]}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Quoi ?">
              {(props) => (
                <Input
                  {...props}
                  value={metadata.itemType}
                  onChange={(e) => setMetadata((m) => ({ ...m, itemType: e.target.value }))}
                  placeholder="Chat, clés, doudou..."
                />
              )}
            </Field>

            <Field label="Quand ?">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  value={metadata.date}
                  onChange={(e) => setMetadata((m) => ({ ...m, date: e.target.value }))}
                />
              )}
            </Field>
          </div>

          <div className="k-field">
            <span className="k-field__label">
              <span aria-hidden="true">📍 </span>
              Où ?
            </span>
            <p className="k-field__hint">Déplacez la carte pour viser l’endroit exact.</p>
            <Suspense fallback={<MapFallback height="16rem" />}>
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
        </TypePanel>
      ) : null}

      {selectedType === 'alerte' ? (
        <TypePanel>
          <div className="k-field">
            <span className="k-field__label">Niveau d&apos;urgence</span>
            <Segmented
              label="Niveau d’urgence"
              block
              value={
                metadata.urgency === 'red' ? 'red' : metadata.urgency === 'orange' ? 'orange' : 'yellow'
              }
              onChange={(value) => setMetadata((m) => ({ ...m, urgency: value }))}
              options={[
                { value: 'yellow', label: <EmojiLabel emoji="🟡">Info</EmojiLabel> },
                { value: 'orange', label: <EmojiLabel emoji="🟠">Vigilance</EmojiLabel> },
                { value: 'red', label: <EmojiLabel emoji="🔴">Danger</EmojiLabel> },
              ]}
            />
          </div>

          <Field label="Durée de validité">
            {(props) => (
              <Select
                {...props}
                value={metadata.validity}
                onChange={(e) => setMetadata((m) => ({ ...m, validity: e.target.value }))}
              >
                <option value="2h">2 heures</option>
                <option value="24h">24 heures</option>
                <option value="indefinite">Indéterminé</option>
              </Select>
            )}
          </Field>
        </TypePanel>
      ) : null}

      {selectedType === 'signalement' ? (
        <TypePanel>
          <Field label="Type de problème">
            {(props) => (
              <Select
                {...props}
                value={metadata.problemType}
                onChange={(e) => setMetadata((m) => ({ ...m, problemType: e.target.value }))}
              >
                <option value="eclairage">Éclairage</option>
                <option value="voirie">Voirie / trous</option>
                <option value="proprete">Propreté / déchets</option>
                <option value="espaces_verts">Espaces verts</option>
                <option value="autre">Autre</option>
              </Select>
            )}
          </Field>

          <div className="k-field">
            <span className="k-field__label">
              <span aria-hidden="true">📍 </span>
              Localisation précise
            </span>
            <p className="k-field__hint">Visez le point exact avec la carte.</p>
            <Suspense fallback={<MapFallback height="12rem" />}>
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
        </TypePanel>
      ) : null}

      <Field label={getContentLabel(selectedType)}>
        {(props) => (
          <AutoGrowTextarea
            {...props}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={getPlaceholder(selectedType)}
            rows={3}
          />
        )}
      </Field>

      {IMAGE_TYPES.includes(selectedType) ? (
        <div className="k-field">
          <span className="k-field__label">
            <span aria-hidden="true">📷 </span>
            Photo<span className="k-field__optional"> (facultatif)</span>
          </span>

          <ImageUploader
            bucketName="post_images"
            onUploadSuccess={(url) => {
              setUploadedImageUrl(url);
              setUploadError('');
            }}
            onUploadError={() => {
              setUploadError("L'image n'a pas pu être envoyée. Réessayez dans un instant.");
            }}
          />

          {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}

          {uploadedImageUrl ? (
            <div className="relative inline-block">
              <img
                src={uploadedImageUrl}
                className="h-28 w-28 rounded-lg object-cover shadow-md"
                alt="Aperçu de la photo jointe"
              />
              <button
                type="button"
                onClick={() => setUploadedImageUrl(null)}
                aria-label="Retirer la photo"
                className="k-press absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-surface"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {needsLocation && content.trim() ? (
        <Notice tone="info">Indiquez le lieu sur la carte pour pouvoir publier.</Notice>
      ) : null}

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!isValid}
          loading={isSubmitting}
          leading={<Icon name="send" size={17} />}
        >
          Publier
        </Button>
      </div>
    </section>
  );
}
