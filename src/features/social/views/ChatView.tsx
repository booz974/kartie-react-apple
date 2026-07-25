import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  buildChatHistorySlice,
  chat,
  chatErrorBannerMessage,
  sync,
  syncErrorAlertMessage,
  type ChatHistoryMessage,
} from '@/api/chatRag';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';
import { formatMessage } from '@/features/social/chat/formatMessage';

const SUGGESTIONS = [
  'Quels événements ont lieu cette semaine ?',
  'Que faire pour signaler un lampadaire cassé ?',
  'Parlez-moi du quartier du Chaudron',
  'Comment participer à une consultation ?',
];

/** Au-delà de ce reste de défilement, on considère que l'utilisateur a remonté. */
const STICK_THRESHOLD = 80;

export default function ChatView() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const toast = useToast();

  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatWindowRef = useRef<HTMLDivElement>(null);
  // Tant que l'utilisateur est en bas, on l'y garde. S'il est remonté lire
  // l'historique, un nouveau message ne doit pas lui arracher sa lecture.
  const stickToBottomRef = useRef(true);

  function onScroll() {
    const el = chatWindowRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= STICK_THRESHOLD;
  }

  useEffect(() => {
    const el = chatWindowRef.current;
    if (!el || !stickToBottomRef.current) return;

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isThinking, error]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const userMsg = (text ?? inputMessage).trim();
      if (!userMsg || isThinking) return;

      const nextMessages: ChatHistoryMessage[] = [...messages, { role: 'user', content: userMsg }];
      // L'envoi collant : un message qu'on vient d'écrire ramène toujours en bas.
      stickToBottomRef.current = true;
      setMessages(nextMessages);
      setInputMessage('');
      setIsThinking(true);
      setError(null);

      const historySlice = buildChatHistorySlice(nextMessages);

      try {
        const responseText = await chat({ message: userMsg, history: historySlice });
        setMessages((prev) => [...prev, { role: 'model', content: responseText }]);
      } catch (err) {
        console.error('Chat Error:', err);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'model' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        setError(chatErrorBannerMessage(err));
      } finally {
        setIsThinking(false);
      }
    },
    [inputMessage, isThinking, messages],
  );

  function onInputKeyUp(e: KeyboardEvent<HTMLInputElement>) {
    // Vue parity: @keyup.enter="sendMessage" on type="text" input
    if (e.key === 'Enter') {
      void sendMessage();
    }
  }

  async function syncKnowledge() {
    setIsSyncing(true);
    try {
      const data = await sync();
      const details = data.details
        ? `${data.details.dataSize} caractères, base « ${data.details.storeName} »`
        : undefined;
      toast.success(data.message || 'Synchronisation réussie', details);
    } catch (err) {
      console.error('Sync Error:', err);
      toast.error('Synchronisation impossible', syncErrorAlertMessage(err));
    } finally {
      setIsSyncing(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    // La vue est immersive : AppShell masque la barre d'onglets et le pied de
    // page, la hauteur restante est donc l'écran moins la barre supérieure.
    <div
      className="mx-auto flex w-full max-w-3xl flex-col px-4 md:px-6"
      style={{ height: 'calc(100dvh - var(--k-nav-height))' }}
    >
      <header className="k-hairline-bottom flex shrink-0 items-center gap-3 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name="robot" size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="k-title-3 truncate">Assistant Kartie</h1>
          <p className="k-caption k-ink-tertiary truncate">
            Les informations de Saint-Denis, en une question
          </p>
        </div>

        {profile && profile.role === 'admin' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void syncKnowledge()}
            loading={isSyncing}
            leading={<Icon name="refresh" size={16} />}
            aria-label="Mettre à jour les connaissances de l'assistant"
          >
            <span className="hidden md:inline">Mettre à jour</span>
          </Button>
        ) : null}

        <Button
          variant="ghost"
          iconOnly
          size="sm"
          onClick={() => navigate(-1)}
          aria-label="Quitter l'assistant"
        >
          <Icon name="close" size={18} />
        </Button>
      </header>

      <div
        ref={chatWindowRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto py-5"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-5 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
              <Icon name="sparkles" size={26} />
            </span>
            <div>
              <p className="k-title-2">Bonjour !</p>
              <p className="k-subhead k-ink-secondary k-measure mt-2">
                Les événements, les quartiers, les démarches, les actualités — posez la question
                dans vos mots.
              </p>
            </div>

            <ul className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="k-press k-footnote k-ink-secondary rounded-full bg-surface-secondary px-4 py-2 text-left hover:bg-surface-tertiary hover:text-ink"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Seule la zone qui reçoit les nouveaux messages est annoncée : mettre
            aria-live sur tout le conteneur relirait l'historique entier. */}
        <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === 'user'
                  ? 'k-animate-rise max-w-[85%] self-end rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-white'
                  : 'k-animate-rise flex max-w-[92%] gap-3 self-start'
              }
            >
              {msg.role === 'model' ? (
                <>
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon name="robot" size={15} />
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-surface px-4 py-3">
                    <span className="k-visually-hidden">Assistant :</span>
                    <div
                      className="k-body k-ink whitespace-pre-line [&_strong]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  </div>
                </>
              ) : (
                <div className="k-body whitespace-pre-line">{msg.content}</div>
              )}
            </div>
          ))}

          {isThinking ? (
            <div
              data-testid="chat-thinking"
              className="k-footnote k-ink-tertiary flex items-center gap-2 self-start rounded-2xl rounded-bl-sm bg-surface px-4 py-3"
            >
              <Icon name="sparkles" size={15} />
              L&apos;assistant rédige sa réponse…
            </div>
          ) : null}

          {error ? (
            <div data-testid="chat-error" className="self-stretch">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}
        </div>
      </div>

      {/* La barre de saisie flotte réellement au-dessus du fil qui défile :
          c'est le seul endroit où le matériau translucide est justifié. */}
      <div
        className="k-material-chrome k-material-edge-top -mx-4 shrink-0 px-4 py-3 md:-mx-6 md:px-6"
        style={{ paddingBottom: 'calc(0.75rem + var(--k-safe-bottom))' }}
      >
        <div className="flex items-center gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyUp={onInputKeyUp}
            type="text"
            placeholder="Posez votre question…"
            aria-label="Votre question"
            className="min-w-0 flex-1"
            disabled={isThinking}
            data-testid="chat-input"
          />
          <Button
            variant="primary"
            iconOnly
            onClick={() => void sendMessage()}
            disabled={!inputMessage.trim() || isThinking}
            aria-label="Envoyer la question"
            data-testid="chat-send"
          >
            <Icon name="send" size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
