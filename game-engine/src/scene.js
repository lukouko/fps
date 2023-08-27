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

  for (let screenColumn = 0; screenColumn < displayInfo.width; ++screenColumn) {
    localCache.rayBaseAngleByScreenColumn[screenColumn] = screenColumn * displayInfo.angleBetweenRays;
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
  const initialAngle = orientation.angle - displayInfo.halfFieldOfView; // The starting angle for ray casting.
  
  const wallRays = [];
  let centreRay;

  /** @type Types.Orientation */
  const rayOrientation = { ...orientation };

  for (let rayIndex = 0; rayIndex < displayInfo.width; ++rayIndex) {
    rayOrientation.angle = initialAngle + localCache.rayBaseAngleByScreenColumn[rayIndex];
    
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

  // Using this calculation for distance instead of the raw ray distance fixes
  // the fish eye effect cause by calculating the rays from a single central point
  // on the player.
  // Using toFixed() seemed to remove even more fish eye but I'm not sure why. Math.round() worked too, but not as good.
  const distance = Number((rayCollision.distance * Math.cos(rayCollision.source.angle - orientation.angle)).toFixed(3));
  //const distance = rayCollision.distance * Math.cos(rayCollision.source.angle - orientation.angle);
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
  // Sort sprites by distance from the player, further to closest.
  const sortedSprites = [];

  const maxDistance = helpers.distanceBetween({ positionA: { x: 0, y: 0 }, positionB: mapState.scaledMapBounds }) / 3;

  for (const sprite of mapState.currentMap.sprites) {
    const spriteDistance = helpers.distanceBetween({ positionA: orientation.position, positionB: sprite.position });

    // The angle between the sprite position and player position.
    const spriteAngle = Math.atan2(sprite.position.y - orientation.position.y, sprite.position.x - orientation.position.x);
    //const spriteAngle = Math.atan2(orientation.position.y - sprite.position.y, orientation.position.x - sprite.position.x);
    // The angle between the sprite and player orientation angle
    const spriteAngleOffset = spriteAngle - orientation.angle;

    let angleDifference = Math.abs(spriteAngle - orientation.angle);
    angleDifference = angleDifference % (2 * Math.PI);
    if (angleDifference > Math.PI) {
      angleDifference = 2 * Math.PI - angleDifference;
    }

    const isOutsideFOV = angleDifference > displayInfo.fieldOfView;
    if (!isOutsideFOV) {
      sortedSprites.push({ sprite, spriteDistance, spriteAngle, spriteAngleOffset });
    }
  }

  sortedSprites.sort((a, b) => b.spriteDistance - a.spriteDistance);

  // Render the sprites
  for (const { sprite, spriteDistance, spriteAngleOffset, spriteAngle } of sortedSprites) {
    // Calculate the projected height of the sprite on the screen. The size of the sprite will get smaller
    // when the player is further away.
    const relativeSpriteDistance = (maxDistance - spriteDistance) / maxDistance;
    if (relativeSpriteDistance < 0.05) {
      continue;
    }

    const spriteTextureSuffix = getTextureLabel({ distance: relativeSpriteDistance });
    const spriteTexture = textures.getTextureById({ id: `better-looking-matt${spriteTextureSuffix}`});

    // Calculate the screen coordinates for the sprite
    const spriteScreenStartY = displayInfo.halfHeight - Math.floor(spriteTexture.height / 2);
    const spriteScreenEndY = spriteTexture.height + spriteScreenStartY;
    const spriteScreenOffsetX = Math.floor(Math.tan(spriteAngleOffset) * (displayInfo.distanceToProjectionPlane / displayInfo.fieldOfView));
    const spriteScreenStartX = Math.floor(displayInfo.halfWidth + spriteScreenOffsetX);
    const spriteScreenEndX = spriteScreenStartX + spriteTexture.width;

    if (
      spriteScreenEndX < 0 || spriteScreenStartX >= displayInfo.width ||
      spriteDistance <= 0
    ) {
      // Skip drawing if the sprite is not within the field of view or behind the player
      continue;
    }

    for (let screenX = Math.max(spriteScreenStartX, 0); screenX < Math.min(spriteScreenEndX, displayInfo.width); screenX++) {
      const spriteX = Math.floor(screenX - spriteScreenStartX);

      if (spriteDistance < wallRays[screenX].distance) {
        for (let screenY = spriteScreenStartY; screenY < Math.min(spriteScreenEndY, displayInfo.height); ++screenY) {
          const spriteY = Math.floor(screenY - spriteScreenStartY);
          const bytesPerPixel = 4;
          const textureIndex = (spriteY * spriteTexture.bytesPerRow) + (bytesPerPixel * spriteX);
    
          const brightnessLevel = 1;
          const spriteRed = Math.floor(spriteTexture.pixelBuffer[textureIndex] * brightnessLevel);
          const spriteGreen = Math.floor(spriteTexture.pixelBuffer[textureIndex + 1] * brightnessLevel);
          const spriteBlue = Math.floor(spriteTexture.pixelBuffer[textureIndex + 2] * brightnessLevel);
          const spriteAlpha = Math.floor(spriteTexture.pixelBuffer[textureIndex + 3]);

          // Skip invisible sprite colour.
          if (spriteGreen === 0 && spriteBlue === 0 && spriteRed === 0) {
            continue;
          }
    
          // Calculate sprite screen position (x-coordinate on the screen) and index in screen buffer    
          const offScreenBufferSpriteIndex = (screenX * bytesPerPixel) + (screenY * localCache.offScreenBufferBytesPerRow);

          offScreenBufferPixels[offScreenBufferSpriteIndex] = spriteRed;
          offScreenBufferPixels[offScreenBufferSpriteIndex + 1] = spriteGreen;
          offScreenBufferPixels[offScreenBufferSpriteIndex + 2] = spriteBlue;
          offScreenBufferPixels[offScreenBufferSpriteIndex + 3] = spriteAlpha;
        }
      }
    }
  }
};

const getTextureLabel = ({ distance }) => {
  const rounded = Math.round(distance * 100);
  if (rounded >= 100) {
    return '';
  }

  if (rounded <= 5) {
    return '-5';
  }

  return `-${rounded}`;
}

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

