import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CreatePost from './CreatePost';

vi.mock('@/features/social/components/LocationPicker', () => ({
  default: ({
    onLocationChange,
  }: {
    onLocationChange: (location: { lat: number; lng: number }) => void;
  }) => (
    <button type="button" onClick={() => onLocationChange({ lat: -20.88, lng: 55.45 })}>
      Set location
    </button>
  ),
}));

vi.mock('@/components/ui/ImageUploader', () => ({
  default: ({
    onUploadSuccess,
    bucketName,
  }: {
    onUploadSuccess?: (url: string) => void;
    bucketName?: string;
  }) => (
    <button
      type="button"
      data-bucket={bucketName}
      onClick={() => onUploadSuccess?.('https://cdn/post_images/test.jpg')}
    >
      Mock upload
    </button>
  ),
}));

describe('CreatePost', () => {
  it('renders 6 creatable post types', () => {
    render(<CreatePost quartier={null} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Message/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Entraide/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Perdu\/Trouvé/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Alerte/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Signalement/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Place du Village/ })).toBeTruthy();
  });

  it('disables publish when signalement has no location', () => {
    render(<CreatePost quartier={null} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Signalement/ }));
    fireEvent.change(screen.getByPlaceholderText(/Plus on est précis/i), {
      target: { value: 'Trou dans la route' },
    });

    const publishBtn = screen.getByRole('button', { name: 'Publier' }) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);
  });

  it('submits signalement with metadata including location and status', () => {
    const onSubmit = vi.fn();
    render(<CreatePost quartier={null} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /Signalement/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Set location' }));
    fireEvent.change(screen.getByPlaceholderText(/Plus on est précis/i), {
      target: { value: 'Trou dans la route' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publier' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.post_type).toBe('signalement');
    expect(payload.metadata.location).toEqual({ lat: -20.88, lng: 55.45 });
    expect(payload.metadata.status).toBe('submitted');
    expect(Array.isArray(payload.metadata.history)).toBe(true);
  });

  it('includes image_url in metadata after upload', () => {
    const onSubmit = vi.fn();
    render(<CreatePost quartier={null} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText(/Partagez une idée/i), {
      target: { value: 'Photo post' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mock upload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publier' }));

    expect(onSubmit.mock.calls[0][0].metadata.image_url).toBe('https://cdn/post_images/test.jpg');
  });
});
