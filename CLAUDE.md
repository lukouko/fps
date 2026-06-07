# FPS Raycaster — CLAUDE.md

> **Keep this file up to date.** After any change that affects architecture, constraints, conventions, testing setup, or project goals, update the relevant section here.

## Project overview

Vanilla-JS browser FPS raycaster built as a hobby project, targeting a multiplayer conference demo where attendees play together in the same game world. No 3rd-party rendering libraries — everything is software-rendered via the Canvas 2D API and direct pixel buffer manipulation. Performance is a primary concern.

**End goal:** a playable multiplayer FPS that runs in a browser, demoed at an internal dev conference.

---

## Repo layout

```
fps/
  game-engine/   # core FPS renderer + game loop (vanilla JS, webpack)
  map-editor/    # visual map editor (React)
  server/        # WebSocket server for multiplayer (Node.js)
  babel.config.js
```

---

## game-engine

### Key files

| File | Purpose |
|---|---|
| `src/index.js` | Entry point. Wires up game state, starts the fixed-rate logic tick (`setInterval` at 20ms) and the vsync-synced render loop (`requestAnimationFrame`). |
| `src/scene.js` | Raycaster. Casts one ray per screen column, renders walls/floor/ceiling/sprites to the offscreen buffer. The hot path — performance changes go here. |
| `src/player.js` | Player state, movement (with wall-sliding), gun sway animation. |
| `src/map/index.js` | Map state init, cell lookup (`getMapCell`), bounds checks, `validateMap`. |
| `src/helpers.js` | Pure math utils: `distanceBetween`, `generateDisplayInfo`, `degToRadians`, `normaliseRadians`. Good test targets — no browser dependencies. |
| `src/constants.js` | Game constants. Uses `module.exports` (CommonJS), not ESM — all other files use ESM. |
| `src/offscreen-buffer.js` | `OffScreenBuffer` class. Owns the `Uint8ClampedArray` pixel buffer. `drawVerticalBufferSlice` does bilinear-filtered wall column rendering. |
| `src/textures.js` | Loads image assets into pixel buffers at startup. `getTextureById` is called per-frame. |
| `src/inputs.js` | Keyboard and touch input handlers. Mutates a shared `inputs` object. |
| `src/mini-map.js` | Minimap overlay drawn on top of the main canvas. |
| `src/network-client.js` | WebSocket client — sends player position, receives other player positions as dynamic sprites. |
| `src/types.js` | JSDoc `@typedef` declarations only. No runtime code (except `export const Types = {}`). |

### Architecture

- **Game loop:** Two decoupled loops. `setInterval` at 20ms drives logic (player movement, network sync) at a fixed rate. `requestAnimationFrame` drives rendering — synced to the display's vsync for stutter-free output. Render resolution is derived from window aspect ratio at startup (`RENDER_HEIGHT` constant in `index.js` is the tuning knob).
- **Rendering pipeline:** `scene.render` → DDA raycast per column → `renderWallRay` (writes to pixel buffer) → `renderSprites` (painter's algorithm) → `putImageData` to canvas.
- **Offscreen buffer:** `OffScreenBuffer` holds a `Uint8ClampedArray` (RGBA). All pixel writes go here; one `putImageData` call per frame flushes to the visible canvas.
- **Map space:** `CELL_SIZE = 256` pixels in world space. Map JSON uses unscaled cell indices. Player position and collision points are in scaled (world) space.
- **Sprite depth testing:** Uses cosine-corrected perpendicular distance (not Euclidean) to match wall depth correctly at wide angles.

### Hard constraints

- **No 3rd-party rendering packages.** Canvas 2D API and software pixel manipulation only.
- **Vanilla JS** — no frameworks in the game engine.
- **Performance first.** Prefer bitwise ops (`| 0` for floor, `>> 8` for divide-by-256 shade), typed arrays, and precomputed lookup tables over clarity. Hot-path functions in `scene.js` and `offscreen-buffer.js` are already heavily optimised — don't regress them.
- **Changes must match existing code style/layout.** Don't introduce new abstractions unless the task clearly requires them.

### Code style

- **Named parameters everywhere.** All functions take a single destructured object: `fn({ paramA, paramB })`. Never positional args.
- **JSDoc types.** All types are declared in `game-engine/src/types.js` as `@typedef` — this is the single source of truth for type definitions. Every type used in the codebase must have a corresponding `@typedef` there. Annotate all functions with `@param` and `@returns` referencing those types. No TypeScript. **Keep `types.js` up to date** — any new type introduced by a change must be added there before (or alongside) the code that uses it.
- **Comments:** don't over-comment, but a short comment explaining what a block of code does is welcome — especially in the raycasting logic where the math isn't self-evident. Always comment hidden constraints, non-obvious invariants, and performance tricks. Avoid restating what well-named code already says.
- **`constants.js` is CommonJS** (`module.exports`). Everything else is ESM (`import`/`export`). Don't change this.
- **Module pattern:** Each file exports a set of named functions. State is passed explicitly — no global singletons except `localCache` in `scene.js` and `texturesLookup` in `textures.js` (these are module-level intentionally).

### Map format

Maps are JSON files in `src/map/`. Each cell is `{ wallTextureId?, floorTextureId?, ceilingTextureId? }`. A cell with `wallTextureId` is solid; without it, it's walkable and needs floor/ceiling textures. `staticSprites` are decoration (never updated by server); `sprites` are dynamic (replaced by server updates each tick).

The map object supports an optional top-level `skyTextureId` field. When set, any walkable cell with no `ceilingTextureId` shows the sky texture with horizontal parallax driven by the ray angle. Sky textures live in `src/assets/textures/sky/`.

### Dev server

```bash
cd game-engine
npm run serve   # webpack-dev-server on port 5006
```

---

## Testing

- **Framework:** Jest. Installed globally at v30.4.1 — use that version as the compatibility target.
- **Babel:** `babel.config.js` at the repo root already has a `test` env with the needed plugins (`@babel/plugin-transform-modules-commonjs` etc.) — tests will transpile correctly.
- **Test files:** Co-locate with source: `src/helpers.test.js`, `src/map/index.test.js`, etc.
- **Best test targets:** `helpers.js`, `map/index.js`, `player.js` (`move` function), `offscreen-buffer.js` — these are pure logic with no or minimal browser API dependencies.
- **Browser API stubs:** `OffScreenBuffer` requires `document.createElement('canvas')`. Use `jest-canvas-mock` or a minimal stub; don't fight it — test the pixel math directly if possible by pulling logic into pure functions.
- **Run tests after every code change.** All tests must pass before a change is considered done.
- **New functionality requires new tests.** Any new function or behaviour must have corresponding test coverage added in the same change.
- **Run tests:**
  ```bash
  cd game-engine
  jest   # or: npx jest (if global jest isn't on PATH)
  ```

---

## map-editor

React app for visually building maps. Outputs JSON compatible with the game engine map format. Uses webpack + Babel. Not performance-sensitive. Run with `npm run serve` inside `map-editor/`.

Key files: `src/services/` contains non-React logic (camera, map, scene, textures) mirroring the game engine's structure.

---

## server

Node.js WebSocket server. Receives player positions from clients, broadcasts the full player list back as a sprite list. Stateless per-tick — no persistent game state on the server. Start with `node app.js` inside `server/`.

Key files: `app.js` (WS server), `message-factory.js` (message serialisation), `constants.js` (shared message type strings).

---

## What to avoid

- Don't merge the logic and render ticks back into a single loop. Logic runs at a fixed rate (`setInterval`); rendering is vsync-synced (`requestAnimationFrame`). Keep them separate.
- Don't add 3rd-party rendering or math libraries.
- Don't refactor working hot-path code (`scene.js`, `offscreen-buffer.js`) without a concrete performance or correctness reason.
- Don't add error handling for cases that can't happen in normal operation — trust internal invariants.
- Don't write multi-line comment blocks or docstrings for self-evident code.
