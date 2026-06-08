import { shadeLUTByShade } from './luts';

export class OffScreenBuffer {
  constructor({ width, height }) {
    if (!Number.isSafeInteger(width)) {
      throw new Error(`width must be a non-negative integer, received '${width}'`);
    }

    if (!Number.isSafeInteger(height)) {
      throw new Error(`height must be a non-negative integer, received '${height}'`);
    }

    this.width = width;
    this.height = height;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;

    this.canvasContext = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!this.canvasContext) {
      throw new Error('Failed to get canvas context for OffScreenBuffer');
    }

    this.imageData = this.canvasContext.getImageData(0, 0, width, height);
    this.imagePixels = this.imageData.data;
    // Uint32 view over the same buffer — fill() on a typed array is a highly
    // optimised intrinsic, far cheaper than a fillRect + getImageData round-trip.
    this.imagePixels32 = new Uint32Array(this.imagePixels.buffer);

  }

  clear() {
    // 0xFF000000 = opaque black in little-endian RGBA (R=0 G=0 B=0 A=255).
    this.imagePixels32.fill(0xFF000000);
  }
  
  writeTo({ canvasContext, xOffset = 0, yOffset = 0 }) {
    canvasContext.putImageData(this.imageData, xOffset, yOffset);
  }

  // Draws a vertically scaled and bilinearly filtered texture column to the offscreen buffer.
  // sourceX / texXFrac together give the sub-pixel X position in the texture:
  //   sourceX  = integer column (0 .. sourceWidth-1)
  //   texXFrac = fractional part (0.0 .. <1.0) — lerps toward the next column
  // Y is also bilinearly filtered: the exact fractional texture-Y is computed per screen pixel
  // from the destination/source height ratio, eliminating the staircase of the old Bresenham scaler.
  // shadeR/G/B allow per-channel tinting for coloured light zones; each defaults to `shade`
  // so callers that only pass `shade` continue to work unchanged.
  drawVerticalBufferSlice({ sourcePixels, sourceX, texXFrac = 0, sourceWidth, sourceHeight, destinationX, destinationY, destinationHeight, shade = 256, shadeR = shade, shadeG = shade, shadeB = shade }) {
    const bytesPerPixel = 4;
    const bpr = sourceWidth * bytesPerPixel; // bytes per texture row

    // Clip destination to the visible screen vertically.
    const startY = Math.max(destinationY, 0);
    const endY   = Math.min(destinationY + destinationHeight, this.height);
    if (startY >= endY) return;

    // Precompute X-axis bilinear weights (constant for the whole column).
    const txA  = sourceX;
    const txB  = (sourceX + 1) % sourceWidth;
    const idxXA = txA * bytesPerPixel;
    const idxXB = txB * bytesPerPixel;
    const fx1  = 1.0 - texXFrac;

    // How many texture rows correspond to one destination pixel.
    const tyStep = sourceHeight / destinationHeight;

    let destIdx = this.width * bytesPerPixel * startY + bytesPerPixel * destinationX;
    const destRowStride = bytesPerPixel * this.width;

    for (let screenY = startY; screenY < endY; screenY++) {
      // Fractional texture-Y for this screen pixel.
      const ty     = (screenY - destinationY) * tyStep;
      const tyFloor = ty | 0;
      const tyA    = Math.min(tyFloor,     sourceHeight - 1);
      const tyB    = Math.min(tyFloor + 1, sourceHeight - 1);
      const fy     = ty - tyFloor;
      const fy1    = 1.0 - fy;

      // Four texel addresses.
      const rowA = tyA * bpr;
      const rowB = tyB * bpr;
      const aa = rowA + idxXA,  ab = rowA + idxXB;
      const ba = rowB + idxXA,  bb = rowB + idxXB;

      // Bilinear weights — one mul saved per channel by factoring through fy/fy1.
      const topL = fy1 * fx1,  topR = fy1 * texXFrac;
      const botL = fy  * fx1,  botR = fy  * texXFrac;

      const r = (sourcePixels[aa]   * topL + sourcePixels[ab]   * topR +
                 sourcePixels[ba]   * botL + sourcePixels[bb]   * botR) | 0;
      const g = (sourcePixels[aa+1] * topL + sourcePixels[ab+1] * topR +
                 sourcePixels[ba+1] * botL + sourcePixels[bb+1] * botR) | 0;
      const b = (sourcePixels[aa+2] * topL + sourcePixels[ab+2] * topR +
                 sourcePixels[ba+2] * botL + sourcePixels[bb+2] * botR) | 0;

      // Use shade LUT for faster shading (precomputed lookup instead of multiply+shift).
      this.imagePixels[destIdx]   = shadeLUTByShade[shadeR][r];
      this.imagePixels[destIdx+1] = shadeLUTByShade[shadeG][g];
      this.imagePixels[destIdx+2] = shadeLUTByShade[shadeB][b];
      this.imagePixels[destIdx+3] = sourcePixels[aa+3];

      destIdx += destRowStride;
    }
  }

  drawImage({ sourceImage, sourceX, sourceY, sourceWidth, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight }) {
    this.canvasContext.drawImage(
      sourceImage,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );
  }

  getImageData() {
    return this.imageData;
  }

  getPixels() {
    return this.imagePixels;
  }
}
