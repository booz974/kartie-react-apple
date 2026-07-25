import { Link, useNavigate } from 'react-router';
import AlaUne from '@/features/admin/components/AlaUne';
import QuartierCard from '@/features/territory/components/QuartierCard';
import Button, { buttonClass } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Page, Section } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';
import { incrementAlaUneVote } from '@/api/alaUne';
import { useAlaUneData, useInvalidateAlaUne } from '@/queries/alaUne';
import { useQuartierZones } from '@/queries/territory';
import { useAuthStore } from '@/stores/authStore';
import { isAdmin as checkIsAdmin } from '@/lib/types/contract';
import type { AlaUneContent } from '@/lib/types/contract';

/**
 * Repères de la commune. Présentés en bande alignée plutôt qu'en cartes : cinq
 * chiffres du même ordre se comparent mieux sur une ligne que dans cinq
 * conteneurs qui se disputent l'attention.
 */
const KEY_FIGURES = [
  { value: '156 149', label: 'Habitants' },
  { value: '+0,9 %', label: 'Croissance annuelle' },
  { value: '73,6 %', label: 'Taux d’emploi' },
  { value: '9 900', label: 'Entreprises' },
  { value: '18 270 €', label: 'Revenu médian' },
] as const;

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

  // Aperçu des quartiers toutes zones confondues : la page d'accueil donne
  // envie d'explorer, l'index complet vit sur /quartiers.
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
      <section className="py-14 md:py-24">
        <p className="k-eyebrow">Saint-Denis de La Réunion</p>
        <h1 className="k-display k-measure mt-4 text-balance">
          Votre quartier, à portée de voix.
        </h1>
        <p className="k-callout k-ink-secondary k-measure mt-5">
          Kartie réunit les vingt quartiers de la ville : leurs actualités, leurs projets, leurs
          associations — et les décisions auxquelles vous pouvez prendre part.
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
              <Icon name="mapPin" size={18} />
              Mon quartier
            </Link>
          ) : (
            <Link to="/chat" className={buttonClass({ variant: 'secondary', size: 'lg' })}>
              <Icon name="sparkles" size={18} />
              Poser une question
            </Link>
          )}
        </div>
      </section>

      <section aria-label="La commune en chiffres" className="k-hairline-top k-hairline-bottom py-8">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {KEY_FIGURES.map((figure) => (
            // La valeur se lit avant son étiquette, mais le balisage garde
            // l'ordre terme-puis-définition attendu par les lecteurs d'écran.
            <div key={figure.label} className="flex flex-col-reverse gap-1">
              <dt className="k-caption k-ink-tertiary">{figure.label}</dt>
              <dd className="k-title-1 tabular-nums">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className="k-caption k-ink-tertiary mt-6">
          Sources INSEE, Mairie de Saint-Denis, SIG et DEAL — 2021 à 2025.
        </p>
      </section>

      {alaUneHighlight ? (
        <Section
          id="a-la-une"
          title="À la une"
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
        title="Zoom sur les territoires"
        description="Vingt quartiers, chacun avec son histoire, ses défis et ses projets."
        className={alaUneHighlight ? undefined : 'pt-16'}
        action={
          <Link
            to="/quartiers"
            className={buttonClass({ variant: 'plain', size: 'sm', className: 'font-semibold' })}
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
              <div key={index} className="k-skeleton aspect-[4/3] rounded-xl" aria-hidden="true" />
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
