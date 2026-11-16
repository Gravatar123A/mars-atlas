"""Build reproducible display assets from NASA Mars Trek and JPL traverse snapshots.

Download the 32 z=2 MOLA tiles and the two MMGIS JSON feeds into
.work/sources before running. See public/data/planet-provenance.json for URLs.
"""
import hashlib
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.work' / 'sources'
OUTPUT = ROOT / 'public' / 'data'
OUTPUT.mkdir(parents=True, exist_ok=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


texture = Image.new('RGB', (2048, 1024))
tile_hashes = {}
for row in range(4):
    for col in range(8):
        tile = SOURCE / 'mola' / f'{row}-{col}.jpg'
        image = Image.open(tile).convert('RGB')
        if image.size != (256, 256):
            raise ValueError(f'Unexpected MOLA tile dimensions: {tile}')
        texture.paste(image, (col * 256, row * 256))
        tile_hashes[f'{row}/{col}'] = sha(tile)
texture_path = OUTPUT / 'mola-global-z2.jpg'
texture.save(texture_path, quality=89, optimize=True, subsampling=0)


def perpendicular_distance(point, first, last):
    x, y = point[:2]
    x1, y1 = first[:2]
    x2, y2 = last[:2]
    dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return ((x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2) ** 0.5


def simplify(points, tolerance=0.000035):
    if len(points) < 3:
        return points
    selected = [False] * len(points)
    selected[0] = selected[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        furthest, index = 0, None
        for i in range(start + 1, end):
            distance = perpendicular_distance(points[i], points[start], points[end])
            if distance > furthest:
                furthest, index = distance, i
        if index is not None and furthest > tolerance:
            selected[index] = True
            stack.extend(((start, index), (index, end)))
    return [[round(point[0], 6), round(point[1], 6)] for point, keep in zip(points, selected) if keep]


feeds = {
    'perseverance': 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json',
    'curiosity': 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json',
}
summary = {}
for rover, url in feeds.items():
    source = SOURCE / f'{rover}.json'
    collection = json.loads(source.read_text(encoding='utf-8'))
    paths = []
    raw_points = 0
    for feature in collection['features']:
        geometry = feature['geometry']
        lines = [geometry['coordinates']] if geometry['type'] == 'LineString' else geometry['coordinates']
        for line in lines:
            raw_points += len(line)
            if len(line) > 1:
                reduced = simplify(line)
                if len(reduced) > 1 and reduced[0] != reduced[-1]:
                    paths.append(reduced)
    payload = {
        'rover': rover,
        'source': url,
        'sourceSha256': sha(source),
        'sourceFeatureCount': len(collection['features']),
        'sourcePointCount': raw_points,
        'displayPointCount': sum(map(len, paths)),
        'simplificationToleranceDegrees': 0.000035,
        'lastSolInSource': max((f['properties'].get('sol', 0) or 0 for f in collection['features']), default=0) if rover == 'perseverance' else None,
        'paths': paths,
    }
    path = OUTPUT / f'{rover}-traverse-display.json'
    path.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
    summary[rover] = {key: value for key, value in payload.items() if key != 'paths'} | {'displaySha256': sha(path)}

provenance = {
    'description': 'NASA MOLA rendered hillshade and JPL rover traverse display snapshots. Coordinates and rover paths are observed data; globe pixels are a visual product, not a numeric terrain model.',
    'molaLayer': 'Mars_MGS_MOLA_ClrShade_merge_global_463m',
    'molaCatalog': 'https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars',
    'molaTileTemplate': 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/2/{row}/{col}.jpg',
    'molaTextureSha256': sha(texture_path),
    'molaTileSha256': tile_hashes,
    'traverses': summary,
}
(OUTPUT / 'planet-provenance.json').write_text(json.dumps(provenance, indent=2), encoding='utf-8')
print(json.dumps({'texture': texture_path.stat().st_size, 'traverses': summary}, indent=2))
