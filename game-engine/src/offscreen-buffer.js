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

  // castColumn, topOfWall, 1, (bottomOfWall-topOfWall)+1, xOffset, 160/(dist)
// (x, y, width, height, xOffset, brighnessLevel)
// x=destinationX, y=destinationY, width = destinationWidth, height=destinationHeight, 
  drawVerticalBufferSlice({ sourcePixels, sourceX, sourceWidth, sourceHeight, destinationX, destinationY, destinationHeight, shade }) {
    const bytesPerPixel = 4;

    // Clip to visible screen area — prevents near-infinite loops when the player is very
    // close to a wall (wallHeight can reach 100k+ pixels, but only screenHeight are visible).
    //if (destinationY >= this.height || destinationY + destinationHeight <= 0) return;
    // const visibleRows = Math.min(destinationHeight, this.height);

    let sourceBufferIndex = (bytesPerPixel * sourceX);
    const lastSourceBufferIndex = sourceBufferIndex + (sourceWidth * sourceHeight * bytesPerPixel);

    let destBufferIndex = (this.width * bytesPerPixel) * destinationY + (bytesPerPixel * destinationX);

    let heightToDraw = destinationHeight;
    let yError = 0;   
		
		// we're going to draw the first row, then move down and draw the next row
		// and so on we can use the original x destination to find out
		// the x position of the next row 
		// Remeber that the source bitmap is rotated, so the width is actually the
		// height
		while (true)
		{                     
			// if error < actualHeight, this will cause row to be skipped until
			// this addition sums to scaledHeight
			// if error > actualHeight, this ill cause row to be drawn repeatedly until
			// this addition becomes smaller than actualHeight
			// 1) Think the image height as 100, if percent is >= 100, we'll need to
			// copy the same pixel over and over while decrementing the percentage.  
			// 2) Similarly, if percent is <100, we skip a pixel while incrementing
			// and do 1) when the percentage we're adding has reached >=100
			yError += destinationHeight;
												  
			// dereference for faster access (especially useful when the same bit
			// will be copied more than once)
			//BIT srcBit = shadedPal[*src];
   	
			const red   = sourcePixels[sourceBufferIndex]     * shade >> 8;
			const green = sourcePixels[sourceBufferIndex + 1] * shade >> 8;
			const blue  = sourcePixels[sourceBufferIndex + 2] * shade >> 8;
			const alpha = sourcePixels[sourceBufferIndex + 3];
			
			// while there's a row to draw & not end of drawing area
			while (yError >= sourceWidth)
			{                  
				yError -= sourceWidth;

				this.imagePixels[destBufferIndex]=red;
				this.imagePixels[destBufferIndex + 1] = green;
				this.imagePixels[destBufferIndex + 2] = blue;
				this.imagePixels[destBufferIndex + 3] = alpha;

				destBufferIndex += (bytesPerPixel * this.width);

				// clip bottom (just return if we reach bottom)
				if (--heightToDraw < 1) {
					return;
        }
			} 

			sourceBufferIndex += (bytesPerPixel * sourceWidth);
			if (sourceBufferIndex > lastSourceBufferIndex) {
				sourceBufferIndex = lastSourceBufferIndex;
      }	
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
