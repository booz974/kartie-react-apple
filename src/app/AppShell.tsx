import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router';
import AuthModal from '@/features/identity/AuthModal';
import CompleteProfileModal from '@/features/identity/CompleteProfileModal';
import SelectQuartier from '@/features/territory/SelectQuartier';
import { useAuthStore } from '@/stores/authStore';
import type { ProfileUpsert } from '@/api/profiles';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);
  const updateUserQuartier = useAuthStore((state) => state.updateUserQuartier);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showQuartierSelector, setShowQuartierSelector] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isChatView = location.pathname === '/chat';

  useEffect(() => {
    if (session) {
      setShowAuthModal(false);

      if (profile && !profile.quartier_id) {
        setShowQuartierSelector(true);
      } else {
        setShowQuartierSelector(false);
      }
    } else {
      setShowQuartierSelector(false);
    }
  }, [session, profile]);

  function handleMobileAction(action: () => void) {
    action();
    setIsMobileMenuOpen(false);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  function goToMyQuartier() {
    if (profile?.quartier_id) {
      navigate(`/quartiers/${profile.quartier_id}`);
    }
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

  return (
    <div
      className={`container mx-auto transition-all duration-300 ${
        isChatView ? 'p-0 md:p-8' : 'p-4 md:p-8'
      }`}
    >
      <header
        className={`flex justify-between items-center relative z-50 px-4 md:px-0 ${
          isChatView ? 'mb-2 md:mb-8' : 'mb-8'
        }`}
      >
        <Link to="/" aria-label="Retour à l'accueil" className="z-50">
          <img
            src="/saint-denis.png"
            alt="Logo Portrait de Saint-Denis"
            width={40}
            height={56}
            className="h-14 w-auto"
          />
        </Link>

        <div className="hidden md:flex items-center">
          <Link
            to="/chat"
            className="glass-card text-white font-bold py-2 px-5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 mr-4 shadow-lg border-white/20 inline-block text-center"
          >
            ✨ Assistant IA
          </Link>

          {profile?.role === 'admin' ? (
            <Link
              to="/admin"
              className="glass-card text-slate-800 font-bold py-2 px-5 text-sm bg-yellow-300/80 hover:bg-yellow-300/50 mr-4 inline-block text-center"
            >
              📊 Dashboard Admin
            </Link>
          ) : null}

          {session && profile?.quartier_id ? (
            <button
              type="button"
              onClick={goToMyQuartier}
              className="glass-card text-slate-800 font-bold py-2 px-5 text-sm bg-cyan-300/80 hover:bg-cyan-300/50 mr-4"
            >
              🏠 Accéder à mon quartier
            </button>
          ) : null}

          {session ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="glass-card text-white font-bold py-2 px-5 text-sm bg-red-500/90 hover:bg-red-500/50"
            >
              Déconnexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="glass-card text-slate-800 font-bold py-2 px-5 text-sm bg-white/30 hover:bg-white/50"
            >
              Connexion
            </button>
          )}
        </div>

        <div className="md:hidden flex gap-2 z-50">
          {isChatView ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="glass-card p-2 text-slate-800"
              aria-label="Retour"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="glass-card p-2 text-slate-800"
            aria-label="Menu"
          >
            {!isMobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-40 flex flex-col items-center justify-center space-y-6 p-6 animate-fade-in md:hidden">
            <button
              type="button"
              onClick={() => handleMobileAction(() => navigate('/chat'))}
              className="w-full max-w-xs glass-card text-white font-bold py-4 px-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg border-white/20"
            >
              ✨ Assistant IA
            </button>

            {profile?.role === 'admin' ? (
              <button
                type="button"
                onClick={() => handleMobileAction(() => navigate('/admin'))}
                className="w-full max-w-xs glass-card text-slate-900 font-bold py-4 px-6 text-lg bg-yellow-400"
              >
                📊 Dashboard Admin
              </button>
            ) : null}

            {session && profile?.quartier_id ? (
              <button
                type="button"
                onClick={() => handleMobileAction(goToMyQuartier)}
                className="w-full max-w-xs glass-card text-slate-900 font-bold py-4 px-6 text-lg bg-cyan-400"
              >
                🏠 Mon Quartier
              </button>
            ) : null}

            <div className="w-full max-w-xs border-t border-white/10 my-4" />

            {session ? (
              <button
                type="button"
                onClick={() => handleMobileAction(() => void handleSignOut())}
                className="w-full max-w-xs glass-card text-white font-bold py-4 px-6 text-lg bg-red-500"
              >
                Déconnexion
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleMobileAction(() => setShowAuthModal(true))}
                className="w-full max-w-xs glass-card text-slate-900 font-bold py-4 px-6 text-lg bg-white"
              >
                Connexion
              </button>
            )}
          </div>
        ) : null}
      </header>

      <main>
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {showAuthModal ? <AuthModal onClose={() => setShowAuthModal(false)} /> : null}

      {showCompleteProfileModal && session ? (
        <CompleteProfileModal
          session={session}
          initialData={profile ?? undefined}
          onCancel={() => setShowCompleteProfileModal(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}

      {showQuartierSelector ? (
        <SelectQuartier onQuartierSaved={(id) => void handleQuartierSaved(id)} />
      ) : null}

      <footer className="bg-gray-800 text-white text-center p-8 -mx-4 -mb-8 md:-mx-8 md:-mb-8 rounded-t-2xl mt-16">
        <p>Portrait de Saint-Denis 2025</p>
        <p className="text-sm text-gray-400 mt-2">
          Données INSEE, Mairie de Saint-Denis, SIG, DEAL (2021-2025).
        </p>
      </footer>
    </div>
  );
}
