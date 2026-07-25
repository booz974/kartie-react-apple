import { create } from 'zustand';

/**
 * État d'interface transverse à l'application.
 *
 * La fenêtre de connexion appartient à l'AppShell, mais n'importe quelle vue
 * doit pouvoir l'ouvrir : sans cela, une action réservée aux membres se
 * réduisait à un bouton désactivé disant « connectez-vous » sans offrir le
 * moyen de le faire.
 */
interface UiState {
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAuthModalOpen: false,
  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
