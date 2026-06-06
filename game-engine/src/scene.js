import * as constants from './constants';
import * as textures from './textures';
import * as helpers from './helpers';
import * as Types from './types';
import { isOutOfBounds, getMapCell } from './map';
import { OffScreenBuffer } from './offscreen-buffer';

let offScreenBuffer;

const localCache = {
  rayBaseAngleByScreenColumn: {},
  offScreenBufferBytesPerRow: 0,
};

/**
 * Inialises scene resources.
 * 
 * @param {Object} params
 * @param {Types.DisplayInfo} params.displayInfo
 */
export const initialise = ({ displayInfo }) => {
  if (!displayInfo || typeof displayInfo !== 'object') {
    throw new Error('displayInfo must be a valid object');
  }

  // Screen buffer stuff
  offScreenBuffer = new OffScreenBuffer({ width: displayInfo.width, height: displayInfo.height });

  // Initialise the local cache.
  const bytesPerPixel = 4;

  localCache.offScreenBufferBytesPerRow = offScreenBuffer.width * bytesPerPixel;

  // Precompute per-column angle offsets using arctan so that each ray maps to an
  // equal interval in screen space rather than an equal angular interval. Equal-angle
  // stepping causes non-linear texture sampling (tan of a linear angle), which makes
  // textures visibly curve at the screen edges. Arctan spacing makes the wall
  // intersection point linear in screen-column, matching true perspective projection.
  for (let screenColumn = 0; screenColumn < displayInfo.width; ++screenColumn) {
    localCache.rayBaseAngleByScreenColumn[screenColumn] = Math.atan(
      (screenColumn - displayInfo.halfWidth) / displayInfo.distanceToProjectionPlane
    );
  }
};

/**
 * Renders the map scene to a canvas context relative to an orientation point.
 * 
 * @param {Object} params
 * @param {CanvasRenderingContext2D} params.canvasContext A destination 2d context of a HTML5 canvas to which the scene will be rendered.
 * @param {Types.Orientation} params.orientation The perspective from which the scene is to be rendered.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.DisplayInfo} params.displayInfo
 * @returns {{wallRays: Array<Types.RayCollision>, centreRay: Types.RayCollision}}
 */
export const render = ({ canvasContext, orientation, mapState, displayInfo }) => {
  offScreenBuffer.clear();

  const offScreenBufferPixels = offScreenBuffer.getPixels();
  const wallRays = [];
  let centreRay;

  /** @type Types.Orientation */
  const rayOrientation = { ...orientation };

  for (let rayIndex = 0; rayIndex < displayInfo.width; ++rayIndex) {
    rayOrientation.angle = orientation.angle + localCache.rayBaseAngleByScreenColumn[rayIndex];
    
    const rayCollision = castWallRay({ orientation: rayOrientation, mapState });
    wallRays.push(rayCollision);

    if (rayIndex === displayInfo.halfWidthFloored) {
      centreRay = rayCollision;
    }
    
    renderWallRay({ offScreenBufferPixels, orientation, mapState, rayCollision, rayIndex, displayInfo });
  }

  renderSprites({ offScreenBufferPixels, wallRays, orientation, mapState, displayInfo });
  
  canvasContext.putImageData(offScreenBuffer.getImageData(), 0, 0);

  // Other parts of the app may need to make use of the rays we cast onto the walls.
  return { wallRays, centreRay };
};

/**
 * Casts two rays from a set position and returns the nearest collision point of the two rays.
 * One ray is cast checking for collisions on the X axis, the other is cast checking for collisions on the Y axis.
 * 
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} The closest collision in the map measured from the orientation position. 
 */
const castWallRay = ({ orientation, mapState }) => {
  const verticalCollision = calculateVerticalCollision({ orientation, mapState });
  const horizontalCollision = calculateHorizontalCollision({ orientation, mapState });

  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

/**
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} 
 */
const calculateVerticalCollision = ({ orientation, mapState }) => {
  const { position: sourcePosition, angle } = orientation;

  // Check for vertical collisions.
  const isAngleFacingRight = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2) !== 0;

  // const firstX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstX = isAngleFacingRight
    ? Math.floor(sourcePosition.x / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE
    : Math.floor(sourcePosition.x / constants.CELL_SIZE) * constants.CELL_SIZE;

  const firstY = sourcePosition.y + (firstX - sourcePosition.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? constants.CELL_SIZE : -constants.CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  const result = {
    source: orientation,
    mapCell: undefined, 
    distance: -1, 
    isVertical: true,
    isHorizontal: false,
    collisionPoint: {
      x: firstX,
      y: firstY,
    },
    collisionCell: {
      x: undefined,
      y: undefined,
    },
  };

  while (!result.mapCell?.wallTextureId) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    result.collisionCell.y = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell?.wallTextureId) {
      result.collisionPoint.x += xStepSize;
      result.collisionPoint.y += yStepSize;
    }
  }

  result.distance = helpers.distanceBetween({ positionA: sourcePosition, positionB: result.collisionPoint });
  return result;
};

/**
 * @param {Object} params
 * @param {Types.Orientation} params.orientation The source point and angle from which the rays are being cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @returns {Types.RayCollision} 
 */
const calculateHorizontalCollision = ({ orientation, mapState }) => {
  const { position: sourcePosition, angle } = orientation;
  
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(sourcePosition.y / constants.CELL_SIZE) * constants.CELL_SIZE :
    Math.floor(sourcePosition.y / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE;

  const firstX = sourcePosition.x + (firstY - sourcePosition.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -constants.CELL_SIZE : constants.CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  const result = {
    source: orientation,
    mapCell: undefined, 
    distance: -1, 
    isVertical: false,
    isHorizontal: true,
    collisionPoint: {
      x: firstX,
      y: firstY,
    },
    collisionCell: {
      x: undefined,
      y: undefined,
    },
  };

  while (!result.mapCell?.wallTextureId) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = Math.floor(nextX / constants.CELL_SIZE);
    result.collisionCell.y = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell?.wallTextureId) {
      result.collisionPoint.y += yStepSize;
      result.collisionPoint.x += xStepSize;
    }
  }

  result.distance = helpers.distanceBetween({ positionA: sourcePosition, positionB: result.collisionPoint });
  return result;
}

/**
 * Renders the result of a wall ray collision. This function will effectively render a single pixel wide vertical
 * column to the off screen buffer.
 * 
 * @param {Object} params
 * @param {Object} params.offScreenBufferPixels The array of pixels representing the projection plane.
 * @param {Types.Orientation} params.orientation The perspective point from where the ray was cast.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.RayCollision} params.rayCollision The resulting collision of the ray cast
 * @param {number} params.rayIndex The index in the set of (FOV / displayInfo.width) rays that are cast per render cycle.
 * @param {Types.DisplayInfo} params.displayInfo 
 */
const renderWallRay = ({ offScreenBufferPixels, orientation, mapState, rayCollision, rayIndex, displayInfo }) => {
  const { wallTextureId } = rayCollision.mapCell;

  const wallTexture = textures.getTextureById({ id: wallTextureId });

  // Convert Euclidean ray distance to perpendicular (projection-plane) distance to
  // prevent the wall-height fisheye that results from using the raw Euclidean distance.
  const distance = rayCollision.distance * Math.cos(rayCollision.source.angle - orientation.angle);
  const wallHeight = Math.floor(constants.CELL_SIZE * displayInfo.distanceToProjectionPlane / distance); // Doesn't have to be cell size.
  const halfWallHeight = wallHeight / 2;
  const wallTextureOffset = Math.floor(rayCollision.isVertical ? rayCollision.collisionPoint.y : rayCollision.collisionPoint.x);

  // Draw walls.
  offScreenBuffer.drawVerticalBufferSlice({
    sourcePixels: wallTexture.pixelBuffer,
    sourceX: wallTextureOffset % wallTexture.width,
    sourceWidth: wallTexture.width,
    sourceHeight: wallTexture.height,
    destinationX: rayIndex,
    destinationY: displayInfo.halfHeightFloored - Math.floor(halfWallHeight),
    destinationHeight: wallHeight,
  });

  // Draw floor.
  const bytesPerPixel = 4;
  const bottomOfWall = Math.floor(displayInfo.halfHeight + halfWallHeight);
  const topOfWall = Math.floor(displayInfo.halfHeight - halfWallHeight);

  // No need to render floor if the bottom of the wall reaches the bottom of the screen.
  if (topOfWall <= 0 && bottomOfWall > displayInfo.height) {
    return;
  }

  let offScreenBufferFloorIndex = Math.floor(bottomOfWall * localCache.offScreenBufferBytesPerRow + (bytesPerPixel * rayIndex));
  let offScreenBufferCeilingIndex = Math.floor(topOfWall * localCache.offScreenBufferBytesPerRow + (bytesPerPixel * rayIndex));

  // Because of the Math.floor logic throughout, there is a good chance that the ceiling has 1 more pixel than the floor (or vice versa).
  // To account for this we have a +1 on the displayInfo.height. This might lead to a crash, but it's super efficient, so for now, i'll assume
  // it works and adjust if it turns out not to work.
  const pixelsToRender = displayInfo.height + 1;

  for (let floorPixelYIndex = bottomOfWall; floorPixelYIndex <= pixelsToRender; ++floorPixelYIndex) {
    // Calcualte the straight distance between the player and the pixel.
    const directFloorDistance = constants.PLAYER_HEIGHT / (floorPixelYIndex - displayInfo.halfHeight) ;
    //const diagonalDistanceToFloor = Math.floor((constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE * directFloorDistance) * Math.cos(wallRay.angle - player.angle));
    const diagonalDistanceToFloor = Math.floor((displayInfo.distanceToProjectionPlane * directFloorDistance) * (1.0 / Math.cos(rayCollision.source.angle - orientation.angle)));

	  const xEnd = Math.floor(diagonalDistanceToFloor * Math.cos(rayCollision.source.angle) + orientation.position.x);
    const yEnd = Math.floor(diagonalDistanceToFloor * Math.sin(rayCollision.source.angle) + orientation.position.y);

    // Get the tile intersected by ray
    const cellX = Math.floor(xEnd / constants.CELL_SIZE);
    const cellY = Math.floor(yEnd / constants.CELL_SIZE);

    if (isOutOfBounds({ position: { x: cellX, y: cellY }, mapState })) {
      continue;
    }

    // The map cell which is having its floor and ceiling filled.
    const mapCell = getMapCell({ position: { x: cellX, y: cellY }, mapState });

    if (!mapCell.floorTextureId && !mapCell.ceilingTextureId) {
      continue;
    }

    const floorTexture = textures.getTextureById({ id: mapCell.floorTextureId });
    const ceilingTexture = textures.getTextureById({ id: mapCell.ceilingTextureId });

    // Note, we are assuming the same texture size for floor and ceiling here.
    // If that stops holding true, we will need separate calculations for floor and ceiling.
    const textureRow = Math.floor(yEnd % floorTexture.height);
    const textureColumn = Math.floor(xEnd % floorTexture.width);
    const sourceIndex = (textureRow * floorTexture.bytesPerRow) + (bytesPerPixel * textureColumn);

    // Draw the floor pixel
    const brightnessLevel = 1; //(400 / diagonalDistanceToFloor);
    const red = Math.floor(floorTexture.pixelBuffer[sourceIndex] * brightnessLevel);
    const green = Math.floor(floorTexture.pixelBuffer[sourceIndex + 1] * brightnessLevel);
    const blue = Math.floor(floorTexture.pixelBuffer[sourceIndex + 2] * brightnessLevel);
    const alpha = Math.floor(floorTexture.pixelBuffer[sourceIndex + 3]);	

    offScreenBufferPixels[offScreenBufferFloorIndex] = red;
    offScreenBufferPixels[offScreenBufferFloorIndex + 1] = green;
    offScreenBufferPixels[offScreenBufferFloorIndex + 2] = blue;
    offScreenBufferPixels[offScreenBufferFloorIndex + 3] = alpha;

    // Draw the ceiling pixel.
    const ceilingRed = Math.floor(ceilingTexture.pixelBuffer[sourceIndex] * brightnessLevel);
    const ceilingGreen = Math.floor(ceilingTexture.pixelBuffer[sourceIndex + 1] * brightnessLevel);
    const ceilingBlue = Math.floor(ceilingTexture.pixelBuffer[sourceIndex + 2] * brightnessLevel);
    const ceilingAlpha = Math.floor(ceilingTexture.pixelBuffer[sourceIndex + 3]);	

    offScreenBufferPixels[offScreenBufferCeilingIndex] = ceilingRed;
    offScreenBufferPixels[offScreenBufferCeilingIndex + 1] = ceilingGreen;
    offScreenBufferPixels[offScreenBufferCeilingIndex + 2] = ceilingBlue;
    offScreenBufferPixels[offScreenBufferCeilingIndex + 3] = ceilingAlpha;

    // Go to the next pixel (directly under the current pixel)
    offScreenBufferFloorIndex += localCache.offScreenBufferBytesPerRow;
    offScreenBufferCeilingIndex -= localCache.offScreenBufferBytesPerRow;
  }
};

/**
 * Renders all of the sprites in mapstate to the scene.
 *
 * @param {Object} params
 * @param {Object} params.offScreenBufferPixels The array of pixels representing the projection plane.
 * @param {Array<Types.RayCollision>} params.wallRays The rays cast for walls
 * @param {Types.Orientation} params.orientation The perspective point and angle from which the scene is being rendered.
 * @param {Types.MapState} params.mapState The current map state.
 * @param {Types.DisplayInfo} params.displayInfo
 */
const renderSprites = ({ offScreenBufferPixels, wallRays, orientation, mapState, displayInfo }) => {
  const sprites = [];

  for (const sprite of mapState.currentMap.sprites) {
    const dx = sprite.position.x - orientation.position.x;
    const dy = sprite.position.y - orientation.position.y;
    const spriteDistance = Math.sqrt(dx * dx + dy * dy);
    if (spriteDistance <= 0) continue;

    const spriteAngle = Math.atan2(dy, dx);
    let spriteAngleOffset = spriteAngle - orientation.angle;

    // Normalise to [-PI, PI]
    while (spriteAngleOffset > Math.PI) spriteAngleOffset -= 2 * Math.PI;
    while (spriteAngleOffset < -Math.PI) spriteAngleOffset += 2 * Math.PI;

    // Skip sprites behind the player
    if (Math.abs(spriteAngleOffset) >= Math.PI / 2) continue;

    sprites.push({ sprite, spriteDistance, spriteAngleOffset });
  }

  sprites.sort((a, b) => b.spriteDistance - a.spriteDistance);

  for (const { sprite, spriteDistance, spriteAngleOffset } of sprites) {
    const spriteTexture = textures.getTextureById({ id: sprite.textureId });
    if (!spriteTexture) continue;

    // Fisheye-corrected perpendicular distance — same correction used for walls.
    const perpDistance = spriteDistance * Math.cos(spriteAngleOffset);
    if (perpDistance <= 0) continue;

    // Project size using the same formula as walls.
    const projectedHeight = Math.floor(constants.CELL_SIZE * displayInfo.distanceToProjectionPlane / perpDistance);
    const projectedWidth = Math.floor(projectedHeight * spriteTexture.width / spriteTexture.height);

    const spriteCenterX = Math.floor(displayInfo.halfWidth + Math.tan(spriteAngleOffset) * displayInfo.distanceToProjectionPlane);
    const spriteLeft = spriteCenterX - Math.floor(projectedWidth / 2);
    const spriteTop = Math.floor(displayInfo.halfHeight - projectedHeight / 2);

    const drawLeft = Math.max(spriteLeft, 0);
    const drawRight = Math.min(spriteLeft + projectedWidth, displayInfo.width);
    const drawTop = Math.max(spriteTop, 0);
    const drawBottom = Math.min(spriteTop + projectedHeight, displayInfo.height);

    if (drawLeft >= drawRight || drawTop >= drawBottom) continue;

    const bytesPerPixel = 4;

    for (let screenX = drawLeft; screenX < drawRight; screenX++) {
      if (spriteDistance >= wallRays[screenX].distance) continue;

      const texX = Math.floor((screenX - spriteLeft) * spriteTexture.width / projectedWidth);

      for (let screenY = drawTop; screenY < drawBottom; screenY++) {
        const texY = Math.floor((screenY - spriteTop) * spriteTexture.height / projectedHeight);

        const textureIndex = (texY * spriteTexture.bytesPerRow) + (bytesPerPixel * texX);
        const r = spriteTexture.pixelBuffer[textureIndex];
        const g = spriteTexture.pixelBuffer[textureIndex + 1];
        const b = spriteTexture.pixelBuffer[textureIndex + 2];
        const a = spriteTexture.pixelBuffer[textureIndex + 3];

        if (r === 0 && g === 0 && b === 0) continue;

        const bufferIndex = (screenX * bytesPerPixel) + (screenY * localCache.offScreenBufferBytesPerRow);
        offScreenBufferPixels[bufferIndex] = r;
        offScreenBufferPixels[bufferIndex + 1] = g;
        offScreenBufferPixels[bufferIndex + 2] = b;
        offScreenBufferPixels[bufferIndex + 3] = a;
      }
    }
  }
};

const debugLog = (...args) => {
  const debug = false;
  if (debug) {
    console.log(...args);
  }
}





/*const renderSprites = ({ offScreenBufferPixels, orientation, mapState, displayInfo }) => {
  const sortedSprites = [];

  // Sort sprites by distance
  for (const sprite of mapState.currentMap.sprites) {
    const spriteDistance = (sprite.position.x - orientation.position.x) ** 2 + (sprite.position.y - orientation.position.y) ** 2;
    const spriteAngle = Math.atan2(sprite.position.y - orientation.position.y, sprite.position.x - orientation.position.x) - orientation.angle;
    sortedSprites.push({ sprite, spriteDistance, spriteAngle });
  }
  
  sortedSprites.sort((a, b) => b.spriteDistance - a.spriteDistance);
  
  const baseSpriteSize = 10000;
  
  for (const { sprite, spriteDistance, spriteAngle } of sortedSprites) {
    const spriteTexture = textures.getTextureById({ id: sprite.textureId });
    //const sizeFactor = baseSpriteSize / spriteDistance;
    
    const adjustedSpriteWidth = spriteTexture.width; //Math.floor(spriteTexture.width * sizeFactor);
    const adjustedSpriteHeight = spriteTexture.height; //Math.floor(spriteTexture.height * sizeFactor);
  
    const halfAdjustedSpriteWidth = Math.floor(adjustedSpriteWidth / 2);
  
    for (let spriteX = 0; spriteX < adjustedSpriteWidth; ++spriteX) {
      // Calculate the angle of the sprite column relative to the center of the sprite
      const angleToSpriteColumn = Math.atan2(spriteX - halfAdjustedSpriteWidth, displayInfo.distanceToProjectionPlane);
  
      // Calculate the absolute angle of the sprite column relative to the player's orientation
      const absoluteColumnAngle = orientation.angle + angleToSpriteColumn;
  
      if (Math.abs(spriteAngle - absoluteColumnAngle) > displayInfo.halfFieldOfView) {
        continue;
      }
  
      for (let spriteY = 0; spriteY < adjustedSpriteHeight; ++spriteY) {
        //const textureColumn = Math.floor((orientation.position.x - sprite.position.x + adjustedSpriteWidth / 2) * (spriteTexture.width / adjustedSpriteWidth));
        //const textureRow = Math.floor((orientation.position.y - (displayInfo.height - adjustedSpriteHeight) / 2) * (spriteTexture.height / adjustedSpriteHeight));
        const textureColumn = spriteX;
        const textureRow = spriteY;
  
        const textureX = textureColumn % spriteTexture.width;
        const textureY = textureRow % spriteTexture.height;
  
        const bytesPerPixel = 4;
        const textureIndex = (textureY * spriteTexture.bytesPerRow) + (bytesPerPixel * textureX);
  
        const brightnessLevel = 1;
        const spriteRed = Math.floor(spriteTexture.pixelBuffer[textureIndex] * brightnessLevel);
        const spriteGreen = Math.floor(spriteTexture.pixelBuffer[textureIndex + 1] * brightnessLevel);
        const spriteBlue = Math.floor(spriteTexture.pixelBuffer[textureIndex + 2] * brightnessLevel);
        const spriteAlpha = Math.floor(spriteTexture.pixelBuffer[textureIndex + 3]);
  
        // Calculate sprite screen position (x-coordinate on the screen) and index in screen buffer
        const horizontalOffset = Math.floor(Math.tan(spriteAngle) * (displayInfo.distanceToProjectionPlane / displayInfo.fieldOfView)); // displayInfo.distanceToProjectionPlane / displayInfo.fieldOfView)
  
        const spriteScreenPositionX = ((displayInfo.halfWidth + spriteX + horizontalOffset) * bytesPerPixel) + (spriteY * localCache.offScreenBufferBytesPerRow);
        //const spriteScreenPositionX = Math.floor((displayInfo.width / 2) + horizontalOffset);
        //if (spriteX % 100 === 0 && spriteY % 100 === 0)
        //console.log('horizontalOffset', horizontalOffset);
        const offScreenBufferSpriteIndex = spriteScreenPositionX;//spriteScreenPositionX * bytesPerPixel;
  
        offScreenBufferPixels[offScreenBufferSpriteIndex] = spriteRed;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 1] = spriteGreen;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 2] = spriteBlue;
        offScreenBufferPixels[offScreenBufferSpriteIndex + 3] = spriteAlpha;
      }
    }
  }
};*/

