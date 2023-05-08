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
 * @returns {{wallRays: Array<Types.RayCollision>}}
 */
export const render = ({ canvasContext, orientation, mapState, displayInfo }) => {
  offScreenBuffer.clear();

  const offScreenBufferPixels = offScreenBuffer.getPixels();
  const initialAngle = orientation.angle - displayInfo.halfFieldOfView; // The starting angle for ray casting.
  
  const wallRays = [];

  /** @type Types.Orientation */
  const rayOrientation = { ...orientation };

  for (let rayIndex = 0; rayIndex < displayInfo.width; ++rayIndex) {
    rayOrientation.angle = initialAngle + localCache.rayBaseAngleByScreenColumn[rayIndex];
    const rayCollision = castWallRay({ orientation: rayOrientation, mapState });
    wallRays.push(rayCollision);
    renderWallRay({ offScreenBufferPixels, orientation, mapState, rayCollision, rayIndex, displayInfo });
  }
  
  canvasContext.putImageData(offScreenBuffer.getImageData(), 0, 0);

  // Other parts of the app may need to make use of the rays we cast onto the walls.
  return { wallRays };
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

  while (!result.mapCell) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    result.collisionCell.y = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell) {
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

  while (!result.mapCell) {
    const { x: nextX, y: nextY } = result.collisionPoint;

    result.collisionCell.x = Math.floor(nextX / constants.CELL_SIZE);
    result.collisionCell.y = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ position: result.collisionCell, mapState })) {
      result.distance = Number.MAX_SAFE_INTEGER;
      return result;
    }

    result.mapCell = getMapCell({ position: result.collisionCell, mapState });

    if (!result.mapCell) {
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
  const wallTexture = textures.getTextureById({ id: 'vertical_timber_1' });
  const floorTexture = textures.getTextureById({ id: 'horizontal_timber_1' });
  const ceilingTexture = textures.getTextureById({ id: 'plaster_1' });

  // Using this calculation for distance instead of the raw ray distance fixes
  // the fish eye effect cause by calculating the rays from a single central point
  // on the player.
  const distance = rayCollision.distance * Math.cos(rayCollision.source.angle - orientation.angle);
  const wallHeight = (constants.CELL_SIZE * displayInfo.distanceToProjectionPlane / distance); // Doesn't have to be cell size.
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

  for (let floorPixelYIndex = bottomOfWall; floorPixelYIndex < displayInfo.height; ++floorPixelYIndex) {
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
