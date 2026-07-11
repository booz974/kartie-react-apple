export function formatEventDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
