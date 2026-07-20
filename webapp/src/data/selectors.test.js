import { describe, it, expect } from 'vitest';
import { getWeeks, getMarketItemsForWeekAndRegion, getNewsItemsForWeekAndRegion, getCompanyItemsForWeekAndRegion, getWeekContentKeys } from './selectors.js';

const DB = {
  'mkg:week:w2': { id: 'w2', label: 'Semaine 2', order: 1 },
  'mkg:week:w1': { id: 'w1', label: 'Semaine 1', order: 0 },
  'mkg:market:w1:idx1': { id: 'idx1', group: 'ASIE', name: 'Nikkei 225', value: '39 000', weekChange: 1.1, ytdChange: 4.2 },
  'mkg:market:w1:idx2': { id: 'idx2', group: 'EUROPE & UK', name: 'CAC 40', value: '7 500', weekChange: -0.4, ytdChange: 2.1 },
  'mkg:market:w1:idx3': { id: 'idx3', group: 'DEVISES (VS USD)', name: 'EUR/USD', value: '1.08', weekChange: 0.1, ytdChange: -1.0 },
  'mkg:market:w2:idx4': { id: 'idx4', group: 'ASIE', name: 'Hang Seng', value: '18 000', weekChange: 0.5, ytdChange: 1.0 },
  'mkg:content:news:w1:n1': { id: 'n1', region: 'JP — ASIE —', title: 'BoJ maintient ses taux', description: 'Détail.' },
  'mkg:content:news:w1:n2': { id: 'n2', region: 'EU — EUROPE —', title: 'BCE relève ses taux', description: 'Détail.' },
  'mkg:content:entreprises:w1:c1': { id: 'c1', name: 'Some Co', region: 'Asie' },
  'mkg:content:entreprises:w1:c2': { id: 'c2', name: 'Reliance Industries', region: 'BRICS', yahooSymbol: 'RELIANCE.NS', flag: '🇮🇳', country: 'Inde', marketCap: '210 Md$', bullets: ['Point clé 1'] },
  'mkg:content:entreprises:w2:c3': { id: 'c3', name: 'Toyota', region: 'Asie' },
};

describe('getWeeks', () => {
  it('returns weeks sorted by order ascending, regardless of key iteration order', () => {
    expect(getWeeks(DB)).toEqual([
      { id: 'w1', label: 'Semaine 1', order: 0 },
      { id: 'w2', label: 'Semaine 2', order: 1 },
    ]);
  });
});

describe('getMarketItemsForWeekAndRegion', () => {
  it('returns only market items for the given week and region', () => {
    const items = getMarketItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Nikkei 225');
  });

  it('matches region labels with extra text (e.g. "EUROPE & UK")', () => {
    const items = getMarketItemsForWeekAndRegion(DB, 'w1', 'europe');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('CAC 40');
  });

  it('excludes non-regional groups like currencies', () => {
    const items = getMarketItemsForWeekAndRegion(DB, 'w1', 'europe');
    expect(items.some(i => i.name === 'EUR/USD')).toBe(false);
  });

  it('does not leak items from a different week', () => {
    const items = getMarketItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items.some(i => i.name === 'Hang Seng')).toBe(false);
  });

  it('returns an empty array when nothing matches', () => {
    expect(getMarketItemsForWeekAndRegion(DB, 'w1', 'north-america')).toEqual([]);
  });
});

describe('getNewsItemsForWeekAndRegion', () => {
  it('returns only news items for the given week and region', () => {
    const items = getNewsItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('BoJ maintient ses taux');
  });

  it('returns an empty array when nothing matches', () => {
    expect(getNewsItemsForWeekAndRegion(DB, 'w1', 'north-america')).toEqual([]);
  });

  it('does not include entreprises items even though they also have a region field', () => {
    const items = getNewsItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items.some(i => i.id === 'c1')).toBe(false);
  });
});

describe('getCompanyItemsForWeekAndRegion', () => {
  it('returns only company items for the given week and region', () => {
    const items = getCompanyItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Some Co');
  });

  it('matches a different region correctly', () => {
    const items = getCompanyItemsForWeekAndRegion(DB, 'w1', 'brics-uk');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Reliance Industries');
  });

  it('does not leak items from a different week', () => {
    const items = getCompanyItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items.some(i => i.name === 'Toyota')).toBe(false);
  });

  it('does not include the news item even though it shares the mkg:content: root and would also normalize to asia', () => {
    const items = getCompanyItemsForWeekAndRegion(DB, 'w1', 'asia');
    expect(items.some(i => i.id === 'n1')).toBe(false);
  });

  it('returns an empty array when nothing matches', () => {
    expect(getCompanyItemsForWeekAndRegion(DB, 'w1', 'north-america')).toEqual([]);
  });
});

describe('getWeekContentKeys', () => {
  const DB = {
    'mkg:week:w1': { id: 'w1', label: 'Semaine 1', order: 0 },
    'mkg:market:w1:m1': { id: 'm1' },
    'mkg:market:w1:m2': { id: 'm2' },
    'mkg:content:news:w1:n1': { id: 'n1' },
    'mkg:content:entreprises:w1:c1': { id: 'c1' },
    'mkg:market:w2:m3': { id: 'm3' },
    'mkg:portfolio:p1': { id: 'p1' },
  };

  it('returns every market/news/entreprises key for the given week, plus the week document itself', () => {
    const keys = getWeekContentKeys(DB, 'w1');
    expect(keys.sort()).toEqual([
      'mkg:content:entreprises:w1:c1',
      'mkg:content:news:w1:n1',
      'mkg:market:w1:m1',
      'mkg:market:w1:m2',
      'mkg:week:w1',
    ].sort());
  });

  it("does not include another week's content", () => {
    const keys = getWeekContentKeys(DB, 'w1');
    expect(keys).not.toContain('mkg:market:w2:m3');
  });

  it('never includes portfolio entries, which are not week-scoped', () => {
    const keys = getWeekContentKeys(DB, 'w1');
    expect(keys).not.toContain('mkg:portfolio:p1');
  });

  it('returns just the week document key when the week has no other content', () => {
    const keys = getWeekContentKeys({ 'mkg:week:w9': { id: 'w9', label: 'Vide', order: 9 } }, 'w9');
    expect(keys).toEqual(['mkg:week:w9']);
  });
});
