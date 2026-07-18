// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { initSidePanel } from './sidePanel.js';

describe('initSidePanel', () => {
  let labelEl, indicesEl, newsEl, companiesEl, compareEl, panel;

  beforeEach(() => {
    labelEl = document.createElement('div');
    indicesEl = document.createElement('div');
    newsEl = document.createElement('div');
    companiesEl = document.createElement('div');
    compareEl = document.createElement('div');
    panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl });
  });

  it('sets the region label', () => {
    panel.showRegion('Europe', { marketItems: [], newsItems: [] });
    expect(labelEl.textContent).toBe('Europe');
  });

  it('renders one row per market item with name, value and change', () => {
    panel.showRegion('Europe', {
      marketItems: [{ flag: '🇫🇷', name: 'CAC 40', value: '7 500', weekChange: 1.2 }],
      newsItems: [],
    });
    const row = indicesEl.querySelector('.panel-index-row');
    expect(row.querySelector('.panel-index-name').textContent).toBe('🇫🇷 CAC 40');
    expect(row.querySelector('.panel-index-value').textContent).toBe('7 500');
    expect(row.querySelector('.panel-index-change').textContent).toBe('1.2%');
  });

  it('marks negative changes with the negative class, positive with the positive class', () => {
    panel.showRegion('Europe', {
      marketItems: [{ name: 'X', value: '1', weekChange: -2.5 }],
      newsItems: [],
    });
    const change = indicesEl.querySelector('.panel-index-change');
    expect(change.classList.contains('negative')).toBe(true);
    expect(change.classList.contains('positive')).toBe(false);
  });

  it('renders one block per news item with title and description', () => {
    panel.showRegion('Europe', {
      marketItems: [],
      newsItems: [{ title: 'BCE relève ses taux', description: 'Détail.' }],
    });
    expect(newsEl.querySelector('h3').textContent).toBe('BCE relève ses taux');
    expect(newsEl.querySelector('p').textContent).toBe('Détail.');
  });

  it('clears previous content when called again for a different region', () => {
    panel.showRegion('Europe', { marketItems: [{ name: 'A', value: '1', weekChange: 1 }], newsItems: [] });
    panel.showRegion('Asie', { marketItems: [], newsItems: [] });
    expect(indicesEl.children.length).toBe(0);
  });

  it('never interprets stored content as HTML', () => {
    panel.showRegion('Europe', {
      marketItems: [],
      newsItems: [{ title: '<img src=x onerror=alert(1)>', description: 'ok' }],
    });
    expect(newsEl.querySelector('h3').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(newsEl.querySelector('img')).toBeNull();
  });

  it('renders company cards into companiesEl', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [],
      companyItems: [{ id: 'a', name: 'Toyota', bullets: [] }],
    });
    expect(companiesEl.querySelector('.panel-company-name').textContent).toBe('Toyota');
  });

  it('defaults companyItems to an empty list when omitted', () => {
    expect(() => panel.showRegion('Asie', { marketItems: [], newsItems: [] })).not.toThrow();
    expect(companiesEl.children.length).toBe(0);
  });

  it('clicking a compare toggle marks it active and re-renders', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [],
      companyItems: [{ id: 'a', name: 'Toyota', bullets: [] }],
    });
    companiesEl.querySelector('.panel-compare-toggle').click();
    expect(companiesEl.querySelector('.panel-compare-toggle').classList.contains('active')).toBe(true);
  });

  it('shows a comparison table once 2 companies are selected', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [],
      companyItems: [
        { id: 'a', name: 'Toyota', bullets: [] },
        { id: 'b', name: 'Honda', bullets: [] },
      ],
    });
    const toggles = companiesEl.querySelectorAll('.panel-compare-toggle');
    toggles[0].click();
    toggles[1].click();
    expect(compareEl.querySelector('.panel-compare-table')).not.toBeNull();
  });

  it('resets the comparator selection when showRegion is called again', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [],
      companyItems: [
        { id: 'a', name: 'Toyota', bullets: [] },
        { id: 'b', name: 'Honda', bullets: [] },
      ],
    });
    const toggles = companiesEl.querySelectorAll('.panel-compare-toggle');
    toggles[0].click();
    toggles[1].click();
    expect(compareEl.querySelector('.panel-compare-table')).not.toBeNull();

    panel.showRegion('Europe', { marketItems: [], newsItems: [], companyItems: [] });
    expect(compareEl.children.length).toBe(0);
  });
});
