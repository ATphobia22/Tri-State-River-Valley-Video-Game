# v1.9.1 Character Studio — River Valley Family Adventure

The new Character Studio makes the user's hero design visible at a closer camera distance inside the **same playable Three.js world**. Open Settings -> Inspect the Explorer; the map, missions and bottom toolbar hide while the inspector is active. A closer, face-facing camera shows the original articulated procedural character, including its skull-pattern gaiter, curled hair, glasses, necklace, dark outfit and backpack.

The pose chooser cycles: idle, walk, run, sprint, jump, land, interact, farm, fish, hunt, cook, and seated driving. These are in-game pose previews using the same real character, animation sampler and activity gear (rod, binoculars, cooking utensil) as live exploration. The user can save a browser screenshot and return to gameplay, restoring the original camera distance/yaw without modifying any save slot.

The Inspector is unavailable in 2D-only contexts and explains that limitation rather than displaying a broken view. It does not require an account, remote character file, API, image stream, or network service. The character remains procedural geometry rather than a high-poly skinned humanoid rig or motion capture. Jump is an illustrative key pose and not collision-driven.

Production checks:
- 4 focused Character Studio tests for element IDs, pose controls, close/restore-camera behavior, 2D fallback, and debug visibility.
- Full 3D gameplay and offline packaging suites before publishing.
- Actual device GPU/facial appearance requires an independent on-device visual review.
