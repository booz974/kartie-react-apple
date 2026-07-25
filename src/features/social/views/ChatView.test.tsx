import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const chatMock = vi.fn();
const syncMock = vi.fn();

vi.mock('@/api/chatRag', async () => {
  const actual = await vi.importActual<typeof import('@/api/chatRag')>('@/api/chatRag');
  return {
    ...actual,
    chat: (...args: unknown[]) => chatMock(...args),
    sync: (...args: unknown[]) => syncMock(...args),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { profile: null }) => unknown) =>
    selector({ profile: null }),
}));

import { ToastProvider } from '@/components/ui/Toast';
import ChatView from './ChatView';

// La vue signale la synchronisation admin par une notification : elle a donc
// besoin du fournisseur, comme dans l'application.
function renderChat() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ChatView />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatMock.mockResolvedValue('Réponse fixture déterministe');
  });

  it('shows empty welcome and disables send when input empty', () => {
    renderChat();
    expect(screen.getByText(/Bonjour !/)).toBeTruthy();
    expect((screen.getByTestId('chat-send') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends on button click: user visible, loading, then assistant', async () => {
    let resolveChat: (v: string) => void = () => {};
    chatMock.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveChat = resolve;
        }),
    );

    renderChat();
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: '  Quels événements ?  ' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    expect(screen.getByText('Quels événements ?')).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByTestId('chat-thinking')).toBeTruthy();

    resolveChat('Réponse fixture déterministe');
    await waitFor(() => {
      expect(screen.getByText('Réponse fixture déterministe')).toBeTruthy();
    });
    expect(screen.queryByTestId('chat-thinking')).toBeNull();
    expect(chatMock).toHaveBeenCalledWith({
      message: 'Quels événements ?',
      history: [],
    });
  });

  it('sends on Enter keyup', async () => {
    renderChat();
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyUp(input, { key: 'Enter' });

    await waitFor(() => expect(chatMock).toHaveBeenCalled());
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('does not send when input is only whitespace', () => {
    renderChat();
    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: '   ' } });
    expect((screen.getByTestId('chat-send') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyUp(input, { key: 'Enter' });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it('shows error banner and re-enables input on failure', async () => {
    chatMock.mockRejectedValue(new Error('Boom'));
    renderChat();
    const input = screen.getByTestId('chat-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'fail please' } });
    fireEvent.click(screen.getByTestId('chat-send'));

    await waitFor(() => {
      expect(screen.getByTestId('chat-error').textContent).toContain('Boom');
    });
    expect(input.disabled).toBe(false);
  });
});
