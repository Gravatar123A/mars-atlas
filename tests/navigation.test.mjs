import test from 'node:test';
import assert from 'node:assert/strict';
import { bearingDegrees, buildRouteGuide, compassDirection, turnDirection } from '../src/navigation.js';
import { GRID_RADIUS_M, distanceMeters } from '../src/terrain.js';

test('bearings and left or right turns use north as zero', () => {
  const origin = { lat: 0, lon: 0 };
  assert.ok(Math.abs(bearingDegrees(origin, { lat: 1, lon: 0 })) < 0.01);
  assert.ok(Math.abs(bearingDegrees(origin, { lat: 0, lon: 1 }) - 90) < 0.01);
  assert.equal(compassDirection(270), 'W');
  assert.equal(turnDirection(0, 90), 'Turn right');
  assert.equal(turnDirection(0, 270), 'Turn left');
  assert.equal(turnDirection(355, 5), 'Continue');
});

test('route guide keeps a required waypoint and reports cumulative route distances', () => {
  const points = [
    { lat: 0, lon: 0 },
    { lat: 0.001, lon: 0 },
    { lat: 0.001, lon: 0.001 },
    { lat: 0.002, lon: 0.001 },
  ];
  const segments = points.slice(1).map((point, i) => ({ length: distanceMeters(points[i], point, GRID_RADIUS_M) }));
  const route = { points, segments, waypointIndices: [2], model: { gridResolutionMeters: 20 } };
  const guide = buildRouteGuide(route);
  assert.ok(guide.checkpoints.includes(2));
  assert.equal(guide.steps[0].instruction, 'Start');
  assert.equal(guide.steps[0].compass, 'N');
  assert.ok(guide.steps.some((step) => step.instruction === 'Turn right'));
  assert.ok(guide.steps.some((step) => step.waypoint));
  assert.ok(Math.abs(guide.steps.reduce((sum, step) => sum + step.distanceMeters, 0) - segments.reduce((sum, segment) => sum + segment.length, 0)) < 0.001);
});
