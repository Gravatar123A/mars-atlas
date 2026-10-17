"""Package a decimated, measured Jezero regional CTX DEM for 3D context.

The output samples every fourth source cell (80 m spacing). It does not
interpolate or fill missing cells. The original source stays outside Git.
Run with rasterio and numpy installed, from the repository root.
"""

import hashlib
import json
import math
from pathlib import Path

import numpy as np
import rasterio

SOURCE_ID = "M20_JezeroCrater_CTXDEM_20m"
SOURCE_URL = (
    "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/"
    "CTX/ScienceInvestigationMaps_JPL/M20_JezeroCrater_CTXDEM_20m.tif"
)
INPUT = Path(".data-cache/jezero_science_ctx_20m.tif")
OUTPUT_META = Path("public/data/jezero-regional-meta.json")
OUTPUT_VALUES = Path("public/data/jezero-regional-u16.bin")
RADIUS_M = 3_396_190.0
STRIDE = 4
STEP_METERS = 0.05


def main() -> None:
    if not INPUT.exists():
        raise SystemExit(f"Missing source file: {INPUT}\nDownload: {SOURCE_URL}")
    source_sha = hashlib.sha256(INPUT.read_bytes()).hexdigest()
    with rasterio.open(INPUT) as ds:
        if ds.width != 4456 or ds.height != 5067 or ds.res != (20.0, 20.0):
            raise SystemExit("Unexpected regional CTX source dimensions or resolution")
        if not ds.crs or abs(ds.crs.to_dict().get("lat_ts", 0) - 18.4663) > 0.001:
            raise SystemExit("Unexpected regional CTX projection")
        sampled = ds.read(1, masked=True)[::STRIDE, ::STRIDE]
        values = sampled.filled(np.nan).astype(np.float64)
        valid = np.isfinite(values)
        if not valid.any():
            raise SystemExit("No finite regional terrain samples")
        minimum = float(values[valid].min())
        maximum = float(values[valid].max())
        offset = math.floor(minimum / STEP_METERS) * STEP_METERS
        if maximum - offset >= 65535 * STEP_METERS:
            raise SystemExit("Regional elevation span exceeds uint16 transport range")
        encoded = np.full(values.shape, 65535, dtype=np.uint16)
        encoded[valid] = np.rint((values[valid] - offset) / STEP_METERS).astype(np.uint16)
        decoded = offset + encoded[valid].astype(np.float64) * STEP_METERS
        max_error = float(np.max(np.abs(values[valid] - decoded)))
        x0, y0 = ds.xy(0, 0)
        parallel = math.radians(18.4663)
        meta = {
            "sourceId": SOURCE_ID,
            "sourceUrl": SOURCE_URL,
            "sourceSha256": source_sha,
            "productPage": "https://astrogeology.usgs.gov/search/map/mars_2020_science_investigation_ctx_dem_mosaic",
            "mission": "Mars Reconnaissance Orbiter",
            "instrument": "Context Camera (CTX)",
            "producer": "USGS Astrogeology Science Center / JPL",
            "resolutionMeters": 80,
            "sourceResolutionMeters": 20,
            "radiusMeters": RADIUS_M,
            "width": int(values.shape[1]),
            "height": int(values.shape[0]),
            "westCenterLon": math.degrees(x0 / (RADIUS_M * math.cos(parallel))),
            "northCenterLat": math.degrees(y0 / RADIUS_M),
            "degreesPerPixelLon": math.degrees(80 / (RADIUS_M * math.cos(parallel))),
            "degreesPerPixelLat": math.degrees(80 / RADIUS_M),
            "elevationEncoding": "uint16-le",
            "elevationFile": OUTPUT_VALUES.name,
            "valueOffsetMeters": round(offset, 8),
            "valueStepMeters": STEP_METERS,
            "maximumQuantizationErrorMeters": round(max_error, 6),
            "validCells": int(valid.sum()),
            "minimumMeters": minimum,
            "maximumMeters": maximum,
            "processing": "Every fourth source pixel sampled without interpolation; missing source cells remain missing. Visual context only; route search uses the separate 20 m landing-area grid.",
        }
        OUTPUT_META.parent.mkdir(parents=True, exist_ok=True)
        encoded.astype("<u2", copy=False).tofile(OUTPUT_VALUES)
        meta["elevationSha256"] = hashlib.sha256(OUTPUT_VALUES.read_bytes()).hexdigest()
        OUTPUT_META.write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
        print(f"Regional grid {meta['width']} × {meta['height']}, {meta['validCells']:,} valid 80 m samples")
        print(f"Elevation {minimum:.2f} to {maximum:.2f} m, max quantization error {max_error:.3f} m")
        print(f"Source SHA-256 {source_sha}")


if __name__ == "__main__":
    main()
