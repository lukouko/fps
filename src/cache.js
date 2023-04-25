import * as constants from './constants';
import { degToRadians } from './helpers';

const STRICT_CACHE = false;

const caches = {
  sin: {},
  iSin: {},
  cos: {},
  iCos: {},
  tan: {},
  iTan: {},
};

export const initialise = () => {

};

export const sin = (radians) => {
  if (!caches.sin[radians]) {
    if (STRICT_CACHE) {
      throw new Error(`No cache entry found for sin(${radians}) in strict mode`);
    }

    caches.sin[radians] = Math.sin(radians);
  }

  return caches.sin[radians];
};

export const cos = (radians) => {
  if (!caches.cos[radians]) {
    if (STRICT_CACHE) {
      throw new Error(`No cache entry found for cos(${radians}) in strict mode`);
    }

    caches.cos[radians] = Math.cos(radians);
  }

  return caches.cos[radians];
};

export const tan = (radians) => {
  if (!caches.tan[radians]) {
    if (STRICT_CACHE) {
      throw new Error(`No cache entry found for tan(${radians}) in strict mode`);
    }

    caches.tan[radians] = Math.tan(radians);
  }

  return caches.tan[radians];
};