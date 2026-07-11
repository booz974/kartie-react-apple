export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Vue ChatView formatMessage parity: escape + **bold** + list bullets. */
export function formatMessage(content: string): string {
  const safeContent = escapeHtml(content);
  return safeContent
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)/gm, '• $1');
}
