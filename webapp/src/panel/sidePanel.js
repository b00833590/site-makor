import { renderCompanies, renderComparison } from './companyList.js';
import { toggleCompanySelection } from './compareSelection.js';

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

export function initSidePanel({ labelEl, indicesEl, newsEl, companiesEl, compareEl }) {
  let selectedCompanyIds = [];
  let currentCompanyItems = [];

  function renderCompanySection() {
    renderCompanies(companiesEl, currentCompanyItems, selectedCompanyIds, handleToggleCompare);
    renderComparison(compareEl, currentCompanyItems, selectedCompanyIds);
  }

  function handleToggleCompare(companyId) {
    selectedCompanyIds = toggleCompanySelection(selectedCompanyIds, companyId);
    renderCompanySection();
  }

  function showRegion(regionLabel, { marketItems, newsItems, companyItems = [] }) {
    labelEl.textContent = regionLabel;
    renderIndices(indicesEl, marketItems);
    renderNews(newsEl, newsItems);
    currentCompanyItems = companyItems;
    selectedCompanyIds = [];
    renderCompanySection();
  }

  return { showRegion };
}
