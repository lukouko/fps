/**
 * Precomputed lookup tables for performance-critical operations.
 * Trade memory for CPU by pre-computing expensive operations.
 */

// Shade lookup table: all possible (value * shade >> 8) combinations.
// Index: [shade (0-256)][pixelValue (0-255)] = result (0-255)
// This eliminates the multiply+shift in the hot path of drawVerticalBufferSlice.
const shadeLUT = new Array(257);
for (let shade = 0; shade <= 256; shade++) {
  shadeLUT[shade] = new Uint8Array(256);
  for (let pixelValue = 0; pixelValue < 256; pixelValue++) {
    shadeLUT[shade][pixelValue] = (pixelValue * shade) >> 8;
  }
}

/**
 * Apply shade to a pixel value using lookup table.
 * @param {number} pixelValue 0-255
 * @param {number} shade 0-256
 * @returns {number} Shaded value 0-255
 */
export const applyShadeLUT = (pixelValue, shade) => {
  return shadeLUT[shade][pixelValue];
};

// Export the raw LUT for direct inlining
export const shadeLUTByShade = shadeLUT;

// Fast trig tables: precompute sin/cos for 0.1° increments (3600 values = 360°)
// This covers [0, 2π) with high precision and eliminates Math.sin/Math.cos calls.
const TRIG_RESOLUTION = 3600; // 0.1° precision
const TRIG_SCALE = TRIG_RESOLUTION / (2 * Math.PI);

const trigSin = new Float32Array(TRIG_RESOLUTION);
const trigCos = new Float32Array(TRIG_RESOLUTION);
const trigTan = new Float32Array(TRIG_RESOLUTION);

for (let i = 0; i < TRIG_RESOLUTION; i++) {
  const angle = (i / TRIG_SCALE);
  trigSin[i] = Math.sin(angle);
  trigCos[i] = Math.cos(angle);
  trigTan[i] = Math.tan(angle);
}

/**
 * Fast sine lookup.
 * @param {number} angle Radians (any range, will be normalized)
 * @returns {number} sin(angle)
 */
export const fastSin = (angle) => {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  const idx = Math.round(normalized * TRIG_SCALE) % TRIG_RESOLUTION;
  return trigSin[idx];
};

/**
 * Fast cosine lookup.
 * @param {number} angle Radians (any range, will be normalized)
 * @returns {number} cos(angle)
 */
export const fastCos = (angle) => {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  const idx = Math.round(normalized * TRIG_SCALE) % TRIG_RESOLUTION;
  return trigCos[idx];
};

/**
 * Fast tangent lookup.
 * @param {number} angle Radians (any range, will be normalized)
 * @returns {number} tan(angle)
 */
export const fastTan = (angle) => {
  let normalized = angle % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  const idx = Math.round(normalized * TRIG_SCALE) % TRIG_RESOLUTION;
  return trigTan[idx];
};

// Distance-to-shade lookup: map ray distances (0-10000) to shade (0-256).
// Eliminates per-ray shade calculation.
const DISTANCE_MAX = 10000;
const DISTANCE_STEPS = 10000;

const distanceToShadeLUT = new Uint8Array(DISTANCE_STEPS + 1);
for (let dist = 0; dist <= DISTANCE_STEPS; dist++) {
  // Simple linear fade: further = darker. Adjust formula as needed.
  const normalized = Math.max(0, 1 - dist / DISTANCE_MAX);
  distanceToShadeLUT[dist] = Math.round(normalized * 256);
}

/**
 * Get shade value for a given distance.
 * @param {number} distance Ray distance
 * @returns {number} Shade value 0-256
 */
export const getShadeByDistance = (distance) => {
  const clamped = Math.min(Math.max(distance | 0, 0), DISTANCE_STEPS);
  return distanceToShadeLUT[clamped];
};

// Sky angle normalization cache: precompute normalized angles for fine-grained input angles.
// Since angle can be any float, we quantize the input to ~1000 buckets and store the result.
const ANGLE_QUANTIZATION = 10000;
const TWO_PI = 2 * Math.PI;
const skyAngleCache = new Float32Array(ANGLE_QUANTIZATION);

for (let i = 0; i < ANGLE_QUANTIZATION; i++) {
  const angle = (i / ANGLE_QUANTIZATION) * TWO_PI;
  // Normalize to [0, 2π)
  const normalized = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  skyAngleCache[i] = normalized;
}

/**
 * Fast sky angle normalization using lookup. Works for reasonably bounded angles.
 * For angles far outside [0, 2π), quantization error increases.
 * @param {number} angle Radians
 * @returns {number} Normalized angle in [0, 2π)
 */
export const fastNormalizeSkyAngle = (angle) => {
  // Clamp angle to reasonable bounds and quantize
  const normalized = angle % TWO_PI;
  const idx = Math.round((normalized / TWO_PI) * (ANGLE_QUANTIZATION - 1)) % ANGLE_QUANTIZATION;
  return skyAngleCache[idx];
};

// Bilinear interpolation weight cache: precompute weights for common fractional positions.
// Index: [fracX (0-255)][fracY (0-255)] = { topL, topR, botL, botR }
// Fractional parts are quantized to 8-bit (256 buckets) per axis.
const FRAC_BUCKETS = 256;
const bilinearWeights = new Array(FRAC_BUCKETS);

for (let fracXBucket = 0; fracXBucket < FRAC_BUCKETS; fracXBucket++) {
  bilinearWeights[fracXBucket] = new Array(FRAC_BUCKETS);
  const fracX = fracXBucket / (FRAC_BUCKETS - 1);
  const fx1 = 1.0 - fracX;

  for (let fracYBucket = 0; fracYBucket < FRAC_BUCKETS; fracYBucket++) {
    const fracY = fracYBucket / (FRAC_BUCKETS - 1);
    const fy1 = 1.0 - fracY;

    bilinearWeights[fracXBucket][fracYBucket] = {
      topL: fy1 * fx1,
      topR: fy1 * fracX,
      botL: fracY * fx1,
      botR: fracY * fracX,
    };
  }
}

/**
 * Get precomputed bilinear weights.
 * @param {number} fracX Fractional X (0.0 to 1.0)
 * @param {number} fracY Fractional Y (0.0 to 1.0)
 * @returns {{ topL: number, topR: number, botL: number, botR: number }}
 */
export const getBilinearWeights = (fracX, fracY) => {
  const xBucket = Math.round(fracX * (FRAC_BUCKETS - 1)) % FRAC_BUCKETS;
  const yBucket = Math.round(fracY * (FRAC_BUCKETS - 1)) % FRAC_BUCKETS;
  return bilinearWeights[xBucket][yBucket];
};
