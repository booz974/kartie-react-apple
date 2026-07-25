import { Link, useNavigate, useParams } from 'react-router';
import Button, { buttonClass } from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Notice from '@/components/ui/Notice';
import { Page } from '@/components/ui/Page';
import { SkeletonText } from '@/components/ui/Skeleton';
import QuartierInfos from '@/features/territory/components/QuartierInfos';
import { useQuartier } from '@/queries/territory';

export default function QuartierInfosView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quartierId = id ? Number(id) : undefined;

  const { data: quartier, isLoading, isError, refetch } = useQuartier(quartierId);

  if (isLoading) {
    return (
      <Page className="k-page--reading">
        <div className="py-16">
          <div className="k-skeleton mb-5 h-10 w-2/3 rounded-md" aria-hidden="true" />
          <SkeletonText lines={6} />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="k-page--reading">
        <div className="max-w-lg py-16">
          <Notice tone="danger">
            Les informations de ce quartier n’ont pas pu être chargées.
          </Notice>
          <Button variant="primary" className="mt-4" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </div>
      </Page>
    );
  }

  if (!quartier) {
    return (
      <Page className="k-page--reading">
        <EmptyState
          icon="mapPin"
          title="Quartier introuvable"
          description="Ce quartier n’existe pas ou n’est plus accessible."
          action={
            <Link to="/quartiers" className={buttonClass({ variant: 'primary' })}>
              Voir tous les quartiers
            </Link>
          }
        />
      </Page>
    );
  }

  return (
    <QuartierInfos quartier={quartier} onBack={() => navigate(`/quartiers/${quartier.id}`)} />
  );
}
