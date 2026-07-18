import { fetchQuoteHistory as defaultFetchQuoteHistory } from '../data/quoteClient.js';
import { companySymbol, companyPresentationDateISO, buildChartSVG } from './companyChart.js';

export function initCompanyChartModal({ modalEl, titleEl, bodyEl, fetchQuoteHistoryFn = defaultFetchQuoteHistory }) {
  function close() {
    modalEl.classList.remove('open');
    bodyEl.replaceChildren();
  }

  function showMessage(text) {
    bodyEl.replaceChildren();
    const message = document.createElement('p');
    message.className = 'chart-modal-message';
    message.textContent = text;
    bodyEl.appendChild(message);
  }

  async function open(item, portfolioEntries) {
    titleEl.textContent = item.name;
    bodyEl.replaceChildren();
    modalEl.classList.add('open');

    const symbol = companySymbol(item);
    const sinceISO = companyPresentationDateISO(item, portfolioEntries);

    if (!symbol || !sinceISO) {
      showMessage('Données insuffisantes pour afficher le graphique.');
      return;
    }

    showMessage('Chargement du graphique...');
    const data = await fetchQuoteHistoryFn(symbol, sinceISO);

    if (!data || !data.points || data.points.length < 2) {
      showMessage('Impossible de récupérer les données du cours.');
      return;
    }

    const svg = buildChartSVG(data.points);
    bodyEl.replaceChildren();
    if (svg) bodyEl.appendChild(svg);
  }

  return { open, close };
}
