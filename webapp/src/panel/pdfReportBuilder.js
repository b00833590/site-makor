import { drawPortfolioTable } from './portfolioPdfTable.js';
import {
  A4_WIDTH_MM, MARGIN_SIDE_MM, MARGIN_BOTTOM_MM, CONTENT_MARGIN_TOP_MM,
  HEADER_IMAGE_URL, loadImageAsDataURL, addHeaderToEveryPage,
} from './pdfExport.js';
import { safeText } from './pdfTextSanitize.js';

const PAGE_HEIGHT_MM = 297;
const USABLE_WIDTH_MM = A4_WIDTH_MM - MARGIN_SIDE_MM * 2;

const NAVY = [15, 23, 48];
const MUTED = [118, 124, 140];
const BODY = [58, 63, 82];
const GOLD = [201, 151, 31];
const LINE = [228, 230, 236];
const POSITIVE = [28, 138, 75];
const NEGATIVE = [192, 57, 43];

// jsPDF's standard built-in fonts (Helvetica/Times/Courier) have no glyphs for
// emoji — a flag like 🇯🇵 is a 2-codepoint regional-indicator sequence that gets
// silently mis-encoded, producing garbage bytes with unpredictable measured width.
// That's what broke the indices row specifically: it's the only place manual
// getTextWidth() math relies on an accurate width for right-alignment, so the
// garbled flag threw off spacing and caused the value/change text to overlap.
// Regional-indicator codepoints are just A-Z offset from U+1F1E6, so a flag emoji
// converts losslessly back to its 2-letter code, which every standard font renders
// correctly.
function flagToCountryCode(flag) {
  if (!flag) return '';
  const codePoints = [...flag].map(ch => ch.codePointAt(0));
  const isFlagSequence = codePoints.length === 2 && codePoints.every(cp => cp >= 0x1f1e6 && cp <= 0x1f1ff);
  if (!isFlagSequence) return flag;
  return codePoints.map(cp => String.fromCharCode(cp - 0x1f1e6 + 65)).join('');
}

// Everything below is drawn as native jsPDF text/line/table content, not captured
// via html2canvas — this app's bundled html2canvas silently drops or clips content
// (confirmed independent of container width, font size, or side padding: the exact
// same rightmost content was cut on the very first successful export, before any of
// those were touched). Native drawing is the only approach proven reliable end to
// end (see portfolioPdfTable.js, which already used it for the table). ensureSpace
// below is this module's own lightweight page-break helper, mirroring what autoTable
// already does automatically for the table.
function ensureSpace(pdf, y, neededMm) {
  if (y + neededMm <= PAGE_HEIGHT_MM - MARGIN_BOTTOM_MM) return y;
  pdf.addPage();
  return CONTENT_MARGIN_TOP_MM;
}

const PRESENTATION_TAG = 'Morning News - Intern Presentation';
const PAGE_CENTER_MM = A4_WIDTH_MM / 2;

// Report masthead: centered above the region title on every generated PDF,
// so the document reads as one named deliverable (this presentation) rather
// than a per-region data dump. Sized and weighted above the region title
// (which stays the largest LEFT-aligned element) so the two don't compete —
// this is the one thing on the page meant to be read first.
function drawMainTitle(pdf, y) {
  pdf.setFont('times', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(...NAVY);
  pdf.text(safeText(PRESENTATION_TAG), PAGE_CENTER_MM, y, { align: 'center' });

  const ruleWidth = 26;
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(0.5);
  pdf.line(PAGE_CENTER_MM - ruleWidth / 2, y + 4, PAGE_CENTER_MM + ruleWidth / 2, y + 4);

  return y + 15;
}

function drawTitle(pdf, regionLabel, weekLabel, y) {
  pdf.setFont('times', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(...NAVY);
  pdf.text(safeText(regionLabel), MARGIN_SIDE_MM, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...MUTED);
  pdf.text(safeText(weekLabel), MARGIN_SIDE_MM, y + 7);
  pdf.setDrawColor(...GOLD);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN_SIDE_MM, y + 11, A4_WIDTH_MM - MARGIN_SIDE_MM, y + 11);
  return y + 19;
}

function drawSectionLabel(pdf, text, y) {
  y = ensureSpace(pdf, y, 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...NAVY);
  pdf.text(text.toUpperCase(), MARGIN_SIDE_MM, y);
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN_SIDE_MM, y + 2, A4_WIDTH_MM - MARGIN_SIDE_MM, y + 2);
  return y + 9;
}

function indexChangeColor(value) {
  return Number(value) < 0 ? NEGATIVE : POSITIVE;
}

function drawIndexCell(pdf, item, x, y, width) {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...NAVY);
  pdf.text(safeText(item.name), x, y);

  const changeText = `${item.weekChange}%`;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...indexChangeColor(item.weekChange));
  pdf.text(changeText, x + width, y, { align: 'right' });

  const changeWidth = pdf.getTextWidth(changeText) + 3;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...NAVY);
  pdf.text(safeText(item.value), x + width - changeWidth, y, { align: 'right' });
}

function drawIndices(pdf, marketItems, y) {
  const gap = 10;
  const colWidth = (USABLE_WIDTH_MM - gap) / 2;
  const rowHeight = 7;
  for (let i = 0; i < marketItems.length; i += 2) {
    y = ensureSpace(pdf, y, rowHeight);
    drawIndexCell(pdf, marketItems[i], MARGIN_SIDE_MM, y, colWidth);
    if (marketItems[i + 1]) drawIndexCell(pdf, marketItems[i + 1], MARGIN_SIDE_MM + colWidth + gap, y, colWidth);
    pdf.setDrawColor(...LINE);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN_SIDE_MM, y + 2, MARGIN_SIDE_MM + colWidth, y + 2);
    if (marketItems[i + 1]) pdf.line(MARGIN_SIDE_MM + colWidth + gap, y + 2, A4_WIDTH_MM - MARGIN_SIDE_MM, y + 2);
    y += rowHeight;
  }
  return y + 3;
}

function drawNews(pdf, newsItems, y) {
  for (const item of newsItems) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    for (const line of pdf.splitTextToSize(safeText(item.title), USABLE_WIDTH_MM)) {
      y = ensureSpace(pdf, y, 5);
      pdf.setTextColor(...NAVY);
      pdf.text(line, MARGIN_SIDE_MM, y);
      y += 5;
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    for (const line of pdf.splitTextToSize(safeText(item.description), USABLE_WIDTH_MM)) {
      y = ensureSpace(pdf, y, 4.5);
      pdf.setTextColor(...BODY);
      pdf.text(line, MARGIN_SIDE_MM, y);
      y += 4.5;
    }
    y += 5;
  }
  return y;
}

const STAT_FIELDS = [
  ['salesGrowthLabel', 'salesGrowth', 'Croissance CA'],
  ['evEbitdaLabel', 'evEbitda', 'EV/EBITDA'],
  ['coursActuelLabel', 'coursActuel', 'Cours actuel'],
  ['targetPriceLabel', 'targetPrice', 'Objectif'],
];

function drawCompanies(pdf, companyItems, y) {
  companyItems.forEach((item, index) => {
    if (index > 0) {
      y = ensureSpace(pdf, y, 8);
      pdf.setDrawColor(...LINE);
      pdf.setLineWidth(0.2);
      pdf.line(MARGIN_SIDE_MM, y, A4_WIDTH_MM - MARGIN_SIDE_MM, y);
      y += 7;
    }
    y = ensureSpace(pdf, y, 20);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(...NAVY);
    pdf.text(safeText(item.name), MARGIN_SIDE_MM, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(safeText([item.yahooSymbol, flagToCountryCode(item.flag), item.country].filter(Boolean).join(' · ')), A4_WIDTH_MM - MARGIN_SIDE_MM, y, { align: 'right' });
    y += 5;

    if (item.marketCap) {
      pdf.setFontSize(9.5);
      pdf.setTextColor(...BODY);
      pdf.text(safeText(item.marketCap), MARGIN_SIDE_MM, y);
      y += 5;
    }
    y += 3;

    const statColWidth = USABLE_WIDTH_MM / STAT_FIELDS.length;
    STAT_FIELDS.forEach(([labelField, valueField, defaultLabel], i) => {
      const sx = MARGIN_SIDE_MM + i * statColWidth;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...MUTED);
      pdf.text(safeText(item[labelField] || defaultLabel).toUpperCase(), sx, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(...NAVY);
      pdf.text(safeText(item[valueField]), sx, y + 5);
    });
    y += 10;

    if ((item.bullets || []).length) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...BODY);
      for (const bullet of item.bullets) {
        const lines = pdf.splitTextToSize(safeText(bullet), USABLE_WIDTH_MM - 5);
        lines.forEach((line, li) => {
          y = ensureSpace(pdf, y, 4.5);
          pdf.text((li === 0 ? '•  ' : '   ') + line, MARGIN_SIDE_MM, y);
          y += 4.5;
        });
        y += 1;
      }
    }
  });
  return y;
}

async function defaultPdfFactory() {
  const { jsPDF } = await import('jspdf');
  return new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
}

export async function generateReportPDF({
  regionLabel, weekLabel, portfolioRegionLabel = '',
  marketItems = [], newsItems = [], companyItems = [], portfolioEntries = [],
  sections = ['indices', 'news', 'companies', 'portfolio'],
}, filename, { loadHeaderImageFn = loadImageAsDataURL, autoTableFn, pdfFactory = defaultPdfFactory } = {}) {
  const headerDataUrl = await loadHeaderImageFn(HEADER_IMAGE_URL);
  const pdf = await pdfFactory();

  // +8mm on top of CONTENT_MARGIN_TOP_MM: that margin was tuned for image placement
  // (a straight gap under the header banner), but pdf.text()'s y is the text
  // BASELINE — a 24pt bold title's cap-height reaches ~6mm above its baseline, which
  // without this extra clearance put "Asie" almost touching the header banner.
  let y = drawMainTitle(pdf, CONTENT_MARGIN_TOP_MM + 8);
  y = drawTitle(pdf, regionLabel, weekLabel, y);

  if (sections.includes('indices') && marketItems.length) {
    y = drawSectionLabel(pdf, 'Indices régionaux', y);
    y = drawIndices(pdf, marketItems, y);
  }
  if (sections.includes('news') && newsItems.length) {
    y = drawSectionLabel(pdf, 'News macro', y);
    y = drawNews(pdf, newsItems, y);
  }
  if (sections.includes('companies') && companyItems.length) {
    y = drawSectionLabel(pdf, 'Entreprises présentées', y);
    y = drawCompanies(pdf, companyItems, y);
  }
  if (sections.includes('portfolio') && portfolioEntries.length) {
    await drawPortfolioTable(pdf, portfolioEntries, portfolioRegionLabel, { autoTableFn });
  }

  addHeaderToEveryPage(pdf, headerDataUrl);
  pdf.save(filename);
}
