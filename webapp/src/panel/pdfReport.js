const POSITIVE_COLOR = '#1c8a4b';
const NEGATIVE_COLOR = '#c0392b';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function changeColor(value) {
  return Number(value) < 0 ? NEGATIVE_COLOR : POSITIVE_COLOR;
}

function buildHeader(regionLabel, weekLabel) {
  const header = el('div', 'pdf-report-header');
  header.appendChild(el('h1', 'pdf-report-title', regionLabel));
  header.appendChild(el('div', 'pdf-report-week', weekLabel));
  return header;
}

function buildSectionLabel(text) {
  return el('div', 'pdf-report-section-label', text);
}

function buildIndicesSection(marketItems) {
  const grid = el('div', 'pdf-report-indices');
  for (const item of marketItems) {
    const row = el('div', 'pdf-report-index-row');
    row.appendChild(el('span', 'pdf-report-index-name', [item.flag, item.name].filter(Boolean).join(' ')));
    row.appendChild(el('span', 'pdf-report-index-value', item.value ?? ''));
    const change = el('span', 'pdf-report-index-change', `${item.weekChange}%`);
    change.style.color = changeColor(item.weekChange);
    row.appendChild(change);
    grid.appendChild(row);
  }
  return grid;
}

function buildNewsSection(newsItems) {
  const wrap = el('div', 'pdf-report-news');
  for (const item of newsItems) {
    const block = el('div', 'pdf-report-news-block');
    block.appendChild(el('h3', null, item.title || ''));
    block.appendChild(el('p', null, item.description || ''));
    wrap.appendChild(block);
  }
  return wrap;
}

const STAT_FIELDS = [
  ['salesGrowthLabel', 'salesGrowth', 'Croissance CA'],
  ['evEbitdaLabel', 'evEbitda', 'EV/EBITDA'],
  ['coursActuelLabel', 'coursActuel', 'Cours actuel'],
  ['targetPriceLabel', 'targetPrice', 'Objectif'],
];

function buildCompanyCard(item) {
  const card = el('div', 'pdf-report-company-card');
  const header = el('div', 'pdf-report-company-header');
  header.appendChild(el('span', 'pdf-report-company-name', item.name || ''));
  header.appendChild(el('span', 'pdf-report-company-sub', [item.yahooSymbol, item.flag, item.country].filter(Boolean).join(' · ')));
  card.appendChild(header);
  if (item.marketCap) card.appendChild(el('div', 'pdf-report-company-cap', item.marketCap));

  const stats = el('div', 'pdf-report-company-stats');
  for (const [labelField, valueField, defaultLabel] of STAT_FIELDS) {
    const stat = el('div', 'pdf-report-company-stat');
    stat.appendChild(el('span', 'pdf-report-company-stat-label', item[labelField] || defaultLabel));
    stat.appendChild(el('span', 'pdf-report-company-stat-value', item[valueField] ?? ''));
    stats.appendChild(stat);
  }
  card.appendChild(stats);

  if ((item.bullets || []).length) {
    const bullets = el('ul', 'pdf-report-company-bullets');
    for (const bullet of item.bullets) bullets.appendChild(el('li', null, bullet));
    card.appendChild(bullets);
  }

  return card;
}

function buildCompaniesSection(companyItems) {
  const grid = el('div', 'pdf-report-companies');
  for (const item of companyItems) grid.appendChild(buildCompanyCard(item));
  return grid;
}

const PORTFOLIO_COLUMNS = [
  ['date', 'DATE'], ['entreprise', 'ENTREPRISE'], ['stagiaire', 'STAGIAIRE'],
  ['symbol', 'SYMBOLE'], ['depuis', 'DEPUIS'], ['ytd', 'YTD'],
];
const PORTFOLIO_PERCENT_FIELDS = new Set(['depuis', 'ytd']);

function buildPortfolioSection(portfolioEntries, portfolioRegionLabel) {
  const wrap = el('div', 'pdf-report-portfolio');
  if (portfolioRegionLabel) wrap.appendChild(el('div', 'pdf-report-portfolio-region', portfolioRegionLabel));

  const table = el('table', 'pdf-report-portfolio-table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const [, label] of PORTFOLIO_COLUMNS) headRow.appendChild(el('th', null, label));
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  for (const entry of portfolioEntries) {
    const row = el('tr');
    for (const [field] of PORTFOLIO_COLUMNS) {
      const raw = entry[field];
      const isPercent = PORTFOLIO_PERCENT_FIELDS.has(field);
      const td = el('td', null, isPercent ? (raw === undefined || raw === null || raw === '' ? '' : `${raw}%`) : (raw ?? ''));
      if (isPercent && raw !== undefined && raw !== null && raw !== '') td.style.color = changeColor(raw);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

export function buildReportElement({
  regionLabel, weekLabel, portfolioRegionLabel = '',
  marketItems = [], newsItems = [], companyItems = [], portfolioEntries = [],
  sections = ['indices', 'news', 'companies', 'portfolio'],
}) {
  const root = el('div', 'pdf-report');
  root.appendChild(buildHeader(regionLabel, weekLabel));

  if (sections.includes('indices') && marketItems.length) {
    root.appendChild(buildSectionLabel('Indices régionaux'));
    root.appendChild(buildIndicesSection(marketItems));
  }
  if (sections.includes('news') && newsItems.length) {
    root.appendChild(buildSectionLabel('News macro'));
    root.appendChild(buildNewsSection(newsItems));
  }
  if (sections.includes('companies') && companyItems.length) {
    root.appendChild(buildSectionLabel('Entreprises présentées'));
    root.appendChild(buildCompaniesSection(companyItems));
  }
  if (sections.includes('portfolio') && portfolioEntries.length) {
    root.appendChild(buildSectionLabel('Suivi de portefeuille'));
    root.appendChild(buildPortfolioSection(portfolioEntries, portfolioRegionLabel));
  }

  return root;
}
