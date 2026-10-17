# Test report

Run date: 2026-10-17. Local prototype, no public deployment.

| Test | Expected | Observed | Status |
| --- | --- | --- | --- |
| Static syntax/build | JavaScript parses and `dist/` is generated | `node --check` passed; `node scripts/build.mjs` produced static app | Pass |
| Mars distance | One degree of latitude equals `R × π / 180` with source radius | Automated assertion passed | Pass |
| Raster coordinate alignment | NASA preset points map to finite terrain cells within half-cell distance | Automated assertions passed for landing and Sol 464 location | Pass |
| Shortest vs conservative search | Both obey 5° limit; conservative route is longer and has lower maximum sampled slope | 3.90 km / 4.9° versus 4.83 km / 3.4° in browser; automated assertions passed | Pass |
| Waypoint itinerary | Route must pass through selected cell, join two valid legs, and expose a third card | Automated leg and metric assertions passed; browser displayed a 4.23 km route via a selected waypoint | Pass |
| Blocked diagonal corner | Missing orthogonal cells forbid a diagonal shortcut | Synthetic 2 × 2 grid returned no route | Pass |
| Hypothetical time budget | Route cards and insight change when threshold changes | Browser changed all three cards to “Over budget” at 60 min, with a 47 min excess for the selected route | Pass |
| No route | 0.1° hard limit produces no invalid geometry | Browser showed 0 routes and clear no-path messages; automated assertion passed | Pass |
| Missing or invalid endpoint | Reject identical, out-of-area, or missing-elevation endpoints | Automated assertions passed | Pass |
| Source layer control | Turn on an independent mission layer | Browser HiRISE checkbox changed to enabled; Mars Trek CTX/HiRISE/THEMIS capabilities and sample tiles responded during data research | Pass for checked controls; wider tile coverage not exhaustively tested |
| Source inspector | Identify numeric DEM and limitations | Browser displayed mission, instrument, resolution, coordinate reference, and USGS link | Pass |
| Elevation profile and accessible metrics | Reflect selected route's computed terrain values | Browser showed a labelled CTX DEM profile and a route metrics table with 3.90 km / 4.83 km values | Pass |
| Export | Produce brief from selected route values | Browser export action reported completion; generated Markdown uses route state and source links | Pass for action; downloaded file was not separately parsed in this run |
| Responsive layout | Mission view remains usable at narrower width | Browser screenshot at roughly 996 px showed the map, controls, and all three cards after layout correction; CSS also defines smaller breakpoints | Partial; mobile interaction not fully tested |
| External tile failure | Numeric route remains available | Architecture separates cached grid from live map tiles | Not yet directly simulated in browser |

Automated command: `node --test tests/*.test.mjs` — **7 tests passed, 0 failed**. A full user study, mobile accessibility audit, vertical accuracy validation, and hosted end-to-end test remain open.
