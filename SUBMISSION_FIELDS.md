# Mars Atlas — copy-ready project fields

Updated 16 November 2026. This is a draft for a future submission; check the applicable year's form and challenge rules before entering it. Every link below is a full public URL. NASA mission observations and USGS processed products are separated by producing resource.

## Project Details

Mars Atlas is an interactive way to explore Mars and see where the map's information comes from. It opens on a planet-wide NASA MOLA map, with a 3D globe and labelled rover landing regions. You can zoom into Jezero, Gale, and Gusev, switch orbital image layers, inspect published mission locations, and compare recorded rover drives with new route studies. The historical Perseverance and Curiosity lines come from JPL map feeds. They are displayed separately from routes our software calculates.

For Jezero and Gale, you can choose a start, destination, and optional waypoint, then set a sampled slope limit, assumed speed, and one-way time budget. Jezero has a 20 m landing-area DEM and an 80 m sampled regional DEM; Gale has a 20 m sampled window from a USGS merged DEM. The app compares route alternatives and reports distance, ascent, maximum sampled slope, an elevation profile, and north-referenced turns and headings. These values are calculations from the cited terrain, not NASA mission measurements. Gusev shows imagery and Spirit's landing position, but does not invent elevation routes where no numerical grid is packaged. The evidence panel stays open and links each result to its source record, and the export keeps the settings, data identifiers, and limits together.

We made Mars Atlas for people who want to ask better questions of Mars data. Seeing the rover's real path beside a calculated alternative can make the terrain and the model's assumptions easier to understand. It can support learning and early research discussion; it is not a rover command system or astronaut navigation tool. We built it with HTML, CSS, JavaScript, a Web Worker, Python, Node.js, NumPy, Rasterio, Pillow, NASA Mars Trek imagery, JPL traverse feeds, USGS terrain mosaics, Lucide icons, GitHub, and Vercel. The Gale mosaic also includes upstream ESA Mars Express HRSC input. No special hardware was required. We paid particular attention to source links, resolution, missing cells, and the difference between a rendered image and a measured elevation grid.

Project: https://marsatlas-map.vercel.app/  
Workspace: https://marsatlas-map.vercel.app/app/  
Annotated demo and PowerPoint: https://marsatlas-map.vercel.app/guide/  
Source register: https://marsatlas-map.vercel.app/resources/  
Code: https://github.com/gravatar123a/mars-atlas

## Use of Super Intelligence (SI)

Select the options corresponding to **code and data** and **written text/content**, if offered by the form. OpenAI Codex assisted in writing and reviewing application code, interface copy, documentation, source-register descriptions, and the PowerPoint guide. Human direction and review determined project scope, checked source provenance, and tested the running app. The scientific source rasters and live imagery are externally published; local terrain packages, simplified rover display paths, and route values are deterministic software derivatives, not SI fabricated observations. No SI-generated image, video, or audio is included. Guide screenshots are captures of the running app with a few editable rectangular highlights. The public source page, package metadata, and this statement disclose SI use. No NASA logo, flag, or mission insignia is used in generated content.

## NASA Data — enter one link per row

| Link Text | Link URL |
| --- | --- |
| NASA Mars Trek layer catalog | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars |
| Jezero CTX controlled mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml |
| Jezero HiRISE mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml |
| THEMIS daytime IR controlled mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml |
| MOLA global color hillshade (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml |
| Perseverance traverse geometry (JPL MMGIS) | https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json |
| Curiosity traverse geometry (JPL MMGIS) | https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json |
| Spirit and Opportunity traverse maps (NASA) | https://mars.nasa.gov/internal_resources/136/ |
| Opportunity final traverse map (NASA) | https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/ |
| Gale CTX mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/Gale_CTX_BlockAdj_dd/1.0.0/WMTSCapabilities.xml |
| Curiosity HiRISE mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/curiosity_hirise_mosaic/1.0.0/WMTSCapabilities.xml |
| Global CTX mosaic (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/CTX_beta01_uncontrolled_5m_Caltech/1.0.0/WMTSCapabilities.xml |
| Columbia Hills HiRISE (Mars Trek) | https://trek.nasa.gov/tiles/Mars/EQ/HiRISE_ColumbiaHills/1.0.0/WMTSCapabilities.xml |
| Mars 2020 landing site analysis | https://ntrs.nasa.gov/citations/20210024644 |
| Perseverance at the delta, Sol 426 | https://www.nasa.gov/wp-content/uploads/2021/09/final_msr_peis_nepa_scoping_meeting_presentations_may_4-5_2022.pdf |
| Perseverance at Hogwallow Flats, Sol 464 | https://science.nasa.gov/wp-content/uploads/2023/04/03_Ianson_Meyer_Gramling_MEP_MSR_TAGGED.pdf |
| Perseverance science highlights | https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/ |
| Mars Science Laboratory landing analysis | https://ntrs.nasa.gov/api/citations/20130011617/downloads/20130011617.pdf |
| Curiosity location map | https://science.nasa.gov/mission/msl-curiosity/location-map/ |
| Spirit mission landing record | https://ntrs.nasa.gov/citations/20040191840 |
| Opportunity landing coordinates (NASA/JPL) | https://mars.nasa.gov/internal_resources/143/ |
| NASA Space Apps 2026 challenge brief | https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/ |
| NASA images and media usage guidelines | https://www.nasa.gov/nasa-brand-center/images-and-media/ |

## Space Agency Partner & Other Data — enter one link per row

| Link Text | Link URL |
| --- | --- |
| USGS Jezero Mars 2020 CTX route DEM GeoTIFF | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif |
| USGS Jezero CTX route DEM PDS3 label | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0_pds3.lbl |
| USGS Jezero CTX terrain product record | https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_ctx_dtm_mosaic |
| USGS/JPL Jezero regional CTX DEM GeoTIFF | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif |
| USGS/JPL Jezero regional DEM record | https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic |
| USGS Gale merged DEM GeoTIFF | https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif |
| USGS Gale merged DEM product record | https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m |
| ESA Mars Express / HRSC mission | https://www.esa.int/Science_Exploration/Space_Science/Mars_Express |
| ArcGIS OnMars CTX tile service | https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer?f=pjson |
| Lucide icons | https://lucide.dev/ |
| DM Sans | https://fonts.google.com/specimen/DM+Sans |
| Space Grotesk | https://fonts.google.com/specimen/Space+Grotesk |
| Node.js | https://nodejs.org/ |
| Python | https://www.python.org/ |
| NumPy | https://numpy.org/ |
| Rasterio | https://rasterio.readthedocs.io/ |
| Requests | https://requests.readthedocs.io/ |
| truststore | https://truststore.readthedocs.io/ |
| Puppeteer Core | https://pptr.dev/ |
| Pillow | https://pillow.readthedocs.io/ |
| Google Chrome | https://www.google.com/chrome/ |
| GitHub | https://github.com/gravatar123a/mars-atlas |
| Vercel | https://vercel.com/ |
| OpenAI Codex | https://openai.com/codex/ |
| OpenAI Codex presentation runtime | https://openai.com/codex/ |
| USGS copyrights and credits | https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits |
| ESA Planetary Science Archive | https://psa.esa.int/psa/ |

The source register also explains how each item was used: https://marsatlas-map.vercel.app/resources/ . Scientific metric definitions and processing limits are documented in the repository's DATA_SOURCES.md and SCIENTIFIC_METHOD.md.
