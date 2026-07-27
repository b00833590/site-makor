import { describe, it, expect } from 'vitest';
import { safeText } from './pdfTextSanitize.js';

describe('safeText', () => {
  it('replaces a narrow no-break space (French thousands separator, e.g. jsPDF-breaking "64 611 pts") with a plain space', () => {
    expect(safeText('64 611 pts')).toBe('64 611 pts');
  });

  it('replaces a non-breaking space with a plain space', () => {
    expect(safeText('8 772 pts')).toBe('8 772 pts');
  });

  it('replaces every other special space variant it targets', () => {
    const codepoints = [0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x205f, 0x3000];
    for (const cp of codepoints) {
      expect(safeText(`a${String.fromCodePoint(cp)}b`)).toBe('a b');
    }
  });

  it('leaves ordinary text (including accents and normal spaces) untouched', () => {
    expect(safeText('Le KOSPI sud-coréen a bondi de 4,40%')).toBe('Le KOSPI sud-coréen a bondi de 4,40%');
  });

  it('returns an empty string for null/undefined', () => {
    expect(safeText(null)).toBe('');
    expect(safeText(undefined)).toBe('');
  });

  it('coerces non-string values (e.g. numbers) to string', () => {
    expect(safeText(42)).toBe('42');
  });
});
