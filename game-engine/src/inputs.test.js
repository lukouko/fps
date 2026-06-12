// Stub browser globals needed by imports.
const listeners = {};
global.navigator = { userAgent: '' };

import { initialise, computeJoystickInput } from './inputs';
import * as constants from './constants';
import { degToRadians } from './helpers';

// Grab the raw handler callbacks that initialise() registers on document.
const fireKeyDown = (key) => {
  if (listeners.keydown) listeners.keydown({ key });
};
const fireKeyUp = (key) => {
  if (listeners.keyup) listeners.keyup({ key });
};

// Ensure document has addEventListener for this test suite, even if other tests replaced global.document.
const setupInputsTestDocument = () => {
  if (!global.document) global.document = {};
  global.document.addEventListener = jest.fn((type, cb) => { listeners[type] = cb; });
  if (!global.document.documentElement) global.document.documentElement = {};
};

describe('initialise (KEYBOARD mode)', () => {
  let inputs;

  beforeEach(() => {
    setupInputsTestDocument();
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

describe('computeJoystickInput', () => {
  const testConfig = {
    maxRadius: 100,
    deadZone: 5,
    walkSpeed: 20,
    maxAngularSpeed: 0.1,
  };

  it('returns zero input within dead zone', () => {
    const result = computeJoystickInput({
      dx: 0,
      dy: 0,
      ...testConfig,
    });
    expect(result).toEqual({ speed: 0, angularSpeed: 0 });

    const result2 = computeJoystickInput({
      dx: 2,
      dy: 2,
      ...testConfig,
    });
    expect(result2).toEqual({ speed: 0, angularSpeed: 0 });
  });

  it('produces forward speed when dragged up', () => {
    const result = computeJoystickInput({
      dx: 0,
      dy: -100,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(20, 1);
    expect(result.angularSpeed).toBeCloseTo(0, 5);
  });

  it('produces backward speed when dragged down', () => {
    const result = computeJoystickInput({
      dx: 0,
      dy: 100,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(-20, 1);
    expect(result.angularSpeed).toBeCloseTo(0, 5);
  });

  it('produces positive angular speed when dragged right', () => {
    const result = computeJoystickInput({
      dx: 100,
      dy: 0,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(0, 5);
    expect(result.angularSpeed).toBeCloseTo(0.1, 2);
  });

  it('produces negative angular speed when dragged left', () => {
    const result = computeJoystickInput({
      dx: -100,
      dy: 0,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(0, 5);
    expect(result.angularSpeed).toBeCloseTo(-0.1, 2);
  });

  it('produces both axes for diagonal deflection', () => {
    const result = computeJoystickInput({
      dx: 70.7,
      dy: -70.7,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(14.14, 1);
    expect(result.angularSpeed).toBeCloseTo(0.0707, 2);
  });

  it('clamps deflection beyond max radius', () => {
    const result = computeJoystickInput({
      dx: 200,
      dy: 0,
      ...testConfig,
    });
    expect(result.speed).toBeCloseTo(0, 5);
    expect(result.angularSpeed).toBeCloseTo(0.1, 2);
  });

  it('scales output linearly from dead zone to max radius', () => {
    // At 45 degrees, 50% radius deflection: magnitude = 50
    const halfWay = computeJoystickInput({
      dx: 35.36,
      dy: -35.36,
      ...testConfig,
    });
    // At 50% deflection: speed ≈ 20 * 0.707 * 0.5 ≈ 7.07, angularSpeed ≈ 0.1 * 0.707 * 0.5 ≈ 0.0353
    expect(halfWay.speed).toBeCloseTo(7.07, 1);
    expect(halfWay.angularSpeed).toBeCloseTo(0.0353, 2);
  });
});
