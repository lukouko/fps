// Stub document.createElement('canvas') with a minimal canvas that uses real typed arrays.
global.navigator = { userAgent: '' };
global.document = (() => {
  let capturedCtx = null;
  return {
    createElement: (tag) => {
      let w = 0, h = 0;
      const ctx = {
        getImageData: (x, y, width, height) => {
          const data = new Uint8ClampedArray(width * height * 4);
          return { data };
        },
        putImageData: jest.fn(),
        drawImage: jest.fn(),
      };
      capturedCtx = ctx;
      const canvas = {
        get width() { return w; },
        set width(v) { w = v; },
        get height() { return h; },
        set height(v) { h = v; },
        getContext: () => ctx,
      };
      return canvas;
    },
    documentElement: {},
    _getLastCtx: () => capturedCtx,
  };
})();

import { OffScreenBuffer } from './offscreen-buffer';

describe('OffScreenBuffer constructor', () => {
  test('stores width and height', () => {
    const buf = new OffScreenBuffer({ width: 10, height: 8 });
    expect(buf.width).toBe(10);
    expect(buf.height).toBe(8);
  });

  test('throws on non-integer width', () => {
    expect(() => new OffScreenBuffer({ width: 1.5, height: 8 })).toThrow();
  });

  test('throws on non-integer height', () => {
    expect(() => new OffScreenBuffer({ width: 10, height: 1.5 })).toThrow();
  });

  test('imagePixels is a Uint8ClampedArray', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    expect(buf.imagePixels).toBeInstanceOf(Uint8ClampedArray);
    expect(buf.imagePixels.length).toBe(4 * 4 * 4);
  });

  test('imagePixels32 is a Uint32Array over the same buffer', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    expect(buf.imagePixels32).toBeInstanceOf(Uint32Array);
    expect(buf.imagePixels32.buffer).toBe(buf.imagePixels.buffer);
  });
});

describe('clear', () => {
  test('fills every pixel with opaque black', () => {
    const buf = new OffScreenBuffer({ width: 2, height: 2 });
    // Set pixels to something non-zero first.
    buf.imagePixels.fill(0xFF);
    buf.clear();
    // 0xFF000000 in little-endian RGBA: R=0, G=0, B=0, A=255.
    for (let i = 0; i < buf.imagePixels.length; i += 4) {
      expect(buf.imagePixels[i]).toBe(0);     // R
      expect(buf.imagePixels[i + 1]).toBe(0); // G
      expect(buf.imagePixels[i + 2]).toBe(0); // B
      expect(buf.imagePixels[i + 3]).toBe(255); // A
    }
  });
});

describe('writeTo', () => {
  test('calls putImageData on the target context', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    const targetCtx = { putImageData: jest.fn() };
    buf.writeTo({ canvasContext: targetCtx });
    expect(targetCtx.putImageData).toHaveBeenCalledWith(buf.imageData, 0, 0);
  });

  test('passes xOffset and yOffset', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    const targetCtx = { putImageData: jest.fn() };
    buf.writeTo({ canvasContext: targetCtx, xOffset: 10, yOffset: 20 });
    expect(targetCtx.putImageData).toHaveBeenCalledWith(buf.imageData, 10, 20);
  });
});

describe('getImageData / getPixels', () => {
  test('getImageData returns imageData', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    expect(buf.getImageData()).toBe(buf.imageData);
  });

  test('getPixels returns imagePixels', () => {
    const buf = new OffScreenBuffer({ width: 4, height: 4 });
    expect(buf.getPixels()).toBe(buf.imagePixels);
  });
});

describe('drawVerticalBufferSlice', () => {
  // Helper: build a flat RGBA texture pixel array for a w×h texture filled with one colour.
  const solidTexture = (w, h, r, g, b, a = 255) => {
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b; pixels[i + 3] = a;
    }
    return pixels;
  };

  test('writes correct colour at full shade (256)', () => {
    const buf = new OffScreenBuffer({ width: 1, height: 1 });
    const src = solidTexture(1, 1, 200, 100, 50);
    buf.drawVerticalBufferSlice({
      sourcePixels: src,
      sourceX: 0,
      texXFrac: 0,
      sourceWidth: 1,
      sourceHeight: 1,
      destinationX: 0,
      destinationY: 0,
      destinationHeight: 1,
      shade: 256,
    });
    expect(buf.imagePixels[0]).toBe(200); // R
    expect(buf.imagePixels[1]).toBe(100); // G
    expect(buf.imagePixels[2]).toBe(50);  // B
    expect(buf.imagePixels[3]).toBe(255); // A
  });

  test('applies shade: half shade halves brightness', () => {
    const buf = new OffScreenBuffer({ width: 1, height: 1 });
    const src = solidTexture(1, 1, 200, 100, 50);
    // shade = 128 → (value * 128) >> 8 = value / 2 (approx)
    buf.drawVerticalBufferSlice({
      sourcePixels: src,
      sourceX: 0,
      texXFrac: 0,
      sourceWidth: 1,
      sourceHeight: 1,
      destinationX: 0,
      destinationY: 0,
      destinationHeight: 1,
      shade: 128,
    });
    expect(buf.imagePixels[0]).toBe((200 * 128) >> 8);
    expect(buf.imagePixels[1]).toBe((100 * 128) >> 8);
    expect(buf.imagePixels[2]).toBe((50 * 128) >> 8);
  });

  test('clips destinationY < 0 to screen top', () => {
    // 1-wide, 2-high buffer. destinationY=-1, destinationHeight=3 → rows 0 and 1 both visible.
    const buf = new OffScreenBuffer({ width: 1, height: 2 });
    buf.imagePixels.fill(0);
    const src = solidTexture(1, 3, 255, 0, 0);
    buf.drawVerticalBufferSlice({
      sourcePixels: src,
      sourceX: 0,
      texXFrac: 0,
      sourceWidth: 1,
      sourceHeight: 3,
      destinationX: 0,
      destinationY: -1,
      destinationHeight: 3,
      shade: 256,
    });
    // Both on-screen rows should be written with the source colour.
    expect(buf.imagePixels[0]).toBe(255); // row 0, R
    expect(buf.imagePixels[4]).toBe(255); // row 1, R
  });

  test('skips slice when entirely off-screen', () => {
    const buf = new OffScreenBuffer({ width: 1, height: 1 });
    buf.imagePixels.fill(0);
    const src = solidTexture(1, 1, 255, 0, 0);
    buf.drawVerticalBufferSlice({
      sourcePixels: src,
      sourceX: 0,
      texXFrac: 0,
      sourceWidth: 1,
      sourceHeight: 1,
      destinationX: 0,
      destinationY: 5, // completely below the 1-high screen
      destinationHeight: 1,
      shade: 256,
    });
    expect(buf.imagePixels[0]).toBe(0); // untouched
  });

  test('writes to correct destinationX column', () => {
    // 3-wide, 1-high buffer; write to column 2.
    const buf = new OffScreenBuffer({ width: 3, height: 1 });
    buf.imagePixels.fill(0);
    const src = solidTexture(1, 1, 77, 88, 99);
    buf.drawVerticalBufferSlice({
      sourcePixels: src,
      sourceX: 0,
      texXFrac: 0,
      sourceWidth: 1,
      sourceHeight: 1,
      destinationX: 2,
      destinationY: 0,
      destinationHeight: 1,
      shade: 256,
    });
    // Columns 0 and 1 should be untouched.
    expect(buf.imagePixels[0]).toBe(0);
    expect(buf.imagePixels[4]).toBe(0);
    // Column 2 should have the source colour.
    expect(buf.imagePixels[8]).toBe(77);
    expect(buf.imagePixels[9]).toBe(88);
    expect(buf.imagePixels[10]).toBe(99);
  });
});
