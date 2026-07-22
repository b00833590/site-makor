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

export async function exportElementAsPDF(element, filename, html2pdfFn) {
  const fn = html2pdfFn || (await import('html2pdf.js')).default;
  await fn()
    .set({
      margin: 8,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();
}
