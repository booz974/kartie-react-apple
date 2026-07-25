import { describe, expect, it } from 'vitest';
import { DESTINATIONS, destinationsFor } from './navigation';

describe('destinationsFor', () => {
  it('mène à la liste des quartiers sans rattachement connu', () => {
    for (const quartierId of [null, undefined]) {
      const destinations = destinationsFor(quartierId);
      const quartiers = destinations.find((item) => item.label === 'Quartiers');

      expect(quartiers?.to).toBe('/quartiers');
      expect(destinations.find((item) => item.label === 'Mon quartier')).toBeUndefined();
    }
  });

  it('mène au quartier de la personne connectée', () => {
    const destinations = destinationsFor(7);
    const mine = destinations.find((item) => item.label === 'Mon quartier');

    expect(mine?.to).toBe('/quartiers/7');
    expect(mine?.icon).toBe('mapPin');
    expect(destinations.find((item) => item.label === 'Quartiers')).toBeUndefined();
  });

  it('laisse les autres destinations intactes et garde leur ordre', () => {
    const destinations = destinationsFor(3);

    expect(destinations).toHaveLength(DESTINATIONS.length);
    expect(destinations.map((item) => item.label)).toEqual([
      'Accueil',
      'Mon quartier',
      'Assistant',
    ]);
    expect(destinations[0]).toEqual(DESTINATIONS[0]);
    expect(destinations[2]).toEqual(DESTINATIONS[2]);
  });

  it('ne modifie pas la liste de référence', () => {
    destinationsFor(11);

    expect(DESTINATIONS[1]).toEqual({ to: '/quartiers', label: 'Quartiers', icon: 'map' });
  });

  // Le quartier numéro zéro n'existe pas côté données, mais `0` est falsy :
  // un test de vérité plutôt qu'une comparaison à `null` renverrait l'onglet
  // vers la liste, et le rattachement serait perdu.
  it('traite le quartier zéro comme un rattachement', () => {
    expect(destinationsFor(0).find((item) => item.label === 'Mon quartier')?.to).toBe(
      '/quartiers/0',
    );
  });
});
