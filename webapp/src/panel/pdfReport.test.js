// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildReportElement } from './pdfReport.js';

const MARKET_ITEMS = [{ flag: '🇫🇷', name: 'CAC 40', value: '8 268 pts', weekChange: -0.83 }];
const NEWS_ITEMS = [{ title: 'Titre test', description: 'Description test' }];
const COMPANY_ITEMS = [{
  name: 'ARM Holdings', yahooSymbol: 'ARM', flag: '🇬🇧', country: 'UK', marketCap: '143,3 Md$',
  salesGrowth: '+26,35%', evEbitda: 'N/A', coursActuel: '—', targetPrice: '1345$',
  bullets: ['Point clé 1', 'Point clé 2'],
}];
const PORTFOLIO_ENTRIES = [
  { date: '20/03', entreprise: 'Sumitomo Pharma', stagiaire: '', symbol: '4506.T', depuis: -30.66, ytd: -44.52 },
];

describe('buildReportElement', () => {
  it('renders the region label and week label in the header', () => {
    const report = buildReportElement({ regionLabel: 'Europe', weekLabel: 'Semaine 23-27 MARS' });
    expect(report.querySelector('.pdf-report-title').textContent).toBe('Europe');
    expect(report.querySelector('.pdf-report-week').textContent).toBe('Semaine 23-27 MARS');
  });

  it('renders every market index with a colored weekChange', () => {
    const report = buildReportElement({ regionLabel: 'Europe', weekLabel: 'W', marketItems: MARKET_ITEMS });
    const row = report.querySelector('.pdf-report-index-row');
    expect(row.textContent).toContain('CAC 40');
    expect(row.textContent).toContain('8 268 pts');
    expect(row.querySelector('.pdf-report-index-change').style.color).toBe('rgb(192, 57, 43)'); // negative
  });

  it('renders every company stat with its custom or default label, and all bullets', () => {
    const report = buildReportElement({ regionLabel: 'Europe', weekLabel: 'W', companyItems: COMPANY_ITEMS });
    const card = report.querySelector('.pdf-report-company-card');
    const statLabels = [...card.querySelectorAll('.pdf-report-company-stat-label')].map(n => n.textContent);
    expect(statLabels).toEqual(['Croissance CA', 'EV/EBITDA', 'Cours actuel', 'Objectif']);
    const statValues = [...card.querySelectorAll('.pdf-report-company-stat-value')].map(n => n.textContent);
    expect(statValues).toEqual(['+26,35%', 'N/A', '—', '1345$']);
    expect(card.querySelectorAll('.pdf-report-company-bullets li')).toHaveLength(2);
  });

  it('renders the full 6-column portfolio table with colored DEPUIS/YTD', () => {
    const report = buildReportElement({ regionLabel: 'Europe', weekLabel: 'W', portfolioEntries: PORTFOLIO_ENTRIES, portfolioRegionLabel: 'Europe' });
    const cells = [...report.querySelectorAll('.pdf-report-portfolio-table tbody td')];
    expect(cells).toHaveLength(6);
    expect(cells[4].textContent).toBe('-30.66%');
    expect(cells[4].style.color).toBe('rgb(192, 57, 43)');
  });

  it('omits a section entirely when its data is empty, and respects the sections filter', () => {
    const fullReport = buildReportElement({ regionLabel: 'Europe', weekLabel: 'W', marketItems: MARKET_ITEMS, newsItems: [] });
    expect(fullReport.querySelector('.pdf-report-news')).toBeNull();

    const portfolioOnly = buildReportElement({
      regionLabel: 'Europe', weekLabel: 'W', marketItems: MARKET_ITEMS, portfolioEntries: PORTFOLIO_ENTRIES,
      sections: ['portfolio'],
    });
    expect(portfolioOnly.querySelector('.pdf-report-indices')).toBeNull();
    expect(portfolioOnly.querySelector('.pdf-report-portfolio-table')).not.toBeNull();
  });

  it('never interprets stored content as HTML', () => {
    const report = buildReportElement({
      regionLabel: 'Europe', weekLabel: 'W',
      companyItems: [{ ...COMPANY_ITEMS[0], name: '<img src=x onerror=alert(1)>' }],
    });
    expect(report.querySelector('.pdf-report-company-name').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(report.querySelector('img')).toBeNull();
  });
});
