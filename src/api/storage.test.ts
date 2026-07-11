import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: mockStorageFrom,
    },
  },
}));

describe('storage api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('uploadImage uploads to bucket with timestamp path', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    mockStorageFrom.mockReturnValue({
      upload,
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn/post_images/1.jpg' } }),
    });

    const { uploadImage } = await import('./storage');
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
    const url = await uploadImage(file, 'post_images');

    expect(mockStorageFrom).toHaveBeenCalledWith('post_images');
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.jpg$/), file);
    expect(url).toBe('https://cdn/post_images/1.jpg');
  });

  it('uploadImage rejects invalid file before upload', async () => {
    const { uploadImage } = await import('./storage');
    const file = new File([new Uint8Array(10)], 'doc.pdf', { type: 'application/pdf' });

    await expect(uploadImage(file, 'post_images')).rejects.toThrow(/non supporté/i);
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });

  it('uploadImage propagates storage errors', async () => {
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: new Error('storage fail') }),
      getPublicUrl: vi.fn(),
    });

    const { uploadImage } = await import('./storage');
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });

    await expect(uploadImage(file, 'post_images')).rejects.toThrow('storage fail');
  });
});
