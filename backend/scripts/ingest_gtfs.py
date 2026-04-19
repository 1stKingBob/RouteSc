#!/usr/bin/env python3
"""
NSW GTFS data ingestion script.

Downloads the Greater Sydney GTFS ZIP (publicly accessible, no key required)
and produces backend/data/routes.json used by the FastAPI backend.

Usage:
    python scripts/ingest_gtfs.py            # download + process
    python scripts/ingest_gtfs.py --force    # re-download even if exists
"""

import csv
import io
import json
import math
import subprocess
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

GTFS_URL = (
    "https://opendata.transport.nsw.gov.au/data/dataset/"
    "d1f68d4f-b778-44df-9823-cf2fa922e47f/resource/"
    "67974f14-01bf-47b7-bfa5-c7f2f8a950ca/download/"
    "full_greater_sydney_gtfs_static_0.zip"
)

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_FILE = DATA_DIR / "routes.json"
ZIP_CACHE = DATA_DIR / "gtfs.zip"

# Keep every Nth shape point to reduce JSON size (~20x compression)
SHAPE_STEP = 4
# CBD coords (for demand heuristic)
CBD_LAT, CBD_LNG = -33.8688, 151.2093


# ── helpers ────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def demand_from_coords(lat: float, lng: float) -> tuple[str, int, int, float]:
    d = haversine_km(lat, lng, CBD_LAT, CBD_LNG)
    # Use stop_id hash for deterministic variance
    seed = abs(hash(f"{lat:.4f}{lng:.4f}")) % 30
    if d < 3:
        return "high", 90 + seed // 3, 65 + seed // 3, round(d * 0.8 + 5.0, 1)
    elif d < 8:
        return "medium", 55 + seed // 2, 35 + seed // 2, round(d * 0.5 + 3.0, 1)
    else:
        return "low", 20 + seed // 2, 12 + seed // 3, round(d * 0.2 + 1.0, 1)


def route_color(number: str) -> str:
    colors = ["#3b82f6", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#a855f7", "#64748b"]
    try:
        return colors[int(number) // 100 % len(colors)]
    except ValueError:
        return colors[abs(hash(number)) % len(colors)]


def find_in_zip(z: zipfile.ZipFile, filename: str) -> str:
    for name in z.namelist():
        if name == filename or name.endswith("/" + filename):
            return name
    raise FileNotFoundError(f"{filename} not found in ZIP. Files: {z.namelist()[:8]}")


def csv_from_zip(z: zipfile.ZipFile, filename: str):
    path = find_in_zip(z, filename)
    with z.open(path) as raw:
        yield from csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig"))


# ── download ───────────────────────────────────────────────────────────────

def download_gtfs(force: bool = False) -> bytes:
    if ZIP_CACHE.exists() and not force:
        size_mb = ZIP_CACHE.stat().st_size // 1024 // 1024
        print(f"Using cached ZIP at {ZIP_CACHE} ({size_mb} MB)")
        return ZIP_CACHE.read_bytes()

    print("Downloading GTFS (~300 MB) from TfNSW Open Data…")
    # Use system curl — avoids macOS Python SSL cert issues with this host
    subprocess.run(
        ["curl", "-L", "--progress-bar", "-o", str(ZIP_CACHE), GTFS_URL],
        check=True,
    )
    size_mb = ZIP_CACHE.stat().st_size // 1024 // 1024
    print(f"Done — {size_mb} MB saved to {ZIP_CACHE}")
    return ZIP_CACHE.read_bytes()


# ── process ────────────────────────────────────────────────────────────────

def process(zip_bytes: bytes) -> list[dict]:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:

        # NSW GTFS uses extended route types:
        #   3   = standard bus, 700 = Bus Service (city routes like 380/370/333/440)
        #   702 = Express Bus, 704 = Local Bus, 712 = school coaches (excluded)
        BUS_TYPES = {"3", "700", "702", "704"}

        # 1. routes.txt ── all bus routes
        print("1/5  Reading routes.txt …")
        route_meta: dict[str, dict] = {}
        for row in csv_from_zip(z, "routes.txt"):
            if row.get("route_type", "").strip() in BUS_TYPES:
                rid = row["route_id"]
                num = row.get("route_short_name", "").strip()
                name = row.get("route_long_name", "").strip()
                # Prefer the GTFS-supplied brand color, fall back to heuristic
                gtfs_color = row.get("route_color", "").strip()
                color = f"#{gtfs_color}" if gtfs_color else route_color(num)
                route_meta[rid] = {
                    "id": rid,
                    "number": num,
                    "name": name or f"Route {num}",
                    "color": color,
                }
        print(f"     {len(route_meta)} bus routes found")

        # 2. trips.txt ── one trip + shape_id per route
        print("2/5  Reading trips.txt …")
        route_to_trip: dict[str, dict] = {}  # route_id -> {trip_id, shape_id}
        for row in csv_from_zip(z, "trips.txt"):
            rid = row["route_id"]
            if rid in route_meta and rid not in route_to_trip:
                route_to_trip[rid] = {
                    "trip_id": row["trip_id"],
                    "shape_id": row.get("shape_id", ""),
                }
        print(f"     {len(route_to_trip)} route→trip mappings")

        target_trips = {v["trip_id"] for v in route_to_trip.values()}
        target_shapes = {v["shape_id"] for v in route_to_trip.values() if v["shape_id"]}

        # 3. shapes.txt ── downsampled route geometry
        print("3/5  Reading shapes.txt …")
        shapes: dict[str, list] = defaultdict(list)
        shape_counter: dict[str, int] = defaultdict(int)
        for row in csv_from_zip(z, "shapes.txt"):
            sid = row["shape_id"]
            if sid in target_shapes:
                shape_counter[sid] += 1
                if shape_counter[sid] % SHAPE_STEP == 0:
                    shapes[sid].append([
                        round(float(row["shape_pt_lat"]), 6),
                        round(float(row["shape_pt_lon"]), 6),
                    ])
        print(f"     {len(shapes)} shapes extracted")

        # 4. stop_times.txt ── ordered stop_ids per trip (large file)
        print("4/5  Reading stop_times.txt (largest file — takes ~1–2 min) …")
        trip_stops: dict[str, list] = defaultdict(list)
        n = 0
        for row in csv_from_zip(z, "stop_times.txt"):
            tid = row["trip_id"]
            if tid in target_trips:
                trip_stops[tid].append((int(row["stop_sequence"]), row["stop_id"]))
            n += 1
            if n % 2_000_000 == 0:
                print(f"     {n // 1_000_000}M rows scanned, {len(trip_stops)} trips collected …")
        print(f"     Scanned {n // 1_000_000}M rows, got stops for {len(trip_stops)} trips")

        # 5. stops.txt ── stop lookup
        print("5/5  Reading stops.txt …")
        stop_lookup: dict[str, dict] = {}
        for row in csv_from_zip(z, "stops.txt"):
            stop_lookup[row["stop_id"]] = {
                "id": row["stop_id"],
                "name": row["stop_name"],
                "lat": round(float(row["stop_lat"]), 6),
                "lng": round(float(row["stop_lon"]), 6),
            }
        print(f"     {len(stop_lookup)} stops loaded")

    # ── assemble ────────────────────────────────────────────────────────────
    print("\nAssembling routes …")
    output: list[dict] = []

    for rid, meta in route_meta.items():
        if not meta["number"]:
            continue
        trip_info = route_to_trip.get(rid)
        if not trip_info:
            continue

        shape = shapes.get(trip_info["shape_id"], [])
        stop_seq = sorted(trip_stops.get(trip_info["trip_id"], []), key=lambda x: x[0])

        stops = []
        seen_ids: set[str] = set()
        for seq, stop_id in stop_seq:
            if stop_id in seen_ids:
                continue
            seen_ids.add(stop_id)
            s = stop_lookup.get(stop_id)
            if not s:
                continue
            demand, avg_riders, boarding_freq, growth = demand_from_coords(s["lat"], s["lng"])
            stops.append({
                **s,
                "sequence": seq,
                "demand": demand,
                "demandScore": round(avg_riders * 0.8),
                "avgRiders": avg_riders,
                "boardingFrequency": boarding_freq,
                "growthTrend": growth,
            })

        n_stops = len(stops)
        if n_stops == 0:
            continue

        output.append({
            "id": rid,
            "routeNumber": meta["number"],
            "routeName": meta["name"],
            "operator": "Transport for NSW",
            "color": meta["color"],
            "frequency": 6,
            "avgTravelTime": max(8, n_stops * 2),
            "totalDistance": round(n_stops * 0.45, 1),
            "peakHours": ["7:00", "8:00", "9:00", "17:00", "18:00"],
            "path": shape,
            "stops": stops,
        })

    # Sort by numeric route number, then alphabetic
    def sort_key(r: dict):
        try:
            return (0, int(r["routeNumber"]))
        except ValueError:
            return (1, r["routeNumber"])

    output.sort(key=sort_key)
    return output


def main():
    force = "--force" in sys.argv
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if OUTPUT_FILE.exists() and not force:
        print(f"routes.json already exists ({OUTPUT_FILE.stat().st_size // 1024 // 1024} MB).")
        print("Run with --force to re-process.")
        return

    zip_bytes = download_gtfs(force=force)
    routes = process(zip_bytes)

    print(f"\nSaving {len(routes)} routes to {OUTPUT_FILE} …")
    OUTPUT_FILE.write_text(json.dumps({"routes": routes, "total": len(routes)}, separators=(",", ":")))
    size = OUTPUT_FILE.stat().st_size / 1024 / 1024
    print(f"Saved {size:.1f} MB\n")
    print("Done! Start the backend: uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    main()
