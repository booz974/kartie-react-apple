import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVirtualKeyboardInset } from './useVirtualKeyboard';

/** Faux `VisualViewport`, pilotable comme le ferait l'ouverture d'un clavier. */
function mockViewport(height: number, offsetTop = 0) {
  const listeners = new Map<string, Set<() => void>>();

  const viewport = {
    height,
    offsetTop,
    addEventListener(type: string, fn: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
  };

  function emit(type: string) {
    for (const fn of listeners.get(type) ?? []) fn();
  }

  Object.defineProperty(window, 'visualViewport', {
    value: viewport,
    configurable: true,
    writable: true,
  });

  return { viewport, emit, listeners };
}

function setLayoutHeight(height: number) {
  Object.defineProperty(document.documentElement, 'clientHeight', {
    value: height,
    configurable: true,
  });
}

function inset(): string {
  return document.documentElement.style.getPropertyValue('--k-keyboard-inset');
}

afterEach(() => {
  document.documentElement.style.removeProperty('--k-keyboard-inset');
  vi.unstubAllGlobals();
});

describe('useVirtualKeyboardInset', () => {
  it('mesure la place prise par le clavier', () => {
    setLayoutHeight(844);
    const { viewport, emit } = mockViewport(844);

    renderHook(() => useVirtualKeyboardInset(true));
    expect(inset()).toBe('0px');

    // Le clavier s'ouvre : le viewport visible perd 336 pixels.
    act(() => {
      viewport.height = 508;
      emit('resize');
    });
    expect(inset()).toBe('336px');

    act(() => {
      viewport.height = 844;
      emit('resize');
    });
    expect(inset()).toBe('0px');
  });

  it('tient compte du décalage vertical du viewport visible', () => {
    setLayoutHeight(844);
    const { viewport, emit } = mockViewport(508, 0);

    renderHook(() => useVirtualKeyboardInset(true));
    expect(inset()).toBe('336px');

    // iOS fait glisser le viewport visible pendant la saisie : la place prise
    // par le clavier ne change pas pour autant.
    act(() => {
      viewport.offsetTop = 100;
      emit('scroll');
    });
    expect(inset()).toBe('236px');
  });

  it('ignore les écarts trop faibles pour être un clavier', () => {
    setLayoutHeight(844);
    const { viewport, emit } = mockViewport(844);

    renderHook(() => useVirtualKeyboardInset(true));

    // Repli de la barre d'adresse : bien réel, mais ce n'est pas un clavier.
    act(() => {
      viewport.height = 764;
      emit('resize');
    });
    expect(inset()).toBe('0px');
  });

  it('retire la variable et ses écouteurs au démontage', () => {
    setLayoutHeight(844);
    const { listeners } = mockViewport(508);

    const { unmount } = renderHook(() => useVirtualKeyboardInset(true));
    expect(inset()).toBe('336px');
    expect(listeners.get('resize')?.size).toBe(1);

    unmount();
    expect(inset()).toBe('');
    expect(listeners.get('resize')?.size).toBe(0);
    expect(listeners.get('scroll')?.size).toBe(0);
  });

  it('garde la mesure tant qu\'une surface l\'observe encore', () => {
    setLayoutHeight(844);
    mockViewport(508);

    const premier = renderHook(() => useVirtualKeyboardInset(true));
    const second = renderHook(() => useVirtualKeyboardInset(true));
    expect(inset()).toBe('336px');

    // Fermer une feuille modale posée par-dessus l'assistant ne doit pas
    // effacer la mesure dont l'assistant dépend encore.
    premier.unmount();
    expect(inset()).toBe('336px');

    second.unmount();
    expect(inset()).toBe('');
  });

  it('ne fait rien tant qu\'aucune surface ne le demande', () => {
    setLayoutHeight(844);
    const { listeners } = mockViewport(508);

    renderHook(() => useVirtualKeyboardInset(false));

    expect(inset()).toBe('');
    expect(listeners.get('resize')?.size ?? 0).toBe(0);
  });
});
