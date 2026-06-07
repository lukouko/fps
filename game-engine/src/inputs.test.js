// Stub browser globals needed by imports.
const listeners = {};
global.document = {
  addEventListener: jest.fn((type, cb) => { listeners[type] = cb; }),
  documentElement: {},
};
global.navigator = { userAgent: '' };

import { initialise } from './inputs';
import * as constants from './constants';
import { degToRadians } from './helpers';

// Grab the raw handler callbacks that initialise() registers on document.
const fireKeyDown = (key) => {
  if (listeners.keydown) listeners.keydown({ key });
};
const fireKeyUp = (key) => {
  if (listeners.keyup) listeners.keyup({ key });
};

describe('initialise (KEYBOARD mode)', () => {
  let inputs;

  beforeEach(() => {
    listeners.keydown = undefined;
    listeners.keyup = undefined;
    inputs = initialise({ inputCanvasContext: null, inputMethod: 'KEYBOARD' });
  });

  test('returns default input state', () => {
    expect(inputs.speed).toBe(0);
    expect(inputs.angularSpeed).toBe(0);
    expect(inputs.enableMiniMap).toBe(false);
    expect(inputs.isRunning).toBe(false);
  });

  describe('keydown', () => {
    test('ArrowUp sets positive speed', () => {
      fireKeyDown('ArrowUp');
      expect(inputs.speed).toBe(constants.PLAYER_WALK_SPEED);
    });

    test('w sets positive speed', () => {
      fireKeyDown('w');
      expect(inputs.speed).toBe(constants.PLAYER_WALK_SPEED);
    });

    test('ArrowDown sets negative speed', () => {
      fireKeyDown('ArrowDown');
      expect(inputs.speed).toBe(-constants.PLAYER_WALK_SPEED);
    });

    test('s sets negative speed', () => {
      fireKeyDown('s');
      expect(inputs.speed).toBe(-constants.PLAYER_WALK_SPEED);
    });

    test('ArrowLeft sets negative angular speed', () => {
      fireKeyDown('ArrowLeft');
      expect(inputs.angularSpeed).toBeCloseTo(degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES));
    });

    test('a sets negative angular speed', () => {
      fireKeyDown('a');
      expect(inputs.angularSpeed).toBeCloseTo(degToRadians(-constants.PLAYER_ANGULAR_SPEED_DEGREES));
    });

    test('ArrowRight sets positive angular speed', () => {
      fireKeyDown('ArrowRight');
      expect(inputs.angularSpeed).toBeCloseTo(degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES));
    });

    test('d sets positive angular speed', () => {
      fireKeyDown('d');
      expect(inputs.angularSpeed).toBeCloseTo(degToRadians(constants.PLAYER_ANGULAR_SPEED_DEGREES));
    });

    test('Tab toggles enableMiniMap', () => {
      expect(inputs.enableMiniMap).toBe(false);
      fireKeyDown('Tab');
      expect(inputs.enableMiniMap).toBe(true);
      fireKeyDown('Tab');
      expect(inputs.enableMiniMap).toBe(false);
    });

    test('unrecognised key leaves state unchanged', () => {
      fireKeyDown('Escape');
      expect(inputs.speed).toBe(0);
      expect(inputs.angularSpeed).toBe(0);
    });
  });

  describe('keyup', () => {
    test('ArrowUp zeros speed', () => {
      fireKeyDown('ArrowUp');
      fireKeyUp('ArrowUp');
      expect(inputs.speed).toBe(0);
    });

    test('w zeros speed', () => {
      fireKeyDown('w');
      fireKeyUp('w');
      expect(inputs.speed).toBe(0);
    });

    test('ArrowDown zeros speed', () => {
      fireKeyDown('ArrowDown');
      fireKeyUp('ArrowDown');
      expect(inputs.speed).toBe(0);
    });

    test('s zeros speed', () => {
      fireKeyDown('s');
      fireKeyUp('s');
      expect(inputs.speed).toBe(0);
    });

    test('ArrowLeft zeros angular speed', () => {
      fireKeyDown('ArrowLeft');
      fireKeyUp('ArrowLeft');
      expect(inputs.angularSpeed).toBe(0);
    });

    test('ArrowRight zeros angular speed', () => {
      fireKeyDown('ArrowRight');
      fireKeyUp('ArrowRight');
      expect(inputs.angularSpeed).toBe(0);
    });

    test('a zeros angular speed', () => {
      fireKeyDown('a');
      fireKeyUp('a');
      expect(inputs.angularSpeed).toBe(0);
    });

    test('d zeros angular speed', () => {
      fireKeyDown('d');
      fireKeyUp('d');
      expect(inputs.angularSpeed).toBe(0);
    });

    test('unrecognised key on keyup leaves state unchanged', () => {
      fireKeyDown('ArrowUp');
      fireKeyUp('Escape');
      expect(inputs.speed).toBe(constants.PLAYER_WALK_SPEED);
    });
  });
});
