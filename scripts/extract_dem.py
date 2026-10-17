"""Create a small, source-traceable Jezero grid from the USGS CTX DEM.

Run with PYTHONPATH pointing at the local rasterio installation. The original
GeoTIFF is available from the URL in SOURCE_URL. No value is interpolated.
"""

import json
import hashlib
import math
from pathlib import Path

import numpy as np
import rasterio

SOURCE_URL = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/"
    "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif"
)
SOURCE_ID = "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0"
RADIUS_M = 3_396_190.0
INPUT = Path(".data-cache/jezero_ctx_dtm_20m.tif")
OUTPUT = Path("public/data/jezero-grid.json")


def projected(lon: float, lat: float) -> tuple[float, float]:
    return RADIUS_M * math.radians(lon), RADIUS_M * math.radians(lat)


def main() -> None:
    if not INPUT.exists():
        raise SystemExit(f"Missing source GeoTIFF: {INPUT}\nDownload: {SOURCE_URL}")
    source_sha256 = hashlib.sha256(INPUT.read_bytes()).hexdigest()
    with rasterio.open(INPUT) as ds:
        if ds.width != 1596 or ds.height != 1512 or abs(ds.res[0] - 20) > 0.01:
            raise SystemExit("Unexpected CTX DEM dimensions or resolution")

        north_row, west_col = ds.index(*projected(77.35, 18.50))
        south_row, east_col = ds.index(*projected(77.51, 18.42))
        row_start, row_stop = sorted((north_row, south_row))
        col_start, col_stop = sorted((west_col, east_col))
        row_stop += 1
        col_stop += 1

        from rasterio.windows import Window

        window = Window(col_start, row_start, col_stop - col_start, row_stop - row_start)
        values = ds.read(1, window=window, masked=True)
        if np.ma.is_masked(values) and np.any(np.ma.getmaskarray(values)):
            raise SystemExit("Selected study area contains missing elevation cells")

        x0, y0 = ds.xy(row_start, col_start)
        dlon = math.degrees(ds.res[0] / RADIUS_M)
        dlat = math.degrees(ds.res[1] / RADIUS_M)
        grid = {
            "sourceId": SOURCE_ID,
            "sourceUrl": SOURCE_URL,
            "sourceSha256": source_sha256,
            "productPage": "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html",
            "mission": "Mars Reconnaissance Orbiter",
            "instrument": "Context Camera (CTX)",
            "producer": "USGS Astrogeology Science Center",
            "resolutionMeters": 20,
            "radiusMeters": RADIUS_M,
            "verticalReference": "MOLA topography / delta geoid, as named by the source product; verify datum details before operational interpretation",
            "width": int(values.shape[1]),
            "height": int(values.shape[0]),
            "westCenterLon": math.degrees(x0 / RADIUS_M),
            "northCenterLat": math.degrees(y0 / RADIUS_M),
            "degreesPerPixelLon": dlon,
            "degreesPerPixelLat": dlat,
            "elevationsMeters": [round(float(v), 2) for v in values.filled(np.nan).flat],
            "processing": "Window crop only; no reprojection, interpolation, or invented cells. Values rounded to 0.01 m for transport.",
        }
        if any(not math.isfinite(v) for v in grid["elevationsMeters"]):
            raise SystemExit("Non-finite elevation after extraction")
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(grid, separators=(",", ":")), encoding="utf-8")
        print(f"Wrote {OUTPUT}: {grid['width']} × {grid['height']} cells, {OUTPUT.stat().st_size:,} bytes")
        print(f"Top left center: {grid['northCenterLat']:.6f}°N, {grid['westCenterLon']:.6f}°E")


if __name__ == "__main__":
    main()
