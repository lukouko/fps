import * as constants from './constants';
import * as textures from './textures';
import * as helpers from './helpers';
import * as cache from './cache';
import { distanceTo as playerDistanceTo } from './player';
import { isOutOfBounds, getMapCell, getScaledMapSize } from './map';
import { OffScreenBuffer } from './offscreen-buffer';

let CEILING_ANIMATION_RADIANS_PER_FRAME = 0.0175 * Math.PI / 180;
let ceilingAnimationAngle = 0;

let floorTexture;
let floorTextureBuffer;
let floorTextureImage;
let floorTexturePixels;

let wallTexture;
let wallTextureCanvas;
let wallTextureImage;
let wallTexturePixels;


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

  floorTexture = textures.getTextureImageById({ id: `floor1`});
  floorTextureBuffer = document.createElement('canvas');		
  floorTextureBuffer.width = floorTexture.width;
  floorTextureBuffer.height = floorTexture.height;
  floorTextureBuffer.getContext('2d').drawImage(floorTexture, 0, 0);
  
  floorTextureImage = floorTextureBuffer.getContext('2d').getImageData(0, 0, floorTextureBuffer.width, floorTextureBuffer.height);
  floorTexturePixels = floorTextureImage.data;

  wallTexture = textures.getTextureImageById({ id: `wall2`});
  wallTextureCanvas = document.createElement('canvas');		
  wallTextureCanvas.width = wallTexture.width;
  wallTextureCanvas.height = wallTexture.height;
  wallTextureCanvas.getContext('2d').drawImage(wallTexture, 0, 0);
  
  wallTextureImage = wallTextureCanvas.getContext('2d').getImageData(0, 0, wallTextureCanvas.width, wallTextureCanvas.height);
  wallTexturePixels = wallTextureImage.data;
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
  //renderFloor({ canvasContext, player });
  offScreenBuffer.clear();
  //renderCeiling({ canvasContext, player });

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
  // Using this calculation for distance instead of the raw ray distance fixes
  // the fish eye effect cause by calculating the rays from a single central point
  // on the player.
  const distance = wallRay.collisionDistance * Math.cos(wallRay.angle - player.angle);
  const wallHeight = (constants.CELL_SIZE * constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE / distance); // Doesn't have to be cell size.
  const textureOffset = Math.floor(wallRay.collidedVertically ? wallRay.collisionY : wallRay.collisionX);

  // Draw walls.
  //const wallTexture = textures.getTextureImageById({ id: `wall${wallRay.collidedMapCell}`});
  offScreenBuffer.drawVerticalBufferSlice({
    sourcePixels: wallTexturePixels,
    sourceX: textureOffset % wallTexture.width,
    sourceWidth: wallTextureCanvas.width,
    sourceHeight: wallTextureCanvas.height,
    destinationX: rayIndex,
    destinationY: Math.floor(constants.HALF_SCREEN_HEIGHT) - Math.floor(wallHeight / 2),
    destinationHeight: wallHeight,
  });

  // Draw floor.
  const bytesPerPixel = 4;
  const bottomOfWall = Math.floor(constants.HALF_SCREEN_HEIGHT + (wallHeight / 2));

  // No need to render floor if the bottom of the wall reaches the bottom of the screen.
  if (bottomOfWall > constants.SCREEN_HEIGHT) {
    return;
  }

  let floorCeilingCanvasIndex = bottomOfWall * localCache.offScreenBufferBytesPerRow + (bytesPerPixel * rayIndex);

  for (let floorPixelYIndex = bottomOfWall; floorPixelYIndex < constants.SCREEN_HEIGHT; ++floorPixelYIndex) {
    // Calcualte the straight distance between the player and the pixel.
    const directFloorDistance = constants.PLAYER_HEIGHT / (floorPixelYIndex - constants.HALF_SCREEN_HEIGHT) ;
    //const diagonalDistanceToFloor = Math.floor((constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE * directFloorDistance) * Math.cos(wallRay.angle - player.angle));
    const diagonalDistanceToFloor = Math.floor((constants.PLAYER_DISTANCE_TO_PROJECTION_PLANE * directFloorDistance) * (1.0 / Math.cos(wallRay.angle - player.angle)));


	  const xEnd = Math.floor(diagonalDistanceToFloor * Math.cos(wallRay.angle)) + player.x;
    const yEnd = Math.floor(diagonalDistanceToFloor * Math.sin(wallRay.angle)) + player.y;

    // Get the tile intersected by ray
    const cellX = Math.floor(xEnd / constants.CELL_SIZE);
    const cellY = Math.floor(yEnd / constants.CELL_SIZE);

    if (isOutOfBounds({ cellX, cellY })) {
      return;
    }

    const textureRow = Math.floor(yEnd % floorTexture.height);
    const textureColumn = Math.floor(xEnd % floorTexture.width);

    const sourceIndex = (textureRow * floorTextureBuffer.width * bytesPerPixel) + (bytesPerPixel * textureColumn);

    // Cheap shading trick
    const brightnessLevel = (400 / diagonalDistanceToFloor);
    const red = Math.floor(floorTexturePixels[sourceIndex] * brightnessLevel);
    const green = Math.floor(floorTexturePixels[sourceIndex + 1] * brightnessLevel);
    const blue = Math.floor(floorTexturePixels[sourceIndex + 2] * brightnessLevel);
    const alpha = Math.floor(floorTexturePixels[sourceIndex + 3]);	

    // Draw the pixel
    offScreenBufferPixels[floorCeilingCanvasIndex] = red;
    offScreenBufferPixels[floorCeilingCanvasIndex + 1] = green;
    offScreenBufferPixels[floorCeilingCanvasIndex + 2] = blue;
    offScreenBufferPixels[floorCeilingCanvasIndex + 3] = alpha;
    
    // Go to the next pixel (directly under the current pixel)
    floorCeilingCanvasIndex += localCache.offScreenBufferBytesPerRow;	
  }
};

const renderFloor = ({ canvasContext, player }) => {
  canvasContext.fillStyle = 'grey';
  canvasContext.fillRect(0, constants.HALF_SCREEN_HEIGHT_FLOORED, constants.SCREEN_WIDTH, constants.HALF_SCREEN_HEIGHT_FLOORED);
};

const renderCeiling = ({ canvasContext, player }) => {
  //ceilingAnimationAngle += CEILING_ANIMATION_RADIANS_PER_FRAME;
  //ceilingAnimationAngle = ceilingAnimationAngle % (2 * Math.PI);

  // For now we assume an outdoor ceiling which has the benefit of us not having to factor in the
  // x and y coordinates of the player for rendering the texture. We still need to factor in the 
  // angle the player is facing. To accomplish this effect, we take a seamless image from the texture
  // library and determine how many pixels to use from the texture per field of view chunk.
  // We then simply offset the image as the player rotates to move the field of view along the image.
  // A problem emerges towards the end of the image where we "run out of image". To overcome this
  // limit, we simply print another picture where the first one ran out. The second image starts
  // back at the start of the texture, giving the illusion of a 360 degree image.
  const ceilingTexture = textures.getTextureImageById({ id: `clouds1-repeatable`});;

  // Determine how many pixels per radian can be shown.
  const slicePerRadian = ceilingTexture.width / (Math.PI * 2);

  // Determine how many pixels per field of view window can be shown.
  const slicePixels = Math.floor(constants.FIELD_OF_VIEW * slicePerRadian);

  // Determine which part of the image to show based on the player angle.
  const offsetPercentage = (player.angle + ceilingAnimationAngle) / (Math.PI * 2);
  const offsetPixels = Math.floor(offsetPercentage * ceilingTexture.width);

  // Draw the part of the image that corresponds to the players current viewing angle.
  canvasContext.drawImage(
    ceilingTexture,
    offsetPixels,
    0,
    slicePixels,
    ceilingTexture.height,
    0,
    0,
    constants.SCREEN_WIDTH,
    constants.HALF_SCREEN_HEIGHT_FLOORED,
  );

  // Determine if we "ran out of texture" at the end of the image in the previous operation, i.e. the FOV sliding window
  // has run past the end of the image.
  const resourceShortFall = (offsetPixels + slicePixels) - ceilingTexture.width;
  const screenShortfall = Math.floor((constants.SCREEN_WIDTH / slicePixels) * resourceShortFall);
  
  // If we had a shortfall of image to display on the screen, starting back at the starting x coordinate of the texture,
  // draw a second image to fill in the shortfall amount.
  if (screenShortfall > 0) {
    canvasContext.drawImage(
      ceilingTexture,
      0,
      0,
      resourceShortFall,
      ceilingTexture.height,
      constants.SCREEN_WIDTH - screenShortfall - 1,
      0,
      screenShortfall + 1,
      constants.HALF_SCREEN_HEIGHT,
    );
  }
};