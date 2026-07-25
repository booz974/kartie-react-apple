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
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import Notice from '@/components/ui/Notice';
import { useToast } from '@/components/ui/Toast';
import type { CategoryKey } from '@/design/categories';
import { useAuthStore } from '@/stores/authStore';
import { formatMessage } from '@/features/social/chat/formatMessage';

/**
 * Amorces de conversation. Chacune porte son émoji et sa teinte : une rangée de
 * pilules colorées invite à cliquer là où quatre lignes grises ne disent rien.
 */
const SUGGESTIONS: { emoji: string; text: string; tone: CategoryKey }[] = [
  { emoji: '🎉', text: 'Quels événements ont lieu cette semaine ?', tone: 'event' },
  { emoji: '🚨', text: 'Que faire pour signaler un lampadaire cassé ?', tone: 'petition' },
  { emoji: '📍', text: 'Parlez-moi du quartier du Chaudron', tone: 'quartier' },
  { emoji: '🗳️', text: 'Comment participer à une consultation ?', tone: 'consult' },
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

  /*
   * Le clavier fait rétrécir le fil par le bas. La position de défilement, elle,
   * ne bouge pas : le dernier message se retrouve alors sous la ligne de flottaison,
   * juste au moment où on s'apprête à répondre. On le ramène donc, mais seulement
   * si la lecture était déjà en bas — remonter quelqu'un qui consultait
   * l'historique serait pire que le mal.
   */
  useEffect(() => {
    const el = chatWindowRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (!stickToBottomRef.current) return;
      // Sans animation : c'est un rattrapage de mise en page, pas l'arrivée
      // d'un message.
      el.scrollTop = el.scrollHeight;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    //
    // Moins, aussi, la place prise par le clavier. `100dvh` ne rétrécit pas à
    // son ouverture sur iOS : sans ce retrait, la zone de saisie passerait
    // derrière les touches, et on écrirait sans voir son texte.
    <div
      className="mx-auto flex w-full max-w-3xl flex-col px-4 md:px-6"
      style={{
        height: 'calc(100dvh - var(--k-nav-height) - var(--k-keyboard-inset, 0px))',
      }}
    >
      <header className="k-hairline-bottom flex shrink-0 items-center gap-3 py-3">
        <Chip tone="accent" size={40}>
          ✨
        </Chip>

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
          <div className="k-animate-rise flex flex-col items-center gap-5 py-8 text-center">
            <Chip tone="accent" size={72}>
              👋
            </Chip>
            <div>
              <p className="k-title-2">Bonjour !</p>
              <p className="k-subhead k-ink-secondary k-measure mt-2">
                Les événements, les quartiers, les démarches, les actualités : posez la question
                dans vos mots.
              </p>
            </div>

            <ul className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion.text}>
                  <button
                    type="button"
                    onClick={() => void sendMessage(suggestion.text)}
                    style={{ backgroundColor: `var(--k-cat-${suggestion.tone}-soft)` }}
                    className="k-press k-footnote inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-left font-semibold hover:shadow-md"
                  >
                    <span aria-hidden="true" className="text-base leading-none">
                      {suggestion.emoji}
                    </span>
                    <span style={{ color: `var(--k-cat-${suggestion.tone}-ink)` }}>
                      {suggestion.text}
                    </span>
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
                  ? // La bulle de l'utilisateur est un aplat de l'accent en
                    // dégradé : c'est elle qui porte la couleur du fil.
                    'k-animate-rise max-w-[85%] self-end rounded-2xl rounded-br-sm bg-accent-gradient px-4 py-2.5 text-ink-on-accent shadow-md'
                  : 'k-animate-rise flex max-w-[92%] gap-2.5 self-start'
              }
            >
              {msg.role === 'model' ? (
                <>
                  <Chip tone="accent" size={30} className="mt-0.5">
                    ✨
                  </Chip>
                  <div className="k-glass min-w-0 flex-1 rounded-2xl rounded-bl-sm px-4 py-3">
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
              className="k-animate-rise flex max-w-[92%] items-center gap-2.5 self-start"
            >
              <Chip tone="accent" size={30}>
                ✨
              </Chip>
              <span className="k-glass k-footnote k-ink-secondary inline-flex items-center gap-2 rounded-2xl rounded-bl-sm px-4 py-3">
                {/* Trois points qui battent : l'attente reste vivante sans
                    devenir un mouvement vestibulaire. */}
                <span aria-hidden="true" className="flex items-center gap-1">
                  <span className="k-badge__dot k-badge__dot--live bg-accent" />
                  <span
                    className="k-badge__dot k-badge__dot--live bg-accent"
                    style={{ animationDelay: '160ms' }}
                  />
                  <span
                    className="k-badge__dot k-badge__dot--live bg-accent"
                    style={{ animationDelay: '320ms' }}
                  />
                </span>
                L&apos;assistant rédige sa réponse…
              </span>
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
        style={{
          // La réserve de zone sûre se résorbe à mesure que le clavier monte :
          // le geste de retour à l'accueil n'existe plus quand les touches
          // occupent le bas, et la réserve ne serait qu'un vide.
          paddingBottom:
            'calc(0.75rem + max(0px, calc(var(--k-safe-bottom) - var(--k-keyboard-inset, 0px))))',
        }}
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
