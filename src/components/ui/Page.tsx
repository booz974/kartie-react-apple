import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Icon from './Icon';

/**
 * Gouttière unique du produit. Toutes les vues partagent la même largeur utile
 * et le même rythme vertical — c'est ce qui fait qu'elles appartiennent au
 * même produit une fois mises côte à côte.
 */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['k-page', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

type PageHeaderProps = {
  /** Fil d'Ariane court : où suis-je, et comment je remonte. */
  back?: { to: string; label: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={['pb-6', className].filter(Boolean).join(' ')}>
      {back ? (
        <Link
          to={back.to}
          className="k-btn k-btn--plain k-footnote mb-3 -ml-1 inline-flex items-center gap-1 font-medium"
          // Un libellé issu des données peut arriver vide ; le lien ne doit
          // jamais se réduire à un chevron sans nom accessible.
          aria-label={back.label?.trim() ? undefined : 'Retour'}
        >
          <Icon name="chevronLeft" size={16} />
          {back.label?.trim() || 'Retour'}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="k-eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="k-title-large text-balance">{title}</h1>
          {description ? (
            <p className="k-callout k-ink-secondary k-measure mt-3">{description}</p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type SectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  /** Lien ou bouton aligné sur le titre — « Tout voir », « Ajouter ». */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function Section({ title, description, action, children, className, id }: SectionProps) {
  return (
    <section id={id} className={['k-section', className].filter(Boolean).join(' ')}>
      {title || action ? (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="k-title-2 text-balance">{title}</h2> : null}
            {description ? (
              <p className="k-subhead k-ink-secondary k-measure mt-1.5">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
