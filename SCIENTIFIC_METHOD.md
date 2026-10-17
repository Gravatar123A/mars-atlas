# Scientific method and route model

## Coordinate system

The selected [USGS CTX DEM label](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0_pds3.lbl) specifies equirectangular projection, planetocentric latitude, east-positive longitude, and a spherical radius of **3,396,190 m**. The browser grid preserves its 20 m native cell spacing, with row increasing south and column increasing east. Map tiles are placed in a global equirectangular 2:1 grid; source imagery is kept separate from numeric terrain. The map shows east-positive coordinates.

Pixel centers are converted from the source GeoTIFF's 20 m affine transform to longitude and latitude with `longitude = x / R` and `latitude = y / R` in radians, using the source's zero standard parallel. The extraction script records the top-left pixel center and angular pixel increments. `cellAt()` rounds an input coordinate to the nearest sampled cell and rejects out-of-bounds points. The point-to-cell offset is at most roughly half a cell along each axis.

## Distance, elevation, and slope

`distanceMeters()` uses the haversine formula and the same 3,396,190 m source sphere. Graph edge horizontal lengths are derived from angular cell spacing, with the east-west term scaled by the cosine of the starting latitude. Over this small study area, the approximation differs negligibly from recomputing the cosine at every edge; route summary distance is accumulated with the haversine formula for each path segment.

Every raster value is a numeric elevation from the CTX DEM. The browser receives a crop with values rounded to 0.01 m; it does **not** infer elevation from color imagery. The extraction rejects any crop with missing cells. Browser graph search separately refuses non-finite cells. Positive height changes contribute to cumulative ascent, negative changes to descent. Edge slope is `atan(abs(height change) / horizontal edge length)` in degrees. These are cell-to-cell estimates, not local rock-scale measurements.

## Routing

The graph has eight possible neighbors per valid 20 m cell. An edge is forbidden when its derived slope exceeds the user-selected hard limit. A diagonal edge is also forbidden when either adjacent orthogonal cell is missing or the step into it exceeds the limit; this prevents cutting across blocked corners. A* search uses straight-line Mars distance as a lower-bound heuristic and returns no path when the destination is unreachable.

- **Shortest available:** edge cost is horizontal length.
- **Terrain conservative:** edge cost is `horizontal length × [1 + 8 × (edge slope / slope limit)²]`.
- **Via waypoint:** two shortest valid legs are joined at one user-selected intermediate cell. Leg distances, ascent, descent, and travel times are summed. This route has no inferred science score.

All profiles obey the same hard slope limit. The conservative profile can be longer because it penalizes steeper measured edges. At the default 5° limit between the NASA-documented presets, the currently cropped DEM yields about 3.90 km with 4.9° maximum sampled slope for shortest and 4.83 km with 3.4° for terrain conservative. These are calculations for this raster and model, not validated traverses.

The time estimate is `distance / assumed walking speed`; default speed is 0.75 m/s. A user-adjustable one-way time budget compares directly against that estimate. Both are scenario assumptions. They exclude stops, sampling, suit limits, energy, visibility, weather, communications, and return travel.

## Validation and uncertainty

Automated checks cover the Mars radius, coordinate round-trip, path constraints, changed route weights, no-route behavior, and missing/invalid endpoints. Browser checks cover the visible route response at 5° and 0.1°, layer interaction, evidence inspection, and export. See [TEST_REPORT.md](TEST_REPORT.md).

Source resolution and the precision of displayed coordinates are different concepts. Five decimal places locate a selected grid cell or cited point; they do not imply terrain accuracy to that precision. The numerical DEM may contain stereo processing errors or vertical uncertainties not quantified in this prototype. A different, more detailed HiRISE DTM uses a different reference radius; it was deliberately not blended into these route calculations. See [LIMITATIONS.md](LIMITATIONS.md).
