# Scientific method and route model

## Coordinate system

The selected [USGS CTX DEM label](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0_pds3.lbl) specifies equirectangular projection, planetocentric latitude, east-positive longitude, and a spherical radius of **3,396,190 m**. The browser grid preserves its 20 m native cell spacing, with row increasing south and column increasing east. Map tiles are placed in a global equirectangular 2:1 grid; source imagery is kept separate from numeric terrain. The map shows east-positive coordinates.

The planet view draws live [NASA Mars Trek MOLA color-hillshade tiles](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml). For the globe, 32 level-2 tiles are assembled unchanged into a 2048 × 1024 equirectangular JPEG; the exact tile URLs and SHA-256 values are in [planet-provenance.json](public/data/planet-provenance.json). A browser canvas maps that texture onto a sphere with an orthographic projection. Its colors are rendered context, not numerical elevation samples. The globe therefore cannot supply height, slope, or a planet-wide route.

Historical Perseverance and Curiosity paths come from the two public JPL MMGIS GeoJSON feeds listed in [DATA_SOURCES.md](DATA_SOURCES.md). The display files retain source segments but use a 0.000035° line simplification tolerance and round displayed coordinates to six decimals. Source and output hashes, original point counts, and display point counts are in `planet-provenance.json`. Dashed historical paths are drawn separately from the app's solid A* route choices. This processing is visual only; no simplified traverse vertex is used as a route-planning elevation input.

Pixel centers are converted from the source GeoTIFF's 20 m affine transform to longitude and latitude with `longitude = x / R` and `latitude = y / R` in radians, using the source's zero standard parallel. The extraction script records the top-left pixel center and angular pixel increments. `cellAt()` rounds an input coordinate to the nearest sampled cell and rejects out-of-bounds points. The point-to-cell offset is at most roughly half a cell along each axis.

## Distance, elevation, and slope

`distanceMeters()` uses the haversine formula and the same 3,396,190 m source sphere. Graph edge horizontal lengths are derived from angular cell spacing, with the east-west term scaled by the cosine of the starting latitude. Over this small study area, the approximation differs negligibly from recomputing the cosine at every edge; route summary distance is accumulated with the haversine formula for each path segment.

Every raster value is a numeric elevation from the full CTX DEM. The browser receives all 1,596 × 1,512 source cells, transport-quantized to a 0.02 m step with a measured maximum error of 0.01 m; it does **not** infer elevation from color imagery. The extraction rejects a source raster with missing cells, records the source SHA-256, and the browser verifies the packaged binary SHA-256 before decoding it. Browser graph search separately refuses non-finite cells. Positive height changes contribute to cumulative ascent, negative changes to descent. Edge slope is `atan(abs(height change) / horizontal edge length)` in degrees. These are cell-to-cell estimates, not local rock-scale measurements.

## Routing

The graph has eight possible neighbors per valid 20 m cell. An edge is forbidden when its derived slope exceeds the user-selected hard limit. A diagonal edge is also forbidden when either adjacent orthogonal cell is missing or the step into it exceeds the limit; this prevents cutting across blocked corners. A* search uses straight-line Mars distance as a lower-bound heuristic and returns no path when the destination is unreachable.

- **Shortest available:** edge cost is horizontal length.
- **Terrain conservative:** edge cost is `horizontal length × [1 + 8 × (edge slope / slope limit)²]`.
- **Via waypoint:** two shortest valid legs are joined at one user-selected intermediate cell. Leg distances, ascent, descent, and travel times are summed. This route has no inferred science score.

All profiles obey the same hard slope limit. The conservative profile can be longer because it penalizes steeper measured edges. At the default 5° limit between the NASA-documented presets, the full DEM yields about 3.92 km with 4.9° maximum sampled slope for shortest and 4.83 km with 3.4° for terrain conservative. These are reproducible calculations from source elevations and the stated model, not validated traverses.

The time estimate is `distance / assumed walking speed`; default speed is 0.75 m/s. A user-adjustable one-way time budget compares directly against that estimate. Both are scenario assumptions. They exclude stops, sampling, suit limits, energy, visibility, weather, communications, and return travel.

## Three-dimensional view

The landing-area 3D surface uses the same checksum-verified CTX DEM as routing. For interactive rendering, it samples the source grid at 320 m intervals and draws triangles between those samples. The separate regional 3D surface uses the USGS/JPL Jezero science-investigation CTX DEM, which covers about 89 × 101 km. Its source is 20 m; every fourth source pixel is packaged as an 80 m context grid, and the visual mesh samples that package at about 1 km intervals. No source no-data values are filled. The regional raster uses an 18.4663° standard parallel; longitude conversion accounts for that cosine factor. Each packaged file has a verified SHA-256 before rendering.

Height is intentionally displayed at **6×** its physical scale. The terrain colors are a designed elevation tint, not orbital photography or mineral data. The 3D route line uses the selected route's computed DEM coordinates and elevations. Route distance, ascent, and slope calculations use the 20 m landing grid when every stop is covered there; otherwise they use the 80 m sampled regional grid when every stop is covered there. The app does not merge grids into a mixed-resolution route. Regional route metrics are less detailed and cannot resolve hazards between samples.

The optional 2D gradient colors each computed route edge by its slope as a fraction of the user's model limit: lower third, middle third, or upper third. These bands are relative visual cues, not NASA safety classes. The route engine runs in a browser worker so larger regional searches do not block map controls.

## Point inspection and two-point measurement

The 2D inspector converts a clicked Mars coordinate to the nearest cell in the 20 m route DEM. Outside that footprint it checks the separate 80 m sampled regional DEM. It reports the stored elevation, source product, grid spacing, and horizontal offset to the sampled cell center. A point without a finite DEM cell is reported as unknown; imagery color is never used as an elevation substitute. These are source elevation values, with absolute vertical uncertainty not independently validated by this prototype.

The measurement tool uses the source Mars radius of 3,396,190 m in the haversine formula for the horizontal great-circle distance between two user-selected coordinates. This is a direct distance, not a route length or a terrain profile. It reports an endpoint elevation difference only when both samples come from the same DEM product. It does not infer slope or hazards between the endpoints.

## Validation and uncertainty

### Gale and Gusev region handling

The Gale landing-area package comes from the [USGS merged Gale DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m). Its source GeoTIFF has 1 m pixels, but combines HiRISE and CTX observations with Mars Express HRSC and MOLA gap coverage. `scripts/extract_gale_dem.py` checks its geometry and source object identity, then selects one source mosaic pixel every 20 m in a 6 km square around Bradbury Landing. It does not interpolate between samples. The packaged elevations have a 0.05 m transport step (at most 0.025 m quantization); this is **not** a statement of source vertical accuracy. Routing uses exactly the same A* graph, slope formula, Mars radius, and browser checksum gate as Jezero. The default east destination is a user-defined study point.

Gusev is a map and distance study. Mars Trek CTX, HiRISE, THEMIS, and MOLA layers are visual context, and the Spirit landing point is a NASA-published coordinate. No numerical Gusev DEM is packaged; therefore the app does not return elevation, slope, a route, or a 3D height surface there. Two-point distance uses the stated Mars sphere and is a direct great-circle distance only.

Automated checks cover the Mars radius, coordinate round-trip, path constraints, changed route weights, no-route behavior, and missing/invalid endpoints. Browser checks cover the visible route response at 5° and 0.1°, layer interaction, evidence inspection, and export. See [TEST_REPORT.md](TEST_REPORT.md).

Source resolution and the precision of displayed coordinates are different concepts. Five decimal places locate a selected grid cell or cited point; they do not imply terrain accuracy to that precision. The numerical DEM may contain stereo processing errors or vertical uncertainties not quantified in this prototype. A different, more detailed HiRISE DTM uses a different reference radius; it was deliberately not blended into these route calculations. See [LIMITATIONS.md](LIMITATIONS.md).
