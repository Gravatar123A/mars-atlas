# Test report

Run date: 2026-10-17. Local and live GitHub Pages prototype.

| Test | Expected | Observed | Status |
| --- | --- | --- | --- |
| Static syntax/build | JavaScript parses and `dist/` is generated | `node --check` passed; `node scripts/build.mjs` produced static app | Pass |
| Mars distance | One degree of latitude equals `R × π / 180` with source radius | Automated assertion passed | Pass |
| Raster coordinate alignment | NASA preset points map to finite terrain cells within half-cell distance | Automated assertions passed for landing and Sol 464 location | Pass |
| Source-file verification | Downloaded raster matches recorded NASA/USGS source identity | Local SHA-256 of the 9,662,387-byte GeoTIFF matched `16a1aa66c3f48c1bca252795827db7b417876217aff0f5e1aff18027fab2327b`; PDS label confirmed 1,596 × 1,512 cells, 20 m scale, east-positive planetocentric projection, and 3,396.19 km radius | Pass |
| Terrain package integrity | Browser only routes on the checked packaged terrain data | Runtime SHA-256 check of `jezero-elevation-u16.bin` must match metadata before decoding; automated decoder checks passed | Pass |
| Shortest vs conservative search | Both obey 5° limit; conservative route is longer and has lower maximum sampled slope | 3.92 km / 4.9° versus 4.83 km / 3.4° in browser; automated assertions passed | Pass |
| Waypoint itinerary | Route must pass through selected cell, join two valid legs, and expose a third card | Automated leg and metric assertions passed; browser displayed a 4.23 km route via a selected waypoint | Pass |
| Blocked diagonal corner | Missing orthogonal cells forbid a diagonal shortcut | Synthetic 2 × 2 grid returned no route | Pass |
| Hypothetical time budget | Route cards and insight change when threshold changes | Browser changed all three cards to “Over budget” at 60 min, with a 47 min excess for the selected route | Pass |
| Saved plan restore | Name, constraints, and route status survive a reload | Saved a 60 min plan, reloaded, restored it, and saw recalculated over-budget routes; temporary test plan removed | Pass |
| Cited site search and waypoint | Search a documented site and route through its point | Browser filtered to the NASA-sourced Sol 426 rover position and computed a 4.97 km route through it at the default slope setting | Pass |
| No route | 0.1° hard limit produces no invalid geometry | Browser showed 0 routes and clear no-path messages; automated assertion passed | Pass |
| Missing or invalid endpoint | Reject identical, out-of-area, or missing-elevation endpoints | Automated assertions passed | Pass |
| Source layer control | Turn on an independent mission layer | Browser HiRISE checkbox changed to enabled; Mars Trek CTX/HiRISE/THEMIS capabilities and sample tiles responded during data research | Pass for checked controls; wider tile coverage not exhaustively tested |
| Source inspector | Identify numeric DEM and limitations | Browser displayed mission, instrument, resolution, coordinate reference, and USGS link | Pass |
| Elevation profile and accessible metrics | Reflect selected route's computed terrain values | Browser showed a labelled CTX DEM profile and a route metrics table with 3.92 km / 4.83 km values | Pass |
| Export | Produce brief from selected route values | Browser export action reported completion; generated Markdown uses route state and source links | Pass for action; downloaded file was not separately parsed in this run |
| Responsive layout | Mission view remains usable at narrower width | Browser screenshot at roughly 996 px showed the map, controls, and all three cards after layout correction; CSS also defines smaller breakpoints | Partial; mobile interaction not fully tested |
| External tile failure | Numeric route remains available | Architecture separates cached grid from live map tiles | Not yet directly simulated in browser |
| Expanded-footprint selection | User can select coordinates throughout the full source DEM and see outside-coverage status clearly | Local browser fit the 31.9 × 30.2 km footprint and calculated a route beyond the prior crop; outside-footprint selections remained explorable but routing returned a no-coverage error | Pass |
| 3D terrain view | Render the verified CTX elevation surface with an orbitable camera and clear visual sampling disclosure | Local browser rendered the source DEM as a 320 m sampled mesh, labeled 6× vertical scale and elevation tint, and showed the 3.92 km / 4.83 km route overlays | Pass |
| 3D navigation | Orbit and zoom the surface, then focus a cited site on the 2D map | Browser drag changed terrain orientation; the Sol 426 “View map” action switched to 2D and centered the cited coordinates | Pass |
| Larger map workspace | Map occupies the primary canvas and evidence remains accessible | Local browser at 1280 × 720 showed a roughly 970 × 590 px map; evidence drawer opened and closed with its labelled control | Pass |
| Drag-only orbit | Orbit requires a held primary pointer button and ends on release/cancel | `pointerdown` now ignores other mouse buttons; `pointermove` checks the left-button bit; release, cancel, and capture loss clear orbit state | Code checked; browser drag tested |
| Broader Jezero coverage | Add a source-verified regional DEM without changing route metrics | USGS/JPL 20 m CTX source measured 4,456 × 5,067 cells (89.1 × 101.4 km); SHA-256 checked; 1,410,324 valid 80 m samples packaged; browser switched to regional 3D and a 2D MOLA overview | Pass |
| Hosted deployment | Built app resolves assets under `/mars-atlas/` and computes routes | GitHub Pages workflow 39052249247 passed. Live browser verified the 31.9 × 30.2 km terrain package, checksum gate, source-hash display, and default 3.92 km / 4.83 km route profiles. | Pass |

Automated command: `node --test tests/*.test.mjs` — **9 tests passed, 0 failed**. `node --check src/main.js`, `npm run build`, and `git diff --check` also passed on 2026-10-17. A full user study, mobile accessibility audit, and vertical accuracy validation remain open.
