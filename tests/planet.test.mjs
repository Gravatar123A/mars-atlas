import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const data = path.join(process.cwd(), 'public', 'data');
const provenance = JSON.parse(await readFile(path.join(data, 'planet-provenance.json'), 'utf8'));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

test('global MOLA texture matches the recorded tile composite checksum', async () => {
  const image = await readFile(path.join(data, 'mola-global-z2.jpg'));
  assert.equal(hash(image), provenance.molaTextureSha256);
  assert.equal(Object.keys(provenance.molaTileSha256).length, 32);
  assert.match(provenance.molaTileTemplate, /^https:\/\/trek\.nasa\.gov\//);
});

for (const rover of ['perseverance', 'curiosity']) {
  test(`${rover} display traverse retains valid NASA coordinates and checksum`, async () => {
    const bytes = await readFile(path.join(data, `${rover}-traverse-display.json`));
    const record = JSON.parse(bytes.toString('utf8'));
    assert.equal(hash(bytes), provenance.traverses[rover].displaySha256);
    assert.match(record.source, /^https:\/\/mars\.nasa\.gov\/mmgis-maps\//);
    assert.ok(record.sourcePointCount > record.displayPointCount);
    assert.equal(record.paths.reduce((count, line) => count + line.length, 0), record.displayPointCount);
    for (const line of record.paths) for (const [lon, lat] of line) {
      assert.ok(Number.isFinite(lon) && lon >= -180 && lon <= 180);
      assert.ok(Number.isFinite(lat) && lat >= -90 && lat <= 90);
    }
  });
}
