import { describe, it, expect, vi } from 'vitest';
import { fetchPortfolioLiveQuotes, portfolioEntrySymbol } from './portfolioLiveQuotes.js';

describe('portfolioEntrySymbol', () => {
  it('returns the trimmed symbol field when present', () => {
    expect(portfolioEntrySymbol({ symbol: ' NVT ' })).toBe('NVT');
  });

  it('returns null when symbol is missing or blank', () => {
    expect(portfolioEntrySymbol({})).toBeNull();
    expect(portfolioEntrySymbol({ symbol: '   ' })).toBeNull();
  });
});

describe('fetchPortfolioLiveQuotes', () => {
  const NOW = new Date('2026-07-19');

  it('fetches a quote for each entry with a resolvable symbol and returns overrides keyed by entry id', async () => {
    const entries = [
      { id: 'p1', date: '16/07', symbol: 'NVT', depuis: 1, ytd: 1 },
      { id: 'p2', date: '01/01', symbol: 'CECO', depuis: 2, ytd: 2 },
    ];
    const fetchQuoteSinceFn = vi.fn()
      .mockResolvedValueOnce({ sinceChange: 3.456, ytdChange: 7.891 })
      .mockResolvedValueOnce({ sinceChange: -1.2, ytdChange: 0.5 });

    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });

    expect(fetchQuoteSinceFn).toHaveBeenNthCalledWith(1, 'NVT', '2026-07-16');
    expect(fetchQuoteSinceFn).toHaveBeenNthCalledWith(2, 'CECO', '2026-01-01');
    expect(overrides).toEqual({
      p1: { depuis: 3.46, ytd: 7.89 },
      p2: { depuis: -1.2, ytd: 0.5 },
    });
  });

  it('skips entries with no resolvable symbol without calling fetch for them', async () => {
    const entries = [{ id: 'p1', date: '16/07', symbol: '', depuis: 1, ytd: 1 }];
    const fetchQuoteSinceFn = vi.fn();
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });
    expect(fetchQuoteSinceFn).not.toHaveBeenCalled();
    expect(overrides).toEqual({});
  });

  it('omits an entry from the overrides when its quote fetch fails (returns null)', async () => {
    const entries = [{ id: 'p1', date: '16/07', symbol: 'NVT', depuis: 1, ytd: 1 }];
    const fetchQuoteSinceFn = vi.fn().mockResolvedValue(null);
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });
    expect(overrides).toEqual({});
  });

  it('falls back to the entry\'s existing depuis/ytd when the API response omits one of the fields', async () => {
    const entries = [{ id: 'p1', date: '16/07', symbol: 'NVT', depuis: 1, ytd: 1 }];
    const fetchQuoteSinceFn = vi.fn().mockResolvedValue({ ytdChange: 4 });
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });
    expect(overrides).toEqual({ p1: { depuis: 1, ytd: 4 } });
  });

  it('falls back to the entry\'s existing depuis/ytd when the API returns null instead of omitting a field', async () => {
    const entries = [{ id: 'p1', date: '16/07', symbol: 'NVT', depuis: 1, ytd: 1 }];
    const fetchQuoteSinceFn = vi.fn().mockResolvedValue({ sinceChange: null, ytdChange: 4 });
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });
    expect(overrides).toEqual({ p1: { depuis: 1, ytd: 4 } });
  });

  it('skips entries whose date cannot be parsed, without calling fetch for them', async () => {
    const entries = [{ id: 'p1', date: 'n/a', symbol: 'NVT', depuis: 1, ytd: 1 }];
    const fetchQuoteSinceFn = vi.fn();
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0 });
    expect(fetchQuoteSinceFn).not.toHaveBeenCalled();
    expect(overrides).toEqual({});
  });

  it('stops iterating once shouldContinue returns false', async () => {
    const entries = [
      { id: 'p1', date: '16/07', symbol: 'NVT', depuis: 1, ytd: 1 },
      { id: 'p2', date: '01/01', symbol: 'CECO', depuis: 2, ytd: 2 },
    ];
    const fetchQuoteSinceFn = vi.fn().mockResolvedValue({ sinceChange: 1, ytdChange: 1 });
    let calls = 0;
    const shouldContinue = () => { calls += 1; return calls <= 1; };
    const overrides = await fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, { now: NOW, delayMs: 0, shouldContinue });
    expect(fetchQuoteSinceFn).toHaveBeenCalledTimes(1);
    expect(Object.keys(overrides)).toEqual(['p1']);
  });
});
