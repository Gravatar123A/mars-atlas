import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cellAt, decodeTerrain, distanceMeters, planRoute, planRouteVia, pointAt } from '../src/terrain.js';

const metadata = JSON.parse(readFileSync(new URL('../public/data/jezero-grid-meta.json', import.meta.url)));
const encoded = readFileSync(new URL('../public/data/jezero-elevation-u16.bin', import.meta.url));
const grid = decodeTerrain(metadata, encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength));
const landing = { lat: 18.44463, lon: 77.45088 };
const hogwallow = { lat: 18.44272865, lon: 77.38228798 };
const sol426 = { lat: 18.42416332, lon: 77.42524624 };
const regionalMetadata = JSON.parse(readFileSync(new URL('../public/data/jezero-regional-meta.json', import.meta.url)));
const regionalEncoded = readFileSync(new URL('../public/data/jezero-regional-u16.bin', import.meta.url));

test('terrain metadata preserves the verified NASA/USGS source identity', () => {
  assert.equal(metadata.sourceId, 'JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0');
  assert.equal(metadata.sourceSha256, '16a1aa66c3f48c1bca252795827db7b417876217aff0f5e1aff18027fab2327b');
  assert.equal(metadata.width, 1596);
  assert.equal(metadata.height, 1512);
  assert.equal(metadata.resolutionMeters, 20);
  assert.equal(metadata.radiusMeters, 3396190);
  assert.equal(metadata.validCells, metadata.width * metadata.height);
  assert.equal(createHash('sha256').update(encoded).digest('hex'), metadata.elevationSha256);
});

test('Mars distance uses the source radius', () => {
  const expected = grid.radiusMeters * Math.PI / 180;
  assert.ok(Math.abs(distanceMeters({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }, grid.radiusMeters) - expected) < 1e-6);
});

test('broader measured Jezero DEM is verified and includes the landing area', () => {
  assert.equal(regionalMetadata.sourceId, 'M20_JezeroCrater_CTXDEM_20m');
  assert.equal(regionalMetadata.sourceSha256, 'ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2');
  assert.equal(regionalMetadata.sourceResolutionMeters, 20);
  assert.equal(regionalMetadata.resolutionMeters, 80);
  assert.ok(regionalMetadata.width * regionalMetadata.resolutionMeters > 89000);
  assert.ok(regionalMetadata.height * regionalMetadata.resolutionMeters > 101000);
  assert.equal(createHash('sha256').update(regionalEncoded).digest('hex'), regionalMetadata.elevationSha256);
  const regional = decodeTerrain(regionalMetadata, regionalEncoded.buffer.slice(regionalEncoded.byteOffset, regionalEncoded.byteOffset + regionalEncoded.byteLength));
  for (const point of [landing, hogwallow, sol426]) {
    const index = cellAt(regional, point);
    assert.notEqual(index, null);
    assert.ok(Number.isFinite(regional.elevationsMeters[index]));
    assert.ok(distanceMeters(point, pointAt(regional, index), regional.radiusMeters) < 65);
  }
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
  const copy = { ...grid, elevationsMeters: grid.elevationsMeters.slice() };
  copy.elevationsMeters[cellAt(copy, landing)] = NaN;
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
