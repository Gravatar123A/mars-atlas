"""Package a 6 km Gale landing-area sample from the USGS merged DEM.

Read only HTTPS byte ranges from the USGS public S3 mirror through a local
verified-TLS proxy. Each output cell is one measured source pixel, spaced 20 m
apart; no interpolation or missing-cell filling is performed.
Requires: rasterio, numpy, requests, truststore.
"""

import hashlib
import json
import math
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window
import requests
import truststore

truststore.inject_into_ssl()

SOURCE_URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif"
PRODUCT_PAGE = "https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m"
OUTPUT_META = Path("public/data/gale-landing-meta.json")
OUTPUT_VALUES = Path("public/data/gale-landing-u16.bin")
RADIUS_M = 3_396_190.0
LANDING = (-4.5895, 137.4417)
STRIDE = 20
SIZE = 301
STEP_METERS = 0.05


class RangeHandler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.forward()

    def do_GET(self):
        self.forward()

    def forward(self):
        headers = {"Range": self.headers["Range"]} if self.headers.get("Range") else {}
        response = requests.request(self.command, SOURCE_URL, headers=headers, timeout=60)
        if response.status_code not in (200, 206):
            self.send_error(response.status_code)
            return
        self.send_response(response.status_code)
        for key in ("Content-Length", "Content-Range", "Accept-Ranges", "Content-Type"):
            if key in response.headers:
                self.send_header(key, response.headers[key])
        self.end_headers()
        if self.command == "GET":
            self.wfile.write(response.content)

    def log_message(self, *_):
        pass


def main():
    head = requests.head(SOURCE_URL, timeout=30)
    head.raise_for_status()
    if int(head.headers.get("Content-Length", 0)) != 3_868_256_546 or "bytes" not in head.headers.get("Accept-Ranges", ""):
        raise SystemExit("Unexpected Gale source object size or byte-range support")
    server = ThreadingHTTPServer(("127.0.0.1", 0), RangeHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
            with rasterio.open(f"/vsicurl/http://127.0.0.1:{server.server_port}/source.tif") as ds:
                if ds.width != 32980 or ds.height != 57440 or ds.res != (1.0, 1.0) or ds.nodata != -32767.0:
                    raise SystemExit("Unexpected Gale source raster geometry")
                crs = ds.crs.to_wkt()
                if "Equirectangular" not in crs or "3396190" not in crs:
                    raise SystemExit("Unexpected Gale projection or Mars radius")
                center_x = RADIUS_M * math.radians(LANDING[1])
                center_y = RADIUS_M * math.radians(LANDING[0])
                center_row, center_col = ds.index(center_x, center_y)
                start_row = center_row - SIZE * STRIDE // 2
                start_col = center_col - SIZE * STRIDE // 2
                if start_row < 0 or start_col < 0 or start_row + SIZE * STRIDE > ds.height or start_col + SIZE * STRIDE > ds.width:
                    raise SystemExit("Gale sample window extends beyond source")
                values = np.empty((SIZE, SIZE), dtype=np.float64)
                for row in range(SIZE):
                    source_row = start_row + row * STRIDE
                    strip = ds.read(1, window=Window(start_col, source_row, SIZE * STRIDE, 1), masked=True)
                    values[row] = strip[0, ::STRIDE].filled(np.nan)
                    if row % 50 == 0:
                        print(f"Read {row + 1}/{SIZE} sampled rows", flush=True)
                valid = np.isfinite(values) & (values != ds.nodata)
                if valid.sum() < SIZE * SIZE * 0.8:
                    raise SystemExit("Too many missing Gale terrain cells in selected window")
                minimum = float(values[valid].min())
                maximum = float(values[valid].max())
                offset = math.floor(minimum / STEP_METERS) * STEP_METERS
                if maximum - offset >= 65535 * STEP_METERS:
                    raise SystemExit("Gale sample elevation span exceeds uint16 encoding")
                encoded = np.full(values.shape, 65535, dtype=np.uint16)
                encoded[valid] = np.rint((values[valid] - offset) / STEP_METERS).astype(np.uint16)
                decoded = offset + encoded[valid].astype(np.float64) * STEP_METERS
                max_error = float(np.max(np.abs(values[valid] - decoded)))
                x0, y0 = ds.xy(start_row, start_col)
                meta = {
                    "sourceId": "MSL_Gale_DEM_Mosaic_1m_v3",
                    "sourceUrl": SOURCE_URL,
                    "sourceETag": head.headers.get("ETag", ""),
                    "sourceSizeBytes": int(head.headers["Content-Length"]),
                    "productPage": PRODUCT_PAGE,
                    "mission": "Mars Reconnaissance Orbiter / Mars Express",
                    "instrument": "HiRISE, CTX / HRSC; MOLA gaps",
                    "producer": "USGS Astrogeology / Mars Science Laboratory",
                    "resolutionMeters": STRIDE,
                    "sourceResolutionMeters": 1,
                    "radiusMeters": RADIUS_M,
                    "width": SIZE,
                    "height": SIZE,
                    "westCenterLon": math.degrees(x0 / RADIUS_M),
                    "northCenterLat": math.degrees(y0 / RADIUS_M),
                    "degreesPerPixelLon": math.degrees(STRIDE / RADIUS_M),
                    "degreesPerPixelLat": math.degrees(STRIDE / RADIUS_M),
                    "elevationEncoding": "uint16-le",
                    "elevationFile": OUTPUT_VALUES.name,
                    "valueOffsetMeters": round(offset, 8),
                    "valueStepMeters": STEP_METERS,
                    "maximumQuantizationErrorMeters": round(max_error, 6),
                    "validCells": int(valid.sum()),
                    "minimumMeters": minimum,
                    "maximumMeters": maximum,
                    "processing": "6 km landing-area window; one measured 1 m mosaic pixel selected every 20 m without interpolation. Mixed underlying sensor resolution and missing values retained. Exploratory route screening only.",
                }
                OUTPUT_META.parent.mkdir(parents=True, exist_ok=True)
                encoded.astype("<u2", copy=False).tofile(OUTPUT_VALUES)
                meta["elevationSha256"] = hashlib.sha256(OUTPUT_VALUES.read_bytes()).hexdigest()
                OUTPUT_META.write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
                print(f"Gale: {SIZE} × {SIZE}, {valid.sum():,} finite samples, {minimum:.1f} to {maximum:.1f} m")
                print(f"Package SHA-256: {meta['elevationSha256']}")
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
