// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { buildExportFilename, exportElementAsPDF, buildPortfolioExportFilename, addHeaderToEveryPage } from './pdfExport.js';

vi.mock('html2pdf.js', () => ({ default: vi.fn() }));

describe('buildExportFilename', () => {
  it('builds a filename from the region and week labels', () => {
    expect(buildExportFilename('Asie', 'Semaine 13-17 JUILLET')).toBe('Makor_Asie_Semaine_13_17_JUILLET.pdf');
  });

  it('replaces spaces and punctuation with underscores', () => {
    expect(buildExportFilename('BRICS + UK', 'Semaine du 23/03')).toBe('Makor_BRICS_UK_Semaine_du_23_03.pdf');
  });

  it('collapses consecutive non-alphanumeric characters into a single underscore', () => {
    expect(buildExportFilename('A---B', 'C   D')).toBe('Makor_A_B_C_D.pdf');
  });

  it('strips accents while preserving the base letter, rather than dropping it as a separator', () => {
    expect(buildExportFilename('É', 'Test')).toBe('Makor_E_Test.pdf');
  });

  it('strips accents from real region/week labels without mangling them', () => {
    expect(buildExportFilename('Amérique du Nord', 'Semaine du 1er DÉCEMBRE')).toBe('Makor_Amerique_du_Nord_Semaine_du_1er_DECEMBRE.pdf');
  });

  it('falls back to empty segments when labels are missing, still producing a valid filename', () => {
    expect(buildExportFilename('', '')).toBe('Makor__.pdf');
    expect(buildExportFilename(undefined, undefined)).toBe('Makor__.pdf');
  });
});

describe('buildPortfolioExportFilename', () => {
  it('builds a filename from the region and week labels, prefixed with Portefeuille', () => {
    expect(buildPortfolioExportFilename('Europe', 'Semaine 13-17 JUILLET')).toBe('Makor_Portefeuille_Europe_Semaine_13_17_JUILLET.pdf');
  });

  it('strips accents from real region/week labels without mangling them', () => {
    expect(buildPortfolioExportFilename('Amérique du Nord', 'Semaine du 1er DÉCEMBRE')).toBe('Makor_Portefeuille_Amerique_du_Nord_Semaine_du_1er_DECEMBRE.pdf');
  });

  it('falls back to empty segments when labels are missing, still producing a valid filename', () => {
    expect(buildPortfolioExportFilename('', '')).toBe('Makor_Portefeuille__.pdf');
    expect(buildPortfolioExportFilename(undefined, undefined)).toBe('Makor_Portefeuille__.pdf');
  });
});

function makeHtml2pdfMock({ pageCount = 1 } = {}) {
  const pdf = {
    internal: { getNumberOfPages: () => pageCount },
    setPage: vi.fn(),
    addImage: vi.fn(),
  };
  const save = vi.fn().mockResolvedValue(undefined);
  const then = vi.fn(callback => {
    callback(pdf);
    return { save };
  });
  const get = vi.fn(() => ({ then }));
  const toPdf = vi.fn(() => ({ get }));
  const from = vi.fn(() => ({ toPdf }));
  const set = vi.fn(() => ({ from }));
  const html2pdfFn = vi.fn(() => ({ set }));
  return { html2pdfFn, set, from, toPdf, get, save, pdf };
}

describe('exportElementAsPDF', () => {
  it('configures html2pdf with the given filename, higher-quality capture, and CSS pagebreak mode', async () => {
    const { html2pdfFn, set, from, save } = makeHtml2pdfMock();
    const element = document.createElement('div');
    const loadHeaderImageFn = vi.fn().mockResolvedValue('data:image/png;base64,xxx');

    await exportElementAsPDF(element, 'test.pdf', { html2pdfFn, loadHeaderImageFn });

    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'test.pdf',
      html2canvas: expect.objectContaining({ scale: 3 }),
      pagebreak: { mode: ['css', 'legacy'] },
    }));
    expect(from).toHaveBeenCalledWith(element);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('loads the header image once and stamps it onto every generated page', async () => {
    const { html2pdfFn, pdf } = makeHtml2pdfMock({ pageCount: 3 });
    const loadHeaderImageFn = vi.fn().mockResolvedValue('data:image/png;base64,xxx');

    await exportElementAsPDF(document.createElement('div'), 'test.pdf', { html2pdfFn, loadHeaderImageFn });

    expect(loadHeaderImageFn).toHaveBeenCalledTimes(1);
    expect(pdf.setPage).toHaveBeenCalledTimes(3);
    expect(pdf.addImage).toHaveBeenCalledTimes(3);
    expect(pdf.addImage).toHaveBeenCalledWith('data:image/png;base64,xxx', 'PNG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  });

  it('rejects when the underlying html2pdf save() call rejects', async () => {
    const { html2pdfFn, save } = makeHtml2pdfMock();
    save.mockRejectedValue(new Error('canvas render failed'));
    const loadHeaderImageFn = vi.fn().mockResolvedValue('data:image/png;base64,xxx');

    await expect(
      exportElementAsPDF(document.createElement('div'), 'test.pdf', { html2pdfFn, loadHeaderImageFn })
    ).rejects.toThrow('canvas render failed');
  });

  it('rejects when the header image fails to load, without ever calling html2pdf', async () => {
    const { html2pdfFn } = makeHtml2pdfMock();
    const loadHeaderImageFn = vi.fn().mockRejectedValue(new Error('image load failed'));

    await expect(
      exportElementAsPDF(document.createElement('div'), 'test.pdf', { html2pdfFn, loadHeaderImageFn })
    ).rejects.toThrow('image load failed');
    expect(html2pdfFn).not.toHaveBeenCalled();
  });

  it('dynamically imports the real html2pdf.js module when no override function is given', async () => {
    const html2pdfModule = await import('html2pdf.js');
    const { set, from, toPdf, get, save, pdf } = makeHtml2pdfMock();
    html2pdfModule.default.mockReturnValue({ set });
    const loadHeaderImageFn = vi.fn().mockResolvedValue('data:image/png;base64,xxx');

    await exportElementAsPDF(document.createElement('div'), 'test.pdf', { loadHeaderImageFn });

    expect(html2pdfModule.default).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('addHeaderToEveryPage', () => {
  it('sets each page and adds the header image to it', () => {
    const pdf = { internal: { getNumberOfPages: () => 2 }, setPage: vi.fn(), addImage: vi.fn() };
    addHeaderToEveryPage(pdf, 'data:image/png;base64,xxx');
    expect(pdf.setPage).toHaveBeenNthCalledWith(1, 1);
    expect(pdf.setPage).toHaveBeenNthCalledWith(2, 2);
    expect(pdf.addImage).toHaveBeenCalledTimes(2);
  });
});
