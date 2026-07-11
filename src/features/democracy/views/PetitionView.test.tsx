import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import PetitionView from '@/features/democracy/views/PetitionView';

const mockSupportPetition = vi.fn();
const mockUsePetition = vi.fn();
const mockUsePetitionSupportStatus = vi.fn();

vi.mock('@/api/democracy', () => ({
  supportPetition: (...args: unknown[]) => mockSupportPetition(...args),
}));

vi.mock('@/queries/democracy', () => ({
  usePetition: (...args: unknown[]) => mockUsePetition(...args),
  usePetitionSupportStatus: (...args: unknown[]) => mockUsePetitionSupportStatus(...args),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { session: { user: { id: string } } | null }) => unknown) =>
    selector({ session: { user: { id: 'user-uuid' } } }),
}));

function renderPetitionView() {
  return render(
    <MemoryRouter initialEntries={['/petitions/4']}>
      <Routes>
        <Route path="/petitions/:id" element={<PetitionView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PetitionView support path (D-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});

    mockUsePetition.mockReturnValue({
      data: {
        id: 4,
        title: 'Test petition',
        summary: 'Summary',
        source: 'Source',
        theme: 'Transport',
        supports: 5,
        quartier_id: 1,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    mockUsePetitionSupportStatus.mockReturnValue({
      data: new Set<number>(),
    });
  });

  it('calls RPC supportPetition on detail page (not direct insert)', async () => {
    mockSupportPetition.mockResolvedValue({
      success: false,
      error: { code: 'PGRST202', message: 'function not found' },
    });

    renderPetitionView();
    const btn = await screen.findByRole('button', { name: /soutenir cette pétition/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockSupportPetition).toHaveBeenCalledWith(4, 'user-uuid');
    });
    expect(window.alert).toHaveBeenCalledWith('Une erreur est survenue lors du soutien.');
  });

  it('does not mark petition as supported when RPC fails', async () => {
    mockSupportPetition.mockResolvedValue({
      success: false,
      error: { code: 'PGRST202' },
    });

    renderPetitionView();
    const btn = await screen.findByRole('button', { name: /soutenir cette pétition/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });

    expect(btn.textContent).not.toMatch(/Soutenu/);
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
