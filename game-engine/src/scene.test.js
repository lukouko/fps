// Stub browser globals needed by OffScreenBuffer inside scene.js.
global.navigator = { userAgent: '' };
global.document = {
  createElement: (tag) => {
    let w = 0, h = 0;
    const ctx = {
      getImageData: (_x, _y, width, height) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: jest.fn(),
      drawImage: jest.fn(),
    };
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
};

// Mock textures — return a solid 64×64 opaque texture for any id.
jest.mock('./textures', () => {
  const makeTexture = (w = 64, h = 64) => {
    const pixelBuffer = new Uint8ClampedArray(w * h * 4).fill(128);
    // Set all alpha channels to 255.
    for (let i = 3; i < pixelBuffer.length; i += 4) pixelBuffer[i] = 255;
    return { width: w, height: h, bytesPerRow: w * 4, pixelBuffer };
  };
  return { getTextureById: jest.fn(() => makeTexture()) };
});

// Mock map — every cell is a wall, nothing is out of bounds.
jest.mock('./map', () => ({
  isOutOfBounds: jest.fn(() => false),
  getMapCell: jest.fn(() => ({ wallTextureId: 1, floorTextureId: 2, ceilingTextureId: 3 })),
  canMoveToCellLocation: jest.fn(() => true),
}));

import { initialise, render, skyTexelCoords } from './scene';
import { generateDisplayInfo } from './helpers';

const makeDisplayInfo = () => generateDisplayInfo({ width: 10, height: 10, fieldOfView: 60 });

const makeMapState = () => ({
  currentMap: {
    layout: Array.from({ length: 10 }, () =>
      Array.from({ length: 10 }, () => ({ wallTextureId: 1, floorTextureId: 2, ceilingTextureId: 3 }))
    ),
    staticSprites: [],
    sprites: [],
  },
  unscaledMapBounds: { x: 10, y: 10 },
});

// skyTexelCoords maps a ray angle + ceiling screen row to a texel position in the sky texture.
describe('skyTexelCoords', () => {
  const skyTextureWidth = 508;
  const skyTextureHeight = 256;
  const halfHeight = 300;

  describe('texX — parallax from ray angle', () => {
    it('maps angle 0 to texX 0', () => {
      const { texX } = skyTexelCoords({ rayAngle: 0, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texX).toBe(0);
    });

    it('maps angle 2π (full rotation) back to texX 0', () => {
      const { texX } = skyTexelCoords({ rayAngle: Math.PI * 2, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texX).toBe(0);
    });

    it('maps angle π (half rotation) to the midpoint of the texture', () => {
      const { texX } = skyTexelCoords({ rayAngle: Math.PI, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texX).toBe(Math.floor(skyTextureWidth / 2));
    });

    it('normalises negative angles to the same position as their positive equivalents', () => {
      // -π and +π are equivalent rotations — should map to the same texX.
      const { texX: negPi } = skyTexelCoords({ rayAngle: -Math.PI, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      const { texX: posPi } = skyTexelCoords({ rayAngle: Math.PI, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(negPi).toBe(posPi);
    });

    it('normalises angles beyond 2π to the same position as their base equivalent', () => {
      const { texX: base }  = skyTexelCoords({ rayAngle: Math.PI / 2, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      const { texX: extra } = skyTexelCoords({ rayAngle: Math.PI / 2 + Math.PI * 2, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(extra).toBe(base);
    });
  });

  describe('texY — screen row to texture row', () => {
    it('maps ceilScreenY 0 (top of screen) to texY 0 (top of texture)', () => {
      const { texY } = skyTexelCoords({ rayAngle: 0, ceilScreenY: 0, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texY).toBe(0);
    });

    it('maps ceilScreenY equal to halfHeight (horizon) to the last texture row', () => {
      const { texY } = skyTexelCoords({ rayAngle: 0, ceilScreenY: halfHeight, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texY).toBe(skyTextureHeight - 1);
    });

    it('maps the midpoint of the sky area to the midpoint of the texture', () => {
      const { texY } = skyTexelCoords({ rayAngle: 0, ceilScreenY: halfHeight / 2, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texY).toBe(Math.floor(skyTextureHeight / 2));
    });

    it('clamps ceilScreenY values beyond halfHeight to the last texture row', () => {
      const { texY } = skyTexelCoords({ rayAngle: 0, ceilScreenY: halfHeight * 2, halfHeight, skyTextureWidth, skyTextureHeight });
      expect(texY).toBe(skyTextureHeight - 1);
    });
  });
});

describe('initialise', () => {
  test('does not throw with valid displayInfo', () => {
    expect(() => initialise({ displayInfo: makeDisplayInfo() })).not.toThrow();
  });

  test('throws when displayInfo is missing', () => {
    expect(() => initialise({ displayInfo: null })).toThrow();
  });

  test('throws when displayInfo is not an object', () => {
    expect(() => initialise({ displayInfo: 42 })).toThrow();
  });
});

describe('render', () => {
  const fakeCtx = { putImageData: jest.fn() };

  beforeEach(() => {
    fakeCtx.putImageData.mockClear();
    initialise({ displayInfo: makeDisplayInfo() });
  });

  // Place player at cell centre — a position on a cell boundary causes horizontal rays
  // to get firstY == playerY, producing a zero-distance collision against the mock wall.
  const orientation = { position: { x: 640, y: 640 }, angle: 0 };

  test('returns wallRays array with one entry per screen column', () => {
    const displayInfo = makeDisplayInfo();
    const { wallRays } = render({
      canvasContext: fakeCtx,
      orientation,
      mapState: makeMapState(),
      displayInfo,
    });
    expect(Array.isArray(wallRays)).toBe(true);
    expect(wallRays).toHaveLength(displayInfo.width);
  });

  test('returns a centreRay', () => {
    const { centreRay } = render({
      canvasContext: fakeCtx,
      orientation,
      mapState: makeMapState(),
      displayInfo: makeDisplayInfo(),
    });
    expect(centreRay).toBeDefined();
  });

  test('calls putImageData exactly once per render call', () => {
    render({
      canvasContext: fakeCtx,
      orientation,
      mapState: makeMapState(),
      displayInfo: makeDisplayInfo(),
    });
    expect(fakeCtx.putImageData).toHaveBeenCalledTimes(1);
  });

  test('each wallRay has a positive distance (hits the mocked wall)', () => {
    const { wallRays } = render({
      canvasContext: fakeCtx,
      orientation,
      mapState: makeMapState(),
      displayInfo: makeDisplayInfo(),
    });
    for (const ray of wallRays) {
      expect(ray.distance).toBeGreaterThan(0);
    }
  });

  test('centreRay is the ray at the half-width column', () => {
    const displayInfo = makeDisplayInfo();
    const { wallRays, centreRay } = render({
      canvasContext: fakeCtx,
      orientation,
      mapState: makeMapState(),
      displayInfo,
    });
    expect(centreRay).toBe(wallRays[displayInfo.halfWidthFloored]);
  });

  test('sprites do not appear when mapState has no sprites', () => {
    // Render should complete without error — no sprites to draw.
    expect(() =>
      render({ canvasContext: fakeCtx, orientation, mapState: makeMapState(), displayInfo: makeDisplayInfo() })
    ).not.toThrow();
  });

  test('render with a dynamic sprite in mapState does not throw', () => {
    const mapState = makeMapState();
    // Sprite positioned far behind the player (angle > ±90° from view — should be culled).
    mapState.currentMap.sprites = [{ textureId: 1, position: { x: 0, y: 9999 } }];
    expect(() =>
      render({ canvasContext: fakeCtx, orientation, mapState, displayInfo: makeDisplayInfo() })
    ).not.toThrow();
  });

  test('render with skyTextureId set does not throw', () => {
    const mapState = makeMapState();
    mapState.currentMap.skyTextureId = 'clouds_1';
    expect(() =>
      render({ canvasContext: fakeCtx, orientation, mapState, displayInfo: makeDisplayInfo() })
    ).not.toThrow();
  });

  test('render without skyTextureId does not throw', () => {
    const mapState = makeMapState();
    delete mapState.currentMap.skyTextureId;
    expect(() =>
      render({ canvasContext: fakeCtx, orientation, mapState, displayInfo: makeDisplayInfo() })
    ).not.toThrow();
  });
});
