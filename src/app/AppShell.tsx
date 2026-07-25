import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import type { MenuItem } from '@/components/ui/Menu';
import AuthModal from '@/features/identity/AuthModal';
import CompleteProfileModal from '@/features/identity/CompleteProfileModal';
import SelectQuartier from '@/features/territory/SelectQuartier';
import { TabBar, TopBar, displayName } from '@/app/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { ProfileUpsert } from '@/api/profiles';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const updateUserQuartier = useAuthStore((state) => state.updateUserQuartier);
  const setProfile = useAuthStore((state) => state.setProfile);

  // La fenêtre de connexion est pilotée par le store : n'importe quelle vue
  // peut l'ouvrir depuis une action réservée aux membres.
  const showAuthModal = useUiStore((state) => state.isAuthModalOpen);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const closeAuthModal = useUiStore((state) => state.closeAuthModal);
  const [showQuartierSelector, setShowQuartierSelector] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [showAccountSheet, setShowAccountSheet] = useState(false);

  // L'assistant occupe tout l'écran : sa zone de saisie et la barre d'onglets
  // se disputeraient le bas de l'écran.
  const isImmersive = location.pathname === '/chat';

  useEffect(() => {
    if (session) {
      closeAuthModal();
      setShowQuartierSelector(Boolean(profile && !profile.quartier_id));
    } else {
      setShowQuartierSelector(false);
    }
  }, [session, profile, closeAuthModal]);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  async function handleQuartierSaved(quartierId: number) {
    await updateUserQuartier(quartierId);
    setShowQuartierSelector(false);
  }

  function handleProfileSaved(updates: ProfileUpsert) {
    setProfile({
      username: profile?.username ?? null,
      role: profile?.role ?? 'user',
      quartier_id: profile?.quartier_id ?? null,
      first_name: updates.first_name,
      last_name: updates.last_name,
      avatar_url: updates.avatar_url,
    });
    setShowCompleteProfileModal(false);
  }

  const accountItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (profile?.quartier_id) {
      items.push({
        id: 'quartier',
        label: 'Mon quartier',
        icon: 'mapPin',
        onSelect: () => navigate(`/quartiers/${profile.quartier_id}`),
      });
    }

    items.push({
      id: 'profile',
      label: 'Modifier mon profil',
      icon: 'user',
      onSelect: () => setShowCompleteProfileModal(true),
    });

    items.push({
      id: 'change-quartier',
      label: profile?.quartier_id ? 'Changer de quartier' : 'Choisir mon quartier',
      icon: 'map',
      onSelect: () => setShowQuartierSelector(true),
    });

    if (profile?.role === 'admin') {
      items.push({
        id: 'admin',
        label: 'Administration',
        icon: 'shield',
        onSelect: () => navigate('/admin'),
      });
    }

    items.push({
      id: 'signout',
      label: 'Se déconnecter',
      icon: 'logOut',
      tone: 'danger',
      onSelect: () => void handleSignOut(),
    });

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, navigate]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="k-skip-link k-subhead font-medium">
        Aller au contenu
      </a>

      <TopBar
        session={session}
        profile={profile}
        onSignIn={openAuthModal}
        accountItems={accountItems}
      />

      <main
        id="contenu"
        tabIndex={-1}
        className="flex-1"
        style={{
          // La barre d'onglets flotte au-dessus du contenu : on lui réserve sa
          // hauteur pour que rien ne finisse coincé dessous.
          paddingBottom: isImmersive
            ? undefined
            : 'calc(var(--k-tabbar-height) + var(--k-safe-bottom))',
        }}
      >
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
              <Spinner size={24} className="k-ink-tertiary" label="Chargement de la page" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {!isImmersive ? (
        <footer className="k-hairline-top mt-auto">
          <div className="k-page flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="k-title-3">Kartie</p>
              <p className="k-footnote k-ink-secondary mt-2">
                La vie de quartier à Saint-Denis de La Réunion : s'informer, échanger et prendre
                part aux décisions qui façonnent la ville.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="k-eyebrow">Explorer</p>
              <Link to="/quartiers" className="k-footnote k-ink-secondary hover:text-accent">
                Les 20 quartiers
              </Link>
              <Link to="/chat" className="k-footnote k-ink-secondary hover:text-accent">
                Assistant Kartie
              </Link>
            </div>

            <div className="max-w-xs">
              <p className="k-eyebrow">Sources</p>
              <p className="k-caption k-ink-tertiary mt-2">
                INSEE, Mairie de Saint-Denis, SIG, DEAL — 2021 à 2025.
              </p>
              <p className="k-caption k-ink-tertiary mt-3">Portrait de Saint-Denis 2025</p>
            </div>
          </div>
        </footer>
      ) : null}

      {!isImmersive ? (
        <TabBar
          isAuthenticated={Boolean(session)}
          onAccount={() => {
            if (session) setShowAccountSheet(true);
            else openAuthModal();
          }}
        />
      ) : null}

      {showAccountSheet && session ? (
        <Modal
          title={displayName(profile)}
          description={profile?.username ? `@${profile.username}` : undefined}
          onClose={() => setShowAccountSheet(false)}
          bodyClassName="pb-2"
        >
          <div className="k-list -mx-1">
            {accountItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`k-press flex w-full items-center gap-3 px-1 py-3.5 text-left k-body ${
                  item.tone === 'danger' ? 'text-danger' : 'k-ink'
                }`}
                onClick={() => {
                  setShowAccountSheet(false);
                  item.onSelect();
                }}
              >
                {item.icon ? <Icon name={item.icon} size={20} className="k-ink-tertiary" /> : null}
                <span className="flex-1 font-medium">{item.label}</span>
                <Icon name="chevronRight" size={17} className="k-ink-quaternary" />
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {showAuthModal ? <AuthModal onClose={closeAuthModal} /> : null}

      {showCompleteProfileModal && session ? (
        <CompleteProfileModal
          session={session}
          initialData={profile ?? undefined}
          onCancel={() => setShowCompleteProfileModal(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}

      {showQuartierSelector ? (
        <SelectQuartier
          onQuartierSaved={(id) => void handleQuartierSaved(id)}
          onClose={profile?.quartier_id ? () => setShowQuartierSelector(false) : undefined}
        />
      ) : null}
    </div>
  );
}
