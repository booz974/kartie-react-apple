import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import Avatar from '@/components/ui/Avatar';
import Button, { buttonClass } from '@/components/ui/Button';
import Icon, { type IconName } from '@/components/ui/Icon';
import LiquidGlassLayer from '@/components/ui/LiquidGlassLayer';
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

/**
 * Destinations adaptées à la personne connectée.
 *
 * Quand un quartier de rattachement est connu, l'onglet mène directement à ce
 * quartier plutôt qu'à la liste des vingt : c'est la page qu'on rouvre tous les
 * jours, et l'atteindre demandait jusqu'ici de traverser une liste dont on
 * connaît déjà la réponse.
 *
 * La liste reste accessible : la fiche quartier porte un retour « Tous les
 * quartiers », et le pied de page comme l'accueil y renvoient. Sans ce
 * rattachement, rien ne change.
 */
export function destinationsFor(quartierId?: number | null): NavDestination[] {
  if (quartierId == null) return DESTINATIONS;

  return DESTINATIONS.map((item) =>
    item.to === '/quartiers'
      ? { to: `/quartiers/${quartierId}`, label: 'Mon quartier', icon: 'mapPin' }
      : item,
  );
}

/**
 * Onglet actif.
 *
 * La comparaison se fait segment par segment : un simple préfixe ferait passer
 * `/quartiers/50` pour `/quartiers/5`, ce qui allumerait le mauvais onglet dès
 * que deux identifiants se ressemblent.
 */
function isActivePath(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

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
      className="k-material-chrome k-liquid-host sticky top-0 z-40 transition-[border-color,box-shadow] duration-200"
      style={{
        // Le filet et l'ombre n'existent que là où du contenu passe réellement
        // sous la chrome.
        borderBottom: `1px solid ${scrolled ? 'var(--k-glass-border)' : 'transparent'}`,
        boxShadow: scrolled ? 'var(--k-shadow-sm)' : 'none',
      }}
    >
      {/* Barre plaquée en haut, sans angle : le biseau ne travaille que sur les
          arêtes horizontales, d'où un liseré fin plutôt qu'un bourrelet. */}
      <LiquidGlassLayer bezel={12} blur={18} />

      <div className="mx-auto flex h-[var(--k-nav-height)] max-w-page items-center gap-2 px-5 md:px-8">
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
          {destinationsFor(profile?.quartier_id).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `k-press k-subhead flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition-colors ${
                  isActive
                    ? 'bg-accent-gradient text-ink-on-accent shadow-[var(--k-shadow-glow-accent)]'
                    : 'k-ink-secondary hover:bg-white/60 hover:text-ink'
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
  /** Quartier de rattachement, quand il est connu. */
  quartierId?: number | null;
};

/**
 * Barre d'onglets mobile — la navigation reste à portée de pouce et visible en
 * permanence, là où l'ancien menu plein écran masquait le contenu et obligeait
 * à un aller-retour pour changer de section.
 */
export function TabBar({ onAccount, isAuthenticated, quartierId }: TabBarProps) {
  const location = useLocation();
  const destinations = destinationsFor(quartierId);

  return (
    // Le conteneur ne fait que réserver la zone sûre ; il laisse passer les
    // clics pour ne pas confisquer une bande d'écran de part et d'autre de la
    // pastille.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: 'var(--k-safe-bottom)' }}
    >
      <nav
        aria-label="Navigation principale"
        // Pastille détachée des bords, à la manière d'iOS 26. Ce n'est pas
        // qu'une question de style : le verre ne se lit vraiment que s'il
        // flotte au-dessus de quelque chose, et c'est dans les angles arrondis
        // que le biseau donne sa mesure.
        className="k-material-chrome k-liquid-host pointer-events-auto mx-3 mb-3 overflow-hidden rounded-[1.75rem]"
      >
        {/* Le fond défile en permanence sous cette barre : une seule passe, sans
            dispersion, pour ne pas tripler le coût à chaque image. */}
        <LiquidGlassLayer bezel={22} blur={16} />

        <div className="flex h-[var(--k-tabbar-height)] items-stretch">
          {destinations.map((item) => {
            const active = isActivePath(location.pathname, item.to, item.end);
  
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="k-press flex flex-1 flex-col items-center justify-center gap-1 pt-1.5"
                aria-current={active ? 'page' : undefined}
              >
                {/* La pastille colorée derrière l'icône rend l'onglet actif
                    lisible d'un coup d'œil, sans agrandir la cible. */}
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
                    active ? 'bg-accent-gradient text-ink-on-accent' : 'k-ink-tertiary'
                  }`}
                >
                  <Icon name={item.icon} size={21} strokeWidth={active ? 2 : 1.7} />
                </span>
                <span
                  className={`k-caption-2 k-vibrant ${active ? 'text-accent-ink' : 'k-ink-tertiary'}`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
  
          <button
            type="button"
            onClick={onAccount}
            className="k-press flex flex-1 flex-col items-center justify-center gap-1 pt-1.5"
          >
            <span className="k-ink-tertiary flex h-8 w-14 items-center justify-center">
              <Icon name={isAuthenticated ? 'user' : 'logIn'} size={21} strokeWidth={1.7} />
            </span>
            <span className="k-caption-2 k-vibrant k-ink-tertiary">
              {isAuthenticated ? 'Compte' : 'Connexion'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
