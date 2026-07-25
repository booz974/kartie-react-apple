import type { Consultation, ConsultationDetails, Petition } from '@/lib/types/contract';
import type { IconName } from '@/components/ui/Icon';

export interface ConsultationOptionLike {
  id: number;
  option_text?: string;
  text?: string;
  label?: string;
  votes?: number;
}

export function getConsultationOptions(
  consultation: Consultation | null | undefined,
): ConsultationOptionLike[] {
  if (!consultation) return [];
  const withOptions = consultation as Consultation & {
    consultation_options?: ConsultationOptionLike[];
    options?: ConsultationOptionLike[];
  };
  if (withOptions.consultation_options && withOptions.consultation_options.length > 0) {
    return withOptions.consultation_options;
  }
  if (Array.isArray(withOptions.options)) {
    return withOptions.options;
  }
  return [];
}

export function getResultPercentage(votes: number, details: ConsultationDetails | null): number {
  if (!details?.options) return 0;
  const totalVotes = details.options.reduce(
    (total, opt) => total + ((opt as ConsultationOptionLike).votes || 0),
    0,
  );
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
}

export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    return `${day} ${month}`;
  } catch {
    return '—';
  }
}

/**
 * Teinte d'une catégorie de réalisation.
 *
 * Les catégories sont des repères de lecture, pas des alertes : elles restent
 * neutres et n'empruntent qu'à la palette du produit, pour que la couleur
 * garde son sens là où elle signale vraiment quelque chose.
 */
export function getCategoryColor(category: string | null | undefined): string {
  const emphasised: Record<string, string> = {
    Travaux: 'bg-accent-soft text-accent',
    Environnement: 'bg-success-soft text-success',
    Social: 'bg-success-soft text-success',
    Culture: 'bg-warm-soft text-warm',
    Sport: 'bg-warm-soft text-warm',
  };
  return emphasised[category ?? ''] ?? 'bg-surface-secondary text-ink-secondary';
}

/** Icône associée à un thème de pétition, pour éviter un mur de puces identiques. */
export function getPetitionThemeIcon(theme: string | null | undefined): IconName {
  const value = (theme ?? '').toLowerCase();
  if (value.includes('transport') || value.includes('mobilité')) return 'road';
  if (value.includes('sécurité') || value.includes('sécurite')) return 'shield';
  if (value.includes('environnement') || value.includes('écologie') || value.includes('ecologie')) {
    return 'leaf';
  }
  if (value.includes('logement') || value.includes('habitat')) return 'building';
  if (value.includes('emploi') || value.includes('économie') || value.includes('economie')) {
    return 'briefcase';
  }
  if (value.includes('culture') || value.includes('sport')) return 'trophy';
  return 'megaphone';
}

export function formatStatValue(value: unknown, removePercent = false): string {
  if (!value && value !== 0) return 'N/A';
  const cleanValue = String(value).replace(/%/g, '');
  if (removePercent) {
    return cleanValue;
  }
  return `${cleanValue}%`;
}

export function getPetitionProgress(petition: Petition): number {
  const supports = (petition.supports as number) || 0;
  const goal = 100;
  const progress = Math.min((supports / goal) * 100, 100);
  return Math.round(progress);
}

export function getOptionText(option: ConsultationOptionLike): string {
  return option.option_text || option.text || option.label || '';
}
