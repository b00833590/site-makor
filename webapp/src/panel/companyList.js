const STAT_FIELDS = [
  ['salesGrowthLabel', 'salesGrowth', 'Croissance CA'],
  ['evEbitdaLabel', 'evEbitda', 'EV/EBITDA'],
  ['coursActuelLabel', 'coursActuel', 'Cours actuel'],
  ['targetPriceLabel', 'targetPrice', 'Objectif'],
];

function buildStatsGrid(item) {
  const stats = document.createElement('div');
  stats.className = 'panel-company-stats';
  for (const [labelField, valueField, defaultLabel] of STAT_FIELDS) {
    const stat = document.createElement('div');
    stat.className = 'panel-company-stat';

    const label = document.createElement('span');
    label.className = 'panel-company-stat-label';
    label.textContent = item[labelField] || defaultLabel;

    const value = document.createElement('span');
    value.className = 'panel-company-stat-value';
    value.textContent = item[valueField] ?? '';

    stat.append(label, value);
    stats.appendChild(stat);
  }
  return stats;
}

function buildBulletsList(item) {
  const bullets = document.createElement('ul');
  bullets.className = 'panel-company-bullets';
  for (const bullet of item.bullets || []) {
    const li = document.createElement('li');
    li.textContent = bullet;
    bullets.appendChild(li);
  }
  return bullets;
}

export function renderCompanies(container, items, selectedIds, onToggle) {
  container.replaceChildren();
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'panel-company-card';

    const header = document.createElement('div');
    header.className = 'panel-company-header';

    const name = document.createElement('span');
    name.className = 'panel-company-name';
    name.textContent = item.name;

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'panel-compare-toggle' + (selectedIds.includes(item.id) ? ' active' : '');
    compareBtn.textContent = '⚖';
    compareBtn.setAttribute('aria-label', `Comparer ${item.name}`);
    compareBtn.addEventListener('click', () => onToggle(item.id));

    header.append(name, compareBtn);

    const sub = document.createElement('div');
    sub.className = 'panel-company-sub';
    sub.textContent = [item.yahooSymbol, item.flag, item.country].filter(Boolean).join(' · ');

    const cap = document.createElement('div');
    cap.className = 'panel-company-cap';
    cap.textContent = item.marketCap ?? '';

    card.append(header, sub, cap, buildStatsGrid(item), buildBulletsList(item));
    container.appendChild(card);
  }
}

export function renderComparison(container, items, selectedIds) {
  container.replaceChildren();
  if (selectedIds.length !== 2) return;

  const [a, b] = selectedIds.map(id => items.find(item => item.id === id));
  if (!a || !b) return;

  const table = document.createElement('table');
  table.className = 'panel-compare-table';

  function addRow(label, valueA, valueB) {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = label;
    const tdA = document.createElement('td');
    tdA.textContent = valueA ?? '';
    const tdB = document.createElement('td');
    tdB.textContent = valueB ?? '';
    row.append(th, tdA, tdB);
    table.appendChild(row);
  }

  addRow('', a.name, b.name);
  for (const [labelField, valueField, defaultLabel] of STAT_FIELDS) {
    const labelA = a[labelField] || defaultLabel;
    const labelB = b[labelField] || defaultLabel;
    if (labelA === labelB) {
      addRow(defaultLabel, a[valueField], b[valueField]);
    } else {
      addRow(defaultLabel, `${labelA}: ${a[valueField] ?? ''}`, `${labelB}: ${b[valueField] ?? ''}`);
    }
  }

  container.appendChild(table);
}
