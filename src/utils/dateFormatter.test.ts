import { describe, it, expect } from 'vitest';
import { formatEventDate } from './dateFormatter';

describe('formatEventDate', () => {
  it('formats a valid date string', () => {
    expect(formatEventDate('2024-01-01T14:30:00')).toBe('lundi 1 janvier 2024 à 14:30');
  });

  it('returns empty string for falsy input', () => {
    expect(formatEventDate(null)).toBe('');
    expect(formatEventDate('')).toBe('');
  });

  it('returns Invalid Date for invalid input', () => {
    expect(formatEventDate('invalid-date-string')).toBe('Invalid Date');
  });
});
