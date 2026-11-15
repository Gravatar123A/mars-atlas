# MARS//ATLAS

An independent Marswalk research prototype that turns planetary observations into inspectable route comparisons. It is **not** an official NASA tool or certified human-exploration navigation system.

**Live site:** https://space-apps-nasa-1.vercel.app/  
**Workspace:** https://space-apps-nasa-1.vercel.app/app/  
**Guide and PowerPoint:** https://space-apps-nasa-1.vercel.app/guide/  
**Complete source register:** https://space-apps-nasa-1.vercel.app/resources/

## What works

- Region selector for Jezero, Gale, and Gusev. Jezero has landing and regional route DEMs; Gale has a 6 × 6 km landing-area route DEM; Gusev currently has cited orbital imagery and the Spirit landing position, with route and 3D controls disabled because no numeric DEM is packaged there.
- Region links can be shared with `?region=jezero`, `?region=gale`, or `?region=gusev`. Gusev presents a map study with distance measurement and hides route forms that lack numerical terrain support.
- Gale routes use measured cells sampled every 20 m from the USGS 1 m Gale merged mosaic. Bradbury Landing is a NASA-published coordinate; the nearby east study point is an explicitly labelled scenario coordinate. The merged source includes MRO HiRISE/CTX, Mars Express HRSC, and MOLA gap coverage, so source detail and uncertainty vary.
- Interactive Jezero map with NASA Mars Trek CTX basemap, global MOLA visual context, HiRISE and THEMIS overlays, layer opacity, coordinate readout, pan, zoom, reset, and scale bar.
- Large interactive 3D elevation view with left-button drag orbit, zoom, route overlays, and a labelled 6× vertical exaggeration. Switch between the 20 m landing-area DEM (320 m visual mesh) and a broader USGS/JPL Jezero CTX DEM (89 × 101 km; 80 m transport samples and about 1 km visual mesh). The 2D region-fit control shows the broader overview.
- NASA-documented start and destination presets: Octavia E. Butler Landing and Perseverance's Sol 464 location at Hogwallow Flats. Users can select any Mars coordinate for map exploration; route calculations require the measured DEM footprint.
- Real A* graph search over verified **numeric** MRO CTX/USGS elevation: 20 m cells in the 31.9 × 30.2 km landing footprint, or 80 m sampled cells in the 89 × 101 km Jezero region when stops extend beyond the landing grid. The search runs in a worker so the interface remains responsive. It refuses missing data, edges steeper than the user limit, and diagonal shortcuts across blocked cells. The selected route can be colored by slope relative to that limit.
- Shortest available and terrain-conservative profiles, plus an optional route through a user-selected waypoint. Results include computed distance, ascent, maximum sampled slope, a numeric elevation profile, an accessible metrics table, and an explicitly modelled time estimate.
- A hypothetical one-way time budget that flags each computed route as within or over the threshold.
- Mission overview and named plans saved in browser storage; loading a plan restores points, constraints, and map layers, then recalculates routes.
- Searchable, source-linked collection of three documented Mars 2020 positions, including a Sol 426 delta-area rover position that can be selected as a route waypoint.
- Source inspector, segment explanation, no-route state, and a Markdown mission brief export with actual computed values and source links.
- 2D point inspector with measured DEM elevation, cell spacing, nearest-sample offset, and explicit no-data results. Two-point measurement reports Mars great-circle distance and only compares endpoint elevations when both came from the same DEM product.

## Run locally

The browser app runs as static HTML and JavaScript. The build uses local Lucide icon assets; development screenshots use Puppeteer Core.

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/` for the landing page and `http://localhost:4173/app/` for the workspace. The checked-in route terrain packages are the Jezero landing and regional metadata/binaries plus `public/data/gale-landing-meta.json` and `public/data/gale-landing-u16.bin`. Source GeoTIFFs are not needed for normal use. The app verifies each binary package SHA-256 before using it.

```powershell
node --test tests/*.test.mjs
npm run build
```

`dist/` is the static deployment artifact. GitHub Pages deploys it automatically from the `master` branch after the tests and build pass. Relative asset paths also allow hosting under the repository subpath.

## Reproduce the terrain grid

The original GeoTIFF is identified in [DATA_SOURCES.md](DATA_SOURCES.md) and `scripts/extract_dem.py`. Download it to `.data-cache/jezero_ctx_dtm_20m.tif`, install Rasterio in a Python environment, and run the script. The script verifies expected dimensions, preserves the entire source raster, rejects missing cells, records the source SHA-256, and writes metadata plus a binary elevation package. No reprojection, interpolation, or synthetic elevation is used. Elevations are transport-quantized to 0.02 m; the measured maximum quantization error is 0.01 m.

For the broader view, download the second GeoTIFF linked in [DATA_SOURCES.md](DATA_SOURCES.md) to `.data-cache/jezero_science_ctx_20m.tif` and run `python scripts/extract_regional_dem.py`. It preserves source no-data cells and selects every fourth source pixel without interpolation. The regional package supports exploratory route screening and visualization at 80 m sample spacing; the source projection's 18.4663° standard parallel is applied to its coordinates.

For Gale, run `python scripts/extract_gale_dem.py`. The script reads byte ranges from the public USGS source GeoTIFF through verified TLS, checks the source object size and projection, selects one native mosaic pixel every 20 m without interpolation, and records the source object ETag and packaged binary SHA-256. The ETag is an object identity marker, not a whole-file SHA-256 checksum. The 1 m raster pixel size does not imply uniform 1 m upstream sensor detail.

## Project structure

- `src/main.js` — mission workspace, map layers, evidence cards, interaction, and export.
- `src/route-worker.js` — background route calculation for both DEM footprints.
- `src/terrain.js` — Mars distances, grid coordinates, A* search, slope limits, and route metrics.
- `src/style.css` — responsive interface.
- `src/refinement.css` — current visual system and icon sizing.
- `index.html` — landing page.
- `app/index.html` — research workspace.
- `guide/` — annotated web guide and downloadable PowerPoint.
- `resources/catalog.json` — complete data and tool register rendered by the source page.
- `public/data/jezero-grid-meta.json` — source metadata, geometry, processing record, and checksums.
- `public/data/jezero-elevation-u16.bin` — numeric full-footprint elevation package.
- `public/data/jezero-regional-meta.json` and `jezero-regional-u16.bin` — broader Jezero context terrain and checksums.
- `public/data/gale-landing-meta.json` and `gale-landing-u16.bin` — Gale landing-area measured terrain and provenance.
- `scripts/extract_dem.py` — reproducible source packaging.
- `scripts/extract_regional_dem.py` — reproducible regional packaging.
- `scripts/extract_gale_dem.py` — reproducible Gale packaging.
- `tests/terrain.test.mjs` — geospatial and route checks.

## Documentation

- [DATA_SOURCES.md](DATA_SOURCES.md) — actual products and provenance.
- [SCIENTIFIC_METHOD.md](SCIENTIFIC_METHOD.md) — coordinate, slope, and routing method.
- [TEST_REPORT.md](TEST_REPORT.md) — tests performed and outcomes.
- [LIMITATIONS.md](LIMITATIONS.md) — scientific and product limits.
- [CHALLENGE_COMPLIANCE.md](CHALLENGE_COMPLIANCE.md) — mapping against the released 2026 official challenge statement.
- [PRESENTATION.md](PRESENTATION.md) — short demonstration script.
- [SUBMISSION_FIELDS.md](SUBMISSION_FIELDS.md) — copy-ready project details, SI disclosure, and all NASA/other link entries.

## License and attribution

Original application code and authored documentation are released under the [MIT License](LICENSE). External terrain products, imagery, Lucide icons, and fonts retain their own terms and are credited in the [source register](resources/catalog.json). OpenAI Codex assisted with code, text, and presentation production; the disclosure appears in `package.json`, the source page, and [SUBMISSION_FIELDS.md](SUBMISSION_FIELDS.md). The project does not imply NASA, USGS, or ESA endorsement.

## Development status

The app is a functional deployed research prototype. Published terrain, imagery, and cited rover coordinates are separated from computed route outputs and user-set scenario assumptions. It does not contain every Mars dataset, live operational telemetry, or an astronaut-certifiable hazard model. Team contributions: implementation and research in this workspace only; no other contributors are claimed. The waypoint route is a user-directed scenario, not a science score. Future work should prioritize validated outcrop geometry, confidence masks, better terrain uncertainty estimates, and an evidence-grounded science objective.
