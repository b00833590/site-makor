// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderPortfolioTable } from './portfolioTable.js';

const ENTRIES = [
  { id: 'p1', date: '12/03', entreprise: 'Evergreen Marine', stagiaire: 'Léa', symbol: '2603.TW', depuis: 5.2, ytd: 5.0 },
  { id: 'p2', date: '01/01', entreprise: 'Toyota', stagiaire: 'Tom', symbol: '7203.T', depuis: -1.1, ytd: 0.4 },
];

describe('renderPortfolioTable', () => {
  it('renders one row per entry with all 6 columns', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    const cells = [...rows[0].querySelectorAll('td')].map(td => td.textContent);
    expect(cells).toEqual(['12/03', 'Evergreen Marine', 'Léa', '2603.TW', '5.2%', '5%']);
  });

  it('renders the 6 column headers', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    const headers = [...container.querySelectorAll('thead th')].map(th => th.textContent.replace(/[▲▼]/g, '').trim());
    expect(headers).toEqual(['DATE', 'ENTREPRISE', 'STAGIAIRE', 'SYMBOLE', 'DEPUIS', 'YTD']);
  });

  it('shows a sort indicator only on the currently-sorted column', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'ytd', sortDirection: 'desc', onSort: () => {} });
    const headers = [...container.querySelectorAll('thead th')];
    expect(headers.find(h => h.textContent.startsWith('YTD')).textContent).toContain('▼');
    expect(headers.find(h => h.textContent.startsWith('DATE')).textContent).not.toMatch(/[▲▼]/);
  });

  it('calls onSort with the clicked column field', () => {
    const container = document.createElement('div');
    const onSort = vi.fn();
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort });
    const headers = [...container.querySelectorAll('thead th')];
    headers.find(h => h.textContent.startsWith('YTD')).click();
    expect(onSort).toHaveBeenCalledWith('ytd');
  });

  it('marks DATE/DEPUIS/YTD headers as sortable', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    const headers = [...container.querySelectorAll('thead th')];
    for (const label of ['DATE', 'DEPUIS', 'YTD']) {
      const th = headers.find(h => h.textContent.startsWith(label));
      expect(th.className).toBe('portfolio-sortable');
    }
  });

  it('does not mark ENTREPRISE/STAGIAIRE/SYMBOLE headers as sortable', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    const headers = [...container.querySelectorAll('thead th')];
    for (const label of ['ENTREPRISE', 'STAGIAIRE', 'SYMBOLE']) {
      const th = headers.find(h => h.textContent.startsWith(label));
      expect(th.className).toBe('');
    }
  });

  it('does not call onSort when clicking ENTREPRISE/STAGIAIRE/SYMBOLE headers', () => {
    const container = document.createElement('div');
    const onSort = vi.fn();
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort });
    const headers = [...container.querySelectorAll('thead th')];
    for (const label of ['ENTREPRISE', 'STAGIAIRE', 'SYMBOLE']) {
      headers.find(h => h.textContent.startsWith(label)).click();
    }
    expect(onSort).not.toHaveBeenCalled();
  });

  it('renders an empty percentage cell rather than "undefined%" for a missing depuis/ytd value', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, [{ id: 'p3', date: '01/01', entreprise: 'X', stagiaire: 'Y', symbol: 'Z' }], { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    const cells = [...container.querySelectorAll('tbody td')];
    expect(cells[4].textContent).toBe('');
    expect(cells[5].textContent).toBe('');
  });

  it('clears previous rows on re-render', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, ENTRIES, { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    renderPortfolioTable(container, [ENTRIES[0]], { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('never interprets stored content as HTML', () => {
    const container = document.createElement('div');
    renderPortfolioTable(container, [{ ...ENTRIES[0], entreprise: '<img src=x onerror=alert(1)>' }], { sortField: 'date', sortDirection: 'asc', onSort: () => {} });
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });
});
