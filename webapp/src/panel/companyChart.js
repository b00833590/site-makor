export function companySymbol(item) {
  return item.yahooSymbol || null;
}

export function companyPresentationDateISO(item, portfolioEntries) {
  const match = portfolioEntries.find(entry => entry.entreprise === item.name);
  if (!match || !match.date) return null;

  const parsed = /^(\d{1,2})\/(\d{1,2})$/.exec(match.date.trim());
  if (!parsed) return null;

  const day = parsed[1].padStart(2, '0');
  const month = parsed[2].padStart(2, '0');
  const year = new Date().getFullYear();
  return `${year}-${month}-${day}`;
}
