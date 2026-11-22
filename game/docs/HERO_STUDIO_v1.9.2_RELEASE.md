# River Valley Family Adventure — Character Studio runtime repair (v1.9.2)

## Defects reproduced in a real browser

The initial v1.9.1 character studio shipped successfully as a static bundle but two defects were not caught by the JavaScript source tests:

1. The `heroStudio` dialog was written *after* the synchronous blocking game script. The script attempted to attach events to `heroStudioClose` before the browser had parsed the element, causing `Cannot read properties of null (reading 'addEventListener')` and preventing startup.
2. Character Studio reused the game's world camera at the player's terrain height. On rugged terrain, the camera could be buried within a hillside and entirely conceal the hero.

## Repair and redesign

- All Character Studio UI elements are now placed before the runtime script in `index.html`. A regression test asserts the DOM parse ordering, not merely element presence.
- `src/hero-stage.js` creates a **separate, original Three.js preview scene** for River the Explorer. The character model and animation module are the same as during gameplay, but the studio receives its own perspective camera, three-point lighting, glowing stage ring, floor and colored backdrop. Terrain, houses and vegetation can no longer obscure the inspector.
- The stage camera has separate framing presets for landscape and portrait screens; the portrait HUD is compact, hides touch movement controls, and keeps the hero visible above the controls.
- The studio retains the previous world camera yaw/distance for return to gameplay. It does not change user saves, movement coordinates, inventory or mission state.
- The enhanced inspector supports the original twelve pose options and photo capture. All graphics are local and included in the single-file offline build.

## Release evidence

- `tests/test-hero-studio.cjs`: DOM initialization order and close/reset behavior.
- `tests/test-hero-stage.cjs`: isolated stage scene, PBR preview lighting, camera resize and actual renderer callback.
- `tests/browser_hero_smoke.py`: **real headless Chromium + software WebGL**, with actual game initialization and desktop and mobile interactions. Starts gameplay, opens inspector, exercises five poses, exits, switches to drive, and records screenshots. A missing `window.RiverValleyDebug`, a failure to launch in WebGL, or any uncaught page exception fails the test.
- Browser runs with SwiftShader for a reproducible software implementation. This confirms WebGL operation but **does not certify iPhone Safari, a hardware GPU frame rate, or detailed artistic equivalence to the original concept illustration**.
- Deployment requires the self-contained hosted and downloadable offline HTML to include `ValleyHeroStage` and `ValleyHero`.

## Follow-on artistic development

The avatar remains an original articulated procedural character, not a skinned high-poly humanoid asset. Candidate next steps are a licensed or original rigged glTF/GLB, per-bone animation clips, foot IK, optional facial expressions, and improved gesture constraints. None requires survey-grade real-world mapping or engineering solvers.
