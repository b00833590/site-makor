import './styles/globe.css';
import './panel/sidePanel.css';
import './panel/companyList.css';
import './panel/portfolioTable.css';
import './panel/chartModal.css';
import './timeline/weekTimeline.css';
import './admin/passwordModal.css';
import './admin/toast.css';
import { REGIONS } from './globe/regions.js';
import { regionPosition } from './globe/cycle.js';
import { initGlobeScene } from './globe/globeScene.js';
import { createFirestoreClient, loadAllWithRetry } from './data/firestoreClient.js';
import { getWeeks, getMarketItemsForWeekAndRegion, getNewsItemsForWeekAndRegion, getCompanyItemsForWeekAndRegion } from './data/selectors.js';
import { getPortfolioEntriesForRegion, getPortfolioRegion } from './data/portfolioSelectors.js';
import { initSidePanel } from './panel/sidePanel.js';
import { initCompanyChartModal } from './panel/chartModal.js';
import { initWeekTimeline } from './timeline/weekTimeline.js';
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
});

function updateIndicator(regionId) {
  const region = REGIONS.find(r => r.id === regionId);
  const { index, total } = regionPosition(REGIONS, regionId);
  indicator.textContent = `${region.label} · ${index}/${total}`;
  return region;
}

function renderPanelForCurrentSelection() {
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

    initWeekTimeline({
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
