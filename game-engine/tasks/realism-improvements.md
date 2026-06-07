# Realism Improvements

## Basically free

- [ ] **1. Uncomment the gun** — `player.render` is commented out in `src/index.js` (lines 101–107). The code is already written and working, just not being called.

- [x] **2. Parallax sky** — `clouds_1_508.jpg` moved to `assets/textures/sky/` and registered as `clouds_1`. Maps support an optional `skyTextureId` property; cells with no `ceilingTextureId` show the sky. Ray angle drives horizontal parallax. `map2.json` has sky enabled. Map editor supports "Set Sky", "Change Sky", "Remove Sky", and per-cell "Remove Ceiling" / "Set Ceiling".

## Quick wins

- [ ] **3. Head bobbing** — While moving, apply a small sinusoidal vertical offset to the horizon line during rendering. Use the same frequency as the gun sway (already computed in `player.js`). Costs nothing, adds significant feel.

- [ ] **4. Screen vignette** — After `putImageData`, draw a radial gradient from transparent center to semi-transparent black edges using a single canvas `fillStyle` call. Very cheap, immediately more cinematic.

- [ ] **5. Vertical look (pitch)** — Shift the horizon line up/down by offsetting `halfHeight` without changing ray angles — classic Wolfenstein trick. No raycasting cost, just changes where floor/wall/ceiling boundaries are drawn. Makes spaces feel taller.

## Medium effort, high impact

- [ ] **6. Colored light zones** — Store a light color tint per map cell and apply it during wall/floor rendering. Enables red emergency zones, warm yellow corridors etc. Transforms atmosphere completely.

- [ ] **7. Animated textures** — Cycle through texture frames (e.g. a flickering light) by swapping `wallTextureId` references on a timer. Requires multi-frame textures but the render path needs no changes.

- [ ] **8. Distance fog color** — Currently shade clamps to a minimum grey. Lerp toward a fog color (e.g. dark blue) at distance instead of just darkening. Much more atmospheric.

## Larger but raycaster-authentic

- [ ] **9. Transparent / glass walls** — Continue casting the ray past a semi-transparent cell and blend the two wall colors. Classic raycaster trick, requires a second pass per column only for those cells.

- [ ] **10. Shooting + hit detection** — A raycast along the centre ray on click, checking for sprite hits. Natural extension of what `castWallRay` already does. The gun asset is already rendered (task 1).

- [ ] **11. Enemy sprites with simple patrol AI** — Dynamic sprites already render correctly via the network path. Local AI enemies would use the same sprite system without needing the server.
