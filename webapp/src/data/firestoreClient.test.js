import { describe, it, expect, vi } from 'vitest';
import { loadAllWithRetry, writeWithRetry } from './firestoreClient.js';

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

describe('writeWithRetry', () => {
  it('resolves without retrying when the write succeeds on the first attempt', async () => {
    const writeFn = vi.fn().mockResolvedValue(undefined);
    await writeWithRetry(writeFn, 2, 0);
    expect(writeFn).toHaveBeenCalledTimes(1);
  });

  it('retries after a failure and succeeds on a later attempt', async () => {
    const writeFn = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    await writeWithRetry(writeFn, 2, 0);
    expect(writeFn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once retries are exhausted', async () => {
    const writeFn = vi.fn().mockRejectedValue(new Error('persistent failure'));
    await expect(writeWithRetry(writeFn, 2, 0)).rejects.toThrow('persistent failure');
    expect(writeFn).toHaveBeenCalledTimes(3); // initial attempt + 2 retries
  });

  it('defaults to 2 retries when not specified', async () => {
    const writeFn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(writeWithRetry(writeFn, undefined, 0)).rejects.toThrow();
    expect(writeFn).toHaveBeenCalledTimes(3);
  });
});
