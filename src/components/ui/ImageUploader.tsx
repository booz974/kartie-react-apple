import { useEffect, useId, useState } from 'react';
import { uploadImage } from '@/api/storage';

interface ImageUploaderProps {
  initialImageUrl?: string | null;
  bucketName?: string;
  onUploadSuccess?: (url: string) => void;
  onUploadError?: (error: Error) => void;
}

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
    <div
      className={`p-4 border-2 border-dashed rounded-lg text-center ${
        isDragging ? 'border-blue-400' : ''
      }`}
    >
      {imageUrl ? (
        <div>
          <img
            src={imageUrl}
            alt="Aperçu de l'image"
            className="max-w-xs mx-auto rounded-lg shadow-md"
          />
          <button
            type="button"
            onClick={resetUploader}
            className="mt-4 text-sm text-red-600 hover:text-red-800"
          >
            Changer l'image
          </button>
        </div>
      ) : (
        <div
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
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">Envoi en cours...</p>
            </div>
          ) : (
            <div>
              <label htmlFor={inputId} className="cursor-pointer">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-semibold text-blue-600">Cliquez pour choisir</span>{' '}
                  ou glissez-déposez une image.
                </p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF jusqu'à 2Mo</p>
              </label>
              <input
                id={inputId}
                name={inputId}
                type="file"
                className="sr-only"
                onChange={handleFileSelect}
                accept="image/png, image/jpeg, image/gif"
              />
            </div>
          )}
        </div>
      )}

      {errorMessage ? <p className="mt-2 text-sm text-red-500">{errorMessage}</p> : null}
    </div>
  );
}
