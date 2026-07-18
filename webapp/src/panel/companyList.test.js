// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderCompanies, renderComparison } from './companyList.js';

const COMPANY_A = {
  id: 'a', name: 'Reliance Industries', yahooSymbol: 'RELIANCE.NS', flag: '🇮🇳', country: 'Inde',
  marketCap: '210 Md$', salesGrowth: '12%', evEbitda: '14x', coursActuel: '1 450', targetPrice: '1 600',
  bullets: ['Expansion retail', 'Croissance Jio'],
};
const COMPANY_B = {
  id: 'b', name: 'Toyota', yahooSymbol: '7203.T', flag: '🇯🇵', country: 'Japon',
  marketCap: '260 Md$', salesGrowth: '5%', evEbitda: '9x', coursActuel: '2 900', targetPrice: '3 100',
  bullets: [],
};

describe('renderCompanies', () => {
  it('renders one card per company with name, symbol/flag/country and market cap', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A], [], () => {});
    const card = container.querySelector('.panel-company-card');
    expect(card.querySelector('.panel-company-name').textContent).toBe('Reliance Industries');
    expect(card.querySelector('.panel-company-sub').textContent).toBe('RELIANCE.NS · 🇮🇳 · Inde');
    expect(card.querySelector('.panel-company-cap').textContent).toBe('210 Md$');
  });

  it('renders the 4-stat grid with values', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A], [], () => {});
    const values = [...container.querySelectorAll('.panel-company-stat-value')].map(el => el.textContent);
    expect(values).toEqual(['12%', '14x', '1 450', '1 600']);
  });

  it('renders one bullet item per bullet, none when the list is empty', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], [], () => {});
    const cards = container.querySelectorAll('.panel-company-card');
    expect(cards[0].querySelectorAll('.panel-company-bullets li')).toHaveLength(2);
    expect(cards[1].querySelectorAll('.panel-company-bullets li')).toHaveLength(0);
  });

  it('marks the compare toggle active only for selected company ids', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], ['b'], () => {});
    const toggles = container.querySelectorAll('.panel-compare-toggle');
    expect(toggles[0].classList.contains('active')).toBe(false);
    expect(toggles[1].classList.contains('active')).toBe(true);
  });

  it('calls onToggle with the company id when its compare button is clicked', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();
    renderCompanies(container, [COMPANY_A], [], onToggle);
    container.querySelector('.panel-compare-toggle').click();
    expect(onToggle).toHaveBeenCalledWith('a');
  });

  it('clears previous cards on re-render', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], [], () => {});
    renderCompanies(container, [COMPANY_A], [], () => {});
    expect(container.querySelectorAll('.panel-company-card')).toHaveLength(1);
  });

  it('never interprets stored content as HTML', () => {
    const container = document.createElement('div');
    renderCompanies(container, [{ ...COMPANY_A, name: '<img src=x onerror=alert(1)>' }], [], () => {});
    expect(container.querySelector('.panel-company-name').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('renderComparison', () => {
  it('renders nothing when fewer than 2 companies are selected', () => {
    const container = document.createElement('div');
    renderComparison(container, [COMPANY_A, COMPANY_B], ['a']);
    expect(container.children).toHaveLength(0);
  });

  it('renders a comparison table with both companies stats when exactly 2 are selected', () => {
    const container = document.createElement('div');
    renderComparison(container, [COMPANY_A, COMPANY_B], ['a', 'b']);
    const table = container.querySelector('.panel-compare-table');
    expect(table).not.toBeNull();
    expect(table.textContent).toContain('Reliance Industries');
    expect(table.textContent).toContain('Toyota');
    expect(table.textContent).toContain('1 450');
    expect(table.textContent).toContain('2 900');
  });

  it('clears a previous comparison when the selection drops back below 2', () => {
    const container = document.createElement('div');
    renderComparison(container, [COMPANY_A, COMPANY_B], ['a', 'b']);
    renderComparison(container, [COMPANY_A, COMPANY_B], ['a']);
    expect(container.children).toHaveLength(0);
  });
});
