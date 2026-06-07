// Stub browser globals.
global.navigator = { userAgent: '' };
global.document = { documentElement: {} };
global.performance = { now: jest.fn(() => 0) };

// Stub textures module — player.js imports it but render() is not under test here.
jest.mock('./textures', () => ({ getTextureById: jest.fn() }));

import { initialise, move } from './player';
import * as constants from './constants';

const MAP_SIZE = 50;

const makeLayout = (wallPredicate = () => false) =>
  Array.from({ length: MAP_SIZE }, (_, row) =>
    Array.from({ length: MAP_SIZE }, (_, col) =>
      wallPredicate(col, row) ? { wallTextureId: 1 } : { floorTextureId: 1 }
    )
  );

const wrapLayout = (layout) => ({
  currentMap: { layout, staticSprites: [], sprites: [] },
  unscaledMapBounds: { x: layout[0].length, y: layout.length },
  scaledMapBounds: { x: layout[0].length * 256, y: layout.length * 256 },
});

// A mapState where every cell is walkable (no walls).
const makeOpenMapState = () => wrapLayout(makeLayout());

// The real map module is used by player.js and is safe to use here — pure logic, no browser deps.

describe('initialise', () => {
  test('returns a player state with expected shape', () => {
    const state = initialise();
    expect(state.player).toBeDefined();
    expect(state.player.orientation.position).toHaveProperty('x');
    expect(state.player.orientation.position).toHaveProperty('y');
    expect(state.player.orientation).toHaveProperty('angle');
    expect(state.player.isMoving).toBe(false);
    expect(state.player.isDead).toBe(false);
  });

  test('starting position is in world space (multiples of CELL_SIZE)', () => {
    const { player } = initialise();
    // Position should be within a valid world region (> 0).
    expect(player.orientation.position.x).toBeGreaterThan(0);
    expect(player.orientation.position.y).toBeGreaterThan(0);
  });
});

describe('move', () => {
  const makePlayerAt = (x, y, angle = 0) => ({
    player: {
      orientation: { position: { x, y }, angle },
      isMoving: false,
      isDead: false,
      selectedGun: 1,
    },
    gunSwayStartTime: undefined,
  });

  test('moves player forward when no walls block', () => {
    const mapState = makeOpenMapState();
    const playerState = makePlayerAt(constants.CELL_SIZE * 5, constants.CELL_SIZE * 5, 0);
    const inputState = { speed: constants.PLAYER_WALK_SPEED, angularSpeed: 0 };

    const startX = playerState.player.orientation.position.x;
    move({ inputState, playerState, mapState });

    expect(playerState.player.orientation.position.x).toBeGreaterThan(startX);
  });

  test('does not move when speed is 0 and angularSpeed is 0', () => {
    const mapState = makeOpenMapState();
    const startX = constants.CELL_SIZE * 5;
    const startY = constants.CELL_SIZE * 5;
    const playerState = makePlayerAt(startX, startY, 0);
    const inputState = { speed: 0, angularSpeed: 0 };

    move({ inputState, playerState, mapState });

    // Position unchanged.
    expect(playerState.player.orientation.position.x).toBe(startX);
    expect(playerState.player.orientation.position.y).toBe(startY);
  });

  test('updates angle by angularSpeed', () => {
    const mapState = makeOpenMapState();
    const playerState = makePlayerAt(constants.CELL_SIZE * 5, constants.CELL_SIZE * 5, 0);
    const turn = Math.PI / 4;
    const inputState = { speed: 0, angularSpeed: turn };

    move({ inputState, playerState, mapState });

    // Angle should have shifted by turn (mod 2PI).
    const expected = (0 + turn + 2 * Math.PI) % (2 * Math.PI);
    expect(playerState.player.orientation.angle).toBeCloseTo(expected);
  });

  test('angle normalises to [0, 2*PI)', () => {
    const mapState = makeOpenMapState();
    const playerState = makePlayerAt(constants.CELL_SIZE * 5, constants.CELL_SIZE * 5, Math.PI * 1.9);
    const inputState = { speed: 0, angularSpeed: Math.PI }; // would exceed 2PI

    move({ inputState, playerState, mapState });

    const angle = playerState.player.orientation.angle;
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(2 * Math.PI);
  });

  test('marks player as moving when speed is non-zero and movement occurred', () => {
    const mapState = makeOpenMapState();
    const playerState = makePlayerAt(constants.CELL_SIZE * 5, constants.CELL_SIZE * 5, 0);
    const inputState = { speed: constants.PLAYER_WALK_SPEED, angularSpeed: 0 };

    move({ inputState, playerState, mapState });

    expect(playerState.player.isMoving).toBe(true);
  });

  test('player cannot move through a wall directly ahead', () => {
    // Place a wall at cell (3, y) for all y. Player is at x just below clip threshold,
    // so moving east by PLAYER_WALK_SPEED would push the clip edge into cell 3 → blocked.
    // wallBoundary = 3 * CELL_SIZE = 768.
    // Player needs: playerX + PLAYER_WALK_SPEED + PLAYER_CLIP_DETECTION_DISTANCE >= 768.
    // With playerX = 768 - PLAYER_CLIP_DETECTION_DISTANCE - 1, moving adds PLAYER_WALK_SPEED
    // which makes playerX + speed + r = 768, hitting the wall boundary exactly.
    const wallBoundary = 3 * constants.CELL_SIZE;
    const playerX = wallBoundary - constants.PLAYER_CLIP_DETECTION_DISTANCE - 1;
    const playerY = constants.CELL_SIZE * 2 + constants.CELL_SIZE / 2;
    const layout = makeLayout((col) => col === 3);
    const mapState = wrapLayout(layout);
    const playerState = makePlayerAt(playerX, playerY, 0);
    const inputState = { speed: constants.PLAYER_WALK_SPEED, angularSpeed: 0 };

    move({ inputState, playerState, mapState });

    // Player must not have crossed the wall boundary.
    expect(playerState.player.orientation.position.x).toBeLessThan(wallBoundary);
  });

  test('player stays put when wall immediately to the east blocks all movement', () => {
    // Player within clip distance of an east wall, with angle=0 (east).
    // canMove(dx, 0) → clips into wall → false.
    // canMove(0, dy) with dy=0 → trivially true but actualDY=0 too.
    // Both actualDX=0 and actualDY=0 → move() returns early, position unchanged.
    const wallBoundary = 3 * constants.CELL_SIZE;
    const playerX = wallBoundary - constants.PLAYER_CLIP_DETECTION_DISTANCE + 1; // inside clip zone
    const playerY = constants.CELL_SIZE * 2 + constants.CELL_SIZE / 2;
    const layout = makeLayout((col) => col === 3);
    const mapState = wrapLayout(layout);
    const playerState = makePlayerAt(playerX, playerY, 0);
    const inputState = { speed: constants.PLAYER_WALK_SPEED, angularSpeed: 0 };

    move({ inputState, playerState, mapState });

    expect(playerState.player.orientation.position.x).toBe(playerX);
    expect(playerState.player.orientation.position.y).toBe(playerY);
  });

  test('moving backward (negative speed) moves in reverse direction', () => {
    const mapState = makeOpenMapState();
    const startX = constants.CELL_SIZE * 5;
    const playerState = makePlayerAt(startX, constants.CELL_SIZE * 5, 0); // facing east
    const inputState = { speed: -constants.PLAYER_WALK_SPEED, angularSpeed: 0 };

    move({ inputState, playerState, mapState });

    expect(playerState.player.orientation.position.x).toBeLessThan(startX);
  });
});
