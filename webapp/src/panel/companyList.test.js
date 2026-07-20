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
    renderCompanies(container, [COMPANY_A], [], { onToggle: () => {}, onOpenChart: () => {} });
    const card = container.querySelector('.panel-company-card');
    expect(card.querySelector('.panel-company-name').textContent).toBe('Reliance Industries');
    expect(card.querySelector('.panel-company-sub').textContent).toBe('RELIANCE.NS · 🇮🇳 · Inde');
    expect(card.querySelector('.panel-company-cap').textContent).toBe('210 Md$');
  });

  it('renders the 4-stat grid with values', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A], [], { onToggle: () => {}, onOpenChart: () => {} });
    const values = [...container.querySelectorAll('.panel-company-stat-value')].map(el => el.textContent);
    expect(values).toEqual(['12%', '14x', '1 450', '1 600']);
  });

  it('renders one bullet item per bullet, none when the list is empty', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], [], { onToggle: () => {}, onOpenChart: () => {} });
    const cards = container.querySelectorAll('.panel-company-card');
    expect(cards[0].querySelectorAll('.panel-company-bullets li')).toHaveLength(2);
    expect(cards[1].querySelectorAll('.panel-company-bullets li')).toHaveLength(0);
  });

  it('marks the compare toggle active only for selected company ids', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], ['b'], { onToggle: () => {}, onOpenChart: () => {} });
    const toggles = container.querySelectorAll('.panel-compare-toggle');
    expect(toggles[0].classList.contains('active')).toBe(false);
    expect(toggles[1].classList.contains('active')).toBe(true);
  });

  it('calls onToggle with the company id when its compare button is clicked', () => {
    const container = document.createElement('div');
    const onToggle = vi.fn();
    renderCompanies(container, [COMPANY_A], [], { onToggle, onOpenChart: () => {} });
    container.querySelector('.panel-compare-toggle').click();
    expect(onToggle).toHaveBeenCalledWith('a');
  });

  it('clears previous cards on re-render', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A, COMPANY_B], [], { onToggle: () => {}, onOpenChart: () => {} });
    renderCompanies(container, [COMPANY_A], [], { onToggle: () => {}, onOpenChart: () => {} });
    expect(container.querySelectorAll('.panel-company-card')).toHaveLength(1);
  });

  it('never interprets stored content as HTML', () => {
    const container = document.createElement('div');
    renderCompanies(container, [{ ...COMPANY_A, name: '<img src=x onerror=alert(1)>' }], [], { onToggle: () => {}, onOpenChart: () => {} });
    expect(container.querySelector('.panel-company-name').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders a chart button for each company', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY_A], [], { onToggle: () => {}, onOpenChart: () => {} });
    const chartBtn = container.querySelector('.panel-chart-toggle');
    expect(chartBtn).not.toBeNull();
    expect(chartBtn.getAttribute('aria-label')).toBe('Graphique Reliance Industries');
  });

  it('calls onOpenChart with the full company item when its chart button is clicked', () => {
    const container = document.createElement('div');
    const onOpenChart = vi.fn();
    renderCompanies(container, [COMPANY_A], [], { onToggle: () => {}, onOpenChart });
    container.querySelector('.panel-chart-toggle').click();
    expect(onOpenChart).toHaveBeenCalledWith(COMPANY_A);
  });
});

describe('editable company fields', () => {
  const COMPANY = {
    id: 'c1', name: 'Reliance Industries', yahooSymbol: 'RELIANCE.NS', flag: '🇮🇳', country: 'Inde',
    marketCap: '210 Md$', salesGrowth: '12%', evEbitda: '14x', coursActuel: '1 450', targetPrice: '1 600',
    bullets: [],
  };
  const EDIT_OPTS = { onToggle: () => {}, onOpenChart: () => {}, isEditing: true, onEditItem: () => {}, onAddItem: () => {}, onDeleteItem: () => {}, onBulletAdd: () => {}, onBulletEdit: () => {}, onBulletDelete: () => {} };

  it('renders plain text (no inputs) when isEditing is false or omitted', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { onToggle: () => {}, onOpenChart: () => {} });
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('.panel-company-name').textContent).toBe('Reliance Industries');
  });

  it('renders name, symbol, flag, country, market cap, and the 4 stat values as inputs when isEditing is true', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], EDIT_OPTS);
    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(9); // name + symbol + flag + country + marketCap + 4 stat values
  });

  it('calls onEditItem with a name patch when the name input changes', () => {
    const onEditItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onEditItem });
    const nameInput = container.querySelector('.panel-company-name-input');
    nameInput.value = 'Reliance Ind.';
    nameInput.dispatchEvent(new Event('change'));
    expect(onEditItem).toHaveBeenCalledWith(COMPANY, { name: 'Reliance Ind.' });
  });

  it('calls onEditItem with the correct field patch for each of the 4 stat value inputs', () => {
    const onEditItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onEditItem });
    const statInputs = container.querySelectorAll('.panel-company-stat-input');
    const expectedFields = ['salesGrowth', 'evEbitda', 'coursActuel', 'targetPrice'];
    statInputs.forEach((input, i) => {
      input.value = `new-${i}`;
      input.dispatchEvent(new Event('change'));
      expect(onEditItem).toHaveBeenNthCalledWith(i + 1, COMPANY, { [expectedFields[i]]: `new-${i}` });
    });
  });

  it('calls onEditItem with the correct field patch for the symbol, flag, and country inputs', () => {
    const onEditItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onEditItem });
    const [symbolInput, flagInput, countryInput] = container.querySelectorAll('.panel-company-sub-input');

    symbolInput.value = 'RELI.NS';
    symbolInput.dispatchEvent(new Event('change'));
    expect(onEditItem).toHaveBeenNthCalledWith(1, COMPANY, { yahooSymbol: 'RELI.NS' });

    flagInput.value = '🇺🇸';
    flagInput.dispatchEvent(new Event('change'));
    expect(onEditItem).toHaveBeenNthCalledWith(2, COMPANY, { flag: '🇺🇸' });

    countryInput.value = 'USA';
    countryInput.dispatchEvent(new Event('change'));
    expect(onEditItem).toHaveBeenNthCalledWith(3, COMPANY, { country: 'USA' });
  });

  it('calls onEditItem with a marketCap patch when the market cap input changes', () => {
    const onEditItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onEditItem });
    const capInput = container.querySelector('.panel-company-cap-input');
    capInput.value = '220 Md$';
    capInput.dispatchEvent(new Event('change'));
    expect(onEditItem).toHaveBeenCalledWith(COMPANY, { marketCap: '220 Md$' });
  });

  it('renders a delete button per card in edit mode that calls onDeleteItem with the item', () => {
    const onDeleteItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onDeleteItem });
    container.querySelector('.panel-company-delete').click();
    expect(onDeleteItem).toHaveBeenCalledWith(COMPANY);
  });

  it('does not render delete/add buttons when isEditing is false', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { onToggle: () => {}, onOpenChart: () => {} });
    expect(container.querySelector('.panel-company-delete')).toBeNull();
    expect(container.querySelector('.panel-company-add')).toBeNull();
  });

  it('renders an add-company button in edit mode that calls onAddItem', () => {
    const onAddItem = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onAddItem });
    container.querySelector('.panel-company-add').click();
    expect(onAddItem).toHaveBeenCalledTimes(1);
  });
});

describe('editable company bullets', () => {
  const COMPANY = { id: 'c1', name: 'Reliance Industries', bullets: ['Expansion retail', 'Croissance Jio'] };
  const EDIT_OPTS = { onToggle: () => {}, onOpenChart: () => {}, isEditing: true, onEditItem: () => {}, onAddItem: () => {}, onDeleteItem: () => {}, onBulletAdd: () => {}, onBulletEdit: () => {}, onBulletDelete: () => {} };

  it('renders plain bullet text (no textarea) when isEditing is false', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { onToggle: () => {}, onOpenChart: () => {} });
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelectorAll('.panel-company-bullets li')[0].textContent).toBe('Expansion retail');
  });

  it('renders each bullet as a textarea plus a delete button in edit mode', () => {
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], EDIT_OPTS);
    const textareas = container.querySelectorAll('.panel-company-bullet-input');
    expect(textareas).toHaveLength(2);
    expect(textareas[0].value).toBe('Expansion retail');
    expect(container.querySelectorAll('.panel-company-bullet-delete')).toHaveLength(2);
  });

  it('calls onBulletEdit with the item, index, and new text when a bullet textarea changes', () => {
    const onBulletEdit = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onBulletEdit });
    const textarea = container.querySelectorAll('.panel-company-bullet-input')[1];
    textarea.value = 'Forte croissance Jio 5G';
    textarea.dispatchEvent(new Event('change'));
    expect(onBulletEdit).toHaveBeenCalledWith(COMPANY, 1, 'Forte croissance Jio 5G');
  });

  it('calls onBulletDelete with the item and index when a bullet delete button is clicked', () => {
    const onBulletDelete = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onBulletDelete });
    container.querySelectorAll('.panel-company-bullet-delete')[0].click();
    expect(onBulletDelete).toHaveBeenCalledWith(COMPANY, 0);
  });

  it('renders an add-bullet button in edit mode that calls onBulletAdd with the item', () => {
    const onBulletAdd = vi.fn();
    const container = document.createElement('div');
    renderCompanies(container, [COMPANY], [], { ...EDIT_OPTS, onBulletAdd });
    container.querySelector('.panel-company-bullet-add').click();
    expect(onBulletAdd).toHaveBeenCalledWith(COMPANY);
  });

  it('renders no bullet inputs but still an add button in edit mode when bullets is empty', () => {
    const container = document.createElement('div');
    renderCompanies(container, [{ ...COMPANY, bullets: [] }], [], EDIT_OPTS);
    expect(container.querySelectorAll('.panel-company-bullet-input')).toHaveLength(0);
    expect(container.querySelector('.panel-company-bullet-add')).not.toBeNull();
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

  it('shows both companies own label when they differ for the same stat field, instead of one shared label', () => {
    const container = document.createElement('div');
    const withDivergentLabel = { ...COMPANY_B, salesGrowthLabel: 'EV/EBITDA', salesGrowth: '4,55x' };
    renderComparison(container, [COMPANY_A, withDivergentLabel], ['a', 'b']);
    const text = container.querySelector('.panel-compare-table').textContent;
    expect(text).toContain('Croissance CA: 12%');
    expect(text).toContain('EV/EBITDA: 4,55x');
  });
});
