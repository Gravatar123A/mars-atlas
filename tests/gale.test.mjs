import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cellAt, decodeTerrain, distanceMeters, planRoute, pointAt } from '../src/terrain.js';

const metadata = JSON.parse(readFileSync(new URL('../public/data/gale-landing-meta.json', import.meta.url)));
const encoded = readFileSync(new URL('../public/data/gale-landing-u16.bin', import.meta.url));
const grid = decodeTerrain(metadata, encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength));
const bradbury = { lat: -4.5895, lon: 137.4417 };
const study = { lat: -4.5895, lon: 137.4490 };

test('Gale route grid has traceable source identity and verified package bytes', () => {
  assert.equal(metadata.sourceId, 'MSL_Gale_DEM_Mosaic_1m_v3');
  assert.equal(metadata.sourceSizeBytes, 3868256546);
  assert.equal(metadata.sourceResolutionMeters, 1);
  assert.equal(metadata.resolutionMeters, 20);
  assert.equal(metadata.width, 301);
  assert.equal(metadata.height, 301);
  assert.equal(metadata.validCells, 90601);
  assert.equal(createHash('sha256').update(encoded).digest('hex'), metadata.elevationSha256);
  assert.ok(metadata.sourceETag);
});

test('published Bradbury coordinate falls in measured Gale cells', () => {
  const index = cellAt(grid, bradbury);
  assert.notEqual(index, null);
  assert.ok(Number.isFinite(grid.elevationsMeters[index]));
  assert.ok(distanceMeters(bradbury, pointAt(grid, index), grid.radiusMeters) < 15);
});

test('Gale scenario produces a route under the displayed default slope limit', () => {
  const route = planRoute(grid, bradbury, study, { maxSlopeDeg: 5, speedMetersPerSecond: .75 });
  assert.ok(route.points?.length > 1, route.error);
  assert.ok(route.maxSlopeDeg <= 5);
  assert.ok(route.distanceMeters > 400 && route.distanceMeters < 800);
  assert.equal(route.model.gridResolutionMeters, 20);
});
