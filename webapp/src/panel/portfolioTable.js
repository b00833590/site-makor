const COLUMNS = [
  { field: 'date', label: 'DATE' },
  { field: 'entreprise', label: 'ENTREPRISE' },
  { field: 'stagiaire', label: 'STAGIAIRE' },
  { field: 'symbol', label: 'SYMBOLE' },
  { field: 'depuis', label: 'DEPUIS' },
  { field: 'ytd', label: 'YTD' },
];
const PERCENT_FIELDS = new Set(['depuis', 'ytd']);

export function renderPortfolioTable(container, entries, { sortField, sortDirection, onSort }) {
  container.replaceChildren();

  const table = document.createElement('table');
  table.className = 'portfolio-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of COLUMNS) {
    const th = document.createElement('th');
    th.className = 'portfolio-sortable';
    const indicator = sortField === col.field ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
    th.textContent = col.label + indicator;
    th.addEventListener('click', () => onSort(col.field));
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  for (const entry of entries) {
    const row = document.createElement('tr');
    for (const col of COLUMNS) {
      const td = document.createElement('td');
      const raw = entry[col.field];
      if (PERCENT_FIELDS.has(col.field)) {
        td.textContent = raw === undefined || raw === null || raw === '' ? '' : `${raw}%`;
      } else {
        td.textContent = raw ?? '';
      }
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }

  table.append(thead, tbody);
  container.appendChild(table);
}
