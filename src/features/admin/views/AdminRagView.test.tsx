import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { ConfirmProvider } from '@/components/ui/Confirm';
import { ToastProvider } from '@/components/ui/Toast';
import AdminRagView from './AdminRagView';

const mockListDocs = vi.fn();
const mockUploadDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('@/api/chatRag', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/chatRag')>();
  return {
    ...actual,
    listDocs: (...args: unknown[]) => mockListDocs(...args),
    uploadDoc: (...args: unknown[]) => mockUploadDoc(...args),
    deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  };
});

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // La vue s'appuie sur les surfaces du design system pour confirmer et rendre
  // compte : les fournisseurs correspondants font partie de son contexte normal.
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConfirmProvider>
          <MemoryRouter>
            <AdminRagView />
          </MemoryRouter>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('AdminRagView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDocs.mockResolvedValue([]);
    mockUploadDoc.mockResolvedValue({
      success: true,
      message: 'Fichier "x.txt" ajouté au RAG ! L\'indexation peut prendre 1-2 minutes.',
    });
    mockDeleteDoc.mockResolvedValue({ success: true, message: 'deleted' });
  });

  it('renders title and empty state after list loads', async () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Documents RAG' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId('rag-docs-empty')).toBeTruthy();
    });
    expect(screen.getByText('Aucun fichier ajouté pour le moment.')).toBeTruthy();
    expect(mockListDocs).toHaveBeenCalled();
  });

  it('renders document list with name size date status', async () => {
    mockListDocs.mockResolvedValue([
      {
        id: 42,
        file_name: 'guide.pdf',
        mime_type: 'application/pdf',
        file_size: 2048,
        status: 'active',
        created_at: '2026-07-01T10:00:00Z',
      },
    ]);
    renderView();
    await waitFor(() => {
      expect(screen.getByTestId('rag-docs-list')).toBeTruthy();
    });
    expect(screen.getByText('guide.pdf')).toBeTruthy();
    expect(screen.getByText(/Actif/)).toBeTruthy();
    expect(screen.getByText(/2\.0 Ko/)).toBeTruthy();
  });

  it('shows loading then recovers to list', async () => {
    let resolveList!: (v: unknown) => void;
    mockListDocs.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    renderView();
    expect(screen.getByTestId('rag-docs-loading')).toBeTruthy();
    resolveList([]);
    await waitFor(() => {
      expect(screen.getByTestId('rag-docs-empty')).toBeTruthy();
    });
  });

  it('rejects oversized file before upload', async () => {
    renderView();
    await waitFor(() => expect(mockListDocs).toHaveBeenCalled());

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File(['x'], 'big.txt', { type: 'text/plain' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [big] } });

    expect(screen.getByTestId('rag-status').textContent).toMatch(/Fichier trop volumineux/);
    expect(screen.queryByText('Envoyer au RAG')).toBeNull();
  });

  it('uploads selected file and shows success', async () => {
    renderView();
    await waitFor(() => expect(mockListDocs).toHaveBeenCalled());

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['hello'], 'parity-rag-test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer au RAG' }));

    await waitFor(() => {
      expect(mockUploadDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'parity-rag-test.txt',
          mimeType: 'text/plain',
          fileBase64: expect.any(String),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('rag-status').textContent).toMatch(/ajouté au RAG/);
    });
  });

  it('shows upload error and keeps controls usable', async () => {
    const { ChatRagError } = await import('@/api/chatRag');
    mockUploadDoc.mockRejectedValue(new ChatRagError('HTTP_ERROR', 'Boom upload'));

    renderView();
    await waitFor(() => expect(mockListDocs).toHaveBeenCalled());

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'x.txt', { type: 'text/plain' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer au RAG' }));

    await waitFor(() => {
      expect(screen.getByTestId('rag-status').textContent).toBe('Erreur: Boom upload');
    });
    expect(screen.getByRole('button', { name: 'Envoyer au RAG' })).toBeTruthy();
  });

  it('confirms before delete and calls deleteDoc', async () => {
    mockListDocs.mockResolvedValue([
      {
        id: 'doc-1',
        file_name: 'to-delete.txt',
        mime_type: 'text/plain',
        file_size: 10,
        status: 'active',
        created_at: '2026-07-01T10:00:00Z',
      },
    ]);
    renderView();
    await waitFor(() => expect(screen.getByText('to-delete.txt')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer to-delete.txt' }));

    // La confirmation est une surface du produit, plus une boîte navigateur :
    // rien n'est supprimé tant qu'elle n'a pas été validée.
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toMatch(/to-delete\.txt/);
    expect(mockDeleteDoc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalledWith('doc-1');
    });
  });

  it('cancels delete when the confirmation is dismissed', async () => {
    mockListDocs.mockResolvedValue([
      {
        id: 'doc-1',
        file_name: 'to-keep.txt',
        mime_type: 'text/plain',
        file_size: 10,
        status: 'active',
        created_at: '2026-07-01T10:00:00Z',
      },
    ]);

    renderView();
    await waitFor(() => expect(screen.getByText('to-keep.txt')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer to-keep.txt' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });
});
