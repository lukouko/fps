// Stub browser globals.
global.navigator = { userAgent: '' };
global.document = { documentElement: {} };

import * as constants from './constants';
import { initialise, render } from './mini-map';

const makeCtx = () => ({
  fillStyle: '',
  strokeStyle: '',
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
});

const makeMap = () => [
  [{ wallTextureId: 1 }, { wallTextureId: 2 }],
  [null, { floorTextureId: 1 }],
];

const playerOrientation = {
  angle: 0,
  position: { x: 256, y: 256 },
};

describe('initialise', () => {
  test('returns undefined without throwing', () => {
    expect(() => initialise()).not.toThrow();
    expect(initialise()).toBeUndefined();
  });
});

describe('render', () => {
  test('calls fillRect for every map cell', () => {
    const ctx = makeCtx();
    const map = makeMap();
    render({ canvasContext: ctx, playerOrientation, mapLayout: map, wallRays: [] });
    // 4 cells in the 2x2 map + 1 for the player square
    expect(ctx.fillRect).toHaveBeenCalledTimes(4 + 1);
  });

  test('wall cells use CELL colour', () => {
    const ctx = makeCtx();
    render({ canvasContext: ctx, playerOrientation, mapLayout: makeMap(), wallRays: [] });
    // Verify that at some point fillStyle was set to the wall colour.
    // We inspect the mock calls by tracking fillStyle assignments via a recording proxy.
    const styles = [];
    const recordingCtx = {
      ...makeCtx(),
      set fillStyle(v) { styles.push(v); },
      get fillStyle() { return ''; },
    };
    render({ canvasContext: recordingCtx, playerOrientation, mapLayout: makeMap(), wallRays: [] });
    expect(styles).toContain(constants.colours.CELL);
  });

  test('walkable cells use black', () => {
    const styles = [];
    const recordingCtx = {
      ...makeCtx(),
      set fillStyle(v) { styles.push(v); },
      get fillStyle() { return ''; },
    };
    render({ canvasContext: recordingCtx, playerOrientation, mapLayout: makeMap(), wallRays: [] });
    expect(styles).toContain('black');
  });

  test('player is rendered with MINIMAP_PLAYER colour', () => {
    const styles = [];
    const recordingCtx = {
      ...makeCtx(),
      set fillStyle(v) { styles.push(v); },
      get fillStyle() { return ''; },
    };
    render({ canvasContext: recordingCtx, playerOrientation, mapLayout: makeMap(), wallRays: [] });
    expect(styles).toContain(constants.colours.MINIMAP_PLAYER);
  });

  test('each wallRay triggers beginPath/stroke', () => {
    const ctx = makeCtx();
    const wallRays = [
      { source: { angle: 0 }, distance: 100 },
      { source: { angle: Math.PI / 4 }, distance: 200 },
    ];
    render({ canvasContext: ctx, playerOrientation, mapLayout: makeMap(), wallRays });
    // 2 wall rays + 1 player direction ray = 3 beginPath calls
    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
  });

  test('zero wallRays still renders player direction ray', () => {
    const ctx = makeCtx();
    render({ canvasContext: ctx, playerOrientation, mapLayout: makeMap(), wallRays: [] });
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  test('cell size is derived from MINIMAP_SCALE and CELL_SIZE', () => {
    const ctx = makeCtx();
    render({ canvasContext: ctx, playerOrientation, mapLayout: [[{ wallTextureId: 1 }]], wallRays: [] });
    const expectedSize = constants.MINIMAP_SCALE * constants.CELL_SIZE;
    // First fillRect call is for cell [0][0].
    const [, , w, h] = ctx.fillRect.mock.calls[0];
    expect(w).toBeCloseTo(expectedSize);
    expect(h).toBeCloseTo(expectedSize);
  });
});
