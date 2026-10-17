# Scientific data sources

Checked 2026-10-17. These are the products currently used in the app; the source registry in `src/main.js` and the terrain metadata expose their provenance to users.

| Product | Mission / instrument / producer | Use and resolution | Source and handling | Limitations |
| --- | --- | --- | --- | --- |
| `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | Mars Reconnaissance Orbiter / Context Camera; USGS Astrogeology | Numeric terrain; 20 m cells | [USGS public object index](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html), [GeoTIFF](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif), [PDS3 label](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0_pds3.lbl). Full 1,596 × 1,512 raster preserved; no crop, reprojection, interpolation, or invented cells. Values are transport-quantized to 0.02 m. | Cell-scale slope cannot establish foot-scale hazards. Vertical reference requires further expert validation. |
| `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` | MRO / CTX; NASA Mars Trek WMTS | Primary orbital imagery; 6 m named mosaic | [Mars Trek layer catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars), [WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml). Browser requests live tiles. | Imagery is visual context and is not sampled for numeric elevation. |
| `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` | MRO / HiRISE; NASA Mars Trek WMTS | Optional detailed imagery; 25 cm named mosaic | [Mars Trek layer catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars), [WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml). | High image detail is not equivalent to high-resolution terrain height. Partial coverage possible. |
| `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | Mars Odyssey / THEMIS; NASA Mars Trek WMTS | Optional historical daytime IR mosaic; 100 m | [Mars Trek layer catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars), [WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml). | Historical orbital IR imagery, not live weather or current surface temperature. |
| `Mars_MGS_MOLA_ClrShade_merge_global_463m` | Mars Global Surveyor / MOLA; NASA Mars Trek WMTS | Optional regional color hillshade; 463 m | [Mars Trek layer catalog](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars), [WMTS capabilities](https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml). | A rendered visualization, not the numeric DEM used by routing. |
| Octavia E. Butler Landing | NASA Mars 2020 mission | Start preset: 18.44463°N, 77.45088°E | [NASA Technical Reports Server landing analysis](https://ntrs.nasa.gov/citations/20210024644). | Published landing coordinate, not an EVA starting point. |
| Perseverance at Hogwallow Flats, Sol 464 | NASA Mars 2020 mission | Destination preset: 18.44272865°N, 77.38228798°E | [NASA Planetary Science Advisory Committee presentation](https://science.nasa.gov/wp-content/uploads/2023/04/03_Ianson_Meyer_Gramling_MEP_MSR_TAGGED.pdf), identifying rover position on June 10, 2022. | Historical rover location. The computed route is a new research scenario, not Perseverance's driven route. |
| Perseverance at the delta, Sol 426 | NASA Mars 2020 mission | Site explorer: 18.42416332°N, 77.42524624°E | [NASA-ESA Mars Sample Return presentation](https://www.nasa.gov/wp-content/uploads/2021/09/final_msr_peis_nepa_scoping_meeting_presentations_may_4-5_2022.pdf), page 30, showing the rover's May 1 location and coordinates. | Historical rover position, not an outcrop boundary or validated EVA waypoint. |
| Jezero delta science context | NASA Mars 2020 mission | Explains why nearby sedimentary rocks are scientifically interesting | [NASA Perseverance science highlights](https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/). | Regional context only; do not infer a sampled outcrop at every clicked map point. |

The PDS label documents an equirectangular, planetocentric, east-positive Mars projection with a 3,396.19 km sphere. The UI uses that radius for distances. The complete numeric footprint spans approximately 77.16047–77.69898°E and 18.21103–18.72119°N (31.9 × 30.2 km at 20 m); numerical routing is unavailable outside it.

The source GeoTIFF retrieved on October 17 had SHA-256 `16a1aa66c3f48c1bca252795827db7b417876217aff0f5e1aff18027fab2327b`; it was recomputed locally against the downloaded 9,662,387-byte file. The extraction script records this source hash and the packaged binary SHA-256 in `jezero-grid-meta.json`. The browser verifies the packaged binary checksum before decoding 2,413,152 finite cells. The full source elevation range is stored with a 0.02 m step and a measured maximum quantization error of 0.01 m.

## Metrics and their origin

The app does not present computed values as NASA measurements. The table below identifies the origin of every displayed numeric metric.

| Displayed metric | Origin | External data source |
| --- | --- | --- |
| Latitude and longitude of landing, Sol 426, and Sol 464 presets | Published mission coordinates | The NASA records linked above. |
| Terrain elevation | Sampled from the CTX DEM at the selected grid cell | USGS-hosted MRO/CTX GeoTIFF linked above. |
| Horizontal distance | Haversine sum along the returned route using the PDS label's 3,396,190 m Mars radius | CTX DEM PDS3 label linked above; route geometry is calculated in the browser. |
| Cumulative ascent and descent | Sum of positive and negative differences between consecutive sampled CTX elevations | CTX DEM; calculation described in [SCIENTIFIC_METHOD.md](SCIENTIFIC_METHOD.md). |
| Maximum sampled slope | `atan(abs(elevation change) / horizontal edge length)` for each route edge | CTX DEM elevations plus the documented distance calculation. |
| Route path and conservative alternative | A* graph search across valid DEM cells; conservative mode applies the documented terrain penalty | CTX DEM; algorithm and parameters are documented in [SCIENTIFIC_METHOD.md](SCIENTIFIC_METHOD.md). |
| Elevation profile | Ordered sampled CTX elevations along the returned route | CTX DEM. |
| Travel time and budget status | `distance / user-selected speed`; compared with the user-selected one-way budget | No external data source. These are explicitly labelled scenario assumptions. |
| Scale bar | Map projection geometry using the same PDS label radius | CTX DEM PDS3 label. |

No external weather, radiation, life-support, communications, trafficability, hazard, astronaut-performance, or live rover telemetry dataset is used. Google Fonts are loaded only for typography and do not contribute scientific data or metrics.

Mars Trek capabilities and sample tiles for CTX, HiRISE, and THEMIS responded on October 17. Tile services remain external and may fail independently of the cached numeric DEM. The source file's acquisition dates, individual input stereo observations, vertical uncertainty, and redistribution terms need deeper product-level review before a scientific publication or operational use. NASA and USGS are credited as providers; this project does not imply their endorsement.
