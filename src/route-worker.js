import { planRoute, planRouteVia } from './terrain.js';

self.onmessage = ({ data }) => {
  const { grid, start, destination, waypoint, maxSlope, speed } = data;
  try {
    const common = { maxSlopeDeg: maxSlope, speedMetersPerSecond: speed };
    const shortest = planRoute(grid, start, destination, { ...common, terrainWeight: 0 });
    const conservative = planRoute(grid, start, destination, { ...common, terrainWeight: 8 });
    const via = waypoint ? planRouteVia(grid, start, [waypoint], destination, { ...common, terrainWeight: 0 }) : null;
    self.postMessage({ routes: { shortest, conservative, waypoint: via } });
  } catch (error) {
    self.postMessage({ error: error.message || String(error) });
  }
};
