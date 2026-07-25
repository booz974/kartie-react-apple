import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
  supabaseAnonKey: 'anon-key-test',
  supabaseFunctionsUrl: 'https://example.supabase.co/functions/v1',
}));

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

describe('chatRag api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  it('buildChatHistorySlice keeps up to 4 prior messages excluding current', async () => {
    const { buildChatHistorySlice } = await import('./chatRag');
    const messages = [
      { role: 'user' as const, content: 'a' },
      { role: 'model' as const, content: 'b' },
      { role: 'user' as const, content: 'c' },
      { role: 'model' as const, content: 'd' },
      { role: 'user' as const, content: 'e' },
      { role: 'model' as const, content: 'f' },
      { role: 'user' as const, content: 'current' },
    ];
    expect(buildChatHistorySlice(messages)).toEqual([
      { role: 'user', content: 'c' },
      { role: 'model', content: 'd' },
      { role: 'user', content: 'e' },
      { role: 'model', content: 'f' },
    ]);
  });

  it('chat sends action/message/history with anon fallback headers', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({ response: 'Bonjour Saint-Denis' }),
    );

    const { chat } = await import('./chatRag');
    const text = await chat({
      message: 'Quels événements ?',
      history: [{ role: 'user', content: 'hi' }],
    });

    expect(text).toBe('Bonjour Saint-Denis');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/chat-rag');
    expect(init?.method).toBe('POST');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer anon-key-test');
    expect(headers.apikey).toBe('anon-key-test');
    expect(JSON.parse(String(init?.body))).toEqual({
      action: 'chat',
      message: 'Quels événements ?',
      history: [{ role: 'user', content: 'hi' }],
    });
  });

  it('chat uses session token when available', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'user-jwt' } },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(jsonResponse({ response: 'ok' }));

    const { chat } = await import('./chatRag');
    await chat({ message: 'x', history: [] });

    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer user-jwt');
    expect(headers.apikey).toBe('user-jwt');
  });

  it('chat parses empty JSON response with fallback text', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ response: '   ' }));
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).resolves.toBe(
      "Désolé, je n'ai pas pu générer de réponse.",
    );
  });

  it('chat parses SSE block response', async () => {
    const sse =
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n' +
      'data: {"candidates":[{"content":{"parts":[{"text":"world"}]}}]}\n';
    vi.mocked(fetch).mockResolvedValue(
      new Response(sse, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).resolves.toBe('Hello world');
  });

  it('chat maps 429 to QUOTA_EXCEEDED', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'quota' }, { status: 429 }),
    );
    const { chat, ChatRagError } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).rejects.toBeInstanceOf(ChatRagError);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'quota' }, { status: 429 }),
    );
    await expect(chat({ message: 'x', history: [] })).rejects.toMatchObject({
      code: 'QUOTA_EXCEEDED',
    });
  });

  it('chat maps 403 to API_KEY_INVALID', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: 'forbidden' }, { status: 403 }),
    );
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).rejects.toMatchObject({
      code: 'API_KEY_INVALID',
    });
  });

  it('chat maps NO_FILE_SEARCH_STORE', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { error: 'NO_FILE_SEARCH_STORE', message: 'sync needed' },
        { status: 400 },
      ),
    );
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).rejects.toMatchObject({
      code: 'NO_FILE_SEARCH_STORE',
    });
  });

  it('chat maps generic HTTP error message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ message: 'Boom serveur' }, { status: 500 }),
    );
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Boom serveur',
    });
  });

  it('chat maps network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));
    const { chat } = await import('./chatRag');
    await expect(chat({ message: 'x', history: [] })).rejects.toMatchObject({
      code: 'NETWORK',
      message: 'Failed to fetch',
    });
  });

  it('sync posts action sync without apikey header', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'admin-jwt' } },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      jsonResponse({
        success: true,
        message: 'ok',
        details: { dataSize: 10, storeName: 'stores/x' },
      }),
    );

    const { sync } = await import('./chatRag');
    const result = await sync();
    expect(result.message).toBe('ok');
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer admin-jwt');
    expect(headers.apikey).toBeUndefined();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      action: 'sync',
    });
  });

  it('listDocs / uploadDoc / deleteDoc use requireSession headers', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'admin-jwt' } },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ documents: [{ id: 1, file_name: 'a.txt' }] }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'uploaded' }))
      .mockResolvedValueOnce(jsonResponse({ success: true, message: 'deleted' }));

    const { listDocs, uploadDoc, deleteDoc } = await import('./chatRag');
    await expect(listDocs()).resolves.toEqual([{ id: 1, file_name: 'a.txt' }]);
    await expect(
      uploadDoc({ fileName: 'a.txt', mimeType: 'text/plain', fileBase64: 'YQ==' }),
    ).resolves.toMatchObject({ success: true });
    await expect(deleteDoc(1)).resolves.toMatchObject({ success: true });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      action: 'list-docs',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      action: 'upload-doc',
      fileName: 'a.txt',
      mimeType: 'text/plain',
      fileBase64: 'YQ==',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
      action: 'delete-doc',
      message: 1,
    });
  });

  it('chatErrorBannerMessage maps typed codes to readable messages', async () => {
    const { ChatRagError, chatErrorBannerMessage } = await import('./chatRag');
    expect(chatErrorBannerMessage(new ChatRagError('QUOTA_EXCEEDED', 'QUOTA_EXCEEDED'))).toContain(
      'quota',
    );
    expect(chatErrorBannerMessage(new ChatRagError('TIMEOUT', 'TIMEOUT'))).toContain('55');
    // Le message est rendu dans un Notice qui porte déjà l'icône de gravité :
    // il ne se préfixe donc plus lui-même.
    expect(chatErrorBannerMessage(new Error('weird'))).toBe('weird');
    expect(chatErrorBannerMessage(new Error(''))).toContain('Réessayez');
  });

  it('uploadDocStatusMessage maps TIMEOUT and generic errors (Vue AdminRag)', async () => {
    const { ChatRagError, uploadDocStatusMessage } = await import('./chatRag');
    expect(uploadDocStatusMessage(new ChatRagError('TIMEOUT', 'TIMEOUT'))).toContain('60s');
    expect(uploadDocStatusMessage(new Error('Boom'))).toBe('Erreur: Boom');
  });

  it('fileToBase64 encodes blob chunked', async () => {
    const { fileToBase64 } = await import('./chatRag');
    const blob = new Blob(['ab'], { type: 'text/plain' });
    await expect(fileToBase64(blob)).resolves.toBe(btoa('ab'));
  });

  it('format helpers match Vue AdminRag display', async () => {
    const { formatRagFileSize, ragFileIcon } = await import('./chatRag');
    expect(formatRagFileSize(0)).toBe('0 o');
    expect(formatRagFileSize(2048)).toBe('2.0 Ko');
    expect(ragFileIcon('application/pdf')).toBe('📕');
    expect(ragFileIcon('text/markdown')).toBe('📝');
  });

  it('uploadDoc / deleteDoc throw ChatRagError on backend error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'admin-jwt' } },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'fail upload' }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ error: 'Document non trouvé' }, { status: 404 }));

    const { uploadDoc, deleteDoc } = await import('./chatRag');
    await expect(
      uploadDoc({ fileName: 'a.txt', mimeType: 'text/plain', fileBase64: 'YQ==' }),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR', message: 'fail upload' });
    await expect(deleteDoc(99)).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      message: 'Document non trouvé',
    });
  });
});
