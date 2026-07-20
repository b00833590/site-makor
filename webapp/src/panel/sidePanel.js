import { renderCompanies, renderComparison } from './companyList.js';
import { toggleCompanySelection } from './compareSelection.js';
import { sortPortfolioEntries, nextSort } from './portfolioSort.js';
import { renderPortfolioTable } from './portfolioTable.js';
import { buildEditableInput } from '../admin/editableInput.js';

function renderIndices(container, items, isEditing, { onEditItem, onDeleteItem, onAddItem }) {
  container.replaceChildren();
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'panel-index-row';

    const name = document.createElement('span');
    name.className = 'panel-index-name';
    name.textContent = [item.flag, item.name].filter(Boolean).join(' ');

    const value = document.createElement('span');
    value.className = 'panel-index-value';
    if (isEditing) {
      value.appendChild(buildEditableInput(item.value, 'text', 'panel-index-value-input', v => onEditItem(item, { value: v })));
    } else {
      value.textContent = item.value ?? '';
    }

    const change = document.createElement('span');
    const isNegative = Number(item.weekChange) < 0;
    change.className = `panel-index-change ${isNegative ? 'negative' : 'positive'}`;
    if (isEditing) {
      change.appendChild(buildEditableInput(item.weekChange, 'number', 'panel-index-change-input', v => onEditItem(item, { weekChange: v })));
    } else {
      change.textContent = `${item.weekChange}%`;
    }

    row.append(name, value, change);

    if (isEditing) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'panel-index-delete';
      delBtn.setAttribute('aria-label', `Supprimer ${item.name}`);
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => onDeleteItem(item));
      row.appendChild(delBtn);
    }

    container.appendChild(row);
  }

  if (isEditing) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'panel-index-add';
    addBtn.textContent = '+ Ajouter un indice';
    addBtn.addEventListener('click', () => onAddItem());
    container.appendChild(addBtn);
  }
}

function renderNews(container, items, isEditing, { onEditItem, onAddItem, onDeleteItem }) {
  container.replaceChildren();
  for (const item of items) {
    const block = document.createElement('div');
    block.className = 'panel-news-block';

    const title = document.createElement('h3');
    if (isEditing) {
      title.appendChild(buildEditableInput(item.title, 'text', 'panel-news-title-input', v => onEditItem(item, { title: v })));
    } else {
      title.textContent = item.title;
    }

    const description = document.createElement('p');
    if (isEditing) {
      const textarea = document.createElement('textarea');
      textarea.className = 'panel-news-description-input';
      textarea.value = item.description ?? '';
      textarea.addEventListener('change', () => onEditItem(item, { description: textarea.value }));
      description.appendChild(textarea);
    } else {
      description.textContent = item.description;
    }

    block.append(title, description);

    if (isEditing) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'panel-news-delete';
      delBtn.setAttribute('aria-label', `Supprimer ${item.title}`);
      delBtn.textContent = '✕ Supprimer';
      delBtn.addEventListener('click', () => onDeleteItem(item));
      block.appendChild(delBtn);
    }

    container.appendChild(block);
  }

  if (isEditing) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'panel-news-add';
    addBtn.textContent = '+ Ajouter une brève';
    addBtn.addEventListener('click', () => onAddItem());
    container.appendChild(addBtn);
  }
}

export function initSidePanel({
  labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl,
  onOpenChart, onIndexEdit, onIndexAdd, onIndexDelete,
  onCompanyEdit, onCompanyAdd, onCompanyDelete, onCompanyBulletAdd, onCompanyBulletEdit, onCompanyBulletDelete,
  onPortfolioEdit, onPortfolioAdd, onPortfolioDelete,
  onNewsEdit, onNewsAdd, onNewsDelete,
}) {
  let selectedCompanyIds = [];
  let currentCompanyItems = [];
  let currentPortfolioEntries = [];
  let currentIsEditing = false;
  let sortField = 'date';
  let sortDirection = 'asc';

  function renderCompanySection() {
    renderCompanies(companiesEl, currentCompanyItems, selectedCompanyIds, {
      onToggle: handleToggleCompare,
      onOpenChart,
      isEditing: currentIsEditing,
      onEditItem: onCompanyEdit,
      onAddItem: onCompanyAdd,
      onDeleteItem: onCompanyDelete,
      onBulletAdd: onCompanyBulletAdd,
      onBulletEdit: onCompanyBulletEdit,
      onBulletDelete: onCompanyBulletDelete,
    });
    renderComparison(compareEl, currentCompanyItems, selectedCompanyIds);
  }

  function handleToggleCompare(companyId) {
    selectedCompanyIds = toggleCompanySelection(selectedCompanyIds, companyId);
    renderCompanySection();
  }

  function renderPortfolioSection() {
    const sorted = sortPortfolioEntries(currentPortfolioEntries, sortField, sortDirection);
    renderPortfolioTable(portfolioEl, sorted, {
      sortField, sortDirection, onSort: handleSort,
      isEditing: currentIsEditing,
      onEditItem: onPortfolioEdit,
      onAddItem: onPortfolioAdd,
      onDeleteItem: onPortfolioDelete,
    });
  }

  function handleSort(clickedField) {
    const next = nextSort(sortField, sortDirection, clickedField);
    sortField = next.field;
    sortDirection = next.direction;
    renderPortfolioSection();
  }

  function showRegion(regionLabel, { marketItems, newsItems, companyItems = [], portfolioRegionLabel = '', portfolioEntries = [], isEditing = false }) {
    labelEl.textContent = regionLabel;
    renderIndices(indicesEl, marketItems, isEditing, { onEditItem: onIndexEdit, onDeleteItem: onIndexDelete, onAddItem: onIndexAdd });
    renderNews(newsEl, newsItems, isEditing, { onEditItem: onNewsEdit, onAddItem: onNewsAdd, onDeleteItem: onNewsDelete });
    currentCompanyItems = companyItems;
    currentIsEditing = isEditing;
    selectedCompanyIds = [];
    renderCompanySection();
    portfolioLabelEl.textContent = portfolioRegionLabel;
    currentPortfolioEntries = portfolioEntries;
    renderPortfolioSection();
  }

  function updateLiveQuotes(overrides) {
    currentPortfolioEntries = currentPortfolioEntries.map(entry =>
      overrides[entry.id] ? { ...entry, ...overrides[entry.id] } : entry
    );
    if (!currentIsEditing) renderPortfolioSection();
  }

  return { showRegion, updateLiveQuotes };
}
