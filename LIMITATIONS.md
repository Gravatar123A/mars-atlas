# Limits and unknowns

MARS//ATLAS is an independent research and educational prototype. It is **not** an official NASA operational tool, an EVA planner, or a certified navigation system.

- **Terrain scale:** The current route graph is based on 20 m CTX DEM cells. It cannot resolve rocks, sand ripples, weak soil, cliff edges within cells, or other small-scale hazards. The slope threshold is a scenario control, not a validated astronaut safety threshold.
- **Study area:** Routing only works within the included Jezero crop. The border shown on the map indicates numeric terrain coverage. The Mars Trek imagery may extend beyond it; imagery coverage does not extend routing coverage.
- **Vertical uncertainty:** The DEM product name describes MOLA topography and a delta geoid adjustment, but this prototype has not independently quantified absolute vertical accuracy or stereo-model uncertainty. Elevation and route metrics are therefore exploratory.
- **Path model:** Eight-neighbor A* prevents blocked diagonal corners but does not account for turning radius, exact traverseable surfaces, line-of-sight, obstacles smaller than 20 m, or field-verified navigation. It cannot certify any route.
- **Mission operations:** Time is a simple distance/speed calculation. The budget is a hypothetical one-way threshold, not an EVA allowance. The app has no suit, life-support, radiation, communications, daylight, thermal, return-to-base, or scientific sampling duration model. It displays no live Mars weather.
- **Scientific sites:** The landing, Sol 426, and Sol 464 coordinates are cited historical locations. They are not outcrop boundaries or EVA destinations certified by NASA. Arbitrary user-selected points are model inputs, not verified scientific targets. The Jezero delta description is regional science context.
- **Map service:** Visual layers are live NASA Mars Trek WMTS requests and can fail, load slowly, or have gaps. Numeric routing uses the checked-in source-derived grid and remains available if those tiles fail.
- **Saved plans:** Plans are stored only in the current browser's local storage. They are not synced, shared, or backed up. Routes are recalculated when a plan is loaded.
- **Data provenance:** The source registry identifies products and limits, but the individual stereo acquisition times, detailed error budget, exact redistribution conditions, and full release history require further review.
- **Competition status:** The final 2026 challenge statement and resources were not published as of the October 17 research check. The current app cannot yet claim final challenge compliance. A hosted prototype is live; the competition submission has not been made.

The next scientific improvements should verify the DEM's vertical datum and uncertainty, add a confidence mask, align a higher-resolution DTM for selected local areas, and compare route predictions to independent terrain measurements. The next product improvements should add documented science-site geometry and broader mobile usability checks.
