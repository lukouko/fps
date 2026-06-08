import * as constants from './constants';
import * as Types from './types';

export const degToRadians = (deg) => (deg * Math.PI) / 180;

export const findLowestCommonMultipleOf = ({ numbers }) => {
  let lcm = numbers[0];
  
  for (let i = 1; i < numbers.length; i++) {
    let gcd = findGreatestCommonDivisor({ a: lcm, b: numbers[i] });
    lcm = (lcm * numbers[i]) / gcd;
  }
  
  return lcm;
}

export const findGreatestCommonDivisor = ({ a, b }) => {
  if (b === 0) {
    return a;
  }
  
  return findGreatestCommonDivisor({ a: b, b: a % b });
}

/**
 * Returns the Euclidean distance between two points.
 * 
 * @param {Object} params
 * @param {Types.Position} params.positionA
 * @param {Types.Position} params.positionB
 * @returns {number} The euclidean distance between the two positions.
 */
export const distanceBetween = ({ positionA, positionB }) => {
  return Math.sqrt(Math.pow(positionA.x - positionB.x, 2) + Math.pow(positionA.y - positionB.y, 2));
};

/**
 * Creates a display info object provided with a width and height
 * 
 * @param {Object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {number} params.fieldOfView In degrees
 * @returns {Types.DisplayInfo} The created display information object.
 * @throws {Error} If width or height are invalid
 */
export const generateDisplayInfo = ({ width, height, fieldOfView }) => {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new Error(`screenWidth must be an integer greater than zero`);
  }

  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new Error(`screenHeight must be an integer greater than zero`);
  }

  if (!Number.isSafeInteger(fieldOfView) || fieldOfView < 0 || fieldOfView > 360) {
    throw new Error(`fieldOfView must be a non-negative integer less than or equal to 360`);
  }

  const fieldOfViewRadians = degToRadians(fieldOfView);
  const halfFieldOfView = fieldOfViewRadians / 2;

  return {
    width,
    height,
    halfWidth: width / 2,
    halfHeight: height / 2,
    halfWidthFloored: Math.floor(width / 2),
    halfHeightFloored: Math.floor(height / 2),
    fieldOfView: fieldOfViewRadians,
    halfFieldOfView,
    angleBetweenRays: fieldOfViewRadians / width, // One ray is cast per vertical column of screen pixels.
    distanceToProjectionPlane: (width / 2) / Math.tan(halfFieldOfView),
  };
};

export const normaliseRadians = (rads) => (rads + constants.TWO_PI) % constants.TWO_PI;

export const isMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileRegex = /iphone|ipad|ipod|android|webos|blackberry|windows phone/i;
  const touchSupport = () => (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
  return mobileRegex.test(userAgent) || touchSupport();
};

export const requestFullScreen = ({ canvas = null } = {}) => {
  const elem = canvas || document.documentElement;
  const opts = { navigationUI: 'hide' };

  try {
    if (elem.requestFullscreen) {
      return elem.requestFullscreen(opts).catch(err => {
        console.warn('Fullscreen request failed:', err);
        throw err;
      });
    // @ts-ignore
    } else if (elem.webkitRequestFullscreen) {
      /* Safari */
      // @ts-ignore
      return elem.webkitRequestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
        throw err;
      });
    // @ts-ignore
    } else if (elem.msRequestFullscreen) {
      /* IE11 */
      // @ts-ignore
      return elem.msRequestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
        throw err;
      });
    } else {
      console.warn('Fullscreen API not supported');
      return Promise.reject(new Error('Fullscreen API not supported'));
    }
  } catch (err) {
    console.warn('Error requesting fullscreen:', err);
    return Promise.reject(err);
  }
};

export const requestLandscapeOrientation = () => {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(err => console.warn('Orientation lock failed:', err));
  } else if (window.orientation !== undefined) {
    // Fallback for older devices
    console.log('Landscape orientation requested (lock not supported)');
  }
};