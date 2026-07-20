// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initSidePanel } from './sidePanel.js';

describe('initSidePanel', () => {
  let labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, panel;

  beforeEach(() => {
    labelEl = document.createElement('div');
    indicesEl = document.createElement('div');
    newsEl = document.createElement('div');
    companiesEl = document.createElement('div');
    compareEl = document.createElement('div');
    portfolioLabelEl = document.createElement('div');
    portfolioEl = document.createElement('div');
    panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart: () => {}, onIndexEdit: () => {}, onIndexAdd: () => {}, onIndexDelete: () => {} });
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

  it('renders the portfolio region label and table rows', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Asie',
      portfolioEntries: [{ id: 'p1', date: '12/03', entreprise: 'Evergreen Marine', stagiaire: 'Léa', symbol: '2603.TW', depuis: 5.2, ytd: 5.0 }],
    });
    expect(portfolioLabelEl.textContent).toBe('Asie');
    expect(portfolioEl.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('defaults portfolioEntries to an empty list and portfolioRegionLabel to an empty string when omitted', () => {
    expect(() => panel.showRegion('Asie', { marketItems: [], newsItems: [] })).not.toThrow();
    expect(portfolioLabelEl.textContent).toBe('');
    expect(portfolioEl.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('clicking a sortable column header re-sorts and re-renders the table', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Asie',
      portfolioEntries: [
        { id: 'p1', date: '20/06', entreprise: 'A', stagiaire: 'X', symbol: 'A', depuis: 1, ytd: 1 },
        { id: 'p2', date: '01/01', entreprise: 'B', stagiaire: 'Y', symbol: 'B', depuis: 2, ytd: 2 },
      ],
    });
    // Default state is date ascending, so 01/01 (B) sorts first before any click.
    expect(portfolioEl.querySelector('tbody tr td:nth-child(2)').textContent).toBe('B');

    // Clicking the already-sorted DATE column reverses to descending: 20/06 (A) now sorts first.
    const dateHeader = [...portfolioEl.querySelectorAll('th')].find(th => th.textContent.startsWith('DATE'));
    dateHeader.click();
    expect(portfolioEl.querySelector('tbody tr td:nth-child(2)').textContent).toBe('A');
  });

  it('preserves the sort preference across a subsequent showRegion call (does not reset like the comparator)', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Asie',
      portfolioEntries: [
        { id: 'p1', date: '20/06', entreprise: 'A', stagiaire: 'X', symbol: 'A', depuis: 1, ytd: 1 },
        { id: 'p2', date: '01/01', entreprise: 'B', stagiaire: 'Y', symbol: 'B', depuis: 2, ytd: 2 },
      ],
    });
    // Clicking DATE (the default-sorted column) reverses date sort from ascending to descending.
    portfolioEl.querySelector('th').click();

    panel.showRegion('Europe', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Europe',
      portfolioEntries: [
        { id: 'p3', date: '20/06', entreprise: 'C', stagiaire: 'X', symbol: 'C', depuis: 1, ytd: 1 },
        { id: 'p4', date: '01/01', entreprise: 'D', stagiaire: 'Y', symbol: 'D', depuis: 2, ytd: 2 },
      ],
    });
    // Date descending persisted: 20/06 (C) sorts before 01/01 (D) in Europe's own data.
    const firstRowEntreprise = portfolioEl.querySelector('tbody tr td:nth-child(2)').textContent;
    expect(firstRowEntreprise).toBe('C');
  });

  it('applies live quote overrides to matching portfolio entries and re-renders the table', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Asie',
      portfolioEntries: [
        { id: 'p1', date: '20/06', entreprise: 'A', stagiaire: 'X', symbol: 'A', depuis: 1, ytd: 1 },
        { id: 'p2', date: '01/01', entreprise: 'B', stagiaire: 'Y', symbol: 'B', depuis: 2, ytd: 2 },
      ],
    });

    panel.updateLiveQuotes({ p1: { depuis: 9.9, ytd: 8.8 } });

    const rows = [...portfolioEl.querySelectorAll('tbody tr')];
    const rowA = rows.find(r => r.cells[1].textContent === 'A'); // ENTREPRISE column
    expect(rowA.textContent).toContain('9.9%');
    expect(rowA.textContent).toContain('8.8%');
  });

  it('ignores overrides for entry ids not present in the currently shown portfolio', () => {
    panel.showRegion('Asie', {
      marketItems: [], newsItems: [], companyItems: [],
      portfolioRegionLabel: 'Asie',
      portfolioEntries: [{ id: 'p1', date: '20/06', entreprise: 'A', stagiaire: 'X', symbol: 'A', depuis: 1, ytd: 1 }],
    });

    expect(() => panel.updateLiveQuotes({ 'stale-id': { depuis: 9.9, ytd: 8.8 } })).not.toThrow();
    expect(portfolioEl.querySelector('tbody tr').textContent).toContain('1%');
  });

  describe('editable market indices', () => {
    const ITEM = { id: 'idx1', flag: '🇫🇷', name: 'CAC 40', value: '7 500', weekChange: 1.2 };

    it('renders plain text (no inputs) when isEditing is false or omitted', () => {
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [] });
      expect(indicesEl.querySelector('input')).toBeNull();
      expect(indicesEl.querySelector('.panel-index-value').textContent).toBe('7 500');
    });

    it('renders value and weekChange as inputs when isEditing is true', () => {
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [], isEditing: true });
      const inputs = indicesEl.querySelectorAll('input');
      expect(inputs).toHaveLength(2);
      expect(inputs[0].value).toBe('7 500');
      expect(Number(inputs[1].value)).toBe(1.2);
    });

    it('calls onIndexEdit with the item and a value patch when the value input changes', () => {
      const onIndexEdit = vi.fn();
      panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart: () => {}, onIndexEdit, onIndexAdd: () => {}, onIndexDelete: () => {} });
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [], isEditing: true });

      const valueInput = indicesEl.querySelectorAll('input')[0];
      valueInput.value = '7 600';
      valueInput.dispatchEvent(new Event('change'));

      expect(onIndexEdit).toHaveBeenCalledWith(ITEM, { value: '7 600' });
    });

    it('calls onIndexEdit with a numeric weekChange patch when the change input changes', () => {
      const onIndexEdit = vi.fn();
      panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart: () => {}, onIndexEdit, onIndexAdd: () => {}, onIndexDelete: () => {} });
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [], isEditing: true });

      const changeInput = indicesEl.querySelectorAll('input')[1];
      changeInput.value = '2.5';
      changeInput.dispatchEvent(new Event('change'));

      expect(onIndexEdit).toHaveBeenCalledWith(ITEM, { weekChange: 2.5 });
    });

    it('renders a delete button per row in edit mode that calls onIndexDelete with the item', () => {
      const onIndexDelete = vi.fn();
      panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart: () => {}, onIndexEdit: () => {}, onIndexAdd: () => {}, onIndexDelete });
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [], isEditing: true });

      indicesEl.querySelector('.panel-index-delete').click();
      expect(onIndexDelete).toHaveBeenCalledWith(ITEM);
    });

    it('does not render a delete button or add button when isEditing is false', () => {
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [] });
      expect(indicesEl.querySelector('.panel-index-delete')).toBeNull();
      expect(indicesEl.querySelector('.panel-index-add')).toBeNull();
    });

    it('renders an add-index button in edit mode that calls onIndexAdd', () => {
      const onIndexAdd = vi.fn();
      panel = initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart: () => {}, onIndexEdit: () => {}, onIndexAdd, onIndexDelete: () => {} });
      panel.showRegion('Europe', { marketItems: [ITEM], newsItems: [], isEditing: true });

      indicesEl.querySelector('.panel-index-add').click();
      expect(onIndexAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('editable companies via side panel', () => {
    const COMPANY = { id: 'c1', name: 'Toyota', bullets: [] };

    it('renders company fields as inputs when isEditing is true', () => {
      panel.showRegion('Asie', { marketItems: [], newsItems: [], isEditing: true, companyItems: [COMPANY] });
      expect(companiesEl.querySelector('input')).not.toBeNull();
    });

    it('does not render company inputs when isEditing is false', () => {
      panel.showRegion('Asie', { marketItems: [], newsItems: [], companyItems: [COMPANY] });
      expect(companiesEl.querySelector('input')).toBeNull();
    });

    it('calls onCompanyEdit when a company field is edited through the panel', () => {
      const onCompanyEdit = vi.fn();
      panel = initSidePanel({
        labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl,
        onOpenChart: () => {}, onIndexEdit: () => {}, onIndexAdd: () => {}, onIndexDelete: () => {},
        onCompanyEdit, onCompanyAdd: () => {}, onCompanyDelete: () => {},
        onCompanyBulletAdd: () => {}, onCompanyBulletEdit: () => {}, onCompanyBulletDelete: () => {},
      });
      panel.showRegion('Asie', { marketItems: [], newsItems: [], isEditing: true, companyItems: [COMPANY] });

      const nameInput = companiesEl.querySelector('.panel-company-name-input');
      nameInput.value = 'Toyota Motor';
      nameInput.dispatchEvent(new Event('change'));

      expect(onCompanyEdit).toHaveBeenCalledWith(COMPANY, { name: 'Toyota Motor' });
    });
  });
});
