import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  buildChatHistorySlice,
  chat,
  chatErrorBannerMessage,
  sync,
  syncErrorAlertMessage,
  type ChatHistoryMessage,
} from '@/api/chatRag';
import { useAuthStore } from '@/stores/authStore';
import { formatMessage } from '@/features/social/chat/formatMessage';

export default function ChatView() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);

  const [messages, setMessages] = useState<ChatHistoryMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chatWindowRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isThinking, error]);

  async function sendMessage() {
    if (!inputMessage.trim() || isThinking) return;

    const userMsg = inputMessage.trim();
    const nextMessages: ChatHistoryMessage[] = [
      ...messages,
      { role: 'user', content: userMsg },
    ];
    setMessages(nextMessages);
    setInputMessage('');
    setIsThinking(true);
    setError(null);

    const historySlice = buildChatHistorySlice(nextMessages);

    try {
      const text = await chat({ message: userMsg, history: historySlice });
      setMessages((prev) => [...prev, { role: 'model', content: text }]);
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
  }

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
        ? `\n\nDétails: ${data.details.dataSize} caractères, Store: ${data.details.storeName}`
        : '';
      alert((data.message || 'Synchronisation réussie !') + details);
    } catch (err) {
      console.error('Sync Error:', err);
      alert(syncErrorAlertMessage(err));
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl h-[calc(100dvh-90px)] md:h-[80vh] flex flex-col">
      {/* Header */}
      <div className="hidden md:flex glass-card p-3 md:p-4 mb-2 md:mb-4 justify-between items-center bg-gradient-to-r from-blue-600/20 to-teal-500/20 shrink-0">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
          <div className="bg-white/20 p-1.5 md:p-2 rounded-full shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6 md:w-8 md:h-8 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12.375m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-bold text-white drop-shadow-md truncate">
              Saint-Denis Connect
            </h2>
            <p className="text-xs md:text-sm text-white/80 truncate">Votre assistant virtuel</p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {profile && profile.role === 'admin' ? (
            <button
              type="button"
              onClick={() => void syncKnowledge()}
              disabled={isSyncing}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-2 py-1 md:px-3 md:py-1 rounded-full transition border border-white/20"
              title="Mettre à jour les connaissances"
            >
              {isSyncing ? (
                <span className="animate-spin inline-block">↻</span>
              ) : (
                <>
                  <span className="hidden md:inline">↻ Mettre à jour</span>
                  <span className="md:hidden">↻</span>
                </>
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-white/10 hover:bg-white/20 text-white p-1.5 md:p-2 rounded-full transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-5 h-5 md:w-6 md:h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        className="flex-1 p-2 md:p-6 overflow-y-auto md:mb-4 space-y-3 md:space-y-4 flex flex-col md:bg-white/30 md:backdrop-blur-lg md:border md:border-white/20 md:shadow-lg md:rounded-3xl min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center p-4 md:p-8 text-slate-600">
            <p className="text-lg font-semibold mb-2">Bonjour ! 👋</p>
            <p className="text-sm md:text-base">
              Je suis votre assistant virtuel. Posez-moi des questions sur :
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="bg-blue-100 text-blue-800 text-[10px] md:text-xs px-2 py-1 md:px-3 rounded-full border border-blue-200">
                Les événements
              </span>
              <span className="bg-green-100 text-green-800 text-[10px] md:text-xs px-2 py-1 md:px-3 rounded-full border border-green-200">
                Les quartiers
              </span>
              <span className="bg-purple-100 text-purple-800 text-[10px] md:text-xs px-2 py-1 md:px-3 rounded-full border border-purple-200">
                Les démarches
              </span>
              <span className="bg-orange-100 text-orange-800 text-[10px] md:text-xs px-2 py-1 md:px-3 rounded-full border border-orange-200">
                Les actualités
              </span>
            </div>
          </div>
        ) : null}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={[
              'max-w-[90%] md:max-w-[80%] p-3 md:p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed animate-fade-in',
              msg.role === 'user'
                ? 'self-end bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
                : 'self-start bg-white text-slate-800 rounded-bl-none border border-slate-100',
            ].join(' ')}
          >
            {msg.role === 'model' ? (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🤖</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div
                    className="prose prose-sm max-w-none whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
              </div>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}

        {isThinking ? (
          <div
            data-testid="chat-thinking"
            className="self-start bg-white/50 p-3 rounded-2xl rounded-bl-none flex items-center gap-2"
          >
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0s' }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            />
          </div>
        ) : null}

        {error ? (
          <div
            data-testid="chat-error"
            className="self-center bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm border border-red-200"
          >
            {error}
          </div>
        ) : null}
      </div>

      {/* Input Area */}
      <div className="p-2 md:p-2 flex gap-2 items-center bg-white border-t border-gray-200 md:bg-white/30 md:backdrop-blur-lg md:border md:border-white/20 md:shadow-lg md:rounded-3xl shrink-0">
        <input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyUp={onInputKeyUp}
          type="text"
          placeholder="Posez votre question ici..."
          className="flex-1 bg-white/50 border-none outline-none p-2 md:p-3 rounded-lg md:rounded-xl text-sm md:text-base placeholder-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-400/50 transition min-w-0"
          disabled={isThinking}
          data-testid="chat-input"
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={!inputMessage.trim() || isThinking}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white p-2 md:p-3 rounded-lg md:rounded-xl transition shadow-lg flex items-center justify-center shrink-0"
          data-testid="chat-send"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5 md:w-6 md:h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </div>

      <style>{`
        .animate-fade-in {
          animation: chatFadeIn 0.3s ease-out forwards;
        }
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
