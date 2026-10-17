"""Package the full source-traceable Jezero CTX DEM for browser routing.

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
OUTPUT_META = Path("public/data/jezero-grid-meta.json")
OUTPUT_VALUES = Path("public/data/jezero-elevation-u16.bin")
QUANTIZATION_METERS = 0.02


def main() -> None:
    if not INPUT.exists():
        raise SystemExit(f"Missing source GeoTIFF: {INPUT}\nDownload: {SOURCE_URL}")
    source_sha256 = hashlib.sha256(INPUT.read_bytes()).hexdigest()
    with rasterio.open(INPUT) as ds:
        if ds.width != 1596 or ds.height != 1512 or abs(ds.res[0] - 20) > 0.01:
            raise SystemExit("Unexpected CTX DEM dimensions or resolution")

        values = ds.read(1, masked=True)
        if np.ma.is_masked(values) and np.any(np.ma.getmaskarray(values)):
            raise SystemExit("Source DEM contains missing elevation cells; mask-aware packaging required")

        x0, y0 = ds.xy(0, 0)
        dlon = math.degrees(ds.res[0] / RADIUS_M)
        dlat = math.degrees(ds.res[1] / RADIUS_M)
        raw = values.filled(np.nan).astype(np.float64)
        if not np.isfinite(raw).all():
            raise SystemExit("Non-finite elevation in source DEM")
        offset = math.floor(float(raw.min()) / QUANTIZATION_METERS) * QUANTIZATION_METERS
        scaled = (raw - offset) / QUANTIZATION_METERS
        if np.max(scaled) >= 65535:
            raise SystemExit("DEM range exceeds UInt16 quantization capacity")
        encoded = np.rint(scaled).astype(np.uint16)
        decoded = offset + encoded.astype(np.float64) * QUANTIZATION_METERS
        maximum_error = float(np.max(np.abs(raw - decoded)))
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
            "elevationEncoding": "uint16-le",
            "elevationFile": OUTPUT_VALUES.name,
            "valueOffsetMeters": round(offset, 8),
            "valueStepMeters": QUANTIZATION_METERS,
            "maximumQuantizationErrorMeters": round(maximum_error, 6),
            "validCells": int(encoded.size),
            "processing": "Full source raster; no crop, reprojection, interpolation, or invented cells. Elevation quantized to 0.02 m for transport.",
        }
        OUTPUT_META.parent.mkdir(parents=True, exist_ok=True)
        encoded.astype("<u2", copy=False).tofile(OUTPUT_VALUES)
        grid["elevationSha256"] = hashlib.sha256(OUTPUT_VALUES.read_bytes()).hexdigest()
        OUTPUT_META.write_text(json.dumps(grid, separators=(",", ":")), encoding="utf-8")
        print(f"Wrote {OUTPUT_META} and {OUTPUT_VALUES}: {grid['width']} × {grid['height']} cells, {OUTPUT_VALUES.stat().st_size:,} bytes")
        print(f"Maximum quantization error: {maximum_error:.5f} m")
        print(f"Top left center: {grid['northCenterLat']:.6f}°N, {grid['westCenterLon']:.6f}°E")


if __name__ == "__main__":
    main()
