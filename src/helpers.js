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