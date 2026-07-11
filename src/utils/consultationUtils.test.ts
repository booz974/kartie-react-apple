import { describe, it, expect } from 'vitest';
import { parseConsultationOptions } from './consultationUtils';

describe('parseConsultationOptions', () => {
  it('parses newline-separated options', () => {
    expect(parseConsultationOptions('Option 1\nOption 2')).toEqual(['Option 1', 'Option 2']);
  });

  it('trims and ignores empty lines', () => {
    expect(parseConsultationOptions('  A  \n\nB\n')).toEqual(['A', 'B']);
  });

  it('returns empty array for falsy input', () => {
    expect(parseConsultationOptions('')).toEqual([]);
    expect(parseConsultationOptions(null)).toEqual([]);
  });
});
