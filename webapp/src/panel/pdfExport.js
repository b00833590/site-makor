function sanitizeForFilename(value) {
  const withoutAccents = (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return withoutAccents.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function buildExportFilename(regionLabel, weekLabel) {
  return `Makor_${sanitizeForFilename(regionLabel)}_${sanitizeForFilename(weekLabel)}.pdf`;
}

export function buildPortfolioExportFilename(regionLabel, weekLabel) {
  return `Makor_Portefeuille_${sanitizeForFilename(regionLabel)}_${sanitizeForFilename(weekLabel)}.pdf`;
}

const A4_WIDTH_MM = 210;
const MARGIN_SIDE_MM = 10;
const MARGIN_BOTTOM_MM = 12;
const HEADER_MARGIN_TOP_MM = 8;
const HEADER_ASPECT_RATIO = 802 / 116;
const HEADER_WIDTH_MM = A4_WIDTH_MM - MARGIN_SIDE_MM * 2;
const HEADER_HEIGHT_MM = HEADER_WIDTH_MM / HEADER_ASPECT_RATIO;
const CONTENT_MARGIN_TOP_MM = HEADER_MARGIN_TOP_MM + HEADER_HEIGHT_MM + 6;
const HEADER_IMAGE_URL = '/assets/header-makor.png';

// Non testable en jsdom (canvas.getContext('2d') n'y est pas implémenté) —
// c'est pourquoi exportElementAsPDF accepte loadHeaderImageFn en injection,
// exactement comme html2pdfFn : les tests couvrent l'orchestration réelle
// en mockant ce point d'entrée, pas cette fonction elle-même.
export function loadImageAsDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load header image: ${url}`));
    img.src = url;
  });
}

export function addHeaderToEveryPage(pdf, headerDataUrl) {
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.addImage(headerDataUrl, 'PNG', MARGIN_SIDE_MM, HEADER_MARGIN_TOP_MM, HEADER_WIDTH_MM, HEADER_HEIGHT_MM);
  }
}

export async function exportElementAsPDF(element, filename, { html2pdfFn, loadHeaderImageFn = loadImageAsDataURL } = {}) {
  const fn = html2pdfFn || (await import('html2pdf.js')).default;
  const headerDataUrl = await loadHeaderImageFn(HEADER_IMAGE_URL);

  await fn()
    .set({
      margin: [CONTENT_MARGIN_TOP_MM, MARGIN_SIDE_MM, MARGIN_BOTTOM_MM, MARGIN_SIDE_MM],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .from(element)
    .toPdf()
    .get('pdf')
    .then(pdf => addHeaderToEveryPage(pdf, headerDataUrl))
    .save();
}
