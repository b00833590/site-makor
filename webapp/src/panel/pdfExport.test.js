// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { buildExportFilename, exportElementAsPDF } from './pdfExport.js';

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

  it('trims leading/trailing underscores produced by non-alphanumeric-only labels', () => {
    expect(buildExportFilename('É', 'Test')).toBe('Makor__Test.pdf');
  });

  it('falls back to empty segments when labels are missing, still producing a valid filename', () => {
    expect(buildExportFilename('', '')).toBe('Makor__.pdf');
    expect(buildExportFilename(undefined, undefined)).toBe('Makor__.pdf');
  });
});

describe('exportElementAsPDF', () => {
  it('configures html2pdf with the given filename and calls save() on the given element', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const from = vi.fn(() => ({ save }));
    const set = vi.fn(() => ({ from }));
    const html2pdfFn = vi.fn(() => ({ set }));
    const element = document.createElement('div');

    await exportElementAsPDF(element, 'test.pdf', html2pdfFn);

    expect(html2pdfFn).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ filename: 'test.pdf' }));
    expect(from).toHaveBeenCalledWith(element);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
