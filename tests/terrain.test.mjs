import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cellAt, distanceMeters, planRoute, planRouteVia, pointAt } from '../src/terrain.js';

const grid = JSON.parse(readFileSync(new URL('../public/data/jezero-grid.json', import.meta.url)));
const landing = { lat: 18.44463, lon: 77.45088 };
const hogwallow = { lat: 18.44272865, lon: 77.38228798 };
const sol426 = { lat: 18.42416332, lon: 77.42524624 };

test('Mars distance uses the source radius', () => {
  const expected = grid.radiusMeters * Math.PI / 180;
  assert.ok(Math.abs(distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }, grid.radiusMeters) - expected) < 1e-6);
});

test('verified points round-trip through source grid', () => {
  for (const point of [landing, hogwallow, sol426]) {
    const index = cellAt(grid, point);
    assert.notEqual(index, null);
    assert.ok(Number.isFinite(grid.elevationsMeters[index]));
    assert.ok(distanceMeters(point, pointAt(grid, index), grid.radiusMeters) < 15);
  }
});

test('route profiles exhibit a measured terrain trade-off', () => {
  const shortest = planRoute(grid, landing, hogwallow, { maxSlopeDeg: 5, terrainWeight: 0 });
  const conservative = planRoute(grid, landing, hogwallow, { maxSlopeDeg: 5, terrainWeight: 8 });
  assert.ok(shortest.points?.length > 2);
  assert.ok(conservative.points?.length > 2);
  assert.ok(conservative.distanceMeters > shortest.distanceMeters);
  assert.ok(conservative.maxSlopeDeg < shortest.maxSlopeDeg);
  assert.ok(shortest.maxSlopeDeg <= 5 + 0.01);
  assert.ok(conservative.maxSlopeDeg <= 5 + 0.01);
});

test('unreachable slope constraint reports no path', () => {
  const result = planRoute(grid, landing, hogwallow, { maxSlopeDeg: 0.1 });
  assert.match(result.error, /No route/);
  assert.equal(result.points, undefined);
});

test('unknown or identical endpoints are rejected', () => {
  assert.match(planRoute(grid, landing, landing).error, /different/);
  assert.match(planRoute(grid, { lat: 0, lon: 0 }, hogwallow).error, /outside/);
  const copy = { ...grid, elevationsMeters: [...grid.elevationsMeters] };
  copy.elevationsMeters[cellAt(copy, landing)] = null;
  assert.match(planRoute(copy, landing, hogwallow).error, /no numerical elevation/);
});

test('waypoint itinerary visits the selected grid cell and sums its legs', () => {
  const waypoint = sol426;
  const route = planRouteVia(grid, landing, [waypoint], hogwallow, { maxSlopeDeg: 5 });
  assert.ok(route.points?.length > 2, route.error);
  assert.equal(route.legs.length, 2);
  assert.equal(route.points.length, route.segments.length + 1);
  assert.equal(cellAt(grid, route.points[route.waypointIndices[0]]), cellAt(grid, waypoint));
  assert.ok(Math.abs(route.distanceMeters - route.legs.reduce((sum, leg) => sum + leg.distanceMeters, 0)) < 0.001);
});

test('diagonal movement cannot cross a missing-data corner', () => {
  const small = { width: 2, height: 2, westCenterLon: 0, northCenterLat: 1,
    degreesPerPixelLon: 0.001, degreesPerPixelLat: 0.001, radiusMeters: 3396190,
    elevationsMeters: [0, null, null, 0] };
  const result = planRoute(small, pointAt(small, 0), pointAt(small, 3), { maxSlopeDeg: 15 });
  assert.match(result.error, /No route/);
});
