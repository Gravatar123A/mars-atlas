export const GRID_RADIUS_M = 3396190;
const RAD = Math.PI / 180;

export function cellAt(grid, point) {
  const col = Math.round((point.lon - grid.westCenterLon) / grid.degreesPerPixelLon);
  const row = Math.round((grid.northCenterLat - point.lat) / grid.degreesPerPixelLat);
  if (row < 0 || col < 0 || row >= grid.height || col >= grid.width) return null;
  return row * grid.width + col;
}

export function pointAt(grid, index) {
  const row = Math.floor(index / grid.width);
  const col = index % grid.width;
  return {
    lat: grid.northCenterLat - row * grid.degreesPerPixelLat,
    lon: grid.westCenterLon + col * grid.degreesPerPixelLon,
  };
}

export function distanceMeters(a, b, radius = GRID_RADIUS_M) {
  const p1 = a.lat * RAD;
  const p2 = b.lat * RAD;
  const dp = (b.lat - a.lat) * RAD;
  const dl = (b.lon - a.lon) * RAD;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

class MinHeap {
  constructor() { this.items = []; }
  push(node) {
    const a = this.items;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].priority <= node.priority) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = node;
  }
  pop() {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (!a.length) return top;
    let i = 0;
    while (true) {
      const left = i * 2 + 1;
      if (left >= a.length) break;
      const right = left + 1;
      const child = right < a.length && a[right].priority < a[left].priority ? right : left;
      if (a[child].priority >= last.priority) break;
      a[i] = a[child];
      i = child;
    }
    a[i] = last;
    return top;
  }
  get length() { return this.items.length; }
}

const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

export function planRoute(grid, start, destination, options = {}) {
  const maxSlopeDeg = Number(options.maxSlopeDeg ?? 15);
  const terrainWeight = Number(options.terrainWeight ?? 0);
  const speedMetersPerSecond = Number(options.speedMetersPerSecond ?? 0.75);
  const startIndex = cellAt(grid, start);
  const goalIndex = cellAt(grid, destination);
  if (startIndex === null || goalIndex === null) return { error: 'Start or destination lies outside verified elevation coverage.' };
  const elevation = grid.elevationsMeters;
  if (!Number.isFinite(elevation[startIndex]) || !Number.isFinite(elevation[goalIndex])) {
    return { error: 'Start or destination has no numerical elevation data.' };
  }
  if (startIndex === goalIndex) return { error: 'Choose two different map cells to calculate a route.' };
  if (!(maxSlopeDeg > 0 && maxSlopeDeg <= 45)) return { error: 'Maximum slope must be between 0 and 45 degrees.' };

  const count = grid.width * grid.height;
  const cost = new Float64Array(count);
  const previous = new Int32Array(count);
  const visited = new Uint8Array(count);
  cost.fill(Infinity);
  previous.fill(-1);
  cost[startIndex] = 0;
  const open = new MinHeap();
  open.push({ index: startIndex, priority: distanceMeters(pointAt(grid, startIndex), pointAt(grid, goalIndex), grid.radiusMeters) });
  const latRad = start.lat * RAD;
  const eastMeters = grid.radiusMeters * Math.cos(latRad) * grid.degreesPerPixelLon * RAD;
  const northMeters = grid.radiusMeters * grid.degreesPerPixelLat * RAD;
  let explored = 0;

  while (open.length) {
    const current = open.pop().index;
    if (visited[current]) continue;
    visited[current] = 1;
    explored++;
    if (current === goalIndex) break;
    const row = Math.floor(current / grid.width);
    const col = current % grid.width;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nc < 0 || nr >= grid.height || nc >= grid.width) continue;
      const neighbor = nr * grid.width + nc;
      if (visited[neighbor] || !Number.isFinite(elevation[neighbor])) continue;
      // A diagonal cannot squeeze between missing or over-limit orthogonal edges.
      if (dr && dc) {
        const sides = [row * grid.width + nc, nr * grid.width + col];
        const sideDistances = [Math.abs(eastMeters), Math.abs(northMeters)];
        if (sides.some((side, i) => !Number.isFinite(elevation[side]) ||
          Math.atan2(Math.abs(elevation[side] - elevation[current]), sideDistances[i]) / RAD > maxSlopeDeg)) continue;
      }
      const horizontal = Math.hypot(dc * eastMeters, dr * northMeters);
      const deltaHeight = elevation[neighbor] - elevation[current];
      const slopeDeg = Math.atan2(Math.abs(deltaHeight), horizontal) / RAD;
      if (slopeDeg > maxSlopeDeg) continue;
      const weighted = horizontal * (1 + terrainWeight * (slopeDeg / maxSlopeDeg) ** 2);
      const nextCost = cost[current] + weighted;
      if (nextCost >= cost[neighbor]) continue;
      cost[neighbor] = nextCost;
      previous[neighbor] = current;
      const heuristic = distanceMeters(pointAt(grid, neighbor), pointAt(grid, goalIndex), grid.radiusMeters);
      open.push({ index: neighbor, priority: nextCost + heuristic });
    }
  }

  if (!visited[goalIndex]) return { error: `No route through measured cells meets the ${maxSlopeDeg}° slope limit.`, explored };
  const indices = [];
  for (let p = goalIndex; p !== -1; p = previous[p]) indices.push(p);
  indices.reverse();
  const points = indices.map((index) => ({ ...pointAt(grid, index), elevation: elevation[index] }));
  let distance = 0, ascent = 0, descent = 0, steepest = 0;
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const length = distanceMeters(points[i - 1], points[i], grid.radiusMeters);
    const dh = points[i].elevation - points[i - 1].elevation;
    const slope = Math.atan2(Math.abs(dh), length) / RAD;
    distance += length;
    ascent += Math.max(0, dh);
    descent += Math.max(0, -dh);
    steepest = Math.max(steepest, slope);
    segments.push({ length, slopeDeg: slope, elevationChange: dh });
  }
  return {
    points,
    segments,
    distanceMeters: distance,
    ascentMeters: ascent,
    descentMeters: descent,
    maxSlopeDeg: steepest,
    estimatedMinutes: distance / speedMetersPerSecond / 60,
    explored,
    model: { maxSlopeDeg, terrainWeight, speedMetersPerSecond, gridResolutionMeters: grid.resolutionMeters },
  };
}

export function planRouteVia(grid, start, waypoints, destination, options = {}) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) return planRoute(grid, start, destination, options);
  const stops = [start, ...waypoints, destination];
  const legs = [];
  for (let i = 1; i < stops.length; i++) {
    const leg = planRoute(grid, stops[i - 1], stops[i], options);
    if (leg.error) return { error: `Leg ${i} of ${stops.length - 1}: ${leg.error}`, failedLeg: i };
    legs.push(leg);
  }
  const points = legs.flatMap((leg, i) => i ? leg.points.slice(1) : leg.points);
  const segments = legs.flatMap((leg) => leg.segments);
  return {
    points, segments,
    distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
    ascentMeters: legs.reduce((sum, leg) => sum + leg.ascentMeters, 0),
    descentMeters: legs.reduce((sum, leg) => sum + leg.descentMeters, 0),
    maxSlopeDeg: Math.max(...legs.map((leg) => leg.maxSlopeDeg)),
    estimatedMinutes: legs.reduce((sum, leg) => sum + leg.estimatedMinutes, 0),
    explored: legs.reduce((sum, leg) => sum + leg.explored, 0),
    model: legs[0].model,
    waypointIndices: legs.slice(0, -1).map((_, i) => legs.slice(0, i + 1).reduce((sum, leg, j) => sum + leg.points.length - (j ? 1 : 0), 0) - 1),
    legs,
  };
}
