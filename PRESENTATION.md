# Three-minute demonstration draft

## Problem and pitch

Mars missions have collected extraordinary observations, but a future explorer needs those observations translated into explainable decisions about where to go, what terrain is involved, and what is still unknown. MARS//ATLAS is a research prototype that connects orbital imagery, a numerical CTX terrain model, and historical rover science context in one mission-planning workspace.

## Walkthrough

1. **0:00–0:25 — Orient.** Open the Jezero workspace. Point out the real NASA Mars Trek CTX mosaic, published landing coordinate, and NASA-documented Sol 464 Hogwallow Flats location. State clearly that this is a research prototype.
2. **0:25–0:55 — Evidence.** Enable the Mars Odyssey THEMIS layer and adjust opacity; open its source card. Explain that it is historical thermal infrared imagery, not live weather. Open the CTX terrain source card and distinguish its numeric DEM from imagery.
3. **0:55–1:40 — Decision.** Use the default 5° slope limit. Compare the computed shortest route (about 3.90 km) with the terrain-conservative route (about 4.87 km) and their maximum sampled slopes (about 4.9° and 2.9°). Explain that the longer profile trades distance for lower measured steepness.
4. **1:40–2:05 — Constraint response.** Move the slope limit to 0.1°. The engine returns no path instead of drawing an invalid line. Restore 5°. Open the steepest-segment explanation to show the source-derived height difference and calculation.
5. **2:05–2:40 — Science and brief.** Show the NASA record for Hogwallow Flats and the delta context. Export the Markdown mission brief containing the actual route values, assumptions, and source links.
6. **2:40–3:00 — Limits.** The 20 m orbital DEM supports research-scale terrain comparisons, not certified astronaut navigation. Name the missing field-scale hazards and operational models.

## Demonstration reliability

The numeric DEM is included locally with source metadata, so routing survives a Mars Trek tile outage. Live map layers depend on NASA's WMTS service. Prepare a screen recording only after the hosted experience and final official submission requirements are verified.
