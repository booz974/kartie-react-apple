import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockGetProfile = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/api/profiles', () => ({
  getProfile: mockGetProfile,
  updateQuartier: vi.fn(),
}));

describe('authStore bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mockGetProfile.mockResolvedValue(null);
  });

  it('sets ready after session resolution', async () => {
    const { waitForAuthReady, useAuthStore } = await import('./authStore');
    await waitForAuthReady();
    expect(useAuthStore.getState().ready).toBe(true);
    expect(mockGetSession).toHaveBeenCalled();
  });

  it('tolerates profile 406 via getProfile returning null', async () => {
    mockGetProfile.mockRejectedValueOnce({ status: 406 });
    const { waitForAuthReady, useAuthStore } = await import('./authStore');
    await waitForAuthReady();
    expect(useAuthStore.getState().profile).toBeNull();
  });
});
