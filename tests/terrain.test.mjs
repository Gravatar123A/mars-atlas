import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cellAt, distanceMeters, planRoute, pointAt } from '../src/terrain.js';

const grid = JSON.parse(readFileSync(new URL('../public/data/jezero-grid.json', import.meta.url)));
const landing = { lat: 18.44463, lon: 77.45088 };
const hogwallow = { lat: 18.44272865, lon: 77.38228798 };

test('Mars distance uses the source radius', () => {
  const expected = grid.radiusMeters * Math.PI / 180;
  assert.ok(Math.abs(distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }, grid.radiusMeters) - expected) < 1e-6);
});

test('verified points round-trip through source grid', () => {
  for (const point of [landing, hogwallow]) {
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
