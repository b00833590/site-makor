import Globe from 'globe.gl';
import { cameraForRegion } from './camera.js';
import { nextRegionId, prevRegionId } from './cycle.js';

const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const SKY_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/night-sky.png';
const CAMERA_TRANSITION_MS = 1200;
const MARKER_COLOR = '#e0b53d';

export function initGlobeScene(container, { regions, initialRegionId, onRegionSelect }) {
  let currentRegionId = initialRegionId;

  const points = regions.flatMap(region =>
    region.points.map(point => ({ ...point, regionId: region.id }))
  );

  const world = Globe()(container)
    .globeImageUrl(EARTH_TEXTURE_URL)
    .backgroundImageUrl(SKY_TEXTURE_URL)
    .pointsData(points)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(() => MARKER_COLOR)
    .pointAltitude(0.015)
    .pointRadius(0.35)
    .pointLabel('name')
    .onPointClick(point => selectRegion(point.regionId));

  world.controls().autoRotate = true;
  world.controls().autoRotateSpeed = 0.4;

  window.addEventListener('resize', () => {
    world.width(container.clientWidth).height(container.clientHeight);
  });

  function selectRegion(regionId) {
    const region = regions.find(r => r.id === regionId);
    if (!region) return;
    currentRegionId = regionId;
    world.controls().autoRotate = false;
    world.pointOfView(cameraForRegion(region), CAMERA_TRANSITION_MS);
    onRegionSelect(regionId);
  }

  selectRegion(initialRegionId);

  return {
    goToNextRegion: () => selectRegion(nextRegionId(regions, currentRegionId)),
    goToPrevRegion: () => selectRegion(prevRegionId(regions, currentRegionId)),
    goToRegion: regionId => selectRegion(regionId),
  };
}
