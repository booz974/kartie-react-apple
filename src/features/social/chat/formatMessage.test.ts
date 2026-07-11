import { describe, expect, it } from 'vitest';
import { formatMessage } from './formatMessage';

describe('formatMessage', () => {
  it('escapes HTML then applies bold and list formatting', () => {
    expect(formatMessage('Hello **world**')).toBe('Hello <strong>world</strong>');
    expect(formatMessage('- item')).toBe('• item');
    expect(formatMessage('<script>x</script>')).toBe(
      '&lt;script&gt;x&lt;/script&gt;',
    );
  });
});
