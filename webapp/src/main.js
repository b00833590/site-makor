import './styles/globe.css';
import './panel/sidePanel.css';
import './panel/companyList.css';
import './panel/portfolioTable.css';
import './timeline/weekTimeline.css';
import { REGIONS } from './globe/regions.js';
import { regionPosition } from './globe/cycle.js';
import { initGlobeScene } from './globe/globeScene.js';
import { createFirestoreClient, loadAllWithRetry } from './data/firestoreClient.js';
import { getWeeks, getMarketItemsForWeekAndRegion, getNewsItemsForWeekAndRegion, getCompanyItemsForWeekAndRegion } from './data/selectors.js';
import { getPortfolioEntriesForRegion, getPortfolioRegion } from './data/portfolioSelectors.js';
import { initSidePanel } from './panel/sidePanel.js';
import { initWeekTimeline } from './timeline/weekTimeline.js';

const container = document.getElementById('globe-container');
const indicator = document.getElementById('region-indicator');
const prevBtn = document.getElementById('arrow-prev');
const nextBtn = document.getElementById('arrow-next');
const timelineEl = document.getElementById('week-timeline');

const panel = initSidePanel({
  labelEl: document.getElementById('panel-region-label'),
  indicesEl: document.getElementById('panel-indices'),
  newsEl: document.getElementById('panel-news'),
  companiesEl: document.getElementById('panel-companies'),
  compareEl: document.getElementById('panel-compare'),
  portfolioLabelEl: document.getElementById('panel-portfolio-region-label'),
  portfolioEl: document.getElementById('panel-portfolio'),
});

let db = {};
let activeWeekId = null;
let activeRegionId = 'asia';

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
  panel.showRegion(region.label, {
    marketItems: getMarketItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    newsItems: getNewsItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    companyItems: getCompanyItemsForWeekAndRegion(db, activeWeekId, activeRegionId),
    portfolioRegionLabel: portfolioRegion ? portfolioRegion.label : '',
    portfolioEntries: getPortfolioEntriesForRegion(db, activeRegionId),
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

async function bootstrap() {
  try {
    const client = createFirestoreClient();
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
