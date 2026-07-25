import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey, useFocusTrap, useScrollLock } from '@/design/a11y';
import { prefersReducedMotion } from '@/design/motion';
import { useIsCompact } from '@/design/useMediaQuery';
import { useSheetGesture } from '@/design/useSheetGesture';
import Button from './Button';
import Icon from './Icon';
import LiquidGlassLayer from './LiquidGlassLayer';

type ModalProps = {
  onClose: () => void;
  title?: ReactNode;
  /** Précise l'intention quand le titre seul ne suffit pas. */
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'narrow' | 'default' | 'wide';
  /**
   * En dessous du seuil compact, la surface devient une feuille ancrée au bas
   * de l'écran, saisissable et refermable au doigt.
   */
  sheetOnMobile?: boolean;
  /** Rend la sortie explicite uniquement : à réserver aux tâches engageantes. */
  dismissible?: boolean;
  hideCloseButton?: boolean;
  bodyClassName?: string;
};

/**
 * Surface modale : elle interrompt le parcours, donc elle s'accompagne d'un
 * voile qui met l'arrière-plan en retrait. Un panneau non bloquant n'utilise
 * pas ce composant.
 */
export default function Modal({
  onClose,
  title,
  description,
  children,
  footer,
  size = 'default',
  sheetOnMobile = true,
  dismissible = true,
  hideCloseButton = false,
  bodyClassName,
}: ModalProps) {
  const isCompact = useIsCompact();
  const asSheet = sheetOnMobile && isCompact;

  const [leaving, setLeaving] = useState(false);
  const closingRef = useRef(false);

  // La fermeture joue d'abord la sortie, puis prévient le parent : la surface
  // s'en va par le chemin qu'elle a emprunté à l'ouverture.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (prefersReducedMotion()) {
      onClose();
      return;
    }

    setLeaving(true);
    window.setTimeout(onClose, 200);
  }, [onClose]);

  const handleDismiss = dismissible ? requestClose : () => {};

  const containerRef = useFocusTrap(true);
  useScrollLock(true);
  useEscapeKey(dismissible, requestClose);

  const { sheetRef, handleProps } = useSheetGesture({
    onDismiss: onClose,
    enabled: asSheet && dismissible,
  });

  function setRefs(node: HTMLDivElement | null) {
    containerRef.current = node;
    sheetRef.current = node;
  }

  const labelled = typeof title === 'string' ? { 'aria-label': title } : {};

  return createPortal(
    <div
      className={`k-modal-root${asSheet ? ' k-modal-root--sheet' : ''}`}
      style={leaving ? { animation: 'k-fade-in 200ms var(--k-ease-in) reverse both' } : undefined}
    >
      <div
        className="k-scrim"
        data-k-scrim=""
        onPointerDown={handleDismiss}
        // Le voile n'est pas une cible : la sortie clavier passe par Échap et
        // par le bouton de fermeture.
        aria-hidden="true"
      />

      <div
        ref={setRefs}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={[
          'k-modal',
          'k-liquid-host',
          asSheet ? 'k-modal--sheet' : '',
          size === 'wide' ? 'k-modal--wide' : '',
          size === 'narrow' ? 'k-modal--narrow' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...labelled}
      >
        {/* Objet lourd, posé sur un fond immobile : on peut s'offrir la
            dispersion, qui donne à la tranche sa frange colorée. */}
        <LiquidGlassLayer bezel={26} blur={22} chromatic />

        {asSheet && dismissible ? (
          <div className="k-sheet-handle" {...handleProps} aria-hidden="true" />
        ) : null}

        {title || !hideCloseButton ? (
          <div className={`k-modal__header${asSheet ? '' : ''}`}>
            <div className="min-w-0 flex-1">
              {title ? <h2 className="k-modal__title">{title}</h2> : null}
              {description ? (
                <p className="k-footnote k-ink-secondary mt-1">{description}</p>
              ) : null}
            </div>
            {!hideCloseButton && dismissible ? (
              <Button
                variant="ghost"
                iconOnly
                size="sm"
                onClick={requestClose}
                aria-label="Fermer"
                className="-mr-1 -mt-1"
              >
                <Icon name="close" size={18} />
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className={['k-modal__body', bodyClassName].filter(Boolean).join(' ')}>{children}</div>

        {footer ? <div className="k-modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
