function groupByInitial(companies) {
  const groups = [];
  let currentLetter = null;
  for (const company of companies) {
    const letter = (company.name[0] || '').toUpperCase();
    if (letter !== currentLetter) {
      currentLetter = letter;
      groups.push({ letter, companies: [] });
    }
    groups[groups.length - 1].companies.push(company);
  }
  return groups;
}

export function initLexiqueModal({ modalEl, searchInputEl, listEl, triggerBtn, closeBtn, getAllCompanies, onSelectCompany }) {
  function render(query) {
    const all = getAllCompanies();
    const q = query.trim().toLowerCase();
    const filtered = q ? all.filter(c => c.name.toLowerCase().includes(q)) : all;
    listEl.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'lexique-empty';
      empty.textContent = 'Aucune entreprise trouvée';
      listEl.appendChild(empty);
      return;
    }

    for (const group of groupByInitial(filtered)) {
      const letterEl = document.createElement('div');
      letterEl.className = 'lexique-letter';
      letterEl.textContent = group.letter;
      listEl.appendChild(letterEl);

      for (const company of group.companies) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'lexique-item';
        item.textContent = company.name;
        if (company.yahooSymbol) {
          const symbol = document.createElement('span');
          symbol.className = 'lexique-item-symbol';
          symbol.textContent = company.yahooSymbol;
          item.appendChild(symbol);
        }
        item.addEventListener('click', () => {
          close();
          onSelectCompany(company);
        });
        listEl.appendChild(item);
      }
    }
  }

  function open() {
    modalEl.classList.add('open');
    searchInputEl.value = '';
    render('');
    searchInputEl.focus();
  }

  function close() {
    modalEl.classList.remove('open');
  }

  triggerBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modalEl.addEventListener('click', event => {
    if (event.target === modalEl) close();
  });
  searchInputEl.addEventListener('input', () => render(searchInputEl.value));

  return { open, close };
}
