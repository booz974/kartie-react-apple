import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  icon?: IconName;
  /** Compteur discret aligné à droite du libellé. */
  count?: number;
};

type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Étiquette du groupe pour les lecteurs d'écran. */
  label: string;
  block?: boolean;
  className?: string;
  /** Filets soulignés plutôt que pastille glissante — pour la nav de section. */
  variant?: 'segmented' | 'underline';
};

/**
 * Sélecteur d'onglets à indicateur glissant.
 *
 * La sélection se *déplace* d'un segment à l'autre au lieu de disparaître ici
 * pour réapparaître là : le lien spatial entre l'ancien et le nouvel onglet
 * reste visible pendant toute la transition.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  block,
  className,
  variant = 'segmented',
}: SegmentedProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  // Le premier placement ne s'anime pas : rien ne s'est encore déplacé.
  const initialRef = useRef(true);

  const measure = useCallback(() => {
    const list = listRef.current;
    const active = itemsRef.current.get(value);
    if (!list || !active) return;
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, options]);

  useEffect(() => {
    if (indicator) {
      const frame = requestAnimationFrame(() => {
        initialRef.current = false;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [indicator]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  // Flèches gauche/droite pour parcourir les onglets, comme attendu d'un
  // groupe d'onglets au clavier.
  function onKeyDown(event: React.KeyboardEvent) {
    const index = options.findIndex((option) => option.value === value);
    if (index === -1) return;

    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else return;

    event.preventDefault();
    const target = options[next];
    onChange(target.value);
    itemsRef.current.get(target.value)?.focus();
  }

  const isUnderline = variant === 'underline';

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={[
        isUnderline ? 'k-tabs' : 'k-segmented',
        block && !isUnderline ? 'k-segmented--block' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {indicator ? (
        <span
          className={isUnderline ? 'k-tabs__indicator' : 'k-segmented__indicator'}
          data-initial={initialRef.current ? 'true' : 'false'}
          style={{
            width: indicator.width,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
          }}
          aria-hidden="true"
        />
      ) : null}

      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) itemsRef.current.set(option.value, node);
              else itemsRef.current.delete(option.value);
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={isUnderline ? 'k-tabs__item' : 'k-segmented__item'}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? <Icon name={option.icon} size={16} /> : null}
            {option.label}
            {typeof option.count === 'number' ? (
              <span className="k-caption k-ink-tertiary tabular-nums">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
