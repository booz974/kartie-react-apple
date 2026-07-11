import { getEdgeFunctionToken } from '@/api/edgeFunctionAuth';
import { supabase, supabaseAnonKey, supabaseFunctionsUrl } from '@/lib/supabase';

const CHAT_URL = `${supabaseFunctionsUrl}/chat-rag`;
const CHAT_TIMEOUT_MS = 55_000;
const SYNC_TIMEOUT_MS = 60_000;
const DOC_TIMEOUT_MS = 60_000;

export type ChatRole = 'user' | 'model';

export type ChatHistoryMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRagErrorCode =
  | 'QUOTA_EXCEEDED'
  | 'API_KEY_INVALID'
  | 'NO_FILE_SEARCH_STORE'
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'NETWORK';

export class ChatRagError extends Error {
  code: ChatRagErrorCode;
  status?: number;

  constructor(code: ChatRagErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'ChatRagError';
    this.code = code;
    this.status = status;
  }
}

export type SyncResult = {
  success?: boolean;
  message?: string;
  details?: {
    dataSize?: number;
    storeName?: string;
    fileUploaded?: string;
    counts?: Record<string, number>;
  };
  error?: string;
};

export type RagDocument = {
  id: string | number;
  file_name: string;
  display_name?: string;
  mime_type?: string;
  file_size?: number;
  gemini_file_name?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new ChatRagError('TIMEOUT', 'TIMEOUT')), ms),
    ),
  ]);
}

async function publicChatHeaders(): Promise<Record<string, string>> {
  const token = await getEdgeFunctionToken({ requireSession: false });
  const authToken = token || supabaseAnonKey;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
    apikey: authToken,
  };
}

async function sessionHeaders(requireSession: boolean): Promise<Record<string, string>> {
  if (requireSession) {
    const token = await getEdgeFunctionToken({ requireSession: true });
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: token as string,
    };
  }

  const { data } = await supabase.auth.getSession();
  const authToken = data?.session?.access_token ?? supabaseAnonKey;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };
}

function parseSseText(rawText: string): string {
  let fullText = '';
  for (const line of rawText.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    try {
      const chunk = JSON.parse(line.slice(6).trim()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) fullText += text;
    } catch {
      // ignore malformed SSE lines (Vue parity)
    }
  }
  return fullText;
}

function mapHttpError(status: number, rawText: string): never {
  let errMsg = `Erreur ${status}`;
  try {
    const errData = JSON.parse(rawText) as { message?: string; error?: string };
    errMsg = errData.message || errData.error || errMsg;
    if (status === 429) {
      throw new ChatRagError('QUOTA_EXCEEDED', 'QUOTA_EXCEEDED', status);
    }
    if (status === 403) {
      throw new ChatRagError('API_KEY_INVALID', 'API_KEY_INVALID', status);
    }
    if (errData.error === 'NO_FILE_SEARCH_STORE') {
      throw new ChatRagError('NO_FILE_SEARCH_STORE', 'NO_FILE_SEARCH_STORE', status);
    }
  } catch (e) {
    if (e instanceof ChatRagError) throw e;
  }
  throw new ChatRagError('HTTP_ERROR', errMsg, status);
}

function parseChatSuccess(contentType: string, rawText: string): string {
  if (contentType.includes('text/event-stream')) {
    const fullText = parseSseText(rawText);
    if (!fullText.trim()) {
      return "Désolé, je n'ai pas trouvé d'information pertinente.";
    }
    return fullText;
  }

  try {
    const data = JSON.parse(rawText) as { response?: string };
    const text = data.response || '';
    return text.trim() || "Désolé, je n'ai pas pu générer de réponse.";
  } catch {
    return rawText.trim() || 'Réponse reçue mais format inattendu.';
  }
}

export function buildChatHistorySlice(messages: ChatHistoryMessage[]): ChatHistoryMessage[] {
  return messages.filter((m) => m.content).slice(-5, -1);
}

export async function chat(params: {
  message: string;
  history: ChatHistoryMessage[];
}): Promise<string> {
  const headers = await publicChatHeaders();

  let response: Response;
  try {
    response = await withTimeout(
      fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'chat',
          message: params.message,
          history: params.history,
        }),
      }),
      CHAT_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof ChatRagError) throw err;
    throw new ChatRagError(
      'NETWORK',
      err instanceof Error ? err.message : 'Erreur réseau',
    );
  }

  let rawText: string;
  try {
    rawText = await withTimeout(response.text(), CHAT_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof ChatRagError) throw err;
    throw new ChatRagError(
      'NETWORK',
      err instanceof Error ? err.message : 'Erreur réseau',
    );
  }

  if (!response.ok) {
    mapHttpError(response.status, rawText);
  }

  const contentType = response.headers.get('content-type') || '';
  return parseChatSuccess(contentType, rawText);
}

export async function sync(): Promise<SyncResult> {
  const headers = await sessionHeaders(false);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    const response = await fetch(CHAT_URL, {
      signal: controller.signal,
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'sync' }),
    });

    const data = (await response.json()) as SyncResult;

    if (!response.ok) {
      throw new ChatRagError(
        'HTTP_ERROR',
        data.message || data.error || `Erreur ${response.status}`,
        response.status,
      );
    }

    if (data.error) {
      throw new ChatRagError('HTTP_ERROR', data.message || data.error);
    }

    return data;
  } catch (err) {
    if (err instanceof ChatRagError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ChatRagError('TIMEOUT', 'TIMEOUT');
    }
    throw new ChatRagError(
      'NETWORK',
      err instanceof Error ? err.message : 'Erreur réseau',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadDoc(params: {
  fileName: string;
  mimeType: string;
  fileBase64: string;
}): Promise<SyncResult> {
  const headers = await sessionHeaders(true);

  let response: Response;
  try {
    response = await withTimeout(
      fetch(CHAT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'upload-doc',
          fileName: params.fileName,
          mimeType: params.mimeType,
          fileBase64: params.fileBase64,
        }),
      }),
      DOC_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof ChatRagError) throw err;
    throw new ChatRagError(
      'NETWORK',
      err instanceof Error ? err.message : 'Erreur réseau',
    );
  }

  const data = (await response.json()) as SyncResult;
  if (!response.ok || data.error) {
    throw new ChatRagError(
      'HTTP_ERROR',
      data.message || data.error || `Erreur ${response.status}`,
      response.status,
    );
  }
  return data;
}

export async function listDocs(): Promise<RagDocument[]> {
  const headers = await sessionHeaders(true);
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'list-docs' }),
  });
  const data = (await response.json()) as { documents?: RagDocument[] };
  return data.documents || [];
}

export async function deleteDoc(docId: string | number): Promise<SyncResult> {
  const headers = await sessionHeaders(true);
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'delete-doc', message: docId }),
  });
  const data = (await response.json()) as SyncResult;
  if (!response.ok || data.error) {
    throw new ChatRagError(
      'HTTP_ERROR',
      data.message || data.error || `Erreur ${response.status}`,
      response.status,
    );
  }
  return data;
}

/** Map ChatRagError to the exact Vue UI banner strings. */
export function chatErrorBannerMessage(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const code = err instanceof ChatRagError ? err.code : message;

  if (code === 'QUOTA_EXCEEDED' || message === 'QUOTA_EXCEEDED') {
    return "⚠️ Le quota de l'API IA est épuisé. L'administrateur doit activer la facturation sur Google AI Studio.";
  }
  if (code === 'API_KEY_INVALID' || message === 'API_KEY_INVALID') {
    return '⚠️ La clé API Gemini est invalide. Contactez l\'administrateur.';
  }
  if (code === 'NO_FILE_SEARCH_STORE' || message === 'NO_FILE_SEARCH_STORE') {
    return "⚠️ La base de connaissances n'a pas été synchronisée. Cliquez sur 'Mettre à jour les connaissances'.";
  }
  if (code === 'TIMEOUT' || message === 'TIMEOUT') {
    return '⏱️ La requête a pris trop de temps (55s). Réessayez.';
  }
  return 'Erreur: ' + (message || 'Réessayez.');
}

export function syncErrorAlertMessage(err: unknown): string {
  if (err instanceof ChatRagError && err.code === 'TIMEOUT') {
    return "La mise à jour a dépassé 60 secondes.\n\nSi le problème persiste, utilisez le script CLI:\nnpm run sync";
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return "La mise à jour a dépassé 60 secondes.\n\nSi le problème persiste, utilisez le script CLI:\nnpm run sync";
  }
  const message = err instanceof Error ? err.message : String(err);
  return (
    'Erreur lors de la mise à jour : ' +
    message +
    '\n\nVérifiez les logs Supabase (Edge Functions > chat-rag > Logs).'
  );
}

/** Vue AdminRagView upload status banner (exact strings). */
export function uploadDocStatusMessage(err: unknown): string {
  if (err instanceof ChatRagError && err.code === 'TIMEOUT') {
    return "L'envoi a pris trop de temps (60s). Réessayez avec un fichier plus petit.";
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'TIMEOUT') {
    return "L'envoi a pris trop de temps (60s). Réessayez avec un fichier plus petit.";
  }
  return 'Erreur: ' + (message || 'Réessayez.');
}

/** Encode File → base64 (chunked, Vue AdminRagView parity). */
export async function fileToBase64(file: Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function formatRagFileSize(bytes?: number | null): string {
  if (!bytes) return '0 o';
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

export function formatRagDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ragFileIcon(mimeType?: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType.includes('pdf')) return '📕';
  if (
    mimeType.includes('csv') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    return '📊';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
  if (mimeType.includes('markdown') || mimeType.includes('md')) return '📝';
  if (mimeType.includes('html')) return '🌐';
  return '📄';
}
