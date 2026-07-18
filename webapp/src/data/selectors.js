import { normalizeRegionLabel } from './regionMatch.js';

export function getWeeks(db) {
  return Object.keys(db)
    .filter(key => key.startsWith('mkg:week:'))
    .map(key => db[key])
    .sort((a, b) => a.order - b.order);
}

export function getMarketItemsForWeekAndRegion(db, weekId, regionId) {
  const prefix = `mkg:market:${weekId}:`;
  return Object.keys(db)
    .filter(key => key.startsWith(prefix))
    .map(key => db[key])
    .filter(item => normalizeRegionLabel(item.group) === regionId);
}

export function getNewsItemsForWeekAndRegion(db, weekId, regionId) {
  const prefix = `mkg:content:news:${weekId}:`;
  return Object.keys(db)
    .filter(key => key.startsWith(prefix))
    .map(key => db[key])
    .filter(item => normalizeRegionLabel(item.region) === regionId);
}
