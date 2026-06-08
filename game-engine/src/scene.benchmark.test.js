/**
 * Performance benchmarks for scene.js hot paths.
 *
 * These tests measure execution time of rendering algorithms with synthetic data.
 * Run with: npm test -- scene.bench.test.js
 *
 * Benchmarks are NOT about absolute numbers but about RELATIVE improvements.
 * If an optimization makes the algorithm slower, we'll see it immediately.
 */

// Mock assets before importing scene
jest.mock('./assets', () => ({
  images: [
    { id: 'wall_1', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
    { id: 'sky_1', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
    { id: 'floor_1', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
    { id: 'ceiling_1', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
    { id: 'floor_2', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
    { id: 'ceiling_2', assetPath: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
  ],
}));

import * as scene from './scene';
import * as constants from './constants';
import { OffScreenBuffer } from './offscreen-buffer';

// Helper: measure function execution time
const benchmark = ({ name, fn, iterations = 100 }) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  console.log(`${name}: ${totalMs.toFixed(2)}ms total, ${avgMs.toFixed(4)}ms avg (${iterations} iterations)`);
  return { totalMs, avgMs };
};

// Create synthetic texture
const createTestTexture = ({ id, width = 256, height = 256 } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);

  // Fill with some pattern data to be realistic
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = 100 + (i % 156);     // R
    imageData.data[i + 1] = 100 + ((i + 1) % 156); // G
    imageData.data[i + 2] = 100 + ((i + 2) % 156); // B
    imageData.data[i + 3] = 255;              // A
  }

  return {
    id,
    width,
    height,
    pixelBuffer: imageData.data,
    bytesPerRow: width * 4,
  };
};

describe('Scene Benchmarks', () => {
  beforeAll(() => {
    // Mock textures.getTextureById
    jest.spyOn(require('./textures'), 'getTextureById').mockImplementation(({ id }) => {
      const textures = {
        wall_1: createTestTexture({ id: 'wall_1' }),
        floor_1: createTestTexture({ id: 'floor_1' }),
        ceiling_1: createTestTexture({ id: 'ceiling_1' }),
        floor_2: createTestTexture({ id: 'floor_2' }),
        ceiling_2: createTestTexture({ id: 'ceiling_2' }),
        sky_1: createTestTexture({ id: 'sky_1', width: 512, height: 256 }),
      };
      return textures[id] || createTestTexture({ id });
    });
  });

  test('skyTexelCoords performance', () => {
    // This is a simple pure function — should be very fast
    const result = benchmark({
      name: 'skyTexelCoords',
      fn: () => {
        scene.skyTexelCoords({
          rayAngle: Math.PI / 4,
          ceilScreenY: 100,
          halfHeight: 275,
          skyTextureWidth: 512,
          skyTextureHeight: 256,
        });
      },
      iterations: 10000,
    });

    expect(result.avgMs).toBeLessThan(0.1);
  });

  test('scene.initialise performance', () => {
    const displayInfo = {
      width: 1280,
      height: 550,
      halfWidth: 640,
      halfWidthFloored: 640,
      halfHeight: 275,
      halfHeightFloored: 275,
      distanceToProjectionPlane: 700,
    };

    const result = benchmark({
      name: 'scene.initialise',
      fn: () => {
        scene.initialise({ displayInfo });
      },
      iterations: 10,
    });

    expect(result.avgMs).toBeLessThan(10); // Should be very fast
  });

  test('OffScreenBuffer.clear performance', () => {
    const buffer = new OffScreenBuffer({ width: 1280, height: 550 });

    const result = benchmark({
      name: 'OffScreenBuffer.clear',
      fn: () => {
        buffer.clear();
      },
      iterations: 1000,
    });

    expect(result.avgMs).toBeLessThan(1);
  });

  test('OffScreenBuffer.drawVerticalBufferSlice performance (single column)', () => {
    const buffer = new OffScreenBuffer({ width: 1280, height: 550 });
    const texture = createTestTexture({ id: 'test', width: 256, height: 256 });

    const result = benchmark({
      name: 'drawVerticalBufferSlice (single column)',
      fn: () => {
        buffer.drawVerticalBufferSlice({
          sourcePixels: texture.pixelBuffer,
          sourceX: 128,
          texXFrac: 0.5,
          sourceWidth: texture.width,
          sourceHeight: texture.height,
          destinationX: 640,
          destinationY: 0,
          destinationHeight: 550,
          shade: 200,
        });
      },
      iterations: 100,
    });

    expect(result.avgMs).toBeLessThan(10);
  });


  test('OffScreenBuffer.drawVerticalBufferSlice at full resolution (1280 columns)', () => {
    // This simulates drawing a full frame worth of columns
    const buffer = new OffScreenBuffer({ width: 1280, height: 550 });
    const texture = createTestTexture({ id: 'test', width: 256, height: 256 });

    const result = benchmark({
      name: 'Full frame (1280 columns)',
      fn: () => {
        buffer.clear();
        for (let col = 0; col < 1280; col++) {
          buffer.drawVerticalBufferSlice({
            sourcePixels: texture.pixelBuffer,
            sourceX: (col * 16) % 256,
            texXFrac: (col % 256) / 256,
            sourceWidth: texture.width,
            sourceHeight: texture.height,
            destinationX: col,
            destinationY: 0,
            destinationHeight: 550,
            shade: 200,
          });
        }
      },
      iterations: 3,
    });

    console.log(`\n✓ Full frame benchmark (${result.avgMs.toFixed(2)}ms per frame suggests ~${(1000 / result.avgMs).toFixed(0)} fps potential)`);
  });

});
