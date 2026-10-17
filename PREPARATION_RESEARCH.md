# MARS//ATLAS — preparation research

Research checked: 2026-10-17. This document is pre-event research, not a competition submission or an implemented product.

## Competition boundary and official requirements

- The published challenge summary calls for a layered, integrated view of a Martian surface location or route using data from multiple NASA science missions to help a human explorer plan a Marswalk and conduct science. The challenge page is [Interplanetary Survival Guide: Martian Map](https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/). The page returned HTTP 502 during this check; its summary was corroborated in indexed Space Apps pages. Recheck the primary page directly when available.
- [Official Space Apps 2026 event guidance](https://www.spaceappschallenge.org/2026/local-events/santiago-dominican-republic/) says full challenge statements and resources are released October 28, 2026, and competition solutions must be started and built during November 14–15, 2026. Therefore, the full challenge text and associated resources could not be verified on October 17. Do not treat the master prompt's proposed features as official requirements.
- During the event, retrieve the final statement and resources before implementation and create `CHALLENGE_COMPLIANCE.md` with exact source links and verification for every requirement. Do not mark unbuilt features complete.

## Candidate data, with current evidence

| Role | Candidate and evidence | Known facts | Still to verify |
| --- | --- | --- | --- |
| Regional basemap and imagery | [NASA Mars Trek WMTS catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | It documents RESTful WMTS, GetCapabilities, coverage boxes, and Jezero CTX layers `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` and `Jezero_CTX_BlockAdj_dd`. | Current endpoint responses, tile format, tile matrix, actual Jezero tiles, terms of use, and browser CORS behavior. |
| Detailed imagery | [Mars Trek Jezero HiRISE catalog entry](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | Layer `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` is listed with a Jezero coverage box. It is imagery, not numeric elevation. | Tile alignment with CTX, current availability, and whether the chosen DTM footprint overlaps useful imagery. |
| Primary numerical terrain | [USGS/PDS Mars 2020 Science Investigation CTX DEM Mosaic](https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic), [public object index](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html) | PDS4 product `urn:nasa:pds:mars2020_ctx_basemap_2021:data:m20_ctxdem_mosaic`, version 1.0, 2021. Its XML label identifies an MRO CTX-derived elevation GeoTIFF at 20 m/pixel, 4,456 × 5,067 cells, east-positive planetocentric coordinates, and a 3,396,190 m spherical radius. The published bounding box is 76.9974–78.5826°E and 17.5805–19.2902°N. A HEAD check found the public object reachable at approximately 90 MB. | Inspect actual NoData cells and valid continuous route area; verify heights, vertical reference, co-registration, and whether the published bbox includes broad blank margins. The bbox alone is not proof of route feasibility. |
| Smaller numerical terrain | [HiRISE DTM near 18.5°N, 77.52°E](https://hirise.lpl.arizona.edu/dtm/ESP_048842_1985) | `DTEEC_048842_1985_048908_1985_U01`, about 411 MB. A byte-range check of its embedded PDS label found 1.00966 m/pixel, bounds 77.461477–77.584155°E and 18.336843–18.588602°N, east-positive planetocentric latitude, and a **3,394,839.813 m** spherical radius. This differs from the CTX mosaic's radius, so alignment requires an explicit transform. | Valid cells, vertical datum, and useful science-site overlap. The published Perseverance landing longitude lies outside this product's bounding rectangle. |
| Alternative smaller terrain | [HiRISE DTM near 18.3°N, 77.53°E](https://hirise.lpl.arizona.edu/dtm/ESP_023524_1985) | `DTEEC_023524_1985_023379_1985_U01`, about 700 MB. Embedded label bounds 77.452903–77.598173°E and 18.159317–18.521550°N, with the same 3,394,839.813 m radius. [HiRISE documentation](https://hirise.lpl.arizona.edu/dtm/about.php) confirms PDS `.IMG` rasters are numerical DTMs. | Valid cells and destination coverage. The exact Perseverance landing longitude is also just outside this bounding rectangle. |
| Broad topographic context | [Mars Trek MOLA color hillshade](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | NASA lists a global MOLA hillshade and roughness layer. | The rendered tiles are visual context only. Use a separately documented numeric DEM for quantitative terrain. |
| Second mission layer | [Mars Trek THEMIS daytime IR mosaic](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) | The catalog lists `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018`, from Mars Odyssey. | Confirm tiles and metadata; describe it as historical thermal-infrared imagery, not current air or ground temperature. |
| Science objective | [NASA Perseverance science highlights](https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/) and [NASA delta exploration record](https://science.nasa.gov/resource/perseverance-exploring-the-front-of-the-delta/) | NASA documents Jezero's delta and investigations such as Wildcat Ridge. | Exact site coordinates and DTM overlap. A cited science story is not enough to place a precise marker. |

Other useful technical references: [USGS coordinate-convention guide](https://astrogeology.usgs.gov/docs/concepts/camera-geometry-and-projections/learning-about-map-projections/) explains planetocentric latitude and east-positive longitude; [HiRISE DTM usage guide](https://hirise.lpl.arizona.edu/dtm/howto.php) describes conversion of PDS IMG with GDAL. Every selected product's own label must govern its final coordinate and height interpretation. [NASA's published landing coordinate](https://ntrs.nasa.gov/citations/20210024644) is 18.44463°N, 77.45088°E; it falls within the CTX mosaic's published box but just west of both checked HiRISE DTM boxes.

## Feasibility finding

The data sources are credible candidates, but a route-capable study area is **not yet verified**. The critical dependency is a numerical DTM with valid cells over both selected endpoints and the intervening graph. A layer's catalog coverage or a DTM center coordinate does not prove that. Verify the CTX mosaic's NoData mask before promising a route through the delta or to a named site. If its valid footprint excludes a verified science destination, select another documented footprint and objective, or narrow the mission demonstration; never invent a site or fill missing elevations.

The HiRISE DTM file sizes are large for a hackathon build, whereas the primary CTX GeoTIFF is about 90 MB and its separate TRN-area counterpart is about 9.7 MB. The later application should serve a small, documented crop or derived grid with recorded processing steps and source product ID, subject to source usage terms. No full raster was downloaded or transformed during preparation; only remote metadata, byte-range headers, and HTTP availability were checked.

The Mars Trek live service returned WMTS capabilities and a sample Jezero tile for the selected CTX, HiRISE, and THEMIS layers on October 17. Each checked capability response advertised `image/png`, the `default028mm` matrix set, and `Access-Control-Allow-Origin: *`. These are point-in-time connectivity checks, not a guarantee of performance or coverage across the chosen study region.

## Questions to resolve on and after October 28

1. What exactly does the final official challenge ask for, and what resources or submission constraints does it add?
2. Which Jezero numerical DTM has a continuous, valid footprint covering a scientifically documented destination?
3. What coordinate and vertical datum does its embedded PDS label specify? Does it align with the selected Mars Trek imagery after reprojection?
4. Are the WMTS endpoints, rate limits, tile formats, and browser access dependable enough for a live demo? What legitimate offline cache is permitted?
5. Can an exact destination coordinate be cited from NASA/PDS mission records? If not, use a documented region or feature polygon rather than an exact marker.
6. Which attribution and redistribution conditions apply to any cropped DTM, tiles, and orthophotos?

## Trust rules for the eventual application

Keep observed measurements, derived slope/route calculations, user assumptions, and unknowns distinct. Treat orbital terrain as research-scale evidence, not certified EVA hazard detection. A route with missing DEM cells should fail with an explanation. Never derive numerical elevation from a color hillshade, label archived MEDA observations as live weather, or imply NASA endorses the tool.
