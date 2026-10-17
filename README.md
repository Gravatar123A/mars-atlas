# MARS//ATLAS

An independent Marswalk research prototype that turns NASA/USGS Jezero observations into inspectable route comparisons. It is **not** an official NASA tool or certified human-exploration navigation system.

**Live app:** https://gravatar123a.github.io/mars-atlas/

## What works

- Interactive Jezero map with NASA Mars Trek CTX basemap, global MOLA visual context, HiRISE and THEMIS overlays, layer opacity, coordinate readout, pan, zoom, reset, and scale bar.
- NASA-documented start and destination presets: Octavia E. Butler Landing and Perseverance's Sol 464 location at Hogwallow Flats. Users can select any Mars coordinate for map exploration; route calculations require the measured DEM footprint.
- Real A* graph search over the full **numeric** MRO CTX/USGS 20 m Jezero DEM footprint: 1,596 × 1,512 cells (31.9 × 30.2 km). The graph refuses missing data, edges steeper than the user limit, and diagonal shortcuts across blocked cells.
- Shortest available and terrain-conservative profiles, plus an optional route through a user-selected waypoint. Results include computed distance, ascent, maximum sampled slope, a numeric elevation profile, an accessible metrics table, and an explicitly modelled time estimate.
- A hypothetical one-way time budget that flags each computed route as within or over the threshold.
- Mission overview and named plans saved in browser storage; loading a plan restores points, constraints, and map layers, then recalculates routes.
- Searchable, source-linked collection of three documented Mars 2020 positions, including a Sol 426 delta-area rover position that can be selected as a route waypoint.
- Source inspector, segment explanation, no-route state, and a Markdown mission brief export with actual computed values and source links.

## Run locally

The browser app has no JavaScript package dependencies.

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/`. The checked-in terrain package is `public/data/jezero-grid-meta.json` plus `public/data/jezero-elevation-u16.bin`; the much larger source GeoTIFF is not needed for normal use. The app verifies the binary package SHA-256 before enabling routing.

```powershell
node --test tests/*.test.mjs
node scripts/build.mjs
```

`dist/` is the static deployment artifact. GitHub Pages deploys it automatically from the `master` branch after the tests and build pass. Relative asset paths also allow hosting under the repository subpath.

## Reproduce the terrain grid

The original GeoTIFF is identified in [DATA_SOURCES.md](DATA_SOURCES.md) and `scripts/extract_dem.py`. Download it to `.data-cache/jezero_ctx_dtm_20m.tif`, install Rasterio in a Python environment, and run the script. The script verifies expected dimensions, preserves the entire source raster, rejects missing cells, records the source SHA-256, and writes metadata plus a binary elevation package. No reprojection, interpolation, or synthetic elevation is used. Elevations are transport-quantized to 0.02 m; the measured maximum quantization error is 0.01 m.

## Project structure

- `src/main.js` — mission workspace, map layers, evidence cards, interaction, and export.
- `src/terrain.js` — Mars distances, grid coordinates, A* search, slope limits, and route metrics.
- `src/style.css` — responsive interface.
- `public/data/jezero-grid-meta.json` — source metadata, geometry, processing record, and checksums.
- `public/data/jezero-elevation-u16.bin` — numeric full-footprint elevation package.
- `scripts/extract_dem.py` — reproducible source packaging.
- `tests/terrain.test.mjs` — geospatial and route checks.

## Documentation

- [DATA_SOURCES.md](DATA_SOURCES.md) — actual products and provenance.
- [SCIENTIFIC_METHOD.md](SCIENTIFIC_METHOD.md) — coordinate, slope, and routing method.
- [TEST_REPORT.md](TEST_REPORT.md) — tests performed and outcomes.
- [LIMITATIONS.md](LIMITATIONS.md) — scientific and product limits.
- [CHALLENGE_COMPLIANCE.md](CHALLENGE_COMPLIANCE.md) — provisional summary mapping; final official statement is pending publication.
- [PRESENTATION.md](PRESENTATION.md) — short demonstration script.

## Development status

The app is a functional deployed research prototype. NASA/USGS product-backed terrain, imagery, and cited rover coordinates are separated from computed route outputs and user-set scenario assumptions. It does not contain every Mars dataset, live operational telemetry, or an astronaut-certifiable hazard model. Team contributions: implementation and research in this workspace only; no other contributors are claimed. The waypoint route is a user-directed scenario, not a science score. Future work should prioritize validated outcrop geometry, confidence masks, better terrain uncertainty estimates, and an evidence-grounded science objective before 3D or AI features.
