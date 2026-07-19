import { ddmmToISOThisYear } from './dateUtils.js';

const ROUND_FACTOR = 100;
const DEFAULT_DELAY_MS = 200;

function round2(value) {
  return Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function portfolioEntrySymbol(entry) {
  return (entry.symbol && entry.symbol.trim()) || null;
}

export async function fetchPortfolioLiveQuotes(entries, fetchQuoteSinceFn, {
  now = new Date(),
  delayMs = DEFAULT_DELAY_MS,
  shouldContinue = () => true,
} = {}) {
  const overrides = {};

  for (const entry of entries) {
    if (!shouldContinue()) break;

    const symbol = portfolioEntrySymbol(entry);
    if (!symbol) continue;

    const sinceISO = ddmmToISOThisYear(entry.date, now);
    if (!sinceISO) continue;

    const quote = await fetchQuoteSinceFn(symbol, sinceISO);
    if (quote) {
      overrides[entry.id] = {
        depuis: isFiniteNumber(quote.sinceChange) ? round2(quote.sinceChange) : entry.depuis,
        ytd: isFiniteNumber(quote.ytdChange) ? round2(quote.ytdChange) : entry.ytd,
      };
    }

    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return overrides;
}
