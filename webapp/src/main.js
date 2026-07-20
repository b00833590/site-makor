import './styles/globe.css';
import './panel/sidePanel.css';
import './panel/companyList.css';
import './panel/portfolioTable.css';
import './panel/chartModal.css';
import './timeline/weekTimeline.css';
import './timeline/weekAdmin.css';
import './admin/passwordModal.css';
import './admin/toast.css';
import { REGIONS } from './globe/regions.js';
import { regionPosition } from './globe/cycle.js';
import { initGlobeScene } from './globe/globeScene.js';
import { createFirestoreClient, loadAllWithRetry } from './data/firestoreClient.js';
import { getWeeks, getMarketItemsForWeekAndRegion, getNewsItemsForWeekAndRegion, getCompanyItemsForWeekAndRegion, getWeekContentKeys } from './data/selectors.js';
import { getPortfolioEntriesForRegion, getPortfolioRegion, PORTFOLIO_REGION_BY_GLOBE_REGION } from './data/portfolioSelectors.js';
import { initSidePanel } from './panel/sidePanel.js';
import { initCompanyChartModal } from './panel/chartModal.js';
import { initWeekTimeline } from './timeline/weekTimeline.js';
import { renderWeekAdmin } from './timeline/weekAdmin.js';
import { startPortfolioLiveRefresh } from './panel/portfolioLiveRefresh.js';
import { initPasswordModal } from './admin/passwordModal.js';
import { showToast } from './admin/toast.js';
import { generateId } from './admin/uid.js';
import { ADMIN_PASSWORD } from './admin/config.js';

const GROUP_LABEL_BY_REGION = {
  asia: 'ASIE',
  'brics-uk': 'BRICS + UK',
  europe: 'EUROPE & UK',
  'north-america': 'AMÉRIQUE DU NORD',
};

const container = document.getElementById('globe-container');
const indicator = document.getElementById('region-indicator');
const prevBtn = document.getElementById('arrow-prev');
const nextBtn = document.getElementById('arrow-next');
const timelineEl = document.getElementById('week-timeline');

const chartModal = initCompanyChartModal({
  modalEl: document.getElementById('chart-modal'),
  titleEl: document.getElementById('chart-modal-title'),
  bodyEl: document.getElementById('chart-modal-body'),
});
document.getElementById('chart-modal-close').addEventListener('click', () => chartModal.close());

let currentPortfolioEntriesForChart = [];

const client = createFirestoreClient();

let db = {};
let activeWeekId = null;
let activeRegionId = 'asia';
let liveRefreshHandle = null;
let isEditing = false;
let weekTimelineHandle = null;

function marketItemKey(item) {
  return `mkg:market:${activeWeekId}:${item.id}`;
}

function handleIndexEdit(item, patch) {
  const key = marketItemKey(item);
  const previous = db[key];
  const updated = { ...previous, ...patch };
  db[key] = updated;
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

function handleIndexAdd() {
  const id = generateId();
  const key = `mkg:market:${activeWeekId}:${id}`;
  const newItem = {
    id,
    group: GROUP_LABEL_BY_REGION[activeRegionId] || '',
    flag: '',
    name: 'Nouvel indice',
    value: '',
    weekChange: 0,
  };
  db[key] = newItem;
  renderPanelForCurrentSelection();
  client.writeDoc(key, newItem).catch(() => {
    delete db[key];
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Ajout en ligne échoué — le nouvel indice a été retiré');
  });
}

function handleIndexDelete(item) {
  const key = marketItemKey(item);
  const previous = db[key];
  delete db[key];
  renderPanelForCurrentSelection();
  client.deleteDocByKey(key).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), "⚠️ Suppression en ligne échouée — l'indice a été restauré");
  });
}

function companyItemKey(item) {
  return `mkg:content:entreprises:${activeWeekId}:${item.id}`;
}

function handleCompanyEdit(item, patch) {
  const key = companyItemKey(item);
  const previous = db[key];
  const updated = { ...previous, ...patch };
  db[key] = updated;
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

function handleCompanyAdd() {
  const id = generateId();
  const key = `mkg:content:entreprises:${activeWeekId}:${id}`;
  const newItem = {
    id,
    region: GROUP_LABEL_BY_REGION[activeRegionId] || '',
    name: 'Nouvelle entreprise',
    yahooSymbol: '',
    flag: '',
    country: '',
    marketCap: '',
    salesGrowth: '',
    evEbitda: '',
    coursActuel: '',
    targetPrice: '',
    bullets: [],
  };
  db[key] = newItem;
  renderPanelForCurrentSelection();
  client.writeDoc(key, newItem).catch(() => {
    delete db[key];
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Ajout en ligne échoué — la nouvelle entreprise a été retirée');
  });
}

function handleCompanyDelete(item) {
  const key = companyItemKey(item);
  const previous = db[key];
  delete db[key];
  renderPanelForCurrentSelection();
  client.deleteDocByKey(key).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), "⚠️ Suppression en ligne échouée — l'entreprise a été restaurée");
  });
}

function handleCompanyBulletAdd(item) {
  handleCompanyEdit(item, { bullets: [...(item.bullets || []), 'Nouveau point clé à compléter'] });
}

function handleCompanyBulletEdit(item, index, text) {
  handleCompanyEdit(item, { bullets: (item.bullets || []).map((bullet, i) => (i === index ? text : bullet)) });
}

function handleCompanyBulletDelete(item, index) {
  handleCompanyEdit(item, { bullets: (item.bullets || []).filter((_, i) => i !== index) });
}

function portfolioItemKey(item) {
  return `mkg:portfolio:${item.id}`;
}

function handlePortfolioEdit(item, patch) {
  const key = portfolioItemKey(item);
  const previous = db[key];
  const updated = { ...previous, ...patch };
  db[key] = updated;
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

function handlePortfolioAdd() {
  const id = generateId();
  const key = `mkg:portfolio:${id}`;
  const newItem = {
    id,
    date: '',
    entreprise: 'Nouvelle position',
    stagiaire: '',
    symbol: '',
    regionId: PORTFOLIO_REGION_BY_GLOBE_REGION[activeRegionId] || '',
    depuis: 0,
    ytd: 0,
  };
  db[key] = newItem;
  renderPanelForCurrentSelection();
  client.writeDoc(key, newItem).catch(() => {
    delete db[key];
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Ajout en ligne échoué — la nouvelle ligne a été retirée');
  });
}

function handlePortfolioDelete(item) {
  const key = portfolioItemKey(item);
  const previous = db[key];
  delete db[key];
  renderPanelForCurrentSelection();
  client.deleteDocByKey(key).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), "⚠️ Suppression en ligne échouée — la ligne a été restaurée");
  });
}

function newsItemKey(item) {
  return `mkg:content:news:${activeWeekId}:${item.id}`;
}

function handleNewsEdit(item, patch) {
  const key = newsItemKey(item);
  const previous = db[key];
  const updated = { ...previous, ...patch };
  db[key] = updated;
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

function handleNewsAdd() {
  const id = generateId();
  const key = `mkg:content:news:${activeWeekId}:${id}`;
  const newItem = {
    id,
    region: GROUP_LABEL_BY_REGION[activeRegionId] || '',
    title: 'Nouvelle brève',
    description: 'Description à compléter.',
  };
  db[key] = newItem;
  renderPanelForCurrentSelection();
  client.writeDoc(key, newItem).catch(() => {
    delete db[key];
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Ajout en ligne échoué — la nouvelle brève a été retirée');
  });
}

function handleNewsDelete(item) {
  const key = newsItemKey(item);
  const previous = db[key];
  delete db[key];
  renderPanelForCurrentSelection();
  client.deleteDocByKey(key).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), "⚠️ Suppression en ligne échouée — la brève a été restaurée");
  });
}

function weekItemKey(week) {
  return `mkg:week:${week.id}`;
}

function handleWeekLabelEdit(week, patch) {
  const key = weekItemKey(week);
  const previous = db[key];
  const updated = { ...previous, ...patch };
  db[key] = updated;
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

function handleWeekAdd() {
  const id = generateId();
  const key = `mkg:week:${id}`;
  const existingWeeks = getWeeks(db);
  const maxOrder = existingWeeks.reduce((max, w) => Math.max(max, w.order), -1);
  const newWeek = { id, label: 'Nouvelle semaine', order: maxOrder + 1 };
  const previousActiveWeekId = activeWeekId;

  db[key] = newWeek;
  activeWeekId = id;
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
  renderPanelForCurrentSelection();

  client.writeDoc(key, newWeek).catch(() => {
    delete db[key];
    // Only snap navigation back if the user hasn't since moved on (e.g. a
    // second "+ Nouvelle semaine" click, or manually selecting another week)
    // — otherwise this would silently discard a later, successfully-saved
    // week switch just because an earlier, unrelated write failed.
    if (activeWeekId === id) activeWeekId = previousActiveWeekId;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Ajout en ligne échoué — la nouvelle semaine a été retirée');
  });
}

function handleWeekDelete(week) {
  const keys = getWeekContentKeys(db, week.id);
  const contentCount = keys.length - 1; // excludes the week document itself
  const confirmed = window.confirm(
    `Supprimer définitivement "${week.label}" et ${contentCount} élément(s) de contenu associé (indices, news, entreprises) ? Cette action ne peut pas être annulée facilement.`
  );
  if (!confirmed) return;

  const previousEntries = keys.map(key => [key, db[key]]);
  for (const key of keys) delete db[key];

  const wasActive = activeWeekId === week.id;
  if (wasActive) {
    const remainingWeeks = getWeeks(db);
    activeWeekId = remainingWeeks.length ? remainingWeeks[remainingWeeks.length - 1].id : null;
  }
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
  renderPanelForCurrentSelection();

  client.deleteDocsBatch(keys).catch(() => {
    for (const [key, value] of previousEntries) db[key] = value;
    if (wasActive) activeWeekId = week.id;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Suppression en ligne échouée — la semaine a été restaurée');
  });
}

const panel = initSidePanel({
  labelEl: document.getElementById('panel-region-label'),
  indicesEl: document.getElementById('panel-indices'),
  newsEl: document.getElementById('panel-news'),
  companiesEl: document.getElementById('panel-companies'),
  compareEl: document.getElementById('panel-compare'),
  portfolioLabelEl: document.getElementById('panel-portfolio-region-label'),
  portfolioEl: document.getElementById('panel-portfolio'),
  onOpenChart: item => chartModal.open(item, currentPortfolioEntriesForChart),
  onIndexEdit: handleIndexEdit,
  onIndexAdd: handleIndexAdd,
  onIndexDelete: handleIndexDelete,
  onCompanyEdit: handleCompanyEdit,
  onCompanyAdd: handleCompanyAdd,
  onCompanyDelete: handleCompanyDelete,
  onCompanyBulletAdd: handleCompanyBulletAdd,
  onCompanyBulletEdit: handleCompanyBulletEdit,
  onCompanyBulletDelete: handleCompanyBulletDelete,
  onPortfolioEdit: handlePortfolioEdit,
  onPortfolioAdd: handlePortfolioAdd,
  onPortfolioDelete: handlePortfolioDelete,
  onNewsEdit: handleNewsEdit,
  onNewsAdd: handleNewsAdd,
  onNewsDelete: handleNewsDelete,
});

function updateIndicator(regionId) {
  const region = REGIONS.find(r => r.id === regionId);
  const { index, total } = regionPosition(REGIONS, regionId);
  indicator.textContent = `${region.label} · ${index}/${total}`;
  return region;
}

function renderPanelForCurrentSelection() {
  // Rendered unconditionally, before the activeWeekId guard below: unlike
  // the region panel, this has always been able to represent "no active
  // week" (renderWeekAdmin(null) just shows the add-week button, no crash).
  // Deleting the last remaining week is the one path that can drive
  // activeWeekId to null *during* an editing session — if this call were
  // gated behind the same early return as the rest of the function, the
  // week-admin container would keep showing a stale rename input/delete
  // button still wired to the just-deleted week, and using them could
  // resurrect a malformed ghost week document in Firestore.
  renderWeekAdmin(document.getElementById('week-admin'), {
    activeWeek: activeWeekId ? getWeeks(db).find(w => w.id === activeWeekId) || null : null,
    isEditing,
    onLabelEdit: handleWeekLabelEdit,
    onAddWeek: handleWeekAdd,
    onDeleteWeek: handleWeekDelete,
  });

  if (!activeWeekId) return;
  const region = REGIONS.find(r => r.id === activeRegionId);
  const portfolioRegion = getPortfolioRegion(db, activeRegionId);
  const portfolioEntries = getPortfolioEntriesForRegion(db, activeRegionId);
  currentPortfolioEntriesForChart = portfolioEntries;
  panel.showRegion(region.label, {
    marketItems: getMarketItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    newsItems: getNewsItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    companyItems: getCompanyItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    portfolioRegionLabel: portfolioRegion ? portfolioRegion.label : '',
    portfolioEntries,
    isEditing,
  });

  if (liveRefreshHandle) liveRefreshHandle.stop();
  liveRefreshHandle = startPortfolioLiveRefresh({
    getEntries: () => portfolioEntries,
    onOverrides: overrides => panel.updateLiveQuotes(overrides),
  });
}

function handleRegionSelect(regionId) {
  activeRegionId = regionId;
  updateIndicator(regionId);
  renderPanelForCurrentSelection();
}

const scene = initGlobeScene(container, {
  regions: REGIONS,
  initialRegionId: activeRegionId,
  onRegionSelect: handleRegionSelect,
});

prevBtn.addEventListener('click', () => scene.goToPrevRegion());
nextBtn.addEventListener('click', () => scene.goToNextRegion());

const editToggleBtn = document.getElementById('edit-toggle-btn');

const passwordModal = initPasswordModal({
  modalEl: document.getElementById('password-modal'),
  inputEl: document.getElementById('password-input'),
  errorEl: document.getElementById('password-error'),
  cancelBtn: document.getElementById('password-cancel'),
  okBtn: document.getElementById('password-ok'),
  expectedPassword: ADMIN_PASSWORD,
  onUnlock: () => {
    isEditing = true;
    editToggleBtn.textContent = '🔒 Terminer';
    editToggleBtn.classList.add('active');
    renderPanelForCurrentSelection();
  },
});

editToggleBtn.addEventListener('click', () => {
  if (isEditing) {
    isEditing = false;
    editToggleBtn.textContent = '✏️ Éditer';
    editToggleBtn.classList.remove('active');
    renderPanelForCurrentSelection();
  } else {
    passwordModal.open();
  }
});

async function bootstrap() {
  try {
    db = await loadAllWithRetry(() => client.loadAllOnce());

    const weeks = getWeeks(db);
    activeWeekId = weeks.length ? weeks[weeks.length - 1].id : null;

    weekTimelineHandle = initWeekTimeline({
      container: timelineEl,
      weeks,
      activeWeekId,
      onSelect: weekId => {
        activeWeekId = weekId;
        renderPanelForCurrentSelection();
      },
    });

    renderPanelForCurrentSelection();
  } catch (error) {
    console.error('Failed to load Firestore data', error);
    panel.showRegion('Données indisponibles', { marketItems: [], newsItems: [] });
  }
}

bootstrap();
