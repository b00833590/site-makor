// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { companySymbol, companyPresentationDateISO, buildChartSVG } from './companyChart.js';

describe('companySymbol', () => {
  it('returns the yahooSymbol field when present', () => {
    expect(companySymbol({ name: 'Evergreen Marine', yahooSymbol: '2603.TW' })).toBe('2603.TW');
  });

  it('returns null when yahooSymbol is missing', () => {
    expect(companySymbol({ name: 'Mystery Co' })).toBeNull();
  });

  it('returns null when yahooSymbol is an empty string', () => {
    expect(companySymbol({ name: 'Mystery Co', yahooSymbol: '' })).toBeNull();
  });
});

describe('companyPresentationDateISO', () => {
  const CURRENT_YEAR = new Date().getFullYear();
  const PORTFOLIO_ENTRIES = [
    { entreprise: 'Evergreen Marine', date: '16/07' },
    { entreprise: 'Geely Automobile Holdings Ltd', date: 'n/a' },
  ];

  it('resolves the ISO date from a matching portfolio entry', () => {
    expect(companyPresentationDateISO({ name: 'Evergreen Marine' }, PORTFOLIO_ENTRIES))
      .toBe(`${CURRENT_YEAR}-07-16`);
  });

  it('returns null when no portfolio entry matches the company name', () => {
    expect(companyPresentationDateISO({ name: 'Unknown Co' }, PORTFOLIO_ENTRIES)).toBeNull();
  });

  it('returns null when the matching entry has an unparseable date', () => {
    expect(companyPresentationDateISO({ name: 'Geely Automobile Holdings Ltd' }, PORTFOLIO_ENTRIES)).toBeNull();
  });

  it('returns null when given an empty portfolio entries list', () => {
    expect(companyPresentationDateISO({ name: 'Evergreen Marine' }, [])).toBeNull();
  });
});

describe('buildChartSVG', () => {
  it('returns null when given fewer than 2 points', () => {
    expect(buildChartSVG([])).toBeNull();
    expect(buildChartSVG([{ date: '2026-01-01', close: 100 }])).toBeNull();
  });

  it('returns an SVG element with a polyline containing one coordinate per point', () => {
    const svg = buildChartSVG([
      { date: '2026-01-01', close: 100 },
      { date: '2026-01-02', close: 110 },
      { date: '2026-01-03', close: 90 },
    ]);
    expect(svg.tagName.toLowerCase()).toBe('svg');
    const polyline = svg.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline.getAttribute('points').trim().split(' ')).toHaveLength(3);
  });

  it('uses the brand gold-light color for the line stroke', () => {
    const svg = buildChartSVG([
      { date: '2026-01-01', close: 100 },
      { date: '2026-01-02', close: 110 },
    ]);
    expect(svg.querySelector('polyline').getAttribute('stroke')).toBe('#e0b53d');
  });

  it('handles a flat price series (identical close values) without dividing by zero', () => {
    const svg = buildChartSVG([
      { date: '2026-01-01', close: 50 },
      { date: '2026-01-02', close: 50 },
    ]);
    const points = svg.querySelector('polyline').getAttribute('points');
    expect(points).not.toContain('NaN');
    expect(points).not.toContain('Infinity');
  });
});
