import { describe, it, expect } from 'vitest';
import { ddmmToISOThisYear } from './dateUtils.js';

describe('ddmmToISOThisYear', () => {
  it('converts a DD/MM string to an ISO date using the given reference date\'s year', () => {
    expect(ddmmToISOThisYear('16/07', new Date('2026-01-01'))).toBe('2026-07-16');
  });

  it('pads single-digit day and month', () => {
    expect(ddmmToISOThisYear('5/3', new Date('2026-01-01'))).toBe('2026-03-05');
  });

  it('defaults to the current year when no reference date is given', () => {
    const year = new Date().getFullYear();
    expect(ddmmToISOThisYear('01/01')).toBe(`${year}-01-01`);
  });

  it('returns null for an unparseable date string', () => {
    expect(ddmmToISOThisYear('n/a')).toBeNull();
  });

  it('returns null for a non-string input', () => {
    expect(ddmmToISOThisYear(undefined)).toBeNull();
    expect(ddmmToISOThisYear(null)).toBeNull();
  });
});
