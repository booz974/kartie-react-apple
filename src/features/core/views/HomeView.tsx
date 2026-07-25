import { Link, useNavigate } from 'react-router';
import AlaUne from '@/features/admin/components/AlaUne';
import QuartierCard from '@/features/territory/components/QuartierCard';
import Button, { buttonClass } from '@/components/ui/Button';
import Chip from '@/components/ui/Chip';
import Icon from '@/components/ui/Icon';
import { Page, Section } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { incrementAlaUneVote } from '@/api/alaUne';
import { useAlaUneData, useInvalidateAlaUne } from '@/queries/alaUne';
import { useQuartierZones } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin as checkIsAdmin } from '@/lib/types/contract';
import type { AlaUneContent } from '@/lib/types/contract';
import type { CategoryKey } from '@/design/categories';

/**
 * Repères de la commune. Chacun porte son émoji : cinq nombres alignés se
 * ressemblent tous, cinq nombres illustrés se distinguent au premier regard.
 */
const KEY_FIGURES: { emoji: string; value: string; label: string; tone: CategoryKey }[] = [
  { emoji: '🧑‍🤝‍🧑', value: '156 149', label: 'Habitants', tone: 'quartier' },
  { emoji: '📈', value: '+0,9 %', label: 'Croissance annuelle', tone: 'asso' },
  { emoji: '💼', value: '73,6 %', label: 'Taux d’emploi', tone: 'petition' },
  { emoji: '🏪', value: '9 900', label: 'Entreprises', tone: 'event' },
  { emoji: '💶', value: '18 270 €', label: 'Revenu médian', tone: 'project' },
];

/** Les portes d'entrée du produit, chacune avec sa couleur et son émoji. */
const SHORTCUTS: {
  to: string;
  emoji: string;
  title: string;
  detail: string;
  tone: CategoryKey;
}[] = [
  {
    to: '/quartiers',
    emoji: '📍',
    title: 'Les quartiers',
    detail: 'Vingt territoires à explorer',
    tone: 'quartier',
  },
  {
    to: '/chat',
    emoji: '✨',
    title: 'Assistant Kartie',
    detail: 'Une question, une réponse',
    tone: 'consult',
  },
];

export default function HomeView() {
  const navigate = useNavigate();
  const toast = useToast();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = checkIsAdmin(profile);

  const { data: quartierZones = {}, isLoading } = useQuartierZones();
  const { data: alaUneData } = useAlaUneData();
  const invalidateAlaUne = useInvalidateAlaUne();

  const alaUneHighlight =
    alaUneData && (alaUneData.article || alaUneData.event || alaUneData.sondage)
      ? alaUneData
      : null;

  // Aperçu toutes zones confondues : l'accueil donne envie d'explorer, l'index
  // complet vit sur /quartiers.
  const previewQuartiers = Object.values(quartierZones).flat().slice(0, 6);

  async function handleAlaUneVote(voteData: {
    sondageId: number;
    optionId: number;
    userId: string;
  }) {
    if (!session?.user) {
      toast.warning('Connexion requise', 'Connectez-vous pour prendre part à cette consultation.');
      return;
    }

    try {
      const { sondageId, optionId } = voteData;

      if (!sondageId || optionId === undefined) {
        throw new Error('Les informations pour le vote sont incomplètes.');
      }

      await incrementAlaUneVote(sondageId, optionId);
      await invalidateAlaUne();
      toast.success('Vote enregistré', 'Merci pour votre participation.');
    } catch (err) {
      console.error('Erreur lors du vote:', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error('Vote non enregistré', message);
    }
  }

  function handleViewAlaUneArticle(article: AlaUneContent & { description?: string | null }) {
    navigate(`/actualites/${article.id}`);
  }

  function handleViewAlaUneEvent(event: AlaUneContent & { date?: string | null }) {
    navigate(`/events/${event.id}`);
  }

  return (
    <Page>
      <section className="py-12 md:py-20">
        <span className="k-badge k-badge--quartier k-badge--lg">
          <span aria-hidden="true">🌴</span>
          Saint-Denis de La Réunion
        </span>

        <h1 className="k-display k-measure mt-5 text-balance">
          Votre quartier,{' '}
          <span className="bg-gradient-to-br from-accent-400 via-accent to-cat-project bg-clip-text text-transparent">
            à portée de voix
          </span>
        </h1>

        <p className="k-callout k-ink-secondary k-measure mt-5">
          Kartie réunit les vingt quartiers de la ville : leurs actualités, leurs événements, leurs
          associations, et les décisions auxquelles vous pouvez prendre part.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/quartiers" className={buttonClass({ variant: 'primary', size: 'lg' })}>
            Explorer les quartiers
            <Icon name="arrowRight" size={18} />
          </Link>
          {profile?.quartier_id ? (
            <Link
              to={`/quartiers/${profile.quartier_id}`}
              className={buttonClass({ variant: 'secondary', size: 'lg' })}
            >
              <span aria-hidden="true">🏠</span>
              Mon quartier
            </Link>
          ) : (
            <Link to="/chat" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
              <span aria-hidden="true">✨</span>
              Poser une question
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="k-card k-card--interactive group flex items-center gap-4 p-4"
            >
              <Chip tone={shortcut.tone} size={52}>
                {shortcut.emoji}
              </Chip>
              <span className="min-w-0 flex-1">
                <span className="k-title-3 block">{shortcut.title}</span>
                <span className="k-footnote k-ink-secondary block">{shortcut.detail}</span>
              </span>
              <Icon
                name="chevronRight"
                size={20}
                className="k-ink-quaternary transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="La commune en chiffres">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {KEY_FIGURES.map((figure) => (
            <div key={figure.label} className="k-card flex flex-col gap-1 p-4">
              <Chip tone={figure.tone} size={38} className="mb-1">
                {figure.emoji}
              </Chip>
              {/* L'ordre visuel place la valeur avant son étiquette, mais le
                  balisage garde la succession terme puis définition. */}
              <dt className="k-caption k-ink-tertiary order-2">{figure.label}</dt>
              <dd className="k-title-2 tabular-nums order-1">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className="k-caption k-ink-tertiary mt-4">
          Sources INSEE, Mairie de Saint-Denis, SIG et DEAL, de 2021 à 2025.
        </p>
      </section>

      {alaUneHighlight ? (
        <Section
          id="a-la-une"
          title="🔥 À la une"
          description="Ce qui mobilise la ville en ce moment."
          className="pt-16"
          action={
            isAdmin ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/alaune')}>
                <Icon name="pencil" size={16} />
                Gérer
              </Button>
            ) : null
          }
        >
          <AlaUne
            data={alaUneHighlight}
            isAdmin={isAdmin}
            session={session}
            onVote={handleAlaUneVote}
            onViewArticle={handleViewAlaUneArticle}
            onViewEvent={handleViewAlaUneEvent}
            onManage={() => navigate('/admin/alaune')}
          />
        </Section>
      ) : null}

      <Section
        id="quartiers"
        title="📍 Zoom sur les territoires"
        description="Vingt quartiers, chacun avec son histoire, ses défis et ses projets."
        className={alaUneHighlight ? undefined : 'pt-16'}
        action={
          <Link
            to="/quartiers"
            className={buttonClass({ variant: 'tinted', size: 'sm' })}
          >
            Tout voir
            <Icon name="chevronRight" size={16} />
          </Link>
        }
      >
        {isLoading ? (
          <div className="k-grid">
            {Array.from({ length: 6 }, (_, index) => (
              // Le gabarit reprend le rapport d'image réel des vignettes : un
              // squelette d'une autre forme provoque un saut au remplacement.
              <div key={index} className="k-skeleton aspect-[4/3] rounded-lg" aria-hidden="true" />
            ))}
          </div>
        ) : (
          <div className="k-grid">
            {previewQuartiers.map((quartier) => (
              <QuartierCard key={quartier.id} quartier={quartier} />
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
