import * as constants from './constants';

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

export const normaliseRadians = (rads) => (rads + constants.TWO_PI) % constants.TWO_PI;

export const isMobileDevice = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent.toLowerCase());

export const requestFullScreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  // @ts-ignore
  } else if (elem.webkitRequestFullscreen) {
    /* Safari */
    // @ts-ignore
    elem.webkitRequestFullscreen();
  // @ts-ignore
  } else if (elem.msRequestFullscreen) {
    /* IE11 */
    // @ts-ignore
    elem.msRequestFullscreen();
  }
}