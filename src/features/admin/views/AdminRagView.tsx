import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ChatRagError,
  fileToBase64,
  formatRagDate,
  formatRagFileSize,
  uploadDocStatusMessage,
  type RagDocument,
} from '@/api/chatRag';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/Confirm';
import EmptyState from '@/components/ui/EmptyState';
import Icon, { type IconName } from '@/components/ui/Icon';
import Notice from '@/components/ui/Notice';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  useDeleteRagDoc,
  useRagDocuments,
  useUploadRagDoc,
} from '@/queries/chatRag';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo — Vue parity
const ACCEPTED_TYPES = '.pdf,.txt,.csv,.md,.docx,.xlsx,.html';

type StatusType = 'success' | 'error' | 'info' | '';

/**
 * Type de fichier → icône du jeu Kartie. L'API renvoie des emojis, qui changent
 * de forme et de couleur d'une plateforme à l'autre et ne suivent ni la taille
 * ni la couleur du texte : on les remplace ici.
 */
function documentIcon(mimeType?: string | null): IconName {
  if (!mimeType) return 'document';
  if (mimeType.includes('pdf')) return 'book';
  if (
    mimeType.includes('csv') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    return 'chartBar';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('markdown') || mimeType.includes('md')) return 'pencil';
  if (mimeType.includes('html')) return 'globe';
  return 'document';
}

function statusTone(type: StatusType): 'success' | 'danger' | 'info' {
  if (type === 'success') return 'success';
  if (type === 'error') return 'danger';
  return 'info';
}

export default function AdminRagView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const toast = useToast();

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
    const confirmed = await confirm({
      title: 'Retirer ce document du RAG ?',
      message: `« ${doc.file_name} » ne sera plus utilisé par l'assistant. Cette action est définitive.`,
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(doc.id);
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast.success('Document retiré du RAG');
    } catch (err) {
      console.error('Delete error:', err);
      const message =
        err instanceof ChatRagError || err instanceof Error
          ? err.message
          : String(err);
      toast.error('Suppression impossible', message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Page className="pt-8">
      <PageHeader
        back={{ to: '/admin', label: 'Administration' }}
        eyebrow="Assistant IA"
        title="Documents RAG"
        description="Les fichiers ajoutés ici enrichissent la base de connaissances de l’assistant. L’indexation prend une à deux minutes."
      />

      <Section title="Ajouter un fichier">
        <div
          // La zone réagit dès le survol du fichier, avant même le dépôt.
          className={`rounded-lg border border-dashed p-6 transition-colors ${
            isDragging
              ? 'border-accent bg-accent-soft'
              : 'border-separator-strong bg-surface-secondary'
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
            <div className="flex flex-col items-center gap-2 text-center">
              <Icon name="upload" size={26} className="k-ink-tertiary" />
              <p className="k-subhead k-ink-secondary">Glissez un fichier ici, ou</p>
              {/* Le champ fichier reste focalisable au clavier ; l'anneau se pose
                  sur le libellé, qui est ce que l'on voit. */}
              <label className="k-btn k-btn--secondary k-btn--sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[color:var(--k-focus-ring)]">
                Parcourir
                <input
                  ref={fileInputRef}
                  type="file"
                  className="k-visually-hidden"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileSelect}
                />
              </label>
              <p className="k-caption k-ink-tertiary mt-1">
                PDF, TXT, CSV, DOCX, Markdown — 5 Mo maximum
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Icon name={documentIcon(selectedFile.type)} size={22} className="k-ink-tertiary" />
                <div className="min-w-0">
                  <p className="k-subhead truncate font-medium">{selectedFile.name}</p>
                  <p className="k-caption k-ink-tertiary">
                    {formatRagFileSize(selectedFile.size)} · {selectedFile.type || 'text/plain'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={() => setSelectedFile(null)}
                  aria-label="Retirer le fichier"
                >
                  <Icon name="close" size={17} />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isUploading}
                  onClick={() => void handleUpload()}
                >
                  Envoyer au RAG
                </Button>
              </div>
            </div>
          )}
        </div>

        {statusMessage ? (
          <Notice tone={statusTone(statusType)} className="mt-4">
            <span data-testid="rag-status">{statusMessage}</span>
          </Notice>
        ) : null}
      </Section>

      <Section
        title="Fichiers dans le RAG"
        description="Les données synchronisées automatiquement (quartiers, événements…) ne sont pas listées ici."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleRefresh()}
            loading={isLoadingDocs}
            leading={<Icon name="refresh" size={16} />}
          >
            Actualiser
          </Button>
        }
      >
        <div data-testid="rag-docs-section">
          {isLoadingDocs ? (
            <div className="k-list border-t border-separator" data-testid="rag-docs-loading">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3 py-4">
                  <Skeleton width="1.375rem" height="1.375rem" radius="var(--k-radius-xs)" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton width="45%" height="0.875rem" />
                    <Skeleton width="30%" height="0.75rem" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div data-testid="rag-docs-empty">
              <EmptyState
                icon="document"
                title="Aucun fichier ajouté pour le moment."
                description="Déposez un document ci-dessus pour que l’assistant puisse s’y référer."
              />
            </div>
          ) : (
            <ul className="k-list border-t border-separator" data-testid="rag-docs-list">
              {documents.map((doc) => (
                <li key={String(doc.id)} className="flex items-center gap-3 py-4">
                  <Icon
                    name={documentIcon(doc.mime_type)}
                    size={22}
                    className="k-ink-tertiary shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="k-subhead min-w-0 truncate font-medium">{doc.file_name}</p>
                      {doc.status === 'active' ? (
                        <Badge tone="success">Actif</Badge>
                      ) : doc.status ? (
                        <Badge tone="warning">{doc.status}</Badge>
                      ) : null}
                    </div>
                    <p className="k-caption k-ink-tertiary">
                      {formatRagFileSize(doc.file_size)} · {formatRagDate(doc.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => void handleDelete(doc)}
                    loading={deletingId === doc.id}
                    aria-label={`Supprimer ${doc.file_name}`}
                    className="shrink-0 hover:text-danger"
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </Page>
  );
}
