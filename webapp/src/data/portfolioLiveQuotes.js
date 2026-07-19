import { ddmmToISOThisYear } from './dateUtils.js';

const ROUND_FACTOR = 100;
const DEFAULT_DELAY_MS = 200;

function round2(value) {
  return Math.round(value * ROUND_FACTOR) / ROUND_FACTOR;
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
    const quote = await fetchQuoteSinceFn(symbol, sinceISO);
    if (quote) {
      overrides[entry.id] = {
        depuis: quote.sinceChange === undefined ? entry.depuis : round2(quote.sinceChange),
        ytd: quote.ytdChange === undefined ? entry.ytd : round2(quote.ytdChange),
      };
    }

    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return overrides;
}
