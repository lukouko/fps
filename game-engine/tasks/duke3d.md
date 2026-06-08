# Duke3D-Style Improvements

## Basically free

- [ ] **1. Lower player eye height** — Change `PLAYER_HEIGHT` in `constants.js` from `CELL_SIZE / 2` (128) to around `CELL_SIZE * 0.35` (~89). Eye is closer to the floor, ceiling portion of walls is larger, rooms feel taller and more imposing without touching any rendering math.

## Quick wins

- [ ] **2. Vertical look / Y-shearing** — Add a `pitch` value to `Orientation`. In `renderWallRay`, offset the wall's screen Y by pitch: `halfHeight + pitch - halfWallHeight`. In the floor/ceiling loop, substitute `halfHeight + pitch` for `halfHeight`. Bind pitch to mouse Y or tilt keys. Allows players to look up at tall ceilings, which alone sells the "tall room" feel. No raycasting cost — pure screen-space shearing. (Task 5 in realism-improvements.md is the same idea — implement together.)

## Medium effort, high impact

- [ ] **3. Per-cell floor height offset** — Add an optional `floorZ` (world units, default 0) to walkable cells in the map JSON. When rendering a wall column, shift the wall's screen position by the height difference between the player's `floorZ` and the hit cell's `floorZ`, scaled by `distanceToProjectionPlane / distance`. The floor/ceiling projection formula changes from `PLAYER_HEIGHT` to `PLAYER_HEIGHT + playerFloorZ - cellFloorZ`. Gets you stairs, raised platforms, and sunken rooms purely from map data. The fiddliest part is updating the floor/ceiling per-pixel loop to account for the player's current floor Z.

## Larger, raycaster-authentic Duke3D feel

- [ ] **4. Per-cell ceiling height** — Natural follow-on to task 3. Add `ceilingZ` (default `CELL_SIZE`) to each cell. Wall projection uses `ceilingZ - floorZ` instead of `CELL_SIZE` for the wall's world-space height. Combined with `floorZ` this gives full sector-style geometry: low doorways, cathedral ceilings, outdoor areas with huge sky views. Map editor would need UI to set floor/ceiling Z per cell.
