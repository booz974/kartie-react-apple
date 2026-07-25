import { Link } from 'react-router';
import { buttonClass } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

export default function NotFoundView() {
  return (
    // On dit où l'on est, pourquoi, et par où repartir : un cul-de-sac sans
    // sortie est ce qui fait quitter un produit.
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-surface-secondary text-ink-tertiary">
          <Icon name="compass" size={26} />
        </span>
        <p className="k-eyebrow mb-2">Erreur 404</p>
        <h1 className="k-title-1">Cette page n&apos;existe pas</h1>
        <p className="k-callout k-ink-secondary mt-3">
          Le lien est peut-être ancien, ou l&apos;adresse comporte une faute de frappe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonClass({ variant: 'primary' })}>
            Retour à l&apos;accueil
          </Link>
          <Link to="/quartiers" className={buttonClass({ variant: 'secondary' })}>
            Voir les quartiers
          </Link>
        </div>
      </div>
    </div>
  );
}
