# Geographic asset streaming transport — Issue #64
The `asset-transport.mjs` module is a **working, dependency-free, testable byte transport**:
- Same-origin HTTPS/HTTP fetches only, no embedded URL credentials.
- Bounded memory use; HTTP 206 and exact Content-Range required for archive slices.
- Complete GLB, KTX2, PMTiles v3 and 3D Tiles JSON byte checks with mandatory SHA-256 and length receipts.
- A PMTiles range segment is explicitly `UNVERIFIED_RANGE`: a successful HTTP Range request is **not** a complete-archive digest.
- Full SHA-256 verification yields `BYTE_INTEGRITY_ONLY`, never geodetic authority.

It does **not** implement PMTiles tile-directory decoding, 3D Tiles HLOD traversal or Babylon mesh mounting.
Those are distinct adapters; for actual format decoding prefer upstream maintained libraries:
`pmtiles` (Protomaps) and `3d-tiles-renderer` (NASA-AMMOS Babylon.js adapter).
Use a local, reviewed manifest and the project's existing geographic release gate before allowing
an external archive into public production. Do not mount the unregistered preview archive.
No credentials, public government datasets or other repository contents are changed by this module.
