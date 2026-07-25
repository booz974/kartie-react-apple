import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Icon, { type IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Millisecondes avant disparition automatique. 0 pour la rendre persistante. */
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastRecord = ToastInput & { id: number; leaving?: boolean };

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'checkCircle',
  error: 'alert',
  warning: 'warning',
  info: 'info',
};

type ToastApi = {
  toast: (input: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Retours éphémères : confirmation d'une action, échec d'une requête.
 *
 * Ils remplacent `alert()`, qui bloquait le fil d'exécution, sortait du
 * produit visuellement et n'offrait aucune action de rattrapage.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans un ToastProvider.');
  }
  return context;
}

const MAX_VISIBLE = 3;
const EXIT_DURATION = 220;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const remove = useCallback((id: number) => {
    // On joue d'abord la sortie, on démonte ensuite : sans ça la notification
    // disparaîtrait d'un coup, sans lien avec son arrivée.
    setToasts((current) =>
      current.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, EXIT_DURATION);
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const tone = input.tone ?? 'info';
      // Une erreur reste plus longtemps : elle demande à être lue, pas aperçue.
      const duration = input.duration ?? (tone === 'error' ? 7000 : 4500);

      setToasts((current) => {
        const next = [...current, { ...input, tone, id }];
        return next.slice(-MAX_VISIBLE);
      });

      if (duration > 0) {
        timers.current.set(id, window.setTimeout(() => remove(id), duration));
      }
    },
    [remove],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: 'success' }),
      error: (title, description) => toast({ title, description, tone: 'error' }),
      warning: (title, description) => toast({ title, description, tone: 'warning' }),
      info: (title, description) => toast({ title, description, tone: 'info' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="k-toast-region">
              {toasts.map((item) => (
                <div
                  key={item.id}
                  className="k-toast"
                  data-leaving={item.leaving ? 'true' : undefined}
                  // Une erreur interrompt la lecture en cours, le reste attend.
                  role={item.tone === 'error' ? 'alert' : 'status'}
                  aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
                >
                  <Icon
                    name={TONE_ICON[item.tone ?? 'info']}
                    size={18}
                    className={`k-toast__icon k-toast__icon--${item.tone ?? 'info'}`}
                  />
                  <div className="k-toast__content">
                    <p className="k-toast__title">{item.title}</p>
                    {item.description ? (
                      <p className="k-toast__description">{item.description}</p>
                    ) : null}
                    {item.action ? (
                      <button
                        type="button"
                        className="k-btn k-btn--plain k-footnote mt-1 font-semibold"
                        onClick={() => {
                          item.action?.onClick();
                          remove(item.id);
                        }}
                      >
                        {item.action.label}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    aria-label="Masquer la notification"
                    className="k-btn k-btn--ghost k-btn--icon k-btn--sm -mr-1 -mt-1"
                  >
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
