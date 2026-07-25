import { useEffect, useId, useState } from 'react';
import { uploadImage } from '@/api/storage';
import Badge from './Badge';
import Button from './Button';
import Chip from './Chip';
import Icon from './Icon';
import Notice from './Notice';
import Spinner from './Spinner';

interface ImageUploaderProps {
  initialImageUrl?: string | null;
  bucketName?: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: Error) => void;
}

/**
 * Dépôt d'image : une seule zone, accueillante, qui montre l'aperçu en grand dès
 * qu'il existe plutôt que d'empiler un cadre autour d'un cadre.
 */
export default function ImageUploader({
  initialImageUrl = null,
  bucketName = 'uploads',
  onUploadSuccess,
  onUploadError,
}: ImageUploaderProps) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setImageUrl(initialImageUrl ?? null);
  }, [initialImageUrl]);

  async function handleUpload(file: File) {
    setErrorMessage('');
    setIsUploading(true);

    try {
      const publicUrl = await uploadImage(file, bucketName);
      setImageUrl(publicUrl);
      onUploadSuccess?.(publicUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur lors de l\'upload.';
      setErrorMessage(`Erreur lors de l'upload : ${message}`);
      onUploadError?.(error instanceof Error ? error : new Error(message));
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function handleFileDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleUpload(file);
    }
  }

  function resetUploader() {
    setImageUrl(null);
    setErrorMessage('');
  }

  return (
    <div className="flex flex-col gap-3">
      {imageUrl ? (
        <div className="flex flex-col items-start gap-3">
          {/* L'aperçu occupe toute la largeur : on juge une photo en grand, pas
              dans une vignette. */}
          <div className="k-card relative w-full overflow-hidden rounded-xl">
            <img
              src={imageUrl}
              alt="Aperçu de l'image"
              className="max-h-72 w-full object-cover"
            />
            <Badge tone="asso" emoji="✅" onMedia className="absolute left-3 top-3">
              Image en place
            </Badge>
          </div>
          <Button
            variant="tinted"
            size="sm"
            onClick={resetUploader}
            leading={<Icon name="refresh" size={15} />}
          >
            Changer l&apos;image
          </Button>
        </div>
      ) : (
        <div
          // La bordure suit le geste : elle se teinte dès que le fichier survole
          // la zone, sans attendre le dépôt.
          className={`k-glass-thin rounded-xl border-2 border-dashed p-7 text-center transition-colors ${
            isDragging
              ? 'border-accent bg-accent-soft'
              : 'border-[color:var(--k-separator-strong)]'
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleFileDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner size={26} className="text-accent-ink" label="Envoi de l'image en cours" />
              <p className="k-subhead k-ink font-medium">Envoi en cours…</p>
              <p className="k-caption k-ink-tertiary">Encore quelques instants.</p>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="k-press flex cursor-pointer flex-col items-center gap-2 rounded-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--k-focus-ring)]"
            >
              <Chip tone="accent" size={56} className="mb-1">
                🖼️
              </Chip>
              <span className="k-callout k-ink font-semibold">
                {isDragging ? 'Déposez votre image ici' : 'Ajoutez une image'}
              </span>
              <span className="k-subhead k-ink-secondary">
                <span className="font-semibold text-accent-ink">Cliquez pour choisir</span> ou
                glissez-déposez une image
              </span>
              <span className="k-caption k-ink-tertiary">PNG, JPG, GIF jusqu&apos;à 2 Mo</span>
              <input
                id={inputId}
                name={inputId}
                type="file"
                className="k-visually-hidden"
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/gif"
              />
            </label>
          )}
        </div>
      )}

      {errorMessage ? <Notice tone="danger">{errorMessage}</Notice> : null}
    </div>
  );
}
