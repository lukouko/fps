import * as constants from './constants';
import * as textures from './textures';
import * as helpers from './helpers';
import * as cache from './cache';
import { distanceTo as playerDistanceTo } from './player';
import { isOutOfBounds, getMapCell, getScaledMapSize } from './map';
import { OffScreenBuffer } from './offscreen-buffer';

let offScreenBuffer;

const localCache = {
  rayBaseAngleByScreenColumn: {},
  offScreenBufferBytesPerRow: 0,
};

export const initialise = () => {
  // Screen buffer stuff
  offScreenBuffer = new OffScreenBuffer({ width: constants.SCREEN_WIDTH, height: constants.SCREEN_HEIGHT });

  // Initialise the local cache.
  const bytesPerPixel = 4;

  localCache.offScreenBufferBytesPerRow = offScreenBuffer.width * bytesPerPixel; 

  for (let screenColumn = 0; screenColumn < constants.SCREEN_WIDTH; ++screenColumn) {
    localCache.rayBaseAngleByScreenColumn[screenColumn] = screenColumn * constants.ANGLE_BETWEEN_RAYS;
  }
};

const calculateVerticalCollision = ({ angle, player }) => {
  // Check for vertical collisions.
  const isAngleFacingRight = Math.abs(Math.floor((angle - Math.PI / 2) / Math.PI) % 2) !== 0;

  // const firstX = Math.floor(player.x / CELL_SIZE) * CELL_SIZE;
  const firstX = isAngleFacingRight
    ? Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE
    : Math.floor(player.x / constants.CELL_SIZE) * constants.CELL_SIZE;
  const firstY = player.y + (firstX - player.x) * Math.tan(angle);

  const xStepSize = isAngleFacingRight ? constants.CELL_SIZE : -constants.CELL_SIZE;
  const yStepSize = xStepSize * Math.tan(angle);

  let mapCell;
  let nextX = firstX;
  let nextY = firstY;

  while (!mapCell) {
    const cellX = isAngleFacingRight ? Math.floor(nextX / constants.CELL_SIZE) : Math.floor(nextX / constants.CELL_SIZE) - 1;
    const cellY = Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      break;
    }

    mapCell = getMapCell({ cellY, cellX });

    if (!mapCell) {
      nextX += xStepSize;
      nextY += yStepSize;
    }
  }

  return { mapCell, distance: playerDistanceTo({ x: nextX, y: nextY }), isVertical: true, x: nextX, y: nextY };
};

const calculateHorizontalCollision = ({ angle, player }) => {
  // Check for vertical collisions.
  const isAngleFacingUp = (Math.abs(Math.floor(angle / Math.PI)) % 2) !== 0;

  const firstY = isAngleFacingUp ? 
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE :
    Math.floor(player.y / constants.CELL_SIZE) * constants.CELL_SIZE + constants.CELL_SIZE;

  const firstX = player.x + (firstY - player.y) / Math.tan(angle);

  const yStepSize = isAngleFacingUp ? -constants.CELL_SIZE : constants.CELL_SIZE;
  const xStepSize = yStepSize / Math.tan(angle);

  let mapCell;
  let nextX = firstX;
  let nextY = firstY;

  while (!mapCell) {
    const cellX = Math.floor(nextX / constants.CELL_SIZE);
    const cellY = isAngleFacingUp ? Math.floor(nextY / constants.CELL_SIZE) - 1 : Math.floor(nextY / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      break;
    }

    mapCell = getMapCell({ cellY, cellX });

    if (!mapCell) {
      nextY += yStepSize;
      nextX += xStepSize;
    }
  }

  return { mapCell, distance: playerDistanceTo({ x: nextX, y: nextY }), isHorizontal: true, x: nextX, y: nextY  };
}

const castWallRay = ({ angle, player }) => {
  const verticalCollision = calculateVerticalCollision({ angle, player });
  const horizontalCollision = calculateHorizontalCollision({ angle, player });

  const collision = horizontalCollision.distance >= verticalCollision.distance ? verticalCollision : horizontalCollision;
  return collision;
};

export const render = ({ canvasContext, player }) => {
  offScreenBuffer.clear();

  const offScreenBufferPixels = offScreenBuffer.getPixels();
  const initialAngle = player.angle - constants.HALF_FIELD_OF_VIEW; // The starting angle for ray casting.
  
  const wallRays = [];
  for (let rayIndex = 0; rayIndex < constants.SCREEN_WIDTH; ++rayIndex) {
    const angleOfRay = initialAngle + localCache.rayBaseAngleByScreenColumn[rayIndex];
    const collision = castWallRay({ angle: angleOfRay, player });
    const wallRay = {
      angle: angleOfRay,
      collisionDistance: collision.distance,
      collidedHorizontally: !!collision.isHorizontal,
      collidedVertically: !!collision.isVertical,
      collisionX: collision.x,
      collisionY: collision.y,
      collidedMapCell: collision.mapCell,
    };

    wallRays.push(wallRay);
    renderWallRay({ canvasContext, offScreenBufferPixels, player, wallRay, rayIndex });
  }

  
  canvasContext.putImageData(offScreenBuffer.getImageData(), 0, 0);

  // Other parts of the app may need to make use of the rays we cast onto the walls.
  return { wallRays };
};

const renderWallRay = ({ canvasContext, offScreenBufferPixels, player, wallRay, rayIndex }) => {
  const wallTexture = textures.getTextureById({ id: 'plaster_1' });
  const floorTexture = textures.getTextureById({ id: 'horizontal_timber_1' });
  const ceilingTexture = textures.getTextureById({ id: 'plaster_1' });

  // Using this calculation for distance instead of the raw ray distance fixes
  // the fish eye effect cause by calculating the rays from a single central point
  // on the player.
  const distance = wallRay.collisionDistance * Math.cos(wallRay.angle - player.angle);
  const wallHeight = (constants.CELL_SIZE * constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE / distance); // Doesn't have to be cell size.
  const halfWallHeight = wallHeight / 2;
  const wallTextureOffset = Math.floor(wallRay.collidedVertically ? wallRay.collisionY : wallRay.collisionX);

  // Draw walls.
  offScreenBuffer.drawVerticalBufferSlice({
    sourcePixels: wallTexture.pixelBuffer,
    sourceX: wallTextureOffset % wallTexture.width,
    sourceWidth: wallTexture.width,
    sourceHeight: wallTexture.height,
    destinationX: rayIndex,
    destinationY: Math.floor(constants.HALF_SCREEN_HEIGHT) - Math.floor(halfWallHeight),
    destinationHeight: wallHeight,
  });

  // Draw floor.
  const bytesPerPixel = 4;
  const bottomOfWall = Math.floor(constants.HALF_SCREEN_HEIGHT + halfWallHeight);
  const topOfWall = Math.floor(constants.HALF_SCREEN_HEIGHT - halfWallHeight);

  // No need to render floor if the bottom of the wall reaches the bottom of the screen.
  if (topOfWall <= 0 && bottomOfWall > constants.SCREEN_HEIGHT) {
    return;
  }

  let offScreenBufferFloorIndex = Math.floor(bottomOfWall * localCache.offScreenBufferBytesPerRow + (bytesPerPixel * rayIndex));
  let offScreenBufferCeilingIndex = Math.floor(topOfWall * localCache.offScreenBufferBytesPerRow + (bytesPerPixel * rayIndex));

  for (let floorPixelYIndex = bottomOfWall; floorPixelYIndex < constants.SCREEN_HEIGHT; ++floorPixelYIndex) {
    // Calcualte the straight distance between the player and the pixel.
    const directFloorDistance = constants.PLAYER_HEIGHT / (floorPixelYIndex - constants.HALF_SCREEN_HEIGHT) ;
    //const diagonalDistanceToFloor = Math.floor((constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE * directFloorDistance) * Math.cos(wallRay.angle - player.angle));
    const diagonalDistanceToFloor = Math.floor((constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE * directFloorDistance) * (1.0 / Math.cos(wallRay.angle - player.angle)));

	  const xEnd = Math.floor(diagonalDistanceToFloor * Math.cos(wallRay.angle) + player.x);
    const yEnd = Math.floor(diagonalDistanceToFloor * Math.sin(wallRay.angle) + player.y);

    // Get the tile intersected by ray
    const cellX = Math.floor(xEnd / constants.CELL_SIZE);
    const cellY = Math.floor(yEnd / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      return;
    }

    // Note, we are assuming the same texture size for floor and ceiling here.
    // If that stops holding true, we will need separate calculations for floor and ceiling.
    const textureRow = Math.floor(yEnd % floorTexture.height);
    const textureColumn = Math.floor(xEnd % floorTexture.width);
    const sourceIndex = (textureRow * floorTexture.bytesPerRow) + (bytesPerPixel * textureColumn);

    // Cheap shading trick
    const brightnessLevel = (400 / diagonalDistanceToFloor);
    const red = Math.floor(floorTexture.pixelBuffer[sourceIndex] * brightnessLevel);
    const green = Math.floor(floorTexture.pixelBuffer[sourceIndex + 1] * brightnessLevel);
    const blue = Math.floor(floorTexture.pixelBuffer[sourceIndex + 2] * brightnessLevel);
    const alpha = Math.floor(floorTexture.pixelBuffer[sourceIndex + 3]);	

    // Draw the floor pixel
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
