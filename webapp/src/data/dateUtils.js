export function ddmmToISOThisYear(dateStr, now = new Date()) {
  const match = typeof dateStr === 'string' ? /^(\d{1,2})\/(\d{1,2})$/.exec(dateStr.trim()) : null;
  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
