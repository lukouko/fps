import * as constants from './constants';
import { degToRadians } from './helpers';

const STRICT_CACHE = true;

const caches = {
  sin: {},
  iSin: {},
  cos: {},
  iCos: {},
  tan: {},
  iTan: {},
  xStep: {},
  yStep: {},
};

export const initialise = () => {
  for (let degrees = 0; degrees <= 360; ++degrees) {
    // Adding 0.0001 prevents divisions by 0 at certain angles.
    const radians = degToRadians(degrees) + (0.0001);
    
    caches.sin[degrees] = Math.sin(radians);
    caches.iSin[degrees] = 1.0 / caches.sin[degrees];

    caches.cos[degrees] = Math.cos(radians);
    caches.iCos[degrees] = 1.0 / caches.cos[degrees];

    caches.tan[degrees] = Math.tan(radians);
    caches.iTan[degrees] = 1.0 / caches.tan[degrees];

    // Wall distance lookup cache
    const isFacingLeft = degrees >= constants.SECOND_QUADRANT_START && degrees < constants.FOURTH_QUADRANT_START;
    const isFacingRight = !isFacingLeft;

    caches.xStep[degrees] = constants.CELL_SIZE / caches.tan[degrees];
    if ((isFacingLeft && caches.xStep[degrees] > 0) || (isFacingRight && caches.xStep[degrees] < 0)) {
      caches.xStep[degrees] = -caches.xStep[degrees];
    }

    const isFacingDown = degrees >= constants.FIRST_QUADRANT_START && degrees < constants.THIRD_QUADRANT_START;
    const isFacingUp = !isFacingDown;

    caches.yStep[degrees] = constants.CELL_SIZE * caches.tan[degrees];
    if ((isFacingDown && caches.yStep[degrees] < 0) || (isFacingUp && caches.yStep[degrees] > 0)) {
      caches.yStep[degrees] = -caches.yStep[degrees];
    }
  }
};

export const sin = (degrees) => {
  const result = caches.sin[degrees];

  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for sin(${degrees}) in strict mode`);
  }

  return result;
};

export const iSin = (degrees) => {
  const result = caches.iSin[degrees];
  
  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for iSin(${degrees}) in strict mode`);
  }

  return result;
};

export const cos = (degrees) => {
  const result = caches.cos[degrees];

  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for cos(${degrees}) in strict mode`);
  }

  return result;
};

export const iCos = (degrees) => {
  const result = caches.iCos[degrees];
  
  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for iCos(${degrees}) in strict mode`);
  }

  return result;
};

export const tan = (degrees) => {
  const result = caches.tan[degrees];

  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for tan(${degrees}) in strict mode`);
  }

  return result;
};

export const iTan = (degrees) => {
  const result = caches.iTan[degrees];
  
  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for iTan(${degrees}) in strict mode`);
  }

  return result;
};

export const xStepDistance = (degrees) => {
  const result = caches.xStep[degrees];

  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for xStep(${degrees}) in strict mode`);
  }

  return result;
};

export const yStepDistance = (degrees) => {
  const result = caches.yStep[degrees];
  
  if (STRICT_CACHE && result === undefined) {
    throw new Error(`No cache entry found for yStep(${degrees}) in strict mode`);
  }

  return result;
};