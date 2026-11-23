# Player experience, controls and character visual QA (2026-11-23)

Status: implementation candidate. This document is a plan and acceptance matrix; Node/Chromium CI does not validate device ergonomics or physical iPhone performance.

## Input sources
- Keyboard: WASD/arrow movement, Shift sprint, J jump, E interact, M map, Escape opens a true pause menu. Legacy activity shortcuts remain.
- Touch: existing D-pad/Action/Jump continue, optionally left-handed. Minimum game touch targets are 48 CSS px; respect safe-area edges.
- Standard gamepads only: left stick/d-pad movement, A jump, X interact, Y map, triggers sprint, Start pause, B resume. Nonstandard mappings are not guessed.
- When paused, simulation/gameplay counters and FPS capture do not advance. Rendering stops on the last frame; the settings layer remains operable. No gameplay input reaches the world.
- On tab visibility loss, pause single-player game and require deliberate resume.

## Local preferences
Allowlisted booleans: largeText, highContrast, reducedMotion, compactHud, leftHandedTouch, showHints, gamepadEnabled. Stored in one versioned device-local key; never uploaded. Malformed or unavailable storage falls back to defaults. Do not include saved names or other PII in device benchmark exports.

## Character acceptance beyond structural tests
- Side-by-side reference art against the opt-in River and Scout, consistent orthographic camera/lighting and front, profile, 3/4, rear views.
- On real skinning: validate sampled posed vertices remain finite and move relative to bind pose; quantify 17 samples for each animation; preserve weights/normals/tangents/UVs and PBR slot handling.
- Separate hand/grip tests (fishing rod, cooking spoon, binoculars), cloth/body intersections, fingers, gaiter glasses alignment, knee/elbow bending, silhouette and hands at LOD1/2.
- Scout: real paws must plant on uneven terrain, animation blends and turns must not slide; evaluate follow and interaction in gameplay rather than offline loops alone.
- Physical iPhone Safari: measure FPS distribution (p50/p95/p99 frame time), device model, Safari/iOS version, thermal and memory behavior, responsive touch hit targets and orientation. Asset hash must be present.
- Production switch stays OFF until tests, reference-matched art review and real hardware evidence pass. No fabricated 1:1 likeness claim.

## Source research
- Apple HIG Games: https://developer.apple.com/design/human-interface-guidelines/designing-for-games
- Apple game controls: https://developer.apple.com/design/human-interface-guidelines/game-controls
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- MDN Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- Google Playables design: https://developers.google.com/youtube/gaming/playables/certification/best_practices_design
- Skinned Motion Retargeting with Spatially Adaptive Interaction Guidance: https://www.alphaxiv.org/abs/2605.19355

Game content and geographic data remain explicitly game/reference data; this UI work does not turn scenery into a surveyed digital twin.
