import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  ChatRagError,
  fileToBase64,
  formatRagDate,
  formatRagFileSize,
  ragFileIcon,
  uploadDocStatusMessage,
  type RagDocument,
} from '@/api/chatRag';
import {
  useDeleteRagDoc,
  useRagDocuments,
  useUploadRagDoc,
} from '@/queries/chatRag';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo — Vue parity
const ACCEPTED_TYPES = '.pdf,.txt,.csv,.md,.docx,.xlsx,.html';

type StatusType = 'success' | 'error' | 'info' | '';

function statusClassName(type: StatusType): string {
  if (type === 'success') return 'bg-green-100 text-green-800 border border-green-200';
  if (type === 'error') return 'bg-red-100 text-red-800 border border-red-200';
  return 'bg-blue-100 text-blue-800 border border-blue-200';
}

export default function AdminRagView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading: isLoadingDocs, refetch } = useRagDocuments();
  const uploadMutation = useUploadRagDoc();
  const deleteMutation = useDeleteRagDoc();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<StatusType>('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const isUploading = uploadMutation.isPending;

  function validateAndSet(file: File) {
    setStatusMessage('');
    setStatusType('');
    if (file.size > MAX_FILE_SIZE) {
      setStatusMessage(
        `Fichier trop volumineux (${formatRagFileSize(file.size)}). Maximum: 5 Mo.`,
      );
      setStatusType('error');
      return;
    }
    setSelectedFile(file);
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) validateAndSet(file);
    // Allow re-selecting the same file
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) validateAndSet(file);
  }

  async function handleUpload() {
    if (!selectedFile || isUploading) return;

    setStatusMessage('Lecture du fichier...');
    setStatusType('info');

    try {
      const file = selectedFile;
      const base64 = await fileToBase64(file);

      setStatusMessage('Envoi vers le RAG...');

      const data = await uploadMutation.mutateAsync({
        fileName: file.name,
        mimeType: file.type || 'text/plain',
        fileBase64: base64,
      });

      setStatusMessage(data.message || 'Fichier ajouté avec succes !');
      setStatusType('success');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setStatusMessage(uploadDocStatusMessage(err));
      setStatusType('error');
    }
  }

  async function handleRefresh() {
    await refetch();
  }

  async function handleDelete(doc: RagDocument) {
    if (!confirm(`Supprimer "${doc.file_name}" du RAG ?`)) return;

    setDeletingId(doc.id);
    try {
      await deleteMutation.mutateAsync(doc.id);
    } catch (err) {
      console.error('Delete error:', err);
      const message =
        err instanceof ChatRagError || err instanceof Error
          ? err.message
          : String(err);
      alert('Erreur lors de la suppression: ' + message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="desktop-glass-card p-6 bg-gradient-to-r from-purple-600/20 to-blue-500/20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Documents RAG</h2>
            <p className="text-sm text-slate-600 mt-1">
              Ajoutez des fichiers pour enrichir la base de connaissances de l&apos;assistant IA
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="bg-white/20 hover:bg-white/30 text-slate-700 p-2 rounded-full transition"
            aria-label="Fermer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="desktop-glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Ajouter un fichier</h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-300 hover:border-blue-400'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto text-slate-400 mb-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-slate-600 mb-2">Glissez un fichier ici ou</p>
              <label className="cursor-pointer inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium">
                Parcourir
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileSelect}
                />
              </label>
              <p className="text-xs text-slate-500 mt-3">
                PDF, TXT, CSV, DOCX, Markdown - Max 5 Mo
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{ragFileIcon(selectedFile.type)}</span>
                <div className="text-left">
                  <p className="font-medium text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatRagFileSize(selectedFile.size)} -{' '}
                    {selectedFile.type || 'text/plain'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-slate-500 hover:text-red-500 transition p-1"
                  aria-label="Retirer le fichier"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {selectedFile ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-6 py-2 rounded-lg transition font-medium flex items-center gap-2"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Envoi en cours...
                </span>
              ) : (
                <span>Envoyer au RAG</span>
              )}
            </button>
          </div>
        ) : null}

        {statusMessage ? (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${statusClassName(statusType)}`}
            data-testid="rag-status"
          >
            {statusMessage}
          </div>
        ) : null}
      </div>

      {/* Documents List */}
      <div className="desktop-glass-card p-6" data-testid="rag-docs-section">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Fichiers dans le RAG</h3>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoadingDocs}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isLoadingDocs ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        {isLoadingDocs ? (
          <div className="text-center py-8 text-slate-500" data-testid="rag-docs-loading">
            Chargement des documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-slate-500" data-testid="rag-docs-empty">
            <p>Aucun fichier ajouté pour le moment.</p>
            <p className="text-xs mt-1">
              Les données synchronisées automatiquement (quartiers, events, etc.) ne sont pas
              listées ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="rag-docs-list">
            {documents.map((doc) => (
              <div
                key={String(doc.id)}
                className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-slate-200 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{ragFileIcon(doc.mime_type)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatRagFileSize(doc.file_size)} - {formatRagDate(doc.created_at)}
                      {doc.status === 'active' ? (
                        <span className="text-green-600 ml-1">Actif</span>
                      ) : doc.status ? (
                        <span className="text-yellow-600 ml-1">{doc.status}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="text-slate-400 hover:text-red-500 transition p-2 flex-shrink-0"
                  title="Supprimer"
                  aria-label={`Supprimer ${doc.file_name}`}
                >
                  {deletingId !== doc.id ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  ) : (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
