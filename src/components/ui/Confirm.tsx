import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  /** Formulé comme l'action elle-même : « Supprimer », pas « OK ». */
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` pour une action irréversible, `default` pour le reste. */
  tone?: 'default' | 'danger';
};

type ConfirmApi = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmApi | null>(null);

/**
 * Confirmation modale, en remplacement de `window.confirm`.
 *
 * À réserver aux actions réellement destructrices et irréversibles : une
 * confirmation posée partout n'apprend à personne à la lire.
 */
export function useConfirm(): ConfirmApi {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm doit être utilisé dans un ConfirmProvider.');
  }
  return context;
}

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);
  pendingRef.current = pending;

  const confirm = useCallback<ConfirmApi>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const settle = useCallback((value: boolean) => {
    const current = pendingRef.current;
    setPending(null);
    current?.resolve(value);
  }, []);

  const api = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {pending ? (
        <Modal
          title={pending.title}
          size="narrow"
          sheetOnMobile={false}
          hideCloseButton
          // Fermer sans choisir vaut annulation : la sortie reste toujours ouverte.
          onClose={() => settle(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => settle(false)}>
                {pending.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                variant={pending.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => settle(true)}
                data-autofocus
              >
                {pending.confirmLabel ?? 'Confirmer'}
              </Button>
            </>
          }
        >
          {pending.message ? (
            <p className="k-subhead k-ink-secondary">{pending.message}</p>
          ) : null}
        </Modal>
      ) : null}
    </ConfirmContext.Provider>
  );
}
