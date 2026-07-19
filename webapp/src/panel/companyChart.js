import { ddmmToISOThisYear } from '../data/dateUtils.js';

export function companySymbol(item) {
  return item.yahooSymbol || null;
}

export function companyPresentationDateISO(item, portfolioEntries) {
  const match = portfolioEntries.find(entry => entry.entreprise === item.name);
  if (!match || !match.date) return null;
  return ddmmToISOThisYear(match.date);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const CHART_WIDTH = 280;
const CHART_HEIGHT = 80;
const CHART_STROKE_COLOR = '#e0b53d';

export function buildChartSVG(points, { width = CHART_WIDTH, height = CHART_HEIGHT } = {}) {
  if (!points || points.length < 2) return null;

  const closes = points.map(p => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const coords = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p.close - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const polyline = document.createElementNS(SVG_NS, 'polyline');
  polyline.setAttribute('points', coords);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', CHART_STROKE_COLOR);
  polyline.setAttribute('stroke-width', '2');
  svg.appendChild(polyline);

  return svg;
}
