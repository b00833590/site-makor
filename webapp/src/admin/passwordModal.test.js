import { describe, it, expect } from 'vitest';
import { checkPassword } from './passwordModal.js';

describe('checkPassword', () => {
  it('returns true when the input exactly matches the expected password', () => {
    expect(checkPassword('secret123', 'secret123')).toBe(true);
  });

  it('returns false for a wrong password', () => {
    expect(checkPassword('wrong', 'secret123')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(checkPassword('Secret123', 'secret123')).toBe(false);
  });

  it('returns false for a non-string input', () => {
    expect(checkPassword(undefined, 'secret123')).toBe(false);
    expect(checkPassword(null, 'secret123')).toBe(false);
  });
});
