import { renderCompanies, renderComparison } from './companyList.js';
import { toggleCompanySelection } from './compareSelection.js';
import { sortPortfolioEntries, nextSort } from './portfolioSort.js';
import { renderPortfolioTable } from './portfolioTable.js';

function renderIndices(container, items) {
  container.replaceChildren();
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'panel-index-row';

    const name = document.createElement('span');
    name.className = 'panel-index-name';
    name.textContent = [item.flag, item.name].filter(Boolean).join(' ');

    const value = document.createElement('span');
    value.className = 'panel-index-value';
    value.textContent = item.value ?? '';

    const change = document.createElement('span');
    const isNegative = Number(item.weekChange) < 0;
    change.className = `panel-index-change ${isNegative ? 'negative' : 'positive'}`;
    change.textContent = `${item.weekChange}%`;

    row.append(name, value, change);
    container.appendChild(row);
  }
}

function renderNews(container, items) {
  container.replaceChildren();
  for (const item of items) {
    const block = document.createElement('div');
    block.className = 'panel-news-block';

    const title = document.createElement('h3');
    title.textContent = item.title;

    const description = document.createElement('p');
    description.textContent = item.description;

    block.append(title, description);
    container.appendChild(block);
  }
}

export function initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl, portfolioLabelEl, portfolioEl, onOpenChart }) {
  let selectedCompanyIds = [];
  let currentCompanyItems = [];
  let currentPortfolioEntries = [];
  let sortField = 'date';
  let sortDirection = 'asc';

  function renderCompanySection() {
    renderCompanies(companiesEl, currentCompanyItems, selectedCompanyIds, { onToggle: handleToggleCompare, onOpenChart });
    renderComparison(compareEl, currentCompanyItems, selectedCompanyIds);
  }

  function handleToggleCompare(companyId) {
    selectedCompanyIds = toggleCompanySelection(selectedCompanyIds, companyId);
    renderCompanySection();
  }

  function renderPortfolioSection() {
    const sorted = sortPortfolioEntries(currentPortfolioEntries, sortField, sortDirection);
    renderPortfolioTable(portfolioEl, sorted, { sortField, sortDirection, onSort: handleSort });
  }

  function handleSort(clickedField) {
    const next = nextSort(sortField, sortDirection, clickedField);
    sortField = next.field;
    sortDirection = next.direction;
    renderPortfolioSection();
  }

  function showRegion(regionLabel, { marketItems, newsItems, companyItems = [], portfolioRegionLabel = '', portfolioEntries = [] }) {
    labelEl.textContent = regionLabel;
    renderIndices(indicesEl, marketItems);
    renderNews(newsEl, newsItems);
    currentCompanyItems = companyItems;
    selectedCompanyIds = [];
    renderCompanySection();
    portfolioLabelEl.textContent = portfolioRegionLabel;
    currentPortfolioEntries = portfolioEntries;
    renderPortfolioSection();
  }

  return { showRegion };
}
