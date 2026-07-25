import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useEscapeKey } from '@/design/a11y';
import Icon, { type IconName } from './Icon';

export type MenuItem = {
  id: string;
  label: string;
  icon?: IconName;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  /** Informations secondaires sous le libellé, en une ligne. */
  detail?: string;
};

type MenuProps = {
  /** Le déclencheur reçoit les props d'ouverture ; le menu s'ancre dessus. */
  trigger: (props: {
    ref: (node: HTMLButtonElement | null) => void;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
    'aria-controls': string;
  }) => ReactNode;
  items: MenuItem[];
  label: string;
  /** Côté d'alignement horizontal par rapport au déclencheur. */
  align?: 'start' | 'end';
  header?: ReactNode;
};

/**
 * Menu contextuel ancré à son déclencheur.
 *
 * Il ne s'agrandit pas depuis son propre centre mais depuis le bouton qui l'a
 * ouvert : la relation entre le contrôle et son contenu reste lisible pendant
 * toute l'ouverture, et la fermeture emprunte le même chemin.
 */
export default function Menu({ trigger, items, label, align = 'end', header }: MenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  useEscapeKey(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    // Capture : on ferme avant que le clic n'atteigne ce qui est dessous.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus({ preventScroll: true });
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();

    const nodes = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (nodes.length === 0) return;

    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown'
        ? nodes[(index + 1) % nodes.length]
        : nodes[(index - 1 + nodes.length) % nodes.length];
    next.focus();
  }

  return (
    <div className="relative">
      {trigger({
        ref: (node) => {
          triggerRef.current = node;
        },
        onClick: () => setOpen((value) => !value),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        'aria-controls': id,
      })}

      {open ? (
        <div
          ref={menuRef}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="k-material-popover k-animate-materialize absolute top-full z-50 mt-2 min-w-56 overflow-hidden rounded-lg border border-separator p-1"
          style={{
            [align === 'end' ? 'right' : 'left']: 0,
            // L'agrandissement part du déclencheur, pas du centre du panneau.
            transformOrigin: align === 'end' ? 'top right' : 'top left',
          }}
        >
          {header ? (
            <div className="border-b border-separator px-3 pb-3 pt-2">{header}</div>
          ) : null}

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`k-press flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left k-subhead hover:bg-surface-secondary ${
                item.tone === 'danger' ? 'text-danger' : 'k-ink'
              }`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon ? <Icon name={item.icon} size={17} className="k-ink-tertiary" /> : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                {item.detail ? (
                  <span className="k-caption k-ink-tertiary block truncate">{item.detail}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
