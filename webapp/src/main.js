import './styles/globe.css';
import './panel/sidePanel.css';
import './panel/companyList.css';
import './panel/portfolioTable.css';
import './panel/chartModal.css';
import './timeline/weekTimeline.css';
import './timeline/weekAdmin.css';
import './admin/passwordModal.css';
import './admin/toast.css';
import './admin/colorPicker.css';
import './panel/presentations.css';
import { REGIONS } from './globe/regions.js';
import { regionPosition } from './globe/cycle.js';
import { initGlobeScene } from './globe/globeScene.js';
import { createFirestoreClient, loadAllWithRetry } from './data/firestoreClient.js';
import { getWeeks, getMarketItemsForWeekAndRegion, getNewsItemsForWeekAndRegion, getCompanyItemsForWeekAndRegion, getIaFintechItemsForWeek, getWeekContentKeys, getAllMarketItemsForWeek, getAllNewsItemsForWeek, getAllCompanyItemsForWeek, getPresentations } from './data/selectors.js';
import { getPortfolioEntriesForRegion, getPortfolioRegion, PORTFOLIO_REGION_BY_GLOBE_REGION } from './data/portfolioSelectors.js';
import { initSidePanel } from './panel/sidePanel.js';
import { initCompanyChartModal } from './panel/chartModal.js';
import { buildExportFilename, exportElementAsPDF, buildPortfolioExportFilename } from './panel/pdfExport.js';
import { openPresentationPdf } from './panel/presentationPdf.js';
import { initWeekTimeline } from './timeline/weekTimeline.js';
import { renderWeekAdmin } from './timeline/weekAdmin.js';
import { startPortfolioLiveRefresh } from './panel/portfolioLiveRefresh.js';
import { initPasswordModal } from './admin/passwordModal.js';
import { showToast } from './admin/toast.js';
import { generateId } from './admin/uid.js';
import { ADMIN_PASSWORD } from './admin/config.js';
import { computeSessionRestore, splitUnrestorablePresentationDeletes } from './admin/sessionUndo.js';

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
// Deep copy of db taken when edit mode is unlocked, so "Tout annuler" can
// restore the session's starting point. null whenever edit mode is off.
let sessionSnapshot = null;

function marketItemKey(item) {
  return `mkg:market:${activeWeekId}:${item.id}`;
}

function setItemLocal(key, value, rollbackMessage) {
  const previous = db[key];
  db[key] = value;
  renderPanelForCurrentSelection();
  client.writeDoc(key, value).catch(() => {
    if (previous === undefined) delete db[key]; else db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), rollbackMessage);
  });
}

function deleteItemLocal(key, rollbackMessage) {
  const previous = db[key];
  delete db[key];
  renderPanelForCurrentSelection();
  client.deleteDocByKey(key).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), rollbackMessage);
  });
}

function handleIndexEdit(item, patch) {
  const key = marketItemKey(item);
  setItemLocal(key, { ...db[key], ...patch }, '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
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
  setItemLocal(key, newItem, '⚠️ Ajout en ligne échoué — le nouvel indice a été retiré');
}

function handleIndexDelete(item) {
  deleteItemLocal(marketItemKey(item), "⚠️ Suppression en ligne échouée — l'indice a été restauré");
}

function handleIndexColorChange(item, field, color) {
  const colors = { ...(item.colors || {}) };
  if (color) colors[field] = color; else delete colors[field];
  handleIndexEdit(item, { colors });
}

function companyItemKey(item) {
  return `mkg:content:entreprises:${activeWeekId}:${item.id}`;
}

function handleCompanyEdit(item, patch) {
  const key = companyItemKey(item);
  setItemLocal(key, { ...db[key], ...patch }, '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
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
  setItemLocal(key, newItem, '⚠️ Ajout en ligne échoué — la nouvelle entreprise a été retirée');
}

function handleCompanyDelete(item) {
  deleteItemLocal(companyItemKey(item), "⚠️ Suppression en ligne échouée — l'entreprise a été restaurée");
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
  setItemLocal(key, { ...db[key], ...patch }, '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
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
  setItemLocal(key, newItem, '⚠️ Ajout en ligne échoué — la nouvelle ligne a été retirée');
}

function handlePortfolioDelete(item) {
  deleteItemLocal(portfolioItemKey(item), "⚠️ Suppression en ligne échouée — la ligne a été restaurée");
}

function newsItemKey(item) {
  return `mkg:content:news:${activeWeekId}:${item.id}`;
}

function handleNewsEdit(item, patch) {
  const key = newsItemKey(item);
  setItemLocal(key, { ...db[key], ...patch }, '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
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
  setItemLocal(key, newItem, '⚠️ Ajout en ligne échoué — la nouvelle brève a été retirée');
}

function handleNewsDelete(item) {
  deleteItemLocal(newsItemKey(item), "⚠️ Suppression en ligne échouée — la brève a été restaurée");
}

function iaFintechItemKey(item) {
  return `mkg:content:ia-fintech:${activeWeekId}:${item.id}`;
}

function handleIaFintechEdit(item, patch) {
  const key = iaFintechItemKey(item);
  setItemLocal(key, { ...db[key], ...patch }, '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
}

function handleIaFintechAdd() {
  const id = generateId();
  const key = `mkg:content:ia-fintech:${activeWeekId}:${id}`;
  const newItem = {
    id,
    tag: '',
    title: 'Nouvel élément',
    description: 'Description à compléter.',
    statLabel: '',
    statValue: '',
    link: '',
  };
  setItemLocal(key, newItem, '⚠️ Ajout en ligne échoué — le nouvel élément a été retiré');
}

function handleIaFintechDelete(item) {
  deleteItemLocal(iaFintechItemKey(item), "⚠️ Suppression en ligne échouée — l'élément a été restauré");
}

async function handlePresentationOpen(item) {
  showToast(document.getElementById('admin-toast'), 'Chargement de la présentation...');
  const result = await openPresentationPdf(item.id, client, (done, total) => {
    if (done % 5 === 0 || done === total) {
      showToast(document.getElementById('admin-toast'), `Chargement de la présentation... (${done}/${total})`);
    }
  });
  if (!result.ok) {
    const messages = {
      'not-ready': "⚠️ Cette présentation n'est pas encore complètement intégrée — réessaie dans une minute",
      'chunk-failed': '⚠️ Échec du chargement — vérifie ta connexion et réessaie',
      'reassembly-failed': "⚠️ Erreur lors de l'ouverture du PDF",
    };
    showToast(document.getElementById('admin-toast'), messages[result.reason] || "⚠️ Erreur lors de l'ouverture du PDF");
    return;
  }
  window.open(result.url, '_blank', 'noopener');
}

function handlePresentationTitleEdit(item, title) {
  const key = `mkg:presentation:${item.id}`;
  const previous = db[key];
  const updated = { ...previous, title };
  db[key] = updated;
  renderPanelForCurrentSelection();
  client.writeDoc(key, updated).catch(() => {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Sauvegarde en ligne échouée — la modification a été annulée');
  });
}

async function handlePresentationDelete(item) {
  if (!window.confirm(`Supprimer la présentation "${item.title || 'Sans titre'}" et son PDF ? Cette action ne peut pas être annulée.`)) return;
  const key = `mkg:presentation:${item.id}`;
  const previous = db[key];
  let chunkKeys;
  try {
    chunkKeys = await client.fetchKeysWithPrefix(`mkg:pdfchunk:${item.id}:`);
  } catch {
    // Nothing has been mutated locally yet at this point, so there's nothing
    // to roll back — just let the admin know and stop.
    showToast(document.getElementById('admin-toast'), '⚠️ Suppression en ligne échouée — vérifie ta connexion et réessaie');
    return;
  }
  delete db[key];
  renderPanelForCurrentSelection();
  try {
    await client.deleteDocsBatch([...chunkKeys, key]);
  } catch {
    db[key] = previous;
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Suppression en ligne échouée — la présentation a été restaurée');
  }
}

function handlePresentationAddClick() {
  showToast(document.getElementById('admin-toast'), "Pour ajouter une présentation, transmets le PDF à la personne qui administre le site — la vignette et l'intégration se font manuellement.");
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
  let fallbackWeekId = activeWeekId;
  if (wasActive) {
    const remainingWeeks = getWeeks(db);
    activeWeekId = remainingWeeks.length ? remainingWeeks[remainingWeeks.length - 1].id : null;
    fallbackWeekId = activeWeekId;
  }
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
  renderPanelForCurrentSelection();

  client.deleteDocsBatch(keys).catch(() => {
    for (const [key, value] of previousEntries) db[key] = value;
    // Only snap navigation back to the deleted week if the user hasn't since
    // moved on from the fallback week this call switched to (e.g. manually
    // selecting another week) — same reasoning as handleWeekAdd's guard.
    if (wasActive && activeWeekId === fallbackWeekId) activeWeekId = week.id;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Suppression en ligne échouée — la semaine a été restaurée');
  });
}

function duplicateContentEntries(items, keyPrefix, newWeekId) {
  return items.map(item => {
    const newId = generateId();
    return [`${keyPrefix}${newWeekId}:${newId}`, { ...item, id: newId }];
  });
}

function handleWeekDuplicate(sourceWeek) {
  const sourceWeekId = sourceWeek.id;
  const newWeekId = generateId();
  const newWeekKey = `mkg:week:${newWeekId}`;
  const existingWeeks = getWeeks(db);
  const maxOrder = existingWeeks.reduce((max, w) => Math.max(max, w.order), -1);
  const newWeek = { id: newWeekId, label: `${sourceWeek.label} (copie)`, order: maxOrder + 1 };
  const previousActiveWeekId = activeWeekId;

  const contentEntries = [
    ...duplicateContentEntries(getAllMarketItemsForWeek(db, sourceWeekId), 'mkg:market:', newWeekId),
    ...duplicateContentEntries(getAllNewsItemsForWeek(db, sourceWeekId), 'mkg:content:news:', newWeekId),
    ...duplicateContentEntries(getAllCompanyItemsForWeek(db, sourceWeekId), 'mkg:content:entreprises:', newWeekId),
    ...duplicateContentEntries(getIaFintechItemsForWeek(db, sourceWeekId), 'mkg:content:ia-fintech:', newWeekId),
  ];

  db[newWeekKey] = newWeek;
  for (const [key, value] of contentEntries) db[key] = value;
  activeWeekId = newWeekId;
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
  renderPanelForCurrentSelection();

  client.writeDocsBatch([[newWeekKey, newWeek], ...contentEntries]).catch(() => {
    delete db[newWeekKey];
    for (const [key] of contentEntries) delete db[key];
    // Same "only if the user hasn't since moved on" guard as handleWeekAdd/handleWeekDelete.
    if (activeWeekId === newWeekId) activeWeekId = previousActiveWeekId;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Duplication en ligne échouée — la semaine dupliquée a été retirée');
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
  iaFintechEl: document.getElementById('panel-ia-fintech'),
  presentationsEl: document.getElementById('panel-presentations'),
  onOpenChart: item => chartModal.open(item, currentPortfolioEntriesForChart),
  onIndexEdit: handleIndexEdit,
  onIndexAdd: handleIndexAdd,
  onIndexDelete: handleIndexDelete,
  onIndexColorChange: handleIndexColorChange,
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
  onIaFintechEdit: handleIaFintechEdit,
  onIaFintechAdd: handleIaFintechAdd,
  onIaFintechDelete: handleIaFintechDelete,
  onPresentationOpen: handlePresentationOpen,
  onPresentationDelete: handlePresentationDelete,
  onPresentationTitleEdit: handlePresentationTitleEdit,
  onPresentationAddClick: handlePresentationAddClick,
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
    onDuplicateWeek: handleWeekDuplicate,
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
    iaFintechItems: getIaFintechItemsForWeek(db, activeWeekId),
    presentations: getPresentations(db),
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
const undoAllBtn = document.getElementById('undo-all-btn');

const passwordModal = initPasswordModal({
  modalEl: document.getElementById('password-modal'),
  inputEl: document.getElementById('password-input'),
  errorEl: document.getElementById('password-error'),
  cancelBtn: document.getElementById('password-cancel'),
  okBtn: document.getElementById('password-ok'),
  expectedPassword: ADMIN_PASSWORD,
  onUnlock: () => {
    isEditing = true;
    sessionSnapshot = JSON.parse(JSON.stringify(db));
    editToggleBtn.textContent = '🔒 Terminer';
    editToggleBtn.classList.add('active');
    undoAllBtn.classList.add('visible');
    renderPanelForCurrentSelection();
  },
});

editToggleBtn.addEventListener('click', () => {
  if (isEditing) {
    isEditing = false;
    sessionSnapshot = null;
    editToggleBtn.textContent = '✏️ Éditer';
    editToggleBtn.classList.remove('active');
    undoAllBtn.classList.remove('visible');
    renderPanelForCurrentSelection();
  } else {
    passwordModal.open();
  }
});

function handleUndoAll() {
  if (!sessionSnapshot) return;

  const { writes: rawWrites, deletes } = computeSessionRestore(sessionSnapshot, db);
  // A deleted presentation's PDF chunks are gone forever (handlePresentationDelete
  // removes them atomically with the metadata doc, and they're never tracked in
  // db to begin with) — restoring just the metadata doc would resurrect a card
  // that looks fine but can never open. Exclude those, tell the admin plainly.
  const { safeWrites: writes, unrestorablePresentationTitles } = splitUnrestorablePresentationDeletes(rawWrites, db);

  if (writes.length === 0 && deletes.length === 0) {
    if (unrestorablePresentationTitles.length > 0) {
      showToast(document.getElementById('admin-toast'), `⚠️ Rien à restaurer — ${unrestorablePresentationTitles.join(', ')} ne peuvent pas être récupérées (PDF définitivement supprimé)`);
    } else {
      showToast(document.getElementById('admin-toast'), 'Rien à annuler');
    }
    return;
  }

  const total = writes.length + deletes.length;
  let confirmMessage = `Annuler toutes les modifications faites depuis le début de cette session d'édition ? ${total} élément(s) seront restaurés à leur état initial.`;
  if (unrestorablePresentationTitles.length > 0) {
    confirmMessage += `\n\n⚠️ ${unrestorablePresentationTitles.join(', ')} ne peuvent pas être restaurées (PDF définitivement supprimé) et resteront supprimées.`;
  }
  if (!window.confirm(confirmMessage)) return;

  // Capture only the keys this undo actually touches, so a failed commit
  // restores exactly those and nothing else. Deliberately NOT a full copy of
  // db: the batch commit is async (and retries for up to ~1.8s), so an admin
  // can legitimately edit another section while it is in flight — wholesale
  // restoring db would silently wipe that concurrent, unrelated work.
  // Capturing references is safe here because no handler in this file ever
  // mutates a db value in place; they all build a new object and reassign.
  const touchedKeys = [...writes.map(([key]) => key), ...deletes];
  const beforeUndo = {};
  for (const key of touchedKeys) beforeUndo[key] = db[key];
  const previousActiveWeekId = activeWeekId;

  for (const [key, value] of writes) db[key] = value;
  for (const key of deletes) delete db[key];

  // A week created during this session is now gone; don't leave the app
  // pointing at a week that no longer exists. Same fallback handleWeekDelete
  // uses: land on the last remaining week, or nothing if there are none.
  const restoredWeeks = getWeeks(db);
  if (!restoredWeeks.some(w => w.id === activeWeekId)) {
    activeWeekId = restoredWeeks.length ? restoredWeeks[restoredWeeks.length - 1].id : null;
  }
  // Recorded so the failure path below can tell "the admin hasn't navigated
  // since this optimistic restore" apart from "they have" — same guard
  // handleWeekAdd/handleWeekDelete already use, so a failed commit doesn't
  // silently snap the admin back to a week they've since moved on from.
  const activeWeekIdAfterRestore = activeWeekId;
  if (weekTimelineHandle) weekTimelineHandle.setWeeks(restoredWeeks, activeWeekId);
  renderPanelForCurrentSelection();

  client.applyBatch({ writes, deletes }).then(() => {
    // sessionSnapshot is deliberately left untouched. db now matches it for
    // every key this restore covered, so a second click already computes an
    // empty diff — and keeping the original snapshot means any edit made
    // concurrently during the commit stays undoable, which re-snapshotting
    // from db would silently forfeit. (Production re-snapshots here; that is
    // equivalent only when nothing changed mid-flight.)
    showToast(document.getElementById('admin-toast'), '↺ Modifications de la session annulées');
  }).catch(() => {
    for (const key of touchedKeys) {
      if (beforeUndo[key] === undefined) delete db[key]; else db[key] = beforeUndo[key];
    }
    if (activeWeekId === activeWeekIdAfterRestore) activeWeekId = previousActiveWeekId;
    if (weekTimelineHandle) weekTimelineHandle.setWeeks(getWeeks(db), activeWeekId);
    renderPanelForCurrentSelection();
    showToast(document.getElementById('admin-toast'), '⚠️ Annulation en ligne échouée — vos modifications ont été conservées');
  });
}

undoAllBtn.addEventListener('click', handleUndoAll);

const exportPdfBtn = document.getElementById('export-pdf-btn');

exportPdfBtn.addEventListener('click', async () => {
  const sidePanelEl = document.querySelector('.side-panel');
  const region = REGIONS.find(r => r.id === activeRegionId);
  const activeWeek = getWeeks(db).find(w => w.id === activeWeekId);
  const filename = buildExportFilename(region ? region.label : '', activeWeek ? activeWeek.label : '');

  exportPdfBtn.disabled = true;
  exportPdfBtn.textContent = '⏳ Génération...';
  sidePanelEl.classList.add('pdf-export');
  try {
    await exportElementAsPDF(sidePanelEl, filename);
  } catch (error) {
    console.error('PDF export failed', error);
  } finally {
    sidePanelEl.classList.remove('pdf-export');
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = '📄 Exporter en PDF';
  }
});

const exportPortfolioPdfBtn = document.getElementById('export-portfolio-pdf-btn');

exportPortfolioPdfBtn.addEventListener('click', async () => {
  const sidePanelEl = document.querySelector('.side-panel');
  const portfolioRegion = getPortfolioRegion(db, activeRegionId);
  const activeWeek = getWeeks(db).find(w => w.id === activeWeekId);
  const filename = buildPortfolioExportFilename(portfolioRegion ? portfolioRegion.label : '', activeWeek ? activeWeek.label : '');

  exportPortfolioPdfBtn.disabled = true;
  exportPortfolioPdfBtn.textContent = '⏳';
  // Captures the *whole* .side-panel (same element and code path already proven
  // correct by the full-panel export) with every other section hidden via the
  // pdf-export-portfolio-only class, rather than pointing html2canvas at the
  // narrower #panel-portfolio-section element directly. Verified live that the
  // narrower-target approach silently mis-crops: html2canvas computes its render
  // window before the .side-panel reflow (position:fixed -> static) settles, so
  // a target element positioned deep inside that reflowed ancestor gets captured
  // at the wrong coordinates — the exported PDF showed only the header row, no
  // data. Capturing the same root as the working full-panel export sidesteps
  // that mismatch entirely.
  sidePanelEl.classList.add('pdf-export', 'pdf-export-portfolio-only');
  try {
    await exportElementAsPDF(sidePanelEl, filename);
  } catch (error) {
    console.error('Portfolio PDF export failed', error);
  } finally {
    sidePanelEl.classList.remove('pdf-export', 'pdf-export-portfolio-only');
    exportPortfolioPdfBtn.disabled = false;
    exportPortfolioPdfBtn.textContent = '📄';
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
