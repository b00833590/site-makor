import html2pdf from 'html2pdf.js';

function sanitizeForFilename(value) {
  return (value || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function buildExportFilename(regionLabel, weekLabel) {
  return `Makor_${sanitizeForFilename(regionLabel)}_${sanitizeForFilename(weekLabel)}.pdf`;
}

export async function exportElementAsPDF(element, filename, html2pdfFn = html2pdf) {
  await html2pdfFn()
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
