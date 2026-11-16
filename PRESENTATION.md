# Three-minute demonstration draft

The current illustrated walkthrough is [Mars-Atlas-Guide-v5.pptx](guide/Mars-Atlas-Guide-v5.pptx), with the same chapters in the [web guide](guide/index.html). Use that deck for the full feature demonstration. The following is a shorter live narration.

## Problem and pitch

Mars missions have collected extraordinary observations, but a future explorer needs those observations translated into explainable decisions about where to go, what terrain is involved, and what is still unknown. MARS//ATLAS is a research prototype that connects orbital imagery, numeric terrain models, and documented rover positions in one mission-planning workspace.

## Walkthrough

1. **0:00–0:25 — Orient.** Open the global Mars map. Pan across the NASA Mars Trek MOLA color hillshade, then switch to the 3D globe with left drag. Point out that this is a visual product, not a planet-wide numerical route grid.
2. **0:25–0:55 — History and study.** Select Jezero. Show the dashed recorded Perseverance drive from the public JPL feed, then the solid calculated route options. Open the source card and distinguish the historic drive from a new route calculation.
3. **0:55–1:40 — Decision.** Open Plan route. Use the default 5° slope limit. Compare the computed shortest route (about 3.92 km) with the gentler route (about 4.83 km) and their maximum sampled slopes (about 4.9° and 3.4°). Add an intermediate map waypoint to show a third, user-directed route. Open Directions to show north-referenced headings and turns.
4. **1:40–2:05 — Constraint response.** Move the slope limit to 0.1°. The engine returns no path instead of drawing an invalid line. Restore 5°. Open the steepest-segment explanation to show the source-derived height difference and calculation.
5. **2:05–2:30 — Other regions.** Switch to Gale, show the Bradbury Landing record, Curiosity's recorded traverse, and the 20 m sampled USGS merged DEM. Calculate the east study-point route. State that the destination is a scenario point and that the source includes Mars Express HRSC and MOLA gap coverage. Switch to Gusev and show that route controls are unavailable without a numeric DEM; measure a direct map distance instead.
6. **2:30–2:50 — Science and brief.** Return to Jezero. Show the NASA record for Hogwallow Flats and the delta context. Export the Markdown mission brief containing actual route values, assumptions, and source links.
7. **2:50–3:00 — Limits.** Orbital DEMs support research-scale terrain comparisons, not certified astronaut navigation. Name the missing field-scale hazards and operational models.

## Demonstration reliability

The numeric DEM is included locally with source metadata, so routing survives a Mars Trek tile outage. Live map layers depend on NASA's WMTS service. Prepare a screen recording only after the hosted experience and final official submission requirements are verified.
