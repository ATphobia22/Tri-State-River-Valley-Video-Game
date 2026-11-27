# Synoptic Panel geographic asset admission monitor

An optional operations artifact for OKVIZ Synoptic Panel in Power BI, not a
geographic map, 3D game asset, or engineering release certificate.

The three bindable SVG area IDs come directly from
game/data/geographic/source-registry.json. Use the CSV id field as Power BI's
Category/key column and registration_status or verified for data color/value.
This is a snapshot of the registry: every source is candidate_unverified.
No actual ion status, EPT CRS, vertical datum or ground-control survey was
verified by generating this visualization.

Rebuild after registry updates:

    python3 game/tools/build_source_admission_synoptic.py --write

Verify the checked-in outputs exactly match source registry:

    python3 game/tools/build_source_admission_synoptic.py --check
    node --test game/tests/test-source-admission-synoptic.cjs

If the registry gains a source, the script fails closed instead of omitting it.
Extend the layout and captions, then rerun --write and validate. Power BI import
is manual; the SVG is not embedded in the Babylon runtime. The SVG is
vector-only, with neutral resting fills and all decorative elements marked
non-bindable. Use this status view only to direct validation work.
