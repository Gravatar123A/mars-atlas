# MARS//ATLAS

An independent Marswalk research prototype that turns NASA/USGS Jezero observations into inspectable route comparisons. It is **not** an official NASA tool or certified human-exploration navigation system.

## What works

- Interactive Jezero map with NASA Mars Trek CTX basemap, MOLA basemap option, HiRISE and THEMIS overlays, layer opacity, coordinate readout, pan, zoom, reset, and scale bar.
- NASA-documented start and destination presets: Octavia E. Butler Landing and Perseverance's Sol 464 location at Hogwallow Flats. Users can also select points on the map or enter coordinates within measured coverage.
- Real A* graph search over a cropped **numeric** MRO CTX/USGS 20 m DEM. The graph refuses missing data, edges steeper than the user limit, and diagonal shortcuts across blocked cells.
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

Open `http://localhost:4173/`. The checked-in `public/data/jezero-grid.json` is the compact research grid; the much larger source GeoTIFF is not needed for normal use.

```powershell
node --test tests/*.test.mjs
node scripts/build.mjs
```

`dist/` is the static deployment artifact. Serve it with a static host. No public deployment has been made yet.

## Reproduce the terrain grid

The original GeoTIFF is identified in [DATA_SOURCES.md](DATA_SOURCES.md) and `scripts/extract_dem.py`. Download it to `.data-cache/jezero_ctx_dtm_20m.tif`, install Rasterio in a Python environment, and run the script. The script verifies expected dimensions, crops the study area, rejects missing values, and writes the compact JSON grid. No interpolation or synthetic elevation is used.

## Project structure

- `src/main.js` — mission workspace, map layers, evidence cards, interaction, and export.
- `src/terrain.js` — Mars distances, grid coordinates, A* search, slope limits, and route metrics.
- `src/style.css` — responsive interface.
- `public/data/jezero-grid.json` — numeric study-area terrain with source metadata.
- `scripts/extract_dem.py` — reproducible source crop.
- `tests/terrain.test.mjs` — geospatial and route checks.

## Documentation

- [DATA_SOURCES.md](DATA_SOURCES.md) — actual products and provenance.
- [SCIENTIFIC_METHOD.md](SCIENTIFIC_METHOD.md) — coordinate, slope, and routing method.
- [TEST_REPORT.md](TEST_REPORT.md) — tests performed and outcomes.
- [LIMITATIONS.md](LIMITATIONS.md) — scientific and product limits.
- [CHALLENGE_COMPLIANCE.md](CHALLENGE_COMPLIANCE.md) — provisional summary mapping; final official statement is pending publication.
- [PRESENTATION.md](PRESENTATION.md) — short demonstration script.

## Development status

The app is a functional local research prototype. It still needs broader usability review, a hosted deployment, and reconciliation with the final 2026 Space Apps challenge statement when released. Team contributions: implementation and research in this workspace only; no other contributors are claimed. The waypoint route is a user-directed scenario, not a science score. Future work should prioritize validated outcrop geometry, confidence masks, better terrain uncertainty estimates, and an evidence-grounded science objective before 3D or AI features.
