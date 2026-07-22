import { buildEditableInput } from '../admin/editableInput.js';

const STAT_FIELDS = [
  ['salesGrowthLabel', 'salesGrowth', 'Croissance CA'],
  ['evEbitdaLabel', 'evEbitda', 'EV/EBITDA'],
  ['coursActuelLabel', 'coursActuel', 'Cours actuel'],
  ['targetPriceLabel', 'targetPrice', 'Objectif'],
];

function buildStatsGrid(item, isEditing, onEditItem) {
  const stats = document.createElement('div');
  stats.className = 'panel-company-stats';
  for (const [labelField, valueField, defaultLabel] of STAT_FIELDS) {
    const stat = document.createElement('div');
    stat.className = 'panel-company-stat';

    const label = document.createElement('span');
    label.className = 'panel-company-stat-label';
    if (isEditing) {
      label.appendChild(buildEditableInput(item[labelField] || defaultLabel, 'text', 'panel-company-stat-label-input', v => onEditItem(item, { [labelField]: v })));
    } else {
      label.textContent = item[labelField] || defaultLabel;
    }

    const value = document.createElement('span');
    value.className = 'panel-company-stat-value';
    if (isEditing) {
      value.appendChild(buildEditableInput(item[valueField], 'text', 'panel-company-stat-input', v => onEditItem(item, { [valueField]: v })));
    } else {
      value.textContent = item[valueField] ?? '';
    }

    stat.append(label, value);
    stats.appendChild(stat);
  }
  return stats;
}

function buildBulletsList(item, isEditing, { onBulletAdd, onBulletEdit, onBulletDelete }) {
  const bullets = document.createElement('ul');
  bullets.className = 'panel-company-bullets';

  (item.bullets || []).forEach((bullet, index) => {
    const li = document.createElement('li');
    if (isEditing) {
      const textarea = document.createElement('textarea');
      textarea.className = 'panel-company-bullet-input';
      textarea.value = bullet;
      textarea.addEventListener('change', () => onBulletEdit(item, index, textarea.value));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'panel-company-bullet-delete';
      delBtn.setAttribute('aria-label', `Supprimer le point clé ${index + 1}`);
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => onBulletDelete(item, index));

      li.append(textarea, delBtn);
    } else {
      li.textContent = bullet;
    }
    bullets.appendChild(li);
  });

  if (isEditing) {
    const addLi = document.createElement('li');
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'panel-company-bullet-add';
    addBtn.textContent = '+ Point clé';
    addBtn.addEventListener('click', () => onBulletAdd(item));
    addLi.appendChild(addBtn);
    bullets.appendChild(addLi);
  }

  return bullets;
}

export function renderCompanies(container, items, selectedIds, { onToggle, onOpenChart, isEditing = false, onEditItem, onAddItem, onDeleteItem, onBulletAdd, onBulletEdit, onBulletDelete }) {
  container.replaceChildren();
  for (const item of items) {
    const card = document.createElement('div');
    card.className = 'panel-company-card';

    const header = document.createElement('div');
    header.className = 'panel-company-header';

    const name = document.createElement('span');
    name.className = 'panel-company-name';
    if (isEditing) {
      name.appendChild(buildEditableInput(item.name, 'text', 'panel-company-name-input', v => onEditItem(item, { name: v })));
    } else {
      name.textContent = item.name;
    }

    const chartBtn = document.createElement('button');
    chartBtn.type = 'button';
    chartBtn.className = 'panel-chart-toggle';
    chartBtn.textContent = '📈';
    chartBtn.setAttribute('aria-label', `Graphique ${item.name}`);
    chartBtn.addEventListener('click', () => onOpenChart(item));

    const compareBtn = document.createElement('button');
    compareBtn.type = 'button';
    compareBtn.className = 'panel-compare-toggle' + (selectedIds.includes(item.id) ? ' active' : '');
    compareBtn.textContent = '⚖';
    compareBtn.setAttribute('aria-label', `Comparer ${item.name}`);
    compareBtn.addEventListener('click', () => onToggle(item.id));

    header.append(name, chartBtn, compareBtn);

    const sub = document.createElement('div');
    sub.className = 'panel-company-sub';
    if (isEditing) {
      sub.append(
        buildEditableInput(item.yahooSymbol, 'text', 'panel-company-sub-input', v => onEditItem(item, { yahooSymbol: v })),
        buildEditableInput(item.flag, 'text', 'panel-company-sub-input panel-company-flag-input', v => onEditItem(item, { flag: v })),
        buildEditableInput(item.country, 'text', 'panel-company-sub-input', v => onEditItem(item, { country: v })),
      );
    } else {
      sub.textContent = [item.yahooSymbol, item.flag, item.country].filter(Boolean).join(' · ');
    }

    const cap = document.createElement('div');
    cap.className = 'panel-company-cap';
    if (isEditing) {
      cap.appendChild(buildEditableInput(item.marketCap, 'text', 'panel-company-cap-input', v => onEditItem(item, { marketCap: v })));
    } else {
      cap.textContent = item.marketCap ?? '';
    }

    card.append(header, sub, cap, buildStatsGrid(item, isEditing, onEditItem), buildBulletsList(item, isEditing, { onBulletAdd, onBulletEdit, onBulletDelete }));

    if (isEditing) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'panel-company-delete';
      delBtn.setAttribute('aria-label', `Supprimer ${item.name}`);
      delBtn.textContent = '✕ Supprimer';
      delBtn.addEventListener('click', () => onDeleteItem(item));
      card.appendChild(delBtn);
    }

    container.appendChild(card);
  }

  if (isEditing) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'panel-company-add';
    addBtn.textContent = '+ Ajouter une entreprise';
    addBtn.addEventListener('click', () => onAddItem());
    container.appendChild(addBtn);
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
