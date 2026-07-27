// jsPDF's standard built-in fonts don't have correct width-table entries for
// non-ASCII space variants (found live: French thousands-separator values like
// "64 611 pts" use U+202F NARROW NO-BREAK SPACE) — the glyph still draws, but its
// advance width is wrong, so every character after it drifts, and right-aligned
// text (whose start position is computed FROM a width measurement of the same
// string) ends up overlapping its neighbor. Fixed at the source: normalize every
// no-break/narrow/thin space variant to a plain ASCII space before it ever reaches
// pdf.text()/splitTextToSize()/getTextWidth()/autoTable.
const SPECIAL_SPACE_CODEPOINTS = [0x00a0, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x202f, 0x205f, 0x3000];
const SPECIAL_SPACES = new RegExp(`[${SPECIAL_SPACE_CODEPOINTS.map(cp => String.fromCodePoint(cp)).join('')}]`, 'g');

export function safeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(SPECIAL_SPACES, ' ');
}
