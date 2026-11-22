# v1.9.7 — Footprint collision and wheel-ground response

The playable Three.js game now tests the player capsule's horizontal disc against each **actual building footprint polygon**, including concave shapes and reversed winding. A uniform spatial hash performs broadphase selection. This is more precise than the old axis-aligned rectangular approximation, though the vertical collider is still an **extruded 2.5D polygon** rather than a triangle mesh / fully dynamic rigid body. Building shapes originate from the existing game-derived data, not a certified survey.

The stair/grade controller permits small risers under the configured step height and refuses taller walls/steep ascents; downhill movement is permitted. There are no independently authored staircases, handrails, moving lifts, roof collisions, or dynamic contact impulse solver. The mechanism follows Rapier's high-level autostep/snap-to-ground design principles (https://rapier.rs/docs/user_guides/javascript/character_controller/), but uses original local implementation and **does not ship or claim Rapier**.

The new `vehicle-suspension.js` samples four wheel ground contact points, computes pitch and roll, and integrates a damped spring for visual body offset. It helps the car follow hills but **is not a physically accurate rigid-body suspension**: there is no tire friction/contact manifold, braking torque, wheel spring impulse, vehicle center-of-mass dynamics or drivetrain solver.

All new logic runs offline using local terrain samples. The visual game and original save slots remain. Regression tests cover concave/winding footprint collision, stair grade limits, and suspension settling/bounds.

## Reproduction
```
cd game
npm test
npm run build
python3 tests/browser_hero_smoke.py
```

The original River v1.9.6 27-bone/13-clip authored motions and synthesized soundscape remain available, with no newly licensed recordings. A future **recorded** sound library and external motion-capture set require assets and provenance/permission, and cannot be certified by purely procedural synthesis.

## Physical iPhone validation gate
The existing `Export iPhone FPS` feature records real on-device frame time, FPS, draw calls, and triangles. Hardware evidence still requires launching this release in iPhone Safari, capturing at least two traversals in representative downtown, river, woods and farm scenes, and saving the resulting JSON plus device model/iOS/thermal notes. Neither desktop Chromium emulation nor a generated report with a fabricated user agent counts. Device GPU memory is not available from WebGL and is never invented.

Status must be determined from the exact GitHub PR, main CI, asset synchronization, Pages deployment, and live-version check separately.