import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUploader from './ImageUploader';

const mockUploadImage = vi.fn();

vi.mock('@/api/storage', () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

function createFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadImage.mockResolvedValue('https://example.com/uploads/123.jpg');
  });

  function getFileInput() {
    return document.querySelector('input[type="file"]') as HTMLInputElement;
  }

  it('rejects files over 2 Mo', async () => {
    mockUploadImage.mockRejectedValueOnce(new Error('Le fichier est trop lourd (max 2Mo).'));
    render(<ImageUploader />);

    const input = getFileInput();
    const bigFile = createFile('big.png', 'image/png', 2 * 1024 * 1024 + 1);
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/trop lourd/i)).toBeTruthy();
    });
    expect(mockUploadImage).toHaveBeenCalledWith(bigFile, 'uploads');
  });

  it('rejects unsupported file types', async () => {
    mockUploadImage.mockRejectedValueOnce(
      new Error('Format de fichier non supporté (PNG, JPG, GIF).'),
    );
    render(<ImageUploader />);

    const input = getFileInput();
    const pdf = createFile('doc.pdf', 'application/pdf', 1024);
    fireEvent.change(input, { target: { files: [pdf] } });

    await waitFor(() => {
      expect(screen.getByText(/non supporté/i)).toBeTruthy();
    });
  });

  it('uploads valid png with default uploads bucket', async () => {
    render(<ImageUploader />);

    const input = getFileInput();
    const file = createFile('photo.png', 'image/png', 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file, 'uploads');
    });
    expect(screen.getByAltText("Aperçu de l'image")).toBeTruthy();
  });

  it('uses custom bucket when provided', async () => {
    render(<ImageUploader bucketName="post_images" />);

    const input = getFileInput();
    const file = createFile('photo.jpeg', 'image/jpeg', 2048);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file, 'post_images');
    });
  });

  it('calls onUploadSuccess with public URL', async () => {
    const onSuccess = vi.fn();
    render(<ImageUploader onUploadSuccess={onSuccess} />);

    const input = getFileInput();
    const file = createFile('photo.gif', 'image/gif', 512);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('https://example.com/uploads/123.jpg');
    });
  });
});
