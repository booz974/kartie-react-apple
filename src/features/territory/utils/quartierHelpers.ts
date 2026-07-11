import type { Consultation, ConsultationDetails, Petition } from '@/lib/types/contract';

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

export function getResultPercentage(
  votes: number,
  details: ConsultationDetails | null,
): number {
  if (!details?.options) return 0;
  const totalVotes = details.options.reduce(
    (total, opt) => total + ((opt as ConsultationOptionLike).votes || 0),
    0,
  );
  if (totalVotes === 0) return 0;
  return Math.round((votes / totalVotes) * 100);
}

export function getVoteButtonClass(index: number): string {
  const classes = [
    'bg-gradient-to-r from-green-400/40 to-emerald-500/40 hover:from-green-400/60 hover:to-emerald-500/60 text-green-900',
    'bg-gradient-to-r from-red-400/40 to-rose-500/40 hover:from-red-400/60 hover:to-rose-500/60 text-red-900',
    'bg-gradient-to-r from-gray-400/40 to-slate-500/40 hover:from-gray-400/60 hover:to-slate-500/60 text-gray-900',
    'bg-gradient-to-r from-blue-400/40 to-indigo-500/40 hover:from-blue-400/60 hover:to-indigo-500/60 text-blue-900',
    'bg-gradient-to-r from-purple-400/40 to-violet-500/40 hover:from-purple-400/60 hover:to-violet-500/60 text-purple-900',
    'bg-gradient-to-r from-orange-400/40 to-amber-500/40 hover:from-orange-400/60 hover:to-amber-500/60 text-orange-900',
  ];
  return classes[index % classes.length] || classes[0];
}

export function getVoteEmoji(index: number): string {
  const emojis = ['✅', '❌', '➖', '👍', '👎', '🤷'];
  return emojis[index] || '✅';
}

export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '📅';
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' });
    return `${day} ${month}`;
  } catch {
    return '📅';
  }
}

export function getCategoryColor(category: string | null | undefined): string {
  const colors: Record<string, string> = {
    Travaux: 'bg-blue-500/20 text-blue-900',
    Culture: 'bg-purple-500/20 text-purple-900',
    Social: 'bg-green-500/20 text-green-900',
    Économie: 'bg-amber-500/20 text-amber-900',
    Environnement: 'bg-emerald-500/20 text-emerald-900',
    Sport: 'bg-red-500/20 text-red-900',
    Éducation: 'bg-indigo-500/20 text-indigo-900',
  };
  return colors[category ?? ''] || 'bg-slate-500/20 text-slate-900';
}

export function formatStatValue(
  value: unknown,
  removePercent = false,
): string {
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

export function getPetitionThemeColor(theme: string | null | undefined): string {
  if (!theme) return 'bg-slate-500/20 text-slate-900';
  const themeLower = theme.toLowerCase();
  if (themeLower.includes('transport') || themeLower.includes('mobilité')) {
    return 'bg-blue-500/20 text-blue-900';
  }
  if (themeLower.includes('sécurité') || themeLower.includes('sécurite')) {
    return 'bg-red-500/20 text-red-900';
  }
  if (
    themeLower.includes('environnement') ||
    themeLower.includes('écologie') ||
    themeLower.includes('ecologie')
  ) {
    return 'bg-green-500/20 text-green-900';
  }
  if (themeLower.includes('logement') || themeLower.includes('habitat')) {
    return 'bg-purple-500/20 text-purple-900';
  }
  if (
    themeLower.includes('emploi') ||
    themeLower.includes('économie') ||
    themeLower.includes('economie')
  ) {
    return 'bg-amber-500/20 text-amber-900';
  }
  if (themeLower.includes('culture') || themeLower.includes('sport')) {
    return 'bg-pink-500/20 text-pink-900';
  }
  return 'bg-slate-500/20 text-slate-900';
}

export function getOptionText(option: ConsultationOptionLike): string {
  return option.option_text || option.text || option.label || '';
}
