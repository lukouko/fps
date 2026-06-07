// Stub browser APIs used by helpers.js module-level code.
// @ts-ignore
global.navigator = { userAgent: '' };
// @ts-ignore
global.document = { documentElement: {} };

import {
  degToRadians,
  findGreatestCommonDivisor,
  findLowestCommonMultipleOf,
  distanceBetween,
  generateDisplayInfo,
  normaliseRadians,
} from './helpers';

describe('degToRadians', () => {
  test('0 degrees → 0', () => {
    expect(degToRadians(0)).toBe(0);
  });

  test('180 degrees → PI', () => {
    expect(degToRadians(180)).toBeCloseTo(Math.PI);
  });

  test('360 degrees → 2*PI', () => {
    expect(degToRadians(360)).toBeCloseTo(Math.PI * 2);
  });

  test('90 degrees → PI/2', () => {
    expect(degToRadians(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('findGreatestCommonDivisor', () => {
  test('gcd(12, 8) = 4', () => {
    expect(findGreatestCommonDivisor({ a: 12, b: 8 })).toBe(4);
  });

  test('gcd(7, 0) = 7 (base case)', () => {
    expect(findGreatestCommonDivisor({ a: 7, b: 0 })).toBe(7);
  });

  test('gcd(100, 75) = 25', () => {
    expect(findGreatestCommonDivisor({ a: 100, b: 75 })).toBe(25);
  });

  test('gcd of two primes = 1', () => {
    expect(findGreatestCommonDivisor({ a: 13, b: 7 })).toBe(1);
  });
});

describe('findLowestCommonMultipleOf', () => {
  test('lcm([4, 6]) = 12', () => {
    expect(findLowestCommonMultipleOf({ numbers: [4, 6] })).toBe(12);
  });

  test('lcm([3, 5, 15]) = 15', () => {
    expect(findLowestCommonMultipleOf({ numbers: [3, 5, 15] })).toBe(15);
  });

  test('single element returns itself', () => {
    expect(findLowestCommonMultipleOf({ numbers: [7] })).toBe(7);
  });

  test('lcm([2, 3, 4]) = 12', () => {
    expect(findLowestCommonMultipleOf({ numbers: [2, 3, 4] })).toBe(12);
  });
});

describe('distanceBetween', () => {
  test('same point → 0', () => {
    expect(distanceBetween({ positionA: { x: 0, y: 0 }, positionB: { x: 0, y: 0 } })).toBe(0);
  });

  test('3-4-5 right triangle', () => {
    expect(distanceBetween({ positionA: { x: 0, y: 0 }, positionB: { x: 3, y: 4 } })).toBe(5);
  });

  test('horizontal distance', () => {
    expect(distanceBetween({ positionA: { x: 1, y: 5 }, positionB: { x: 4, y: 5 } })).toBe(3);
  });

  test('negative coordinates', () => {
    expect(distanceBetween({ positionA: { x: -3, y: 0 }, positionB: { x: 0, y: -4 } })).toBe(5);
  });
});

describe('generateDisplayInfo', () => {
  const valid = { width: 320, height: 200, fieldOfView: 60 };

  test('returns expected shape', () => {
    const info = generateDisplayInfo(valid);
    expect(info.width).toBe(320);
    expect(info.height).toBe(200);
    expect(info.halfWidth).toBe(160);
    expect(info.halfHeight).toBe(100);
    expect(info.halfWidthFloored).toBe(160);
    expect(info.halfHeightFloored).toBe(100);
  });

  test('fieldOfView is stored in radians', () => {
    const info = generateDisplayInfo(valid);
    expect(info.fieldOfView).toBeCloseTo(degToRadians(60));
  });

  test('angleBetweenRays = fieldOfViewRads / width', () => {
    const info = generateDisplayInfo(valid);
    expect(info.angleBetweenRays).toBeCloseTo(info.fieldOfView / 320);
  });

  test('distanceToProjectionPlane is positive', () => {
    const info = generateDisplayInfo(valid);
    expect(info.distanceToProjectionPlane).toBeGreaterThan(0);
  });

  test('throws on non-integer width', () => {
    expect(() => generateDisplayInfo({ ...valid, width: 1.5 })).toThrow();
  });

  test('throws on zero width', () => {
    expect(() => generateDisplayInfo({ ...valid, width: 0 })).toThrow();
  });

  test('throws on negative height', () => {
    expect(() => generateDisplayInfo({ ...valid, height: -1 })).toThrow();
  });

  test('throws on fieldOfView > 360', () => {
    expect(() => generateDisplayInfo({ ...valid, fieldOfView: 361 })).toThrow();
  });

  test('throws on non-integer fieldOfView', () => {
    expect(() => generateDisplayInfo({ ...valid, fieldOfView: 60.5 })).toThrow();
  });

  test('fieldOfView 0 is allowed', () => {
    // 0 FOV is an edge case but passes validation; tan(0)=0 gives Infinity dtp — just shouldn't throw.
    expect(() => generateDisplayInfo({ ...valid, fieldOfView: 0 })).not.toThrow();
  });
});

describe('normaliseRadians', () => {
  test('0 stays 0', () => {
    expect(normaliseRadians(0)).toBeCloseTo(0);
  });

  test('2*PI normalises to 0', () => {
    expect(normaliseRadians(Math.PI * 2)).toBeCloseTo(0);
  });

  test('negative angle wraps to positive', () => {
    const result = normaliseRadians(-Math.PI);
    expect(result).toBeCloseTo(Math.PI);
  });

  test('PI stays PI', () => {
    expect(normaliseRadians(Math.PI)).toBeCloseTo(Math.PI);
  });

  test('3*PI normalises to PI', () => {
    expect(normaliseRadians(Math.PI * 3)).toBeCloseTo(Math.PI);
  });
});
