# MARS//ATLAS — event implementation plan

Prepared 2026-10-17 and updated after the user directed immediate development. The app now has a functional local prototype; this plan is a tracking aid, not evidence that every planned feature is complete.

## Release gate

The user has explicitly directed development before the November event, and implementation is underway. The [published Space Apps 2026 guidance](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) says teams must develop the competition solution during the hackathon; confirm eligibility before submitting any pre-event code. On October 28, retrieve the final challenge statement and resources, then revise `CHALLENGE_COMPLIANCE.md` against those authoritative materials. Do not claim final compliance before that review.

## Smallest credible product

One Jezero study area, one verified science objective within numerical terrain coverage, one genuine Mars basemap, a second mission layer, and two graph-computed route profiles. Every route displays distance, terrain-derived measures, constraints, source IDs, and reasons for preference. If terrain coverage fails, the interface reports no valid route. A mission brief exports the actual selected result and its limitations.

## Architecture choice

- **Client:** TypeScript and React with a map library that supports custom raster WMTS tile grids and geographic overlays. Keep the UI in one responsive mission-planning workspace. Avoid an unnecessary backend until data serving requires it.
- **Data preparation:** GDAL or Rasterio during the event to inspect the [USGS/PDS 20 m CTX DEM mosaic](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic), transform/crop valid cells, preserve its NoData mask, and create a compact numeric grid plus metadata. Record every transform and check corner coordinates against source labels and independent references. Consider a 1 m HiRISE DTM only if its smaller valid footprint supports a useful objective.
- **Analysis:** A small, deterministic graph-search module (A* or Dijkstra) over valid terrain cells. Use Mars-specific geometry, explicitly documented slope computation, hard slope limits, and transparent soft costs. Do not silently cross unknown cells. Keep route scoring reproducible.
- **Source registry:** Structured metadata for every displayed layer and derived value, with product identifier, mission, instrument, URL, acquisition/release information, resolution, coverage, coordinate system, processing, and caveats.
- **Persistence/export:** Store only user mission settings and the selected result locally unless the final challenge needs collaboration. Generate a downloadable brief from computed state with references and uncertainty notes.

The exact libraries and deployment host are an implementation choice to confirm after dataset checks. The first technical risk is continuous valid elevation coverage, the second is raster alignment (the CTX and checked HiRISE labels use different Mars radii), and the third is WMTS availability and performance.

## P0 sequence and acceptance

| Order | Feature | Dependency | Proof required |
| --- | --- | --- | --- |
| 1 | Official requirement review and source registry | Final challenge release | Every claimed requirement links to the official statement; candidate datasets have product IDs and limitations. |
| 2 | Numerical study-area validation | USGS/PDS CTX DEM label, valid raster cells | Footprint, datum, resolution, NoData, and co-registration checked; select two reachable points and a sourced science objective. |
| 3 | Mars map with two mission layers | Working WMTS/cached access | Render real imagery, toggle layers and opacity, inspect coordinates and source metadata. |
| 4 | Point selection and route graph | Valid DTM crop and Mars coordinate transforms | Start/destination map to valid cells; A* returns a valid path and computed distance. |
| 5 | Two route profiles and explanation | Route graph | Shortest and terrain-conservative paths respond to constraints; compare real metrics or explain when alternatives coincide. |
| 6 | Mission overview, uncertainty, and export | Computed route and source registry | Export repeats the displayed values, assumptions, cited products, and unknowns. |
| 7 | Deployment, documentation, and demonstration | Verified end-to-end workflow | A fresh user can complete the map-to-brief workflow on the deployed build. |

## P1 if P0 is stable

Third science-focused strategy with a verified objective, slope slider, route profile chart, richer source inspector, waypoint support, and guided sample mission. Each addition needs an observable behavior and a test of underlying values.

## P2 only if time remains

3D terrain view, historical environmental context, expanded regions, and retrieval-grounded AI explanations. These features must not displace terrain validity, reproducibility, or the live demo.

## Verification and documents during implementation

Test coordinate conventions, pixel/geographic round trips, map scale, distances using a Mars radius consistent with the selected product, slope from known numeric cells, NoData rejection, blocked paths, changed thresholds, and stable route metrics. Then test map controls, keyboard access, export, and an external-service failure. Record actual results in `TEST_REPORT.md`.

Create `README.md`, `DATA_SOURCES.md`, `SCIENTIFIC_METHOD.md`, `CHALLENGE_COMPLIANCE.md`, `TEST_REPORT.md`, `LIMITATIONS.md`, and `PRESENTATION.md` during the event. Include only implemented features, real test results, and verified sources. The three-minute demo should show evidence, compute contrasting routes, change a constraint, explain the change, and export the brief.
