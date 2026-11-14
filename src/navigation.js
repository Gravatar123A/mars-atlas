import { GRID_RADIUS_M, distanceMeters } from './terrain.js';

const RAD = Math.PI / 180;
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function bearingDegrees(a, b) {
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const deltaLon = (b.lon - a.lon) * RAD;
  const east = Math.sin(deltaLon) * Math.cos(lat2);
  const north = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(east, north) / RAD + 360) % 360;
}

export function compassDirection(bearing) {
  return COMPASS[Math.round(bearing / 22.5) % 16];
}

export function turnDirection(previousBearing, nextBearing) {
  const change = ((nextBearing - previousBearing + 540) % 360) - 180;
  if (Math.abs(change) < 25) return 'Continue';
  if (Math.abs(change) > 150) return 'Turn around';
  return change > 0 ? 'Turn right' : 'Turn left';
}

function distanceToLine(point, start, end, radius) {
  const cos = Math.cos(((start.lat + end.lat) / 2) * RAD);
  const x = (point.lon - start.lon) * RAD * radius * cos;
  const y = (point.lat - start.lat) * RAD * radius;
  const endX = (end.lon - start.lon) * RAD * radius * cos;
  const endY = (end.lat - start.lat) * RAD * radius;
  const length2 = endX * endX + endY * endY;
  if (!length2) return Math.hypot(x, y);
  const t = Math.max(0, Math.min(1, (x * endX + y * endY) / length2));
  return Math.hypot(x - t * endX, y - t * endY);
}

function simplifiedIndices(points, forced, tolerance, radius) {
  const keep = new Set(forced);
  const anchors = [...forced].sort((a, b) => a - b);
  const stack = anchors.slice(1).map((end, i) => [anchors[i], end]);
  while (stack.length) {
    const [start, end] = stack.pop();
    let farthest = -1;
    let distance = tolerance;
    for (let i = start + 1; i < end; i++) {
      const current = distanceToLine(points[i], points[start], points[end], radius);
      if (current > distance) { distance = current; farthest = i; }
    }
    if (farthest >= 0) {
      keep.add(farthest);
      stack.push([start, farthest], [farthest, end]);
    }
  }
  return [...keep].sort((a, b) => a - b);
}

export function buildRouteGuide(route, radius = GRID_RADIUS_M) {
  if (!route?.points || route.points.length < 2) return { steps: [], checkpoints: [] };
  const points = route.points;
  const forced = new Set([0, points.length - 1, ...(route.waypointIndices || [])]);
  const spacing = route.model?.gridResolutionMeters || 20;
  let tolerance = Math.max(35, spacing * 2);
  let checkpoints = simplifiedIndices(points, forced, tolerance, radius);
  while (checkpoints.length > 25 && tolerance < spacing * 64) {
    tolerance *= 1.5;
    checkpoints = simplifiedIndices(points, forced, tolerance, radius);
  }
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative[i] = cumulative[i - 1] + (route.segments?.[i - 1]?.length ?? distanceMeters(points[i - 1], points[i], radius));
  }
  const steps = [];
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const startIndex = checkpoints[i];
    const endIndex = checkpoints[i + 1];
    const entryIndex = Math.min(endIndex, startIndex + 3);
    const exitIndex = Math.max(startIndex, endIndex - 3);
    const heading = bearingDegrees(points[startIndex], points[entryIndex]);
    const exitHeading = bearingDegrees(points[exitIndex], points[endIndex]);
    const previous = steps.at(-1);
    steps.push({
      number: i + 1,
      startIndex,
      endIndex,
      point: points[startIndex],
      nextPoint: points[endIndex],
      distanceMeters: cumulative[endIndex] - cumulative[startIndex],
      atMeters: cumulative[startIndex],
      heading,
      exitHeading,
      compass: compassDirection(heading),
      instruction: previous ? turnDirection(previous.exitHeading, heading) : 'Start',
      waypoint: forced.has(endIndex) && endIndex !== points.length - 1,
    });
  }
  return { steps, checkpoints };
}
