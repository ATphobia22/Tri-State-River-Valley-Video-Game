"""COLMAP SQLite database schema helpers for the applied photogrammetry toolchain."""
from __future__ import annotations
import sqlite3
from pathlib import Path
from typing import Any

CAMERA_MODELS = {
    0: "SIMPLE_PINHOLE", 1: "PINHOLE", 2: "SIMPLE_RADIAL",
    3: "RADIAL", 4: "OPENCV", 5: "OPENCV_FISHEYE",
}

SCHEMA_SUMMARY = {
    "cameras": "camera_id INTEGER PK, model INTEGER, width INTEGER, height INTEGER, params BLOB, prior_focal_length INTEGER",
    "images": "image_id INTEGER PK, name TEXT, camera_id INTEGER, prior_qw REAL, prior_qx REAL, prior_qy REAL, prior_qz REAL, prior_tx REAL, prior_ty REAL, prior_tz REAL",
    "keypoints": "image_id INTEGER PK, rows INTEGER, cols INTEGER, data BLOB",
    "descriptors": "image_id INTEGER PK, rows INTEGER, cols INTEGER, data BLOB",
    "matches": "pair_id INTEGER PK, rows INTEGER, cols INTEGER, data BLOB",
    "two_view_geometries": "pair_id INTEGER PK, rows INTEGER, cols INTEGER, data BLOB, config INTEGER, F BLOB, E BLOB, H BLOB, qvec BLOB, tvec BLOB",
}

def inspect_database(path: str | Path) -> dict[str, Any]:
    db = Path(path)
    if not db.is_file():
        raise FileNotFoundError(str(db))
    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        tables = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        counts = {}
        for table in tables:
            try:
                counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            except sqlite3.Error:
                counts[table] = None
        cameras = []
        if "cameras" in tables:
            for row in conn.execute("SELECT camera_id, model, width, height FROM cameras"):
                cameras.append({
                    "camera_id": row[0],
                    "model": CAMERA_MODELS.get(row[1], str(row[1])),
                    "width": row[2], "height": row[3],
                })
        images = []
        if "images" in tables:
            for row in conn.execute("SELECT image_id, name, camera_id FROM images LIMIT 50"):
                images.append({"image_id": row[0], "name": row[1], "camera_id": row[2]})
        return {
            "path": str(db.resolve()), "tables": tables, "row_counts": counts,
            "cameras": cameras, "images_sample": images, "schema_summary": SCHEMA_SUMMARY,
        }
    finally:
        conn.close()

def pair_id(image_id1: int, image_id2: int) -> int:
    if image_id1 > image_id2:
        image_id1, image_id2 = image_id2, image_id1
    return image_id1 * 2147483647 + image_id2
