import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import Avatar from '@/components/ui/Avatar';
import Button, { buttonClass } from '@/components/ui/Button';
import Icon, { type IconName } from '@/components/ui/Icon';
import Menu, { type MenuItem } from '@/components/ui/Menu';
import type { Profile } from '@/lib/types/contract';

export type NavDestination = {
  to: string;
  label: string;
  icon: IconName;
  /** Correspondance exacte : sans elle, « Accueil » resterait actif partout. */
  end?: boolean;
};

/**
 * Destinations de premier niveau.
 *
 * Les libellés nomment ce qu'on y trouve — « Quartiers », « Assistant » —
 * plutôt qu'une catégorie vague : c'est ce qui rend la navigation prévisible.
 */
export const DESTINATIONS: NavDestination[] = [
  { to: '/', label: 'Accueil', icon: 'home', end: true },
  { to: '/quartiers', label: 'Quartiers', icon: 'map' },
  { to: '/chat', label: 'Assistant', icon: 'sparkles' },
];

export function displayName(profile: Profile | null): string {
  if (!profile) return 'Mon compte';
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return full || profile.username || 'Mon compte';
}

/** Vrai dès que le contenu commence à passer sous la chrome flottante. */
function useHasScrolled(threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}

type TopBarProps = {
  session: unknown;
  profile: Profile | null;
  onSignIn: () => void;
  accountItems: MenuItem[];
};

/**
 * Barre supérieure : une couche translucide sous laquelle le contenu défile,
 * et non un bandeau opaque qui confisquerait une bande d'écran.
 */
export function TopBar({ session, profile, onSignIn, accountItems }: TopBarProps) {
  const scrolled = useHasScrolled();
  const isAdmin = profile?.role === 'admin';

  return (
    <header
      className="k-material-chrome sticky top-0 z-40 transition-[border-color] duration-200"
      style={{
        // Le filet n'existe que là où quelque chose passe réellement dessous.
        borderBottom: `1px solid ${scrolled ? 'var(--k-separator)' : 'transparent'}`,
      }}
    >
      <div className="mx-auto flex h-14 max-w-page items-center gap-2 px-5 md:px-8">
        <Link
          to="/"
          className="k-press-subtle mr-1 flex shrink-0 items-center gap-2.5"
          aria-label="Kartie, retour à l'accueil"
        >
          <img
            src="/saint-denis.png"
            alt=""
            width={28}
            height={39}
            className="h-8 w-auto"
          />
          <span className="k-title-3 k-vibrant hidden sm:block">Kartie</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {DESTINATIONS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `k-press k-subhead flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'k-ink-secondary hover:bg-surface-secondary hover:text-ink'
                }`
              }
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {isAdmin ? (
            <Link
              to="/admin"
              className={buttonClass({ variant: 'ghost', size: 'sm', className: 'hidden md:inline-flex' })}
            >
              <Icon name="shield" size={16} />
              Administration
            </Link>
          ) : null}

          {session ? (
            <Menu
              label="Menu du compte"
              items={accountItems}
              header={
                <div className="min-w-0">
                  <p className="k-subhead truncate font-semibold">{displayName(profile)}</p>
                  {profile?.username ? (
                    <p className="k-caption k-ink-tertiary truncate">@{profile.username}</p>
                  ) : null}
                </div>
              }
              trigger={({ ref, ...props }) => (
                <button
                  ref={ref}
                  type="button"
                  className="k-press flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-surface-secondary"
                  aria-label="Menu du compte"
                  {...props}
                >
                  <Avatar
                    src={profile?.avatar_url ?? undefined}
                    name={displayName(profile)}
                    size={32}
                  />
                  <Icon name="chevronDown" size={15} className="k-ink-tertiary hidden md:block" />
                </button>
              )}
            />
          ) : (
            <Button variant="primary" size="sm" onClick={onSignIn} leading={<Icon name="logIn" size={16} />}>
              Connexion
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

type TabBarProps = {
  onAccount: () => void;
  isAuthenticated: boolean;
};

/**
 * Barre d'onglets mobile — la navigation reste à portée de pouce et visible en
 * permanence, là où l'ancien menu plein écran masquait le contenu et obligeait
 * à un aller-retour pour changer de section.
 */
export function TabBar({ onAccount, isAuthenticated }: TabBarProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navigation principale"
      className="k-material-chrome k-material-edge-top fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: 'var(--k-safe-bottom)' }}
    >
      <div className="flex h-[var(--k-tabbar-height)] items-stretch">
        {DESTINATIONS.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="k-press flex flex-1 flex-col items-center justify-center gap-1 pt-1"
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                name={item.icon}
                size={22}
                strokeWidth={active ? 1.9 : 1.6}
                className={active ? 'text-accent' : 'k-ink-tertiary'}
              />
              <span
                className={`k-caption-2 k-vibrant ${active ? 'text-accent' : 'k-ink-tertiary'}`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={onAccount}
          className="k-press flex flex-1 flex-col items-center justify-center gap-1 pt-1"
        >
          <Icon name={isAuthenticated ? 'user' : 'logIn'} size={22} className="k-ink-tertiary" />
          <span className="k-caption-2 k-vibrant k-ink-tertiary">
            {isAuthenticated ? 'Compte' : 'Connexion'}
          </span>
        </button>
      </div>
    </nav>
  );
}
