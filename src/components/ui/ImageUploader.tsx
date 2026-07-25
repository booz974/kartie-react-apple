import { useEffect, useId, useState } from 'react';
import { uploadImage } from '@/api/storage';
import Button from './Button';
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
 * Dépôt d'image : une seule zone, qui montre l'aperçu dès qu'il existe plutôt
 * que d'empiler un cadre autour d'un cadre.
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
          <img
            src={imageUrl}
            alt="Aperçu de l'image"
            className="max-h-56 w-full rounded-lg border border-separator object-cover"
          />
          <Button
            variant="ghost"
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
          className={`rounded-lg border border-dashed p-6 text-center transition-colors ${
            isDragging ? 'border-accent bg-accent-soft' : 'border-separator-strong bg-surface-secondary'
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
              <Spinner size={22} className="text-accent" label="Envoi de l'image en cours" />
              <p className="k-subhead k-ink-secondary">Envoi en cours…</p>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="k-press flex cursor-pointer flex-col items-center gap-2 rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--k-focus-ring)]"
            >
              <Icon name="image" size={26} className="k-ink-tertiary" />
              <span className="k-subhead k-ink">
                <span className="font-semibold text-accent">Cliquez pour choisir</span> ou
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
