# RIVER VALLEY — FAMILY ADVENTURE WORLD BIBLE v1.0

**Identity:** cozy exploration, life simulation, farming, regional history, river travel and family memories. **Primary rule:** believable sense of place beats unverified survey precision. A fictional adventure inspired by real southern Indiana, southeastern Illinois and western Kentucky.

## Region design: six chapters

| Chapter | Real-world inspiration | Fictional gameplay loop | Build status |
|---|---|---|---|
| 1 — Mount Vernon Homecoming | Mount Vernon historic square, waterfront / Riverbend Park, Ohio River port | On-foot exploration, car trip, six discovery stamps, local photos, farm minigame | **Playable vertical slice**; 2D smoke tested, 3D not GPU-validated |
| 2 — New Harmony Storybook | Historic New Harmony, Atheneum, Harmonist Labyrinth, Wabash River | Nonviolent mysteries, festival quests, architecture puzzle | Design reference only |
| 3 — Hovey Cypress Nights | Hovey Lake Fish & Wildlife Area, bald-cypress wetlands near Ohio–Wabash floodplains | Wildlife photo journal, canoe trip, lantern trail, marsh sounds | Design reference only |
| 4 — Harmonie Hills | Harmonie State Park, Wabash-side woods and ravines | Camping, biking, nature quests, seasonal fireflies | Design reference only |
| 5 — Illinois River Crossing | Old Shawneetown and Gallatin County river heritage | Ferry story, antique scavenger hunt, historic trade puzzles | Design reference only |
| 6 — Kentucky Birdsong | Henderson waterfront, John James Audubon State Park | Birdwatching, painted wildlife cards, family picnic, meadow trails | Design reference only |

The proposed map must be **multi-chapter / streaming** instead of stretching the 4.9 km Mount Vernon preview terrain over the entire tri-state. A separate licensed geographic source, CRS provenance, terrain mesh, roads, and landmark asset set are needed for each destination. Do not imply those areas are already contained in `VALLEY_DATA`.

## Signature game mechanics

### Implemented

1. Six nonviolent discovery stops, each granting an experience stamp, coins and XP once per save.
2. A repeatable 3 × 3 farm activity: sow, wait, water to shorten growth and harvest.
3. Drive/walk modes; companion dog Scout; simple third-person chase camera and scenic auto-tour.
4. Local screenshot mode, day/night illumination, weather and season presentation settings.
5. Three on-device save slots with resilient parsing, no account or analytics.
6. Mouse/keyboard/touch input, 2D game fallback when WebGL is unavailable.
7. Earn 250 coins from memories and farming to construct a personal family cottage at fictional Oak Grove; the build is saved and visible in both views.

### Next release candidates, not implemented

- Proper wheeled-vehicle physics (WheelColliders in Unity), road surface navigation, full controller remapping and support for multiple controllers.
- A playable canoe and ferry with water interactions, fishing and photo-based birdwatching.
- Town-life simulation: furnished homes, friendly NPC routines, households, crafting, pets and family co-op.
- Long-form story quests: festivals, scavenger hunt, weather-dependent collectibles and seasonal festivals.
- Unity 6 URP native builds for Windows and mobile, asset streaming with asynchronous loading, graphics options, memory budgets.
- An optional independent community web portal should be treated as a separate product, never a required login.

## Technical engine vision

**Current executable prototype:** offline HTML/JavaScript using locally bundled Three.js for optional WebGL, with 2D Canvas as a graceful fallback. Core gameplay does not depend on network requests, location services, external maps or government APIs. Use Web Audio only for original synthesised notification notes.

**Longer-term engine:** Unity 6 LTS with URP (native Windows first, then iOS after performance testing) or a comparably supported engine. Adopt a `WorldStreamer` with spatial chunks, HLOD/instancing, origin rebasing, local scene-specific POI IDs, save migration, deterministic procedural generation, and gameplay-tested scene gates. Build runtime packages locally, not on the TSM repository.

**Grounding:** distinguish (1) supplied user prototype datasets; (2) official regional landmarks and background references; and (3) fictional gameplay geometry. Keep OSM/agency source credits and asset licenses in build manifests. Never use flood simulation graphics as real-time hazard guidance.

## Official/public reference locations

- Mount Vernon Parks: https://www.mountvernonin.gov/209/Parks-Pool-Community-Center
- Mount Vernon Riverfront: https://visitposeycounty.com/partners/mt-vernon-riverfront
- Mount Vernon Historic District: https://visitposeycounty.com/partners/mt-vernon-historic-district
- Historic New Harmony (University of Southern Indiana): https://www.usi.edu/hnh/
- Hovey Lake (Indiana DNR): https://www.in.gov/dnr/fish-and-wildlife/properties/hovey-lake-fwa/
- Harmonie State Park (Indiana DNR): https://www.in.gov/dnr/state-parks/parks-lakes/harmonie-state-park/
- Historic Gallatin County (Illinois): https://gallatinco.illinois.gov/about/special-features-of-historic-interest/
- Henderson Kentucky: https://hendersonky.org/
- Audubon State Park (Kentucky): https://parks.ky.gov/explore/john-james-audubon-state-park-7815

Sources above inform *creative design*. They do not license third-party photos, building textures or branded logos for reuse.

## Release gates before calling it a completed cross-platform game

1. Native Unity Editor compile and Windows player build independently verified; iOS device build tested separately.
2. GPU rendering capture on target devices for 3D: FPS, frame timings, stability, memory, heat and battery.
3. Third-party asset licensing and OSM/database rights reviewed; game data accuracy claims removed or supported.
4. Save-slot migration and recovery on actual Windows, iPhone and iPad browsers.
5. Accessible controls, subtitle/caption policy, color and contrast QA, controller input and child-friendly defaults.
6. Three complete, physically distinct cross-state region maps (IN, IL, KY) and story content—not shared fake coordinates.
