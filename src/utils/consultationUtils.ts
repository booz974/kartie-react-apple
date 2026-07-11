export function parseConsultationOptions(optionsText: string | null | undefined): string[] {
  if (!optionsText) return [];

  return optionsText
    .split('\n')
    .map((opt) => opt.trim())
    .filter((opt) => opt !== '');
}
