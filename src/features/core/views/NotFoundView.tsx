import { Link } from 'react-router';
import { buttonClass } from '@/components/ui/Button';

export default function NotFoundView() {
  return (
    // On dit où l'on est, pourquoi, et par où repartir : un cul-de-sac sans
    // sortie est ce qui fait quitter un produit.
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="k-card flex max-w-md flex-col items-center p-8 text-center md:p-10">
        <span className="mb-5 text-6xl leading-none" aria-hidden="true">
          🧭
        </span>
        <span className="k-badge k-badge--warm k-badge--lg mb-3">Erreur 404</span>
        <h1 className="k-title-1 text-balance">Cette page n&apos;existe pas</h1>
        <p className="k-callout k-ink-secondary mt-3">
          Le lien est peut-être ancien, ou l&apos;adresse comporte une faute de frappe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/" className={buttonClass({ variant: 'primary' })}>
            <span aria-hidden="true">🏠</span>
            Retour à l&apos;accueil
          </Link>
          <Link to="/quartiers" className={buttonClass({ variant: 'secondary' })}>
            <span aria-hidden="true">📍</span>
            Voir les quartiers
          </Link>
        </div>
      </div>
    </div>
  );
}
