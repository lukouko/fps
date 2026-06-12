# Doors & Activation — Build Plan

Adds an "Activate" interaction (keyboard `E` / mobile button), a mobile analog
joystick, and doors that open/close. Built in small, independently-verifiable
tasks.

## Working rules (apply to every task)

- **One task at a time, in order.** Tackle sub-tasks (3.1, 3.2, 3.3) in sequence too.
- **Tests:** every task adds Jest unit tests for its pure logic and they must pass
  (`cd game-engine && npx jest`) before the task is considered done. Browser/canvas
  code is exercised by extracting the math into pure, testable helpers (per CLAUDE.md).
- **No commits until Luke verifies** the change in the running app. Mark the task's
  checkbox `[x]` only after tests pass; Luke commits after manual verification.
- **Follow CLAUDE.md:** named-object params everywhere, add every new type to
  `src/types.js` first, `constants.js` stays CommonJS, don't regress the raycaster
  hot path — gate any new per-column work behind a cheap `door` check.

## Design decisions (locked)

- Movement stays tank-style; the mobile joystick drives the existing
  continuous `speed`/`angularSpeed` — **no change to `player.move`**.
- Joystick is **floating** (spawns at first touch on the left half of the screen).
- Activate is **edge-triggered** (one action per press): keyboard `E`, mobile button bottom-right.
- A door cell carries its **own** `floorTextureId`/`ceilingTextureId` (explicit, no neighbour inheritance).
- "What am I looking at" uses the existing `centreRay` returned from `scene.render`
  (currently discarded in `index.js`) — no new raycasting for activation.
- Door state is **client-local** until Task 8, which moves the authoritative
  open/closed state to the server.

## Future (out of scope, but don't design it out)

- **Switches** that remotely unlock/toggle doors. Keep the activatable model
  general: a door has an optional `keyId` (Task 6) and we reserve room for a
  `triggerId` (on a target cell) + `targetTriggerId` (on a switch) so a later
  task can wire switch → door without reworking the data model.

---

## Task 1 — Mobile floating joystick (analog tank controls)

- [x] Done

**Goal:** Replace the four mobile movement/turn buttons with a single floating
joystick on the left half of the screen. Stick deflection drives `speed`
(Y axis, forward/back) and `angularSpeed` (X axis, analog turn).

**Changes:**
- `src/inputs.js`:
  - On `touchstart` in the left half: record the touch's start point as the stick
    centre and its `identifier`. On `touchmove`: compute the deflection vector from
    centre, clamp to a max radius, derive `speed`/`angularSpeed` scaled by deflection
    (with a small dead-zone). On `touchend` for that touch: reset stick + zero inputs.
  - Track the joystick touch by `identifier` so the right-side Activate touch
    (Task 2) is independent of the joystick.
  - Draw the floating stick (base ring + thumb) in `drawMobileControls`, only while active.
  - Remove the old `back`/`forward`/`left`/`right` button drawing + hit-testing.
- Extract a **pure helper** `computeJoystickInput({ dx, dy, maxRadius, deadZone, walkSpeed, maxAngularSpeed })`
  → `{ speed, angularSpeed }` (no canvas/DOM) so it is unit-testable.
- `src/types.js`: no new persisted types needed; document the helper's return shape if useful.

**Tests (`src/inputs.test.js`):**
- Centre/within-dead-zone → `{ speed: 0, angularSpeed: 0 }`.
- Full up / full down → ±`walkSpeed`; full left/right → ∓/± `maxAngularSpeed`.
- Deflection beyond `maxRadius` clamps (doesn't exceed max speed).
- Diagonal produces both axes.

**Verify:** On a touch device / emulator, drag the left half to move and turn smoothly.

---

## Task 2 — Activate input (`E` + mobile button)

- [ ] Done

**Goal:** Add an edge-triggered "activate" action consumed once per press.

**Changes:**
- `src/types.js`: add `activate: boolean` to the `Inputs` typedef.
- `src/inputs.js`:
  - Init `inputs.activate = false`.
  - Keyboard: set `activate = true` on `keydown` for `e`/`E`, **guarded so key-repeat
    fires it only once** (only set on a key that wasn't already down; clear the
    "down" flag on keyup).
  - Mobile: draw an Activate button bottom-right; its `touchstart` sets `activate = true`.
  - The consumer (Task 3) resets `activate = false` after handling.
- Extract a **pure helper** `reduceKeyToInputs` or `consumeActivate({ inputs })` if it
  keeps logic testable without DOM.

**Tests (`src/inputs.test.js`):**
- A press sets `activate = true`; consuming resets to `false`.
- Held key (repeat) does not re-set `activate` until released and pressed again.

**Verify:** Pressing `E` logs/fires once per press (temporary `console.log` ok), not continuously.

---

## Task 3 — Doors (engine)

### Task 3.1 — Binary door

- [ ] Done

**Goal:** A door cell that is solid when closed and walk-through when open,
toggled by activating it while looking at it within range.

**Data model:**
- A door cell in map JSON: `{ door: true, doorTextureId, floorTextureId, ceilingTextureId }`
  (and optional future `keyId`).
- Runtime fields added at init: `openness` (0 = closed, 1 = open).
- **Closed-door trick (keeps raycaster hot path untouched):** at init, a closed door
  gets `wallTextureId = doorTextureId`. Opening **deletes** `wallTextureId`; closing
  restores it. So the existing stop condition (`!mapCell?.wallTextureId`), the floor/
  ceiling caster, and the minimap all work unchanged. Binary doors need no
  `scene.js` changes.

**Changes:**
- `src/types.js`: extend `MapCell` with `door?`, `doorTextureId?`, `openness?`, `keyId?`.
  Add an `Activatable`/`ActivatableType` typedef if the registry needs one.
- `src/map/index.js`:
  - `initialise`: normalise every `door` cell → set `openness = 0` and
    `wallTextureId = doorTextureId` (closed).
  - `canMoveToCellLocation`: a door cell blocks unless `openness >= DOOR_OPEN_THRESHOLD`.
- `src/doors.js` (new module, matches the per-file named-function pattern):
  - `toggleDoor({ cell })`: closed → open (`openness = 1`, delete `wallTextureId`);
    open → closed (`openness = 0`, restore `wallTextureId = doorTextureId`).
  - `findActivatable({ centreRay, maxDistance })`: returns the door cell under the
    crosshair if it is a door and `centreRay.distance <= maxDistance`, else null.
  - A small `activatableTypes` registry seeded with `door` (used by Tasks 4 & 7).
- `src/constants.js`: add `ACTIVATION_DISTANCE` and `DOOR_OPEN_THRESHOLD`.
- `src/index.js`:
  - Capture `centreRay` from `scene.render` into `gameState` each render frame.
  - In `logicTick`: if `inputState.activate`, call `findActivatable` and `toggleDoor`,
    then reset `inputState.activate = false`.
- `src/map/map2.json`: add **one placeholder test door** using an existing texture id
  (e.g. `concrete_wall`) so this task is verifiable before the real texture (Task 5).

**Tests:**
- `src/map/index.test.js`: closed door blocks movement; open door (`openness = 1`) allows it.
- `src/doors.test.js`: `toggleDoor` flips `openness` and adds/removes `wallTextureId`;
  `findActivatable` respects `ACTIVATION_DISTANCE` and ignores non-door cells.

**Verify:** Walk to the test door, press `E` (or mobile button): it opens (walk through)
and toggles closed again.

### Task 3.2 — Auto-close timer

- [ ] Done

**Goal:** An open door closes itself after a delay.

**Changes:**
- `src/constants.js`: add `DOOR_AUTO_CLOSE_MS`.
- `src/doors.js`: track per-door open time; add `tickDoors({ mapState, deltaMs })`
  that closes any door open longer than `DOOR_AUTO_CLOSE_MS`. Opening (re)starts the timer.
- `src/index.js`: call `doors.tickDoors({ mapState, deltaMs })` in `logicTick`.
- (Single-player local) closing while the player stands in the doorway is acceptable
  for now; revisit blocking-on-occupant when enemies/other players exist.

**Tests (`src/doors.test.js`):**
- A door open past `DOOR_AUTO_CLOSE_MS` of accumulated `deltaMs` auto-closes.
- A door within the window stays open.
- Re-activating resets the timer.

**Verify:** Open a door, wait — it closes on its own.

### Task 3.3 — Slide animation

- [ ] Done

**Goal:** Doors animate open/closed instead of snapping. Implemented as a
Wolfenstein-style **inset sliding panel** so the opening is actually see-through
during the animation (the binary `wallTextureId` swap can't show the room behind a
half-open door).

**Approach:**
- Animate `openness` between 0 and 1 over `DOOR_SLIDE_MS` (driven by `tickDoors`);
  collision still uses `DOOR_OPEN_THRESHOLD`.
- Raycaster door handling (gated behind `if (cell.door)` so non-door rays are
  unaffected — protects the hot path): when a ray enters a door cell, advance it to
  the cell's mid-plane and test the sliding panel: the panel covers texels in
  `[openness, 1)` of the cell width. If the ray's mid-plane hit is within the covered
  region → collide and render the door (texture X offset by `openness`); otherwise the
  ray continues to the next cell (see through the gap).
- This supersedes the closed-door `wallTextureId` swap from 3.1 for door cells;
  keep `openness`/collision semantics identical so 3.1/3.2 tests still hold.
- Extract the panel-coverage / texel math into a **pure helper**
  (e.g. `doorPanelHit({ openness, offsetAlongCell, cellSize })`) for testing.

**Tests (`src/doors.test.js` or `src/scene.test.js`):**
- Fully closed (`openness = 0`): any mid-plane offset is covered (hits door).
- Fully open (`openness = 1`): nothing covered (ray passes).
- Half open: offsets below the slide line pass, above collide (or vice-versa per chosen slide direction).

**Verify:** Doors visibly slide open/closed and you can see through the widening gap.

---

## Task 4 — Map editor: door authoring

- [ ] Done

**Goal:** Place and configure doors visually in the React map editor; output stays
compatible with the engine map format.

**Changes (`map-editor/`):**
- Cell-paint mode for doors: sets `door: true`, `doorTextureId`, `floorTextureId`,
  `ceilingTextureId` on the cell.
- A dropdown for **activation type** sourced from the shared `activatableTypes`
  registry (door, and reserved room for future switch).
- Render door cells distinctly on the editor grid.
- Keep editor logic in `src/services/` (testable, non-React) per repo convention.

**Tests (`map-editor/src/services/*.test.js`):**
- The map service writes a well-formed door cell.
- Exported JSON round-trips and passes the engine's `validateMap` expectations.

**Verify:** Build a small map with a door in the editor, export it, load it in the engine.

---

## Task 5 — Add door texture & place doors in map2.json

- [ ] Done

**Depends on:** Luke supplying a door texture asset.

**Goal:** Register the real door texture and place a few doors in the main map.

**Changes:**
- Add the texture file under `src/assets/textures/`, register it in
  `src/assets/index.js` (id + import).
- `src/map/map2.json`: place a few doors (replacing the Task 3.1 placeholder) with the
  new `doorTextureId` and sensible floor/ceiling ids.
- Re-confirm `validateMap` passes for the updated map.

**Tests:**
- A map-load/validation test asserting the updated `map2.json` is valid and its door
  cells normalise correctly (`openness`, closed `wallTextureId`).

**Verify:** Doors appear with the real texture and open/close in the running game.

---

## Task 6 — Locked doors (lock flag)

- [ ] Done

**Goal:** A door with a `keyId` won't open unless the player "has" that key.
Key possession is a simple flag for now (no world pickup yet); designed so a
future switch can also satisfy/unlock it.

**Changes:**
- `src/types.js`: `keyId?` already reserved on `MapCell` (Task 3.1); add a `keys`
  set/flags to `PlayerState` (e.g. `player.keys: string[]`).
- `src/doors.js`: `canActivate({ cell, playerState })` — a door with `keyId` requires
  the player to hold that key; otherwise it stays closed and signals "locked".
  `toggleDoor` (or the activation path in `index.js`) consults `canActivate`.
- Minimal locked feedback for now (e.g. a transient flag the prompt task will render);
  full contextual messaging lands in Task 7.
- For testing, grant keys via a debug flag / initial `player.keys` value.

**Tests (`src/doors.test.js`):**
- Locked door with no matching key does not open.
- Same door opens once the player holds the matching key.
- Unlocked (no `keyId`) door is unaffected.

**Verify:** A locked door won't open without the key; granting the key (debug) lets it open.

---

## Task 7 — Activation prompt UI

- [ ] Done

**Goal:** Show a contextual on-screen prompt when looking at an activatable within
`ACTIVATION_DISTANCE`, e.g. `Press E to Open Door` / `Press E to Close Door` /
`Locked`. Message text is driven by the `activatableTypes` registry.

**Changes:**
- `src/doors.js` (or a small `src/activation.js`): `buildActivationPrompt({ cell, playerState, inputMethod })`
  → string (uses the type registry verbs; respects open/closed and locked state;
  swaps `Press E` vs a tap hint on mobile). Pure, testable.
- `src/index.js` render loop: using the captured `centreRay`, draw the prompt
  (centred, lower-middle) like the existing FPS text overlay.

**Tests (`src/doors.test.js` / `src/activation.test.js`):**
- Closed door → "Open" verb; open door → "Close" verb.
- Locked door → "Locked" message.
- Out of range / non-activatable → no prompt (null/empty).

**Verify:** Prompt appears/updates as you look at doors and changes with open/closed/locked state.

---

## Task 8 — Server-authoritative door state

- [ ] Done

**Goal:** Move the authoritative open/closed state to the server so all players see
consistent doors. Clients animate the slide locally toward the server's target state.

**Changes:**
- `server/constants.js`: add a `DOOR_ACTIVATE` client message type and a door-state
  field in `serverGameState` (per-door open/closed, keyed by cell coords).
- `server/message-factory.js`: include door state in `serverGameStateUpdate`.
- `server/app.js`: handle `DOOR_ACTIVATE` (toggle authoritative state, run the
  auto-close timer server-side), broadcast door state to all clients.
- `src/constants.js` / `src/network-client.js`: send `DOOR_ACTIVATE` on activation;
  apply incoming door state to `mapState` (set each door's target `openness`;
  local `tickDoors` animates toward it). Activation becomes "request to server"
  rather than a direct local toggle.
- `src/types.js`: extend the server/client message typedefs for door state.

**Tests:**
- Server (or message-factory) unit test: a `DOOR_ACTIVATE` toggles the stored door
  state and it appears in the broadcast payload.
- Client unit test: applying a server door-state update sets the door's target state
  on `mapState`.

**Verify:** Two browser clients connected; one opens a door, the other sees it open.
