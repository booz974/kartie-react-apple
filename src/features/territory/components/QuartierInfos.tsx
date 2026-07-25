import Icon, { type IconName } from '@/components/ui/Icon';
import { Page, PageHeader, Section } from '@/components/ui/Page';
import type { Quartier } from '@/lib/types/contract';

interface QuartierInfosProps {
  quartier: Quartier;
  onBack: () => void;
}

export default function QuartierInfos({ quartier }: QuartierInfosProps) {
  const sections: { icon: IconName; title: string; html: string }[] = [
    { icon: 'target', title: 'Les grands défis', html: quartier.enjeux as string },
    {
      icon: 'wrench',
      title: 'Actions et projets structurants',
      html: quartier.problematiques as string,
    },
    { icon: 'sparkles', title: 'Ce qui le rend unique', html: quartier.particularites as string },
    { icon: 'trendingUp', title: 'Les atouts pour demain', html: quartier.opportunites as string },
  ];

  const filled = sections.filter((section) => section.html?.trim());

  return (
    <Page className="k-page--reading">
      <PageHeader
        className="pt-8 md:pt-12"
        back={{ to: `/quartiers/${quartier.id}`, label: 'Retour au quartier' }}
        eyebrow="Portrait de quartier"
        title={quartier.name}
        description="Les enjeux, les projets et les atouts qui dessinent l’avenir du quartier."
      />

      {filled.length > 0 ? (
        <div className="k-list">
          {filled.map((section) => (
            <Section key={section.title} className="py-10 first:pt-2">
              <h2 className="k-title-2 mb-4 flex items-center gap-2.5">
                <Icon name={section.icon} size={20} className="text-accent" />
                {section.title}
              </h2>
              {/* Contenu éditorial issu de la base : la mise en forme est
                  entièrement portée par .k-prose, pour rester homogène d'un
                  quartier à l'autre. */}
              <div
                className="k-prose k-measure"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </Section>
          ))}
        </div>
      ) : (
        <p className="k-callout k-ink-tertiary py-10">
          Le portrait détaillé de ce quartier n’est pas encore disponible.
        </p>
      )}
    </Page>
  );
}
