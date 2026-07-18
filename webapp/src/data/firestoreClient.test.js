import { describe, it, expect, vi } from 'vitest';
import { loadAllWithRetry } from './firestoreClient.js';

describe('loadAllWithRetry', () => {
  it('returns the first result immediately when it is non-empty', async () => {
    const loadOnce = vi.fn().mockResolvedValue({ 'mkg:week:a': { id: 'a' } });
    const result = await loadAllWithRetry(loadOnce, 0);
    expect(result).toEqual({ 'mkg:week:a': { id: 'a' } });
    expect(loadOnce).toHaveBeenCalledTimes(1);
  });

  it('retries once and returns the second result when the first is empty', async () => {
    const loadOnce = vi.fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ 'mkg:week:a': { id: 'a' } });
    const result = await loadAllWithRetry(loadOnce, 0);
    expect(result).toEqual({ 'mkg:week:a': { id: 'a' } });
    expect(loadOnce).toHaveBeenCalledTimes(2);
  });

  it('retries once and returns the second result when the first is null', async () => {
    const loadOnce = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ 'mkg:week:a': { id: 'a' } });
    const result = await loadAllWithRetry(loadOnce, 0);
    expect(result).toEqual({ 'mkg:week:a': { id: 'a' } });
  });

  it('returns an empty object if both attempts are empty', async () => {
    const loadOnce = vi.fn().mockResolvedValue({});
    const result = await loadAllWithRetry(loadOnce, 0);
    expect(result).toEqual({});
    expect(loadOnce).toHaveBeenCalledTimes(2);
  });
});
