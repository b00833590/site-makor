import { fetchPortfolioLiveQuotes } from '../data/portfolioLiveQuotes.js';
import { fetchQuoteSince as defaultFetchQuoteSince } from '../data/quoteClient.js';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export function startPortfolioLiveRefresh({
  getEntries,
  onOverrides,
  fetchQuoteSinceFn = defaultFetchQuoteSince,
  intervalMs = DEFAULT_INTERVAL_MS,
  delayMs,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let stopped = false;

  async function runCycle() {
    const overrides = await fetchPortfolioLiveQuotes(getEntries(), fetchQuoteSinceFn, {
      shouldContinue: () => !stopped,
      ...(delayMs !== undefined ? { delayMs } : {}),
    });
    if (!stopped && Object.keys(overrides).length > 0) onOverrides(overrides);
  }

  runCycle();
  const timerId = setIntervalFn(runCycle, intervalMs);

  return {
    stop() {
      stopped = true;
      clearIntervalFn(timerId);
    },
  };
}
